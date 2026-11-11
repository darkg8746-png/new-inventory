'use client';

import { useState, useEffect } from 'react';
import { FlaskConical, ArrowLeft, Plus, Trash2, CheckCircle2, Search, AlertCircle, RefreshCw, ShoppingCart, Layers } from 'lucide-react';
import Link from 'next/link';

interface Product {
  productId: number;
  productName: string;
  productModelCode: string | null;
  unitCost: number | null;
  stockQty: number | null;
  unitName: string | null;
}

interface Customer {
  customer_id: number;
  customer_name: string;
  customer_taxname: string | null;
  customer_number: string | null;
}

export default function ChemicalManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ฟอร์มสำหรับจัดการน้ำยา / ผสมน้ำยา
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [remark, setRemark] = useState('');
  const [batchRef, setBatchRef] = useState('');

  // ฟิลเตอร์ค้นหาในหน้า
  const [productSearch, setProductSearch] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchData();
    setBatchRef(`BATCH-${Date.now().toString().slice(-6)}`);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, custRes] = await Promise.all([
        fetch('/api/products').catch(() => null),
        fetch('/api/customers').catch(() => null),
      ]);

      if (prodRes) {
        const prodData = await prodRes.json();
        if (prodData.success) {
          // กรองเฉพาะสินค้าที่เป็นหมวดหมู่เคมีภัณฑ์หรือน้ำยา
          const chemProds = (prodData.products || []).filter((p: Product) => {
            const name = (p.productName || '').toLowerCase();
            return name.includes('น้ำยา') || name.includes('chemical') || name.includes('dish') || name.includes('cleaner');
          });
          // หากไม่มีหมวดน้ำยาเฉพาะ ให้แสดงทั้งหมดเพื่อความยืดหยุ่น
          setProducts(chemProds.length > 0 ? chemProds : prodData.products);
        }
      }

      if (custRes) {
        const custData = await custRes.json();
        if (custData.success) {
          setCustomers(custData.customers || []);
        }
      }
    } catch (error) {
      console.error('Error fetching chemical data:', error);
    }
    setLoading(false);
  };

  const handleChemicalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || quantity <= 0) {
      alert('กรุณาเลือกสินค้าและระบุจำนวนที่ต้องการเบิก');
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType: 'OUT',
          referenceNo: batchRef,
          remark: `[เบิกน้ำยาเคมีภัณฑ์] ${remark || 'ใช้งานประจำรอบ'}`,
          employeeId: 1, // หรือไอดีพนักงานปัจจุบัน
          items: [
            {
              productId: Number(selectedProductId),
              quantity: Number(quantity),
              unitCost: 0,
            }
          ]
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage('บันทึกการเบิกจ่ายและตัดสต็อกน้ำยาเคมีภัณฑ์สำเร็จ!');
        setQuantity(1);
        setSelectedProductId('');
        setRemark('');
        setBatchRef(`BATCH-${Date.now().toString().slice(-6)}`);
        fetchData();
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
    setSubmitting(false);
  };

  const filteredProducts = products.filter(p => 
    (p.productName || '').toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.productModelCode || '').toLowerCase().includes(productSearch.toLowerCase())
  );

  const currentSelectedProduct = products.find(p => p.productId === selectedProductId);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft size={16} /> กลับหน้าหลัก
            </Link>
            <div className="h-6 w-[1px] bg-slate-800"></div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
                <FlaskConical size={24} />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white">ระบบจัดการน้ำยาเคมีภัณฑ์ & ผสมสารละลาย</h1>
                <p className="text-slate-400 text-xs">ควบคุมสต็อกน้ำยา จัดการรอบการผสม และตัดสต็อกตามหน้างานจริง</p>
              </div>
            </div>
          </div>

          <button 
            onClick={fetchData} 
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
          >
            <RefreshCw size={14} />รีเฟรชข้อมูล
          </button>
        </div>

        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center gap-3 text-sm font-semibold shadow-lg">
            <CheckCircle2 size={20} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* ฟอร์มเบิกจ่ายน้ำยา */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShoppingCart className="text-indigo-400" size={20} /> ฟอร์มเบิกน้ำยาเคมีภัณฑ์หน้างาน
            </h2>

            <form onSubmit={handleChemicalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">เลขอ้างอิงรอบการผสม / Batch No. *</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none font-mono focus:border-indigo-500"
                  value={batchRef}
                  onChange={(e) => setBatchRef(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">เลือกผลิตภัณฑ์น้ำยาเคมี *</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500 cursor-pointer"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(Number(e.target.value))}
                  required
                >
                  <option value="" disabled>-- กรุณาเลือกน้ำยาเคมีภัณฑ์ --</option>
                  {products.map(p => (
                    <option key={p.productId} value={p.productId}>
                      {p.productName} ({p.productModelCode || 'ไม่มีรุ่น'}) — คงเหลือ: {p.stockQty ?? 0} {p.unitName || 'แกลลอน/ชิ้น'}
                    </option>
                  ))}
                </select>
              </div>

              {currentSelectedProduct && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500">สถานะสต็อกปัจจุบัน:</span>
                    <strong className="text-emerald-400 ml-2 font-mono text-sm">{currentSelectedProduct.stockQty ?? 0} {currentSelectedProduct.unitName || 'หน่วย'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">รหัสสินค้า ID:</span>
                    <strong className="text-indigo-400 ml-2 font-mono">#{currentSelectedProduct.productId}</strong>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">จำนวนที่ต้องการเบิก *</label>
                  <input 
                    type="number" 
                    min="1" 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none font-bold text-center focus:border-indigo-500"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">ลูกค้า / หน้างานผู้รับน้ำยา (ถ้ามี)</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500 cursor-pointer"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">-- ไม่ระบุลูกค้า / ใช้ในคลังกลาง --</option>
                    {customers.map(c => (
                      <option key={c.customer_id} value={c.customer_id}>
                        #{c.customer_id} - {c.customer_name} {c.customer_taxname ? `(${c.customer_taxname})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">หมายเหตุเพิ่มเติม</label>
                <input 
                  type="text" 
                  placeholder="เช่น เติมน้ำยาเครื่องล้างจานรอบเช้า ประจำจุดร้านอาหาร..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 mt-2"
              >
                {submitting ? 'กำลังบันทึกข้อมูล...' : <><FlaskConical size={18} /> ยืนยันการเบิกและตัดสต็อกน้ำยา</>}
              </button>
            </form>
          </div>

          {/* รายชื่อน้ำยาเคมีในคลังแบบย่อ */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="text-amber-400" size={18} /> สต็อกน้ำยาเคมีคงเหลือ
            </h2>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="🔍 ค้นหาน้ำยาในคลัง..." 
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white outline-none focus:border-amber-500"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2 pr-1">
              {loading ? (
                <div className="text-center py-10 text-slate-500 text-xs">กำลังโหลดสต็อก...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">ไม่พบรายการน้ำยาเคมี</div>
              ) : (
                filteredProducts.map(p => (
                  <div 
                    key={p.productId} 
                    onClick={() => setSelectedProductId(p.productId)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between text-xs ${
                      selectedProductId === p.productId 
                        ? 'bg-indigo-950/40 border-indigo-500 text-white' 
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white truncate max-w-[180px]">{p.productName}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{p.productModelCode || `ID: #${p.productId}`}</div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-md font-bold font-mono text-xs ${
                        (p.stockQty ?? 0) > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {p.stockQty ?? 0} {p.unitName || 'ชิ้น'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-indigo-950/30 border border-indigo-500/20 p-3 rounded-xl text-[11px] text-indigo-300 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>ระบบจะทำการตัดสต็อกแบบอัตโนมัติผ่านระบบ FIFO (หยิบ Lot เก่าสุดออกก่อน) ทันทีเมื่อกดบันทึก</span>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}