import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, WifiOff, ServerCrash } from 'lucide-react';
import { ConnectionStatus } from '../services/db';

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

  return (
    <>
      {/* Thanh cảnh báo cố định — luôn hiện khi có sự cố */}
      <div className={`fixed bottom-4 right-4 z-[90] max-w-sm rounded-xl border shadow-card p-4 animate-fade-in-up no-print ${
        isOffline ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'
      }`}>
        <div className="flex items-start gap-3">
          {isOffline ? <ServerCrash className="text-red-600 flex-shrink-0 mt-0.5" size={20} /> : <WifiOff className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />}
          <div className="flex-1 text-sm">
            <p className={`font-bold ${isOffline ? 'text-red-800' : 'text-amber-800'}`}>{title}</p>
            <p className={`mt-1 ${isOffline ? 'text-red-700' : 'text-amber-700'}`}>{message}</p>
          </div>
        </div>
      </div>

      {/* Modal — hiện 1 lần khi mất kết nối nghiêm trọng */}
      {isOffline && !dismissed && (
        <div className="fixed inset-0 z-[95] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl shadow-card border border-red-200 max-w-md w-full p-6 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Cảnh báo kết nối</h3>
                <p className="text-sm text-slate-500">Đây không phải lỗi phần mềm</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed mb-4">
              Hệ thống không kết nối được máy chủ đồng bộ. Dữ liệu bạn nhập có thể chỉ lưu trên máy này.
              Khi mạng ổn định, hãy mở lại phần mềm hoặc chờ banner chuyển sang <strong>"Đồng bộ OK"</strong>.
            </p>
            <ul className="text-sm text-slate-600 space-y-1 mb-5 list-disc pl-5">
              <li>Kiểm tra cáp mạng / Wi-Fi</li>
              <li>Chạy lại server: <code className="bg-slate-100 px-1 rounded">start.bat</code></li>
              <li>Liên hệ kỹ thuật nếu server máy chủ tắt</li>
            </ul>
            <button
              onClick={() => setDismissed(true)}
              className="w-full py-2.5 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-900 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <X size={16} /> Đã hiểu, tiếp tục làm việc
            </button>
          </div>
        </div>
      )}
    </>
  );
};
