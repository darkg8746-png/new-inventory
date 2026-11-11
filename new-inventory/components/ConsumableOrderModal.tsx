'use client';

import { useState } from 'react';
import { X, ShoppingCart, CheckCircle2 } from 'lucide-react';

interface Product {
  productId: number;
  productName: string;
  productModelCode: string | null;
  unitCost: number | null;
  salePrice: number | null;
  rentPrice: number | null;
  stockQty: number | null;
  isPreorder: boolean;
  categoryId: number;
  unitName: string | null;
}

interface Customer {
  customer_id: number;
  customer_name: string;
  customer_taxname: string | null;
  customer_contact_name: string | null;
  customer_number: string | null;
  customer_status: string | null;
}

interface ConsumableOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  customers: Customer[];
  onSuccess?: () => void;
}

export default function ConsumableOrderModal({
  isOpen,
  onClose,
  products,
  customers,
  onSuccess
}: ConsumableOrderModalProps) {
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      alert('กรุณาเลือกสินค้า');
      return;
    }
    if (quantity <= 0) {
      alert('กรุณาระบุจำนวนมากกว่า 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType: 'OUT',
          referenceNo: selectedCustomerId ? `ORDER-CUST-${selectedCustomerId}` : 'ORDER-CONSUMABLE',
          remark: remark ? `เบิกน้ำยา/เคมีภัณฑ์: ${remark}` : 'เบิกน้ำยา/เคมีภัณฑ์',
          items: [
            {
              productId: Number(selectedProductId),
              quantity: Number(quantity),
              unitCost: 0,
              expireDate: null
            }
          ]
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('เบิกน้ำยา/เคมีภัณฑ์สำเร็จ');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0b1329] border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <ShoppingCart className="text-blue-500" size={24} /> เบิกน้ำยา / เคมีภัณฑ์
          </h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white transition p-1 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-slate-200">
          {/* Product Select */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">
              เลือกสินค้า/น้ำยา/เคมีภัณฑ์ <span className="text-blue-400">*</span>
            </label>
            <select
              className="w-full bg-[#050b18] border border-slate-800/80 rounded-2xl px-4 py-3 text-white outline-none focus:border-blue-500 transition appearance-none cursor-pointer text-sm"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : '')}
              required
            >
              <option value="" disabled>-- กรุณาเลือกสินค้า --</option>
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.productName} ({p.productModelCode || 'ไม่มีรหัส'}) - คงเหลือ: {p.stockQty ?? 0} {p.unitName || 'ชิ้น'}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">
              จำนวนที่ต้องการเบิก <span className="text-blue-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              className="w-full bg-[#050b18] border border-slate-800/80 rounded-2xl px-4 py-3 text-white outline-none focus:border-blue-500 font-bold transition text-sm"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
          </div>

          {/* Customer Select */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">
              ลูกค้าผู้เบิก / หน้างาน (ถ้ามี)
            </label>
            <select
              className="w-full bg-[#050b18] border border-slate-800/80 rounded-2xl px-4 py-3 text-white outline-none focus:border-blue-500 transition appearance-none cursor-pointer text-sm"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">-- ไม่ระบุลูกค้า --</option>
              {customers.map((c) => (
                <option key={c.customer_id} value={c.customer_id}>
                  #{c.customer_id} - {c.customer_name} {c.customer_taxname ? `(${c.customer_taxname})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Remark */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">
              หมายเหตุ / รายละเอียดเพิ่มเติม
            </label>
            <input
              type="text"
              placeholder="เช่น เติมน้ำยาล้างเครื่องประจำเดือน"
              className="w-full bg-[#050b18] border border-slate-800/80 rounded-2xl px-4 py-3 text-white outline-none focus:border-blue-500 transition text-sm placeholder:text-slate-600"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </div>

          {/* Buttons */}
          <div className="pt-4 flex justify-end items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-[#1b253e] hover:bg-slate-800 text-slate-300 rounded-2xl text-sm font-medium transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-blue-600/30"
            >
              {isSubmitting ? 'กำลังบันทึก...' : <><CheckCircle2 size={18} /> ยืนยันการเบิก</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}