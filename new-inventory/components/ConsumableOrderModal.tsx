'use client';

import { useState } from 'react';

interface ConsumableOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ConsumableOrderModal({ isOpen, onClose, onSuccess }: ConsumableOrderModalProps) {
  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      customer_id: Number(customerId),
      employee_id: 1, 
      items: [
        {
          product_id: Number(productId),
          quantity: Number(quantity),
        },
      ],
    };

    try {
      const res = await fetch('/api/consumable-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        alert('บันทึกการเบิกน้ำยาและตัดสต็อกสำเร็จ!');
        setCustomerId('');
        setProductId('');
        setQuantity(1);
        onSuccess();
        onClose();
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 text-white p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-amber-400">💧 บันทึกเบิกน้ำยาเคมีภัณฑ์</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl font-bold">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 text-slate-300">รหัสลูกค้า (Customer ID)</label>
            <input
              type="number"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
              placeholder="เช่น 1"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-slate-300">รหัสสินค้าเคมีภัณฑ์ (Product ID)</label>
            <input
              type="number"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
              placeholder="เช่น 10"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-slate-300">จำนวนที่เบิก (แกลลอน/ถัง)</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition shadow-lg"
            >
              {loading ? 'กำลังบันทึก...' : 'ยืนยันการเบิก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}