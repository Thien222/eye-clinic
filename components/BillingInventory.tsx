import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { useClinicDbUpdated } from '../hooks/useClinicDbUpdated';
import { parseLensSpecs, rxMatches, isSameLocalDay, groupLensesByPrice, findSamePriceLensPairs } from '../services/utils';
import { Patient, InventoryItem } from '../types';

type CartEntry = { cartKey: string; item: InventoryItem; qty: number; eye?: 'OD' | 'OS' };
import { Search, Printer, Plus, Edit, X, Save, FilePlus, Glasses, Eye, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { InvoicePrint } from './InvoicePrint';

// UUID generator that works on HTTP
const generateId = () => 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);

// Helper: Hien thi SPH = 0 thanh "Plano"
const formatSPH = (sph: any): string => {
   if (sph === 0 || sph === '0' || sph === 0.00 || sph === '0.00') return 'Plano';
   if (typeof sph === 'string' && sph.toLowerCase() === 'plano') return 'Plano';
   if (sph === undefined || sph === null || sph === '') return '-';
   return String(sph);
};

interface BillingInventoryProps {
   activeTab?: 'billing' | 'inventory' | 'invoices';
}

export const BillingInventory: React.FC<BillingInventoryProps> = ({ activeTab: initialTab }) => {
   const { isAdmin, showLoginModal } = useAuth();

   // Initialize state from localStorage or default to 'billing'
   const [activeTab, setActiveTab] = useState<'billing' | 'inventory' | 'invoices'>(() => {
      if (initialTab) return initialTab;
      const saved = localStorage.getItem('billing_active_tab');
      return (saved as 'billing' | 'inventory' | 'invoices') || 'billing';
   });

   // Billing State
   const [waitingPatients, setWaitingPatients] = useState<Patient[]>([]);
   const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
   const [cart, setCart] = useState<CartEntry[]>([]);
   const [extraCharges, setExtraCharges] = useState({ discount: 0, surcharge: 0 });
   const [frameSearchCode, setFrameSearchCode] = useState('');
   const [foundFrame, setFoundFrame] = useState<InventoryItem | null>(null);

   // Bán lẻ không qua khám (khách lẻ)
   const [billingMode, setBillingMode] = useState<'exam' | 'walkin'>('exam');
   const [walkInName, setWalkInName] = useState('');
   const [walkInPhone, setWalkInPhone] = useState('');
   const [walkInRx, setWalkInRx] = useState({
      od: { sph: '', cyl: '', add: '' },
      os: { sph: '', cyl: '', add: '' }
   });

   // Lens suggestions
   const [suggestedLensesOD, setSuggestedLensesOD] = useState<InventoryItem[]>([]);
   const [suggestedLensesOS, setSuggestedLensesOS] = useState<InventoryItem[]>([]);
   const [suggestedPairedLenses, setSuggestedPairedLenses] = useState<InventoryItem[]>([]);
   const [samePricePairs, setSamePricePairs] = useState<{ price: number; od: InventoryItem[]; os: InventoryItem[] }[]>([]);

   // Inventory State
   const [inventory, setInventory] = useState<InventoryItem[]>([]);
   const [searchInv, setSearchInv] = useState('');
   const [inventoryCategoryTab, setInventoryCategoryTab] = useState<'lens' | 'frame' | 'medicine'>('lens');

   // Invoice History State
   const [invoices, setInvoices] = useState<any[]>([]);
   const [invoiceSearch, setInvoiceSearch] = useState('');
   const [invoiceMonth, setInvoiceMonth] = useState<string>(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
   });
   const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);
   const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
   const [printingInvoice, setPrintingInvoice] = useState<any | null>(null);

   // New Item State
   const [showAddItem, setShowAddItem] = useState(false);
   const [newItem, setNewItem] = useState<Partial<InventoryItem> & { specs: any }>({
      category: 'lens',
      name: '',
      code: '',
      costPrice: 0,
      price: 0,
      quantity: 0,
      minStock: 5,
      specs: { sph: '', cyl: '', add: '', material: '', type: 'single', note: '' }
   });
   const [nameSuggestions, setNameSuggestions] = useState<InventoryItem[]>([]);
   const [showNameSuggestions, setShowNameSuggestions] = useState(false);
   const [settings, setSettings] = useState(db.getSettings());

   // Auto-fill khi nhập tên sản phẩm
   const handleNameChange = (name: string) => {
      setNewItem({ ...newItem, name });

      if (name.length >= 2) {
         // Tìm sản phẩm có tên chứa chuỗi nhập vào (cùng category)
         const matches = inventory.filter(item =>
            item.category === newItem.category &&
            item.name.toLowerCase().includes(name.toLowerCase())
         ).slice(0, 5); // Gi?i h?n 5 g?i ?
         setNameSuggestions(matches);
         setShowNameSuggestions(matches.length > 0);
      } else {
         setNameSuggestions([]);
         setShowNameSuggestions(false);
      }
   };

   // Chọn gợi ý để auto-fill tất cả thông số
   const selectSuggestion = (item: InventoryItem) => {
      setNewItem({
         ...newItem,
         code: item.code,
         name: item.name,
         costPrice: item.costPrice,
         price: item.price,
         minStock: item.minStock,
         specs: item.specs || { sph: '', cyl: '', add: '', material: '', type: 'single' }
         // Không set quantity - để user nhập số lượng muốn thêm
      });
      setShowNameSuggestions(false);
   };

   // Persist activeTab whenever it changes
   useEffect(() => {
      localStorage.setItem('billing_active_tab', activeTab);
   }, [activeTab]);

   useClinicDbUpdated(() => {
      refreshData();
      setSettings(db.getSettings());
   });

   const refreshData = () => {
      setWaitingPatients(db.getPatients().filter(p => p.status === 'waiting_billing' && isSameLocalDay(p.timestamp)));
      setInventory(db.getInventory());
      setInvoices(db.getInvoices());
   };

   // Khi chá»n bá»‡nh nhĂ¢n, tá»± Ä‘á»™ng gá»£i Ă½ trĂ²ng kĂ­nh
   // Gợi ý tròng kính theo độ — dùng chung cho khách đã khám và khách lẻ
   const applyLensSuggestions = (
      odSph: number, odCyl: number, odAdd: number,
      osSph: number, osCyl: number, osAdd: number
   ) => {
      const inv = db.getInventory().filter(i => i.category === 'lens' && i.quantity > 0);
      const matchForEye = (sph: number, cyl: number, add: number) =>
         inv.filter(item => {
            const { itemSph, itemCyl, itemAdd } = parseLensSpecs(item.specs);
            return rxMatches(itemSph, itemCyl, itemAdd, sph, cyl, add);
         });

      const matchesOD = matchForEye(odSph, odCyl, odAdd);
      const matchesOS = matchForEye(osSph, osCyl, osAdd);
      const paired = matchesOD.filter(odLens =>
         matchesOS.some(osLens => odLens.code === osLens.code && odLens.price === osLens.price)
      );

      setSuggestedLensesOD(matchesOD);
      setSuggestedLensesOS(matchesOS);
      setSuggestedPairedLenses(paired);
      setSamePricePairs(findSamePriceLensPairs(matchesOD, matchesOS));
   };

   const clearLensSuggestions = () => {
      setSuggestedLensesOD([]);
      setSuggestedLensesOS([]);
      setSuggestedPairedLenses([]);
      setSamePricePairs([]);
   };

   // Khi chọn bệnh nhân, tự động gợi ý tròng kính
   const handleSelectPatient = (p: Patient) => {
      setSelectedPatient(p);
      setExtraCharges({ discount: 0, surcharge: 0 });
      setCart([]);
      setFoundFrame(null);
      setFrameSearchCode('');

      if (p.refraction) {
         applyLensSuggestions(
            parseFloat(p.refraction.finalRx.od.sph) || 0,
            parseFloat(p.refraction.finalRx.od.cyl) || 0,
            parseFloat(p.refraction.finalRx.od.add || '0') || 0,
            parseFloat(p.refraction.finalRx.os.sph) || 0,
            parseFloat(p.refraction.finalRx.os.cyl) || 0,
            parseFloat(p.refraction.finalRx.os.add || '0') || 0
         );
      } else {
         clearLensSuggestions();
      }
   };

   // Chuyển chế độ tạo hóa đơn (khách đã khám / khách lẻ)
   const switchBillingMode = (mode: 'exam' | 'walkin') => {
      if (mode === billingMode) return;
      setBillingMode(mode);
      setSelectedPatient(null);
      setCart([]);
      setExtraCharges({ discount: 0, surcharge: 0 });
      setFoundFrame(null);
      setFrameSearchCode('');
      clearLensSuggestions();
      if (mode === 'exam') {
         setWalkInName('');
         setWalkInPhone('');
         setWalkInRx({ od: { sph: '', cyl: '', add: '' }, os: { sph: '', cyl: '', add: '' } });
      }
   };

   // Khách lẻ: tìm tròng theo độ nhập tay
   const searchWalkInLenses = () => {
      applyLensSuggestions(
         parseFloat(walkInRx.od.sph) || 0,
         parseFloat(walkInRx.od.cyl) || 0,
         parseFloat(walkInRx.od.add) || 0,
         parseFloat(walkInRx.os.sph) || 0,
         parseFloat(walkInRx.os.cyl) || 0,
         parseFloat(walkInRx.os.add) || 0
      );
   };

   // TĂ¬m gá»ng kĂ­nh theo mĂ£
   const handleFrameSearch = () => {
      const frame = inventory.find(i =>
         i.category === 'frame' &&
         i.code.toLowerCase() === frameSearchCode.toLowerCase()
      );
      if (frame) {
         setFoundFrame(frame);
      } else {
         alert('Không tìm thấy gọng kính với mã này!');
         setFoundFrame(null);
      }
   };

   const getCartKey = (itemId: string, eye?: 'OD' | 'OS') => (eye ? `${itemId}::${eye}` : itemId);

   const getCartQty = (itemId: string, eye: 'OD' | 'OS') => {
      const key = getCartKey(itemId, eye);
      return cart.find(c => c.cartKey === key)?.qty || 0;
   };

   const addLensToCart = (item: InventoryItem, eye: 'OD' | 'OS' | 'both') => {
      if (eye === 'both') {
         addSingleEyeLens(item, 'OD', 1);
         addSingleEyeLens(item, 'OS', 1);
         return;
      }
      addSingleEyeLens(item, eye, 1);
   };

   const addSingleEyeLens = (item: InventoryItem, eye: 'OD' | 'OS', qty: number) => {
      const key = getCartKey(item.id, eye);
      setCart(prev => {
         const existing = prev.find(c => c.cartKey === key);
         if (existing) {
            return prev.map(c => c.cartKey === key ? { ...c, qty: c.qty + qty } : c);
         }
         return [...prev, { cartKey: key, item, qty, eye }];
      });
   };

   const adjustSingleEyeQty = (item: InventoryItem, eye: 'OD' | 'OS', delta: number) => {
      const key = getCartKey(item.id, eye);
      setCart(prev => {
         const existing = prev.find(c => c.cartKey === key);
         if (!existing && delta > 0) {
            return [...prev, { cartKey: key, item, qty: delta, eye }];
         }
         if (!existing) return prev;
         const newQty = existing.qty + delta;
         if (newQty <= 0) return prev.filter(c => c.cartKey !== key);
         return prev.map(c => c.cartKey === key ? { ...c, qty: newQty } : c);
      });
   };

   const addSamePricePair = (odLens: InventoryItem, osLens: InventoryItem) => {
      addSingleEyeLens(odLens, 'OD', 1);
      addSingleEyeLens(osLens, 'OS', 1);
   };

   const addToCart = (item: InventoryItem) => {
      const key = getCartKey(item.id);
      const existing = cart.find(c => c.cartKey === key);
      if (existing) {
         setCart(cart.map(c => c.cartKey === key ? { ...c, qty: c.qty + 1 } : c));
      } else {
         setCart([...cart, { cartKey: key, item, qty: 1 }]);
      }
   };

   const removeFromCart = (cartKey: string) => {
      setCart(cart.filter(c => c.cartKey !== cartKey));
   };

   const updateCartQuantity = (cartKey: string, newQty: number) => {
      if (newQty <= 0) {
         removeFromCart(cartKey);
      } else {
         setCart(cart.map(c => c.cartKey === cartKey ? { ...c, qty: newQty } : c));
      }
   };

   const handleCheckout = () => {
      if (!selectedPatient) return;
      if (cart.length === 0) {
         alert('Giỏ hàng trống!');
         return;
      }

      const subtotal = cart.reduce((sum, c) => sum + (c.item.price * c.qty), 0);
      const totalCost = cart.reduce((sum, c) => sum + ((c.item.costPrice || 0) * c.qty), 0);
      const total = Math.max(0, subtotal + extraCharges.surcharge - extraCharges.discount);
      const profit = total - totalCost;

      const invoice = {
         id: generateId(),
         patientId: selectedPatient.id,
         patientName: selectedPatient.fullName,
         patientPhone: selectedPatient.phone,
         patientAddress: selectedPatient.address,
         items: cart.map(c => ({
            itemId: c.item.id,
            name: c.eye ? `${c.item.name} (${c.eye})` : c.item.name,
            quantity: c.qty,
            costPrice: c.item.costPrice || 0,
            price: c.item.price,
            isLens: c.item.category === 'lens',
            eye: c.eye
         })),
         subtotal,
         discount: extraCharges.discount,
         surcharge: extraCharges.surcharge,
         total,
         profit,
         date: Date.now()
      };

      db.createInvoice(invoice);
      const completedPatient = { ...selectedPatient, status: 'completed' as const, updatedAt: Date.now() };
      setWaitingPatients(prev => prev.filter(p => p.id !== selectedPatient.id));
      db.updatePatient(completedPatient);

      window.print();

      alert(`Thanh toán thành công: ${total.toLocaleString()} đ`);
      setSelectedPatient(null);
      setCart([]);
      setSuggestedLensesOD([]);
      setSuggestedLensesOS([]);
      setInvoices(db.getInvoices());
      setInventory(db.getInventory());
   };

   // Thanh toán cho khách lẻ (không qua khám)
   const handleCheckoutWalkIn = () => {
      if (cart.length === 0) {
         alert('Giỏ hàng trống!');
         return;
      }

      const subtotalW = cart.reduce((sum, c) => sum + (c.item.price * c.qty), 0);
      const totalCost = cart.reduce((sum, c) => sum + ((c.item.costPrice || 0) * c.qty), 0);
      const total = Math.max(0, subtotalW + extraCharges.surcharge - extraCharges.discount);
      const profit = total - totalCost;

      const invoice = {
         id: generateId(),
         patientId: '',
         patientName: walkInName.trim() || 'Khách lẻ',
         patientPhone: walkInPhone.trim(),
         patientAddress: '',
         items: cart.map(c => ({
            itemId: c.item.id,
            name: c.eye ? `${c.item.name} (${c.eye})` : c.item.name,
            quantity: c.qty,
            costPrice: c.item.costPrice || 0,
            price: c.item.price,
            isLens: c.item.category === 'lens',
            eye: c.eye
         })),
         subtotal: subtotalW,
         discount: extraCharges.discount,
         surcharge: extraCharges.surcharge,
         total,
         profit,
         date: Date.now()
      };

      db.createInvoice(invoice);

      window.print();

      alert(`Thanh toán thành công: ${total.toLocaleString()} đ`);
      setCart([]);
      setExtraCharges({ discount: 0, surcharge: 0 });
      setWalkInName('');
      setWalkInPhone('');
      setWalkInRx({ od: { sph: '', cyl: '', add: '' }, os: { sph: '', cyl: '', add: '' } });
      setFoundFrame(null);
      setFrameSearchCode('');
      clearLensSuggestions();
      setInvoices(db.getInvoices());
      setInventory(db.getInventory());
   };

   // Inventory CRUD
   const handleEditItem = (item: InventoryItem) => {
      setNewItem({
         ...item,
         specs: item.specs || { sph: 0, cyl: 0, add: 0, material: '', type: 'single' }
      });
      setShowAddItem(true);
   };

   const handleDeleteInventoryItem = (id: string) => {
      if (confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
         db.deleteInventoryItem(id);
         refreshData();
         alert('Đã xóa sản phẩm!');
      }
   };

   const handleSaveItem = () => {
      if (!newItem.name || !newItem.code) {
         alert('Vui lòng nhập tên và mã sản phẩm');
         return;
      }

      if (newItem.id) {
         // Update existing item
         db.updateInventory(newItem.id, newItem);
         alert('Đã cập nhật sản phẩm!');
      } else {
         // Check for duplicate item with same code, name and specs
         const existingItems = db.getInventory();
         let duplicate = null;

         if (newItem.category === 'lens') {
            // Tròng kính: kiểm tra mã + tên + SPH + CYL + ADD + chiết suất
            duplicate = existingItems.find(item =>
               item.category === 'lens' &&
               item.code === newItem.code &&
               item.name === newItem.name &&
               String(item.specs?.sph || '') === String(newItem.specs?.sph || '') &&
               String(item.specs?.cyl || '') === String(newItem.specs?.cyl || '') &&
               String(item.specs?.add || '') === String(newItem.specs?.add || '') &&
               (item.specs?.material || '') === (newItem.specs?.material || '')
            );
         } else if (newItem.category === 'frame') {
            // Gọng kính: kiểm tra mã + tên + chất liệu
            duplicate = existingItems.find(item =>
               item.category === 'frame' &&
               item.code === newItem.code &&
               item.name === newItem.name &&
               (item.specs?.material || '') === (newItem.specs?.material || '')
            );
         } else if (newItem.category === 'medicine') {
            // Thuốc: kiểm tra mã + tên
            duplicate = existingItems.find(item =>
               item.category === 'medicine' &&
               item.code === newItem.code &&
               item.name === newItem.name
            );
         }

         if (duplicate) {
            // Increase quantity of existing item
            const newQuantity = (duplicate.quantity || 0) + (newItem.quantity || 0);
            db.updateInventory(duplicate.id, { quantity: newQuantity });
            const categoryName = newItem.category === 'lens' ? 'tròng kính' :
               newItem.category === 'frame' ? 'gọng kính' : 'thuốc';
            alert(`Đã tăng số lượng ${categoryName} trùng: ${duplicate.name} (${newQuantity} cái)`);
         } else {
            // Create new item
            const itemToAdd: InventoryItem = {
               id: generateId(),
               code: newItem.code!,
               category: newItem.category as any,
               name: newItem.name!,
               costPrice: newItem.costPrice || 0,
               price: newItem.price || 0,
               quantity: newItem.quantity || 0,
               minStock: newItem.minStock || 5,
               specs: (newItem.category === 'lens' || newItem.category === 'frame') ? newItem.specs : undefined
            };
            db.addInventoryItem(itemToAdd);
            const categoryName = newItem.category === 'lens' ? 'tròng kính' :
               newItem.category === 'frame' ? 'gọng kính' : 'thuốc';
            alert(`Đã thêm ${categoryName} mới!`);
         }
      }

      setShowAddItem(false);
      setNewItem({
         category: 'lens', name: '', code: '', costPrice: 0, price: 0, quantity: 0, minStock: 5,
         specs: { sph: '', cyl: '', add: '', material: '', type: 'single', note: '' }
      });
      refreshData();
   };

   // Invoice CRUD handlers
   const handleDeleteInvoice = (invoiceId: string) => {
      if (confirm('Bạn có chắc muốn xóa hóa đơn này? Hành động này không thể hoàn tác.')) {
         db.deleteInvoice(invoiceId);
         refreshData();
         alert('Đã xóa hóa đơn!');
      }
   };

   const handleUpdateInvoice = () => {
      if (editingInvoice) {
         // Recalculate total
         const subtotal = editingInvoice.items.reduce((s: number, i: any) => s + (i.quantity * i.price), 0);
         const total = subtotal - editingInvoice.discount + editingInvoice.surcharge;
         db.updateInvoice(editingInvoice.id, { ...editingInvoice, subtotal, total });
         setEditingInvoice(null);
         refreshData();
         alert('Đã cập nhật hóa đơn!');
      }
   };

   const handlePrintInvoice = (invoice: any) => {
      setPrintingInvoice(invoice);
      setTimeout(() => {
         window.print();
         setPrintingInvoice(null);
      }, 100);
   };

   const filteredInventory = inventory.filter(i => {
      const searchLower = searchInv.toLowerCase();
      const nameMatch = i.name.toLowerCase().includes(searchLower);
      const codeMatch = i.code.toLowerCase().includes(searchLower);

      // Ho tro tim kiem Plano: "plano" hoac "0" match voi trong 0 do
      let planoMatch = false;
      if (i.category === 'lens' && (searchLower === 'plano' || searchLower === '0')) {
         const sph = i.specs?.sph;
         if (sph === 0 || sph === '0' || (typeof sph === 'string' && sph.toLowerCase() === 'plano')) {
            planoMatch = true;
         }
      }

      return nameMatch || codeMatch || planoMatch;
   });

   const subtotal = cart.reduce((s, c) => s + (c.item.price * c.qty), 0);
   const finalTotal = Math.max(0, subtotal + extraCharges.surcharge - extraCharges.discount);

   return (
      <div className="h-full flex flex-col">
         <div className="flex gap-4 mb-4 border-b">
            <button
               onClick={() => setActiveTab('billing')}
               className={`px-4 py-2 font-bold ${activeTab === 'billing' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500'}`}
            >
               Thanh toán & Hóa đơn
            </button>
            <button
               onClick={() => setActiveTab('invoices')}
               className={`px-4 py-2 font-bold ${activeTab === 'invoices' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
            >
               Lịch sử hóa đơn ({invoices.length})
            </button>
            <button
               onClick={() => {
                  if (isAdmin) {
                     setActiveTab('inventory');
                  } else {
                     showLoginModal();
                  }
               }}
               className={`px-4 py-2 font-bold ${activeTab === 'inventory' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500'}`}
            >
               Quản lý kho
            </button>
         </div>

         {activeTab === 'billing' && (
            <div className="flex flex-col h-full overflow-hidden">
               {/* Mode toggle: khách đã khám / khách lẻ */}
               <div className="flex gap-2 mb-3">
                  <button
                     onClick={() => switchBillingMode('exam')}
                     className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${billingMode === 'exam' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                     <Eye size={16} /> Khách đã khám
                  </button>
                  <button
                     onClick={() => switchBillingMode('walkin')}
                     className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${billingMode === 'walkin' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                     <FilePlus size={16} /> Khách lẻ (mua nhanh)
                  </button>
               </div>

               <div className="flex gap-6 flex-1 overflow-hidden">
               {/* Left panel */}
               {billingMode === 'exam' ? (
                  <div className="w-1/4 clinic-card p-4 overflow-y-auto">
                     <h3 className="font-bold mb-4 flex items-center gap-2">
                        <Glasses size={18} /> Chờ tạo hóa đơn
                     </h3>
                     {waitingPatients.length === 0 && (
                        <p className="text-slate-500 text-sm text-center mt-4">Không có bệnh nhân</p>
                     )}
                     {waitingPatients.map(p => (
                        <div
                           key={p.id}
                           onClick={() => handleSelectPatient(p)}
                           className={`p-3 border rounded-lg mb-2 cursor-pointer transition-all ${selectedPatient?.id === p.id ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-500' : 'hover:bg-gray-50'
                              }`}
                        >
                           <div className="font-bold">#{p.ticketNumber} - {p.fullName}</div>
                           {p.refraction && (
                              <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                 <Eye size={12} /> Có kết quả khúc xạ
                              </div>
                           )}
                        </div>
                     ))}
                  </div>
               ) : (
                  <div className="w-1/4 clinic-card p-4 overflow-y-auto">
                     <h3 className="font-bold mb-4 flex items-center gap-2">
                        <FilePlus size={18} /> Thông tin khách lẻ
                     </h3>
                     <div className="space-y-3">
                        <div>
                           <label className="text-xs text-gray-500">Tên khách hàng</label>
                           <input
                              placeholder="Khách lẻ"
                              className="w-full border p-2 rounded mt-1"
                              value={walkInName}
                              onChange={e => setWalkInName(e.target.value)}
                           />
                        </div>
                        <div>
                           <label className="text-xs text-gray-500">Số điện thoại</label>
                           <input
                              placeholder="SĐT (tùy chọn)"
                              className="w-full border p-2 rounded mt-1"
                              value={walkInPhone}
                              onChange={e => setWalkInPhone(e.target.value)}
                           />
                        </div>
                     </div>

                     <div className="mt-4 pt-3 border-t">
                        <h4 className="font-bold text-sm text-gray-700 mb-2">Tìm tròng theo độ</h4>
                        <div className="grid grid-cols-4 gap-1 text-[10px] font-bold text-gray-400 text-center mb-1">
                           <div></div><div>SPH</div><div>CYL</div><div>ADD</div>
                        </div>
                        {(['od', 'os'] as const).map(eye => (
                           <div key={eye} className="grid grid-cols-4 gap-1 mb-1 items-center">
                              <span className="text-xs font-bold text-gray-600">{eye.toUpperCase()}</span>
                              {(['sph', 'cyl', 'add'] as const).map(field => (
                                 <input
                                    key={field}
                                    className="border p-1 rounded text-center text-xs"
                                    value={walkInRx[eye][field]}
                                    onChange={e => setWalkInRx(prev => ({
                                       ...prev,
                                       [eye]: { ...prev[eye], [field]: e.target.value }
                                    }))}
                                 />
                              ))}
                           </div>
                        ))}
                        <button
                           onClick={searchWalkInLenses}
                           className="w-full mt-2 py-2 bg-brand-600 text-white rounded text-sm font-bold hover:bg-brand-700 flex items-center justify-center gap-1"
                        >
                           <Search size={14} /> Tìm tròng phù hợp
                        </button>
                     </div>
                  </div>
               )}

               {/* Checkout Area */}
               <div className="flex-1 clinic-card p-6 flex flex-col overflow-y-auto">
                  {(selectedPatient || billingMode === 'walkin') ? (
                     <>
                        <h2 className="text-2xl font-bold mb-4">Hóa đơn: {selectedPatient ? selectedPatient.fullName : (walkInName.trim() || 'Khách lẻ')}</h2>

                        {/* Prescription Info */}
                        {selectedPatient?.refraction && (
                           <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4 text-sm">
                              <h4 className="font-bold text-blue-800 mb-2">Thông số kính điều chỉnh:</h4>
                              <div className="grid grid-cols-2 gap-2">
                                 <div>
                                    <strong>OD:</strong> SPH {selectedPatient.refraction.finalRx.od.sph} | CYL {selectedPatient.refraction.finalRx.od.cyl}
                                    {selectedPatient.refraction.finalRx.od.add && ` | ADD ${selectedPatient.refraction.finalRx.od.add}`}
                                 </div>
                                 <div>
                                    <strong>OS:</strong> SPH {selectedPatient.refraction.finalRx.os.sph} | CYL {selectedPatient.refraction.finalRx.os.cyl}
                                    {selectedPatient.refraction.finalRx.os.add && ` | ADD ${selectedPatient.refraction.finalRx.os.add}`}
                                 </div>
                              </div>
                              <p className="mt-1"><strong>Loại kính:</strong> {selectedPatient.refraction.finalRx.lensType} | <strong>PD:</strong> {selectedPatient.refraction.finalRx.od.pd || '-'}mm</p>
                           </div>
                        )}

                        {/* Lens Suggestions */}
                        {(suggestedPairedLenses.length > 0 || samePricePairs.length > 0 || suggestedLensesOD.length > 0 || suggestedLensesOS.length > 0) && (
                           <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
                              <h4 className="font-bold text-yellow-800 mb-3">Gợi ý tròng kính phù hợp:</h4>

                              {suggestedPairedLenses.length > 0 && (
                                 <div className="mb-3 p-2 bg-green-50 rounded border border-green-200">
                                    <p className="text-sm font-medium text-green-800 mb-2">Cặp tròng 2 mắt (cùng mã, cùng giá):</p>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                       {groupLensesByPrice(suggestedPairedLenses).map(group => (
                                          <div key={`pair-price-${group.price}`} className="min-w-[200px]">
                                             <p className="text-xs font-bold text-green-700 mb-1">{group.price.toLocaleString('vi-VN')} đ / tròng</p>
                                             {group.items.map(lens => {
                                                const qtyOD = getCartQty(lens.id, 'OD');
                                                const qtyOS = getCartQty(lens.id, 'OS');
                                                return (
                                                   <div key={`pair-${lens.id}`} className="bg-white p-2 rounded shadow-sm border text-xs border-green-300 mb-2">
                                                      <div className="font-bold text-gray-800">{lens.name}</div>
                                                      <div className="text-gray-500">Mã: {lens.code} | SPH: {formatSPH(lens.specs?.sph)} | CYL: {lens.specs?.cyl}</div>
                                                      <div className="text-gray-400">Kho: {lens.quantity}</div>
                                                      <button onClick={() => addLensToCart(lens, 'both')}
                                                         className="w-full mt-2 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 cursor-pointer">
                                                         + Thêm cặp 2 mắt (OD+OS)
                                                      </button>
                                                      <div className="flex items-center gap-2 mt-1 justify-center text-[10px]">
                                                         <span>OD: {qtyOD}</span><span>OS: {qtyOS}</span>
                                                      </div>
                                                   </div>
                                                );
                                             })}
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              )}

                              {samePricePairs.filter(p => !suggestedPairedLenses.some(l => p.od.some(o => o.id === l.id))).length > 0 && (
                                 <div className="mb-3 p-2 bg-teal-50 rounded border border-teal-200">
                                    <p className="text-sm font-medium text-teal-800 mb-2">Gợi ý cặp cùng giá (mã khác nhau):</p>
                                    {samePricePairs.map(pair => (
                                       <div key={`same-price-${pair.price}`} className="mb-2">
                                          <p className="text-xs font-bold text-teal-700 mb-1">{pair.price.toLocaleString('vi-VN')} đ / tròng</p>
                                          <div className="flex gap-2 flex-wrap">
                                             {pair.od.map(odLens => pair.os.map(osLens => (
                                                <button
                                                   key={`pair-${odLens.id}-${osLens.id}`}
                                                   onClick={() => addSamePricePair(odLens, osLens)}
                                                   className="text-xs bg-white border border-teal-300 rounded p-2 hover:bg-teal-100 cursor-pointer text-left"
                                                >
                                                   <div className="font-bold">OD: {odLens.name}</div>
                                                   <div className="font-bold">OS: {osLens.name}</div>
                                                   <div className="text-teal-700 mt-1">+ Thêm cặp cùng giá</div>
                                                </button>
                                             )))}
                                          </div>
                                       </div>
                                    ))}
                                 </div>
                              )}

                              {suggestedLensesOD.length > 0 && (
                                 <div className="mb-3">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Tròng mắt phải (OD) — chọn riêng:</p>
                                    {groupLensesByPrice(suggestedLensesOD).map(group => (
                                       <div key={`od-price-${group.price}`} className="mb-2">
                                          <p className="text-xs font-bold text-brand-700 mb-1">Giá: {group.price.toLocaleString('vi-VN')} đ</p>
                                          <div className="flex gap-2 overflow-x-auto pb-2">
                                             {group.items.map(lens => {
                                                const qty = getCartQty(lens.id, 'OD');
                                                return (
                                                   <div key={`od-${lens.id}`} className="min-w-[180px] bg-white p-2 rounded shadow-sm border text-xs">
                                                      <div className="font-bold text-gray-800">{lens.name}</div>
                                                      <div className="text-gray-500">Mã: {lens.code} | SPH: {formatSPH(lens.specs?.sph)} | CYL: {lens.specs?.cyl}</div>
                                                      <div className="flex items-center gap-2 mt-2 border-t pt-2 justify-center">
                                                         {qty === 0 ? (
                                                            <button onClick={() => addSingleEyeLens(lens, 'OD', 1)}
                                                               className="w-full py-1 bg-brand-600 text-white rounded text-xs font-bold hover:bg-brand-700 cursor-pointer">+ Thêm OD</button>
                                                         ) : (
                                                            <>
                                                               <button onClick={() => adjustSingleEyeQty(lens, 'OD', -1)}
                                                                  className="w-7 h-7 bg-red-100 text-red-600 rounded-full font-bold cursor-pointer">-</button>
                                                               <span className="font-bold text-lg min-w-[1.5rem] text-center">{qty}</span>
                                                               <button onClick={() => adjustSingleEyeQty(lens, 'OD', 1)}
                                                                  className="w-7 h-7 bg-green-100 text-green-600 rounded-full font-bold cursor-pointer">+</button>
                                                            </>
                                                         )}
                                                      </div>
                                                   </div>
                                                );
                                             })}
                                          </div>
                                       </div>
                                    ))}
                                 </div>
                              )}

                              {suggestedLensesOS.length > 0 && (
                                 <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">Tròng mắt trái (OS) — chọn riêng:</p>
                                    {groupLensesByPrice(suggestedLensesOS).map(group => (
                                       <div key={`os-price-${group.price}`} className="mb-2">
                                          <p className="text-xs font-bold text-brand-700 mb-1">Giá: {group.price.toLocaleString('vi-VN')} đ</p>
                                          <div className="flex gap-2 overflow-x-auto pb-2">
                                             {group.items.map(lens => {
                                                const qty = getCartQty(lens.id, 'OS');
                                                return (
                                                   <div key={`os-${lens.id}`} className="min-w-[180px] bg-white p-2 rounded shadow-sm border text-xs">
                                                      <div className="font-bold text-gray-800">{lens.name}</div>
                                                      <div className="text-gray-500">Mã: {lens.code} | SPH: {formatSPH(lens.specs?.sph)} | CYL: {lens.specs?.cyl}</div>
                                                      <div className="flex items-center gap-2 mt-2 border-t pt-2 justify-center">
                                                         {qty === 0 ? (
                                                            <button onClick={() => addSingleEyeLens(lens, 'OS', 1)}
                                                               className="w-full py-1 bg-brand-600 text-white rounded text-xs font-bold hover:bg-brand-700 cursor-pointer">+ Thêm OS</button>
                                                         ) : (
                                                            <>
                                                               <button onClick={() => adjustSingleEyeQty(lens, 'OS', -1)}
                                                                  className="w-7 h-7 bg-red-100 text-red-600 rounded-full font-bold cursor-pointer">-</button>
                                                               <span className="font-bold text-lg min-w-[1.5rem] text-center">{qty}</span>
                                                               <button onClick={() => adjustSingleEyeQty(lens, 'OS', 1)}
                                                                  className="w-7 h-7 bg-green-100 text-green-600 rounded-full font-bold cursor-pointer">+</button>
                                                            </>
                                                         )}
                                                      </div>
                                                   </div>
                                                );
                                             })}
                                          </div>
                                       </div>
                                    ))}
                                 </div>
                              )}
                           </div>
                        )}

                        {/* Frame Search */}
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mb-4">
                           <h4 className="font-bold text-orange-800 mb-2">Tìm gọng kính theo mã:</h4>
                           <div className="flex gap-2">
                              <input
                                 placeholder="Nhập mã gọng kính..."
                                 className="flex-1 border p-2 rounded"
                                 value={frameSearchCode}
                                 onChange={(e) => setFrameSearchCode(e.target.value)}
                                 onKeyDown={(e) => e.key === 'Enter' && handleFrameSearch()}
                              />
                              <button
                                 onClick={handleFrameSearch}
                                 className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                              >
                                 <Search size={18} />
                              </button>
                           </div>
                           {foundFrame && (
                              <div
                                 className="mt-3 bg-white p-3 rounded border flex justify-between items-center cursor-pointer hover:ring-2 hover:ring-brand-500"
                                 onClick={() => { addToCart(foundFrame); setFoundFrame(null); setFrameSearchCode(''); }}
                              >
                                 <div>
                                    <div className="font-bold">{foundFrame.name}</div>
                                    <div className="text-sm text-gray-500">Mã: {foundFrame.code} | Chất liệu: {foundFrame.specs?.material}</div>
                                 </div>
                                 <div className="text-right">
                                    <div className="font-bold text-brand-600">{foundFrame.price.toLocaleString()} d</div>
                                    <div className="text-xs text-gray-400">Kho: {foundFrame.quantity}</div>
                                 </div>
                              </div>
                           )}
                        </div>

                        {/* Product Search */}
                        <div className="relative mb-4">
                           <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                           <input
                              placeholder="Quét mã vạch hoặc nhập mã sản phẩm khác..."
                              className="w-full pl-10 border p-2 rounded"
                              onChange={(e) => {
                                 const match = inventory.find(i => i.code === e.target.value);
                                 if (match) { addToCart(match); e.target.value = ''; }
                              }}
                           />
                        </div>

                        {/* Cart Table */}
                        <div className="flex-1 overflow-y-auto border rounded-lg">
                           <table className="w-full">
                              <thead className="bg-gray-50 sticky top-0">
                                 <tr>
                                    <th className="text-left p-2">Sản phẩm</th>
                                    <th className="text-center p-2">SL</th>
                                    <th className="text-right p-2">Đơn giá</th>
                                    <th className="text-right p-2">Thành tiền</th>
                                    <th className="p-2 w-10"></th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {cart.length === 0 && (
                                    <tr>
                                       <td colSpan={5} className="p-4 text-center text-slate-500">Chưa có sản phẩm trong giỏ</td>
                                    </tr>
                                 )}
                                 {cart.map((c, idx) => (
                                    <tr key={c.cartKey} className="border-b">
                                       <td className="p-2">
                                          {c.item.name}
                                          {c.eye && <span className="text-xs bg-purple-100 text-purple-600 px-1 ml-1 rounded">{c.eye}</span>}
                                          <span className="text-xs text-gray-400 ml-1">({c.item.code})</span>
                                          {c.item.category === 'lens' && <span className="text-xs bg-blue-100 text-blue-600 px-1 ml-1 rounded">Tròng</span>}
                                          {c.item.category === 'frame' && <span className="text-xs bg-orange-100 text-orange-600 px-1 ml-1 rounded">Gọng</span>}
                                       </td>
                                       <td className="p-2 text-center">
                                          <input
                                             type="number" className="w-14 text-center border rounded"
                                             value={c.qty}
                                             min="1"
                                             onChange={(e) => {
                                                const newQty = parseInt(e.target.value) || 1;
                                                updateCartQuantity(c.cartKey, newQty);
                                             }}
                                          />
                                       </td>
                                       <td className="p-2 text-right">{c.item.price.toLocaleString()}</td>
                                       <td className="p-2 text-right font-bold">{(c.item.price * c.qty).toLocaleString()}</td>
                                       <td className="p-2">
                                          <button
                                             onClick={() => removeFromCart(c.cartKey)}
                                             className="text-red-500 hover:bg-red-50 p-1 rounded"
                                          >
                                             <X size={16} />
                                          </button>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>

                        <div className="border-t pt-4 mt-4 space-y-2">
                           <div className="flex justify-between text-sm">
                              <span>Tạm tính:</span>
                              <span className="font-medium">{subtotal.toLocaleString()} d</span>
                           </div>
                           <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Phụ thu (Khám, thủ thuật):</span>
                              <input
                                 type="number" className="border rounded p-1 text-right w-32"
                                 value={extraCharges.surcharge}
                                 onChange={e => setExtraCharges({ ...extraCharges, surcharge: parseInt(e.target.value) || 0 })}
                              />
                           </div>
                           <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Giảm giá / Voucher:</span>
                              <input
                                 type="number" className="border rounded p-1 text-right w-32 text-red-500"
                                 value={extraCharges.discount}
                                 onChange={e => setExtraCharges({ ...extraCharges, discount: parseInt(e.target.value) || 0 })}
                              />
                           </div>

                           <div className="flex justify-between text-2xl font-bold border-t pt-2 mt-2">
                              <span>Tổng cộng:</span>
                              <span className="text-brand-600">{finalTotal.toLocaleString()} d</span>
                           </div>

                           <button onClick={() => selectedPatient ? handleCheckout() : handleCheckoutWalkIn()} className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 flex justify-center items-center gap-2 mt-4">
                              <Printer /> Thanh toán & In hóa đơn
                           </button>
                        </div>
                     </>
                  ) : (
                     <div className="text-center text-gray-500 mt-20">
                        <Glasses size={48} className="mx-auto mb-2 opacity-50" />
                        <p>Chọn bệnh nhân để tạo hóa đơn kính</p>
                     </div>
                  )}
               </div>

               {/* Hidden Print Area - Tách biệt component in hóa đơn */}
               <div className="print-area">
                  {(selectedPatient || billingMode === 'walkin') && (
                     <InvoicePrint
                        settings={settings}
                        patient={selectedPatient || ({ fullName: walkInName.trim() || 'Khách lẻ', phone: walkInPhone.trim() } as Patient)}
                        cart={cart}
                        subtotal={subtotal}
                        extraCharges={extraCharges}
                        finalTotal={finalTotal}
                     />
                  )}
               </div>
               </div>
            </div>
         )}

         {activeTab === 'inventory' && (
            // Inventory Tab
            <div className="clinic-card p-6 h-full overflow-hidden flex flex-col">
               {/* Category Tabs */}
               <div className="flex gap-2 mb-4 border-b pb-4">
                  <button
                     onClick={() => setInventoryCategoryTab('lens')}
                     className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${inventoryCategoryTab === 'lens' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                     <Eye size={18} /> Tròng kính
                  </button>
                  <button
                     onClick={() => setInventoryCategoryTab('frame')}
                     className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${inventoryCategoryTab === 'frame' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                     <Glasses size={18} /> Gọng kính
                  </button>
                  <button
                     onClick={() => setInventoryCategoryTab('medicine')}
                     className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${inventoryCategoryTab === 'medicine' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                     <Plus size={18} /> Thuốc
                  </button>
               </div>

               <div className="flex justify-between mb-4">
                  <input
                     placeholder={`Tìm kiếm ${inventoryCategoryTab === 'lens' ? 'tròng kính' : inventoryCategoryTab === 'frame' ? 'gọng kính' : 'thuốc'}...`}
                     className="clinic-input w-96 max-w-full"
                     value={searchInv} onChange={e => setSearchInv(e.target.value)}
                  />
                  <button
                     onClick={() => {
                        setNewItem({
                           category: inventoryCategoryTab,
                           name: '', code: '', costPrice: 0, price: 0, quantity: 0, minStock: 5,
                           specs: { sph: '', cyl: '', add: '', material: '', type: 'single', note: '' }
                        });
                        setShowAddItem(true);
                     }}
                     className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 font-medium"
                  >
                     <FilePlus size={18} /> Nhập mới
                  </button>
               </div>
               <div className="overflow-auto flex-1">
                  <table className="w-full text-left clinic-table">
                     <thead className="sticky top-0">
                        <tr>
                           <th className="p-3">Mã</th>
                           <th className="p-3">Tên sản phẩm</th>
                           <th className="p-3">Tồn kho</th>
                           <th className="p-3">Đơn giá</th>
                           <th className="p-3">Thông số</th>
                           <th className="p-3 text-center">Tác vụ</th>
                        </tr>
                     </thead>
                     <tbody>
                        {filteredInventory
                           .filter(item => item.category === inventoryCategoryTab)
                           .map(item => (
                              <tr key={item.id} className="border-b hover:bg-gray-50">
                                 <td className="p-3 font-mono text-xs">{item.code}</td>
                                 <td className="p-3 font-medium">{item.name}</td>
                                 <td className={`p-3 font-bold ${item.quantity <= item.minStock ? 'text-red-500' : 'text-green-600'}`}>
                                    {item.quantity}
                                 </td>
                                 <td className="p-3">{item.price.toLocaleString()}</td>
                                 <td className="p-3 text-xs text-gray-500">
                                    {item.category === 'lens' && (
                                       <>
                                          {`SPH: ${formatSPH(item.specs?.sph)} | CYL: ${item.specs?.cyl}${item.specs?.add ? ` | ADD: ${item.specs.add}` : ''} | ${item.specs?.material || ''}`}
                                          {item.specs?.note && <div className="text-blue-600 mt-1">📝 {item.specs.note}</div>}
                                       </>
                                    )}
                                    {item.category === 'frame' && `${item.specs?.material || ''}`}
                                    {item.category === 'medicine' && `${item.specs?.type || ''}`}
                                 </td>
                                 <td className="p-3 text-center">
                                    <div className="flex gap-1 justify-center">
                                       <button
                                          onClick={() => handleEditItem(item)}
                                          className="text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded-full transition-colors"
                                          title="Sửa sản phẩm"
                                       >
                                          <Edit size={16} />
                                       </button>
                                       <button
                                          onClick={() => handleDeleteInventoryItem(item.id)}
                                          className="text-red-600 hover:text-red-800 bg-red-50 p-2 rounded-full transition-colors"
                                          title="Xóa sản phẩm"
                                       >
                                          <Trash2 size={16} />
                                       </button>
                                    </div>
                                 </td>
                              </tr>
                           ))}
                        {filteredInventory.filter(item => item.category === inventoryCategoryTab).length === 0 && (
                           <tr>
                              <td colSpan={6} className="p-8 text-center text-gray-400">
                                 Chưa có {inventoryCategoryTab === 'lens' ? 'tròng kính' : inventoryCategoryTab === 'frame' ? 'gọng kính' : 'thuốc'} trong kho
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         )}



         {/* Add New Item Modal */}
         {showAddItem && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-10">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                  <div className="bg-brand-50 px-6 py-4 border-b flex justify-between items-center">
                     <h3 className="font-bold text-brand-800">{newItem.id ? 'Cập nhật sản phẩm' : 'Thêm hàng hóa mới'}</h3>
                     <button onClick={() => setShowAddItem(false)} className="text-gray-500 hover:text-red-500">
                        <X size={20} />
                     </button>
                  </div>
                  <div className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Loại hàng</label>
                        <div className="flex gap-4">
                           {(['lens', 'frame', 'medicine'] as const).map(type => (
                              <label key={type} className="flex items-center gap-2 cursor-pointer">
                                 <input
                                    type="radio"
                                    checked={newItem.category === type}
                                    onChange={() => setNewItem({ ...newItem, category: type, specs: { sph: '', cyl: '', add: '', material: '', type: 'single', note: '' } })}
                                 />
                                 <span>{type === 'lens' ? 'Tròng kính' : type === 'frame' ? 'Gọng kính' : 'Thuốc'}</span>
                              </label>
                           ))}
                        </div>
                     </div>

                     <div className="relative">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Tên hàng hóa *</label>
                        <input
                           className="clinic-input"
                           value={newItem.name}
                           onChange={e => handleNameChange(e.target.value)}
                           onFocus={() => newItem.name && newItem.name.length >= 2 && setShowNameSuggestions(nameSuggestions.length > 0)}
                           onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                           placeholder="Nhập tên để tìm sản phẩm có sẵn..."
                        />
                        <p className="text-xs text-slate-500 mt-1">Nhập tên sản phẩm, hệ thống sẽ tự động gợi ý nếu đã có trong kho</p>
                        {showNameSuggestions && nameSuggestions.length > 0 && (
                           <div className="absolute z-50 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                              <div className="px-3 py-2 bg-green-50 text-green-700 text-xs font-medium border-b">
                                 Tìm thấy {nameSuggestions.length} sản phẩm — Nhấn để tự động điền
                              </div>
                              {nameSuggestions.map(item => (
                                 <div
                                    key={item.id}
                                    className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                                    onMouseDown={() => selectSuggestion(item)}
                                 >
                                    <div className="font-medium text-gray-800">{item.name}</div>
                                    <div className="text-xs text-gray-500 flex gap-3">
                                       <span>Mã: {item.code}</span>
                                       <span>Giá: {item.price?.toLocaleString()} đ</span>
                                       <span>Tồn: {item.quantity}</span>
                                       {item.specs?.material && <span>CL: {item.specs.material}</span>}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>

                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Mã hàng (Code) *</label>
                        <input className="clinic-input" value={newItem.code} onChange={e => setNewItem({ ...newItem, code: e.target.value })} placeholder="VD: LENS01, FRAME001..." />
                     </div>

                     <div className="grid grid-cols-4 gap-4">
                        <div>
                           <label className="block text-sm font-medium mb-1">Giá nhập</label>
                           <input type="number" className="clinic-input" value={newItem.costPrice} onChange={e => setNewItem({ ...newItem, costPrice: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div>
                           <label className="block text-sm font-medium mb-1">Giá bán</label>
                           <input type="number" className="clinic-input" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: parseInt(e.target.value) })} />
                        </div>
                        <div>
                           <label className="block text-sm font-medium mb-1">Số lượng</label>
                           <input type="number" className="clinic-input" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })} />
                        </div>
                        <div>
                           <label className="block text-sm font-medium mb-1">Tồn tối thiểu</label>
                           <input type="number" className="clinic-input" value={newItem.minStock} onChange={e => setNewItem({ ...newItem, minStock: parseInt(e.target.value) })} />
                        </div>
                     </div>

                     {newItem.category === 'lens' && (
                        <div className="bg-blue-50 p-4 rounded border border-blue-100">
                           <h4 className="font-bold text-sm text-blue-800 mb-2">Thông số tròng</h4>
                           <div className="grid grid-cols-2 gap-3">
                              <div>
                                 <label className="text-xs font-medium text-slate-700">Độ cầu (SPH)</label>
                                 <input
                                    className="border rounded w-full p-1"
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="VD: -2.50, +1.25"
                                    value={newItem.specs.sph ?? ''}
                                    onChange={e => {
                                       const val = e.target.value;
                                       // Cho phep nhap chuoi de ho tro so am
                                       setNewItem({ ...newItem, specs: { ...newItem.specs, sph: val } });
                                    }}
                                 />
                              </div>
                              <div>
                                 <label className="text-xs font-medium text-slate-700">Độ loạn (CYL)</label>
                                 <input
                                    className="border rounded w-full p-1"
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="VD: -1.00, -0.50"
                                    value={newItem.specs.cyl ?? ''}
                                    onChange={e => {
                                       const val = e.target.value;
                                       setNewItem({ ...newItem, specs: { ...newItem.specs, cyl: val } });
                                    }}
                                 />
                              </div>
                              <div>
                                 <label className="text-xs font-medium text-slate-700">Độ ADD (nếu có)</label>
                                 <input
                                    className="border rounded w-full p-1"
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="VD: +1.50"
                                    value={newItem.specs.add ?? ''}
                                    onChange={e => {
                                       const val = e.target.value;
                                       setNewItem({ ...newItem, specs: { ...newItem.specs, add: val } });
                                    }}
                                 />
                              </div>
                              <div>
                                 <label className="text-xs font-medium text-slate-700">Chiết suất</label>
                                 <input className="border rounded w-full p-1" placeholder="1.56, 1.61..." value={newItem.specs.material} onChange={e => setNewItem({ ...newItem, specs: { ...newItem.specs, material: e.target.value } })} />
                              </div>
                              <div className="col-span-2">
                                 <label className="text-xs font-medium text-slate-700">Loại tròng</label>
                                 <select className="clinic-input" value={newItem.specs.type} onChange={e => setNewItem({ ...newItem, specs: { ...newItem.specs, type: e.target.value } })}>
                                    <option value="single">Đơn tròng</option>
                                    <option value="bifocal">Hai tròng</option>
                                    <option value="pal">Đa tròng (Progressive)</option>
                                 </select>
                              </div>
                              <div className="col-span-2">
                                 <label className="text-xs font-medium text-slate-700">Ghi chú (độ kính bổ sung...)</label>
                                 <input
                                    className="clinic-input"
                                    placeholder="VD: Độ kính -2.50 đến -4.00, tròng lọc ánh sáng xanh..."
                                    value={newItem.specs.note ?? ''}
                                    onChange={e => setNewItem({ ...newItem, specs: { ...newItem.specs, note: e.target.value } })}
                                 />
                              </div>
                           </div>
                        </div>
                     )}

                     {newItem.category === 'frame' && (
                        <div className="bg-orange-50 p-4 rounded border border-orange-100">
                           <h4 className="font-bold text-sm text-orange-800 mb-2">Thông số gọng</h4>
                           <label className="text-xs font-medium text-slate-700">Chất liệu</label>
                           <input className="clinic-input" placeholder="Nhựa, Kim loại..." value={newItem.specs.material} onChange={e => setNewItem({ ...newItem, specs: { ...newItem.specs, material: e.target.value } })} />
                        </div>
                     )}

                     <div className="flex justify-end gap-3 pt-4 border-t">
                        <button onClick={() => setShowAddItem(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Hủy</button>
                        <button onClick={handleSaveItem} className="px-4 py-2 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700">Lưu sản phẩm</button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Invoice History Tab */}
         {activeTab === 'invoices' && (
            <div className="clinic-card p-6 flex-1 overflow-y-auto">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Lịch sử hóa đơn & Thống kê doanh thu</h3>
               </div>

               {/* Filter & Stats */}
               <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                     <label className="block text-sm font-medium mb-1">Tìm kiếm</label>
                     <input
                        type="text"
                        placeholder="Tên khách hàng..."
                        className="w-full border rounded p-2"
                        value={invoiceSearch}
                        onChange={e => setInvoiceSearch(e.target.value)}
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-medium mb-1">Tháng</label>
                     <input
                        type="month"
                        className="w-full border rounded p-2"
                        value={invoiceMonth}
                        onChange={e => setInvoiceMonth(e.target.value)}
                     />
                  </div>
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                     <div className="text-xs text-blue-600">Tổng hóa đơn tháng</div>
                     <div className="text-xl font-bold text-blue-700">
                        {invoices.filter(inv => {
                           const d = new Date(inv.date);
                           return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === invoiceMonth;
                        }).length} hóa đơn
                     </div>
                  </div>
               </div>

               {/* Invoice Table */}
               <table className="w-full text-left">
                  <thead className="bg-gray-50">
                     <tr>
                        <th className="p-3">Ngày</th>
                        <th className="p-3">Khách hàng</th>
                        <th className="p-3">Sản phẩm</th>
                        <th className="p-3 text-right">Tổng tiền</th>
                        <th className="p-3 text-center">Tác vụ</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y">
                     {invoices
                        .filter(inv => {
                           // Filter by month
                           const d = new Date(inv.date);
                           const monthMatch = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === invoiceMonth;
                           // Filter by search
                           const searchMatch = inv.patientName.toLowerCase().includes(invoiceSearch.toLowerCase());
                           return monthMatch && searchMatch;
                        })
                        .sort((a, b) => b.date - a.date) // Moi nhat len tren
                        .map(inv => (
                           <tr key={inv.id} className="hover:bg-gray-50">
                              <td className="p-3 text-sm">
                                 {new Date(inv.date).toLocaleDateString('vi-VN')}
                                 <div className="text-xs text-gray-400">
                                    {new Date(inv.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                 </div>
                              </td>
                              <td className="p-3 font-medium">{inv.patientName}</td>
                              <td className="p-3 text-sm text-gray-600">
                                 {inv.items.map((item: any, i: number) => (
                                    <div key={i}>{item.name} x{item.quantity}</div>
                                 ))}
                              </td>
                              <td className="p-3 text-right font-bold text-green-600">
                                 {inv.total.toLocaleString()} d
                                 {inv.discount > 0 && (
                                    <div className="text-xs text-gray-400">Giảm: {inv.discount.toLocaleString()}</div>
                                 )}
                              </td>
                              <td className="p-3 text-center">
                                 <div className="flex gap-1 justify-center">
                                    <button
                                       onClick={() => setViewingInvoice(inv)}
                                       className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                                       title="Xem chi tiết"
                                    >
                                       <Eye size={16} />
                                    </button>
                                    <button
                                       onClick={() => setEditingInvoice({ ...inv })}
                                       className="p-2 bg-yellow-100 text-yellow-600 rounded hover:bg-yellow-200"
                                       title="Sửa hóa đơn"
                                    >
                                       <Edit size={16} />
                                    </button>
                                    <button
                                       onClick={() => handleDeleteInvoice(inv.id)}
                                       className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                                       title="Xóa hóa đơn"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                    <button
                                       onClick={() => handlePrintInvoice(inv)}
                                       className="p-2 bg-gray-100 rounded hover:bg-gray-200"
                                       title="In lại hóa đơn"
                                    >
                                       <Printer size={16} />
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                  </tbody>
               </table>

               {invoices.filter(inv => {
                  const d = new Date(inv.date);
                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === invoiceMonth;
               }).length === 0 && (
                     <div className="text-center text-gray-400 py-8">
                        Không có hóa đơn nào trong tháng này
                     </div>
                  )}
            </div>
         )
         }

         {/* Modal Xem Chi Tiet Hoa Don */}
         {
            viewingInvoice && (
               <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Chi tiết hóa đơn</h3>
                        <button onClick={() => setViewingInvoice(null)} className="text-gray-500 hover:text-gray-800">
                           <X size={24} />
                        </button>
                     </div>

                     <div className="space-y-3 mb-4">
                        <div className="flex justify-between border-b pb-2">
                           <span className="text-gray-600">Mã hóa đơn:</span>
                           <span className="font-mono text-sm">{viewingInvoice.id.slice(0, 8)}...</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                           <span className="text-gray-600">Khách hàng:</span>
                           <span className="font-bold">{viewingInvoice.patientName}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                           <span className="text-gray-600">Ngày tạo:</span>
                           <span>{new Date(viewingInvoice.date).toLocaleString('vi-VN')}</span>
                        </div>
                     </div>

                     <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="font-bold mb-2">Sản phẩm:</h4>
                        {viewingInvoice.items.map((item: any, i: number) => (
                           <div key={i} className="flex justify-between py-1">
                              <span>{item.name} x{item.quantity}</span>
                              <span>{(item.price * item.quantity).toLocaleString()} d</span>
                           </div>
                        ))}
                     </div>

                     <div className="space-y-2 border-t pt-4">
                        <div className="flex justify-between">
                           <span>Tạm tính:</span>
                           <span>{viewingInvoice.subtotal?.toLocaleString()} d</span>
                        </div>
                        {viewingInvoice.discount > 0 && (
                           <div className="flex justify-between text-red-600">
                              <span>Giảm giá:</span>
                              <span>-{viewingInvoice.discount.toLocaleString()} d</span>
                           </div>
                        )}
                        {viewingInvoice.surcharge > 0 && (
                           <div className="flex justify-between text-orange-600">
                              <span>Phụ thu:</span>
                              <span>+{viewingInvoice.surcharge.toLocaleString()} d</span>
                           </div>
                        )}
                        <div className="flex justify-between font-bold text-lg text-green-600 border-t pt-2">
                           <span>Tổng cộng:</span>
                           <span>{viewingInvoice.total.toLocaleString()} d</span>
                        </div>
                     </div>

                     <button
                        onClick={() => setViewingInvoice(null)}
                        className="mt-4 w-full py-2 bg-brand-600 text-white font-bold rounded hover:bg-brand-700"
                     >
                        Đóng
                     </button>
                  </div>
               </div>
            )
         }

         {/* Modal Sua Hoa Don */}
         {
            editingInvoice && (
               <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Sửa hóa đơn</h3>
                        <button onClick={() => setEditingInvoice(null)} className="text-gray-500 hover:text-gray-800">
                           <X size={24} />
                        </button>
                     </div>

                     <div className="space-y-4">
                        <div>
                           <label className="block text-sm font-medium mb-1">Tên khách hàng</label>
                           <input
                              className="w-full border rounded p-2"
                              value={editingInvoice.patientName}
                              onChange={e => setEditingInvoice({ ...editingInvoice, patientName: e.target.value })}
                           />
                        </div>

                        <div>
                           <label className="block text-sm font-medium mb-2">Sản phẩm:</label>
                           {editingInvoice.items.map((item: any, i: number) => (
                              <div key={i} className="flex gap-2 mb-2 items-center bg-gray-50 p-2 rounded">
                                 <span className="flex-1 text-sm">{item.name}</span>
                                 <div className="flex items-center gap-1">
                                    <span className="text-xs">SL:</span>
                                    <input
                                       type="number"
                                       className="w-16 border rounded p-1 text-center"
                                       value={item.quantity}
                                       onChange={e => {
                                          const newItems = [...editingInvoice.items];
                                          newItems[i].quantity = parseInt(e.target.value) || 1;
                                          setEditingInvoice({ ...editingInvoice, items: newItems });
                                       }}
                                       min="1"
                                    />
                                 </div>
                                 <span className="text-sm font-bold">{(item.price * item.quantity).toLocaleString()}</span>
                              </div>
                           ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-sm font-medium mb-1">Giảm giá (đ)</label>
                              <input
                                 type="number"
                                 className="w-full border rounded p-2"
                                 value={editingInvoice.discount}
                                 onChange={e => setEditingInvoice({ ...editingInvoice, discount: parseInt(e.target.value) || 0 })}
                              />
                           </div>
                           <div>
                              <label className="block text-sm font-medium mb-1">Phụ thu (đ)</label>
                              <input
                                 type="number"
                                 className="w-full border rounded p-2"
                                 value={editingInvoice.surcharge}
                                 onChange={e => setEditingInvoice({ ...editingInvoice, surcharge: parseInt(e.target.value) || 0 })}
                              />
                           </div>
                        </div>

                        <div className="bg-green-50 p-3 rounded border border-green-200">
                           <div className="flex justify-between font-bold text-lg text-green-700">
                              <span>Tổng cộng (ước tính):</span>
                              <span>
                                 {(editingInvoice.items.reduce((s: number, i: any) => s + (i.quantity * i.price), 0)
                                    - editingInvoice.discount + editingInvoice.surcharge).toLocaleString()} d
                              </span>
                           </div>
                        </div>
                     </div>

                     <div className="flex gap-3 mt-6">
                        <button
                           onClick={() => setEditingInvoice(null)}
                           className="flex-1 py-2 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300"
                        >
                           Hủy
                        </button>
                        <button
                           onClick={handleUpdateInvoice}
                           className="flex-1 py-2 bg-brand-600 text-white font-bold rounded hover:bg-brand-700"
                        >
                           Lưu thay đổi
                        </button>
                     </div>
                  </div>
               </div>
            )
         }

         {/* Hidden Print Area for Invoice */}
         {printingInvoice && (
            <div className="print-area hidden print:block" style={{ width: '58mm', fontFamily: 'Arial, sans-serif', fontSize: '10px', padding: '2mm' }}>
               {/* Header - Thông tin phòng khám */}
               <div style={{ textAlign: 'center', borderBottom: '1px dashed black', paddingBottom: '3mm', marginBottom: '3mm' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' }}>{settings.name || 'PHÒNG KHÁM MẮT'}</div>
                  {settings.doctorName && <div style={{ fontSize: '9px' }}>{settings.doctorName}</div>}
                  {settings.phone && <div style={{ fontSize: '9px' }}>DT: {settings.phone}</div>}
                  <div style={{ fontWeight: 'bold', marginTop: '3mm', fontSize: '11px' }}>HÓA ĐƠN BÁN LẺ</div>
               </div>

               {/* Thông tin hóa đơn */}
               <div style={{ marginBottom: '3mm', fontSize: '9px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                     <span>{printingInvoice.date ? new Date(printingInvoice.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</span>
                     <span>{printingInvoice.date ? new Date(printingInvoice.date).toLocaleDateString('vi-VN') : ''}</span>
                  </div>
                  <div style={{ fontWeight: 'bold', marginTop: '1mm' }}>KH: {printingInvoice.patientName || 'Khách lẻ'}</div>
                  {printingInvoice.patientPhone && <div>SĐT: {printingInvoice.patientPhone}</div>}
               </div>

               {/* Chi tiết sản phẩm */}
               <div style={{ borderTop: '1px dashed black', borderBottom: '1px dashed black', paddingTop: '2mm', paddingBottom: '2mm' }}>
                  {printingInvoice.items?.map((item: any, idx: number) => (
                     <div key={idx} style={{ marginBottom: '2mm', fontSize: '9px' }}>
                        <div style={{ fontWeight: '500' }}>{idx + 1}. {item.name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '3mm', color: '#333' }}>
                           <span>{item.quantity} x {item.price?.toLocaleString()}đ</span>
                           <span style={{ fontWeight: 'bold' }}>{(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                     </div>
                  ))}
               </div>

               {/* Tổng tiền */}
               <div style={{ marginTop: '2mm', fontSize: '9px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                     <span>Tạm tính:</span>
                     <span>{(printingInvoice.items?.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0) || 0).toLocaleString()}</span>
                  </div>

                  {printingInvoice.surcharge > 0 && (
                     <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Phụ thu:</span>
                        <span>+{printingInvoice.surcharge.toLocaleString()}</span>
                     </div>
                  )}

                  {printingInvoice.discount > 0 && (
                     <div style={{ display: 'flex', justifyContent: 'space-between', color: 'red' }}>
                        <span>Giảm giá:</span>
                        <span>-{printingInvoice.discount.toLocaleString()}</span>
                     </div>
                  )}
               </div>

               <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px', marginTop: '2mm', borderTop: '1px dashed black', paddingTop: '2mm' }}>
                  <span>TỔNG CỘNG:</span>
                  <span>{printingInvoice.total?.toLocaleString()}</span>
               </div>

               {/* Footer */}
               <div style={{ textAlign: 'center', marginTop: '4mm', fontSize: '9px', fontStyle: 'italic' }}>
                  Cảm ơn quý khách!<br />
                  Hẹn gặp lại
               </div>
            </div>
         )}
      </div>
   );
};
