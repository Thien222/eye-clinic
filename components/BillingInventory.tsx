import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Patient, InventoryItem } from '../types';
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
   const [cart, setCart] = useState<{ item: InventoryItem, qty: number }[]>([]);
   const [extraCharges, setExtraCharges] = useState({ discount: 0, surcharge: 0 });
   const [frameSearchCode, setFrameSearchCode] = useState('');
   const [foundFrame, setFoundFrame] = useState<InventoryItem | null>(null);

   // Lens suggestions
   const [suggestedLensesOD, setSuggestedLensesOD] = useState<InventoryItem[]>([]);
   const [suggestedLensesOS, setSuggestedLensesOS] = useState<InventoryItem[]>([]);

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

   // Auto-fill khi nh?p tï¿½n s?n ph?m
   const handleNameChange = (name: string) => {
      setNewItem({ ...newItem, name });

      if (name.length >= 2) {
         // T?m s?n ph?m cï¿½ tï¿½n ch?a chu?i nh?p vï¿½o (cï¿½ng category)
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

   // Ch?n g?i ? ï¿½? auto-fill t?t c? thï¿½ng s?
   const selectSuggestion = (item: InventoryItem) => {
      setNewItem({
         ...newItem,
         code: item.code,
         name: item.name,
         costPrice: item.costPrice,
         price: item.price,
         minStock: item.minStock,
         specs: item.specs || { sph: '', cyl: '', add: '', material: '', type: 'single' }
         // Khï¿½ng set quantity - ï¿½? user nh?p s? lï¿½?ng mu?n thï¿½m
      });
      setShowNameSuggestions(false);
   };

   // Persist activeTab whenever it changes
   useEffect(() => {
      localStorage.setItem('billing_active_tab', activeTab);
   }, [activeTab]);

   useEffect(() => {
      refreshData();
      const handleDbUpdate = () => refreshData();
      window.addEventListener('clinic-db-updated', handleDbUpdate);
      return () => window.removeEventListener('clinic-db-updated', handleDbUpdate);
   }, []);

   const refreshData = () => {
      setWaitingPatients(db.getPatients().filter(p => p.status === 'waiting_billing'));
      setInventory(db.getInventory());
      setInvoices(db.getInvoices());
   };

   // Khi chá»n bá»‡nh nhĂ¢n, tá»± Ä‘á»™ng gá»£i Ă½ trĂ²ng kĂ­nh
   const handleSelectPatient = (p: Patient) => {
      setSelectedPatient(p);
      setExtraCharges({ discount: 0, surcharge: 0 });
      setCart([]);
      setFoundFrame(null);
      setFrameSearchCode('');

      if (p.refraction) {
         // Gá»£i Ă½ trĂ²ng theo Ä‘á»™ prescription
         const inv = db.getInventory().filter(i => i.category === 'lens');

         // TrĂ²ng máº¯t pháº£i (OD)
         const odSph = parseFloat(p.refraction.finalRx.od.sph) || 0;
         const odCyl = parseFloat(p.refraction.finalRx.od.cyl) || 0;
         const odAdd = parseFloat(p.refraction.finalRx.od.add || '0') || 0;

         const matchesOD = inv.filter(item => {
            // Parse SPH - xu ly Plano (0 do)
            let itemSph = 0;
            if (item.specs?.sph !== undefined) {
               if (typeof item.specs.sph === 'string' && item.specs.sph.toLowerCase() === 'plano') {
                  itemSph = 0;
               } else {
                  itemSph = parseFloat(String(item.specs.sph)) || 0;
               }
            }
            const itemCyl = parseFloat(String(item.specs?.cyl || 0)) || 0;
            const itemAdd = parseFloat(String(item.specs?.add || 0)) || 0;

            // Kiem tra do cau (SPH) chenh lech <= 0.25
            const sphMatch = Math.abs(itemSph - odSph) <= 0.25;
            // Kiem tra do loan (CYL) chenh lech <= 0.25
            const cylMatch = Math.abs(itemCyl - odCyl) <= 0.25;
            // Kiem tra ADD neu co
            const addMatch = odAdd === 0 || (itemAdd !== undefined && Math.abs(itemAdd - odAdd) <= 0.25);

            return sphMatch && cylMatch && addMatch && item.quantity > 0;
         });

         // TrĂ²ng máº¯t trĂ¡i (OS)
         const osSph = parseFloat(p.refraction.finalRx.os.sph) || 0;
         const osCyl = parseFloat(p.refraction.finalRx.os.cyl) || 0;
         const osAdd = parseFloat(p.refraction.finalRx.os.add || '0') || 0;

         const matchesOS = inv.filter(item => {
            // Parse SPH - xu ly Plano (0 do)
            let itemSph = 0;
            if (item.specs?.sph !== undefined) {
               if (typeof item.specs.sph === 'string' && item.specs.sph.toLowerCase() === 'plano') {
                  itemSph = 0;
               } else {
                  itemSph = parseFloat(String(item.specs.sph)) || 0;
               }
            }
            const itemCyl = parseFloat(String(item.specs?.cyl || 0)) || 0;
            const itemAdd = parseFloat(String(item.specs?.add || 0)) || 0;

            const sphMatch = Math.abs(itemSph - osSph) <= 0.25;
            const cylMatch = Math.abs(itemCyl - osCyl) <= 0.25;
            const addMatch = osAdd === 0 || (itemAdd !== undefined && Math.abs(itemAdd - osAdd) <= 0.25);

            return sphMatch && cylMatch && addMatch && item.quantity > 0;
         });

         setSuggestedLensesOD(matchesOD);
         setSuggestedLensesOS(matchesOS);
      } else {
         setSuggestedLensesOD([]);
         setSuggestedLensesOS([]);
      }
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
         alert('Khong tim thay gong kinh voi ma nay!');
         setFoundFrame(null);
      }
   };

   const addToCart = (item: InventoryItem) => {
      const existing = cart.find(c => c.item.id === item.id);
      if (existing) {
         setCart(cart.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      } else {
         setCart([...cart, { item, qty: 1 }]);
      }
   };

   const removeFromCart = (itemId: string) => {
      setCart(cart.filter(c => c.item.id !== itemId));
   };

   const updateCartQuantity = (itemId: string, newQty: number) => {
      if (newQty <= 0) {
         removeFromCart(itemId);
      } else {
         setCart(cart.map(c => c.item.id === itemId ? { ...c, qty: newQty } : c));
      }
   };

   const handleCheckout = () => {
      if (!selectedPatient) return;
      if (cart.length === 0) {
         alert('Gio hang trong!');
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
            name: c.item.name,
            quantity: c.qty,
            costPrice: c.item.costPrice || 0,
            price: c.item.price,
            isLens: c.item.category === 'lens'
         })),
         subtotal,
         discount: extraCharges.discount,
         surcharge: extraCharges.surcharge,
         total,
         profit,
         date: Date.now()
      };

      db.createInvoice(invoice);
      db.updatePatient({ ...selectedPatient, status: 'completed' });

      window.print();

      alert(`Thanh toan thanh cong: ${total.toLocaleString()} d`);
      setSelectedPatient(null);
      setCart([]);
      setSuggestedLensesOD([]);
      setSuggestedLensesOS([]);
      refreshData();
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
      if (confirm('Ban co chac muon xoa san pham nay?')) {
         db.deleteInventoryItem(id);
         refreshData();
         alert('Da xoa san pham!');
      }
   };

   const handleSaveItem = () => {
      if (!newItem.name || !newItem.code) {
         alert('Vui long nhap ten va ma san pham');
         return;
      }

      if (newItem.id) {
         // Update existing item
         db.updateInventory(newItem.id, newItem);
         alert('Da cap nhat san pham!');
      } else {
         // Check for duplicate item with same code, name and specs
         const existingItems = db.getInventory();
         let duplicate = null;

         if (newItem.category === 'lens') {
            // Tr?ng kï¿½nh: ki?m tra m? + tï¿½n + SPH + CYL + ADD + chi?t su?t
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
            // G?ng kï¿½nh: ki?m tra m? + tï¿½n + ch?t li?u
            duplicate = existingItems.find(item =>
               item.category === 'frame' &&
               item.code === newItem.code &&
               item.name === newItem.name &&
               (item.specs?.material || '') === (newItem.specs?.material || '')
            );
         } else if (newItem.category === 'medicine') {
            // Thu?c: ki?m tra m? + tï¿½n
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
            const categoryName = newItem.category === 'lens' ? 'trong kinh' :
               newItem.category === 'frame' ? 'gong kinh' : 'thuoc';
            alert(`Da tang so luong ${categoryName} trung: ${duplicate.name} (${newQuantity} cai)`);
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
            const categoryName = newItem.category === 'lens' ? 'trong kinh' :
               newItem.category === 'frame' ? 'gong kinh' : 'thuoc';
            alert(`Da them ${categoryName} moi!`);
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
      if (confirm('Ban co chac muon xoa hoa don nay? Hanh dong nay khong the hoan tac.')) {
         db.deleteInvoice(invoiceId);
         refreshData();
         alert('Da xoa hoa don!');
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
         alert('Da cap nhat hoa don!');
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

   const settings = db.getSettings();

   return (
      <div className="h-full flex flex-col">
         <div className="flex gap-4 mb-4 border-b">
            <button
               onClick={() => setActiveTab('billing')}
               className={`px-4 py-2 font-bold ${activeTab === 'billing' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500'}`}
            >
               Thanh Toan & Hoa Don
            </button>
            <button
               onClick={() => setActiveTab('invoices')}
               className={`px-4 py-2 font-bold ${activeTab === 'invoices' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
            >
               Lich Su Hoa Don ({invoices.length})
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
               Quan Ly Kho
            </button>
         </div>

         {activeTab === 'billing' && (
            <div className="flex gap-6 h-full overflow-hidden">
               {/* Waiting List */}
               <div className="w-1/4 bg-white rounded-xl shadow-sm p-4 overflow-y-auto">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                     <Glasses size={18} /> Cho Tao Hoa Don
                  </h3>
                  {waitingPatients.length === 0 && (
                     <p className="text-gray-400 text-sm text-center mt-4">Khong co benh nhan</p>
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
                              <Eye size={12} /> Co ket qua khuc xa
                           </div>
                        )}
                     </div>
                  ))}
               </div>

               {/* Checkout Area */}
               <div className="flex-1 bg-white rounded-xl shadow-sm p-6 flex flex-col overflow-y-auto">
                  {selectedPatient ? (
                     <>
                        <h2 className="text-2xl font-bold mb-4">Hoa Don: {selectedPatient.fullName}</h2>

                        {/* Prescription Info */}
                        {selectedPatient.refraction && (
                           <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4 text-sm">
                              <h4 className="font-bold text-blue-800 mb-2">Thong so kinh dieu chinh:</h4>
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
                              <p className="mt-1"><strong>Loai kinh:</strong> {selectedPatient.refraction.finalRx.lensType} | <strong>PD:</strong> {selectedPatient.refraction.finalRx.od.pd || '-'}mm</p>
                           </div>
                        )}

                        {/* Lens Suggestions */}
                        {(suggestedLensesOD.length > 0 || suggestedLensesOS.length > 0) && (
                           <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
                              <h4 className="font-bold text-yellow-800 mb-3">Goi y trong kinh phu hop:</h4>

                              {suggestedLensesOD.length > 0 && (
                                 <div className="mb-3">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Trong mat phai (OD):</p>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                       {suggestedLensesOD.map(lens => {
                                          const inCart = cart.find(c => c.item.id === lens.id);
                                          const qty = inCart?.qty || 0;
                                          return (
                                             <div
                                                key={lens.id}
                                                className="min-w-[180px] bg-white p-2 rounded shadow-sm border text-xs"
                                             >
                                                <div className="font-bold text-gray-800">{lens.name}</div>
                                                <div className="text-gray-500">SPH: {formatSPH(lens.specs?.sph)} | CYL: {lens.specs?.cyl}</div>
                                                {lens.specs?.add && <div className="text-gray-500">ADD: {lens.specs.add}</div>}
                                                {lens.specs?.note && <div className="text-blue-600 text-[10px] mt-1 truncate" title={lens.specs.note}>📝 {lens.specs.note}</div>}
                                                <div className="text-brand-600 font-bold mt-1">{lens.price.toLocaleString()} d</div>
                                                <div className="text-gray-400">Kho: {lens.quantity}</div>

                                                {/* Nút tăng giảm số lượng */}
                                                <div className="flex items-center justify-between mt-2 border-t pt-2">
                                                   {qty === 0 ? (
                                                      <button
                                                         onClick={() => addToCart(lens)}
                                                         className="w-full py-1 bg-brand-600 text-white rounded text-xs font-bold hover:bg-brand-700"
                                                      >
                                                         + Them vao don
                                                      </button>
                                                   ) : (
                                                      <div className="flex items-center gap-2 w-full justify-center">
                                                         <button
                                                            onClick={() => updateCartQuantity(lens.id, qty - 1)}
                                                            className="w-7 h-7 bg-red-100 text-red-600 rounded-full font-bold hover:bg-red-200"
                                                         >
                                                            -
                                                         </button>
                                                         <span className="font-bold text-lg min-w-[24px] text-center">{qty}</span>
                                                         <button
                                                            onClick={() => updateCartQuantity(lens.id, qty + 1)}
                                                            className="w-7 h-7 bg-green-100 text-green-600 rounded-full font-bold hover:bg-green-200"
                                                         >
                                                            +
                                                         </button>
                                                      </div>
                                                   )}
                                                </div>
                                             </div>
                                          );
                                       })}
                                    </div>
                                 </div>
                              )}

                              {suggestedLensesOS.length > 0 && (
                                 <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">Trong mat trai (OS):</p>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                       {suggestedLensesOS.map(lens => {
                                          const inCart = cart.find(c => c.item.id === lens.id);
                                          const qty = inCart?.qty || 0;
                                          return (
                                             <div
                                                key={lens.id}
                                                className="min-w-[180px] bg-white p-2 rounded shadow-sm border text-xs"
                                             >
                                                <div className="font-bold text-gray-800">{lens.name}</div>
                                                <div className="text-gray-500">SPH: {formatSPH(lens.specs?.sph)} | CYL: {lens.specs?.cyl}</div>
                                                {lens.specs?.add && <div className="text-gray-500">ADD: {lens.specs.add}</div>}
                                                {lens.specs?.note && <div className="text-blue-600 text-[10px] mt-1 truncate" title={lens.specs.note}>📝 {lens.specs.note}</div>}
                                                <div className="text-brand-600 font-bold mt-1">{lens.price.toLocaleString()} d</div>
                                                <div className="text-gray-400">Kho: {lens.quantity}</div>

                                                {/* Nút tăng giảm số lượng */}
                                                <div className="flex items-center justify-between mt-2 border-t pt-2">
                                                   {qty === 0 ? (
                                                      <button
                                                         onClick={() => addToCart(lens)}
                                                         className="w-full py-1 bg-brand-600 text-white rounded text-xs font-bold hover:bg-brand-700"
                                                      >
                                                         + Them vao don
                                                      </button>
                                                   ) : (
                                                      <div className="flex items-center gap-2 w-full justify-center">
                                                         <button
                                                            onClick={() => updateCartQuantity(lens.id, qty - 1)}
                                                            className="w-7 h-7 bg-red-100 text-red-600 rounded-full font-bold hover:bg-red-200"
                                                         >
                                                            -
                                                         </button>
                                                         <span className="font-bold text-lg min-w-[24px] text-center">{qty}</span>
                                                         <button
                                                            onClick={() => updateCartQuantity(lens.id, qty + 1)}
                                                            className="w-7 h-7 bg-green-100 text-green-600 rounded-full font-bold hover:bg-green-200"
                                                         >
                                                            +
                                                         </button>
                                                      </div>
                                                   )}
                                                </div>
                                             </div>
                                          );
                                       })}
                                    </div>
                                 </div>
                              )}
                           </div>
                        )}

                        {/* Frame Search */}
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mb-4">
                           <h4 className="font-bold text-orange-800 mb-2">Tim gong kinh theo ma:</h4>
                           <div className="flex gap-2">
                              <input
                                 placeholder="Nhap ma gong kinh..."
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
                                    <div className="text-sm text-gray-500">Ma: {foundFrame.code} | Chat lieu: {foundFrame.specs?.material}</div>
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
                              placeholder="Quet ma vach hoac nhap ma san pham khac..."
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
                                    <th className="text-left p-2">San pham</th>
                                    <th className="text-center p-2">SL</th>
                                    <th className="text-right p-2">Don gia</th>
                                    <th className="text-right p-2">Thanh tien</th>
                                    <th className="p-2 w-10"></th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {cart.length === 0 && (
                                    <tr>
                                       <td colSpan={5} className="p-4 text-center text-gray-400">Chua co san pham trong gio</td>
                                    </tr>
                                 )}
                                 {cart.map((c, idx) => (
                                    <tr key={idx} className="border-b">
                                       <td className="p-2">
                                          {c.item.name}
                                          <span className="text-xs text-gray-400 ml-1">({c.item.code})</span>
                                          {c.item.category === 'lens' && <span className="text-xs bg-blue-100 text-blue-600 px-1 ml-1 rounded">Trong</span>}
                                          {c.item.category === 'frame' && <span className="text-xs bg-orange-100 text-orange-600 px-1 ml-1 rounded">Gong</span>}
                                       </td>
                                       <td className="p-2 text-center">
                                          <input
                                             type="number" className="w-14 text-center border rounded"
                                             value={c.qty}
                                             min="1"
                                             onChange={(e) => {
                                                const newQty = parseInt(e.target.value) || 1;
                                                const newCart = [...cart];
                                                newCart[idx].qty = newQty;
                                                setCart(newCart);
                                             }}
                                          />
                                       </td>
                                       <td className="p-2 text-right">{c.item.price.toLocaleString()}</td>
                                       <td className="p-2 text-right font-bold">{(c.item.price * c.qty).toLocaleString()}</td>
                                       <td className="p-2">
                                          <button
                                             onClick={() => removeFromCart(c.item.id)}
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
                              <span>Tam tinh:</span>
                              <span className="font-medium">{subtotal.toLocaleString()} d</span>
                           </div>
                           <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Phu thu (Kham, thu thuat):</span>
                              <input
                                 type="number" className="border rounded p-1 text-right w-32"
                                 value={extraCharges.surcharge}
                                 onChange={e => setExtraCharges({ ...extraCharges, surcharge: parseInt(e.target.value) || 0 })}
                              />
                           </div>
                           <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Giam gia / Voucher:</span>
                              <input
                                 type="number" className="border rounded p-1 text-right w-32 text-red-500"
                                 value={extraCharges.discount}
                                 onChange={e => setExtraCharges({ ...extraCharges, discount: parseInt(e.target.value) || 0 })}
                              />
                           </div>

                           <div className="flex justify-between text-2xl font-bold border-t pt-2 mt-2">
                              <span>Tong cong:</span>
                              <span className="text-brand-600">{finalTotal.toLocaleString()} d</span>
                           </div>

                           <button onClick={handleCheckout} className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 flex justify-center items-center gap-2 mt-4">
                              <Printer /> Thanh Toan & In Hoa Don
                           </button>
                        </div>
                     </>
                  ) : (
                     <div className="text-center text-gray-500 mt-20">
                        <Glasses size={48} className="mx-auto mb-2 opacity-50" />
                        <p>Chon benh nhan de tao hoa don kinh</p>
                     </div>
                  )}
               </div>

               {/* Hidden Print Area - Tách biệt component in hóa đơn */}
               <div className="print-area">
                  {selectedPatient && (
                     <InvoicePrint
                        settings={settings}
                        patient={selectedPatient}
                        cart={cart}
                        subtotal={subtotal}
                        extraCharges={extraCharges}
                        finalTotal={finalTotal}
                     />
                  )}
               </div>
            </div>
         )}

         {activeTab === 'inventory' && (
            // Inventory Tab
            <div className="bg-white rounded-xl shadow-sm p-6 h-full overflow-hidden flex flex-col">
               {/* Category Tabs */}
               <div className="flex gap-2 mb-4 border-b pb-4">
                  <button
                     onClick={() => setInventoryCategoryTab('lens')}
                     className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${inventoryCategoryTab === 'lens' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                     <Eye size={18} /> Trong kinh
                  </button>
                  <button
                     onClick={() => setInventoryCategoryTab('frame')}
                     className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${inventoryCategoryTab === 'frame' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                     <Glasses size={18} /> Gong kinh
                  </button>
                  <button
                     onClick={() => setInventoryCategoryTab('medicine')}
                     className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${inventoryCategoryTab === 'medicine' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                     <Plus size={18} /> Thuoc
                  </button>
               </div>

               <div className="flex justify-between mb-4">
                  <input
                     placeholder={`Tim kiem ${inventoryCategoryTab === 'lens' ? 'trong kinh' : inventoryCategoryTab === 'frame' ? 'gong kinh' : 'thuoc'}...`}
                     className="border p-2 rounded w-96"
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
                     className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700"
                  >
                     <FilePlus size={18} /> Nhap Moi
                  </button>
               </div>
               <div className="overflow-auto flex-1">
                  <table className="w-full text-left">
                     <thead className="bg-gray-100 sticky top-0">
                        <tr>
                           <th className="p-3">Ma</th>
                           <th className="p-3">Ten san pham</th>
                           <th className="p-3">Ton kho</th>
                           <th className="p-3">Don gia</th>
                           <th className="p-3">Thong so</th>
                           <th className="p-3 text-center">Tac vu</th>
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
                                          title="Sua san pham"
                                       >
                                          <Edit size={16} />
                                       </button>
                                       <button
                                          onClick={() => handleDeleteInventoryItem(item.id)}
                                          className="text-red-600 hover:text-red-800 bg-red-50 p-2 rounded-full transition-colors"
                                          title="Xoa san pham"
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
                                 Chua co {inventoryCategoryTab === 'lens' ? 'trong kinh' : inventoryCategoryTab === 'frame' ? 'gong kinh' : 'thuoc'} trong kho
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
                     <h3 className="font-bold text-brand-800">{newItem.id ? 'Cap Nhat San Pham' : 'Them Hang Hoa Moi'}</h3>
                     <button onClick={() => setShowAddItem(false)} className="text-gray-500 hover:text-red-500">
                        <X size={20} />
                     </button>
                  </div>
                  <div className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-medium mb-1">Loai hang</label>
                        <div className="flex gap-4">
                           {(['lens', 'frame', 'medicine'] as const).map(type => (
                              <label key={type} className="flex items-center gap-2 cursor-pointer">
                                 <input
                                    type="radio"
                                    checked={newItem.category === type}
                                    onChange={() => setNewItem({ ...newItem, category: type, specs: { sph: '', cyl: '', add: '', material: '', type: 'single', note: '' } })}
                                 />
                                 <span className="capitalize">{type === 'lens' ? 'Trong kinh' : type === 'frame' ? 'Gong kinh' : 'Thuoc'}</span>
                              </label>
                           ))}
                        </div>
                     </div>

                     {/* Tï¿½n hï¿½ng hï¿½a - full width v?i g?i ? */}
                     <div className="relative">
                        <label className="block text-sm font-medium mb-1">Ten hang hoa *</label>
                        <input
                           className="w-full border rounded p-2"
                           value={newItem.name}
                           onChange={e => handleNameChange(e.target.value)}
                           onFocus={() => newItem.name && newItem.name.length >= 2 && setShowNameSuggestions(nameSuggestions.length > 0)}
                           onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                           placeholder="Nhap ten de tim san pham co san..."
                        />
                        <p className="text-xs text-gray-400 mt-1"> Nhap ten san pham, he thong se tu dong goi y neu da co trong kho</p>
                        {/* Dropdown g?i ? */}
                        {showNameSuggestions && nameSuggestions.length > 0 && (
                           <div className="absolute z-50 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                              <div className="px-3 py-2 bg-green-50 text-green-700 text-xs font-medium border-b">
                                 Tim thay {nameSuggestions.length} san pham - Click de tu dong dien
                              </div>
                              {nameSuggestions.map(item => (
                                 <div
                                    key={item.id}
                                    className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                                    onMouseDown={() => selectSuggestion(item)}
                                 >
                                    <div className="font-medium text-gray-800">{item.name}</div>
                                    <div className="text-xs text-gray-500 flex gap-3">
                                       <span>Ma: {item.code}</span>
                                       <span>Gia: {item.price?.toLocaleString()}d</span>
                                       <span>Ton: {item.quantity}</span>
                                       {item.specs?.material && <span>CL: {item.specs.material}</span>}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>

                     {/* M? hï¿½ng */}
                     <div>
                        <label className="block text-sm font-medium mb-1">Ma hang (Code) *</label>
                        <input className="w-full border rounded p-2" value={newItem.code} onChange={e => setNewItem({ ...newItem, code: e.target.value })} placeholder="VD: LENS01, FRAME001..." />
                     </div>

                     <div className="grid grid-cols-4 gap-4">
                        <div>
                           <label className="block text-sm font-medium mb-1">Gia nhap</label>
                           <input type="number" className="w-full border rounded p-2" value={newItem.costPrice} onChange={e => setNewItem({ ...newItem, costPrice: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div>
                           <label className="block text-sm font-medium mb-1">Gia ban</label>
                           <input type="number" className="w-full border rounded p-2" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: parseInt(e.target.value) })} />
                        </div>
                        <div>
                           <label className="block text-sm font-medium mb-1">So luong</label>
                           <input type="number" className="w-full border rounded p-2" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })} />
                        </div>
                        <div>
                           <label className="block text-sm font-medium mb-1">Ton toi thieu</label>
                           <input type="number" className="w-full border rounded p-2" value={newItem.minStock} onChange={e => setNewItem({ ...newItem, minStock: parseInt(e.target.value) })} />
                        </div>
                     </div>

                     {/* Specific Fields for Lens */}
                     {newItem.category === 'lens' && (
                        <div className="bg-blue-50 p-4 rounded border border-blue-100">
                           <h4 className="font-bold text-sm text-blue-800 mb-2">Thong so Trong</h4>
                           <div className="grid grid-cols-2 gap-3">
                              <div>
                                 <label className="text-xs">Do Cau (SPH)</label>
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
                                 <label className="text-xs">Do Loan (CYL)</label>
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
                                 <label className="text-xs">Do ADD (neu co)</label>
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
                                 <label className="text-xs">Chiet suat</label>
                                 <input className="border rounded w-full p-1" placeholder="1.56, 1.61..." value={newItem.specs.material} onChange={e => setNewItem({ ...newItem, specs: { ...newItem.specs, material: e.target.value } })} />
                              </div>
                              <div className="col-span-2">
                                 <label className="text-xs">Loai trong</label>
                                 <select className="border rounded w-full p-1" value={newItem.specs.type} onChange={e => setNewItem({ ...newItem, specs: { ...newItem.specs, type: e.target.value } })}>
                                    <option value="single">Don trong</option>
                                    <option value="bifocal">Hai trong</option>
                                    <option value="pal">Da trong (Progressive)</option>
                                 </select>
                              </div>
                              <div className="col-span-2">
                                 <label className="text-xs">Ghi chu (do kinh bo sung...)</label>
                                 <input
                                    className="border rounded w-full p-1"
                                    placeholder="VD: Do kinh -2.50 den -4.00, trong loc anh sang xanh..."
                                    value={newItem.specs.note ?? ''}
                                    onChange={e => setNewItem({ ...newItem, specs: { ...newItem.specs, note: e.target.value } })}
                                 />
                              </div>
                           </div>
                        </div>
                     )}

                     {newItem.category === 'frame' && (
                        <div className="bg-orange-50 p-4 rounded border border-orange-100">
                           <h4 className="font-bold text-sm text-orange-800 mb-2">Thong so Gong</h4>
                           <label className="text-xs">Chat lieu</label>
                           <input className="border rounded w-full p-1" placeholder="Nhua, Kim loai..." value={newItem.specs.material} onChange={e => setNewItem({ ...newItem, specs: { ...newItem.specs, material: e.target.value } })} />
                        </div>
                     )}

                     <div className="flex justify-end gap-3 pt-4 border-t">
                        <button onClick={() => setShowAddItem(false)} className="px-4 py-2 text-gray-600">Huy</button>
                        <button onClick={handleSaveItem} className="px-4 py-2 bg-brand-600 text-white font-bold rounded hover:bg-brand-700">Luu san pham</button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Invoice History Tab */}
         {activeTab === 'invoices' && (
            <div className="bg-white rounded-xl shadow-sm p-6 flex-1 overflow-y-auto">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">đŸ“ Lich Su Hoa Don & Thong Ke Doanh Thu</h3>
               </div>

               {/* Filter & Stats */}
               <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                     <label className="block text-sm font-medium mb-1">Tim kiem</label>
                     <input
                        type="text"
                        placeholder="Ten khach hang..."
                        className="w-full border rounded p-2"
                        value={invoiceSearch}
                        onChange={e => setInvoiceSearch(e.target.value)}
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-medium mb-1">Thang</label>
                     <input
                        type="month"
                        className="w-full border rounded p-2"
                        value={invoiceMonth}
                        onChange={e => setInvoiceMonth(e.target.value)}
                     />
                  </div>
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                     <div className="text-xs text-blue-600">Tong hoa don thang</div>
                     <div className="text-xl font-bold text-blue-700">
                        {invoices.filter(inv => {
                           const d = new Date(inv.date);
                           return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === invoiceMonth;
                        }).length} hoa don
                     </div>
                  </div>
               </div>

               {/* Invoice Table */}
               <table className="w-full text-left">
                  <thead className="bg-gray-50">
                     <tr>
                        <th className="p-3">Ngay</th>
                        <th className="p-3">Khach hang</th>
                        <th className="p-3">San pham</th>
                        <th className="p-3 text-right">Tong tien</th>
                        <th className="p-3 text-center">Tac vu</th>
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
                                    <div className="text-xs text-gray-400">Giam: {inv.discount.toLocaleString()}</div>
                                 )}
                              </td>
                              <td className="p-3 text-center">
                                 <div className="flex gap-1 justify-center">
                                    <button
                                       onClick={() => setViewingInvoice(inv)}
                                       className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                                       title="Xem chi tiet"
                                    >
                                       <Eye size={16} />
                                    </button>
                                    <button
                                       onClick={() => setEditingInvoice({ ...inv })}
                                       className="p-2 bg-yellow-100 text-yellow-600 rounded hover:bg-yellow-200"
                                       title="Sua hoa don"
                                    >
                                       <Edit size={16} />
                                    </button>
                                    <button
                                       onClick={() => handleDeleteInvoice(inv.id)}
                                       className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                                       title="Xoa hoa don"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                    <button
                                       onClick={() => handlePrintInvoice(inv)}
                                       className="p-2 bg-gray-100 rounded hover:bg-gray-200"
                                       title="In lai hoa don"
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
                        Khong co hoa don nao trong thang nay
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
                        <h3 className="text-xl font-bold">đŸ“‹ Chi Tiet Hoa Don</h3>
                        <button onClick={() => setViewingInvoice(null)} className="text-gray-500 hover:text-gray-800">
                           <X size={24} />
                        </button>
                     </div>

                     <div className="space-y-3 mb-4">
                        <div className="flex justify-between border-b pb-2">
                           <span className="text-gray-600">Ma hoa don:</span>
                           <span className="font-mono text-sm">{viewingInvoice.id.slice(0, 8)}...</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                           <span className="text-gray-600">Khach hang:</span>
                           <span className="font-bold">{viewingInvoice.patientName}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                           <span className="text-gray-600">Ngay tao:</span>
                           <span>{new Date(viewingInvoice.date).toLocaleString('vi-VN')}</span>
                        </div>
                     </div>

                     <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="font-bold mb-2">San pham:</h4>
                        {viewingInvoice.items.map((item: any, i: number) => (
                           <div key={i} className="flex justify-between py-1">
                              <span>{item.name} x{item.quantity}</span>
                              <span>{(item.price * item.quantity).toLocaleString()} d</span>
                           </div>
                        ))}
                     </div>

                     <div className="space-y-2 border-t pt-4">
                        <div className="flex justify-between">
                           <span>Tam tinh:</span>
                           <span>{viewingInvoice.subtotal?.toLocaleString()} d</span>
                        </div>
                        {viewingInvoice.discount > 0 && (
                           <div className="flex justify-between text-red-600">
                              <span>Giam gia:</span>
                              <span>-{viewingInvoice.discount.toLocaleString()} d</span>
                           </div>
                        )}
                        {viewingInvoice.surcharge > 0 && (
                           <div className="flex justify-between text-orange-600">
                              <span>Phu thu:</span>
                              <span>+{viewingInvoice.surcharge.toLocaleString()} d</span>
                           </div>
                        )}
                        <div className="flex justify-between font-bold text-lg text-green-600 border-t pt-2">
                           <span>Tong cong:</span>
                           <span>{viewingInvoice.total.toLocaleString()} d</span>
                        </div>
                     </div>

                     <button
                        onClick={() => setViewingInvoice(null)}
                        className="mt-4 w-full py-2 bg-brand-600 text-white font-bold rounded hover:bg-brand-700"
                     >
                        Dong
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
                        <h3 className="text-xl font-bold">âœï¿½  Sua Hoa Don</h3>
                        <button onClick={() => setEditingInvoice(null)} className="text-gray-500 hover:text-gray-800">
                           <X size={24} />
                        </button>
                     </div>

                     <div className="space-y-4">
                        <div>
                           <label className="block text-sm font-medium mb-1">Ten khach hang</label>
                           <input
                              className="w-full border rounded p-2"
                              value={editingInvoice.patientName}
                              onChange={e => setEditingInvoice({ ...editingInvoice, patientName: e.target.value })}
                           />
                        </div>

                        <div>
                           <label className="block text-sm font-medium mb-2">San pham:</label>
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
                              <label className="block text-sm font-medium mb-1">Giam gia (d)</label>
                              <input
                                 type="number"
                                 className="w-full border rounded p-2"
                                 value={editingInvoice.discount}
                                 onChange={e => setEditingInvoice({ ...editingInvoice, discount: parseInt(e.target.value) || 0 })}
                              />
                           </div>
                           <div>
                              <label className="block text-sm font-medium mb-1">Phu thu (d)</label>
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
                              <span>Tong cong (uoc tinh):</span>
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
                           Huy
                        </button>
                        <button
                           onClick={handleUpdateInvoice}
                           className="flex-1 py-2 bg-brand-600 text-white font-bold rounded hover:bg-brand-700"
                        >
                           Luu thay doi
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
                  <div style={{ fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' }}>{settings.name || 'PHONG KHAM MAT'}</div>
                  {settings.doctorName && <div style={{ fontSize: '9px' }}>{settings.doctorName}</div>}
                  {settings.phone && <div style={{ fontSize: '9px' }}>DT: {settings.phone}</div>}
                  <div style={{ fontWeight: 'bold', marginTop: '3mm', fontSize: '11px' }}>HOA DON BAN LE</div>
               </div>

               {/* Thông tin hóa đơn */}
               <div style={{ marginBottom: '3mm', fontSize: '9px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                     <span>{printingInvoice.date ? new Date(printingInvoice.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</span>
                     <span>{printingInvoice.date ? new Date(printingInvoice.date).toLocaleDateString('vi-VN') : ''}</span>
                  </div>
                  <div style={{ fontWeight: 'bold', marginTop: '1mm' }}>KH: {printingInvoice.patientName || 'Khach le'}</div>
                  {printingInvoice.patientPhone && <div>SDT: {printingInvoice.patientPhone}</div>}
               </div>

               {/* Chi tiết sản phẩm */}
               <div style={{ borderTop: '1px dashed black', borderBottom: '1px dashed black', paddingTop: '2mm', paddingBottom: '2mm' }}>
                  {printingInvoice.items?.map((item: any, idx: number) => (
                     <div key={idx} style={{ marginBottom: '2mm', fontSize: '9px' }}>
                        <div style={{ fontWeight: '500' }}>{idx + 1}. {item.name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '3mm', color: '#333' }}>
                           <span>{item.quantity} x {item.price?.toLocaleString()}d</span>
                           <span style={{ fontWeight: 'bold' }}>{(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                     </div>
                  ))}
               </div>

               {/* Tổng tiền */}
               <div style={{ marginTop: '2mm', fontSize: '9px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                     <span>Tam tinh:</span>
                     <span>{(printingInvoice.items?.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0) || 0).toLocaleString()}</span>
                  </div>

                  {printingInvoice.surcharge > 0 && (
                     <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Phu thu:</span>
                        <span>+{printingInvoice.surcharge.toLocaleString()}</span>
                     </div>
                  )}

                  {printingInvoice.discount > 0 && (
                     <div style={{ display: 'flex', justifyContent: 'space-between', color: 'red' }}>
                        <span>Giam gia:</span>
                        <span>-{printingInvoice.discount.toLocaleString()}</span>
                     </div>
                  )}
               </div>

               <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px', marginTop: '2mm', borderTop: '1px dashed black', paddingTop: '2mm' }}>
                  <span>TONG CONG:</span>
                  <span>{printingInvoice.total?.toLocaleString()}</span>
               </div>

               {/* Footer */}
               <div style={{ textAlign: 'center', marginTop: '4mm', fontSize: '9px', fontStyle: 'italic' }}>
                  Cam on quy khach!<br />
                  Hen gap lai
               </div>
            </div>
         )}
      </div>
   );
};
