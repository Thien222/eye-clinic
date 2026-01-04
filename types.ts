export type EyeSide = 'OD' | 'OS'; // OD = Right, OS = Left

export interface EyeMetric {
  sph: string;
  cyl: string;
  axis: string;
  va: string; // Visual Acuity
  add?: string;
  pd?: string; // Pupillary Distance
}

export interface RefractionData {
  skiascopy: {
    od: EyeMetric;
    os: EyeMetric;
    cycloplegia: boolean; // Liệt điều tiết
  };
  subjective: {
    od: EyeMetric;
    os: EyeMetric;
  };
  finalRx: {
    od: EyeMetric;
    os: EyeMetric;
    lensType: string; // Single, Bifocal, Progressive
    distance: boolean;
    near: boolean;
  };
  note: string;
}

export interface MedicalRecord {
  symptoms: string;
  diagnosis: string;
  procedures: string[];
  prescriptions: PrescriptionItem[];
  followUpDate?: string;
}

export interface PrescriptionItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  usage: string;
}

export interface Patient {
  id: string;
  ticketNumber: number; // 3-digit daily reset
  fullName: string;
  dob: number; // Year
  phone: string;
  address: string;
  gender: 'Nam' | 'Nữ';
  reason: string;
  hasGlasses: boolean;
  initialVA: {
    od: string;
    os: string;
  };
  notes: string;
  status: 'waiting_refraction' | 'processing_refraction' | 'waiting_doctor' | 'processing_doctor' | 'waiting_billing' | 'completed';
  timestamp: number;
  refraction?: RefractionData;
  medical?: MedicalRecord;
}

export interface InventoryItem {
  id: string;
  code: string;
  category: 'lens' | 'frame' | 'medicine';
  name: string; // Manufacturer for lenses
  specs?: {
    sph?: string | number;
    cyl?: string | number;
    add?: string | number;
    material?: string; // 1.56, 1.61, etc.
    coating?: string;
    type?: string; // Single, Bifocal, PAL
    note?: string; // Ghi chú bổ sung
  };
  costPrice: number; // Giá nhập
  price: number; // Giá bán
  quantity: number;
  minStock: number;
  image?: string;
}

export interface Invoice {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientAddress?: string;
  items: {
    itemId: string;
    name: string;
    quantity: number;
    costPrice: number; // Giá nhập
    price: number; // Giá bán
    isLens?: boolean;
  }[];
  subtotal: number;
  discount: number; // Voucher
  surcharge: number; // Phụ thu
  total: number;
  profit?: number; // Lợi nhuận
  date: number;
}

export interface ClinicSettings {
  name: string;
  adminPassword?: string;
  doctorName?: string;
  address: string;
  phone: string;
  email: string;
  workingHours?: string;
  logoUrl?: string;
  vat?: {
    enabled: boolean;
    rate: number;
  };
  invoice?: {
    header: string;
    footer: string;
    showLogo: boolean;
  };
  ticket?: {
    header: string;
    subHeader: string;
    note: string;
    footer: string;
  };
  refraction?: {
    header: string;
    rightHeader: string;
    disclaimer1: string;
    disclaimer2: string;
  };
  backup?: {
    path: string;
    maxFiles: number;
    autoBackupOnClose: boolean;
    autoBackupInterval: number;
  };
  printTemplates?: {
    receiptHeader: string;
    receiptFooter: string;
    prescriptionHeader: string;
    prescriptionFooter: string;
  };
}