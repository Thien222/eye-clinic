import { Patient } from '../types';
import type { BadgeTone } from '../components/ui/Badge';

export type StatusVariant = 'waiting' | 'processing' | 'billing' | 'completed' | 'default';

const STATUS_MAP: Record<Patient['status'], { text: string; variant: StatusVariant }> = {
  waiting_refraction: { text: 'Chờ đo K.Xạ', variant: 'waiting' },
  processing_refraction: { text: 'Đang đo', variant: 'processing' },
  waiting_doctor: { text: 'Chờ khám', variant: 'waiting' },
  processing_doctor: { text: 'Đang khám', variant: 'processing' },
  waiting_billing: { text: 'Chờ thanh toán', variant: 'billing' },
  completed: { text: 'Hoàn thành', variant: 'completed' },
};

export const VARIANT_CLASSES: Record<StatusVariant, string> = {
  waiting: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  processing: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200',
  billing: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200',
  completed: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
  default: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};

/** Màu Badge tương ứng mỗi trạng thái — dùng với <Badge tone={...}> */
export const VARIANT_TONES: Record<StatusVariant, BadgeTone> = {
  waiting: 'warning',
  processing: 'brand',
  billing: 'info',
  completed: 'success',
  default: 'neutral',
};

export function getPatientStatus(status: Patient['status']) {
  const entry = STATUS_MAP[status];
  if (!entry) return { text: '—', className: VARIANT_CLASSES.default, tone: VARIANT_TONES.default };
  return { text: entry.text, className: VARIANT_CLASSES[entry.variant], tone: VARIANT_TONES[entry.variant] };
}
