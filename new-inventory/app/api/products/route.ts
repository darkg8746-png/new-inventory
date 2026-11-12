import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// 📥 1. ฟังก์ชัน GET: ดึงสินค้า แยกนับสต็อกตามประเภท (S/N vs Lot FIFO)
// ==========================================
export async function GET() {
  try {
    const productsFromDb = await prisma.productsCatalog.findMany({
      include: {
        category: true,
        lots: {
          where: { lotStatus: 'Active' },
          select: { remainingQty: true }
        }
      },
      orderBy: { productId: 'desc' },
    });

    // ดึงเครื่องจักรที่มีสถานะพร้อมใช้งานทั้งหมด
    const machines = await prisma.machinesAssets.findMany({
      where: { assetStatus: 'In_Stock' },
      select: { productId: true }
    });

    const products = productsFromDb.map(p => {
      // เช็กว่าหมวดหมู่นี้ใช้ S/N หรือไม่ (ถ้าเป็น false คือกลุ่มอะไหล่/น้ำยา)
      const isNoSn = p.category?.requiresSerialNumber === false;

      let realStock = 0;
      if (isNoSn) {
        // กลุ่มไม่มี S/N: นับผลรวมจาก Lot ที่เหลืออยู่ (ถ้าไม่มี Lot ให้ใช้ค่า stockQty ในตารางหลัก)
        const lotSum = p.lots.reduce((sum, lot) => sum + Number(lot.remainingQty || 0), 0);
        realStock = lotSum > 0 ? lotSum : Number(p.stockQty ?? 0);
      } else {
        // กลุ่มมี S/N: นับจากจำนวนเครื่อง In_Stock ในตาราง machinesAssets
        realStock = machines.filter(m => m.productId === p.productId).length;
      }

      return {
        ...p,
        stockQty: realStock
      };
    });

    const categories = await prisma.productCategories.findMany();
    return NextResponse.json(
      { success: true, products, categories },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ==========================================
// 📤 2. ฟังก์ชัน POST: เพิ่มสินค้าใหม่ในแคตตาล็อก
// ==========================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const product = await prisma.productsCatalog.create({
      data: {
        productName: body.productName,
        productModelCode: body.productModelCode || null,
        categoryId: Number(body.categoryId),
        unitCost: body.unitCost ? Number(body.unitCost) : null,
        salePrice: body.salePrice ? Number(body.salePrice) : null,
        rentPrice: body.rentPrice ? Number(body.rentPrice) : null,
        stockQty: 0, 
        isPreorder: Boolean(body.isPreorder),
        unitName: body.unitName || null,
      }
    });
    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ==========================================
// ✍️ 3. ฟังก์ชัน PUT: แก้ไขรายละเอียดสินค้า
// ==========================================
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    
    const product = await prisma.productsCatalog.update({
      where: { productId: Number(body.productId) },
      data: {
        productName: body.productName,
        productModelCode: body.productModelCode || null,
        categoryId: Number(body.categoryId),
        unitCost: body.unitCost !== undefined && body.unitCost !== null && body.unitCost !== '' ? Number(body.unitCost) : null,
        salePrice: body.salePrice !== undefined && body.salePrice !== null && body.salePrice !== '' ? Number(body.salePrice) : null,
        rentPrice: body.rentPrice !== undefined && body.rentPrice !== null && body.rentPrice !== '' ? Number(body.rentPrice) : null,
        isPreorder: Boolean(body.isPreorder),
        unitName: body.unitName || null,
      }
    });

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error("🔥 UPDATE PRODUCT ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ==========================================
// 🗑️ 4. ฟังก์ชัน DELETE: ลบสินค้าและข้อมูลที่เกี่ยวข้อง
// ==========================================
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) throw new Error('ไม่พบ ID สินค้า');

    const productId = Number(id);

    await prisma.$transaction([
      prisma.transactionLotDetails.deleteMany({ where: { lot: { productId: productId } } }),
      prisma.productLots.deleteMany({ where: { productId: productId } }),
      prisma.inventoryTransactions.deleteMany({ where: { productId: productId } }),
      prisma.machinesAssets.deleteMany({ where: { productId: productId } }),
      prisma.productsCatalog.delete({ where: { productId: productId } })
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🔥 DELETE PRODUCT ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}