import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const employees = await prisma.employees.findMany({
      where: {
        employeeStatus: 'Active',
      },
      select: {
        employeeId: true,
        employeeName: true,
        employeeRole: true,
        employeeDepartment: true,
      },
      orderBy: { employeeId: 'asc' },
    });

    return NextResponse.json(
      { success: true, employees },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error: any) {
    console.error('Fetch Employees Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}