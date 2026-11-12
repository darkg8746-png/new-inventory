'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowLeft,
  RefreshCw,
  FlaskConical,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Database,
  Layers,
  History,
  Search,
  Camera,
  Image as ImageIcon,
  X,
  ExternalLink,
  UserCheck,
  ChevronDown,
  Building2,
  User,
  Phone,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://udkicadlthssizksdbaz.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVka2ljYWRsdGhzc2l6a3NkYmF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTI2NzQsImV4cCI6MjA5MTA2ODY3NH0.T0zzi09kqHG9dGKPTtIJUvRmA02GUbu-UBXKuOBPZ4k';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  customer_status?: string | null;
}

interface Employee {
  employeeId: number;
  id?: number;
  firstName?: string;
  lastName?: string;
  name?: string;
}

interface Transaction {
  transactionId: number;
  productId: number;
  transactionType: string;
  quantity: number;
  transactionDate: string;
  referenceNo: string | null;
  remark: string | null;
  product?: Product;
}

export default function ChemicalSystemPage() {
  const [activeTab, setActiveTab] = useState<'mixing' | 'delivery'>('mixing');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State: Sub-tab A (Internal Batching / Mixing)
  const [selectedSourceId, setSelectedSourceId] = useState<number | ''>('');
  const [batchQty, setBatchQty] = useState<number>(1);
  const [isDilutionProcess, setIsDilutionProcess] = useState<boolean>(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | ''>('');
  const [batchRemark, setBatchRemark] = useState<string>('');

  // อัตราส่วนการผสม: 1 ถังหัวเชื้อ = 2 ถังผสม
  const MIXING_RATIO = 2;
  const expectedMixedYield = batchQty > 0 ? batchQty * MIXING_RATIO : 0;

  // Form State: Sub-tab B (Delivery Order)
  const [deliveryType, setDeliveryType] = useState<'MIXED' | 'CONCENTRATE'>('MIXED');
  const [deliveryProductId, setDeliveryProductId] = useState<number | ''>('');
  const [deliveryQty, setDeliveryQty] = useState<number>(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [deliveryRef, setDeliveryRef] = useState<string>('');
  const [deliveryRemark, setDeliveryRemark] = useState<string>('');

  // Searchable Customer Dropdown State (รูปแบบเดียวกับหน้าเครื่องจักร)
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Photo State สำหรับ Sub-tab B
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);

  // Filter State for History
  const [historySearch, setHistorySearch] = useState<string>('');

  // ปิด Dropdown อัตโนมัติเมื่อคลิกพื้นที่ด้านนอก
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isMixedChemical = (p: Product) => {
    const name = (p.productName || '').toLowerCase();
    const model = (p.productModelCode || '').toLowerCase();
    return name.includes('ผสม') || model.includes('(mix)');
  };

  const isAnyChemical = (p: Product) => {
    const name = (p.productName || '').toLowerCase();
    return (
      p.categoryId === 5 ||
      p.categoryId === 107 ||
      name.includes('น้ำยา') ||
      name.includes('หัวเชื้อ') ||
      name.includes('แกลลอน')
    );
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      try {
        const custRes = await fetch('/api/customers', { cache: 'no-store' });
        if (custRes.ok) {
          const custData = await custRes.json();
          const list = Array.isArray(custData)
            ? custData
            : custData.customers || custData.data || [];

          if (list.length > 0) {
            setCustomers(list);
          } else {
            const { data: sbCusts } = await supabase
              .from('customers')
              .select('customer_id, customer_name, customer_taxname, customer_contact_name, customer_number, customer_status')
              .order('customer_id', { ascending: true });
            if (sbCusts) setCustomers(sbCusts);
          }
        } else {
          const { data: sbCusts } = await supabase
            .from('customers')
            .select('customer_id, customer_name, customer_taxname, customer_contact_name, customer_number, customer_status')
            .order('customer_id', { ascending: true });
          if (sbCusts) setCustomers(sbCusts);
        }
      } catch (e) {
        console.error('Customer fetch failed, falling back to Supabase:', e);
        const { data: sbCusts } = await supabase
          .from('customers')
          .select('customer_id, customer_name, customer_taxname, customer_contact_name, customer_number, customer_status')
          .order('customer_id', { ascending: true });
        if (sbCusts) setCustomers(sbCusts);
      }

      const [prodRes, txRes] = await Promise.all([
        fetch('/api/products', { cache: 'no-store' }).catch(() => null),
        fetch('/api/transactions', { cache: 'no-store' }).catch(() => null),
      ]);

      if (prodRes && prodRes.ok) {
        const prodData = await prodRes.json();
        if (prodData.success) {
          const allProds: Product[] = prodData.products || [];
          setProducts(allProds);

          const firstConcentrate = allProds.find((p) => isAnyChemical(p) && !isMixedChemical(p));
          if (firstConcentrate && !selectedSourceId) {
            setSelectedSourceId(firstConcentrate.productId);
          }
        }
      }

      if (txRes && txRes.ok) {
        const txData = await txRes.json();
        if (txData.success) {
          setTransactions(txData.transactions || []);
        }
      }

      const { data: sbEmps } = await supabase.from('employees').select('*');
      if (sbEmps) setEmployees(sbEmps);

    } catch (error) {
      console.error('Error fetching chemical system data:', error);
    }
    setLoading(false);
  };

  // กรองรายชื่อลูกค้าตามคำค้นหา (รหัส, ชื่อร้าน, บริษัท, ผู้ติดต่อ, เบอร์โทร)
  const filteredCustomers = customers.filter((c) => {
    if (!customerSearchTerm.trim()) return true;
    const q = customerSearchTerm.toLowerCase().trim();
    const idStr = String(c.customer_id);
    const name = (c.customer_name || '').toLowerCase();
    const taxname = (c.customer_taxname || '').toLowerCase();
    const contact = (c.customer_contact_name || '').toLowerCase();
    const phone = (c.customer_number || '').toLowerCase();
    return (
      idStr.includes(q) ||
      `#${idStr}`.includes(q) ||
      name.includes(q) ||
      taxname.includes(q) ||
      contact.includes(q) ||
      phone.includes(q)
    );
  });

  const selectedCustomerObj = customers.find((c) => c.customer_id === Number(selectedCustomerId));

  const allChemicals = products.filter(isAnyChemical);
  const concentrateProducts = allChemicals.filter((p) => !isMixedChemical(p));
  const mixedProducts = allChemicals.filter((p) => isMixedChemical(p));
  const currentDeliveryOptions = deliveryType === 'MIXED' ? mixedProducts : concentrateProducts;

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              resolve(blob || file);
            },
            'image/jpeg',
            0.8
          );
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  const handleMixingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSourceId) return alert('กรุณาเลือกหัวเชื้อน้ำยาตั้งต้น');
    if (batchQty <= 0) return alert('กรุณาระบุจำนวนมากกว่า 0');
    if (!selectedEmployeeId) return alert('กรุณาเลือกพนักงานผู้เบิกจากรายการ');

    const selectedEmp = employees.find(
      (emp) => (emp.employeeId ?? emp.id) === Number(selectedEmployeeId)
    );
    const empName = selectedEmp
      ? `${selectedEmp.firstName || emp.name || ''} ${selectedEmp.lastName || ''}`.trim()
      : `ID: ${selectedEmployeeId}`;

    const defaultDesc = isDilutionProcess
      ? `เบิกผสมน้ำยาคลังกลาง (หัวเชื้อ ${batchQty} ถัง ➔ น้ำยาผสม ${expectedMixedYield} ถัง)`
      : 'เบิกน้ำยาสำเร็จรูปโดยไม่ผ่านกระบวนการผสม';
    const combinedRemark = `[ผู้เบิก: ${empName}] ${batchRemark.trim() || defaultDesc}`;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType: isDilutionProcess ? 'MIXING' : 'OUT',
          referenceNo: `BATCH-${Math.floor(100000 + Math.random() * 900000)}`,
          employeeId: Number(selectedEmployeeId),
          remark: combinedRemark,
          mixingRatio: isDilutionProcess ? MIXING_RATIO : 1,
          items: [
            {
              productId: Number(selectedSourceId),
              quantity: Number(batchQty),
              yieldQty: isDilutionProcess ? Number(expectedMixedYield) : 0,
            },
          ],
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(
          isDilutionProcess
            ? `✅ บันทึกสำเร็จ!\n- ตัดสต็อกหัวเชื้อ: ${batchQty} ถัง\n- เพิ่มสต็อกน้ำยาผสม: ${expectedMixedYield} ถัง (สูตร 1:2)`
            : '✅ บันทึกการเบิกหัวเชื้อเรียบร้อยแล้ว'
        );
        setBatchRemark('');
        setBatchQty(1);
        setSelectedEmployeeId('');
        fetchData();
      } else {
        alert(`❌ เกิดข้อผิดพลาด: ${data.error}`);
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
    let uploadedPhotoUrl: string | null = null;

    try {
      if (photoFile) {
        const compressedBlob = await compressImage(photoFile);
        const fileName = `delivery-${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('delivery-photos')
          .upload(fileName, compressedBlob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(
            `อัปโหลดรูปภาพไม่สำเร็จ: ${uploadError.message} (กรุณาเช็กว่าสร้าง Bucket ชื่อ delivery-photos ใน Supabase แล้ว)`
          );
        }

        const { data: publicUrlData } = supabase.storage
          .from('delivery-photos')
          .getPublicUrl(fileName);

        uploadedPhotoUrl = publicUrlData.publicUrl;
      }

      const typePrefix = deliveryType === 'MIXED' ? '[น้ำยาผสมแล้ว]' : '[หัวเชื้อ]';
      const combinedRemark = `${typePrefix} ${deliveryRemark}`.trim();

      const res = await fetch('/api/chemical/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: Number(deliveryProductId),
          quantity: Number(deliveryQty),
          customerId: Number(selectedCustomerId),
          referenceNo: deliveryRef,
          remark: combinedRemark,
          photoUrl: uploadedPhotoUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.message || 'เปิดบิลจัดส่งน้ำยาและตัดสต็อกสำเร็จเรียบร้อยแล้ว'}`);
        setDeliveryRef('');
        setDeliveryRemark('');
        setDeliveryQty(1);
        setSelectedCustomerId('');
        setCustomerSearchTerm('');
        clearPhoto();
        fetchData();
      } else {
        alert(`❌ เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (err: any) {
      alert(`❌ ${err.message || 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'}`);
    }
    setIsSubmitting(false);
  };

  const parseRemarkAndPhoto = (rawRemark: string | null) => {
    if (!rawRemark) return { text: '-', photoUrl: null };
    const parts = rawRemark.split('|PHOTO:');
    return {
      text: parts[0].trim() || '-',
      photoUrl: parts[1] ? parts[1].trim() : null,
    };
  };

  const chemicalHistory = transactions.filter((tx) => {
    const pName = (tx.product?.productName || '').toLowerCase();
    const isChem =
      tx.product?.categoryId === 5 ||
      tx.product?.categoryId === 107 ||
      pName.includes('น้ำยา') ||
      pName.includes('หัวเชื้อ') ||
      pName.includes('แกลลอน') ||
      (tx.referenceNo || '').startsWith('BATCH-') ||
      (tx.referenceNo || '').startsWith('DO-');

    if (!isChem) return false;

    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      return (
        pName.includes(q) ||
        (tx.referenceNo || '').toLowerCase().includes(q) ||
        (tx.remark || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans relative">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition flex items-center gap-1.5 text-sm font-semibold"
            >
              <ArrowLeft size={18} /> กลับหน้าหลัก
            </Link>
            <div className="h-6 w-[1px] bg-slate-800"></div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2">
                <FlaskConical className="text-indigo-400" size={26} /> ระบบจัดการน้ำยาเคมีภัณฑ์ & ผสมสารละลาย
              </h1>
              <p className="text-slate-400 text-xs md:text-sm mt-0.5">
                ควบคุมสต็อกน้ำยา จัดการรอบการผสม (<span className="text-amber-400 font-bold">1 ถังหัวเชื้อ = 2 ถังผสม</span>) และตัดสต็อกตามหน้างานจริง
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-700 shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> รีเฟรชข้อมูล
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
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl shrink-0 mt-0.5">
            <Layers size={18} />
          </div>
          <div>
            <strong className="text-white font-bold block mb-0.5">หลักการทำงานของระบบน้ำยา:</strong>
            {activeTab === 'mixing'
              ? 'เบิกหัวเชื้อน้ำยาออกจากคลังโดย ไม่ต้องระบุชื่อร้านค้าลูกค้า ระบบจะตัดสต็อกหัวเชื้อบริสุทธิ์ (OUT) 1 ส่วน และเพิ่มสต็อกน้ำยาผสมสำเร็จเข้าคลัง (IN) 2 ส่วน (อัตราส่วน 1 ถังหัวเชื้อ = 2 ถังผสม) ให้อัตโนมัติพร้อมคำนวณเฉลี่ยต้นทุนต่อถัง'
              : 'เลือกประเภทน้ำยา (น้ำยาผสมแล้ว หรือ หัวเชื้อ) เลือกรายการ ร้านค้าลูกค้า และสามารถถ่ายรูปหน้างาน/ใบเซ็นรับแนบไปกับบิลได้ทันที'}
          </div>
        </div>

        {/* Form Section */}
        {activeTab === 'mixing' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FlaskConical className="text-indigo-400" size={20} /> ฟอร์มเบิกหัวเชื้อเพื่อผสมน้ำยากลาง
              </h2>
              <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold">
                อัตราส่วนมาตรฐาน: 1 ถังหัวเชื้อ = 2 ถังผสม
              </span>
            </div>

            <form onSubmit={handleMixingSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs md:text-sm text-slate-400 mb-2 font-medium">
                    1. เลือกน้ำยาหัวเชื้อตั้งต้น *
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500 transition cursor-pointer"
                    value={selectedSourceId}
                    onChange={(e) => setSelectedSourceId(Number(e.target.value))}
                  >
                    <option value="" disabled>
                      -- เลือกหัวเชื้อน้ำยา --
                    </option>
                    {concentrateProducts.map((p) => (
                      <option key={p.productId} value={p.productId}>
                        {p.productName} {p.productModelCode ? `(${p.productModelCode})` : ''} — คงเหลือ:{' '}
                        {p.stockQty ?? 0} {p.unitName || 'แกลลอน'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs md:text-sm text-slate-400 mb-2 font-medium">
                    2. จำนวนหัวเชื้อที่เบิก (ถัง / แกลลอน) *
                  </label>
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
                  <span className="text-sm font-bold text-white">
                    ทำการผสมน้ำยา ณ คลังกลาง (Dilution Process — อัตราส่วน 1 : 2)
                  </span>
                </label>

                {isDilutionProcess ? (
                  <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-slate-300">
                      สรุปยอดการแปลงสต็อกอัตโนมัติ (1 ถังหัวเชื้อ ➔ 2 ถังผสม):
                    </div>
                    <div className="flex items-center gap-3 font-mono text-sm">
                      <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg font-bold">
                        ตัดหัวเชื้อ -{batchQty || 0} ถัง
                      </span>
                      <ArrowRight size={16} className="text-slate-400" />
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold">
                        ได้น้ำยาผสม +{expectedMixedYield} ถัง
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300 flex items-center gap-2">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>เบิกน้ำยาออกไปเตรียมไว้โดย ไม่ผ่านกระบวนการผสมน้ำ (ตัดหัวเชื้อออกอย่างเดียว)</span>
                  </div>
                )}
              </div>

              {/* 3. ช่องพนักงานผู้เบิก */}
              <div>
                <label className="block text-xs md:text-sm text-emerald-400 mb-2 font-semibold flex items-center gap-1.5">
                  <UserCheck size={16} /> 3. พนักงานผู้เบิก *
                </label>
                <select
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500 transition cursor-pointer"
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value ? Number(e.target.value) : '')}
                  required
                >
                  <option value="" disabled>
                    -- กรุณาเลือกพนักงานผู้เบิกจากรายชื่อ --
                  </option>
                  {employees.map((emp, idx) => {
                    const empId = emp.employeeId ?? emp.id ?? idx + 1;
                    const empName = `${emp.firstName || emp.name || ''} ${emp.lastName || ''}`.trim() || `พนักงาน #${empId}`;
                    return (
                      <option key={empId} value={empId}>
                        #{empId} {empName}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 4. หมายเหตุบันทึกคลัง */}
              <div>
                <label className="block text-xs md:text-sm text-slate-400 mb-2 font-medium">
                  4. หมายเหตุบันทึกคลัง
                </label>
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
                {isSubmitting ? (
                  'กำลังบันทึก...'
                ) : isDilutionProcess ? (
                  <>
                    <CheckCircle2 size={18} /> ยืนยันผสมน้ำยา (ตัดหัวเชื้อ {batchQty || 0} ถัง ➔ เพิ่มน้ำยาผสม {expectedMixedYield} ถัง)
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} /> บันทึกตัดสต็อกหัวเชื้อ ({batchQty || 0} ถัง)
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
              <Truck className="text-emerald-400" size={20} /> ฟอร์มเปิดบิลจัดส่งน้ำยาให้ลูกค้า (Delivery Order)
            </h2>

            <form onSubmit={handleDeliverySubmit} className="space-y-5">
              {/* 1. ติ๊กเลือกประเภทน้ำยาก่อนจัดส่ง */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                <label className="block text-xs md:text-sm text-slate-400 font-medium">
                  1. เลือกประเภทน้ำยาที่ต้องการจัดส่ง *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    onClick={() => {
                      setDeliveryType('MIXED');
                      setDeliveryProductId('');
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                      deliveryType === 'MIXED'
                        ? 'bg-emerald-600/20 border-emerald-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryType"
                      checked={deliveryType === 'MIXED'}
                      onChange={() => {}}
                      className="w-4 h-4 accent-emerald-500"
                    />
                    <div>
                      <div className="text-sm">🧪 น้ำยาผสมแล้ว (Mix)</div>
                      <div className="text-[11px] font-normal text-slate-400">
                        ตัดสต็อกรายการน้ำยาที่ผสมพร้อมใช้งาน ({mixedProducts.length} รายการ)
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => {
                      setDeliveryType('CONCENTRATE');
                      setDeliveryProductId('');
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                      deliveryType === 'CONCENTRATE'
                        ? 'bg-amber-600/20 border-amber-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryType"
                      checked={deliveryType === 'CONCENTRATE'}
                      onChange={() => {}}
                      className="w-4 h-4 accent-amber-500"
                    />
                    <div>
                      <div className="text-sm">💧 หัวเชื้อน้ำยา (Pure)</div>
                      <div className="text-[11px] font-normal text-slate-400">
                        ตัดสต็อกแกลลอนหัวเชื้อโดยตรง ({concentrateProducts.length} รายการ)
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2. เลือกรายการน้ำยา & จำนวน */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs md:text-sm text-slate-400 mb-2 font-medium">
                    2. เลือก{deliveryType === 'MIXED' ? 'น้ำยาผสมแล้ว' : 'หัวเชื้อน้ำยา'} *
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500 transition cursor-pointer"
                    value={deliveryProductId}
                    onChange={(e) => setDeliveryProductId(Number(e.target.value))}
                  >
                    <option value="" disabled>
                      -- เลือก{deliveryType === 'MIXED' ? 'น้ำยาผสมแล้ว' : 'หัวเชื้อ'}สำหรับจัดส่ง --
                    </option>
                    {currentDeliveryOptions.map((p) => (
                      <option key={p.productId} value={p.productId}>
                        #{p.productId} {p.productName}{' '}
                        {p.productModelCode ? `[${p.productModelCode}]` : ''} — คงเหลือ:{' '}
                        {p.stockQty ?? 0} {p.unitName || 'ถัง'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs md:text-sm text-slate-400 mb-2 font-medium">
                    3. จำนวนที่จัดส่ง *
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500 font-bold"
                    value={deliveryQty}
                    onChange={(e) => setDeliveryQty(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* 3. เลือกร้านค้าลูกค้า (แบบค้นหาได้เหมือนหน้าเครื่องจักร) & เลขที่ใบส่งของ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                <div ref={customerDropdownRef} className="relative">
                  <label className="block text-xs md:text-sm text-blue-400 mb-2 font-semibold flex items-center gap-1.5">
                    <UserCheck size={16} /> 4. เลือกร้านค้า / ลูกค้าผู้รับน้ำยา (เรียงตามรหัสลูกค้า) * ({customers.length} รายการ)
                  </label>

                  {/* ปุ่มหลักสำหรับกดเปิด/ปิด Dropdown */}
                  <button
                    type="button"
                    onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
                    className={`w-full bg-slate-950 border rounded-xl p-3 text-left text-sm flex items-center justify-between transition ${
                      isCustomerDropdownOpen
                        ? 'border-blue-500 ring-1 ring-blue-500/40'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {selectedCustomerObj ? (
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="px-2 py-0.5 bg-blue-950 text-blue-400 border border-blue-800/60 rounded text-xs font-bold font-mono shrink-0">
                          #{selectedCustomerObj.customer_id}
                        </span>
                        <span className="text-white font-semibold truncate">
                          {selectedCustomerObj.customer_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-300">-- ค้นหาและเลือกลูกค้า --</span>
                    )}
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 shrink-0 transition-transform ${
                        isCustomerDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* กล่องค้นหาและรายการลูกค้าแบบการ์ด */}
                  {isCustomerDropdownOpen && (
                    <div className="mt-2 bg-slate-950 border border-slate-700 rounded-xl p-3 shadow-2xl space-y-2.5 z-30">
                      {/* ช่องพิมพ์ค้นหา */}
                      <div className="relative">
                        <Search
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          size={15}
                        />
                        <input
                          type="text"
                          autoFocus
                          placeholder="ค้นหารหัส, ชื่อร้าน, บริษัท, ชื่อผู้ติดต่อ, เบอร์โทร..."
                          className="w-full bg-slate-900 border border-blue-500/70 rounded-lg pl-9 pr-8 py-2.5 text-xs md:text-sm text-white placeholder-slate-400 outline-none focus:border-blue-400"
                          value={customerSearchTerm}
                          onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        />
                        {customerSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setCustomerSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* รายการลูกค้าแบบ Scrollable */}
                      <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                        {filteredCustomers.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400">
                            {loading ? 'กำลังโหลดรายชื่อลูกค้า...' : 'ไม่พบข้อมูลลูกค้าที่ค้นหา'}
                          </div>
                        ) : (
                          filteredCustomers.map((c) => {
                            const isSelected = c.customer_id === Number(selectedCustomerId);
                            return (
                              <div
                                key={c.customer_id}
                                onClick={() => {
                                  setSelectedCustomerId(c.customer_id);
                                  setIsCustomerDropdownOpen(false);
                                }}
                                className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                                  isSelected
                                    ? 'bg-blue-950/50 border-blue-500/70'
                                    : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700'
                                }`}
                              >
                                {/* ป้ายรหัสลูกค้า #ID */}
                                <span className="px-2 py-0.5 bg-blue-950 text-blue-400 border border-blue-800/60 rounded text-xs font-bold font-mono shrink-0 mt-0.5">
                                  #{c.customer_id}
                                </span>

                                <div className="min-w-0 flex-1 space-y-1">
                                  {/* ชื่อร้าน */}
                                  <div className="text-sm font-bold text-white truncate">
                                    {c.customer_name}
                                  </div>

                                  {/* รายละเอียด บจก/บริษัท, คอนแท็ก, เบอร์โทร */}
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                                    {c.customer_taxname && (
                                      <span className="text-amber-400 flex items-center gap-1 truncate max-w-full">
                                        <Building2 size={12} className="shrink-0" />
                                        บจก/บริษัท: {c.customer_taxname}
                                      </span>
                                    )}
                                    {c.customer_contact_name && (
                                      <span className="text-indigo-300 flex items-center gap-1">
                                        <User size={12} className="shrink-0" />
                                        คอนแท็ก: {c.customer_contact_name}
                                      </span>
                                    )}
                                    {c.customer_number && (
                                      <span className="text-emerald-400 flex items-center gap-1 font-mono">
                                        <Phone size={12} className="shrink-0" />
                                        {c.customer_number}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs md:text-sm text-slate-400 mb-2 font-medium">
                    5. เลขที่ใบส่งของ (Delivery No.)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น DO-2026-001 (ปล่อยว่างเพื่อสร้างอัตโนมัติ)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500 font-mono"
                    value={deliveryRef}
                    onChange={(e) => setDeliveryRef(e.target.value)}
                  />
                </div>
              </div>

              {/* 4. หมายเหตุการจัดส่ง */}
              <div>
                <label className="block text-xs md:text-sm text-slate-400 mb-2 font-medium">
                  6. หมายเหตุการจัดส่ง
                </label>
                <input
                  type="text"
                  placeholder="เช่น จัดส่งรอบประจำสัปดาห์..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500"
                  value={deliveryRemark}
                  onChange={(e) => setDeliveryRemark(e.target.value)}
                />
              </div>

              {/* 5. ถ่ายรูป / แนบหลักฐานการจัดส่ง */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <label className="block text-xs md:text-sm text-slate-300 font-bold flex items-center gap-2">
                  <Camera className="text-emerald-400" size={18} /> 7. ถ่ายรูปหลักฐานการจัดส่ง (ไม่บังคับ)
                </label>

                {!photoPreview ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl cursor-pointer transition text-sm font-bold">
                      <Camera size={18} /> ถ่ายรูปทันที (เปิดกล้อง)
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handlePhotoChange}
                      />
                    </label>

                    <label className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl cursor-pointer transition text-sm font-medium">
                      <ImageIcon size={18} /> เลือกรูปจากเครื่อง
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoChange}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="relative inline-block">
                    <img
                      src={photoPreview}
                      alt="ตัวอย่างรูปหลักฐานจัดส่ง"
                      className="max-h-56 rounded-xl border border-emerald-500/40 object-cover shadow-lg"
                    />
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="absolute -top-2.5 -right-2.5 p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-md transition"
                      title="ลบรูปภาพ"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  'กำลังอัปโหลดและบันทึกข้อมูล...'
                ) : (
                  <>
                    <CheckCircle2 size={18} /> ยืนยันเปิดบิลจัดส่ง & ตัดสต็อก FIFO
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Live Stock Monitor Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Database className="text-indigo-400" size={18} /> สต็อกคลังสินค้าล่าสุด (Live Stock Monitor)
            </h3>
            <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-bold">
              Realtime
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-500 text-sm">กำลังโหลดข้อมูลสต็อก...</div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="text-xs font-bold text-emerald-400 mb-2.5 flex items-center gap-1.5">
                  🧪 สต็อกน้ำยาผสมแล้ว (พร้อมจัดส่งลูกค้า)
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {mixedProducts.map((p) => (
                    <div
                      key={p.productId}
                      className="bg-slate-950 border border-emerald-500/20 rounded-xl p-4 space-y-1"
                    >
                      <div className="text-slate-300 text-xs font-medium truncate" title={p.productName}>
                        {p.productName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">
                        {p.productModelCode || '-'}
                      </div>
                      <div
                        className={`text-xl font-extrabold font-mono pt-1 ${
                          (p.stockQty ?? 0) > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {p.stockQty ?? 0}{' '}
                        <span className="text-xs font-normal text-slate-400">{p.unitName || 'ถัง'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-amber-400 mb-2.5 flex items-center gap-1.5">
                  💧 สต็อกหัวเชื้อตั้งต้น (Pure)
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {concentrateProducts.map((p) => (
                    <div
                      key={p.productId}
                      className="bg-slate-950 border border-amber-500/20 rounded-xl p-4 space-y-1"
                    >
                      <div className="text-slate-300 text-xs font-medium truncate" title={p.productName}>
                        {p.productName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">
                        {p.productModelCode || '-'}
                      </div>
                      <div
                        className={`text-xl font-extrabold font-mono pt-1 ${
                          (p.stockQty ?? 0) > 0 ? 'text-amber-400' : 'text-rose-400'
                        }`}
                      >
                        {p.stockQty ?? 0}{' '}
                        <span className="text-xs font-normal text-slate-400">
                          {p.unitName || 'แกลลอน'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chemical Transaction History Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <History className="text-amber-400" size={18} /> ประวัติการผสมน้ำยาและการจัดส่งล่าสุด
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                placeholder="ค้นหาเลขบิล, ชื่อน้ำยา, ลูกค้า, ผู้เบิก..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase">
                  <th className="p-3.5">วันเวลา</th>
                  <th className="p-3.5">เลขที่อ้างอิง</th>
                  <th className="p-3.5">ประเภท / รายการน้ำยา</th>
                  <th className="p-3.5 text-center">จำนวน</th>
                  <th className="p-3.5">รายละเอียด / ผู้เบิก / ลูกค้า</th>
                  <th className="p-3.5 text-center">หลักฐานรูป</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      กำลังโหลดประวัติ...
                    </td>
                  </tr>
                ) : chemicalHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      ยังไม่มีประวัติการทำรายการน้ำยา
                    </td>
                  </tr>
                ) : (
                  chemicalHistory.slice(0, 15).map((tx) => {
                    const isMixed = tx.product ? isMixedChemical(tx.product) : false;
                    const { text: cleanRemark, photoUrl } = parseRemarkAndPhoto(tx.remark);

                    return (
                      <tr key={tx.transactionId} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-mono text-slate-400 whitespace-nowrap">
                          {new Date(tx.transactionDate).toLocaleString('th-TH')}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-indigo-400 whitespace-nowrap">
                          {tx.referenceNo || '-'}
                        </td>
                        <td className="p-3.5 font-medium text-white">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                isMixed
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}
                            >
                              {isMixed ? 'น้ำยาผสม' : 'หัวเชื้อ'}
                            </span>
                            <span>{tx.product?.productName || '-'}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-center font-bold">
                          <span
                            className={`px-2 py-0.5 rounded ${
                              tx.transactionType === 'IN'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {tx.transactionType === 'IN' ? '+' : '-'}
                            {tx.quantity}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400">{cleanRemark}</td>
                        <td className="p-3.5 text-center">
                          {photoUrl ? (
                            <button
                              type="button"
                              onClick={() => setViewingPhotoUrl(photoUrl)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-bold transition"
                            >
                              <Camera size={13} /> ดูรูป
                            </button>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal แสดงรูปภาพหลักฐานการจัดส่ง */}
      {viewingPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setViewingPhotoUrl(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-4 max-w-2xl w-full space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Camera className="text-emerald-400" size={16} /> รูปภาพหลักฐานการจัดส่ง
              </h4>
              <div className="flex items-center gap-2">
                <a
                  href={viewingPhotoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                >
                  เปิดแท็บใหม่ <ExternalLink size={12} />
                </a>
                <button
                  onClick={() => setViewingPhotoUrl(null)}
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex justify-center bg-slate-950 rounded-xl p-2">
              <img
                src={viewingPhotoUrl}
                alt="หลักฐานการจัดส่ง"
                className="max-h-[70vh] rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}