'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, CheckSquare, Square, Search, Filter, ChevronDown } from 'lucide-react';

interface Category {
  id: number;
  categoryName: string;
}

interface Product {
  productId: number;
  productName: string;
  productModelCode: string | null;
  unitName: string | null;
  categoryId: number;
  category?: Category;
}

interface PrintQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories?: Category[]; // รับหมวดหมู่เข้ามาด้วย (ถ้ามี)
}

export default function PrintQrModal({ isOpen, onClose, products, categories = [] }: PrintQrModalProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com';

  if (!isOpen) return null;

  // กรองสินค้าตามคำค้นหา (ชื่อ หรือ รุ่น) และ หมวดหมู่
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      (p.productName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.productModelCode || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategoryId === 'all' || p.categoryId === selectedCategoryId;

    return matchesSearch && matchesCategory;
  });

  // เลือกทั้งหมดเฉพาะรายการที่ถูกกรองขึ้นมาแสดง
  const handleToggleSelectAllFiltered = () => {
    const filteredIds = filteredProducts.map(p => p.productId);
    const allFilteredAreSelected = filteredIds.every(id => selectedIds.includes(id));

    if (allFilteredAreSelected) {
      // เอาเฉพาะตัวที่ไม่ได้อยู่ในกลุ่มนี้ออก
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // เติมตัวที่ยังไม่ได้เลือกเข้าไป
      const newSelected = Array.from(new Set([...selectedIds, ...filteredIds]));
      setSelectedIds(newSelected);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const productsToPrint = products.filter(p => selectedIds.includes(p.productId));

  const handlePrintWindow = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('กรุณาอนุญาต Pop-up บนเบราว์เซอร์เพื่อพิมพ์เอกสาร');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>พิมพ์ป้าย QR Code ชั้นวาง</title>
          <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
          <style>
            @media print {
              body { background: white; color: black; -webkit-print-color-adjust: exact; }
              .page-break { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body class="bg-white p-8">
          <div class="grid grid-cols-3 gap-6">
            ${productsToPrint.map(p => {
              const targetUrl = `${baseUrl}/?action=withdraw&productId=${p.productId}`;
              const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(targetUrl)}`;
              return `
                <div class="page-break border-2 border-dashed border-gray-400 p-4 rounded-xl flex flex-col items-center justify-center text-center bg-white">
                  <div class="font-bold text-xs text-gray-600 mb-1">สแกนเพื่อเบิกอะไหล่</div>
                  <div class="p-2 bg-white border border-gray-200 rounded-lg">
                    <img src="${qrApiUrl}" alt="QR Code" width="110" height="110" />
                  </div>
                  <div class="mt-2 font-black text-sm text-gray-900">${p.productName}</div>
                  <div class="text-xs font-mono font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-700 mt-1">
                    รุ่น: ${p.productModelCode || 'N/A'}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.includes(p.productId));

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/40">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Printer className="text-emerald-400" size={20} /> เลือกสินค้าเพื่อพิมพ์ป้าย QR Code ติดชั้นวาง
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-5 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row gap-3">
          {/* ช่องค้นหาชื่อ/โมเดล */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="🔍 ค้นหาชื่อสินค้า หรือรุ่นโมเดล..." 
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X size={16} />
              </button>
            )}
          </div>

          {/* ฟิลเตอร์ประเภท/หมวดหมู่ */}
          <div className="w-full sm:w-64">
            <select 
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition cursor-pointer"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">📂 ทุกหมวดหมู่ทั้งหมด</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.categoryName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Control Bar: สรุปจำนวน & ปุ่มเลือกทั้งหมด */}
        <div className="px-6 py-3 bg-slate-900/90 border-b border-slate-800 flex justify-between items-center text-sm">
          <span className="text-slate-300">
            เลือกแล้ว: <strong className="text-emerald-400">{selectedIds.length}</strong> จากทั้งหมด {products.length} รายการ 
            {filteredProducts.length !== products.length && <span className="text-xs text-amber-400 ml-2">(พบในผลค้นหา {filteredProducts.length} รายการ)</span>}
          </span>
          <button 
            onClick={handleToggleSelectAllFiltered}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold transition flex items-center gap-2"
          >
            {allFilteredSelected ? <CheckSquare size={15} /> : <Square size={15} />}
            {allFilteredSelected ? 'ยกเลิกเลือกกลุ่มนี้' : 'เลือกทั้งหมดที่แสดง'}
          </button>
        </div>

        {/* Body รายการเลือกสินค้า (Grid) */}
        <div className="p-6 overflow-y-auto flex-1">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-slate-500">ไม่พบสินค้าที่ตรงกับการค้นหาหรือหมวดหมู่ที่เลือก</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredProducts.map(p => {
                const isChecked = selectedIds.includes(p.productId);
                return (
                  <div 
                    key={p.productId}
                    onClick={() => handleToggleSelect(p.productId)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center gap-3 ${
                      isChecked ? 'bg-emerald-950/30 border-emerald-500/50 text-white shadow-sm' : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={() => {}} 
                      className="accent-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="truncate">
                      <div className="font-bold text-sm text-slate-200 truncate">{p.productName}</div>
                      <div className="text-xs font-mono text-amber-400">{p.productModelCode || 'ไม่มีรุ่น'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer ปุ่มสั่งพิมพ์ */}
        <div className="p-5 border-t border-slate-800 flex justify-between items-center bg-slate-950/60">
          <span className="text-xs text-slate-500">
            * ระบบจะเปิดหน้าต่างพิมพ์แยกสำหรับตัดแปะป้าย QR Code ทันที
          </span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-slate-300 hover:bg-slate-800 rounded-xl text-sm">
              ปิด
            </button>
            <button 
              onClick={handlePrintWindow}
              disabled={selectedIds.length === 0}
              className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition ${
                selectedIds.length > 0 ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Printer size={18} /> ปริ้นท์ป้ายที่เลือก ({selectedIds.length})
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}