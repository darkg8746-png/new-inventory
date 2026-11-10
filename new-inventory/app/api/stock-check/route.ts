import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    const allowedCategories = [
      'ice maker',
      'Under counter dishwasher',
      'Hood type dishwasher',
      'Conveyor dishwasher'
    ];

    const categories = await prisma.productCategories.findMany({
      where: {
        categoryName: {
          in: allowedCategories,
          mode: 'insensitive'
        }
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
        const realStock = p.lots.reduce((sum, lot) => sum + lot.remainingQty, 0);
        const currentStock = realStock > 0 ? realStock : (p.stockQty ?? 0);

        const modelKey = p.productModelCode || p.productName || 'อื่นๆ';
        if (!modelMap[modelKey]) {
          modelMap[modelKey] = {
            modelCode: p.productModelCode,
            modelName: p.productName,
            totalStockQty: 0,
            products: [],
          };
        }

        const readyMachines = machines.filter(m => m.productId === p.productId);
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