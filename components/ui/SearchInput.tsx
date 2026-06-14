import React from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  containerClassName = '',
  className = '',
  ...props
}) => (
  <div className={`relative ${containerClassName}`}>
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} aria-hidden />
    <input
      type="text"
      className={`clinic-input pl-10 ${className}`}
      {...props}
    />
  </div>
);
