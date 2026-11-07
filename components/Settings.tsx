import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { useClinicDbUpdated } from '../hooks/useClinicDbUpdated';
import { ClinicSettings } from '../types';
import { Save, Download, Upload, Settings as SettingsIcon, Database, FileText, Ticket, Glasses, Receipt, Shield, Trash2, FolderOpen, Lock, Building2, Printer, Eye, Info, RefreshCw, KeyRound } from 'lucide-react';
import { PageHeader, Card, Field, Button, IconButton, Badge, EmptyState } from './ui';

type SettingsTab = 'general' | 'vat' | 'refraction' | 'backup' | 'security';

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
      disclaimer1: 'Khách hàng đã được đeo thử kính và cảm thấy thoải mái khi đi lại, không có hiện tượng nhức mắt hay đau đầu. Mức độ thích nghi của mỗi người có thể khác nhau, vì vậy thời gian làm quen với kính có thể từ 5–7 ngày.',
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

  // Function to load settings from db
  const loadSettingsFromDb = () => {
    const saved = db.getSettings();
    if (saved) {
      // Deep merge to preserve nested settings like backup path
      setSettings(prev => ({
        ...prev,
        ...saved,
        backup: {
          ...prev.backup,
          ...saved.backup
        },
        refraction: {
          ...prev.refraction,
          ...saved.refraction
        },
        invoice: {
          ...prev.invoice,
          ...saved.invoice
        },
        ticket: {
          ...prev.ticket,
          ...saved.ticket
        },
        vat: {
          ...prev.vat,
          ...saved.vat
        }
      }));
    }
  };

  useClinicDbUpdated(() => loadSettingsFromDb());

  // Load backups when switching to backup tab
  useEffect(() => {
    if (activeTab === 'backup') {
      loadBackupsFromDisk();
    }
  }, [activeTab]);

  const loadBackupsFromDisk = async () => {
    try {
      // Load from default server backup folder first (no path = use server default)
      const response = await fetch('/api/backups');
      const result = await response.json();

      let allRecords: BackupRecord[] = [];

      if (result.success && result.files) {
        allRecords = result.files.map((f: any) => ({
          id: f.path,
          filename: f.filename,
          date: f.date,
          size: f.size,
          path: f.path
        }));
      }

      // Also try to load from custom path if set and different from default
      const customPath = settings.backup?.path;
      if (customPath) {
        try {
          const customResponse = await fetch(`/api/backups?path=${encodeURIComponent(customPath)}`);
          const customResult = await customResponse.json();
          if (customResult.success && customResult.files) {
            const customRecords = customResult.files.map((f: any) => ({
              id: f.path,
              filename: f.filename,
              date: f.date,
              size: f.size,
              path: f.path
            }));
            // Merge and deduplicate by path
            const existingPaths = new Set(allRecords.map(r => r.path));
            customRecords.forEach((r: BackupRecord) => {
              if (!existingPaths.has(r.path)) {
                allRecords.push(r);
              }
            });
          }
        } catch (e) { /* custom path not accessible */ }
      }

      // Sort by date descending
      allRecords.sort((a, b) => b.date - a.date);
      setBackupHistory(allRecords);
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
    const refraction = settings.refraction || { header: '', rightHeader: '', disclaimer1: '', disclaimer2: '' };
    const ticket = settings.ticket || { header: '', subHeader: '', note: '', footer: '' };
    const invoice = settings.invoice || { header: '', footer: '', showLogo: false };

    const syncName = settings.name?.trim() || '';
    const syncDoctor = settings.doctorName?.trim() || '';

    // Đồng bộ phiếu STT & phiếu KX với thông tin chung mỗi khi Lưu
    const syncedTicket = {
      ...ticket,
      header: syncName || ticket.header?.trim() || '',
      subHeader: syncDoctor || ticket.subHeader?.trim() || '',
    };
    const syncedRefraction = {
      ...refraction,
      header: refraction.header?.trim() || syncName,
    };
    const toSave = {
      ...settings,
      refraction: syncedRefraction,
      ticket: syncedTicket,
      invoice: {
        ...invoice,
        header: invoice.header?.trim() || 'HÓA ĐƠN BÁN LẺ',
      },
      vat: settings.vat || { enabled: false, rate: 10 },
      backup: settings.backup || { path: '', maxFiles: 10, autoBackupOnClose: true, autoBackupInterval: 4 },
    };
    db.saveSettings(toSave);
    setSettings(toSave);
    alert('Đã lưu cài đặt thành công! Tên phòng khám sẽ hiển thị đồng nhất khi in phiếu chờ, phiếu khúc xạ và hóa đơn.');
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
        if (await db.importDataAndWait(dataString)) {
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


  const handleLoadTestData = async () => {
    if (!confirm('Nạp dữ liệu TEST?\n\nSẽ thay thế toàn bộ BN, kho hàng, hóa đơn hiện tại bằng dữ liệu mẫu để test.')) return;
    try {
      const res = await fetch('/api/test-data/load', { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        alert(`✅ ${result.message}\n\nTrang sẽ tải lại.`);
        window.location.reload();
        return;
      }
      throw new Error(result.message || 'API lỗi');
    } catch (apiErr: any) {
      const ok = await db.loadTestData();
      if (ok) {
        alert('✅ Đã nạp dữ liệu test! Trang sẽ tải lại.');
        window.location.reload();
      } else {
        alert(`❌ Không nạp được dữ liệu test.\n\n1. Chạy: node scripts/generateTestData.js\n2. Khởi động server: npm run dev\n3. Thử lại\n\nLỗi: ${apiErr.message}`);
      }
    }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (await db.importDataAndWait(content)) {
        alert('Khôi phục dữ liệu thành công! Trang sẽ tải lại.');
        window.location.reload();
      } else {
        alert('File không hợp lệ!');
      }
    };
    reader.readAsText(file);
  };



  const tabs = [
    { id: 'general' as const, label: 'Thông tin chung', icon: SettingsIcon },
    { id: 'vat' as const, label: 'Thuế VAT', icon: Receipt },
    { id: 'refraction' as const, label: 'Phiếu khúc xạ', icon: Glasses },
    { id: 'backup' as const, label: 'Sao lưu', icon: Database },
    { id: 'security' as const, label: 'Bảo mật & Admin', icon: Lock },
  ];

  return (
    <div className="max-w-7xl mx-auto w-full page-fill">
      <PageHeader
        title="Cài đặt"
        subtitle="Thông tin phòng khám, nội dung phiếu in, thuế, sao lưu và bảo mật"
        icon={SettingsIcon}
      />

      <div className="flex flex-col lg:flex-row gap-6 items-start fill-y">
        {/* Sidebar Tabs */}
        <nav className="w-full lg:w-80 shrink-0 clinic-card p-2 lg:self-start lg:max-h-full lg:overflow-y-auto scroll-thin" aria-label="Mục cài đặt">
          <div className="flex lg:flex-col gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                className={`shrink-0 lg:w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${activeTab === tab.id
                  ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200/60'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <tab.icon size={18} aria-hidden />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 min-w-0 w-full space-y-6 lg:flex lg:flex-col lg:self-stretch lg:min-h-0">
          <div className="page-scroll space-y-6 lg:-mx-1 lg:px-1 lg:pt-0.5 lg:pb-1">
          {/* General Settings */}
          {activeTab === 'general' && (
            <>
              <Card title="Thông tin phòng khám" icon={Building2} padding="lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Tên phòng khám" required htmlFor="set-name">
                    <input
                      id="set-name"
                      value={settings.name}
                      onChange={e => {
                        const name = e.target.value;
                        setSettings(prev => {
                          const next = { ...prev, name };
                          const oldHeader = prev.refraction?.header?.trim();
                          const oldName = prev.name?.trim();
                          if (!oldHeader || oldHeader === oldName) {
                            next.refraction = { ...prev.refraction!, header: name };
                          }
                          return next;
                        });
                      }}
                      className="clinic-input"
                    />
                  </Field>
                  <Field label="Tên bác sĩ" required htmlFor="set-doctor">
                    <input
                      id="set-doctor"
                      value={settings.doctorName || ''}
                      onChange={e => setSettings({ ...settings, doctorName: e.target.value })}
                      className="clinic-input"
                    />
                  </Field>
                  <Field label="Địa chỉ" htmlFor="set-address" className="md:col-span-2">
                    <input
                      id="set-address"
                      value={settings.address}
                      onChange={e => setSettings({ ...settings, address: e.target.value })}
                      className="clinic-input"
                    />
                  </Field>
                  <Field label="Số điện thoại" required htmlFor="set-phone">
                    <input
                      id="set-phone"
                      value={settings.phone}
                      onChange={e => setSettings({ ...settings, phone: e.target.value })}
                      className="clinic-input"
                    />
                  </Field>
                  <Field label="Email" htmlFor="set-email">
                    <input
                      id="set-email"
                      value={settings.email}
                      onChange={e => setSettings({ ...settings, email: e.target.value })}
                      className="clinic-input"
                    />
                  </Field>
                  <Field label="Giờ làm việc" htmlFor="set-hours" className="md:col-span-2">
                    <input
                      id="set-hours"
                      value={settings.workingHours || ''}
                      onChange={e => setSettings({ ...settings, workingHours: e.target.value })}
                      className="clinic-input"
                      placeholder="Từ 8h đến 19h, Thứ hai đến Chủ nhật"
                    />
                  </Field>
                  <Field label="Logo (URL ảnh hoặc base64)" htmlFor="set-logo" className="md:col-span-2">
                    <input
                      id="set-logo"
                      value={settings.logoUrl || ''}
                      onChange={e => setSettings({ ...settings, logoUrl: e.target.value })}
                      className="clinic-input"
                      placeholder="https://... hoặc data:image/png;base64,..."
                    />
                    {settings.logoUrl && (
                      <div className="mt-3 inline-flex subtle-panel p-2">
                        <img src={settings.logoUrl} alt="Logo preview" className="max-h-16 object-contain" />
                      </div>
                    )}
                  </Field>
                </div>
              </Card>

              {/* Tùy chỉnh nội dung phiếu in */}
              <Card title="Tùy chỉnh nội dung phiếu in" icon={Printer} padding="lg">
                <div className="space-y-4">
                  {/* Hóa đơn */}
                  <div className="subtle-panel p-4">
                    <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <FileText size={16} className="text-brand-600" aria-hidden /> Hóa đơn bán hàng
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Tiêu đề hóa đơn" htmlFor="set-inv-header">
                        <input
                          id="set-inv-header"
                          value={settings.invoice?.header || ''}
                          onChange={e => setSettings({ ...settings, invoice: { ...settings.invoice!, header: e.target.value } })}
                          className="clinic-input"
                          placeholder="HÓA ĐƠN BÁN LẺ"
                        />
                      </Field>
                      <Field label="Dòng chân hóa đơn" htmlFor="set-inv-footer">
                        <input
                          id="set-inv-footer"
                          value={settings.invoice?.footer || ''}
                          onChange={e => setSettings({ ...settings, invoice: { ...settings.invoice!, footer: e.target.value } })}
                          className="clinic-input"
                          placeholder="Cảm ơn quý khách!"
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Phiếu STT */}
                  <div className="subtle-panel p-4">
                    <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Ticket size={16} className="text-brand-600" aria-hidden /> Phiếu số thứ tự
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Tên trên phiếu STT" htmlFor="set-tk-header" help="Để trống = dùng tên phòng khám ở trên">
                        <input
                          id="set-tk-header"
                          value={settings.ticket?.header || ''}
                          onChange={e => setSettings({ ...settings, ticket: { ...settings.ticket!, header: e.target.value } })}
                          className="clinic-input"
                          placeholder={settings.name || 'PHÒNG KHÁM MẮT NGOÀI GIỜ'}
                        />
                      </Field>
                      <Field label="Dòng phụ trên phiếu STT" htmlFor="set-tk-sub" help="Để trống = dùng tên bác sĩ ở trên">
                        <input
                          id="set-tk-sub"
                          value={settings.ticket?.subHeader || ''}
                          onChange={e => setSettings({ ...settings, ticket: { ...settings.ticket!, subHeader: e.target.value } })}
                          className="clinic-input"
                          placeholder={settings.doctorName || 'Tên bác sĩ'}
                        />
                      </Field>
                      <Field label="Ghi chú phiếu STT" htmlFor="set-tk-note">
                        <input
                          id="set-tk-note"
                          value={settings.ticket?.note || ''}
                          onChange={e => setSettings({ ...settings, ticket: { ...settings.ticket!, note: e.target.value } })}
                          className="clinic-input"
                          placeholder="Khách hàng vui lòng chờ đến STT"
                        />
                      </Field>
                      <Field label="Dòng chân phiếu STT" htmlFor="set-tk-footer">
                        <input
                          id="set-tk-footer"
                          value={settings.ticket?.footer || ''}
                          onChange={e => setSettings({ ...settings, ticket: { ...settings.ticket!, footer: e.target.value } })}
                          className="clinic-input"
                          placeholder="Phiếu có hiệu lực trong ngày"
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Xem trước các phiếu in */}
              <Card title="Xem trước phiếu in" icon={Eye} padding="lg">
                <p className="text-sm text-slate-500 mb-4">
                  Xem trước sẽ cập nhật theo nội dung bạn nhập ở trên.
                </p>
                <div className="flex flex-wrap gap-6 justify-center sm:justify-start">
                  {/* Xem trước hóa đơn */}
                  <div className="subtle-panel p-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <FileText size={16} className="text-slate-500" aria-hidden /> Hóa đơn (thermal 50mm)
                    </h4>
                    <div className="bg-white p-4 rounded-lg w-[200px] mx-auto text-center text-xs text-slate-900 border border-slate-200 shadow-soft">
                      <p className="font-bold uppercase">{settings.name}</p>
                      <p>{settings.doctorName}</p>
                      {settings.phone && <p>ĐT: {settings.phone}</p>}
                      <p className="border-t border-dashed border-slate-400 mt-2 pt-2 font-bold">{settings.invoice?.header || 'HÓA ĐƠN BÁN LẺ'}</p>
                      <p className="text-slate-500 my-2">[Nội dung hóa đơn]</p>
                      <p className="border-t border-dashed border-slate-400 pt-2 italic">{settings.invoice?.footer || 'Cảm ơn quý khách!'}</p>
                    </div>
                  </div>

                  {/* Xem trước phiếu STT */}
                  <div className="subtle-panel p-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <Ticket size={16} className="text-slate-500" aria-hidden /> Phiếu số thứ tự (57mm x 50mm)
                    </h4>
                    <div className="bg-white p-4 rounded-lg w-[200px] mx-auto text-center text-xs text-slate-900 border border-slate-200 shadow-soft">
                      <p className="font-bold uppercase">{settings.name}</p>
                      <p>{settings.doctorName}</p>
                      <p className="text-4xl font-bold border-y border-slate-900 my-2 py-2 tabular-nums">101</p>
                      <p className="font-medium">Nguyễn Văn A</p>
                      <p className="text-slate-600">{settings.ticket?.note || 'Khách hàng vui lòng chờ đến STT'}</p>
                      <p className="text-slate-500">{settings.ticket?.footer || 'Phiếu có hiệu lực trong ngày'} DD/MM/YYYY</p>
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* VAT Settings */}
          {activeTab === 'vat' && (
            <Card title="Cài đặt thuế VAT" icon={Receipt} padding="lg">
              <div className="space-y-4">
                <label className="subtle-panel p-4 flex items-center gap-3 cursor-pointer hover:border-slate-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.vat?.enabled || false}
                    onChange={e => setSettings({ ...settings, vat: { ...settings.vat!, enabled: e.target.checked } })}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-900">Bật tính thuế VAT trên hóa đơn</span>
                </label>
                {settings.vat?.enabled && (
                  <Field label="Thuế suất VAT (%)" htmlFor="set-vat-rate" help="Thuế suất thông thường: 10%" className="max-w-xs">
                    <input
                      id="set-vat-rate"
                      type="number"
                      value={settings.vat?.rate || 10}
                      onChange={e => setSettings({ ...settings, vat: { ...settings.vat!, rate: parseInt(e.target.value) || 0 } })}
                      className="clinic-input tabular-nums"
                      min="0"
                      max="100"
                    />
                  </Field>
                )}
              </div>
            </Card>
          )}

          {/* Refraction Settings */}
          {activeTab === 'refraction' && (
            <Card title="Tùy chỉnh phiếu khúc xạ (A5)" icon={Glasses} padding="lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Tên phiếu (tiêu đề chính giữa)" htmlFor="set-rx-title">
                  <input
                    id="set-rx-title"
                    value={settings.refraction?.title || ''}
                    onChange={e => setSettings({ ...settings, refraction: { ...settings.refraction!, title: e.target.value } })}
                    className="clinic-input"
                    placeholder="PHIẾU KHÚC XẠ"
                  />
                </Field>
                <Field label="Tiêu đề góc phải (VD: KHÁM KHÚC XẠ)" htmlFor="set-rx-right">
                  <input
                    id="set-rx-right"
                    value={settings.refraction?.rightHeader || ''}
                    onChange={e => setSettings({ ...settings, refraction: { ...settings.refraction!, rightHeader: e.target.value } })}
                    className="clinic-input"
                    placeholder="KHÁM KHÚC XẠ"
                  />
                </Field>
                <Field label="Giờ làm việc (in góc phải, in nghiêng)" htmlFor="set-rx-hours">
                  <input
                    id="set-rx-hours"
                    value={settings.workingHours || ''}
                    onChange={e => setSettings({ ...settings, workingHours: e.target.value })}
                    className="clinic-input"
                    placeholder="Từ 8h đến 19h, Thứ hai đến Chủ nhật"
                  />
                </Field>
                <Field label="Nhãn chữ ký khách hàng" htmlFor="set-rx-sig1">
                  <input
                    id="set-rx-sig1"
                    value={settings.refraction?.sigLabel1 || ''}
                    onChange={e => setSettings({ ...settings, refraction: { ...settings.refraction!, sigLabel1: e.target.value } })}
                    className="clinic-input"
                    placeholder="Xác nhận của khách hàng"
                  />
                </Field>
                <Field label="Nhãn chữ ký người thực hiện" htmlFor="set-rx-sig2">
                  <input
                    id="set-rx-sig2"
                    value={settings.refraction?.sigLabel2 || ''}
                    onChange={e => setSettings({ ...settings, refraction: { ...settings.refraction!, sigLabel2: e.target.value } })}
                    className="clinic-input"
                    placeholder="Người thực hiện"
                  />
                </Field>
                <Field label="Chú thích dưới chữ ký" htmlFor="set-rx-sigsub">
                  <input
                    id="set-rx-sigsub"
                    value={settings.refraction?.sigSubText || ''}
                    onChange={e => setSettings({ ...settings, refraction: { ...settings.refraction!, sigSubText: e.target.value } })}
                    className="clinic-input"
                    placeholder="(Ký và ghi rõ họ tên)"
                  />
                </Field>
                <Field label="Lưu ý 1" htmlFor="set-rx-d1" className="md:col-span-2">
                  <textarea
                    id="set-rx-d1"
                    value={settings.refraction?.disclaimer1 || ''}
                    onChange={e => setSettings({ ...settings, refraction: { ...settings.refraction!, disclaimer1: e.target.value } })}
                    className="clinic-input"
                    rows={3}
                  />
                </Field>
                <Field label="Lưu ý 2" htmlFor="set-rx-d2" className="md:col-span-2">
                  <textarea
                    id="set-rx-d2"
                    value={settings.refraction?.disclaimer2 || ''}
                    onChange={e => setSettings({ ...settings, refraction: { ...settings.refraction!, disclaimer2: e.target.value } })}
                    className="clinic-input"
                    rows={3}
                  />
                </Field>
              </div>
              <p className="clinic-help mt-4 flex items-center gap-1.5">
                <Info size={14} aria-hidden /> Tên phòng khám và bác sĩ lấy từ tab Thông tin chung (góc trái phiếu in).
              </p>
            </Card>
          )}

          {activeTab === 'backup' && (
            <>
              <Card title="Sao lưu & khôi phục" icon={Database} padding="lg">
                {/* Manual Backup/Restore Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={handleLoadTestData}
                    className="group p-5 border-2 border-dashed border-slate-300 rounded-xl hover:border-amber-400 hover:bg-amber-50/50 flex flex-col items-center justify-center gap-2 text-center transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <span className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100 flex items-center justify-center">
                      <Database size={22} aria-hidden />
                    </span>
                    <span className="text-sm font-semibold text-slate-900">Nạp dữ liệu TEST</span>
                    <span className="text-xs text-slate-500">8 BN + 9 SP kho + 2 HĐ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBackup}
                    className="group p-5 border-2 border-dashed border-slate-300 rounded-xl hover:border-brand-400 hover:bg-brand-50/50 flex flex-col items-center justify-center gap-2 text-center transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <span className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100 flex items-center justify-center">
                      <Download size={22} aria-hidden />
                    </span>
                    <span className="text-sm font-semibold text-slate-900">Tải xuống bản sao lưu</span>
                    <span className="text-xs text-slate-500">Lưu toàn bộ dữ liệu về file .json</span>
                  </button>

                  <label className="group p-5 border-2 border-dashed border-slate-300 rounded-xl hover:border-sky-400 hover:bg-sky-50/50 flex flex-col items-center justify-center gap-2 text-center transition-colors duration-150 cursor-pointer focus-within:ring-2 focus-within:ring-brand-500">
                    <span className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-100 flex items-center justify-center">
                      <Upload size={22} aria-hidden />
                    </span>
                    <span className="text-sm font-semibold text-slate-900">Khôi phục dữ liệu</span>
                    <span className="text-xs text-slate-500">Chọn file .json để khôi phục</span>
                    <input ref={fileInputRef} type="file" accept=".json" className="sr-only" onChange={handleRestore} />
                  </label>
                </div>
              </Card>

              {/* Auto Backup Config */}
              <Card title="Cấu hình sao lưu tự động (Local)" icon={Shield} padding="lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Đường dẫn lưu file" htmlFor="set-bk-path">
                    <input
                      id="set-bk-path"
                      value={settings.backup?.path || ''}
                      onChange={e => setSettings({ ...settings, backup: { ...settings.backup!, path: e.target.value } })}
                      className="clinic-input font-mono"
                      placeholder="C:\EyeClinicBackup"
                    />
                  </Field>
                  <Field label="Giới hạn số file backup" htmlFor="set-bk-max">
                    <input
                      id="set-bk-max"
                      type="number"
                      value={settings.backup?.maxFiles || 10}
                      onChange={e => setSettings({ ...settings, backup: { ...settings.backup!, maxFiles: parseInt(e.target.value) || 10 } })}
                      className="clinic-input tabular-nums"
                    />
                  </Field>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <label className="inline-flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.backup?.autoBackupOnClose || false}
                      onChange={e => setSettings({ ...settings, backup: { ...settings.backup!, autoBackupOnClose: e.target.checked } })}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-slate-700">Tự động backup khi đóng ứng dụng</span>
                  </label>
                </div>
              </Card>

              {/* History List */}
              <Card
                title={<>Lịch sử sao lưu <Badge tone="neutral">{backupHistory.length}</Badge></>}
                icon={FolderOpen}
                actions={
                  <Button variant="ghost" size="sm" icon={RefreshCw} onClick={loadBackupsFromDisk}>
                    Làm mới
                  </Button>
                }
              >
                {backupHistory.length === 0 ? (
                  <EmptyState icon={FolderOpen} title="Chưa có bản sao lưu nào." className="py-8" />
                ) : (
                  <div className="table-wrap max-h-80 overflow-y-auto">
                    <table className="clinic-table">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <th className="min-w-[12rem]">Tên file</th>
                          <th>Thời gian</th>
                          <th className="num">Kích thước</th>
                          <th className="text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backupHistory.map(record => (
                          <tr key={record.id}>
                            <td className="font-mono text-sm font-medium text-slate-900 break-all min-w-[12rem]">{record.filename}</td>
                            <td className="whitespace-nowrap text-slate-600 tabular-nums">{new Date(record.date).toLocaleString('vi-VN')}</td>
                            <td className="num whitespace-nowrap text-slate-600">{record.size}</td>
                            <td>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  icon={Upload}
                                  onClick={() => handleRestoreFromBackup(record)}
                                  title="Khôi phục từ backup này"
                                >
                                  Khôi phục
                                </Button>
                                <IconButton icon={Trash2} label="Xóa backup" tone="danger" size="sm" onClick={() => handleDeleteBackup(record)} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}

          {activeTab === 'security' && (
            <Card title="Bảo mật & quản trị viên" icon={Shield} padding="lg">
              <div className="max-w-md">
                <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <KeyRound size={16} className="text-brand-600" aria-hidden /> Đổi mật khẩu Admin
                </h4>
                <p className="text-sm text-slate-600 mt-1 mb-4">
                  Mật khẩu này được dùng để truy cập các tính năng quản trị cao cấp như Quản lý Kho, Thống kê doanh thu và Cài đặt hệ thống.
                </p>

                <form className="subtle-panel p-4 space-y-4">
                  <Field label="Mật khẩu mới" htmlFor="set-pw-new">
                    <input
                      id="set-pw-new"
                      type="password"
                      className="clinic-input"
                      placeholder="Nhập mật khẩu mới..."
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    />
                  </Field>
                  <Field label="Xác nhận mật khẩu" htmlFor="set-pw-confirm">
                    <input
                      id="set-pw-confirm"
                      type="password"
                      className="clinic-input"
                      placeholder="Nhập lại mật khẩu..."
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    />
                  </Field>
                  <Button type="submit" variant="outline" icon={Lock} fullWidth onClick={handleChangePassword}>
                    Cập nhật mật khẩu
                  </Button>
                </form>
              </div>
            </Card>
          )}

          </div>

          {/* Save Button — đứng yên ở đáy, nội dung phía trên tự cuộn */}
          <div className="clinic-card shrink-0 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-slate-500">Thay đổi chỉ có hiệu lực sau khi bấm Lưu cài đặt.</p>
            <Button icon={Save} onClick={handleSave}>
              Lưu Cài Đặt
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
