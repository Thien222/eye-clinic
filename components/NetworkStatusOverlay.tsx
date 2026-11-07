import React, { useEffect, useState } from 'react';
import { AlertTriangle, WifiOff, ServerCrash } from 'lucide-react';
import { ConnectionStatus } from '../services/db';
import { Button } from './ui/Button';

interface NetworkStatusOverlayProps {
  status: ConnectionStatus;
}

export const NetworkStatusOverlay: React.FC<NetworkStatusOverlayProps> = ({ status }) => {
  const [dismissed, setDismissed] = useState(false);
  const [serverDown, setServerDown] = useState(false);

  useEffect(() => {
    if (status === 'connected') {
      setDismissed(false);
      setServerDown(false);
      return;
    }

    const timer = setTimeout(() => {
      if (status !== 'connected') setDismissed(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (status === 'connected') return;

    const checkServer = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch('/api/database', { signal: controller.signal });
        clearTimeout(timeout);
        setServerDown(!res.ok);
      } catch {
        setServerDown(true);
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 8000);
    return () => clearInterval(interval);
  }, [status]);

  if (status === 'connected') return null;

  const isOffline = status === 'offline' || serverDown;

  const title = isOffline
    ? 'Máy chủ không phản hồi'
    : status === 'disconnected'
      ? 'Mất kết nối đồng bộ'
      : 'Đang đồng bộ dữ liệu';

  const message = isOffline
    ? 'Phần mềm vẫn dùng được trên máy này, nhưng dữ liệu có thể không lưu lên server hoặc không đồng bộ sang máy khác. Hãy kiểm tra Wi-Fi và đảm bảo server đang chạy (start.bat / npm run dev).'
    : status === 'disconnected'
      ? 'Đang thử kết nối lại server. Tránh tắt máy cho đến khi thấy "Đồng bộ OK".'
      : 'Đang cập nhật dữ liệu từ server...';

  const ToastIcon = isOffline ? ServerCrash : WifiOff;

  return (
    <>
      {/* Thanh cảnh báo cố định — luôn hiện khi có sự cố */}
      <div
        role="status"
        className={`fixed bottom-4 right-4 left-4 sm:left-auto z-[90] sm:max-w-sm rounded-xl border shadow-card p-4 animate-fade-in-up no-print ${
          isOffline ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${isOffline ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
            <ToastIcon size={18} aria-hidden />
          </div>
          <div className="flex-1 min-w-0 text-sm">
            <p className={`font-semibold ${isOffline ? 'text-red-800' : 'text-amber-800'}`}>{title}</p>
            <p className={`mt-1 leading-relaxed ${isOffline ? 'text-red-700' : 'text-amber-700'}`}>{message}</p>
          </div>
        </div>
      </div>

      {/* Modal — hiện 1 lần khi mất kết nối nghiêm trọng */}
      {isOffline && !dismissed && (
        <div className="fixed inset-0 z-[95] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-md bg-white rounded-2xl shadow-2xl animate-modal-in">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle size={20} aria-hidden />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-slate-900">Cảnh báo kết nối</h3>
                <p className="text-sm text-slate-500">Đây không phải lỗi phần mềm</p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                Hệ thống không kết nối được máy chủ đồng bộ. Dữ liệu bạn nhập có thể chỉ lưu trên máy này.
                Khi mạng ổn định, hãy mở lại phần mềm hoặc chờ banner chuyển sang <strong>"Đồng bộ OK"</strong>.
              </p>
              <ul className="subtle-panel p-4 text-sm text-slate-600 space-y-1.5 list-disc pl-9">
                <li>Kiểm tra cáp mạng / Wi-Fi</li>
                <li>Chạy lại server: <code className="bg-white ring-1 ring-inset ring-slate-200 px-1.5 py-0.5 rounded text-slate-800">start.bat</code></li>
                <li>Liên hệ kỹ thuật nếu server máy chủ tắt</li>
              </ul>
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <Button variant="primary" fullWidth onClick={() => setDismissed(true)}>
                Đã hiểu, tiếp tục làm việc
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
