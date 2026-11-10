import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const newCategory = await prisma.productCategories.create({
      data: { categoryName: body.categoryName }
    });
    
    return NextResponse.json({ success: true, category: newCategory });
  } catch (error: any) {
    console.error("🔥 CATEGORY INSERT ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) throw new Error('ไม่พบ ID หมวดหมู่');

    await prisma.productCategories.delete({
      where: { id: Number(id) }
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2003') {
      return NextResponse.json({ success: false, error: "ไม่สามารถลบได้ เนื่องจากมีสินค้าอยู่ในหมวดหมู่นี้!" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}