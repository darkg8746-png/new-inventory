import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic'; // <--- บังคับไม่ให้ Next.js จำ Cache เก่า

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // ดึงเฉพาะหมวดหมู่ที่คุมด้วย S/N (หรือถ้าอยากให้ Quick Check โชว์ทุกหมวดหมู่ ให้เอาเงื่อนไข where ออกได้เลย)
    const categories = await prisma.productCategories.findMany({
      where: {
        requiresSerialNumber: true
      }
    });

    let whereClause: any = {
      categoryId: {
        in: categories.map(c => c.id)
      }
    };

    if (query) {
      whereClause.OR = [
        { productName: { contains: query, mode: 'insensitive' } },
        { productModelCode: { contains: query, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.productsCatalog.findMany({
      where: whereClause,
      include: {
        category: true,
        lots: {
          where: { lotStatus: 'Active' },
          select: { remainingQty: true }
        }
      },
      orderBy: { productModelCode: 'asc' },
    });

    const machines = await prisma.machinesAssets.findMany({
      where: { assetStatus: 'In_Stock' },
    });

    const groupedData = categories.map(cat => {
      const catProducts = products.filter(p => p.categoryId === cat.id);
      const modelMap: { [key: string]: any } = {};

      catProducts.forEach(p => {
        const readyMachines = machines.filter(m => m.productId === p.productId);
        // ถ้าระบบใช้ S/N ให้นับจากจำนวนเครื่อง In_Stock จริง, ถ้าไม่มีให้ดูจาก Lot หรือ stockQty
        const currentStock = readyMachines.length > 0 ? readyMachines.length : (p.stockQty ?? 0);

        const modelKey = p.productModelCode || p.productName || 'อื่นๆ';
        if (!modelMap[modelKey]) {
          modelMap[modelKey] = {
            modelCode: p.productModelCode,
            modelName: p.productName,
            totalStockQty: 0,
            products: [],
          };
        }

        modelMap[modelKey].totalStockQty += currentStock;
        modelMap[modelKey].products.push({
          ...p,
          stockQty: currentStock,
          readyMachines,
        });
      });

      const modelGroups = Object.values(modelMap);
      const totalCategoryQty = modelGroups.reduce((sum, mg: any) => sum + mg.totalStockQty, 0);

      return {
        categoryId: cat.id,
        categoryName: cat.categoryName,
        totalQty: totalCategoryQty,
        modelGroups,
      };
    }).filter(group => group.modelGroups.length > 0);

    return NextResponse.json({ success: true, data: groupedData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}