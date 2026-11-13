'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  FlaskConical,
  Truck,
  ArrowLeft,
  Camera,
  CheckCircle2,
  AlertCircle,
  Search,
  UserCheck,
  Package,
  RefreshCw,
  Image as ImageIcon,
  X
} from 'lucide-react';

// เชื่อมต่อ Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ChemicalSystemPage() {
  const [activeSubTab, setActiveSubTab] = useState<'mix' | 'delivery'>('mix');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ข้อมูลสต็อกและรายชื่อ
  const [products, setProducts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);

  // State สำหรับ Sub-tab A: ผสมน้ำยา (1:2)
  const [concentrateId, setConcentrateId] = useState<string>('');
  const [mixedId, setMixedId] = useState<string>('');
  const [mixAmount, setMixAmount] = useState<number>(1);
  const [mixEmployeeId, setMixEmployeeId] = useState<string>('');
  const [mixNote, setMixNote] = useState<string>('');

  // State สำหรับ Sub-tab B: จัดส่งลูกค้า
  const [deliveryChemType, setDeliveryChemType] = useState<'mixed' | 'concentrate'>('mixed');
  const [deliveryQty, setDeliveryQty] = useState<number>(1);
  const [deliveryEmployeeId, setDeliveryEmployeeId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);
  const [deliveryNote, setDeliveryNote] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // โหลดข้อมูลเริ่มต้น
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [prodRes, empRes, custRes, lotRes] = await Promise.all([
        supabase.from('products_catalog').select('*'),
        supabase
          .from('employees')
          .select('employee_id, employee_name, employee_role, employee_status')
          .eq('employee_status', 'Active'),
        supabase.from('customers').select('*'),
        supabase.from('product_lots').select('*').gt('current_qty', 0).order('created_at', { ascending: true })
      ]);

      if (prodRes.data) {
        setProducts(prodRes.data);
        // ค้นหาสินค้าหัวเชื้อและน้ำยาผสมอัตโนมัติ (อิงจากชื่อสินค้า)
        const conc = prodRes.data.find((p: any) =>
          p.product_name?.includes('หัวเชื้อ') || p.sku?.includes('CONC')
        );
        const mix = prodRes.data.find((p: any) =>
          (p.product_name?.includes('ผสม') || p.sku?.includes('MIX')) && p.product_id !== conc?.product_id
        );
        if (conc) setConcentrateId(String(conc.product_id));
        if (mix) setMixedId(String(mix.product_id));
      }

      if (empRes.error) {
        console.error('Error fetching employees:', empRes.error.message);
      } else if (empRes.data) {
        setEmployees(empRes.data);
      }

      if (custRes.data) setCustomers(custRes.data);
      if (lotRes.data) setLots(lotRes.data);
    } catch (err: any) {
      console.error('Error loading chemical data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // คำนวณยอดคงเหลือรวมของแต่ละสินค้า
  const getProductStock = (prodId: string | number) => {
    if (!prodId) return 0;
    return lots
      .filter((l) => String(l.product_id) === String(prodId))
      .reduce((sum, l) => sum + Number(l.current_qty || 0), 0);
  };

  // ฟังก์ชันตัดสต็อกแบบ FIFO
  const deductStockFIFO = async (
    productId: string | number,
    qtyToDeduct: number,
    txType: string,
    employeeId: string,
    note: string,
    customerId?: number | string | null,
    imageUrl?: string | null
  ) => {
    const productLots = lots.filter(
      (l) => String(l.product_id) === String(productId) && Number(l.current_qty) > 0
    );

    const totalAvailable = productLots.reduce((sum, l) => sum + Number(l.current_qty), 0);
    if (totalAvailable < qtyToDeduct) {
      throw new Error(`สต็อกคงเหลือไม่เพียงพอ (มีอยู่ ${totalAvailable} หน่วย แต่ต้องการใช้ ${qtyToDeduct} หน่วย)`);
    }

    // บันทึก Transaction หลัก
    const { data: txData, error: txError } = await supabase
      .from('inventory_transactions')
      .insert([
        {
          product_id: Number(productId),
          transaction_type: txType,
          quantity: qtyToDeduct,
          employee_id: employeeId ? Number(employeeId) : null,
          customer_id: customerId ? Number(customerId) : null,
          notes: note,
          proof_image_url: imageUrl || null,
          transaction_date: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (txError) throw txError;

    // ตัดสต็อกทีละ Lot แบบ FIFO
    let remaining = qtyToDeduct;
    for (const lot of productLots) {
      if (remaining <= 0) break;
      const availableInLot = Number(lot.current_qty);
      const take = Math.min(availableInLot, remaining);
      const newQty = availableInLot - take;

      const { error: updateLotError } = await supabase
        .from('product_lots')
        .update({ current_qty: newQty })
        .eq('lot_id', lot.lot_id);

      if (updateLotError) throw updateLotError;

      // บันทึกรายละเอียด Lot ที่ถูกตัด
      await supabase.from('transaction_lot_details').insert([
        {
          transaction_id: txData.transaction_id,
          lot_id: lot.lot_id,
          quantity_affected: take
        }
      ]);

      remaining -= take;
    }

    return txData;
  };

  // จัดการ Sub-tab A: ผสมน้ำยา (ตัดหัวเชื้อ 1 : เพิ่มน้ำยาผสม 2)
  const handleMixSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!concentrateId || !mixedId) {
      setMessage({ type: 'error', text: 'กรุณาเลือกรายการสินค้าหัวเชื้อและน้ำยาผสมให้ครบถ้วน' });
      return;
    }
    if (concentrateId === mixedId) {
      setMessage({ type: 'error', text: 'สินค้าหัวเชื้อและน้ำยาผสมต้องไม่เป็นรายการเดียวกัน' });
      return;
    }
    if (!mixEmployeeId) {
      setMessage({ type: 'error', text: 'กรุณาเลือกพนักงานผู้เบิก' });
      return;
    }
    if (mixAmount <= 0) {
      setMessage({ type: 'error', text: 'จำนวนหัวเชื้อต้องมากกว่า 0' });
      return;
    }

    const outputMixedQty = mixAmount * 2; // อัตราส่วน 1:2
    setSubmitting(true);

    try {
      // 1. ตัดสต็อกหัวเชื้อ (OUT)
      await deductStockFIFO(
        concentrateId,
        mixAmount,
        'OUT',
        mixEmployeeId,
        `เบิกหัวเชื้อผสมน้ำยา (สูตร 1:2 ได้น้ำยาผสม ${outputMixedQty} หน่วย) ${mixNote ? '- ' + mixNote : ''}`
      );

      // 2. เพิ่มสต็อกน้ำยาผสม (IN) สร้าง Lot ใหม่
      const newLotNo = `MIX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

      const { data: newLot, error: lotError } = await supabase
        .from('product_lots')
        .insert([
          {
            product_id: Number(mixedId),
            lot_number: newLotNo,
            initial_qty: outputMixedQty,
            current_qty: outputMixedQty,
            received_date: new Date().toISOString().slice(0, 10)
          }
        ])
        .select()
        .single();

      if (lotError) throw lotError;

      const { data: inTx, error: inTxError } = await supabase
        .from('inventory_transactions')
        .insert([
          {
            product_id: Number(mixedId),
            transaction_type: 'IN',
            quantity: outputMixedQty,
            employee_id: Number(mixEmployeeId),
            notes: `รับเข้าน้ำยาจากการผสม (ใช้หัวเชื้อ ${mixAmount} หน่วย) Lot: ${newLotNo} ${mixNote ? '- ' + mixNote : ''}`,
            transaction_date: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (inTxError) throw inTxError;

      await supabase.from('transaction_lot_details').insert([
        {
          transaction_id: inTx.transaction_id,
          lot_id: newLot.lot_id,
          quantity_affected: outputMixedQty
        }
      ]);

      setMessage({
        type: 'success',
        text: `บันทึกการผสมน้ำยาสำเร็จ! ตัดหัวเชื้อ ${mixAmount} หน่วย และเพิ่มน้ำยาผสม ${outputMixedQty} หน่วย (Lot: ${newLotNo})`
      });
      setMixAmount(1);
      setMixNote('');
      await fetchInitialData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    } finally {
      setSubmitting(false);
    }
  };

  // จัดการอัปโหลดรูปภาพตัวอย่าง
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // จัดการ Sub-tab B: จัดส่งลูกค้า
  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const targetProductId = deliveryChemType === 'mixed' ? mixedId : concentrateId;

    if (!targetProductId) {
      setMessage({ type: 'error', text: 'ไม่พบรหัสสินค้าน้ำยาในระบบ กรุณาตรวจสอบแคตตาล็อกสินค้า' });
      return;
    }
    if (!selectedCustomer) {
      setMessage({ type: 'error', text: 'กรุณาค้นหาและเลือกลูกค้าที่ต้องการจัดส่ง' });
      return;
    }
    if (!deliveryEmployeeId) {
      setMessage({ type: 'error', text: 'กรุณาเลือกพนักงานผู้จัดส่ง' });
      return;
    }
    if (deliveryQty <= 0) {
      setMessage({ type: 'error', text: 'จำนวนที่จัดส่งต้องมากกว่า 0' });
      return;
    }

    setSubmitting(true);
    try {
      let uploadedImageUrl: string | null = null;

      // อัปโหลดรูปภาพขึ้น Supabase Storage (ถ้ามี)
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `delivery_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('delivery-photos')
          .upload(fileName, photoFile);

        if (uploadError) {
          console.warn('Upload photo failed, continuing without photo URL:', uploadError.message);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('delivery-photos')
            .getPublicUrl(fileName);
          uploadedImageUrl = publicUrlData.publicUrl;
        }
      }

      const custName = selectedCustomer.shop_name || selectedCustomer.company_name || selectedCustomer.customer_name || `ID:${selectedCustomer.customer_id}`;
      const chemLabel = deliveryChemType === 'mixed' ? 'น้ำยาผสมพร้อมใช้' : 'น้ำยาหัวเชื้อ';

      await deductStockFIFO(
        targetProductId,
        deliveryQty,
        'OUT',
        deliveryEmployeeId,
        `จัดส่ง${chemLabel} ให้ลูกค้า: ${custName} ${deliveryNote ? '- ' + deliveryNote : ''}`,
        selectedCustomer.customer_id,
        uploadedImageUrl
      );

      setMessage({
        type: 'success',
        text: `บันทึกการจัดส่ง${chemLabel} จำนวน ${deliveryQty} หน่วย ให้กับ "${custName}" เรียบร้อยแล้ว!`
      });

      // รีเซ็ตฟอร์มจัดส่ง
      setDeliveryQty(1);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setDeliveryNote('');
      setPhotoFile(null);
      setPhotoPreview(null);
      await fetchInitialData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการบันทึกการจัดส่ง' });
    } finally {
      setSubmitting(false);
    }
  };

  // กรองรายชื่อลูกค้าตามคำค้นหา
  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      String(c.customer_id || '').toLowerCase().includes(q) ||
      String(c.shop_name || '').toLowerCase().includes(q) ||
      String(c.company_name || '').toLowerCase().includes(q) ||
      String(c.customer_name || '').toLowerCase().includes(q) ||
      String(c.contact_name || '').toLowerCase().includes(q) ||
      String(c.phone || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d1322] border border-slate-800/80 p-5 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <FlaskConical className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                ระบบจัดการน้ำยา & จัดส่งลูกค้า
              </h1>
              <p className="text-sm text-slate-400">
                เบิกผสมหัวเชื้อ (อัตราส่วน 1:2) และบันทึกการจัดส่งพร้อมหลักฐาน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchInitialData}
              disabled={loading}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="รีเฟรชข้อมูลสต็อก"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-sm font-medium transition"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับหน้าหลัก
            </Link>
          </div>
        </div>

        {/* แสดงยอดคงเหลือน้ำยาปัจจุบัน */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#0d1322] border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md">
                สต็อกหัวเชื้อเข้มข้น
              </span>
              <p className="text-sm text-slate-400 mt-2">
                {products.find((p) => String(p.product_id) === concentrateId)?.product_name || 'ยังไม่ได้เลือกสินค้าหัวเชื้อ'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-amber-400">
                {getProductStock(concentrateId)}
              </span>
              <span className="text-xs text-slate-400 block">แกลลอน / หน่วย</span>
            </div>
          </div>

          <div className="bg-[#0d1322] border border-cyan-500/30 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md">
                สต็อกน้ำยาผสมพร้อมใช้
              </span>
              <p className="text-sm text-slate-400 mt-2">
                {products.find((p) => String(p.product_id) === mixedId)?.product_name || 'ยังไม่ได้เลือกสินค้าน้ำยาผสม'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-cyan-400">
                {getProductStock(mixedId)}
              </span>
              <span className="text-xs text-slate-400 block">แกลลอน / หน่วย</span>
            </div>
          </div>
        </div>

        {/* แจ้งเตือนสถานะ */}
        {message && (
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            )}
            <p className="text-sm leading-relaxed">{message.text}</p>
          </div>
        )}

        {/* Sub-Tabs Navigation */}
        <div className="grid grid-cols-2 gap-3 bg-[#0d1322] p-2 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('mix');
              setMessage(null);
            }}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition ${
              activeSubTab === 'mix'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            เบิกผสมน้ำยา (สูตร 1:2)
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('delivery');
              setMessage(null);
            }}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition ${
              activeSubTab === 'delivery'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Truck className="w-4 h-4" />
            จัดส่งน้ำยาลูกค้า
          </button>
        </div>

        {/* Sub-Tab A: ผสมน้ำยา */}
        {activeSubTab === 'mix' && (
          <form
            onSubmit={handleMixSubmit}
            className="bg-[#0d1322] border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl"
          >
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-emerald-400" />
                บันทึกการผสมน้ำยา (ตัดหัวเชื้อ 1 : เพิ่มน้ำยาผสม 2)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                ระบบจะตัดสต็อกหัวเชื้อแบบ FIFO และสร้าง Lot ใหม่ให้น้ำยาผสมอัตโนมัติในอัตราส่วน 2 เท่า
              </p>
            </div>

            {/* 1. เลือกสินค้าหัวเชื้อ & น้ำยาผสม */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-amber-400 mb-2">
                  1.1 สินค้าหัวเชื้อ (ตัดออก) *
                </label>
                <select
                  value={concentrateId}
                  onChange={(e) => setConcentrateId(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400"
                  required
                >
                  <option value="">-- เลือกสินค้าหัวเชื้อ --</option>
                  {products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      [{p.sku || p.product_id}] {p.product_name} (คงเหลือ: {getProductStock(p.product_id)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-cyan-400 mb-2">
                  1.2 สินค้าน้ำยาผสม (รับเข้า) *
                </label>
                <select
                  value={mixedId}
                  onChange={(e) => setMixedId(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
                  required
                >
                  <option value="">-- เลือกสินค้าน้ำยาผสม --</option>
                  {products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      [{p.sku || p.product_id}] {p.product_name} (คงเหลือ: {getProductStock(p.product_id)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. จำนวนหัวเชื้อที่ใช้ */}
            <div className="bg-[#090d16] border border-slate-800 p-4 rounded-xl space-y-3">
              <label className="block text-sm font-medium text-emerald-400">
                2. จำนวนหัวเชื้อที่เบิกมาผสม (หน่วย) *
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <input
                  type="number"
                  min={1}
                  step="any"
                  value={mixAmount}
                  onChange={(e) => setMixAmount(Number(e.target.value))}
                  className="w-full sm:w-48 bg-[#0d1322] border border-emerald-500/40 rounded-xl px-4 py-3 text-xl font-bold text-white focus:outline-none focus:border-emerald-400"
                  required
                />
                <div className="flex items-center gap-2 text-sm bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-xl text-emerald-300">
                  <span>ผลลัพธ์ที่ได้ (x2):</span>
                  <strong className="text-lg text-white">{(mixAmount || 0) * 2}</strong>
                  <span>หน่วยน้ำยาผสมพร้อมใช้</span>
                </div>
              </div>
            </div>

            {/* 3. พนักงานผู้เบิก */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-emerald-400 mb-2">
                <UserCheck className="w-4 h-4" />
                3. พนักงานผู้เบิก *
              </label>
              <select
                value={mixEmployeeId}
                onChange={(e) => setMixEmployeeId(e.target.value)}
                className="w-full bg-[#090d16] border border-emerald-500/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-400"
                required
              >
                <option value="">-- กรุณาเลือกพนักงานผู้เบิกจากรายชื่อ --</option>
                {employees.map((emp) => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    [{emp.employee_id}] {emp.employee_name} ({emp.employee_role})
                  </option>
                ))}
              </select>
            </div>

            {/* 4. หมายเหตุ */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                4. หมายเหตุบันทึกคลัง
              </label>
              <input
                type="text"
                value={mixNote}
                onChange={(e) => setMixNote(e.target.value)}
                placeholder="เช่น เบิกผสมน้ำยาถังใหญ่ประจำสัปดาห์..."
                className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/40 transition flex items-center justify-center gap-2"
            >
              {submitting ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันการเบิกผสมน้ำยา (1:2)'}
            </button>
          </form>
        )}

        {/* Sub-Tab B: จัดส่งลูกค้า */}
        {activeSubTab === 'delivery' && (
          <form
            onSubmit={handleDeliverySubmit}
            className="bg-[#0d1322] border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl"
          >
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-cyan-400" />
                บันทึกการจัดส่งน้ำยาให้ลูกค้า
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                เลือกประเภทน้ำยา ค้นหาลูกค้า และแนบภาพถ่ายหลักฐานการจัดส่ง
              </p>
            </div>

            {/* 1. เลือกประเภทน้ำยาที่จะจัดส่ง */}
            <div>
              <label className="block text-sm font-medium text-cyan-400 mb-2">
                1. ประเภทน้ำยาที่จัดส่ง *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDeliveryChemType('mixed')}
                  className={`p-3.5 rounded-xl border text-left transition ${
                    deliveryChemType === 'mixed'
                      ? 'bg-cyan-500/15 border-cyan-400 text-white'
                      : 'bg-[#090d16] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-sm">น้ำยาผสมพร้อมใช้</div>
                  <div className="text-xs text-cyan-400 mt-1">
                    คงเหลือ: {getProductStock(mixedId)} หน่วย
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryChemType('concentrate')}
                  className={`p-3.5 rounded-xl border text-left transition ${
                    deliveryChemType === 'concentrate'
                      ? 'bg-amber-500/15 border-amber-400 text-white'
                      : 'bg-[#090d16] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-sm">น้ำยาหัวเชื้อเข้มข้น</div>
                  <div className="text-xs text-amber-400 mt-1">
                    คงเหลือ: {getProductStock(concentrateId)} หน่วย
                  </div>
                </button>
              </div>
            </div>

            {/* 2. ค้นหาและเลือกลูกค้า */}
            <div className="relative">
              <label className="block text-sm font-medium text-cyan-400 mb-2">
                2. ค้นหาลูกค้า (รหัส / ชื่อร้าน / บริษัท / ชื่อผู้ติดต่อ / เบอร์โทร) *
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={customerSearch}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                    if (selectedCustomer) setSelectedCustomer(null);
                  }}
                  placeholder="พิมพ์ชื่อร้าน, บริษัท, เบอร์โทร หรือรหัสลูกค้า..."
                  className="w-full bg-[#090d16] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {selectedCustomer && (
                <div className="mt-2 p-3 bg-cyan-500/10 border border-cyan-500/40 rounded-xl flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-bold text-cyan-300">
                      [{selectedCustomer.customer_id}] {selectedCustomer.shop_name || selectedCustomer.company_name || selectedCustomer.customer_name}
                    </span>
                    <span className="text-xs text-slate-400 block">
                      ผู้ติดต่อ: {selectedCustomer.contact_name || '-'} | โทร: {selectedCustomer.phone || '-'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch('');
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {showCustomerDropdown && !selectedCustomer && (
                <div className="absolute z-20 w-full mt-1 max-h-60 overflow-y-auto bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl divide-y divide-slate-800">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-4 text-sm text-slate-400 text-center">ไม่พบข้อมูลลูกค้า</div>
                  ) : (
                    filteredCustomers.slice(0, 30).map((cust) => (
                      <button
                        key={cust.customer_id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(cust);
                          setCustomerSearch(
                            cust.shop_name || cust.company_name || cust.customer_name || `ลูกค้า #${cust.customer_id}`
                          );
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-800 transition"
                      >
                        <div className="font-semibold text-sm text-white">
                          <span className="text-cyan-400 mr-2">[{cust.customer_id}]</span>
                          {cust.shop_name || cust.company_name || cust.customer_name}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {cust.company_name && cust.shop_name ? `${cust.company_name} • ` : ''}
                          ติดต่อ: {cust.contact_name || '-'} • โทร: {cust.phone || '-'}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 3. จำนวนที่จัดส่ง & พนักงานผู้จัดส่ง */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cyan-400 mb-2">
                  3. จำนวนที่จัดส่ง (หน่วย) *
                </label>
                <input
                  type="number"
                  min={1}
                  step="any"
                  value={deliveryQty}
                  onChange={(e) => setDeliveryQty(Number(e.target.value))}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cyan-400 mb-2">
                  4. พนักงานผู้จัดส่ง *
                </label>
                <select
                  value={deliveryEmployeeId}
                  onChange={(e) => setDeliveryEmployeeId(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
                  required
                >
                  <option value="">-- เลือกพนักงานผู้จัดส่ง --</option>
                  {employees.map((emp) => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      [{emp.employee_id}] {emp.employee_name} ({emp.employee_role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 5. ถ่ายรูป / อัปโหลดหลักฐาน */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                5. ภาพถ่ายหลักฐานการจัดส่ง (ถ้ามี)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
              {!photoPreview ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-cyan-400 transition bg-[#090d16]"
                >
                  <Camera className="w-7 h-7" />
                  <span className="text-sm font-medium">คลิกเพื่อถ่ายรูป หรือเลือกไฟล์รูปภาพ</span>
                </button>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-[#090d16]">
                  <img
                    src={photoPreview}
                    alt="หลักฐานการจัดส่ง"
                    className="max-h-64 w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-2 right-2 p-2 bg-rose-600 text-white rounded-lg shadow-lg hover:bg-rose-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* 6. หมายเหตุ */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                6. หมายเหตุการจัดส่ง
              </label>
              <input
                type="text"
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="เช่น ส่งหน้าสาขา, วางบิลเรียบร้อย..."
                className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-6 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/40 transition flex items-center justify-center gap-2"
            >
              {submitting ? 'กำลังบันทึกการจัดส่ง...' : 'ยืนยันการจัดส่งและตัดสต็อก'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}