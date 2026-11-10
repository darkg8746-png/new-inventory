import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// 📥 1. ฟังก์ชัน GET: ดึงสินค้า และนับสต็อกตามเครื่อง S/N (In_Stock) อัตโนมัติ
// ==========================================
export async function GET() {
  try {
    const productsFromDb = await prisma.productsCatalog.findMany({
      orderBy: { productId: 'desc' },
    });

    // ดึงเครื่องจักรที่มีสถานะพร้อมใช้งานทั้งหมด
    const machines = await prisma.machinesAssets.findMany({
      where: { assetStatus: 'In_Stock' },
      select: { productId: true }
    });

    // ผูกนับจำนวนเครื่อง S/N เป็นสต็อกของสินค้านั้นๆ
    const products = productsFromDb.map(p => {
      const realStock = machines.filter(m => m.productId === p.productId).length;
      return {
        ...p,
        stockQty: realStock // ซิงค์ตรงกับจำนวนเครื่อง S/N
      };
    });

    const categories = await prisma.productCategories.findMany();
    return NextResponse.json({ success: true, products, categories });
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
// ✍️ 3. ฟังก์ชัน PUT: แก้ไขรายละเอียดสินค้า (ไม่กวนสต็อก เพราะสต็อกอิงตาม S/N)
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