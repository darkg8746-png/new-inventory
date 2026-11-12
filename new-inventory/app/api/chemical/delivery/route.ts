import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, quantity, customerId, referenceNo, remark, employeeId, photoUrl } = body;

    // 1. ตรวจสอบข้อมูลเบื้องต้น
    if (!productId || !quantity || Number(quantity) <= 0) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุสินค้าและจำนวนที่ถูกต้อง' },
        { status: 400 }
      );
    }

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเลือกร้านค้า / ลูกค้าผู้รับน้ำยา' },
        { status: 400 }
      );
    }

    const qtyNum = Number(quantity);
    const prodIdNum = Number(productId);
    const custIdNum = Number(customerId);

    // 2. ใช้ Transaction ของ Prisma
    const result = await prisma.$transaction(async (tx) => {
      // ดึงข้อมูลสินค้าจาก ProductsCatalog
      const product = await tx.productsCatalog.findUnique({
        where: { productId: prodIdNum },
      });

      if (!product) {
        throw new Error('ไม่พบข้อมูลผลิตภัณฑ์น้ำยานี้ในระบบ');
      }

      const currentStock = product.stockQty ?? 0;
      if (currentStock < qtyNum) {
        throw new Error(`สต็อกน้ำยาไม่เพียงพอ (คงเหลือในคลัง: ${currentStock} ${product.unitName || 'ถัง'})`);
      }

      // 3. ดึง Lot สินค้าจาก ProductLots เรียงตาม FIFO
      let activeLots = await tx.productLots.findMany({
        where: {
          productId: prodIdNum,
          remainingQty: { gt: 0 },
          lotStatus: 'Active',
        },
        orderBy: [
          { expireDate: 'asc' },
          { receiveDate: 'asc' },
        ],
      });

      // ถ้าไม่มี Active Lot แต่มี stockQty ให้สร้าง Lot สำรองชั่วคราว
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

        const deductFromThisLot = Math.min(lot.remainingQty, qtyToDeduct);
        const newRemaining = lot.remainingQty - deductFromThisLot;
        const unitCost = lot.unitCost || product.unitCost || 0;

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

      // 4. สร้างเลขที่ใบส่งของอัตโนมัติ
      const finalRefNo =
        referenceNo?.trim() ||
        `DO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

      // ดึงข้อมูลลูกค้า
      const customer = await tx.customers.findFirst({
        where: {
          OR: [
            { customer_id: custIdNum },
            { customerId: custIdNum }
          ] as any
        },
      });

      const custName = customer?.customerName || 'ลูกค้าทั่วไป';
      const photoTag = photoUrl ? ` |PHOTO:${photoUrl}` : '';
      const finalRemark = `[ลูกค้า: ${custName}] ${remark || 'เปิดบิลจัดส่งน้ำยา'}${photoTag}`.trim();

      // 5. บันทึกประวัติลง InventoryTransactions พร้อม lotDetails
      const transaction = await tx.inventoryTransactions.create({
        data: {
          productId: prodIdNum,
          transactionType: 'OUT',
          quantity: qtyNum,
          transactionDate: new Date(),
          transactionUnitCost: qtyNum > 0 ? totalCostApplied / qtyNum : (product.unitCost || 0),
          referenceNo: finalRefNo,
          remark: finalRemark,
          employeeId: employeeId ? Number(employeeId) : null,
          lotDetails: {
            create: lotUsageRecords.map(item => ({
              lotId: item.lotId,
              quantityUsed: item.quantityUsed,
              costApplied: item.costApplied
            }))
          }
        },
      });

      // 6. ตัดยอดสต็อกรวมใน ProductsCatalog
      await tx.productsCatalog.update({
        where: { productId: prodIdNum },
        data: {
          stockQty: currentStock - qtyNum,
        },
      });

      return { transaction, finalRefNo };
    });

    return NextResponse.json({
      success: true,
      message: `เปิดบิลจัดส่งเลขที่ ${result.finalRefNo} และตัดสต็อกเรียบร้อยแล้ว`,
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