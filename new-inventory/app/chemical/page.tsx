'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, FlaskConical, Truck, CheckCircle2, AlertTriangle, Database, Layers, ShoppingCart, X } from 'lucide-react';
import Link from 'next/link';

interface Product {
  productId: number;
  productName: string;
  productModelCode: string | null;
  unitCost: number | null;
  salePrice: number | null;
  stockQty: number | null;
  categoryId: number;
  unitName: string | null;
}

interface Customer {
  customer_id: number;
  customer_name: string;
  customer_taxname: string | null;
  customer_contact_name: string | null;
  customer_number: string | null;
}

export default function ChemicalSystemPage() {
  const [activeTab, setActiveTab] = useState<'mixing' | 'delivery'>('mixing');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State: Sub-tab A (Internal Batching / Mixing)
  const [selectedSourceId, setSelectedSourceId] = useState<number | ''>('');
  const [batchQty, setBatchQty] = useState<number>(1);
  const [isDilutionProcess, setIsDilutionProcess] = useState<boolean>(true);
  const [batchRemark, setBatchRemark] = useState<string>('');

  // Form State: Sub-tab B (Delivery Order)
  const [deliveryProductId, setDeliveryProductId] = useState<number | ''>('');
  const [deliveryQty, setDeliveryQty] = useState<number>(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [deliveryRef, setDeliveryRef] = useState<string>('');
  const [deliveryRemark, setDeliveryRemark] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, custRes] = await Promise.all([
        fetch('/api/products').catch(() => null),
        fetch('/api/customers').catch(() => null)
      ]);

      if (prodRes) {
        const prodData = await prodRes.json();
        if (prodData.success) {
          setProducts(prodData.products || []);
          const firstChemical = prodData.products?.find((p: Product) => p.categoryId === 5 || (p.productName || '').includes('หัวเชื้อ') || (p.productName || '').includes('น้ำยา'));
          if (firstChemical) setSelectedSourceId(firstChemical.productId);
        }
      }

      if (custRes) {
        const custData = await custRes.json();
        if (custData.success) {
          setCustomers(custData.customers || []);
        }
      }
    } catch (error) {
      console.error('Error fetching chemical system data:', error);
    }
    setLoading(false);
  };

  const handleMixingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSourceId) return alert('กรุณาเลือกหัวเชื้อน้ำยาตั้งต้น');
    if (batchQty <= 0) return alert('กรุณาระบุจำนวนมากกว่า 0');

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType: isDilutionProcess ? 'MIXING' : 'OUT',
          referenceNo: `BATCH-${Math.floor(100000 + Math.random() * 900000)}`,
          remark: batchRemark || (isDilutionProcess ? 'เบิกผสมน้ำยาคลังกลาง' : 'เบิกน้ำยาสำเร็จรูปโดยไม่ผ่านกระบวนการผสม'),
          items: [{ productId: Number(selectedSourceId), quantity: Number(batchQty) }]
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('บันทึกการตัดสต็อกหัวเชื้อและเพิ่มสต็อกน้ำยาผสมสำเร็จเรียบร้อยแล้ว');
        setBatchRemark('');
        fetchData();
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (err) {
      alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    }
    setIsSubmitting(false);
  };

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryProductId) return alert('กรุณาเลือกผลิตภัณฑ์น้ำยาที่ต้องการจัดส่ง');
    if (deliveryQty <= 0) return alert('กรุณาระบุจำนวนมากกว่า 0');
    if (!selectedCustomerId) return alert('กรุณาเลือกร้านค้าลูกค้าผู้รับน้ำยา');

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType: 'OUT',
          referenceNo: deliveryRef || `DO-${Math.floor(100000 + Math.random() * 900000)}`,
          customerId: Number(selectedCustomerId),
          remark: deliveryRemark || 'จัดส่งน้ำยาให้ลูกค้า',
          items: [{ productId: Number(deliveryProductId), quantity: Number(deliveryQty) }]
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('เปิดบิลจัดส่งน้ำยาและตัดสต็อกสำเร็จเรียบร้อยแล้ว');
        setDeliveryRef('');
        setDeliveryRemark('');
        fetchData();
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (err) {
      alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    }
    setIsSubmitting(false);
  };

  const chemicalProducts = products.filter(p => 
    p.categoryId === 5 || 
    (p.productName || '').toLowerCase().includes('น้ำยา') || 
    (p.productName || '').toLowerCase().includes('หัวเชื้อ') ||
    (p.productName || '').toLowerCase().includes('แกลลอน')
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans relative">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition flex items-center gap-1.5 text-sm font-semibold">
              <ArrowLeft size={18} /> กลับหน้าหลัก
            </Link>
            <div className="h-6 w-[1px] bg-slate-800"></div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2">
                <FlaskConical className="text-indigo-400" size={26} /> ระบบจัดการน้ำยาเคมีภัณฑ์ & ผสมสารละลาย
              </h1>
              <p className="text-slate-400 text-xs md:text-sm mt-0.5">ควบคุมสต็อกน้ำยา จัดการรอบการผสม และตัดสต็อกตามหน้างานจริง</p>
            </div>
          </div>
          <button onClick={fetchData} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-700 shadow-sm">
            <RefreshCw size={14} /> รีเฟรชข้อมูล
          </button>
        </div>

        {/* Sub-tab Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-lg">
          <button 
            onClick={() => setActiveTab('mixing')}
            className={`py-3.5 px-5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2.5 ${
              activeTab === 'mixing' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/50' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FlaskConical size={18} /> Sub-tab A: เบิกคลังกลางเพื่อผสมน้ำยา (Internal Batching)
          </button>
          <button 
            onClick={() => setActiveTab('delivery')}
            className={`py-3.5 px-5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2.5 ${
              activeTab === 'delivery' 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/50' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Truck size={18} /> Sub-tab B: เปิดบิลจัดส่งน้ำยาให้ลูกค้า (Delivery Order)
          </button>
        </div>

        {/* Notice Banner */}
        <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 text-xs md:text-sm text-indigo-200 flex items-start gap-3 shadow-lg">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl shrink-0 mt-0.5"><Layers size={18} /></div>
          <div>
            <strong className="text-white font-bold block mb-0.5">หลักการทำงานของระบบน้ำยา:</strong>
            {activeTab === 'mixing' 
              ? 'เบิกหัวเชื้อน้ำยาออกจากคลังโดย ไม่ต้องระบุชื่อร้านค้าลูกค้า ระบบจะตัดสต็อกหัวเชื้อบริสุทธิ์ (OUT) และคำนวณอัตราส่วนเพื่อเพิ่มสต็อกน้ำยาผสมสำเร็จเข้าคลัง (IN) ให้อัตโนมัติพร้อมคำนวณเฉลี่ยต้นทุนต่อถัง'
              : 'เลือกผลิตภัณฑ์น้ำยาสำเร็จรูปที่ผสมเสร็จแล้ว จากนั้นเลือกร้านค้าลูกค้าปลายทาง ระบบจะทำการตัดสต็อกแบบ FIFO (หยิบ Lot เก่าออกก่อน) ทันทีเมื่อกดยืนยันจัดส่ง'
            }
          </div>
        </div>

        {/* Form Section */}
        {activeTab === 'mixing' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
              <FlaskConical className="text-indigo-400" size={20} /> ฟอร์มเบิกหัวเชื้อเพื่อผสมน้ำยากลาง
            </h2>

            <form onSubmit={handleMixingSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs md:text-sm text-slate-400 mb-2 font-medium">1. เลือกน้ำยาหัวเชื้อตั้งต้น *</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500 transition cursor-pointer"
                    value={selectedSourceId}
                    onChange={(e) => setSelectedSourceId(Number(e.target.value))}
                  >
                    <option value="" disabled>-- เลือกหัวเชื้อน้ำยา --</option>
                    {chemicalProducts.map(p => (
                      <option key={p.productId} value={p.productId}>
                        {p.productName} (คงเหลือ: {p.stockQty ?? 0} {p.unitName || 'ถัง/แกลลอน'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs md:text-sm text-slate-400 mb-2 font-medium">2. จำนวนหัวเชื้อที่เบิก (ถัง/แกลลอน) *</label>
                  <input 
                    type="number" 
                    min="1" 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500 font-bold"
                    value={batchQty}
                    onChange={(e) => setBatchQty(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 accent-indigo-500 rounded cursor-pointer"
                    checked={isDilutionProcess}
                    onChange={(e) => setIsDilutionProcess(e.target.checked)}
                  />
                  <span className="text-sm font-bold text-white">ทำการผสมน้ำยา ณ คลังกลาง (Dilution Process)</span>
                </label>

                {!isDilutionProcess && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300 flex items-center gap-2">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>เบิกน้ำยาสำเร็จรูป/สินค้าเดิมออกไปเตรียมไว้โดย ไม่ผ่านกระบวนการผสมน้ำ</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs md:text-sm text-slate-400 mb-2 font-medium">3. หมายเหตุบันทึกคลัง</label>
                <input 
                  type="text" 
                  placeholder="เช่น เบิกผสมน้ำยาถังใหญ่ประจำสัปดาห์..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500"
                  value={batchRemark}
                  onChange={(e) => setBatchRemark(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'กำลังบันทึก...' : <><CheckCircle2 size={18} /> บันทึกตัดสต็อกหัวเชื้อ & เพิ่มสต็อกน้ำยาผสม</>}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
              <Truck className="text-emerald-400" size={20} /> ฟอร์มเปิดบิลจัดส่งน้ำยาให้ลูกค้า (Delivery Order)
            </h2>

            <form onSubmit={handleDeliverySubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs md:text-sm text-slate-400 mb-2 font-medium">เลือกผลิตภัณฑ์น้ำยาสำเร็จรูป *</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500 transition cursor-pointer"
                    value={deliveryProductId}
                    onChange={(e) => setDeliveryProductId(Number(e.target.value))}
                  >
                    <option value="" disabled>-- เลือกน้ำยาสำหรับจัดส่ง --</option>
                    {products.map(p => (
                      <option key={p.productId} value={p.productId}>
                        {p.productName} (คงเหลือ: {p.stockQty ?? 0} {p.unitName || 'ถัง'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs md:text-sm text-slate-400 mb-2 font-medium">จำนวนที่จัดส่ง *</label>
                  <input 
                    type="number" 
                    min="1" 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500 font-bold"
                    value={deliveryQty}
                    onChange={(e) => setDeliveryQty(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs md:text-sm text-slate-400 mb-2 font-medium">เลือกร้านค้า / ลูกค้าผู้รับน้ำยา *</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500 transition cursor-pointer"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                  >
                    <option value="" disabled>-- เลือกลูกค้า --</option>
                    {customers.map(c => (
                      <option key={c.customer_id} value={c.customer_id}>
                        #{c.customer_id} - {c.customer_name} {c.customer_taxname ? `(${c.customer_taxname})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs md:text-sm text-slate-400 mb-2 font-medium">เลขที่ใบส่งของ (Delivery No.)</label>
                  <input 
                    type="text" 
                    placeholder="เช่น DO-2026-001"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500 font-mono"
                    value={deliveryRef}
                    onChange={(e) => setDeliveryRef(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm text-slate-400 mb-2 font-medium">หมายเหตุการจัดส่ง</label>
                <input 
                  type="text" 
                  placeholder="เช่น จัดส่งรอบประจำสัปดาห์..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500"
                  value={deliveryRemark}
                  onChange={(e) => setDeliveryRemark(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'กำลังบันทึก...' : <><CheckCircle2 size={18} /> ยืนยันเปิดบิลจัดส่ง & ตัดสต็อก FIFO</>}
              </button>
            </form>
          </div>
        )}

        {/* Live Stock Monitor Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Database className="text-indigo-400" size={18} /> สต็อกคลังสินค้าล่าสุด (Live Stock Monitor)
            </h3>
            <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-bold">Realtime</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {loading ? (
              <div className="col-span-full py-8 text-center text-slate-500 text-sm">กำลังโหลดข้อมูลสต็อก...</div>
            ) : chemicalProducts.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-500 text-sm">ไม่พบรายการน้ำยาในคลังสินค้า</div>
            ) : (
              chemicalProducts.slice(0, 4).map(p => (
                <div key={p.productId} className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-1">
                  <div className="text-slate-400 text-xs truncate" title={p.productName}>{p.productName}</div>
                  <div className="text-xl font-extrabold text-emerald-400 font-mono">
                    {p.stockQty ?? 0} <span className="text-xs font-normal text-slate-400">{p.unitName || 'ถัง'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </main>
  );
}