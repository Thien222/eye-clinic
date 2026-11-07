import React from 'react';

interface FieldProps {
  label: React.ReactNode;
  required?: boolean;
  help?: React.ReactNode;
  error?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

/** Nhãn + ô nhập + chú thích/lỗi — bố cục form thống nhất */
export const Field: React.FC<FieldProps> = ({ label, required, help, error, htmlFor, className = '', children }) => (
  <div className={className}>
    <label htmlFor={htmlFor} className="clinic-label">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {error ? <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">{error}</p>
      : help ? <p className="clinic-help">{help}</p> : null}
  </div>
);
