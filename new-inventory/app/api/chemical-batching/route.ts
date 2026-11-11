import { NextResponse } from 'next/server';
// แก้ไข path ให้ตรงกับที่เก็บไฟล์ prisma client ของคุณ
import { prisma } from '@/lib/prisma'; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      pureChemicalId,   // ID ของหัวเชื้อที่ถูกตัด
      pureQty,          // จำนวนหัวเชื้อที่เบิก
      readyChemicalId,  // ID ของน้ำยาผสมเสร็จที่จะเพิ่มเข้าสต็อก
      readyQty,         // จำนวนน้ำยาผสมเสร็จที่ได้
      remark,           // หมายเหตุ
      employeeId        // (Optional) คนทำรายการ
    } = body;

    // 1. ตรวจสอบข้อมูลเบื้องต้น
    if (!pureChemicalId || !pureQty || !readyChemicalId || !readyQty) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    // 2. ใช้ Prisma $transaction เพื่อให้แน่ใจว่าทั้งการตัดและการเพิ่มจะสำเร็จพร้อมกัน
    const result = await prisma.$transaction(async (tx) => {
      
      // --- ขั้นตอนที่ 1: เช็คสต็อกหัวเชื้อ ---
      const pureProduct = await tx.product.findUnique({
        where: { productId: pureChemicalId }
      });

      if (!pureProduct || pureProduct.stockQty < pureQty) {
        throw new Error(`สต็อกหัวเชื้อไม่เพียงพอ (เหลือ ${pureProduct?.stockQty || 0})`);
      }

      // --- ขั้นตอนที่ 2: ตัดสต็อกหัวเชื้อ (OUT) ---
      // 2.1 อัปเดตยอดคงเหลือในตาราง Product
      await tx.product.update({
        where: { productId: pureChemicalId },
        data: { stockQty: { decrement: pureQty } }
      });

      // 2.2 บันทึกประวัติ Transaction (OUT)
      const outTx = await tx.transaction.create({
        data: {
          productId: pureChemicalId,
          transactionType: 'OUT',
          quantity: pureQty,
          referenceNo: 'BATCHING-OUT',
          remark: remark || 'เบิกหัวเชื้อเพื่อผสมคลังกลาง',
          employeeId: employeeId || null,
          transactionDate: new Date(),
        }
      });

      // --- ขั้นตอนที่ 3: เพิ่มสต็อกน้ำยาผสมเสร็จ (IN) ---
      // 3.1 คำนวณต้นทุนเฉลี่ยของน้ำยาผสมเสร็จ (เอาต้นทุนหัวเชื้อ หารด้วย จำนวนถังที่ได้)
      const pureUnitCost = pureProduct.unitCost || 0;
      const totalCost = pureUnitCost * pureQty;
      const newReadyUnitCost = totalCost / readyQty;

      // 3.2 อัปเดตยอดคงเหลือในตาราง Product (IN)
      await tx.product.update({
        where: { productId: readyChemicalId },
        data: { 
          stockQty: { increment: readyQty },
          // อัปเดตต้นทุนล่าสุดให้เป็นต้นทุนเฉลี่ยจากการผสมรอบนี้
          unitCost: newReadyUnitCost 
        }
      });

      // 3.3 บันทึกประวัติ Transaction (IN)
      const inTx = await tx.transaction.create({
        data: {
          productId: readyChemicalId,
          transactionType: 'IN',
          quantity: readyQty,
          referenceNo: `BATCHING-IN-REF-${outTx.transactionId}`, // อ้างอิงว่าได้มาจากการตัดหัวเชื้อบิลไหน
          remark: remark || 'รับเข้าจากการผสมน้ำยาคลังกลาง',
          employeeId: employeeId || null,
          transactionDate: new Date(),
        }
      });

      // (Optional) ถ้าคุณมีระบบ Lot FIFO คุณต้องเขียน Logic สร้าง Lot ใหม่สำหรับ inTx ไว้ตรงนี้ด้วย

      return { outTx, inTx, newReadyUnitCost };
    });

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error('Chemical batching error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}