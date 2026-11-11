import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // เช็คให้แน่ใจว่า import ถูก path

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      pureChemicalId,   
      pureQty,          
      readyChemicalId,  
      readyQty,         
      remark,           
      employeeId        
    } = body;

    if (!pureChemicalId || !pureQty || !readyChemicalId || !readyQty) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. เช็คสต็อกหัวเชื้อใน ProductsCatalog
      const pureProduct = await tx.productsCatalog.findUnique({
        where: { productId: pureChemicalId }
      });

      if (!pureProduct || (pureProduct.stockQty ?? 0) < pureQty) {
        throw new Error(`สต็อกหัวเชื้อไม่เพียงพอ (เหลือ ${pureProduct?.stockQty || 0})`);
      }

      // 2. ตัดสต็อกหัวเชื้อ (OUT) 
      // 2.1 อัปเดตใน ProductsCatalog
      await tx.productsCatalog.update({
        where: { productId: pureChemicalId },
        data: { stockQty: { decrement: pureQty } }
      });

      // 2.2 บันทึกใน InventoryTransactions
      const outTx = await tx.inventoryTransactions.create({
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

      // 2.3 ตัดสต็อกแบบ FIFO จาก ProductLots
      let remainingToDeduct = pureQty;
      const pureLots = await tx.productLots.findMany({
        where: { productId: pureChemicalId, remainingQty: { > 0 } },
        orderBy: { receiveDate: 'asc' } // ดึงล็อตเก่าสุดมาก่อน (FIFO)
      });

      let totalCostIncurred = 0; // เก็บต้นทุนรวมที่เกิดจากการตัดหัวเชื้อ

      for (const lot of pureLots) {
        if (remainingToDeduct <= 0) break;
        
        const deductQty = Math.min(lot.remainingQty, remainingToDeduct);
        remainingToDeduct -= deductQty;
        totalCostIncurred += (deductQty * lot.unitCost);

        // อัปเดตยอดคงเหลือในล็อตนั้นๆ
        await tx.productLots.update({
          where: { lotId: lot.lotId },
          data: { remainingQty: { decrement: deductQty } }
        });

        // บันทึกรายละเอียดการตัดล็อตใน TransactionLotDetails
        await tx.transactionLotDetails.create({
          data: {
            transactionId: outTx.transactionId,
            lotId: lot.lotId,
            quantityUsed: deductQty,
            costApplied: lot.unitCost
          }
        });
      }

      if (remainingToDeduct > 0) {
        throw new Error('สต็อกในระบบ Lot มีปัญหา (จำนวนไม่ตรงกับยอดคงเหลือจริง)');
      }

      // 3. เพิ่มสต็อกน้ำยาผสมเสร็จ (IN)
      // 3.1 คำนวณต้นทุนใหม่ต่อถัง (Unit Cost)
      const newReadyUnitCost = totalCostIncurred / readyQty;

      // 3.2 อัปเดตใน ProductsCatalog
      await tx.productsCatalog.update({
        where: { productId: readyChemicalId },
        data: { 
          stockQty: { increment: readyQty },
          unitCost: newReadyUnitCost 
        }
      });

      // 3.3 บันทึกใน InventoryTransactions
      const inTx = await tx.inventoryTransactions.create({
        data: {
          productId: readyChemicalId,
          transactionType: 'IN',
          quantity: readyQty,
          referenceNo: `BATCHING-IN-REF-${outTx.transactionId}`,
          remark: remark || 'รับเข้าจากการผสมน้ำยาคลังกลาง',
          employeeId: employeeId || null,
          transactionDate: new Date(),
        }
      });

      // 3.4 สร้าง Lot ใหม่สำหรับน้ำยาผสมเสร็จนี้ลงใน ProductLots
      const newLotNumber = `BATCH-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${outTx.transactionId}`;
      await tx.productLots.create({
        data: {
          productId: readyChemicalId,
          lotNumber: newLotNumber,
          unitCost: newReadyUnitCost,
          originalQty: readyQty,
          remainingQty: readyQty,
          receiveDate: new Date(),
          lotStatus: 'Active'
        }
      });

      return { outTx, inTx, newReadyUnitCost };
    });

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error('Chemical batching error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}