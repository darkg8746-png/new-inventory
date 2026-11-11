import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_id, contract_id, employee_id, items } = body;

    // ตรวจสอบข้อมูลเบื้องต้น
    if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ครบถ้วน กรุณาระบุลูกค้าและรายการน้ำยา' },
        { status: 400 }
      );
    }

    // สร้างเลขที่ใบสั่งเบิกอัตโนมัติ เช่น ORD-20261111-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const order_no = `ORD-${dateStr}-${randomNum}`;

    // ใช้ Prisma Transaction เพื่อให้การบันทึกและตัดสต็อกสำเร็จทั้งหมด หรือ rollback พร้อมกันหากเกิดข้อผิดพลาด
    const result = await prisma.$transaction(async (tx) => {
      let totalCost = 0;
      let totalPrice = 0;

      // 1. คำนวณต้นทุนและราคาขายรวมจาก items ที่ส่งมา
      const processedItems = await Promise.all(
        items.map(async (item: { product_id: number; quantity: number }) => {
          const product = await tx.productsCatalog.findUnique({
            where: { productId: item.product_id },
          });

          if (!product) {
            throw new Error(`ไม่พบสินค้า (ID: ${item.product_id}) ในระบบ`);
          }

          if ((product.stockQty ?? 0) < item.quantity) {
            throw new Error(`สินค้า ${product.productName} สต็อกคงเหลือไม่พอเบิก (เหลือ ${product.stockQty})`);
          }

          const unitCost = product.unitCost ? Number(product.unitCost) : 0;
          const salePrice = product.rentPrice ? Number(product.rentPrice) : 0;

          totalCost += unitCost * item.quantity;
          totalPrice += salePrice * item.quantity;

          return {
            productId: item.product_id,
            orderItemQty: item.quantity,
            orderItemUnitCost: unitCost,
            orderItemSalePrice: salePrice,
          };
        })
      );

      // 2. บันทึกหัวบิลลงในตาราง consumableOrders
      const newOrder = await tx.consumableOrders.create({
        data: {
          orderNo: order_no,
          customerId: Number(customer_id),
          contractId: contract_id ? Number(contract_id) : null,
          employeeId: employee_id ? Number(employee_id) : null,
          orderDate: new Date(),
          orderTotalCost: totalCost,
          orderTotalPrice: totalPrice,
          orderStatus: 'Delivered',
          consumableOrderItems: {
            create: processedItems,
          },
        },
        include: {
          consumableOrderItems: true,
        },
      });

      // 3. วนลูปบันทึกประวัติการตัดสต็อกใน inventoryTransactions และอัปเดตสต็อกคงเหลือ
      for (const item of items) {
        await tx.inventoryTransactions.create({
          data: {
            productId: item.product_id,
            employeeId: employee_id ? Number(employee_id) : null,
            transactionType: 'OUT',
            quantity: item.quantity,
            referenceNo: order_no,
            remark: `เบิกน้ำยาเคมีภัณฑ์ตามใบสั่งซื้อ ${order_no}`,
          },
        });

        await tx.productsCatalog.update({
          where: { productId: item.product_id },
          data: {
            stockQty: {
              decrement: item.quantity,
            },
          },
        });
      }

      return newOrder;
    });

    return NextResponse.json(
      {
        message: 'บันทึกการเบิกน้ำยาและตัดสต็อกสำเร็จ',
        data: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการประมวลผล' },
      { status: 500 }
    );
  }
}