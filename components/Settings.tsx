import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { ClinicSettings } from '../types';
import { Save, Download, Upload, Settings as SettingsIcon, Printer, Database, FileText, Clock, Ticket, Glasses, Receipt, Shield, Trash2, FolderOpen, Lock, Zap } from 'lucide-react';
import { getSeedData } from '../services/seedData';

type SettingsTab = 'general' | 'vat' | 'invoice' | 'ticket' | 'refraction' | 'backup' | 'security';

interface BackupRecord {
  id: string;
  filename: string;
  date: number;
  size: string;
  path: string;
}

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [backupHistory, setBackupHistory] = useState<BackupRecord[]>([]);
  const [settings, setSettings] = useState<ClinicSettings>({
    name: 'PHÒNG KHÁM MẮT NGOÀI GIỜ',
    doctorName: 'BSCKII. Hứa Trung Kiên',
    address: '',
    phone: '0917416421 – 0849274364',
    email: '',
    workingHours: 'Từ 8h đến 19h, Thứ hai đến Chủ nhật',
    vat: {
      enabled: false,
      rate: 10,
    },
    invoice: {
      header: 'HÓA ĐƠN BÁN LẺ',
      footer: 'Cảm ơn quý khách!',
      showLogo: false,
    },
    ticket: {
      header: 'PHÒNG KHÁM MẮT NGOÀI GIỜ',
      subHeader: 'BSCKII. Hứa Trung Kiên',
      note: 'Khách hàng vui lòng chờ đến STT',
      footer: 'Phiếu có hiệu lực trong ngày',
    },
    refraction: {
      header: 'PHÒNG KHÁM MẮT NGOÀI GIỜ',
      rightHeader: 'KHÁM KHÚC XẠ',
      disclaimer1: 'Khách hàng đã được đeo thử kính và cảm thấy thoải mái khi đi lại, không có hiện tượng nhức mắt hay đau đầu. Mức độ thích nghỉ của mỗi người có thể khác nhau, vì vậy thời gian làm quen với kính có thể từ 5–7 ngày.',
      disclaimer2: 'Khách hàng đã được tư vấn về độ kính phù hợp, mọi điều chỉnh theo nhu cầu riêng sẽ được thực hiện theo mong muốn cá nhân sau khi đã được giải thích rõ ràng.',
    },
    backup: {
      path: 'C:\\EyeClinicBackup',
      maxFiles: 10,
      autoBackupOnClose: true,
      autoBackupInterval: 4, // hours
    },
    printTemplates: {
      receiptHeader: '',
      receiptFooter: '',
      prescriptionHeader: '',
      prescriptionFooter: '',
    }
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = db.getSettings();
    if (saved) {
      setSettings({ ...settings, ...saved });
    }
  }, []);

  // Load backups when switching to backup tab
  useEffect(() => {
    if (activeTab === 'backup') {
      loadBackupsFromDisk();
    }
  }, [activeTab]);

  const loadBackupsFromDisk = async () => {
    try {
      const backupPath = settings.backup?.path || 'D:\\testbackup';
      const response = await fetch(`/api/backups?path=${encodeURIComponent(backupPath)}`);
      const result = await response.json();
      if (result.success && result.files) {
        const records: BackupRecord[] = result.files.map((f: any) => ({
          id: f.path,
          filename: f.filename,
          date: f.date,
          size: f.size,
          path: f.path
        }));
        setBackupHistory(records);
      }
    } catch (error) {
      console.log('Backup server not running');
      // Load from localStorage as fallback
      const history = localStorage.getItem('clinic_backup_history');
      if (history) {
        setBackupHistory(JSON.parse(history));
      }
    }
  };

  const handleSave = () => {
    db.saveSettings(settings);
    alert('Đã lưu cài đặt thành công!');
  };

  const handleBackup = async () => {
    const backupPath = settings.backup?.path || 'D:\\testbackup';
    const now = new Date();
    const filename = `backup_clinic_${now.toISOString().slice(0, 10)}_${now.getHours()}h${now.getMinutes()}m.json`;

    try {
      // Try to save via backup server
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: JSON.parse(db.exportData()),
          filename,
          backupPath
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Đã lưu backup thành công!\n\n📁 Đường dẫn: ${result.filePath}\n💾 Kích thước: ${result.size}`);
        loadBackupsFromDisk(); // Refresh list
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      // Fallback to download if server not running
      alert('⚠️ Backup Server không chạy!\n\nVui lòng restart app bằng lệnh:\nnpm run dev\n\n(Sẽ tải file backup về Downloads thay thế)');

      const data = db.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.newPassword) {
      alert('Vui lòng nhập mật khẩu mới!');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Mật khẩu xác nhận không khớp!');
      return;
    }
    if (passwordForm.newPassword.length < 4) {
      alert('Mật khẩu quá ngắn!');
      return;
    }

    setSettings({ ...settings, adminPassword: passwordForm.newPassword });
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    // Save immediately for security, or rely on main Save button? 
    // relying on main Save button is consistent but might confuse user if they forget.
    // Let's stick to state update and let user click Save Settings.
    alert('Đã cập nhật mật khẩu tạm thời.\n\nVui lòng nhấn nút "Lưu Cài Đặt" bên dưới để hoàn tất thay đổi.');
  };

  const handleDeleteBackup = async (record: BackupRecord) => {
    if (!confirm(`Xóa file backup "${record.filename}"?\n\nFile sẽ bị xóa vĩnh viễn!`)) return;

    try {
      const response = await fetch('/api/backup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: record.path })
      });

      const result = await response.json();
      if (result.success) {
        alert('Đã xóa file backup!');
        loadBackupsFromDisk();
      } else {
        alert('Lỗi: ' + result.message);
      }
    } catch (error) {
      // Fallback to localStorage only
      const updated = backupHistory.filter(b => b.id !== record.id);
      setBackupHistory(updated);
      localStorage.setItem('clinic_backup_history', JSON.stringify(updated));
    }
  };

  // Khôi phục từ file backup đã lưu trên server
  const handleRestoreFromBackup = async (record: BackupRecord) => {
    if (!confirm(`Khôi phục dữ liệu từ backup "${record.filename}"?\n\n⚠️ Dữ liệu hiện tại sẽ bị GHI ĐÈ!`)) return;

    try {
      const response = await fetch(`/api/backup/restore?path=${encodeURIComponent(record.path)}`);
      const result = await response.json();

      if (result.success && result.data) {
        // Import data từ server
        const dataString = JSON.stringify(result.data);
        if (db.importData(dataString)) {
          alert(`✅ Khôi phục dữ liệu thành công từ:\n${record.filename}\n\nTrang sẽ tải lại.`);
          window.location.reload();
        } else {
          alert('❌ Dữ liệu backup không hợp lệ!');
        }
      } else {
        throw new Error(result.message || 'Không thể đọc file backup');
      }
    } catch (error: any) {
      alert(`❌ Lỗi khôi phục: ${error.message}\n\nHãy thử chọn file thủ công bằng nút "Khôi phục dữ liệu" ở trên.`);
    }
  };


  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (db.importData(content)) {
        alert('Khôi phục dữ liệu thành công! Trang sẽ tải lại.');
        window.location.reload();
      } else {
        alert('File không hợp lệ!');
      }
    };
    reader.readAsText(file);
  };

  // Load dữ liệu test
  const handleLoadSeedData = () => {
    if (!confirm('\u26a0\ufe0f BẠN CÓ CHẮC MUỐN LOAD DỮ LIỆU TEST?\n\nHành động này sẽ:\n- Thêm 25 loại tròng kính\n- Thêm 16 loại gọng kính\n- Thêm 15 loại thuốc mắt\n- Tạo 50 bệnh nhân mẫu\n- Tạo 80 hóa đơn ở nhiều tháng khác nhau\n\nDữ liệu hiện tại sẽ được GHI ĐÈ!')) return;

    try {
      const seedData = getSeedData();
      const currentSettings = db.getSettings();

      // Import data
      const dataToImport = {
        patients: seedData.patients,
        inventory: seedData.inventory,
        invoices: seedData.invoices,
        settings: currentSettings
      };

      if (db.importData(JSON.stringify(dataToImport))) {
        alert(`\u2705 ĐÃ LOAD DỮ LIỆU TEST THÀNH CÔNG!\n\n\ud83d\udc53 Tròng kính: ${seedData.inventory.filter((i: any) => i.category === 'lens').length} loại\n\ud83e\udd7d Gọng kính: ${seedData.inventory.filter((i: any) => i.category === 'frame').length} loại\n\ud83d\udc8a Thuốc: ${seedData.inventory.filter((i: any) => i.category === 'medicine').length} loại\n\ud83d\udc65 Bệnh nhân: ${seedData.patients.length} người\n\ud83e\uddfe Hóa đơn: ${seedData.invoices.length} đơn\n\nTrang sẽ tải lại...`);
        window.location.reload();
      } else {
        alert('\u274c Lỗi khi load dữ liệu test!');
      }
    } catch (error: any) {
      alert(`\u274c Lỗi: ${error.message}`);
    }
  };

  const tabs = [
    { id: 'general' as const, label: 'Thông tin chung', icon: SettingsIcon },
    { id: 'vat' as const, label: 'Thuế VAT', icon: Receipt },
    { id: 'invoice' as const, label: 'Hóa đơn', icon: FileText },
    { id: 'ticket' as const, label: 'Phiếu STT', icon: Ticket },
    { id: 'refraction' as const, label: 'Phiếu khúc xạ', icon: Glasses },
    { id: 'backup' as const, label: 'Sao lưu', icon: Database },
    { id: 'security' as const, label: 'Bảo mật & Admin', icon: Lock },
  ];

  return (
    <div className="flex gap-6 h-full">
      {/* Sidebar Tabs */}
      <div className="w-56 bg-white rounded-xl shadow-sm p-4">
        <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">Cài Đặt</h3>
        <div className="space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${activeTab === tab.id
                ? 'bg-brand-100 text-brand-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white rounded-xl shadow-sm p-6 overflow-y-auto">
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-3">Thông Tin Phòng Khám</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên phòng khám *</label>
                <input
                  value={settings.name}
                  onChange={e => setSettings({ ...settings, name: e.target.value })}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên bác sĩ *</label>
                <input
                  value={settings.doctorName || ''}
                  onChange={e => setSettings({ ...settings, doctorName: e.target.value })}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                <input
                  value={settings.address}
                  onChange={e => setSettings({ ...settings, address: e.target.value })}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại *</label>
                <input
                  value={settings.phone}
                  onChange={e => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  value={settings.email}
                  onChange={e => setSettings({ ...settings, email: e.target.value })}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Giờ làm việc</label>
                <input
                  value={settings.workingHours || ''}
                  onChange={e => setSettings({ ...settings, workingHours: e.target.value })}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-brand-500"
                  placeholder="Từ 8h đến 19h, Thứ hai đến Chủ nhật"
                />
              </div>
            </div>
          </div>
        )}

        {/* VAT Settings */}
        {activeTab === 'vat' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-3">Cài Đặt Thuế VAT</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.vat?.enabled || false}
                  onChange={e => setSettings({ ...settings, vat: { ...settings.vat!, enabled: e.target.checked } })}
                  className="w-5 h-5"
                />
                <span className="font-medium">Bật tính thuế VAT trên hóa đơn</span>
              </label>
            </div>
            {settings.vat?.enabled && (
              <div className="max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-1">Thuế suất VAT (%)</label>
                <input
                  type="number"
                  value={settings.vat?.rate || 10}
                  onChange={e => setSettings({ ...settings, vat: { ...settings.vat!, rate: parseInt(e.target.value) || 0 } })}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-brand-500"
                  min="0"
                  max="100"
                />
                <p className="text-xs text-gray-500 mt-1">Thuế suất thông thường: 10%</p>
              </div>
            )}
          </div>
        )}

        {/* Invoice Settings */}
        {activeTab === 'invoice' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-3">Tùy Chỉnh Hóa Đơn (Thermal 50mm)</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề hóa đơn</label>
                <input
                  value={settings.invoice?.header || ''}
                  onChange={e => setSettings({ ...settings, invoice: { ...settings.invoice!, header: e.target.value } })}
                  className="w-full border rounded-lg p-3"
                  placeholder="HÓA ĐƠN BÁN LẺ"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    checked={settings.invoice?.showLogo || false}
                    onChange={e => setSettings({ ...settings, invoice: { ...settings.invoice!, showLogo: e.target.checked } })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Hiển thị logo</span>
                </label>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Chân trang (Lời cảm ơn)</label>
                <textarea
                  value={settings.invoice?.footer || ''}
                  onChange={e => setSettings({ ...settings, invoice: { ...settings.invoice!, footer: e.target.value } })}
                  className="w-full border rounded-lg p-3 h-24"
                  placeholder="Cảm ơn quý khách!"
                />
              </div>
            </div>
            {/* Preview */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Xem trước:</h4>
              <div className="bg-gray-100 p-4 rounded-lg max-w-[200px] mx-auto text-center text-xs">
                <p className="font-bold">{settings.name}</p>
                <p>{settings.doctorName}</p>
                <p className="border-t border-dashed mt-2 pt-2 font-bold">{settings.invoice?.header}</p>
                <p className="text-gray-400 my-2">[Nội dung hóa đơn]</p>
                <p className="border-t border-dashed pt-2">{settings.invoice?.footer}</p>
              </div>
            </div>
          </div>
        )}

        {/* Ticket Settings */}
        {activeTab === 'ticket' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-3">Tùy Chỉnh Phiếu Số Thứ Tự (57mm x 50mm)</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề chính</label>
                <input
                  value={settings.ticket?.header || ''}
                  onChange={e => setSettings({ ...settings, ticket: { ...settings.ticket!, header: e.target.value } })}
                  className="w-full border rounded-lg p-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề phụ (Tên BS)</label>
                <input
                  value={settings.ticket?.subHeader || ''}
                  onChange={e => setSettings({ ...settings, ticket: { ...settings.ticket!, subHeader: e.target.value } })}
                  className="w-full border rounded-lg p-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <input
                  value={settings.ticket?.note || ''}
                  onChange={e => setSettings({ ...settings, ticket: { ...settings.ticket!, note: e.target.value } })}
                  className="w-full border rounded-lg p-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chân trang</label>
                <input
                  value={settings.ticket?.footer || ''}
                  onChange={e => setSettings({ ...settings, ticket: { ...settings.ticket!, footer: e.target.value } })}
                  className="w-full border rounded-lg p-3"
                />
              </div>
            </div>
            {/* Preview */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Xem trước:</h4>
              <div className="bg-gray-100 p-4 rounded-lg max-w-[200px] mx-auto text-center text-xs border">
                <p className="font-bold uppercase">{settings.ticket?.header}</p>
                <p>{settings.ticket?.subHeader}</p>
                <p className="text-4xl font-bold border-y border-black my-2 py-2">101</p>
                <p className="font-medium">Nguyen Van A</p>
                <p className="text-gray-500">{settings.ticket?.note}</p>
                <p className="text-gray-400">{settings.ticket?.footer} DD/MM/YYYY</p>
              </div>
            </div>
          </div>
        )}

        {/* Refraction Settings */}
        {activeTab === 'refraction' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-3">Tùy Chỉnh Phiếu Khúc Xạ (A5)</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề trái</label>
                <input
                  value={settings.refraction?.header || ''}
                  onChange={e => setSettings({ ...settings, refraction: { ...settings.refraction!, header: e.target.value } })}
                  className="w-full border rounded-lg p-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề phải</label>
                <input
                  value={settings.refraction?.rightHeader || ''}
                  onChange={e => setSettings({ ...settings, refraction: { ...settings.refraction!, rightHeader: e.target.value } })}
                  className="w-full border rounded-lg p-3"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Lưu ý 1</label>
                <textarea
                  value={settings.refraction?.disclaimer1 || ''}
                  onChange={e => setSettings({ ...settings, refraction: { ...settings.refraction!, disclaimer1: e.target.value } })}
                  className="w-full border rounded-lg p-3 h-20"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Lưu ý 2</label>
                <textarea
                  value={settings.refraction?.disclaimer2 || ''}
                  onChange={e => setSettings({ ...settings, refraction: { ...settings.refraction!, disclaimer2: e.target.value } })}
                  className="w-full border rounded-lg p-3 h-20"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-3 flex items-center gap-2">
              <Database size={24} className="text-brand-600" /> Sao Lưu & Khôi Phục
            </h2>

            {/* Manual Backup/Restore Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleBackup}
                className="py-6 border-2 border-dashed border-brand-300 rounded-lg hover:bg-brand-50 flex flex-col items-center justify-center gap-2 transition-colors"
              >
                <Download size={32} className="text-brand-600" />
                <span className="font-medium">Tải xuống bản sao lưu</span>
                <span className="text-xs text-gray-500">Lưu toàn bộ dữ liệu về file .json</span>
              </button>

              <label className="py-6 border-2 border-dashed border-orange-300 rounded-lg hover:bg-orange-50 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer">
                <Upload size={32} className="text-orange-500" />
                <span className="font-medium">Khôi phục dữ liệu</span>
                <span className="text-xs text-gray-500">Chọn file .json để khôi phục</span>
                <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleRestore} />
              </label>
            </div>

            {/* Load Test Data */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
              <h3 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                <Zap size={20} /> Load Dữ Liệu Test (Demo)
              </h3>
              <p className="text-sm text-purple-600 mb-4">
                Load dữ liệu mẫu để test hệ thống: bao gồm nhiều loại tròng kính, gọng kính, thuốc mắt, bệnh nhân và hóa đơn ở nhiều tháng khác nhau.
              </p>
              <button
                onClick={handleLoadSeedData}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2 shadow-lg"
              >
                <Zap size={18} />
                Load Dữ Liệu Test
              </button>
              <p className="text-xs text-purple-500 mt-2">⚠️ Cảnh báo: Dữ liệu hiện tại sẽ bị ghi đè!</p>
            </div>

            {/* Auto Backup Config */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <Shield size={18} /> Cấu hình sao lưu tự động (Local)
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đường dẫn lưu file</label>
                  <input
                    value={settings.backup?.path || ''}
                    onChange={e => setSettings({ ...settings, backup: { ...settings.backup!, path: e.target.value } })}
                    className="w-full border rounded-lg p-3"
                    placeholder="C:\EyeClinicBackup"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giới hạn số file backup</label>
                  <input
                    type="number"
                    value={settings.backup?.maxFiles || 10}
                    onChange={e => setSettings({ ...settings, backup: { ...settings.backup!, maxFiles: parseInt(e.target.value) || 10 } })}
                    className="w-full border rounded-lg p-3"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-6 pt-4 border-t">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.backup?.autoBackupOnClose || false}
                    onChange={e => setSettings({ ...settings, backup: { ...settings.backup!, autoBackupOnClose: e.target.checked } })}
                    className="w-5 h-5"
                  />
                  <span>Tự động backup khi đóng ứng dụng</span>
                </label>
              </div>
            </div>

            {/* History List */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-4">
                <FolderOpen size={18} /> Lịch Sử Sao Lưu ({backupHistory.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {backupHistory.map((record, index) => (
                  <div key={record.id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-sm font-medium">{record.filename}</div>
                      <div className="text-xs text-gray-500">{new Date(record.date).toLocaleString('vi-VN')}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestoreFromBackup(record)}
                        className="text-green-600 hover:bg-green-50 px-2 py-1 rounded flex items-center gap-1 text-sm font-medium"
                        title="Khôi phục từ backup này"
                      >
                        <Upload size={14} /> Khôi phục
                      </button>
                      <button onClick={() => handleDeleteBackup(record)} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Xóa backup"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                {backupHistory.length === 0 && <p className="text-center text-gray-500 py-4">Chưa có bản sao lưu nào.</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-3 flex items-center gap-2">
              <Shield size={24} className="text-brand-600" /> Bảo Mật & Quản Trị Viên
            </h2>

            <div className="bg-red-50 p-6 rounded-lg border border-red-100 mb-6">
              <h3 className="font-bold text-red-800 mb-2 text-lg">Đổi Mật Khẩu Admin</h3>
              <p className="text-sm text-red-600 mb-6">
                Mật khẩu này được dùng để truy cập các tính năng quản trị cao cấp như Quản lý Kho, Thống kê doanh thu và Cài đặt hệ thống.
              </p>

              <form className="space-y-4 max-w-md bg-white p-6 rounded shadow-sm border">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                  <input
                    type="password"
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none"
                    placeholder="Nhập mật khẩu mới..."
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
                  <input
                    type="password"
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none"
                    placeholder="Nhập lại mật khẩu..."
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  className="w-full bg-red-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-red-700 transition-colors shadow-lg"
                >
                  Cập nhật mật khẩu
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t mt-6">
          <button
            onClick={handleSave}
            className="bg-brand-600 text-white px-8 py-3 rounded-lg shadow-lg hover:bg-brand-700 flex items-center gap-2 font-bold"
          >
            <Save size={20} /> Lưu Cài Đặt
          </button>
        </div>
      </div>
    </div >
  );
};