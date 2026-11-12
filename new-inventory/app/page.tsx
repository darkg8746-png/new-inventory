'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, Database, FolderPlus, Clock, TrendingUp, AlertTriangle, CheckCircle2, X, ChevronDown, Trash2, Edit3, ArrowRightLeft, ClipboardList, Server, Search, PenTool, AlertOctagon, DollarSign, Filter, BarChart3, UserCheck, PieChart as PieChartIcon, TrendingDown, Zap, Wrench, History, Printer, Coins, Layers, FlaskConical } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import PrintQrModal from '@/components/PrintQrModal';
import Link from 'next/link';

interface Category { 
  id: number; 
  categoryName: string; 
  requiresSerialNumber?: boolean; 
}
interface Product {
  productId: number; productName: string; productModelCode: string | null;
  unitCost: number | null; salePrice: number | null; rentPrice: number | null;
  stockQty: number | null; isPreorder: boolean; categoryId: number; unitName: string | null;
  category?: Category;
}
interface Transaction {
  transactionId: number; productId: number; transactionType: string;
  quantity: number; transactionDate: string; referenceNo: string | null; remark: string | null;
  employeeId: number | null; supplierId: number | null; lotDetails?: any[];
  product: Product;
}
interface Customer {
  customer_id: number;
  customer_name: string;
  customer_taxname: string | null;
  customer_contact_name: string | null;
  customer_number: string | null;
  customer_status: string | null;
}
interface Machine {
  assetId: number; productId: number; assetSerialNumber: string; assetQrCode: string | null;
  assetStatus: string; assetInstallDate: string | null; assetPurchaseCost: number | null;
  assetPurchaseDate: string | null; assetWarrantyExpireDate: string | null; isInternalSn: boolean;
  supplierId: number | null; customerId: number | null; product?: Product; customer?: Customer;
}

interface BulkTxItem {
  productId: number | '';
  quantity: number;
  unitCost: number | '';
  expireDate: string;
}

export default function MainInventorySystem() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'machines' | 'analytics' | 'quick_check'>('quick_check');
  const [inventorySubTab, setInventorySubTab] = useState<'consumables' | 'machines_catalog'>('consumables');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [quickSearch, setQuickSearch] = useState('');
  const [quickResults, setQuickResults] = useState<any[]>([]);
  const [loadingQuick, setLoadingQuick] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [inventorySearch, setInventorySearch] = useState('');

  const [alerts, setAlerts] = useState<any>({ expiring: [] });
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [lowStockModalType, setLowStockModalType] = useState<'LOW' | 'OUT'>('LOW');
  const [isExpiringModalOpen, setIsExpiringModalOpen] = useState(false);

  const [selectedFilterCategories, setSelectedFilterCategories] = useState<number[]>([]);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterCategorySearch, setFilterCategorySearch] = useState(''); 

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({ productName: '', productModelCode: '', categoryId: 1, unitCost: 0, salePrice: 0, rentPrice: 0, stockQty: 0, isPreorder: false, unitName: '' });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Product | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryRequiresSn, setNewCategoryRequiresSn] = useState(true);
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  const getTodayString = () => new Date().toISOString().split('T')[0];
  const [isBulkTxModalOpen, setIsBulkTxModalOpen] = useState(false);
  const [bulkTxType, setBulkTxType] = useState('IN');
  const [bulkTxRef, setBulkTxRef] = useState('');
  const [bulkTxRemark, setBulkTxRemark] = useState('');
  const [bulkTxEmployee, setBulkTxEmployee] = useState(''); 
  const [bulkTxSupplier, setBulkTxSupplier] = useState('');
  const [bulkTxDate, setBulkTxDate] = useState('');
  
  useEffect(() => {
    setBulkTxDate(getTodayString());
  }, []);
  
  const [bulkTxItems, setBulkTxItems] = useState<BulkTxItem[]>([
    { productId: '', quantity: 1, unitCost: '', expireDate: '' }
  ]);
  
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const [openTxDropdownIndex, setOpenTxDropdownIndex] = useState<number | null>(null);
  const [txProductSearch, setTxProductSearch] = useState('');

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [transactionsHistory, setTransactionsHistory] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historySortDirection, setHistorySortDirection] = useState<'desc' | 'asc'>('desc');
  
  const [historyFilterMode, setHistoryFilterMode] = useState<'ALL' | 'DAY' | 'MONTH' | 'YEAR' | 'CUSTOM'>('ALL');
  const [historySelectedDate, setHistorySelectedDate] = useState('');
  const [historySelectedMonth, setHistorySelectedMonth] = useState('');
  const [historySelectedYear, setHistorySelectedYear] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  useEffect(() => {
    const today = getTodayString();
    setHistorySelectedDate(today);
    setHistorySelectedMonth(String(new Date().getMonth() + 1));
    setHistorySelectedYear(String(new Date().getFullYear()));
    setHistoryStartDate(today);
    setHistoryEndDate(today);
  }, []);

  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineSearch, setMachineSearch] = useState('');
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [isEditingMachine, setIsEditingMachine] = useState(false);
  const [machineFormData, setMachineFormData] = useState<Partial<Machine>>({
    productId: 0, assetSerialNumber: '', assetQrCode: '', assetStatus: 'In_Stock', 
    assetPurchaseCost: 0, assetPurchaseDate: '', assetWarrantyExpireDate: '', 
    assetInstallDate: '', isInternalSn: false, supplierId: null, customerId: null
  });

  const [isMachineLogModalOpen, setIsMachineLogModalOpen] = useState(false);
  const [selectedMachineForLog, setSelectedMachineForLog] = useState<Machine | null>(null);

  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  const [valuationData, setValuationData] = useState<any>(null);
  const [loadingValuation, setLoadingValuation] = useState(false);

  useEffect(() => {
    fetchAllData();
    handleQuickCheckSearch('');
  }, []);

  useEffect(() => {
    if (activeTab === 'quick_check') {
      handleQuickCheckSearch(quickSearch);
    }
  }, [activeTab]);

  useEffect(() => {
    if (products.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const productIdParam = params.get('productId');

    if (action === 'withdraw' && productIdParam) {
      const targetId = Number(productIdParam);
      const foundProd = products.find(p => p.productId === targetId);
      if (foundProd) {
        setBulkTxItems([{ productId: foundProd.productId, quantity: 1, unitCost: foundProd.unitCost || '', expireDate: '' }]);
        setBulkTxType('OUT');
        setBulkTxDate(getTodayString());
        setIsBulkTxModalOpen(true);
      }
    }
  }, [products]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [prodRes, machRes, alertsRes, custRes, txRes] = await Promise.all([
        fetch('/api/products').catch(() => null),
        fetch('/api/machines').catch(() => null),
        fetch('/api/reports/alerts').catch(() => null),
        fetch('/api/customers').catch(() => null),
        fetch('/api/transactions').catch(() => null)
      ]);
      
      if (prodRes) {
        const prodData = await prodRes.json();
        if (prodData.success) {
          setProducts(prodData.products || []);
          setCategories(prodData.categories || []);
          if (prodData.categories?.length > 0) setFormData(prev => ({ ...prev, categoryId: prodData.categories[0].id }));
        }
      }

      if (machRes) {
        const machData = await machRes.json();
        if (machData.success) setMachines(machData.machines || []);
      }

      if (alertsRes) {
        const alertsData = await alertsRes.json();
        if (alertsData.success) setAlerts({ expiring: alertsData.expiring });
      }

      if (custRes) {
        const custData = await custRes.json();
        if (custData.success) setCustomers(custData.customers || []);
      }

      if (txRes) {
        const txData = await txRes.json();
        if (txData.success) setTransactionsHistory(txData.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const handleQuickCheckSearch = async (searchTerm: string) => {
    setQuickSearch(searchTerm);
    setLoadingQuick(true);
    try {
      const res = await fetch(`/api/stock-check?q=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      if (data.success) {
        setQuickResults(data.data || []);
      }
    } catch (err) {
      console.error('Quick check search error:', err);
    }
    setLoadingQuick(false);
  };

  const fetchHistory = async () => {
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/transactions');
      const data = await res.json();
      if (data.success) setTransactionsHistory(data.transactions || []);
    } catch (error) { alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ครับ'); }
    setLoadingHistory(false);
  };

  const fetchValuationReport = async () => {
    setLoadingValuation(true);
    try {
      const res = await fetch('/api/reports/valuation');
      const data = await res.json();
      if (data.success) setValuationData(data);
    } catch (error) {
      alert('ไม่สามารถโหลดข้อมูลรายงานมูลค่าสินค้าได้');
    }
    setLoadingValuation(false);
  };

  const handleSaveProduct = async () => {
    try { const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) }); if (res.ok) window.location.reload(); else alert('เกิดข้อผิดพลาด'); } catch (error) { alert('เชื่อมต่อไม่ได้'); }
  };
  
  const handleUpdateProduct = async () => {
    if (!editFormData) return;
    try { 
      const res = await fetch('/api/products', { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(editFormData) 
      }); 
      if (res.ok) {
        window.location.reload();
      } else {
        alert('อัปเดตไม่สำเร็จ');
      }
    } catch (error) { 
      alert('เชื่อมต่อไม่ได้'); 
    }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!confirm(`ยืนยันลบสินค้า "${name}"?`)) return;
    try { const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' }); const data = await res.json(); if (data.success) window.location.reload(); else alert(`ลบไม่ได้: ${data.error}`); } catch (error) { alert('เชื่อมต่อไม่ได้'); }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return alert("กรุณาใส่ชื่อหมวดหมู่");
    setIsSubmittingCat(true);
    try { 
      const res = await fetch('/api/categories', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ categoryName: newCategoryName, requiresSerialNumber: newCategoryRequiresSn }) 
      }); 
      if (res.ok) window.location.reload(); else alert('บันทึกไม่สำเร็จ'); 
    } catch (error) { alert('เชื่อมต่อไม่ได้'); } 
    setIsSubmittingCat(false);
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!confirm(`ยืนยันลบหมวดหมู่ "${name}"?`)) return;
    try { const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' }); const data = await res.json(); if (data.success) window.location.reload(); else alert(`ลบไม่ได้: ${data.error}`); } catch (error) { alert('เชื่อมต่อไม่ได้'); }
  };

  const handleSaveBulkTransaction = async () => {
    const validItems = bulkTxItems.filter(item => item.productId !== '' && item.quantity > 0);
    if (validItems.length === 0) return alert('กรุณาเลือกสินค้าและระบุจำนวน');
    
    const itemsToSubmit = validItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost ? Number(item.unitCost) : 0,
      expireDate: item.expireDate || null
    }));

    setIsSubmittingTx(true);
    try {
      const res = await fetch('/api/transactions', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          transactionType: bulkTxType, referenceNo: bulkTxRef, remark: bulkTxRemark, 
          employeeId: bulkTxEmployee ? Number(bulkTxEmployee) : null, supplierId: bulkTxType === 'IN' && bulkTxSupplier ? Number(bulkTxSupplier) : null, 
          transactionDate: bulkTxDate ? new Date(bulkTxDate).toISOString() : new Date().toISOString(),
          items: itemsToSubmit
        }) 
      });
      const data = await res.json();
      if (data.success) {
        setIsBulkTxModalOpen(false);
        fetchAllData();
        if (activeTab === 'quick_check') handleQuickCheckSearch(quickSearch);
      } else alert(`เกิดข้อผิดพลาด:\n${data.error}`);
    } catch (error) { alert('เชื่อมต่อไม่ได้'); }
    setIsSubmittingTx(false);
  };

  const handleSaveMachine = async () => {
    if (!machineFormData.productId) return alert('กรุณาเลือกรุ่นสินค้าตั้งต้น');

    const status = machineFormData.assetStatus;
    const hasCustomer = Boolean(machineFormData.customerId);

    if ((status === 'Rented' || status === 'Sold') && !hasCustomer) {
      const confirmProceed = confirm('⚠️ คำเตือน: คุณตั้งสถานะเป็น "ปล่อยเช่า" หรือ "ขายขาด" แต่ยังไม่ได้เลือกลูกค้าผู้ครอบครอง\n\nต้องการบันทึกเลยหรือไม่?');
      if (!confirmProceed) return;
    }

    if (status === 'In_Stock' && hasCustomer) {
      const confirmClearCust = confirm('💡 คำเตือน: เครื่องสถานะ "พร้อมใช้งานในคลัง" แต่ยังมีชื่อลูกค้าค้างอยู่\n\nต้องการให้ระบบเคลียร์ชื่อลูกค้าออกเพื่อให้เครื่องอยู่ในคลังสมบูรณ์เลยใช่ไหม?');
      if (confirmClearCust) {
        machineFormData.customerId = null;
      }
    }

    try {
      const res = await fetch('/api/machines', {
        method: isEditingMachine ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(machineFormData)
      });
      const data = await res.json();
      if (data.success) {
        setIsMachineModalOpen(false);
        fetchAllData();
        if (activeTab === 'quick_check') handleQuickCheckSearch(quickSearch);
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (error) { alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); }
  };

  const handleDeleteMachine = async (id: number, sn: string) => {
    if (!confirm(`ยืนยันลบเครื่อง SN: ${sn}?`)) return;
    try {
      const res = await fetch(`/api/machines?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchAllData(); else alert(`ลบไม่ได้: ${data.error}`);
    } catch (error) { alert('เชื่อมต่อไม่ได้'); }
  };

  const toggleFilterCategory = (catId: number) => {
    setSelectedFilterCategories(prev => 
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const safeProducts = products || [];
  const sortedProducts = [...safeProducts].sort((a, b) => a.productId - b.productId);
  const safeCategories = categories || [];
  const safeMachines = machines || [];

  const isConsumableProduct = (p: Product) => {
    const catId = p.categoryId;
    const pName = (p.productName || '').toLowerCase();
    const category = safeCategories.find(c => c.id === catId);
    const catName = (category?.categoryName || '').toLowerCase();

    if (category && category.requiresSerialNumber === false) {
      return true;
    }

    const isBladeItem = catName.includes('blade') || catName.includes('ใบมีด') || pName.includes('blade') || pName.includes('ใบมีด');
    if (isBladeItem) return true;

    const isKitchenMachine = catName.includes('food cutting machine') || catName.includes('bone saw') || catName.includes('stuffing') || 
                             catName.includes('peeler') || catName.includes('cutter') || catName.includes('mixer') || 
                             catName.includes('mincer') || catName.includes('slicing') || catName.includes('slicer') || 
                             catName.includes('hamburger') || catName.includes('eggeater') || catName.includes('sausage') ||
                             pName.includes('food cutting machine') || pName.includes('bone saw') || pName.includes('stuffing') || 
                             pName.includes('peeler') || pName.includes('cutter') || pName.includes('mixer') || 
                             pName.includes('mincer') || pName.includes('slicing') || pName.includes('slicer') || 
                             pName.includes('hamburger') || pName.includes('eggeater') || pName.includes('sausage');

    if (isKitchenMachine) return false;

    const isConsumableCategory = catId === 5 || catId === 6 || catId === 8 || catId === 9 || catId === 10 || (catId >= 17 && catId <= 43);
    const isConsumableName = pName.includes('ไส้กรอง') || pName.includes('น้ำยา') || pName.includes('ซิงค์') || pName.includes('โต๊ะ') || pName.includes('ฐานรอง') || pName.includes('โอริง') || pName.includes('สายยาง') || pName.includes('ข้อต่อ');

    return isConsumableCategory || isConsumableName;
  };

  const isMachineProduct = (p: Product) => {
    return !isConsumableProduct(p);
  };

  const consumableProducts = sortedProducts.filter(p => !isMachineProduct(p));
  const machineCatalogProducts = sortedProducts.filter(p => isMachineProduct(p));

  const currentListToDisplay = inventorySubTab === 'consumables' ? consumableProducts : machineCatalogProducts;
  
  const displayedFilterCategories = safeCategories.filter(cat => {
    const matchesSearch = cat.categoryName.toLowerCase().includes(filterCategorySearch.toLowerCase());
    const catId = cat.id;
    const catName = (cat.categoryName || '').toLowerCase();

    const isExplicitConsumable = cat.requiresSerialNumber === false;
    const isBladeCat = catName.includes('blade') || catName.includes('ใบมีด');

    const isKitchenMachineCat = !isBladeCat && !isExplicitConsumable && (
                            catName.includes('food cutting machine') || catName.includes('bone saw') || 
                            catName.includes('stuffing') || catName.includes('peeler') || catName.includes('cutter') || 
                            catName.includes('mixer') || catName.includes('mincer') || catName.includes('slicing') || 
                            catName.includes('slicer') || catName.includes('hamburger') || catName.includes('eggeater') || 
                            catName.includes('sausage'));

    const isConsumableCat = isExplicitConsumable || isBladeCat || (!isKitchenMachineCat && (
                            catId === 5 || catId === 6 || catId === 8 || catId === 9 || catId === 10 || (catId >= 17 && catId <= 43) ||
                            catName.includes('ไส้กรอง') || catName.includes('น้ำยา') || catName.includes('ซิงค์') || catName.includes('โต๊ะ') || catName.includes('ฐานรอง')));

    if (inventorySubTab === 'consumables') {
      return matchesSearch && isConsumableCat;
    } else {
      return matchesSearch && !isConsumableCat;
    }
  });

  const displayProducts = currentListToDisplay.filter(p => {
    const matchesCategoryFilter = selectedFilterCategories.length === 0 || selectedFilterCategories.includes(p.categoryId);
    const query = inventorySearch.toLowerCase().trim();
    if (!query) return matchesCategoryFilter;

    const category = safeCategories.find(c => c.id === p.categoryId);
    const matchName = (p.productName || '').toLowerCase().includes(query);
    const matchModel = (p.productModelCode || '').toLowerCase().includes(query);
    const matchCatName = (category?.categoryName || '').toLowerCase().includes(query);

    return matchesCategoryFilter && (matchName || matchModel || matchCatName);
  });

  const filteredHistory = transactionsHistory.filter((tx: any) => {
    if (historyTypeFilter !== 'ALL' && tx.transactionType !== historyTypeFilter) return false;

    if (tx.transactionDate) {
      const txDate = new Date(tx.transactionDate);
      const txDateStr = txDate.toISOString().split('T')[0];
      const txMonth = String(txDate.getMonth() + 1);
      const txYear = String(txDate.getFullYear());

      if (historyFilterMode === 'DAY') {
        if (historySelectedDate && txDateStr !== historySelectedDate) return false;
      } else if (historyFilterMode === 'MONTH') {
        if (historySelectedMonth && txMonth !== historySelectedMonth) return false;
      } else if (historyFilterMode === 'YEAR') {
        if (historySelectedYear && txYear !== historySelectedYear) return false;
      } else if (historyFilterMode === 'CUSTOM') {
        if (historyStartDate && txDateStr < historyStartDate) return false;
        if (historyEndDate && txDateStr > historyEndDate) return false;
      }
    }

    const q = historySearchQuery.toLowerCase().trim();
    if (q) {
      const pName = (tx.product?.productName || '').toLowerCase();
      const pModel = (tx.product?.productModelCode || '').toLowerCase();
      const refNo = (tx.referenceNo || '').toLowerCase();
      const remark = (tx.remark || '').toLowerCase();
      return pName.includes(q) || pModel.includes(q) || refNo.includes(q) || remark.includes(q);
    }

    return true;
  }).sort((a: any, b: any) => {
    const dateA = new Date(a.transactionDate || 0).getTime();
    const dateB = new Date(b.transactionDate || 0).getTime();
    return historySortDirection === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const outOfStockItems = sortedProducts.filter(item => (item.stockQty ?? 0) === 0);
  const lowStockItems = sortedProducts.filter(item => (item.stockQty ?? 0) > 0 && (item.stockQty ?? 0) <= 5);

  const filteredCategories = safeCategories.filter(cat => cat.categoryName.toLowerCase().includes(categorySearch.toLowerCase()));
  const selectedCategoryName = safeCategories.find(c => c.id === formData.categoryId)?.categoryName || 'เลือกหมวดหมู่...';
  
  const filteredTxProducts = sortedProducts.filter(p => (p.productName || '').toLowerCase().includes(txProductSearch.toLowerCase()) || (p.productModelCode || '').toLowerCase().includes(txProductSearch.toLowerCase()));
  const filteredMachines = safeMachines.filter(m => (m.assetSerialNumber || '').toLowerCase().includes(machineSearch.toLowerCase()) || (m.product?.productName || '').toLowerCase().includes(machineSearch.toLowerCase()));

  const sortedCustomers = [...customers].sort((a, b) => a.customer_id - b.customer_id);
  const filteredCustomers = sortedCustomers.filter(c => 
    (c.customer_name || '').toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    (c.customer_taxname || '').toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    (c.customer_contact_name || '').toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    (c.customer_number || '').toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    String(c.customer_id).includes(customerSearchQuery)
  );

  const machineStatusChartData = [
    { name: 'พร้อมใช้งาน', value: machines.filter(m => m.assetStatus === 'In_Stock').length, color: '#10B981' },
    { name: 'ปล่อยเช่าอยู่', value: machines.filter(m => m.assetStatus === 'Rented').length, color: '#3B82F6' },
    { name: 'ขายขาดแล้ว', value: machines.filter(m => m.assetStatus === 'Sold').length, color: '#A855F7' },
    { name: 'กำลังซ่อมบำรุง', value: machines.filter(m => m.assetStatus === 'Maintenance').length, color: '#F59E0B' },
    { name: 'ปลดระวาง', value: machines.filter(m => m.assetStatus === 'Retired').length, color: '#F43F5E' },
  ].filter(d => d.value > 0);

  const categoryValueMap: { [key: string]: number } = {};
  if (valuationData?.lots) {
    valuationData.lots.forEach((lot: any) => {
      const catName = lot.categoryName || 'อื่นๆ';
      categoryValueMap[catName] = (categoryValueMap[catName] || 0) + lot.totalValue;
    });
  }
  const topCategoryChartData = Object.keys(categoryValueMap)
    .map(catName => ({ category: catName, value: categoryValueMap[catName] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const outboundMap: { [key: string]: number } = {};
  transactionsHistory.forEach(tx => {
    if (tx.transactionType === 'OUT' && tx.product?.productName) {
      const pName = tx.product.productName;
      outboundMap[pName] = (outboundMap[pName] || 0) + Number(tx.quantity);
    }
  });
  const topOutboundProductsData = Object.keys(outboundMap)
    .map(pName => ({ name: pName, quantity: outboundMap[pName] }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const monthlyTrendMap: { [key: string]: { monthKey: string; monthLabel: string; inQty: number; outQty: number } } = {};
  const monthNamesThai = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  transactionsHistory.forEach(tx => {
    if (!tx.transactionDate) return;
    const d = new Date(tx.transactionDate);
    const yearStr = d.getFullYear();
    const monthIdx = d.getMonth();
    const monthKey = `${yearStr}-${String(monthIdx + 1).padStart(2, '0')}`;
    const monthLabel = `${monthNamesThai[monthIdx]} ${yearStr + 543 - 2500}`;

    if (!monthlyTrendMap[monthKey]) {
      monthlyTrendMap[monthKey] = { monthKey, monthLabel, inQty: 0, outQty: 0 };
    }

    if (tx.transactionType === 'IN') {
      monthlyTrendMap[monthKey].inQty += Number(tx.quantity || 0);
    } else if (tx.transactionType === 'OUT') {
      monthlyTrendMap[monthKey].outQty += Number(tx.quantity || 0);
    }
  });

  const stockMovementTrendData = Object.values(monthlyTrendMap)
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .slice(-6);

  const categoryUsageMap: { [catName: string]: { categoryName: string; totalQty: number; totalCost: number } } = {};
  let globalTotalOutboundCost = 0;

  transactionsHistory.forEach(tx => {
    if (tx.transactionType === 'OUT' && tx.product) {
      const catId = tx.product.categoryId;
      const catObj = safeCategories.find(c => c.id === catId);
      const catName = catObj?.categoryName || 'อื่นๆ (ไม่ระบุหมวดหมู่)';
      const qty = Number(tx.quantity || 0);

      let costForThisTx = 0;
      if (tx.lotDetails && tx.lotDetails.length > 0) {
        costForThisTx = tx.lotDetails.reduce((sum: number, ld: any) => sum + (ld.quantityUsed * (ld.costApplied || 0)), 0);
      } else {
        costForThisTx = qty * Number(tx.product.unitCost || 0);
      }

      globalTotalOutboundCost += costForThisTx;

      if (!categoryUsageMap[catName]) {
        categoryUsageMap[catName] = { categoryName: catName, totalQty: 0, totalCost: 0 };
      }
      categoryUsageMap[catName].totalQty += qty;
      categoryUsageMap[catName].totalCost += costForThisTx;
    }
  });

  const categoryUsageCostData = Object.values(categoryUsageMap)
    .map(item => ({
      ...item,
      percentageShare: globalTotalOutboundCost > 0 ? ((item.totalCost / globalTotalOutboundCost) * 100).toFixed(1) : '0.0'
    }))
    .sort((a, b) => b.totalCost - a.totalCost);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In_Stock': return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit"><CheckCircle2 size={12}/> พร้อมใช้งาน</span>;
      case 'Rented': return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1 w-fit"><Server size={12}/> ปล่อยเช่าอยู่</span>;
      case 'Sold': return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1 w-fit"><DollarSign size={12}/> ขายขาดแล้ว</span>;
      case 'Maintenance': return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit"><PenTool size={12}/> กำลังซ่อมบำรุง</span>;
      case 'Retired': return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1 w-fit"><AlertOctagon size={12}/> ปลดระวาง</span>;
      default: return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">{status}</span>;
    }
  };

  const selectedCustomer = customers.find(c => c.customer_id === machineFormData.customerId);

  return (
    <main 
      className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans relative"
      onClick={() => {
        setIsFilterDropdownOpen(false);
        setIsCustomerDropdownOpen(false);
      }} 
    >
      
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500"><Database size={28} /></div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white">ระบบบริหารคลังสินค้าและเครื่องจักร</h1>
              <p className="text-slate-400 text-xs md:text-sm mt-0.5">จัดการสต็อกสินค้า ทะเบียนเครื่องจักร และเช็กสต็อกหน้างาน</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="flex flex-wrap bg-slate-950 p-1.5 rounded-xl border border-slate-800 flex-1 lg:flex-none gap-1">
              <button 
                onClick={() => setActiveTab('quick_check')}
                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg font-medium text-xs md:text-sm transition flex items-center justify-center gap-1.5 ${activeTab === 'quick_check' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <Zap size={16} /> Quick Check หน้างาน
              </button>
              <button 
                onClick={() => setActiveTab('inventory')}
                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg font-medium text-xs md:text-sm transition flex items-center justify-center gap-1.5 ${activeTab === 'inventory' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <Package size={16} /> คลังสินค้าหลัก
              </button>
              <button 
                onClick={() => setActiveTab('machines')}
                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg font-medium text-xs md:text-sm transition flex items-center justify-center gap-1.5 ${activeTab === 'machines' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <Server size={16} /> ทะเบียนเครื่องจักร (SN)
              </button>
              <button 
                onClick={() => {
                  setActiveTab('analytics');
                  if (!valuationData) fetchValuationReport();
                }}
                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg font-medium text-xs md:text-sm transition flex items-center justify-center gap-1.5 ${activeTab === 'analytics' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <BarChart3 size={16} /> สรุปภาพรวม
              </button>
            </div>
            
            <Link 
              href="/chemical" 
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition flex items-center gap-2 shadow-lg shadow-indigo-600/20 whitespace-nowrap"
            >
              <FlaskConical size={18} /> ระบบผสมน้ำยา & จัดส่ง
            </Link>
          </div>
        </div>

        {activeTab === 'quick_check' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-emerald-400 font-bold text-lg flex items-center gap-2">
                  <Zap size={22} /> เช็กสต็อกแยกตามประเภทและโมเดลหน้างาน
                </h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsPrintModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg"
                  >
                    <Printer size={16} /> พิมพ์ป้าย QR Code ชั้นวาง
                  </button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="🔍 ค้นหารุ่นโมเดล หรือชื่อสินค้า..." 
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-11 pr-10 py-2.5 text-white text-sm outline-none focus:border-emerald-500 transition" 
                  value={quickSearch} 
                  onChange={(e) => handleQuickCheckSearch(e.target.value)} 
                />
                {quickSearch && (
                  <button onClick={() => handleQuickCheckSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {loadingQuick ? (
              <div className="p-12 text-center text-slate-400">กำลังโหลดข้อมูล...</div>
            ) : quickResults.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                ไม่พบรายการสินค้าที่ค้นหา
              </div>
            ) : (
              <div className="space-y-6">
                {quickResults.map(group => (
                  <div key={group.categoryId} className="bg-white text-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
                        📂 {group.categoryName}
                      </h3>
                      <span className="text-slate-500 font-medium text-sm">
                        รวมทั้งหมด {group.totalQty} เครื่อง
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 space-y-3">
                      {group.modelGroups.map((mg: any, idx: number) => (
                        <div key={idx} className="pt-3 first:pt-0 space-y-2">
                          {mg.products.map((p: any) => {
                            const realReadyCount = p.readyMachines ? p.readyMachines.length : (p.stockQty ?? 0);
                            const hasRealQty = realReadyCount > 0;

                            return (
                              <div key={p.productId} className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 bg-amber-500 text-slate-950 font-mono font-black text-sm rounded-lg shadow-sm">
                                      {p.productModelCode || 'N/A'}
                                    </span>
                                    <div>
                                      <div className="text-base font-bold text-slate-800">{p.productName}</div>
                                      <div className="text-xs text-slate-500">รหัสสินค้า ID: #{p.productId}</div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span className={`px-4 py-1.5 rounded-xl font-bold text-sm min-w-[85px] text-center shadow-sm ${
                                      hasRealQty ? 'bg-emerald-600 text-white' : 'bg-orange-100 text-orange-700 border border-orange-300'
                                    }`}>
                                      {realReadyCount} {p.unitName || 'เครื่อง'}
                                    </span>
                                    <button 
                                      onClick={() => {
                                        setBulkTxItems([{ productId: p.productId, quantity: 1, unitCost: p.unitCost || '', expireDate: '' }]);
                                        setBulkTxType('IN');
                                        setBulkTxDate(getTodayString());
                                        setIsBulkTxModalOpen(true);
                                      }}
                                      className="px-3.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-500 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
                                    >
                                      + รับเข้า
                                    </button>
                                  </div>
                                </div>

                                {p.readyMachines && p.readyMachines.length > 0 && (
                                  <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 space-y-2 text-xs">
                                    <div className="text-amber-900 font-bold flex items-center gap-1.5">
                                      <span>📦 รายการเครื่อง S/N พร้อมส่ง ({p.readyMachines.length} เครื่อง):</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {p.readyMachines.map((m: any) => (
                                        <div key={m.assetId} className="bg-white border border-amber-300 px-3 py-1 rounded-lg flex items-center gap-2 shadow-sm">
                                          <span className="font-mono font-bold text-slate-700">SN: {m.assetSerialNumber}</span>
                                          <button 
                                            onClick={() => {
                                              setMachineFormData({
                                                ...m,
                                                assetInstallDate: m.assetInstallDate ? new Date(m.assetInstallDate).toISOString().split('T')[0] : '',
                                                assetPurchaseDate: m.assetPurchaseDate ? new Date(m.assetPurchaseDate).toISOString().split('T')[0] : '',
                                                assetWarrantyExpireDate: m.assetWarrantyExpireDate ? new Date(m.assetWarrantyExpireDate).toISOString().split('T')[0] : ''
                                              });
                                              setIsEditingMachine(true);
                                              setIsMachineModalOpen(true);
                                            }}
                                            className="text-[11px] bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-2 py-0.5 rounded-md font-bold transition"
                                          >
                                            ผูกลูกค้า
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div className={`p-5 rounded-2xl flex flex-col justify-between gap-5 shadow-lg ${outOfStockItems.length > 0 ? 'bg-rose-950/30 border border-rose-500/20 shadow-rose-900/20' : 'bg-slate-900/50 border border-slate-800/80'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3.5 rounded-xl shrink-0 border ${outOfStockItems.length > 0 ? 'bg-rose-500/20 text-rose-400 border-rose-500/10' : 'bg-slate-800 text-slate-500 border-slate-700'}`}><AlertOctagon size={24} /></div>
                  <div>
                    <h4 className={`font-bold text-base flex items-center gap-1.5 ${outOfStockItems.length > 0 ? 'text-rose-400' : 'text-slate-400'}`}>🚨 สินค้าหมดเกลี้ยง</h4>
                    <p className="text-slate-300 text-sm mt-1">ต้องสั่งเพิ่ม <strong className={`text-xl mx-1 ${outOfStockItems.length > 0 ? 'text-rose-400' : 'text-slate-400'}`}>{outOfStockItems.length}</strong> รายการ</p>
                  </div>
                </div>
                <button onClick={() => { setLowStockModalType('OUT'); setIsLowStockModalOpen(true); }} className={`w-full py-2.5 rounded-xl text-sm font-bold transition flex justify-center items-center gap-2 border ${outOfStockItems.length > 0 ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'}`}>🔍 ดูรายการของหมด</button>
              </div>

              <div className={`p-5 rounded-2xl flex flex-col justify-between gap-5 shadow-lg ${lowStockItems.length > 0 ? 'bg-amber-950/30 border border-amber-500/20 shadow-amber-900/20' : 'bg-slate-900/50 border border-slate-800/80'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3.5 rounded-xl shrink-0 border ${lowStockItems.length > 0 ? 'bg-amber-500/20 text-amber-400 border-amber-500/10' : 'bg-slate-800 text-slate-500 border-slate-700'}`}><AlertTriangle size={24} /></div>
                  <div>
                    <h4 className={`font-bold text-base flex items-center gap-1.5 ${lowStockItems.length > 0 ? 'text-amber-400' : 'text-slate-400'}`}>⚠️ สินค้าใกล้หมด (1-5)</h4>
                    <p className="text-slate-300 text-sm mt-1">สต็อกต่ำจำนวน <strong className={`text-xl mx-1 ${lowStockItems.length > 0 ? 'text-amber-400' : 'text-slate-400'}`}>{lowStockItems.length}</strong> รายการ</p>
                  </div>
                </div>
                <button onClick={() => { setLowStockModalType('LOW'); setIsLowStockModalOpen(true); }} className={`w-full py-2.5 rounded-xl text-sm font-bold transition flex justify-center items-center gap-2 border ${lowStockItems.length > 0 ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'}`}>🔍 ดูรายการใกล้หมด</button>
              </div>

              <div className={`p-5 rounded-2xl flex flex-col justify-between gap-5 shadow-lg md:col-span-2 lg:col-span-1 ${alerts.expiring?.length > 0 ? 'bg-blue-950/30 border border-blue-500/20 shadow-blue-900/20' : 'bg-slate-900/50 border border-slate-800/80'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3.5 rounded-xl shrink-0 border ${alerts.expiring?.length > 0 ? 'bg-blue-500/20 text-blue-400 border-blue-500/10' : 'bg-slate-800 text-slate-500 border-slate-700'}`}><Clock size={24} /></div>
                  <div>
                    <h4 className={`font-bold text-base flex items-center gap-1.5 ${alerts.expiring?.length > 0 ? 'text-blue-400' : 'text-slate-400'}`}>⏱️ Lot ใกล้หมดอายุ</h4>
                    <p className="text-slate-300 text-sm mt-1">เสี่ยงหมดอายุ <strong className={`text-xl mx-1 ${alerts.expiring?.length > 0 ? 'text-blue-400' : 'text-slate-400'}`}>{alerts.expiring?.length || 0}</strong> ล็อต</p>
                  </div>
                </div>
                <button onClick={() => setIsExpiringModalOpen(true)} disabled={!alerts.expiring || alerts.expiring.length === 0} className={`w-full py-2.5 rounded-xl text-sm font-bold transition flex justify-center items-center gap-2 border ${alerts.expiring?.length > 0 ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20' : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-50'}`}>🔍 ดูรายการใกล้หมดอายุ</button>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button onClick={() => setIsPrintModalOpen(true)} className="bg-slate-800 hover:bg-slate-700 text-emerald-400 px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 border border-slate-700/60 transition"><Printer size={18} /> พิมพ์ป้าย QR Code</button>
              <button onClick={fetchHistory} className="bg-slate-800 hover:bg-slate-700 text-blue-400 px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 border border-slate-700/60 transition"><ClipboardList size={18} /> ประวัติรับ/เบิก</button>
              <button onClick={() => { setBulkTxItems([{ productId: '', quantity: 1, unitCost: '', expireDate: '' }]); setBulkTxRef(''); setBulkTxRemark(''); setBulkTxEmployee(''); setBulkTxSupplier(''); setBulkTxType('IN'); setBulkTxDate(getTodayString()); setIsBulkTxModalOpen(true); }} className="bg-slate-800 hover:bg-slate-700 text-emerald-400 px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 border border-slate-700/60 transition"><ArrowRightLeft size={18} /> จัดการสต็อก (รับ/เบิก)</button>
              <button onClick={() => setIsCategoryModalOpen(true)} className="bg-slate-800 hover:bg-slate-700 text-amber-400 px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 border border-slate-700/60 transition"><FolderPlus size={18} /> จัดการหมวดหมู่</button>
              <button onClick={() => setIsAddModalOpen(true)} className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition shadow-lg shadow-amber-600/20"><Plus size={18} /> เพิ่มสินค้าใหม่</button>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800 w-fit">
              <button
                onClick={() => setInventorySubTab('consumables')}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${
                  inventorySubTab === 'consumables' 
                    ? 'bg-amber-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white bg-slate-950/50'
                }`}
              >
                <Wrench size={16} /> อะไหล่ / ใบมีด / ข้อต่อ / สกรู (ไม่มี S/N) ({consumableProducts.length})
              </button>
              <button
                onClick={() => setInventorySubTab('machines_catalog')}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${
                  inventorySubTab === 'machines_catalog' 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white bg-slate-950/50'
                }`}
              >
                <Server size={16} /> เครื่องจักร / อุปกรณ์ (มี S/N) ({machineCatalogProducts.length})
              </button>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl shadow-2xl">
              <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  {inventorySubTab === 'consumables' ? <Wrench className="text-amber-500" size={20} /> : <Server className="text-indigo-400" size={20} />} 
                  {inventorySubTab === 'consumables' ? 'รายการอะไหล่ สกรู ข้อต่อ ใบมีด (คุมด้วย Lot FIFO)' : 'รายการเครื่องจักรในแคตตาล็อก (อิง S/N อัตโนมัติ)'}
                </h3>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="ค้นหาชื่อ, โมเดล, ประเภท..." 
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-8 py-2.5 text-sm text-white outline-none focus:border-amber-500 transition"
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                    />
                    {inventorySearch && (
                      <button 
                        onClick={() => setInventorySearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="relative w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)} className="flex items-center justify-between gap-2 w-full sm:w-64 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none hover:border-amber-500 transition">
                      <div className="flex items-center gap-2"><Filter size={16} className={selectedFilterCategories.length > 0 ? "text-amber-500" : "text-slate-400"} /><span>{selectedFilterCategories.length === 0 ? 'แสดงทุกหมวดหมู่' : `กรองอยู่ (${selectedFilterCategories.length} หมวดหมู่)`}</span></div><ChevronDown size={16} className="text-slate-400" />
                    </button>
                    {isFilterDropdownOpen && (
                      <div className="absolute z-10 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden right-0">
                        <div className="p-2 border-b border-slate-800 bg-slate-950 flex flex-col gap-2 sticky top-0 z-20">
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input type="text" autoFocus placeholder="🔍 ค้นหาหมวดหมู่..." className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-8 py-2 text-sm text-white outline-none focus:border-amber-500 transition" value={filterCategorySearch} onChange={(e) => setFilterCategorySearch(e.target.value)}/>
                              {filterCategorySearch && (<button onClick={() => setFilterCategorySearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"><X size={14} /></button>)}
                            </div>
                            {selectedFilterCategories.length > 0 && (<button onClick={() => setSelectedFilterCategories([])} className="px-3 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1"><Trash2 size={12} /> ล้างที่เลือก</button>)}
                          </div>
                        </div>
                        <ul className="max-h-60 overflow-y-auto p-2 space-y-1">
                          {displayedFilterCategories.map(cat => (
                            <li key={cat.id}><label className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-800 cursor-pointer text-sm text-slate-300 transition-colors select-none"><input type="checkbox" className="accent-amber-500 w-4 h-4 cursor-pointer" checked={selectedFilterCategories.includes(cat.id)} onChange={() => toggleFilterCategory(cat.id)}/>{cat.categoryName}</label></li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-b-2xl">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800"><th className="p-4 font-semibold">รหัส/ชื่อสินค้า</th><th className="p-4 font-semibold">หมวดหมู่</th><th className="p-4 font-semibold">สถานะ</th><th className="p-4 font-semibold text-right">ราคาขาย (฿)</th><th className="p-4 font-semibold text-center">คงเหลือ (Summary)</th><th className="p-4 font-semibold text-center">จัดการ</th></tr></thead>
                  <tbody className="divide-y divide-slate-800/50 text-sm">
                    {loading ? (<tr><td colSpan={6} className="p-16 text-center text-slate-400">กำลังโหลด...</td></tr>) : displayProducts.length === 0 ? (<tr><td colSpan={6} className="p-16 text-center text-slate-400">ไม่พบข้อมูลสินค้าตรงตามเงื่อนไขที่ค้นหา</td></tr>) : (
                      displayProducts.map((item) => {
                        const category = safeCategories.find(c => c.id === item.categoryId);
                        const currentStock = item.stockQty ?? 0;
                        return (
                          <tr key={item.productId} className="hover:bg-slate-800/40 transition">
                            <td className="p-4 font-medium text-white flex items-center gap-3"><div className="p-2 bg-slate-800 rounded-lg text-amber-400"><Package size={18} /></div><div><div>{item.productName || 'ไม่มีชื่อ'}</div><div className="text-xs text-slate-500 font-mono mt-0.5">{item.productModelCode || 'ไม่มีรหัสรุ่น'}</div></div></td>
                            <td className="p-4 text-slate-300"><span className="px-2.5 py-1 bg-slate-800/70 rounded-md text-xs border border-slate-700/50">{category?.categoryName || '-'}</span></td>
                            <td className="p-4">{item.isPreorder ? <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">พรีออเดอร์</span> : <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">พร้อมส่ง</span>}</td>
                            <td className="p-4 text-right font-semibold text-slate-200">{item.salePrice ? Number(item.salePrice).toLocaleString() : '0.00'} ฿</td>
                            <td className="p-4 text-center"><span className={`px-3 py-1 rounded-full text-xs font-bold border inline-block min-w-[70px] ${currentStock > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>{currentStock} {item.unitName || 'ชิ้น'}</span></td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button onClick={() => { setEditFormData(item); setIsEditModalOpen(true); }} className="p-2 bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 rounded-lg transition"><Edit3 size={16} /></button>
                                <button onClick={() => handleDeleteProduct(item.productId, item.productName || '')} className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-lg transition"><Trash2 size={16} /></button>
                              </div>
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
        )}

        {activeTab === 'machines' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input type="text" placeholder="ค้นหา Serial Number, ชื่อรุ่น..." className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-indigo-500" value={machineSearch} onChange={(e) => setMachineSearch(e.target.value)} />
              </div>
              <button onClick={() => { 
                setMachineFormData({ productId: sortedProducts[0]?.productId || 0, assetSerialNumber: '', assetQrCode: '', assetStatus: 'In_Stock', assetPurchaseCost: 0, assetPurchaseDate: '', assetWarrantyExpireDate: '', assetInstallDate: '', isInternalSn: false, supplierId: null, customerId: null }); 
                setIsEditingMachine(false); 
                setIsMachineModalOpen(true); 
              }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition shadow-lg shadow-indigo-600/20 w-full md:w-auto justify-center">
                <Plus size={18} /> ลงทะเบียนเครื่องใหม่
              </button>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                      <th className="p-4 font-semibold whitespace-nowrap">Serial Number / QR</th>
                      <th className="p-4 font-semibold whitespace-nowrap">ชื่อสินค้า / โมเดล</th>
                      <th className="p-4 font-semibold whitespace-nowrap">สถานะปัจจุบัน</th>
                      <th className="p-4 font-semibold whitespace-nowrap">ข้อมูลลูกค้า / ติดตั้ง</th>
                      <th className="p-4 font-semibold whitespace-nowrap">ข้อมูล Supplier / รับเข้า</th>
                      <th className="p-4 font-semibold whitespace-nowrap">ต้นทุน / ประกัน</th>
                      <th className="p-4 font-semibold text-center whitespace-nowrap">จัดการ / ประวัติ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-sm">
                    {loading ? (
                      <tr><td colSpan={7} className="p-16 text-center text-slate-400">กำลังโหลด...</td></tr>
                    ) : filteredMachines.length === 0 ? (
                      <tr><td colSpan={7} className="p-16 text-center text-slate-400">ยังไม่มีข้อมูลเครื่องจักร</td></tr>
                    ) : (
                      filteredMachines.map((m) => {
                        const boundCustomer = customers.find(c => c.customer_id === m.customerId) || m.customer;
                        return (
                          <tr key={m.assetId} className="hover:bg-slate-800/40 transition">
                            <td className="p-4">
                              <div className="font-bold text-indigo-400 font-mono flex items-center gap-2">
                                {m.assetSerialNumber || <span className="text-slate-500 italic">ยังไม่ระบุ SN</span>}
                                {m.isInternalSn && <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400 border border-slate-700">Internal</span>}
                              </div>
                              {m.assetQrCode ? (<div className="text-xs text-slate-500 mt-1 font-mono">QR: {m.assetQrCode}</div>) : (<div className="text-xs text-slate-700 mt-1 font-mono italic">- ไม่มี QR -</div>)}
                            </td>
                            <td className="p-4 text-white">
                              <div className="font-medium">{m.product?.productName || 'ไม่ทราบชื่อรุ่น'}</div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">รุ่น: {m.product?.productModelCode || '-'}</div>
                            </td>
                            <td className="p-4">{getStatusBadge(m.assetStatus)}</td>
                            <td className="p-4 text-xs">
                              {boundCustomer ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                                  <UserCheck size={12} />
                                  <span>{boundCustomer.customer_name}</span>
                                </div>
                              ) : m.customerId ? (
                                <div className="inline-block px-2 py-1 mb-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">รหัสลูกค้า: {m.customerId}</div>
                              ) : (
                                <div className="text-slate-600 mb-1">- ไม่ระบุลูกค้า -</div>
                              )}
                              <div className="text-slate-400">ติดตั้ง: {m.assetInstallDate ? new Date(m.assetInstallDate).toLocaleDateString('th-TH') : '-'}</div>
                            </td>
                            <td className="p-4 text-xs">
                              {m.supplierId ? (<div className="inline-block px-2 py-1 mb-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">รหัสผู้ผลิต: {m.supplierId}</div>) : (<div className="text-slate-600 mb-1">- ไม่ระบุ Supplier -</div>)}
                              <div className="text-slate-400">รับเข้า: {m.assetPurchaseDate ? new Date(m.assetPurchaseDate).toLocaleDateString('th-TH') : '-'}</div>
                            </td>
                            <td className="p-4 text-xs font-mono text-slate-300">
                              <div>ต้นทุน: {m.assetPurchaseCost ? Number(m.assetPurchaseCost).toLocaleString() : '0.00'} ฿</div>
                              <div className="text-slate-500 mt-0.5">หมดประกัน: {m.assetWarrantyExpireDate ? new Date(m.assetWarrantyExpireDate).toLocaleDateString('th-TH') : '-'}</div>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button onClick={() => { setSelectedMachineForLog(m); setIsMachineLogModalOpen(true); }} title="ประวัติการย้ายเครื่อง" className="p-2 bg-slate-800 hover:bg-blue-500/20 text-slate-300 hover:text-blue-400 rounded-lg transition"><History size={16} /></button>
                                <button onClick={() => { setMachineFormData({...m, assetInstallDate: m.assetInstallDate ? new Date(m.assetInstallDate).toISOString().split('T')[0] : '', assetPurchaseDate: m.assetPurchaseDate ? new Date(m.assetPurchaseDate).toISOString().split('T')[0] : '', assetWarrantyExpireDate: m.assetWarrantyExpireDate ? new Date(m.assetWarrantyExpireDate).toISOString().split('T')[0] : ''}); setIsEditingMachine(true); setIsMachineModalOpen(true); }} title="แก้ไขเครื่อง" className="p-2 bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 rounded-lg transition"><Edit3 size={16} /></button>
                                <button onClick={() => handleDeleteMachine(m.assetId, m.assetSerialNumber)} title="ลบเครื่อง" className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-lg transition"><Trash2 size={16} /></button>
                              </div>
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
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <p className="text-slate-400 text-xs font-medium">มูลค่าสินค้าคงเหลือรวม</p>
                <h3 className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{valuationData?.totalValuation?.toLocaleString() || '0'} ฿</h3>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <p className="text-slate-400 text-xs font-medium">จำนวน Lot Active ในคลัง</p>
                <h3 className="text-2xl font-bold text-white mt-1 font-mono">{valuationData?.itemCount || 0} <span className="text-sm font-normal text-slate-400">Lot</span></h3>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <p className="text-slate-400 text-xs font-medium">เครื่องจักรปล่อยเช่า (Rented)</p>
                <h3 className="text-2xl font-bold text-blue-400 mt-1 font-mono">{machines.filter(m => m.assetStatus === 'Rented').length} <span className="text-sm font-normal text-slate-400">เครื่อง</span></h3>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <p className="text-slate-400 text-xs font-medium">เครื่องจักรรอซ่อม (Maintenance)</p>
                <h3 className="text-2xl font-bold text-amber-400 mt-1 font-mono">{machines.filter(m => m.assetStatus === 'Maintenance').length} <span className="text-sm font-normal text-slate-400">เครื่อง</span></h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
                <h3 className="font-bold text-base text-white flex items-center gap-2"><PieChartIcon className="text-indigo-400" size={18} /> สัดส่วนสถานะเครื่องจักร</h3>
                {machineStatusChartData.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={machineStatusChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                          {machineStatusChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} formatter={(val: any) => [`${val} เครื่อง`, 'จำนวน']} />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (<div className="h-64 flex items-center justify-center text-slate-500 text-sm">ยังไม่มีข้อมูลสถานะเครื่องจักร</div>)}
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <TrendingUp className="text-emerald-400" size={18} /> แนวโน้มการรับเข้า VS เบิกออก รายเดือน
                </h3>
                {stockMovementTrendData.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stockMovementTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="monthLabel" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                        <Area type="monotone" dataKey="inQty" name="รับเข้า (IN)" stroke="#10B981" fillOpacity={1} fill="url(#colorIn)" />
                        <Area type="monotone" dataKey="outQty" name="เบิกออก (OUT)" stroke="#F43F5E" fillOpacity={1} fill="url(#colorOut)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-500 text-sm">ยังไม่มีประวัติการรับเข้า-เบิกออก</div>
                )}
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
                <h3 className="font-bold text-base text-white flex items-center gap-2"><BarChart3 className="text-emerald-400" size={18} /> Top 5 หมวดหมู่ที่มีมูลค่าสต็อกสูงสุด</h3>
                {topCategoryChartData.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={topCategoryChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(val) => `${val.toLocaleString()}`} />
                        <YAxis type="category" dataKey="category" stroke="#94a3b8" fontSize={12} width={70} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} formatter={(val: any) => [`${val.toLocaleString()} ฿`, 'มูลค่ารวม']} />
                        <Bar dataKey="value" fill="#10B981" radius={[0, 8, 8, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (<div className="h-64 flex items-center justify-center text-slate-500 text-sm">ยังไม่มีข้อมูลมูลค่าหมวดหมู่</div>)}
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
                <h3 className="font-bold text-base text-white flex items-center gap-2"><TrendingDown className="text-rose-400" size={18} /> Top 5 สินค้าที่ถูกเบิกใช้งานเยอะที่สุด</h3>
                {topOutboundProductsData.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={topOutboundProductsData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis type="number" stroke="#64748b" fontSize={11} />
                        <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={90} tickFormatter={(name) => name.length > 10 ? `${name.substring(0, 10)}...` : name} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} formatter={(val: any) => [`${val} ชิ้น`, 'จำนวนเบิกออก']} />
                        <Bar dataKey="quantity" fill="#F43F5E" radius={[0, 8, 8, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (<div className="h-64 flex items-center justify-center text-slate-500 text-sm">ยังไม่มีประวัติการเบิกออก</div>)}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <Coins className="text-amber-400" size={20} /> สรุปยอดการใช้งานและมูลค่าเงินรวม แยกตามหมวดหมู่
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">เปรียบเทียบจำนวนชิ้นที่เบิกใช้งาน กับมูลค่าต้นทุนจริงที่เบิกออกไป (คำนวณจาก FIFO)</p>
                </div>
                <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400">มูลค่าเบิกออกรวมทั้งหมด: </span>
                  <strong className="text-amber-400 font-mono text-sm ml-1">{globalTotalOutboundCost.toLocaleString()} ฿</strong>
                </div>
              </div>

              {categoryUsageCostData.length > 0 ? (
                <>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryUsageCostData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="categoryName" stroke="#94a3b8" fontSize={11} interval={0} angle={-10} textAnchor="end" />
                        <YAxis yAxisId="left" stroke="#8b5cf6" fontSize={11} tickFormatter={(val) => `${val.toLocaleString()}฿`} />
                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                        <Bar yAxisId="left" dataKey="totalCost" name="มูลค่าต้นทุน (บาท)" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} />
                        <Bar yAxisId="right" dataKey="totalQty" name="ปริมาณการเบิก (ชิ้น)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
                          <th className="p-3.5">หมวดหมู่สินค้า</th>
                          <th className="p-3.5 text-center">ปริมาณการเบิกใช้รวม</th>
                          <th className="p-3.5 text-right">มูลค่าต้นทุนรวม (฿)</th>
                          <th className="p-3.5 text-right">สัดส่วนค่าใช้จ่าย (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {categoryUsageCostData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40 transition">
                            <td className="p-3.5 font-semibold text-white flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0"></span>
                              {row.categoryName}
                            </td>
                            <td className="p-3.5 text-center font-mono font-bold text-emerald-400">{row.totalQty.toLocaleString()} ชิ้น</td>
                            <td className="p-3.5 text-right font-mono font-bold text-purple-400">{row.totalCost.toLocaleString()} ฿</td>
                            <td className="p-3.5 text-right font-mono text-slate-400">
                              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 font-bold">{row.percentageShare}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                  ยังไม่มีประวัติการเบิกออกในระบบ
                </div>
              )}
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-4">
              <h3 className="font-bold text-lg text-white flex items-center gap-2"><BarChart3 className="text-purple-400" size={20} /> รายงานมูลค่าสินค้าคงเหลือตาม FIFO</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase">
                      <th className="p-3.5">เลขล็อต / PO</th><th className="p-3.5">ชื่อสินค้า</th><th className="p-3.5">หมวดหมู่</th><th className="p-3.5 text-center">คงเหลือ</th><th className="p-3.5 text-right">ต้นทุน/หน่วย</th><th className="p-3.5 text-right">มูลค่ารวม (฿)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {loadingValuation ? (<tr><td colSpan={6} className="p-8 text-center text-slate-500">กำลังคำนวณมูลค่าสต็อก...</td></tr>) : valuationData?.lots?.length > 0 ? (
                      valuationData.lots.map((lot: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="p-3.5 font-mono text-indigo-400 font-bold">{lot.lotNumber}</td>
                          <td className="p-3.5 text-white font-medium">{lot.productName}</td>
                          <td className="p-3.5 text-slate-400">{lot.categoryName}</td>
                          <td className="p-3.5 text-center font-bold text-emerald-400">{lot.remainingQty}</td>
                          <td className="p-3.5 text-right font-mono">{lot.unitCost.toLocaleString()} ฿</td>
                          <td className="p-3.5 text-right font-mono font-bold text-white">{lot.totalValue.toLocaleString()} ฿</td>
                        </tr>
                      ))
                    ) : (<tr><td colSpan={6} className="p-8 text-center text-slate-500">ไม่พบข้อมูลมูลค่าสินค้าคงเหลือ</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      <PrintQrModal 
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        products={products}
        categories={categories}
      />

      {isMachineModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Server className="text-indigo-400" size={20} /> {isEditingMachine ? 'แก้ไข/ผูกเครื่องจักรกับลูกค้า' : 'ลงทะเบียนเครื่องใหม่'}
              </h2>
              <button onClick={() => setIsMachineModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5 text-slate-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-sm text-slate-400">เลือกรุ่นสินค้า (Catalog) *</label>
                  <select className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none" value={machineFormData.productId || ''} onChange={(e) => setMachineFormData({...machineFormData, productId: Number(e.target.value)})}>
                    <option value="" disabled>-- เลือกรุ่น --</option>
                    {sortedProducts.map(p => <option key={p.productId} value={p.productId}>{p.productName} ({p.productModelCode || '-'})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 text-sm text-slate-400">Serial Number (SN) <span className="text-xs text-slate-500">(ยังไม่มีปล่อยว่างได้)</span></label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="ระบุ S/N" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none font-mono" value={machineFormData.assetSerialNumber || ''} onChange={(e) => setMachineFormData({...machineFormData, assetSerialNumber: e.target.value})} />
                    <label className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-3 cursor-pointer shrink-0">
                      <input type="checkbox" checked={machineFormData.isInternalSn || false} onChange={(e) => setMachineFormData({...machineFormData, isInternalSn: e.target.checked})} />
                      <span className="text-xs text-slate-400">SN ออกเอง</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-sm text-slate-400">สถานะเครื่อง *</label>
                  <select className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none" value={machineFormData.assetStatus || 'In_Stock'} onChange={(e) => setMachineFormData({...machineFormData, assetStatus: e.target.value})}>
                    <option value="In_Stock">พร้อมใช้งานในคลัง (In_Stock)</option>
                    <option value="Sold">ขายขาด (Sold)</option>
                    <option value="Rented">ปล่อยเช่าอยู่ (Rented)</option>
                    <option value="Maintenance">กำลังซ่อมบำรุง (Maintenance)</option>
                    <option value="Retired">ปลดระวาง/เสีย (Retired)</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 text-sm text-slate-400">QR Code</label>
                  <input type="text" placeholder="รหัส QR" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none font-mono" value={machineFormData.assetQrCode || ''} onChange={(e) => setMachineFormData({...machineFormData, assetQrCode: e.target.value})} />
                </div>
              </div>

              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm text-blue-400 font-medium flex items-center gap-1.5">
                    <UserCheck size={16} /> เลือกลูกค้าผู้ครอบครอง (เรียงตามรหัสลูกค้า)
                  </label>
                  {machineFormData.customerId && (
                    <button onClick={() => setMachineFormData({...machineFormData, customerId: null})} className="text-xs text-rose-400 hover:underline">
                      ยกเลิกการเลือก
                    </button>
                  )}
                </div>
                
                <div 
                  onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white flex justify-between items-center cursor-pointer text-sm hover:border-blue-500 transition"
                >
                  <span className="truncate">
                    {selectedCustomer ? (
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-blue-400 font-bold">#{selectedCustomer.customer_id}</span>
                        <span className="font-semibold text-white">{selectedCustomer.customer_name}</span>
                        {selectedCustomer.customer_taxname && <span className="text-amber-300/80 text-xs font-normal">({selectedCustomer.customer_taxname})</span>}
                      </span>
                    ) : '-- ค้นหาและเลือกลูกค้า --'}
                  </span>
                  <ChevronDown size={16} className="text-slate-400 shrink-0 ml-2" />
                </div>

                {isCustomerDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                    <div className="p-2.5 bg-slate-950 border-b border-slate-800">
                      <input 
                        type="text" 
                        autoFocus 
                        placeholder="🔍 ค้นหารหัส, ชื่อร้าน, บริษัท, ชื่อผู้ติดต่อ, เบอร์โทร..." 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500 transition" 
                        value={customerSearchQuery} 
                        onChange={(e) => setCustomerSearchQuery(e.target.value)} 
                      />
                    </div>
                    <ul className="max-h-60 overflow-y-auto divide-y divide-slate-800/60 p-1">
                      {filteredCustomers.length === 0 ? (
                        <li className="p-4 text-center text-slate-500 text-sm">ไม่พบข้อมูลลูกค้า</li>
                      ) : (
                        filteredCustomers.map(c => (
                          <li 
                            key={c.customer_id} 
                            onClick={() => { 
                              setMachineFormData({...machineFormData, customerId: c.customer_id}); 
                              setIsCustomerDropdownOpen(false); 
                              setCustomerSearchQuery('');
                            }} 
                            className="p-3 text-sm rounded-lg cursor-pointer hover:bg-slate-800 transition flex flex-col gap-1 border-b border-slate-800/60"
                          >
                            <div className="flex justify-between items-center gap-2">
                              <div className="font-bold text-white flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 font-mono text-xs rounded border border-blue-500/20 shrink-0">
                                  #{c.customer_id}
                                </span>
                                <span className="text-base">{c.customer_name || 'ไม่ระบุชื่อ'}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pl-8">
                              {c.customer_taxname && (
                                <span className="text-amber-300/90 font-medium flex items-center gap-1">
                                  🏢 บจก/บริษัท: {c.customer_taxname}
                                </span>
                              )}
                              {c.customer_contact_name && (
                                <span className="text-indigo-300 font-medium flex items-center gap-1">
                                  👤 คอนแท็ก: {c.customer_contact_name}
                                </span>
                              )}
                              {c.customer_number && (
                                <span className="text-emerald-400 font-mono flex items-center gap-1">
                                  📞 {c.customer_number}
                                </span>
                              )}
                            </div>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block mb-1.5 text-sm text-slate-400">ต้นทุนซื้อเข้าจริง (฿)</label><input type="number" placeholder="0.00" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none" value={machineFormData.assetPurchaseCost || ''} onChange={(e) => setMachineFormData({...machineFormData, assetPurchaseCost: Number(e.target.value)})} /></div>
                <div><label className="block mb-1.5 text-sm text-slate-400">วันที่รับเข้าคลัง</label><input type="date" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none" value={machineFormData.assetPurchaseDate as string || ''} onChange={(e) => setMachineFormData({...machineFormData, assetPurchaseDate: e.target.value})} /></div>
                <div><label className="block mb-1.5 text-sm text-slate-400">วันหมดประกันโรงงาน</label><input type="date" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none" value={machineFormData.assetWarrantyExpireDate as string || ''} onChange={(e) => setMachineFormData({...machineFormData, assetWarrantyExpireDate: e.target.value})} /></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block mb-1.5 text-sm text-slate-400">รหัส Supplier (ที่ซื้อเครื่องนี้มา)</label><input type="number" placeholder="ระบุรหัส Supplier INT" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none" value={machineFormData.supplierId || ''} onChange={(e) => setMachineFormData({...machineFormData, supplierId: e.target.value ? Number(e.target.value) : null})} /></div>
                <div><label className="block mb-1.5 text-sm text-slate-400">วันที่ติดตั้งให้ลูกค้า</label><input type="date" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none" value={machineFormData.assetInstallDate as string || ''} onChange={(e) => setMachineFormData({...machineFormData, assetInstallDate: e.target.value})} /></div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-800 flex justify-end gap-3"><button onClick={() => setIsMachineModalOpen(false)} className="px-5 py-2.5 text-slate-300 hover:bg-slate-800 rounded-xl">ยกเลิก</button><button onClick={handleSaveMachine} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition">บันทึกข้อมูลเครื่อง</button></div>
          </div>
        </div>
      )}

      {isMachineLogModalOpen && selectedMachineForLog && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
              <h2 className="text-lg font-bold text-blue-400 flex items-center gap-2">
                <History size={20} /> ประวัติการย้ายและสถานะเครื่อง SN: {selectedMachineForLog.assetSerialNumber}
              </h2>
              <button onClick={() => setIsMachineLogModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-slate-300">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-slate-500">รุ่นสินค้า:</span> <span className="text-white font-medium">{selectedMachineForLog.product?.productName || '-'}</span></div>
                <div><span className="text-slate-500">สถานะปัจจุบัน:</span> <span className="text-emerald-400 font-bold">{selectedMachineForLog.assetStatus}</span></div>
                <div><span className="text-slate-500">วันที่รับเข้าคลัง:</span> <span className="text-white">{selectedMachineForLog.assetPurchaseDate ? new Date(selectedMachineForLog.assetPurchaseDate).toLocaleDateString('th-TH') : '-'}</span></div>
                <div><span className="text-slate-500">วันที่ติดตั้งล่าสุด:</span> <span className="text-white">{selectedMachineForLog.assetInstallDate ? new Date(selectedMachineForLog.assetInstallDate).toLocaleDateString('th-TH') : '-'}</span></div>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-2 text-sm">📋 บันทึกไทม์ไลน์การครอบครองและบริการ:</h4>
                <div className="space-y-3">
                  <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-indigo-400">📥 รับเข้าคลัง (Initial Registration)</span>
                      <span className="text-slate-500">{selectedMachineForLog.assetPurchaseDate ? new Date(selectedMachineForLog.assetPurchaseDate).toLocaleDateString('th-TH') : 'วันที่เริ่มต้น'}</span>
                    </div>
                    <p className="text-slate-400">บันทึกรับเครื่องเข้าสู่ระบบ (Supplier ID: {selectedMachineForLog.supplierId || 'ไม่ระบุ'}, ต้นทุน: {selectedMachineForLog.assetPurchaseCost || 0} ฿)</p>
                  </div>

                  {selectedMachineForLog.customerId && (
                    <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-blue-400">👤 ส่งมอบ / ผูกกับลูกค้า (Assigned to Customer)</span>
                        <span className="text-slate-500">{selectedMachineForLog.assetInstallDate ? new Date(selectedMachineForLog.assetInstallDate).toLocaleDateString('th-TH') : 'ปัจจุบัน'}</span>
                      </div>
                      <p className="text-slate-300">รหัสลูกค้าผู้ครอบครอง: <strong>#{selectedMachineForLog.customerId}</strong> ({customers.find(c => c.customer_id === selectedMachineForLog.customerId)?.customer_name || 'ลูกค้า'})</p>
                      <p className="text-slate-400">สถานะเครื่องปัจจุบัน: <strong className="text-amber-400">{selectedMachineForLog.assetStatus}</strong></p>
                    </div>
                  )}

                  {selectedMachineForLog.assetStatus === 'Maintenance' && (
                    <div className="bg-amber-950/20 border border-amber-500/30 p-3.5 rounded-xl text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-amber-400">🔧 ดึงกลับมาซ่อมบำรุง (Maintenance Service)</span>
                        <span className="text-slate-500">สถานะปัจจุบัน</span>
                      </div>
                      <p className="text-amber-200/80">เครื่องอยู่ระหว่างการตรวจสอบและซ่อมบำรุง (แมัยังผูกชื่อลูกค้าเดิมไว้เพื่อติดตามที่มา)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-950/40">
              <button onClick={() => setIsMachineLogModalOpen(false)} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold">ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}

      {isExpiringModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
              <h2 className="text-lg font-bold text-blue-400 flex items-center gap-2"><Clock size={20} /> รายการ Lot สินค้าใกล้หมดอายุ (ภายใน 30 วัน)</h2>
              <button onClick={() => setIsExpiringModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-0 overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="sticky top-0 bg-slate-900 z-10">
                  <tr className="bg-slate-950/90 text-slate-400 text-xs uppercase border-b border-slate-800">
                    <th className="p-4 font-semibold">ชื่อสินค้า</th><th className="p-4 font-semibold text-center">รหัส Lot</th><th className="p-4 font-semibold text-center">คงเหลือใน Lot</th><th className="p-4 font-semibold text-right">วันหมดอายุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {alerts.expiring?.map((l: any) => (
                    <tr key={l.lotId} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-medium text-white">{l.product?.productName}</td>
                      <td className="p-4 text-center font-mono text-slate-400 text-xs">{l.lotNumber}</td>
                      <td className="p-4 text-center font-bold text-amber-400">{l.remainingQty}</td>
                      <td className="p-4 text-right text-rose-400 font-medium">{new Date(l.expireDate).toLocaleDateString('th-TH')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-950/40"><button onClick={() => setIsExpiringModalOpen(false)} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition">ปิดหน้าต่าง</button></div>
          </div>
        </div>
      )}

      {isLowStockModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
              <h2 className={`text-lg font-bold flex items-center gap-2 ${lowStockModalType === 'OUT' ? 'text-rose-400' : 'text-amber-400'}`}>
                {lowStockModalType === 'OUT' ? <AlertOctagon size={20} /> : <AlertTriangle size={20} />} {lowStockModalType === 'OUT' ? 'รายการสินค้าที่หมดสต็อกเกลี้ยง (0 ชิ้น)' : 'รายการสินค้าที่สต็อกต่ำใกล้หมด (1-5 ชิ้น)'}
              </h2>
              <button onClick={() => setIsLowStockModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-0 overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="sticky top-0 bg-slate-900 z-10"><tr className="bg-slate-950/90 text-slate-400 text-xs uppercase border-b border-slate-800"><th className="p-4 font-semibold">รหัสสินค้า</th><th className="p-4 font-semibold">ชื่อสินค้า</th><th className="p-4 font-semibold text-center">สถานะสต็อก</th></tr></thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {(lowStockModalType === 'OUT' ? outOfStockItems : lowStockItems).map((p: any) => (
                    <tr key={p.productId} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-mono text-slate-400 text-xs">{p.productModelCode || `ID-${p.productId}`}</td>
                      <td className="p-4 font-medium text-white">{p.productName}</td>
                      <td className="p-4 text-center"><span className={`px-3 py-1 rounded-md text-xs font-bold border ${p.stockQty === 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>{p.stockQty === 0 ? 'หมดเกลี้ยง (0)' : `เหลือ ${p.stockQty} ${p.unitName || ''}`}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-950/40"><button onClick={() => setIsLowStockModalOpen(false)} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition">ปิดหน้าต่าง</button></div>
          </div>
        </div>
      )}

      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/30 shrink-0">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ClipboardList className="text-blue-400" size={20} /> ประวัติการรับเข้า - เบิกออกสต็อก
              </h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
                  <button 
                    onClick={() => setHistoryTypeFilter('ALL')} 
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${historyTypeFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    ทั้งหมด
                  </button>
                  <button 
                    onClick={() => setHistoryTypeFilter('IN')} 
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${historyTypeFilter === 'IN' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    รับเข้า (IN)
                  </button>
                  <button 
                    onClick={() => setHistoryTypeFilter('OUT')} 
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${historyTypeFilter === 'OUT' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    เบิกออก (OUT)
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">ดูช่วงเวลา</span>
                    <select 
                      className="bg-slate-950 text-white font-semibold rounded-lg px-2 py-1 outline-none border border-slate-700 cursor-pointer text-xs"
                      value={historyFilterMode}
                      onChange={(e) => setHistoryFilterMode(e.target.value as any)}
                    >
                      <option value="ALL">ทั้งหมด (All Time)</option>
                      <option value="DAY">รายวัน (Daily)</option>
                      <option value="MONTH">รายเดือน (Monthly)</option>
                      <option value="YEAR">รายปี (Yearly)</option>
                      <option value="CUSTOM">กำหนดเอง (Custom Range)</option>
                    </select>
                  </div>

                  {historyFilterMode === 'DAY' && (
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400">เลือกวันที่</span>
                      <input 
                        type="date" 
                        className="bg-slate-950 text-white font-semibold rounded-lg px-2 py-1 outline-none border border-slate-700 font-sans cursor-pointer text-xs"
                        value={historySelectedDate}
                        onChange={(e) => setHistorySelectedDate(e.target.value)}
                      />
                    </div>
                  )}

                  {historyFilterMode === 'MONTH' && (
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400">เลือกเดือน</span>
                      <select 
                        className="bg-slate-950 text-white font-semibold rounded-lg px-2 py-1 outline-none border border-slate-700 cursor-pointer text-xs"
                        value={historySelectedMonth}
                        onChange={(e) => setHistorySelectedMonth(e.target.value)}
                      >
                        <option value="1">มกราคม</option>
                        <option value="2">กุมภาพันธ์</option>
                        <option value="3">มีนาคม</option>
                        <option value="4">เมษายน</option>
                        <option value="5">พฤษภาคม</option>
                        <option value="6">มิถุนายน</option>
                        <option value="7">กรกฎาคม</option>
                        <option value="8">สิงหาคม</option>
                        <option value="9">กันยายน</option>
                        <option value="10">ตุลาคม</option>
                        <option value="11">พฤศจิกายน</option>
                        <option value="12">ธันวาคม</option>
                      </select>
                    </div>
                  )}

                  {historyFilterMode === 'YEAR' && (
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400">เลือกปี (พ.ศ.)</span>
                      <select 
                        className="bg-slate-950 text-white font-semibold rounded-lg px-2 py-1 outline-none border border-slate-700 cursor-pointer text-xs"
                        value={historySelectedYear}
                        onChange={(e) => setHistorySelectedYear(e.target.value)}
                      >
                        <option value="2026">2569 (2026)</option>
                        <option value="2025">2568 (2025)</option>
                        <option value="2024">2567 (2024)</option>
                        <option value="2023">2566 (2023)</option>
                      </select>
                    </div>
                  )}

                  {historyFilterMode === 'CUSTOM' && (
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400">จากวันที่</span>
                        <input 
                          type="date" 
                          className="bg-slate-950 text-white font-semibold rounded-lg px-2 py-1 outline-none border border-slate-700 font-sans cursor-pointer text-xs"
                          value={historyStartDate}
                          onChange={(e) => setHistoryStartDate(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400">ถึงวันที่</span>
                        <input 
                          type="date" 
                          className="bg-slate-950 text-white font-semibold rounded-lg px-2 py-1 outline-none border border-slate-700 font-sans cursor-pointer text-xs"
                          value={historyEndDate}
                          onChange={(e) => setHistoryEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative w-full lg:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="ค้นชื่อสินค้า, โมเดล, PO..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-white outline-none focus:border-blue-500 transition text-xs"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                />
                {historySearchQuery && (
                  <button onClick={() => setHistorySearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-900 z-10">
                  <tr className="bg-slate-950/90 text-slate-400 text-xs uppercase border-b border-slate-800">
                    <th 
                      className="p-4 font-semibold cursor-pointer hover:text-white transition select-none w-48"
                      onClick={() => setHistorySortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>วันเวลา</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold text-[11px] shrink-0 border border-slate-700">
                          {historySortDirection === 'desc' ? '🔽 ล่าสุด' : '🔼 เก่าสุด'}
                        </span>
                      </div>
                    </th>
                    <th className="p-4 font-semibold text-center">ประเภท</th>
                    <th className="p-4 font-semibold">สินค้า</th>
                    <th className="p-4 font-semibold text-center">จำนวน</th>
                    <th className="p-4 font-semibold">อ้างอิง / PO</th>
                    <th className="p-4 font-semibold text-center">ดูไส้ใน LOT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-sm">
                  {loadingHistory ? (
                    <tr><td colSpan={6} className="p-16 text-center text-slate-400">กำลังโหลด...</td></tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr><td colSpan={6} className="p-16 text-center text-slate-400">ไม่พบข้อมูลประวัติที่ค้นหาในช่วงเวลานี้</td></tr>
                  ) : (
                    filteredHistory.map((tx: any) => (
                      <tr key={tx.transactionId} className="hover:bg-slate-800/40 transition">
                        <td className="p-4 text-slate-300 font-mono text-xs">{new Date(tx.transactionDate).toLocaleString('th-TH')}</td>
                        <td className="p-4 text-center">{tx.transactionType === 'IN' ? <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">รับเข้า</span> : <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">เบิกออก</span>}</td>
                        <td className="p-4 text-white font-medium">{tx.product?.productName || '-'}</td>
                        <td className="p-4 text-center font-bold">{tx.transactionType === 'IN' ? '+' : '-'}{tx.quantity}</td>
                        <td className="p-4 text-slate-400 font-mono text-xs">{tx.referenceNo || '-'}</td>
                        <td className="p-4 text-center"><button onClick={() => setSelectedHistoryItem(tx)} className="px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-xs font-semibold transition">🔍 ดูรายละเอียด Lot</button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-950/40 shrink-0">
              <span className="text-xs text-slate-400">แสดงผล <strong className="text-blue-400 font-mono">{filteredHistory.length}</strong> จากทั้งหมด {transactionsHistory.length} รายการ</span>
              <button onClick={() => setIsHistoryModalOpen(false)} className="px-5 py-2 bg-slate-800 rounded-xl text-slate-300 text-xs font-semibold hover:bg-slate-700">ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}

      {selectedHistoryItem && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <h3 className="text-base font-bold text-white flex items-center gap-2">📦 รายละเอียดการตัด Lot บิลรหัส #{selectedHistoryItem.transactionId}</h3>
              <button onClick={() => setSelectedHistoryItem(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-sm text-slate-300">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-slate-500">ประเภท:</span> <span className={selectedHistoryItem.transactionType === 'IN' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{selectedHistoryItem.transactionType === 'IN' ? 'รับเข้า (IN)' : 'เบิกออก (OUT)'}</span></div>
                <div><span className="text-slate-500">สินค้า:</span> <span className="text-white font-medium">{selectedHistoryItem.product?.productName}</span></div>
                <div><span className="text-slate-500">จำนวนรวม:</span> <span className="text-white font-bold">{selectedHistoryItem.quantity} ชิ้น</span></div>
                <div><span className="text-slate-500">เลขที่อ้างอิง:</span> <span className="text-amber-400 font-mono">{selectedHistoryItem.referenceNo || '-'}</span></div>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">💡 ไส้ในการดึงสต็อกแยกตามล็อต (Lot Breakdown):</h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead><tr className="bg-slate-950 text-slate-400 border-b border-slate-800"><th className="p-3">เลขล็อต / PO</th><th className="p-3 text-center">จำนวนที่ใช้</th><th className="p-3 text-right">ต้นทุนต่อหน่วย</th><th className="p-3 text-right">รวมเป็นเงิน</th></tr></thead>
                    <tbody className="divide-y divide-slate-800">
                      {selectedHistoryItem.lotDetails?.length > 0 ? (
                        selectedHistoryItem.lotDetails.map((detail: any, idx: number) => {
                          const totalCost = detail.quantityUsed * detail.costApplied;
                          return (
                            <tr key={idx} className="hover:bg-slate-800/30">
                              <td className="p-3 font-mono text-indigo-400 font-bold">{detail.lot?.lotNumber || 'N/A'}</td>
                              <td className="p-3 text-center font-bold text-white">{detail.quantityUsed} ชิ้น</td>
                              <td className="p-3 text-right font-mono text-slate-300">{Number(detail.costApplied).toLocaleString()} ฿</td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-400">{totalCost.toLocaleString()} ฿</td>
                            </tr>
                          );
                        })
                      ) : (<tr><td colSpan={4} className="p-6 text-center text-slate-500">บิลนี้เป็นข้อมูลเก่า ไม่มีประวัติการผูก Lot ครับ</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-950/40"><button onClick={() => setSelectedHistoryItem(null)} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold">ปิดหน้าต่าง</button></div>
          </div>
        </div>
      )}

      {isBulkTxModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setOpenTxDropdownIndex(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><ArrowRightLeft className="text-emerald-500" size={20} /> จัดการสต็อกสินค้า {bulkTxType === 'IN' ? '(สร้าง Lot)' : '(ตัด FIFO)'}</h2>
              <button onClick={() => setIsBulkTxModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block mb-1.5 text-sm text-slate-400">ประเภทรายการ *</label><select className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none" value={bulkTxType} onChange={(e) => setBulkTxType(e.target.value)}><option value="IN">รับของเข้าสต็อก (รัน Lot ใหม่)</option><option value="OUT">เบิกของออกไปใช้ (ตัด Lot เก่าสุดก่อน)</option></select></div>
                  <div><label className="block mb-1.5 text-sm text-slate-400">{bulkTxType === 'IN' ? 'เลขที่บิลรับเข้า (จะถูกใช้เป็น Lot No.)' : 'เลขที่อ้างอิงใบเบิก'}</label><input type="text" placeholder={bulkTxType === 'IN' ? 'เช่น PO-2026-001' : 'เช่น ใบเบิก-001'} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none" value={bulkTxRef} onChange={(e) => setBulkTxRef(e.target.value)} /></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1.5 text-sm text-emerald-400 font-medium">วันที่ทำรายการ *</label>
                    <input 
                      type="date" 
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500 font-sans" 
                      value={bulkTxDate} 
                      onChange={(e) => setBulkTxDate(e.target.value)} 
                    />
                  </div>
                  <div><label className="block mb-1.5 text-sm text-slate-400">รหัสพนักงาน (ตัวเลข)</label><input type="number" placeholder="เช่น 101" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none" value={bulkTxEmployee} onChange={(e) => setBulkTxEmployee(e.target.value)} /></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bulkTxType === 'IN' && (<div><label className="block mb-1.5 text-sm text-slate-400">รหัสซัพพลายเออร์ (ตัวเลข)</label><input type="number" placeholder="เช่น 505" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none" value={bulkTxSupplier} onChange={(e) => setBulkTxSupplier(e.target.value)} /></div>)}
                  <div className={bulkTxType === 'IN' ? '' : 'md:col-span-2'}><label className="block mb-1.5 text-sm text-slate-400">หมายเหตุ</label><input type="text" placeholder="ระบุเหตุผล" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none" value={bulkTxRemark} onChange={(e) => setBulkTxRemark(e.target.value)} /></div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">รายการสินค้า</h3>
                <div className="space-y-4">
                  {bulkTxItems.map((item, index) => {
                    const selectedProduct = sortedProducts.find(p => p.productId === item.productId);
                    return (
                      <div key={index} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col gap-3">
                        <div className="flex gap-3 items-center">
                          <div className="relative flex-1">
                            <div onClick={() => { setOpenTxDropdownIndex(openTxDropdownIndex === index ? null : index); setTxProductSearch(''); }} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white flex justify-between items-center cursor-pointer text-sm">
                              <span className="truncate pr-2">
                                {selectedProduct ? (
                                  <span className="flex items-center gap-2">
                                    <span className="text-amber-400 font-mono font-bold">[{selectedProduct.productModelCode || 'N/A'}]</span>
                                    <span className="text-white font-medium">{selectedProduct.productName}</span>
                                    <span className="text-emerald-400 text-xs font-medium">(เหลือ {selectedProduct.stockQty ?? 0})</span>
                                  </span>
                                ) : '-- เลือกสินค้า --'}
                              </span>
                              <ChevronDown size={16} className="shrink-0" />
                            </div>
                            {openTxDropdownIndex === index && (
                              <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                                <div className="p-2 bg-slate-950 border-b border-slate-800"><input type="text" autoFocus placeholder="🔍 ค้นหาชื่อสินค้า หรือรหัสโมเดล..." className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none" value={txProductSearch} onChange={(e) => setTxProductSearch(e.target.value)} /></div>
                                <ul className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-800/50">
                                  {filteredTxProducts.map(p => {
                                    const cat = safeCategories.find(c => c.id === p.categoryId);
                                    return (
                                      <li key={p.productId} onClick={() => { const newItems = [...bulkTxItems]; newItems[index].productId = p.productId; if(bulkTxType === 'IN') newItems[index].unitCost = p.unitCost || ''; setBulkTxItems(newItems); setOpenTxDropdownIndex(null); }} className="p-3 text-sm rounded-lg cursor-pointer hover:bg-slate-800 text-slate-300 transition flex flex-col gap-0.5">
                                        <div className="flex items-center justify-between">
                                          <span className="font-mono font-bold text-amber-400 text-base">
                                            {p.productModelCode || 'ไม่มีรหัสรุ่น'}
                                          </span>
                                          <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-md border border-slate-700">
                                            {cat?.categoryName || 'ทั่วไป'}
                                          </span>
                                        </div>
                                        <div className="text-xs text-slate-400">{p.productName}</div>
                                        <div className="text-emerald-400 text-xs font-medium mt-1">คงเหลือ: {p.stockQty ?? 0} {p.unitName || 'เครื่อง'}</div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 relative"><span className="absolute -top-2 left-2 px-1 bg-slate-900 text-[10px] text-slate-400">จำนวน</span><input type="number" min="1" className="w-20 bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none text-sm font-bold text-center" value={item.quantity || ''} onChange={(e) => { const newItems = [...bulkTxItems]; newItems[index].quantity = Number(e.target.value); setBulkTxItems(newItems); }} /></div>
                          {bulkTxItems.length > 1 && (<button onClick={() => setBulkTxItems(bulkTxItems.filter((_, i) => i !== index))} className="p-2.5 bg-rose-500/10 text-rose-500 rounded-lg shrink-0"><Trash2 size={18} /></button>)}
                        </div>
                        {bulkTxType === 'IN' && selectedProduct && (
                          <div className="flex gap-4 pt-2 mt-1 border-t border-slate-800/50">
                            <div className="flex-1"><label className="block text-xs text-slate-500 mb-1">ต้นทุน/หน่วย (฿)</label><input type="number" min="0" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none text-sm" value={item.unitCost} onChange={(e) => { const newItems = [...bulkTxItems]; newItems[index].unitCost = Number(e.target.value); setBulkTxItems(newItems); }} /></div>
                            <div className="flex-1"><label className="block text-xs text-slate-500 mb-1">วันหมดอายุ</label><input type="date" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none text-sm" value={item.expireDate} onChange={(e) => { const newItems = [...bulkTxItems]; newItems[index].expireDate = e.target.value; setBulkTxItems(newItems); }} /></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => setBulkTxItems([...bulkTxItems, { productId: '', quantity: 1, unitCost: '', expireDate: '' }])} className="mt-4 px-4 py-2.5 bg-slate-800 text-amber-400 rounded-xl text-sm font-bold flex items-center gap-2"><Plus size={16} /> เพิ่มรายการ</button>
              </div>
            </div>
            <div className="p-5 border-t border-slate-800 flex justify-end gap-3"><button onClick={() => setIsBulkTxModalOpen(false)} className="px-5 py-2.5 text-slate-300 hover:bg-slate-800 rounded-xl">ยกเลิก</button><button onClick={handleSaveBulkTransaction} disabled={isSubmittingTx} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-2">{isSubmittingTx ? 'กำลังบันทึก...' : <><Database size={18} /> ยืนยันรายการ</>}</button></div>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><FolderPlus className="text-amber-500" size={20} /> จัดการหมวดหมู่</h2>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <label className="block text-xs text-slate-400 font-medium">เพิ่มหมวดหมู่ใหม่</label>
                <input type="text" placeholder="ชื่อหมวดหมู่..." className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-sm outline-none focus:border-amber-500" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                  <input type="checkbox" className="w-4 h-4 accent-amber-500 rounded" checked={newCategoryRequiresSn} onChange={(e) => setNewCategoryRequiresSn(e.target.checked)} />
                  <span className="text-xs text-slate-300">หมวดหมู่นี้ควบคุมด้วย Serial Number (เครื่องจักร/อุปกรณ์มี S/N)</span>
                </label>
                <button onClick={handleAddCategory} disabled={isSubmittingCat} className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-amber-600/20 mt-2">+ เพิ่มหมวดหมู่</button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl max-h-52 overflow-y-auto">
                <ul className="divide-y divide-slate-800/60">
                  {safeCategories.map((cat) => (
                    <li key={cat.id} className="flex justify-between items-center p-3 hover:bg-slate-800/50">
                      <div>
                        <div className="text-slate-200 text-sm font-medium">{cat.categoryName}</div>
                        <div className="text-[10px] text-slate-500">{cat.requiresSerialNumber !== false ? '💻 คุมด้วย S/N' : '🔧 อะไหล่/ซิงค์/สกรู (ไม่มี S/N)'}</div>
                      </div>
                      <button onClick={() => handleDeleteCategory(cat.id, cat.categoryName)} className="text-slate-500 hover:text-rose-500 p-1 rounded"><Trash2 size={16} /></button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsCategoryDropdownOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/30"><h2 className="text-lg font-bold text-white flex items-center gap-2"><Plus className="text-amber-500" size={20} /> เพิ่มสินค้าใหม่</h2><button onClick={() => setIsAddModalOpen(false)} className="text-slate-400"><X size={20} /></button></div>
            <div className="p-6 space-y-5 text-slate-300 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block mb-1.5 text-sm">ชื่อสินค้า *</label><input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500" onChange={(e) => setFormData({...formData, productName: e.target.value})} /></div>
                <div><label className="block mb-1.5 text-sm">รุ่น / โมเดล</label><input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500" onChange={(e) => setFormData({...formData, productModelCode: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative"><label className="block mb-1.5 text-sm">หมวดหมู่</label><div onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white flex justify-between items-center cursor-pointer"><span>{selectedCategoryName}</span><ChevronDown size={18} /></div>
                  {isCategoryDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                      <div className="p-2 bg-slate-950 border-b border-slate-800"><input type="text" autoFocus placeholder="🔍 ค้นหา..." className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none" onChange={(e) => setCategorySearch(e.target.value)} /></div>
                      <ul className="max-h-48 overflow-y-auto p-1">{filteredCategories.map((cat) => (<li key={cat.id} onClick={() => { setFormData({...formData, categoryId: cat.id}); setIsCategoryDropdownOpen(false); }} className="p-2.5 text-sm rounded-lg cursor-pointer hover:bg-slate-800 text-slate-300">{cat.categoryName}</li>))}</ul>
                    </div>
                  )}
                </div>
                <div><label className="block mb-1.5 text-sm">สถานะ</label><select className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500" onChange={(e) => setFormData({...formData, isPreorder: e.target.value === 'true'})}><option value="false">พร้อมส่ง</option><option value="true">พรีออเดอร์</option></select></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block mb-1.5 text-sm">ราคาทุน</label><input type="number" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500" onChange={(e) => setFormData({...formData, unitCost: Number(e.target.value)})} /></div>
                <div><label className="block mb-1.5 text-sm">ราคาขาย</label><input type="number" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500" onChange={(e) => setFormData({...formData, salePrice: Number(e.target.value)})} /></div>
                <div><label className="block mb-1.5 text-sm">ราคาเช่า</label><input type="number" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500" onChange={(e) => setFormData({...formData, rentPrice: Number(e.target.value)})} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div><label className="block mb-1.5 text-sm">หน่วยเรียก (Unit)</label><input type="text" placeholder="เช่น เครื่อง, ชิ้น, กล่อง" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500" onChange={(e) => setFormData({...formData, unitName: e.target.value})} /></div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-800 flex justify-end gap-3"><button onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 text-slate-300 hover:bg-slate-800 rounded-xl transition">ยกเลิก</button><button onClick={handleSaveProduct} className="px-5 py-2.5 bg-amber-600 text-white rounded-xl shadow-lg shadow-amber-600/20 transition hover:bg-amber-500">บันทึก</button></div>
          </div>
        </div>
      )}

      {isEditModalOpen && editFormData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Edit3 className="text-amber-500" size={20} /> แก้ไขข้อมูลสินค้า</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-slate-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block mb-1.5 text-sm">ชื่อสินค้า</label><input type="text" value={editFormData.productName || ''} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500" onChange={(e) => setEditFormData({...editFormData, productName: e.target.value})} /></div>
                <div><label className="block mb-1.5 text-sm">รุ่น / โมเดล</label><input type="text" value={editFormData.productModelCode || ''} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500" onChange={(e) => setEditFormData({...editFormData, productModelCode: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-sm">หมวดหมู่</label>
                  <select className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500" value={editFormData.categoryId} onChange={(e) => setEditFormData({...editFormData, categoryId: Number(e.target.value)})}>
                    {safeCategories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.categoryName}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 text-sm">สถานะ</label>
                  <select className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500" value={(editFormData.isPreorder ?? false).toString()} onChange={(e) => setEditFormData({...editFormData, isPreorder: e.target.value === 'true'})}>
                    <option value="false">พร้อมส่ง</option>
                    <option value="true">พรีออเดอร์</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block mb-1.5 text-sm">ราคาทุน</label><input type="number" value={editFormData.unitCost ?? ''} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500" onChange={(e) => setEditFormData({...editFormData, unitCost: Number(e.target.value)})} /></div>
                <div><label className="block mb-1.5 text-sm">ราคาขาย</label><input type="number" value={editFormData.salePrice ?? ''} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500" onChange={(e) => setEditFormData({...editFormData, salePrice: Number(e.target.value)})} /></div>
                <div><label className="block mb-1.5 text-sm">ราคาเช่า</label><input type="number" value={editFormData.rentPrice ?? ''} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500" onChange={(e) => setEditFormData({...editFormData, rentPrice: Number(e.target.value)})} /></div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-xs text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                💡 สินค้าในหมวดหมู่ที่ใช้ S/N จะซิงค์สต็อกตามเครื่องในคลังอัตโนมัติ ส่วนหมวดหมู่อะไหล่/สกรูจะอิงตาม Lot FIFO
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block mb-1.5 text-sm">หน่วยเรียก (Unit)</label><input type="text" value={editFormData.unitName || ''} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500" onChange={(e) => setEditFormData({...editFormData, unitName: e.target.value})} /></div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-800 flex justify-end gap-3"><button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-slate-300 hover:bg-slate-800 rounded-xl transition">ยกเลิก</button><button onClick={handleUpdateProduct} className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition shadow-lg shadow-amber-600/20">บันทึกการแก้ไข</button></div>
          </div>
        </div>
      )}

    </main> 
  );
}