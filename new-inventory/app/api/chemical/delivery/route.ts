import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // ตรวจสอบ path ของ prisma client ในโปรเจกต์ของคุณ

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, quantity, customerId, referenceNo, remark } = body;

    // 1. ตรวจสอบข้อมูลเบื้องต้น
    if (!productId || !quantity || quantity <= 0) {
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

    // 2. ใช้ Transaction ของ Prisma เพื่อความปลอดภัยของข้อมูล (ตัดสต็อก + บันทึกบิลพร้อมกัน)
    const result = await prisma.$transaction(async (tx) => {
      // ดึงข้อมูลสินค้าและตรวจสอบสต็อกปัจจุบัน
      const product = await tx.product.findUnique({
        where: { productId: Number(productId) },
      });

      if (!product) {
        throw new Error('ไม่พบข้อมูลผลิตภัณฑ์น้ำยานี้ในระบบ');
      }

      const currentStock = product.stockQty ?? 0;
      if (currentStock < Number(quantity)) {
        throw new Error(`สต็อกน้ำยาไม่เพียงพอ (คงเหลือในคลัง: ${currentStock} ${product.unitName || 'ถัง'})`);
      }

      // 3. ดึง Lot สินค้าที่ยังมีของเหลือ เรียงตามวันรับเข้า/หมดอายุ (FIFO)
      const activeLots = await tx.inventoryLot.findMany({
        where: {
          productId: Number(productId),
          remainingQty: { gt: 0 },
        },
        orderBy: [
          { expireDate: 'asc' }, // หมดอายุก่อนออกก่อน
          { createdAt: 'asc' },  // รับเข้าก่อนออกก่อน
        ],
      });

      let qtyToDeduct = Number(quantity);
      const lotUsageRecords = [];

      // วนลูปตัดสต็อกทีละ Lot
      for (const lot of activeLots) {
        if (qtyToDeduct <= 0) break;

        const deductFromThisLot = Math.min(lot.remainingQty, qtyToDeduct);

        // อัปเดตยอดคงเหลือใน Lot
        await tx.inventoryLot.update({
          where: { lotId: lot.lotId },
          data: { remainingQty: lot.remainingQty - deductFromThisLot },
        });

        lotUsageRecords.push({
          lotId: lot.lotId,
          quantityUsed: deductFromThisLot,
          costApplied: lot.unitCost || product.unitCost || 0,
        });

        qtyToDeduct -= deductFromThisLot;
      }

      // 4. สร้างเลขที่ใบส่งของอัตโนมัติ (กรณีไม่ได้กรอกมา)
      const finalRefNo = referenceNo?.trim() || `DO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

      // ดึงชื่อลูกค้ามาใส่ในหมายเหตุเพื่อให้ง่ายต่อการดูประวัติ
      const customer = await tx.customer.findUnique({
        where: { customer_id: Number(customerId) }
      });
      const customerLabel = customer ? `[ลูกค้า: ${customer.customer_name}]` : `[รหัสลูกค้า: #${customerId}]`;
      const finalRemark = `${customerLabel} ${remark || 'เปิดบิลจัดส่งน้ำยา'}`.trim();

      // 5. บันทึก Transaction (OUT)
      const transaction = await tx.transaction.create({
        data: {
          productId: Number(productId),
          transactionType: 'OUT',
          quantity: Number(quantity),
          transactionDate: new Date(),
          referenceNo: finalRefNo,
          remark: finalRemark,
          // ผูกรายละเอียดการตัด Lot (ถ้ามีใน Schema)
          lotDetails: lotUsageRecords.length > 0 ? {
            create: lotUsageRecords
          } : undefined
        },
      });

      // 6. ตัดยอดสต็อกรวมในตาราง Product
      await tx.product.update({
        where: { productId: Number(productId) },
        data: {
          stockQty: currentStock - Number(quantity),
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