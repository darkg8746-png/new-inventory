import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// 📥 1. ฟังก์ชัน GET: ดึงประวัติ พร้อมเชื่อมข้อมูล Lot Breakdown มาด้วย
// ==========================================
export async function GET() {
  try {
    const transactions = await prisma.inventoryTransactions.findMany({
      orderBy: { transactionDate: 'desc' },
      include: {
        product: true,
        lotDetails: { 
          include: {
            lot: true
          }
        }
      },
      take: 100,
    });
    
    return NextResponse.json({ success: true, transactions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ==========================================
// 📤 2. ฟังก์ชัน POST: รับเข้า / เบิกออก
// ==========================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transactionType, referenceNo, remark, employeeId, supplierId, items } = body;

    const result = await prisma.$transaction(async (tx) => {
      let mainTxIds = [];

      for (const item of items) {
        const { productId, quantity, unitCost = 0, expireDate = null } = item;
        const qtyToProcess = Number(quantity);
        
        // ดึงข้อมูลสินค้าเพื่อเช็กว่าเป็นสินค้าประเภทไหน (เช่น มีคำว่า ไส้กรอง หรือเป็นอะไหล่ หรือเช็กจาก categoryId)
        const productInfo = await tx.productsCatalog.findUnique({
          where: { productId: Number(productId) },
          include: { category: true }
        });

        // 1. สร้างหัวบิลประวัติ
        const newTx = await tx.inventoryTransactions.create({
          data: {
            productId: Number(productId),
            employeeId: employeeId ? Number(employeeId) : null,
            transactionType,
            quantity: qtyToProcess,
            referenceNo: referenceNo || null,
            supplierId: supplierId && transactionType === 'IN' ? Number(supplierId) : null,
            remark: remark || null,
          }
        });
        
        mainTxIds.push(newTx.transactionId);

        if (transactionType === 'IN') {
          // --- กรณีรับเข้า (IN): สร้าง Lot ใหม่ ---
          const newLot = await tx.productLots.create({
            data: {
              productId: Number(productId),
              lotNumber: referenceNo || `LOT-${Date.now()}`,
              unitCost: Number(unitCost),
              originalQty: qtyToProcess,
              remainingQty: qtyToProcess,
              expireDate: expireDate ? new Date(expireDate) : null,
            }
          });

          await tx.transactionLotDetails.create({
            data: {
              transactionId: newTx.transactionId,
              lotId: newLot.lotId,
              quantityUsed: qtyToProcess,
              costApplied: Number(unitCost),
            }
          });

          // 🌟 1. อัปเดตบวกยอดสต็อกรวมในตารางสินค้าหลัก 🌟
          await tx.productsCatalog.update({
            where: { productId: Number(productId) },
            data: { stockQty: { increment: qtyToProcess } }
          });

          // 🌟 2. เงื่อนไขสร้างทะเบียนเครื่องจักรเฉพาะสินค้าที่เป็นเครื่อง (ตัวอย่าง: หมวดหมู่หรือชื่อไม่ใช่ไส้กรอง/อะไหล่) 🌟
          // ป้องกันไม่ให้อะไหล่สิ้นเปลือง (เช่น ไส้กรอง) ไปวิ่งสร้าง MachinesAssets ทีละ 30-50 ชิ้นจน Transaction พัง
          const productName = (productInfo?.productName || '').toLowerCase();
          const categoryName = (productInfo?.category?.categoryName || '').toLowerCase();
          
          const isSparePart = productName.includes('ไส้กรอง') || 
                              productName.includes('โอริง') || 
                              productName.includes('สายยาง') || 
                              productName.includes('ข้อต่อ') || 
                              categoryName.includes('อะไหล่') ||
                              categoryName.includes('สิ้นเปลือง');

          if (!isSparePart) {
            // ถ้าไม่ใช่ ให้ออกแบบสร้างทะเบียน S/N ทีละเครื่องแบบปลอดภัยด้วย createMany แทนการวนลูป await
            const assetDataList = [];
            for (let i = 0; i < qtyToProcess; i++) {
              assetDataList.push({
                productId: Number(productId),
                assetSerialNumber: `SN-${Date.now()}-${i}`,
                assetStatus: 'In_Stock',
                assetPurchaseCost: Number(unitCost),
                assetPurchaseDate: new Date(),
                supplierId: supplierId ? Number(supplierId) : null,
                isInternalSn: true,
              });
            }
            if (assetDataList.length > 0) {
              await tx.machinesAssets.createMany({
                data: assetDataList,
                skipDuplicates: true
              });
            }
          }

        } else if (transactionType === 'OUT') {
          // --- กรณีเบิกออก (OUT): ตัดสต็อกแบบ FIFO ---
          let qtyNeeded = qtyToProcess;
          
          const availableLots = await tx.productLots.findMany({
            where: { 
              productId: Number(productId),
              remainingQty: { gt: 0 },
              lotStatus: 'Active'
            },
            orderBy: { receiveDate: 'asc' }
          });

          for (const lot of availableLots) {
            if (qtyNeeded <= 0) break;

            const takeQty = Math.min(qtyNeeded, lot.remainingQty);
            qtyNeeded -= takeQty;

            const newRemainingQty = lot.remainingQty - takeQty;
            await tx.productLots.update({
              where: { lotId: lot.lotId },
              data: { 
                remainingQty: newRemainingQty,
                lotStatus: newRemainingQty === 0 ? 'Depleted' : 'Active'
              }
            });

            await tx.transactionLotDetails.create({
              data: {
                transactionId: newTx.transactionId,
                lotId: lot.lotId,
                quantityUsed: takeQty,
                costApplied: lot.unitCost,
              }
            });
          }

          if (qtyNeeded > 0) {
            throw new Error(`สินค้า ID ${productId} สต็อกในระบบไม่พอเบิกครับ (ขาดอีก ${qtyNeeded} ชิ้น)`);
          }

          // 🌟 อัปเดตลดสต็อกรวมในตารางสินค้าหลัก 🌟
          await tx.productsCatalog.update({
            where: { productId: Number(productId) },
            data: { stockQty: { decrement: qtyToProcess } }
          });
        }
      }
      return mainTxIds;
    }, {
      maxWait: 10000, // เพิ่มเวลา Timeout รอ Connection (10 วินาที)
      timeout: 20000  // ขยายเวลาทำงานสูงสุดใน Transaction
    });

    return NextResponse.json({ success: true, transactionIds: result });
  } catch (error: any) {
    console.error('Transaction Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}