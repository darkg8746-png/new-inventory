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
// 📤 2. ฟังก์ชัน POST: รับเข้า / เบิกออก / ผสมน้ำยา (1:2)
// ==========================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transactionType, referenceNo, remark, employeeId, supplierId, transactionDate, items } = body;

    const txDateObj = transactionDate ? new Date(transactionDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      let mainTxIds = [];

      for (const item of items) {
        const { productId, quantity, unitCost = 0, expireDate = null, yieldQty } = item;
        const qtyToProcess = Number(quantity);
        
        // ดึงข้อมูลสินค้า
        const productInfo = await tx.productsCatalog.findUnique({
          where: { productId: Number(productId) },
          include: { category: true }
        });

        if (!productInfo) {
          throw new Error(`ไม่พบข้อมูลสินค้า ID ${productId} ในระบบ`);
        }

        // 1. สร้างหัวบิลประวัติหลัก (สำหรับ MIXING จะบันทึกเป็น OUT ของหัวเชื้อ)
        const mainTxType = transactionType === 'MIXING' ? 'OUT' : transactionType;

        const newTx = await tx.inventoryTransactions.create({
          data: {
            productId: Number(productId),
            employeeId: employeeId ? Number(employeeId) : null,
            transactionType: mainTxType,
            quantity: qtyToProcess,
            transactionDate: txDateObj,
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
              receiveDate: txDateObj,
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

          // อัปเดตบวกยอดสต็อกรวมในตารางสินค้าหลัก
          await tx.productsCatalog.update({
            where: { productId: Number(productId) },
            data: { stockQty: { increment: qtyToProcess } }
          });

          // ป้องกันไม่ให้อะไหล่สิ้นเปลือง และ กลุ่มน้ำยาเคมี ไปสร้าง MachinesAssets
          const productName = (productInfo?.productName || '').toLowerCase();
          const categoryName = (productInfo?.category?.categoryName || '').toLowerCase();
          const catId = Number(productInfo?.categoryId);
          
          const isNonMachineItem = 
            catId === 5 ||
            catId === 107 ||
            productName.includes('ไส้กรอง') || 
            productName.includes('โอริง') || 
            productName.includes('สายยาง') || 
            productName.includes('ข้อต่อ') || 
            productName.includes('น้ำยา') || 
            productName.includes('หัวเชื้อ') || 
            productName.includes('แกลลอน') || 
            productName.includes('ใบมีด') || 
            categoryName.includes('อะไหล่') ||
            categoryName.includes('สิ้นเปลือง') ||
            categoryName.includes('น้ำยา');

          if (!isNonMachineItem) {
            const assetDataList = [];
            for (let i = 0; i < qtyToProcess; i++) {
              assetDataList.push({
                productId: Number(productId),
                assetSerialNumber: `SN-${Date.now()}-${i}`,
                assetStatus: 'In_Stock',
                assetPurchaseCost: Number(unitCost),
                assetPurchaseDate: txDateObj,
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
            throw new Error(`สินค้า "${productInfo.productName}" สต็อกในระบบไม่พอเบิกครับ (ขาดอีก ${qtyNeeded} ชิ้น)`);
          }

          // อัปเดตลดสต็อกรวมในตารางสินค้าหลัก
          await tx.productsCatalog.update({
            where: { productId: Number(productId) },
            data: { stockQty: { decrement: qtyToProcess } }
          });

        } else if (transactionType === 'MIXING') {
          // =========================================================================
          // 🧪 กรณีผสมน้ำยา (MIXING): 1 ถังหัวเชื้อ -> 2 ถังผสม (สูตร 1:2)
          // =========================================================================
          const mixedOutputQty = yieldQty ? Number(yieldQty) : qtyToProcess * 2;

          // ขั้นที่ 1: ตัดสต็อกหัวเชื้อออก (FIFO) และคำนวณต้นทุนรวมของหัวเชื้อที่ใช้ไป
          let qtyNeeded = qtyToProcess;
          let totalConcentrateCost = 0;

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
            totalConcentrateCost += (takeQty * Number(lot.unitCost || 0));

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
            throw new Error(`หัวเชื้อ "${productInfo.productName}" ในคลังไม่พอผสมครับ (ขาดอีก ${qtyNeeded} ถัง)`);
          }

          // ลดสต็อกหัวเชื้อตั้งต้น
          await tx.productsCatalog.update({
            where: { productId: Number(productId) },
            data: { stockQty: { decrement: qtyToProcess } }
          });

          // ขั้นที่ 2: ค้นหารายการ "น้ำยาผสมแล้ว" ที่คู่กันในระบบ
          const allChemProducts = await tx.productsCatalog.findMany({
            where: {
              OR: [
                { categoryId: { in: [5, 107] } },
                { productName: { contains: 'น้ำยา' } }
              ]
            }
          });

          const srcModel = (productInfo.productModelCode || '').trim();
          const srcBaseName = (productInfo.productName || '')
            .replace(/หัวเชื้อ/g, '')
            .replace(/\(Pure\)/gi, '')
            .trim();

          const mixedCandidates = allChemProducts.filter(p => {
            if (p.productId === productInfo.productId) return false;
            const n = (p.productName || '').toLowerCase();
            const m = (p.productModelCode || '').toLowerCase();
            return n.includes('ผสม') || m.includes('(mix)');
          });

          let targetMixedProduct = mixedCandidates.find(p => {
            const m = (p.productModelCode || '').toLowerCase();
            const n = (p.productName || '').toLowerCase();
            if (srcModel && m.includes(srcModel.toLowerCase())) return true;
            if (srcBaseName && n.includes(srcBaseName.toLowerCase())) return true;
            return false;
          });

          if (!targetMixedProduct && mixedCandidates.length === 1) {
            targetMixedProduct = mixedCandidates[0];
          }

          if (!targetMixedProduct) {
            throw new Error(`ไม่พบรายการสินค้า "น้ำยาผสมแล้ว" ที่คู่กับ "${productInfo.productName}" ในคลัง (กรุณาสร้างรายการสินค้าที่มีคำว่า "ผสม" หรือรหัสรุ่นต่อท้ายด้วย (MIX) ก่อนครับ)`);
          }

          // ขั้นที่ 3: รับเข้า (IN) สำหรับน้ำยาผสม จำนวน 2 เท่า (mixedOutputQty)
          const costPerMixedUnit = mixedOutputQty > 0 ? (totalConcentrateCost / mixedOutputQty) : 0;

          const mixedInTx = await tx.inventoryTransactions.create({
            data: {
              productId: targetMixedProduct.productId,
              employeeId: employeeId ? Number(employeeId) : null,
              transactionType: 'IN',
              quantity: mixedOutputQty,
              transactionDate: txDateObj,
              referenceNo: referenceNo || null,
              remark: `รับเข้าจากการผสม ${productInfo.productName} ${qtyToProcess} ถัง (สูตร 1:2 ได้ ${mixedOutputQty} ถัง)`,
            }
          });

          const newMixedLot = await tx.productLots.create({
            data: {
              productId: targetMixedProduct.productId,
              lotNumber: referenceNo || `MIX-${Date.now()}`,
              unitCost: costPerMixedUnit,
              originalQty: mixedOutputQty,
              remainingQty: mixedOutputQty,
              receiveDate: txDateObj,
            }
          });

          await tx.transactionLotDetails.create({
            data: {
              transactionId: mixedInTx.transactionId,
              lotId: newMixedLot.lotId,
              quantityUsed: mixedOutputQty,
              costApplied: costPerMixedUnit,
            }
          });

          // เพิ่มสต็อกน้ำยาผสมเข้าตารางสินค้าหลัก
          await tx.productsCatalog.update({
            where: { productId: targetMixedProduct.productId },
            data: { stockQty: { increment: mixedOutputQty } }
          });
        }
      }
      return mainTxIds;
    }, {
      maxWait: 10000, 
      timeout: 20000  
    });

    return NextResponse.json({ success: true, transactionIds: result });
  } catch (error: any) {
    console.error('Transaction Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}