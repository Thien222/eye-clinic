import { useEffect, useRef } from 'react';

/**
 * Lắng nghe sự kiện 'clinic-db-updated' (phát ra khi dữ liệu đồng bộ thay đổi)
 * và gọi callback mỗi khi có cập nhật. Tự động gọi callback một lần khi mount
 * (trừ khi truyền runOnMount = false).
 */
export function useClinicDbUpdated(callback: () => void, runOnMount: boolean = true): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (runOnMount) callbackRef.current();
    const handler = () => callbackRef.current();
    window.addEventListener('clinic-db-updated', handler);
    return () => window.removeEventListener('clinic-db-updated', handler);
  }, [runOnMount]);
}
