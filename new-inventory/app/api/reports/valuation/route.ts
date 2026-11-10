import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // ดึงข้อมูล Lot ทั้งหมดที่ยังเหลือของ (remainingQty > 0 และ Active)
    const activeLots = await prisma.productLots.findMany({
      where: {
        remainingQty: { gt: 0 },
        lotStatus: 'Active'
      },
      include: {
        product: {
          include: {
            category: true
          }
        }
      }
    });

    let totalValuation = 0;
    const itemSummaries = activeLots.map(lot => {
      const stockValue = lot.remainingQty * Number(lot.unitCost);
      totalValuation += stockValue;

      return {
        lotId: lot.lotId,
        lotNumber: lot.lotNumber,
        productName: lot.product?.productName || 'ไม่ระบุชื่อ',
        modelCode: lot.product?.productModelCode || '-',
        categoryName: lot.product?.category?.categoryName || 'ไม่ระบุหมวดหมู่',
        remainingQty: lot.remainingQty,
        unitCost: Number(lot.unitCost),
        totalValue: stockValue,
        receiveDate: lot.receiveDate,
        expireDate: lot.expireDate
      };
    });

    return NextResponse.json({ 
      success: true, 
      totalValuation, 
      itemCount: activeLots.length,
      lots: itemSummaries 
    });
  } catch (error: any) {
    console.error("Valuation Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}