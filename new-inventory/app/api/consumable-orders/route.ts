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
          const product = await tx.products_catalog.findUnique({
            where: { product_id: item.product_id },
          });

          if (!product) {
            throw new Error(`ไม่พบสินค้า (ID: ${item.product_id}) ในระบบ`);
          }

          if (product.product_stock_qty < item.quantity) {
            throw new Error(`สินค้า ${product.product_name} สต็อกคงเหลือไม่พอเบิก (เหลือ ${product.product_stock_qty})`);
          }

          const unitCost = product.product_unit_cost ? Number(product.product_unit_cost) : 0;
          const salePrice = product.product_rent_price ? Number(product.product_rent_price) : 0;

          totalCost += unitCost * item.quantity;
          totalPrice += salePrice * item.quantity;

          return {
            product_id: item.product_id,
            order_item_qty: item.quantity,
            order_item_unit_cost: unitCost,
            order_item_sale_price: salePrice,
          };
        })
      );

      // 2. บันทึกหัวบิลลงในตาราง consumable_orders[cite: 6]
      const newOrder = await tx.consumable_orders.create({
        data: {
          order_no,
          customer_id: Number(customer_id),
          contract_id: contract_id ? Number(contract_id) : null,
          employee_id: employee_id ? Number(employee_id) : null,
          order_date: new Date(),
          order_total_cost: totalCost,
          order_total_price: totalPrice,
          order_status: 'Delivered', // หรือ Pending ตามกระบวนการทำงาน
          consumable_order_items: {
            create: processedItems,
          },
        },
        include: {
          consumable_order_items: true,
        },
      });

      // 3. วนลูปบันทึกประวัติการตัดสต็อกใน inventory_transactions และอัปเดตสต็อกคงเหลือ[cite: 6]
      for (const item of items) {
        // บันทึกประวัติ Type 'OUT'[cite: 6]
        await tx.inventory_transactions.create({
          data: {
            product_id: item.product_id,
            employee_id: employee_id ? Number(employee_id) : null,
            transaction_type: 'OUT',
            quantity: item.quantity,
            reference_no: order_no,
            remark: `เบิกน้ำยาเคมีภัณฑ์ตามใบสั่งซื้อ ${order_no}`,
          },
        });

        // ตัดจำนวนสต็อกคงเหลือใน products_catalog[cite: 6]
        await tx.products_catalog.update({
          where: { product_id: item.product_id },
          data: {
            product_stock_qty: {
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