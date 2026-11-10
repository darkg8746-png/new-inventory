import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 1. เช็คสินค้าใกล้หมดสต็อก (กำหนดให้น้อยกว่าหรือเท่ากับ 5 ชิ้น)
    const lowStockProducts = await prisma.productsCatalog.findMany({
      where: { stockQty: { lte: 5 } },
      select: { productId: true, productName: true, stockQty: true }
    });

    // 2. เช็ค Lot ที่ใกล้หมดอายุ (ภายใน 30 วันนับจากวันนี้)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringLots = await prisma.productLots.findMany({
      where: {
        lotStatus: 'Active',
        remainingQty: { gt: 0 },
        expireDate: { lte: thirtyDaysFromNow, not: null }
      },
      include: { 
        product: { select: { productName: true } } 
      }
    });

    return NextResponse.json({
      success: true,
      lowStock: lowStockProducts,
      expiring: expiringLots
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}