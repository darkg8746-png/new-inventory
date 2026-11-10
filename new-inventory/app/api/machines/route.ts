import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const machines = await prisma.machinesAssets.findMany({
      orderBy: { assetId: 'desc' },
      include: { product: true }
    });
    return NextResponse.json({ success: true, machines });
  } catch (error: any) {
    console.error("🔥 FETCH MACHINES ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const result = await prisma.$transaction(async (tx) => {
      const newMachine = await tx.machinesAssets.create({
        data: {
          productId: Number(body.productId),
          assetSerialNumber: body.assetSerialNumber,
          assetQrCode: body.assetQrCode || null,
          assetStatus: body.assetStatus || 'In_Stock',
          assetInstallDate: body.assetInstallDate ? new Date(body.assetInstallDate) : null,
          assetPurchaseCost: body.assetPurchaseCost ? Number(body.assetPurchaseCost) : null,
          assetPurchaseDate: body.assetPurchaseDate ? new Date(body.assetPurchaseDate) : null,
          assetWarrantyExpireDate: body.assetWarrantyExpireDate ? new Date(body.assetWarrantyExpireDate) : null,
          isInternalSn: Boolean(body.isInternalSn),
          supplierId: body.supplierId ? Number(body.supplierId) : null,
          customerId: body.customerId ? Number(body.customerId) : null,
        }
      });

      if (newMachine.assetStatus === 'In_Stock') {
        const product = await tx.productsCatalog.findUnique({ where: { productId: newMachine.productId } });
        const currentStock = product?.stockQty || 0;
        await tx.productsCatalog.update({
          where: { productId: newMachine.productId },
          data: { stockQty: currentStock + 1 }
        });
      }

      return newMachine;
    });

    return NextResponse.json({ success: true, machine: result });
  } catch (error: any) {
    console.error("🔥 CREATE MACHINE ERROR:", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Serial Number หรือ QR Code นี้ซ้ำในระบบครับ' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    
    const result = await prisma.$transaction(async (tx) => {
      const oldMachine = await tx.machinesAssets.findUnique({
        where: { assetId: Number(body.assetId) }
      });
      if (!oldMachine) throw new Error('ไม่พบข้อมูลเครื่องจักรเดิม');

      const updatedMachine = await tx.machinesAssets.update({
        where: { assetId: Number(body.assetId) },
        data: {
          productId: Number(body.productId),
          assetSerialNumber: body.assetSerialNumber,
          assetQrCode: body.assetQrCode || null,
          assetStatus: body.assetStatus || 'In_Stock',
          assetInstallDate: body.assetInstallDate ? new Date(body.assetInstallDate) : null,
          assetPurchaseCost: body.assetPurchaseCost ? Number(body.assetPurchaseCost) : null,
          assetPurchaseDate: body.assetPurchaseDate ? new Date(body.assetPurchaseDate) : null,
          assetWarrantyExpireDate: body.assetWarrantyExpireDate ? new Date(body.assetWarrantyExpireDate) : null,
          isInternalSn: Boolean(body.isInternalSn),
          supplierId: body.supplierId ? Number(body.supplierId) : null,
          customerId: body.customerId ? Number(body.customerId) : null,
        }
      });

      const product = await tx.productsCatalog.findUnique({ where: { productId: updatedMachine.productId } });
      const currentStock = product?.stockQty || 0;

      if (oldMachine.assetStatus === 'In_Stock' && updatedMachine.assetStatus !== 'In_Stock') {
        await tx.productsCatalog.update({
          where: { productId: oldMachine.productId },
          data: { stockQty: Math.max(0, currentStock - 1) } 
        });
      }
      else if (oldMachine.assetStatus !== 'In_Stock' && updatedMachine.assetStatus === 'In_Stock') {
        await tx.productsCatalog.update({
          where: { productId: updatedMachine.productId },
          data: { stockQty: currentStock + 1 }
        });
      }

      return updatedMachine;
    });

    return NextResponse.json({ success: true, machine: result });
  } catch (error: any) {
    console.error("🔥 UPDATE MACHINE ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) throw new Error('ไม่พบ ID เครื่องจักร');

    await prisma.$transaction(async (tx) => {
      const oldMachine = await tx.machinesAssets.findUnique({
        where: { assetId: Number(id) }
      });
      
      if (oldMachine) {
        await tx.machinesAssets.delete({ where: { assetId: Number(id) } });
        if (oldMachine.assetStatus === 'In_Stock') {
          const product = await tx.productsCatalog.findUnique({ where: { productId: oldMachine.productId } });
          const currentStock = product?.stockQty || 0;
          await tx.productsCatalog.update({
            where: { productId: oldMachine.productId },
            data: { stockQty: Math.max(0, currentStock - 1) }
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}