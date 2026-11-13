import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // ปรับ path ให้ตรงกับไฟล์เชื่อมต่อ Prisma ของโปรเจกต์คุณ

// GET: ดึงรายชื่อซัพพลายเออร์ที่ยังใช้งานอยู่ (Active)
export async function GET() {
  try {
    const suppliers = await prisma.suppliers.findMany({
      where: {
        supplierStatus: 'Active',
      },
      orderBy: {
        supplierId: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      suppliers,
    });
  } catch (error: any) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถดึงข้อมูลซัพพลายเออร์ได้' },
      { status: 500 }
    );
  }
}

// POST: เพิ่มซัพพลายเออร์ใหม่
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newSupplier = await prisma.suppliers.create({
      data: {
        supplierName: body.supplierName,
        contactName: body.contactName || null,
        supplierPhone: body.supplierPhone || null,
        supplierEmail: body.supplierEmail || null,
        supplierAddress: body.supplierAddress || null,
        taxId: body.taxId || null,
        creditTerm: body.creditTerm ? Number(body.creditTerm) : 0,
        supplierStatus: 'Active',
      },
    });

    return NextResponse.json({
      success: true,
      supplier: newSupplier,
    });
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถบันทึกข้อมูลซัพพลายเออร์ได้' },
      { status: 500 }
    );
  }
}