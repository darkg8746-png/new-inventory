import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      productId,
      quantity,
      customerId,
      employeeId,
      externalSenderName,
      orderReason,
      deliveryChannel,
      courierName,
      trackingNo,
      shippingCost,
      shippingPayer,
      referenceNo,
      remark,
      photoUrl,
    } = body;

    if (!productId || !quantity || Number(quantity) <= 0) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุสินค้าและจำนวนที่ถูกต้อง' }, { status: 400 });
    }

    if (!customerId) {
      return NextResponse.json({ success: false, error: 'กรุณาเลือกร้านค้า / ลูกค้าผู้รับน้ำยา' }, { status: 400 });
    }

    const qtyNum = Number(quantity);
    const prodIdNum = Number(productId);
    const custIdNum = Number(customerId);
    const empIdNum = employeeId ? Number(employeeId) : null;
    const shippingCostNum = Number(shippingCost || 0);

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.productsCatalog.findUnique({
        where: { productId: prodIdNum },
      });

      if (!product) {
        throw new Error('ไม่พบข้อมูลผลิตภัณฑ์น้ำยานี้ในระบบ');
      }

      // 1. ค้นหา Lot ที่มีของเหลืออยู่จริง (FIFO)
      let activeLots = await tx.productLots.findMany({
        where: {
          productId: prodIdNum,
          remainingQty: { gt: 0 },
        },
        orderBy: [{ receiveDate: 'asc' }],
      });

      const lotStockTotal = activeLots.reduce((sum, lot) => sum + Number(lot.remainingQty || 0), 0);
      const currentStock = lotStockTotal > 0 ? lotStockTotal : Number(product.stockQty ?? 0);

      if (currentStock < qtyNum) {
        throw new Error(`สต็อกน้ำยาไม่เพียงพอ (คงเหลือในคลัง: ${currentStock} ${product.unitName || 'ถัง'})`);
      }

      if (activeLots.length === 0 && currentStock > 0) {
        const fallbackLot = await tx.productLots.create({
          data: {
            productId: prodIdNum,
            lotNumber: `AUTO-LOT-${Date.now()}`,
            unitCost: product.unitCost || 0,
            originalQty: currentStock,
            remainingQty: currentStock,
            lotStatus: 'Active',
            receiveDate: new Date(),
          },
        });
        activeLots = [fallbackLot];
      }

      let qtyToDeduct = qtyNum;
      let totalCostApplied = 0;
      const lotUsageRecords: { lotId: number; quantityUsed: number; costApplied: number }[] = [];

      for (const lot of activeLots) {
        if (qtyToDeduct <= 0) break;

        const deductFromThisLot = Math.min(Number(lot.remainingQty), qtyToDeduct);
        const newRemaining = Number(lot.remainingQty) - deductFromThisLot;
        const unitCost = Number(lot.unitCost || product.unitCost || 0);

        await tx.productLots.update({
          where: { lotId: lot.lotId },
          data: {
            remainingQty: newRemaining,
            lotStatus: newRemaining === 0 ? 'Depleted' : 'Active',
          },
        });

        lotUsageRecords.push({
          lotId: lot.lotId,
          quantityUsed: deductFromThisLot,
          costApplied: unitCost,
        });

        totalCostApplied += deductFromThisLot * unitCost;
        qtyToDeduct -= deductFromThisLot;
      }

      if (qtyToDeduct > 0) {
        throw new Error(`สต็อกใน Lot ไม่เพียงพอสำหรับตัดจำหน่าย (ขาดอีก ${qtyToDeduct})`);
      }

      const finalOrderNo =
        referenceNo?.trim() ||
        `DO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

      const avgUnitCost = qtyNum > 0 ? totalCostApplied / qtyNum : Number(product.unitCost || 0);
      const unitSalePrice = Number(product.salePrice || 0);
      const totalSalePrice = unitSalePrice * qtyNum;
      const now = new Date();

      // 2. สร้างหัวบิลลงตาราง consumable_orders (1 บิล = 1 แถว เก็บค่าขนส่งและข้อมูลจัดส่ง)
      const insertedOrders = await tx.$queryRaw<{ order_id: number }[]>`
        INSERT INTO public.consumable_orders (
          order_no,
          customer_id,
          employee_id,
          external_sender_name,
          order_date,
          order_delivery_date,
          order_total_cost,
          order_total_price,
          order_status,
          order_reason,
          delivery_channel,
          courier_name,
          tracking_no,
          shipping_cost,
          shipping_payer,
          delivery_photo_url,
          remark
        )
        VALUES (
          ${finalOrderNo},
          ${custIdNum},
          ${empIdNum},
          ${externalSenderName || null},
          ${now},
          ${now}::date,
          ${totalCostApplied},
          ${totalSalePrice},
          'Delivered',
          ${orderReason || null},
          ${deliveryChannel || null},
          ${courierName || null},
          ${trackingNo || null},
          ${shippingCostNum},
          ${shippingPayer || null},
          ${photoUrl || null},
          ${remark || null}
        )
        RETURNING order_id
      `;

      const createdOrderId = insertedOrders[0]?.order_id;

      // 3. สร้างรายการสินค้าลงตาราง consumable_order_items
      if (createdOrderId) {
        await tx.$executeRaw`
          INSERT INTO public.consumable_order_items (
            order_id,
            product_id,
            order_item_qty,
            order_item_unit_cost,
            order_item_sale_price
          )
          VALUES (
            ${createdOrderId},
            ${prodIdNum},
            ${qtyNum},
            ${avgUnitCost},
            ${unitSalePrice}
          )
        `;
      }

      // 4. บันทึกบัญชีตัดสต็อกลง inventory_transactions (เก็บเฉพาะข้อมูลสต็อกและอ้างอิงเลขบิล)
      const customer = await tx.customers.findUnique({
        where: { customerId: custIdNum },
      });
      const custName = customer?.customerName || 'ลูกค้าทั่วไป';
      const photoTag = photoUrl ? ` |PHOTO:${photoUrl}` : '';
      const finalRemark = `[ลูกค้า: ${custName}] ${remark || 'เปิดบิลจัดส่งน้ำยา'}${photoTag}`.trim();

      const transaction = await tx.inventoryTransactions.create({
        data: {
          productId: prodIdNum,
          transactionType: 'OUT',
          quantity: qtyNum,
          transactionDate: now,
          transactionUnitCost: avgUnitCost,
          referenceNo: finalOrderNo,
          remark: finalRemark,
          employeeId: empIdNum,
          lotDetails: {
            create: lotUsageRecords.map((item) => ({
              lotId: item.lotId,
              quantityUsed: item.quantityUsed,
              costApplied: item.costApplied,
            })),
          },
        },
      });

      // 5. ซิงค์ยอดคงเหลือใน products_catalog
      await tx.productsCatalog.update({
        where: { productId: prodIdNum },
        data: {
          stockQty: currentStock - qtyNum,
        },
      });

      return { transaction, finalOrderNo, orderId: createdOrderId };
    });

    return NextResponse.json({
      success: true,
      message: `เปิดบิลจัดส่งเลขที่ ${result.finalOrderNo} และตัดสต็อกเรียบร้อยแล้ว`,
      data: result.transaction,
    });
  } catch (error: any) {
    console.error('Delivery API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลจัดส่ง' },
      { status: 500 }
    );
  }
}