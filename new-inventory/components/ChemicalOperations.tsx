'use client';

import { useState } from 'react';
import { 
  FlaskConical, 
  Truck, 
  Info, 
  Calculator, 
  Save, 
  Database,
  Monitor,
  Smartphone
} from 'lucide-react';

// --- Mock Data สำหรับทดสอบ ---
const pureChemicals = [
  { id: 1, name: 'หัวเชื้อน้ำยาล้างจาน Pure 100%', cost: 450, stock: 15, ratio: 2, resultName: 'น้ำยาล้างจานผสมเสร็จ' },
  { id: 2, name: 'หัวเชื้อน้ำยาล้างแก้ว Pure 100%', cost: 500, stock: 10, ratio: 2, resultName: 'น้ำยาล้างแก้วผสมเสร็จ' },
];

const liveStock = [
  { name: 'หัวเชื้อน้ำยาล้างจาน', qty: 15, unit: 'ถัง', type: 'pure' },
  { name: 'น้ำยาล้างจานผสมเสร็จ', qty: 28, unit: 'ถัง', type: 'ready' },
  { name: 'หัวเชื้อน้ำยาล้างแก้ว', qty: 10, unit: 'ถัง', type: 'pure' },
  { name: 'น้ำยาล้างแก้วผสมเสร็จ', qty: 20, unit: 'ถัง', type: 'ready' },
];

export default function ChemicalOperations() {
  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A');
  
  // State สำหรับ Sub-tab A
  const [selectedChemId, setSelectedChemId] = useState<number | ''>('');
  const [pureQty, setPureQty] = useState<number>(1);
  const [isDiluting, setIsDiluting] = useState(true);
  const [remark, setRemark] = useState('');

  // หาข้อมูลหัวเชื้อที่เลือก
  const selectedChem = pureChemicals.find(c => c.id === selectedChemId);
  const resultQty = selectedChem && isDiluting ? pureQty * selectedChem.ratio : pureQty;

  const handleBatchingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChemId) return alert('กรุณาเลือกหัวเชื้อตั้งต้น');
    
    // หากำหนด ID ของตัวผสมเสร็จ (ในระบบจริง คุณอาจจะต้องสร้างฟิลด์ mappedReadyProductId ไว้ใน DB)
    // สมมติว่าใน Mock ของเรา: หัวเชื้อ 1 คู่กับ ผสมเสร็จ 3, หัวเชื้อ 2 คู่กับ ผสมเสร็จ 4
    const readyChemIdMap: Record<number, number> = { 1: 3, 2: 4 }; 
    const mappedReadyId = readyChemIdMap[selectedChemId];

    if (!mappedReadyId) return alert('ไม่พบข้อมูลสินค้าน้ำยาผสมเสร็จที่จับคู่กันไว้');

    try {
      // เรียกใช้ API ที่เราเพิ่งสร้าง
      const res = await fetch('/api/chemical-batching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pureChemicalId: selectedChemId,
          pureQty: pureQty,
          readyChemicalId: mappedReadyId,
          readyQty: resultQty,
          remark: remark
        })
      });

      const data = await res.json();

      if (data.success) {
        alert(`ผสมน้ำยาสำเร็จ!\n- ตัดหัวเชื้อ: ${pureQty} ถัง\n- ได้น้ำยาพร้อมใช้: ${resultQty} ถัง\nต้นทุนเฉลี่ยต่อถัง: ${data.data.newReadyUnitCost.toFixed(2)} บาท`);
        
        // เคลียร์ฟอร์ม
        setSelectedChemId('');
        setPureQty(1);
        setRemark('');
        
        // TODO: เรียกฟังก์ชัน fetch สต็อกล่าสุด (liveStock) ใหม่เพื่ออัปเดตหน้าจอ
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (error) {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1329] p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/20">
              <FlaskConical size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Chemical Operations Engine 
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded-full border border-indigo-500/30">
                  v2.4 Interactive
                </span>
              </h1>
              <p className="text-slate-400 text-xs md:text-sm mt-0.5">
                ระบบคลังผสมน้ำยา บริหารจัดส่ง 3 ช่องทาง และวิเคราะห์ต้นทุนรั่วไหล
              </p>
            </div>
          </div>

          <div className="flex bg-[#151f38] p-1 rounded-xl border border-slate-700/50">
            <button className="px-4 py-2 rounded-lg font-bold text-xs md:text-sm transition flex items-center gap-2 bg-indigo-600 text-white shadow-md">
              <Monitor size={16} /> Admin Desktop View
            </button>
            <button className="px-4 py-2 rounded-lg font-medium text-xs md:text-sm transition flex items-center gap-2 text-slate-400 hover:text-white">
              <Smartphone size={16} /> Technician Mobile View
            </button>
          </div>
        </div>

        {/* Main Card (White Box) */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button 
              onClick={() => setActiveTab('A')}
              className={`flex-1 py-4 px-6 font-bold text-sm flex justify-center items-center gap-2 transition-colors ${
                activeTab === 'A' 
                  ? 'bg-white text-indigo-600 border-t-4 border-indigo-600' 
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-t-4 border-transparent'
              }`}
            >
              <FlaskConical size={18} /> Sub-tab A: เบิกคลังกลางเพื่อผสมน้ำยา (Internal Batching)
            </button>
            <button 
              onClick={() => setActiveTab('B')}
              className={`flex-1 py-4 px-6 font-bold text-sm flex justify-center items-center gap-2 transition-colors ${
                activeTab === 'B' 
                  ? 'bg-white text-blue-600 border-t-4 border-blue-600' 
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-t-4 border-transparent'
              }`}
            >
              <Truck size={18} /> Sub-tab B: เปิดบิลจัดส่งน้ำยาให้ลูกค้า (Delivery Order)
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 md:p-8">
            {activeTab === 'A' && (
              <div className="space-y-6 max-w-4xl mx-auto">
                
                {/* Info Alert */}
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex gap-3 text-indigo-800">
                  <Info className="shrink-0 mt-0.5 text-indigo-600" size={20} />
                  <p className="text-sm font-medium leading-relaxed">
                    <strong>หลักการผสมน้ำยาคลังกลาง:</strong> เบิกหัวเชื้อน้ำยาออกจากคลังโดย <span className="underline decoration-indigo-300 underline-offset-2">ไม่ต้องระบุชื่อร้านค้าลูกค้า</span> ระบบจะตัดสต็อกหัวเชื้อบริสุทธิ์ (OUT) และคำนวณอัตราส่วนเพื่อเพิ่มสต็อกน้ำยาผสมสำเร็จเข้าคลัง (IN) ให้อัตโนมัติพร้อมคำนวณเฉลี่ยต้นทุนต่อถัง
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleBatchingSubmit} className="border border-slate-200 rounded-2xl p-6 space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-700">1. เลือกน้ำยาหัวเชื้อตั้งต้น</label>
                      <select 
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition text-sm"
                        value={selectedChemId}
                        onChange={(e) => setSelectedChemId(Number(e.target.value))}
                        required
                      >
                        <option value="">-- กรุณาเลือกหัวเชื้อ --</option>
                        {pureChemicals.map(c => (
                          <option key={c.id} value={c.id}>
                            💧 {c.name} (ทุน {c.cost}฿/ถัง)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-700">2. จำนวนหัวเชื้อที่เบิก (ถัง)</label>
                      <input 
                        type="number" 
                        min="1"
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition text-sm font-bold"
                        value={pureQty}
                        onChange={(e) => setPureQty(Number(e.target.value))}
                        required
                      />
                    </div>
                  </div>

                  {/* Dilution Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                        checked={isDiluting}
                        onChange={(e) => setIsDiluting(e.target.checked)}
                      />
                      <span className="font-bold text-slate-800">ทำการผสมน้ำยา ณ คลังกลาง (Dilution Process)</span>
                    </label>

                    {isDiluting && selectedChem && (
                      <div className="pl-8 space-y-3">
                        <div className="flex justify-between items-center text-xs md:text-sm bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                          <span className="flex items-center gap-2 text-indigo-700 font-semibold"><Calculator size={16}/> คำนวณผลลัพธ์การผสม:</span>
                          <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 font-bold rounded-md">อัตราส่วน 1 : {selectedChem.ratio}</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                          <span className="text-slate-600 text-sm">ปริมาณน้ำยาผสมพร้อมใช้ที่ได้ (Ready-to-Use):</span>
                          <span className="text-2xl font-black text-indigo-600">{resultQty} <span className="text-sm font-bold text-indigo-500">ถัง</span></span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          * ระบบจะตัดสต็อกหัวเชื้อออก {pureQty} ถัง และเพิ่มสต็อกน้ำยาผสมพร้อมใช้เข้าคลัง {resultQty} ถัง ({selectedChem.resultName})
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">3. หมายเหตุบันทึกคลัง</label>
                    <input 
                      type="text" 
                      placeholder="เช่น เบิกผสมน้ำยาถังใหญ่ประจำสัปดาห์"
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition text-sm placeholder:text-slate-400"
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-indigo-600/20 flex justify-center items-center gap-2"
                  >
                    <Save size={20} /> บันทึกตัดสต็อกหัวเชื้อ & เพิ่มสต็อกน้ำยาผสม
                  </button>
                </form>

                {/* Live Stock Monitor */}
                <div className="bg-[#151f38] border border-slate-700 rounded-2xl p-5 md:p-6 mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <Database className="text-indigo-400" size={18} /> สต็อกคลังสินค้าล่าสุด (Live Stock Monitor)
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                      Realtime
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {liveStock.map((stock, idx) => (
                      <div key={idx} className="bg-[#1e2947] border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between">
                        <span className="text-slate-400 text-xs font-medium mb-2 leading-tight h-8">{stock.name}</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-2xl font-black ${stock.type === 'pure' ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {stock.qty}
                          </span>
                          <span className="text-slate-300 text-sm font-bold">{stock.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'B' && (
              <div className="flex justify-center items-center py-20 flex-col gap-4 text-slate-400">
                <Truck size={48} className="text-slate-300 opacity-50" />
                <p>หน้าเปิดบิลจัดส่งน้ำยา (Delivery Order) กำลังอยู่ระหว่างการพัฒนา...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}