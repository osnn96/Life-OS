import React from 'react';
import { Priority } from '../types';

// --- Badges ---
export const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const colors = {
    [Priority.HIGH]: 'bg-red-500/20 text-red-300 border-red-500/50',
    [Priority.MEDIUM]: 'bg-orange-500/20 text-orange-300 border-orange-500/50',
    [Priority.LOW]: 'bg-green-500/20 text-green-300 border-green-500/50',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[priority]}`}>
      {priority}
    </span>
  );
};

export const StatusBadge = ({ status, color = 'blue' }: { status: string, color?: 'blue' | 'purple' | 'emerald' }) => {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs border ${colorClasses[color]}`}>
      {status}
    </span>
  );
};

// --- Layout & Cards ---
export interface CardProps {
  children?: React.ReactNode;
  className?: string;
}

export const Card = ({ children, className = '' }: CardProps) => (
  <div className={`bg-surface border border-slate-700 rounded-xl p-4 shadow-sm ${className}`}>
    {children}
  </div>
);

export const PageHeader = ({ title, action }: { title: string, action?: React.ReactNode }) => (
  <div className="flex justify-between items-center mb-6">
    <h1 className="text-2xl font-bold text-white">{title}</h1>
    {action}
  </div>
);

// --- Inputs ---
interface InputProps extends React.ComponentPropsWithoutRef<'input'> {
  label: string;
}
export const Input = ({ label, className = '', ...props }: InputProps) => (
  <div className="flex flex-col gap-1 mb-3">
    <label className="text-xs text-slate-400 font-semibold uppercase">{label}</label>
    <input 
      className={`bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${className}`}
      {...props} 
    />
  </div>
);

interface SelectProps extends React.ComponentPropsWithoutRef<'select'> {
  label: string;
  options: { value: string; label: string }[];
}
export const Select = ({ label, options, className = '', ...props }: SelectProps) => (
  <div className="flex flex-col gap-1 mb-3">
    <label className="text-xs text-slate-400 font-semibold uppercase">{label}</label>
    <select 
      className={`bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${className}`}
      {...props}
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

interface TextAreaProps extends React.ComponentPropsWithoutRef<'textarea'> {
  label: string;
}

export const TextArea = ({ label, className = '', ...props }: TextAreaProps) => (
  <div className="flex flex-col gap-1 mb-3">
    <label className="text-xs text-slate-400 font-semibold uppercase">{label}</label>
    <textarea 
      className={`bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-y min-h-[80px] ${className}`}
      {...props} 
    />
  </div>
);

// --- Modal ---
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-700 sticky top-0 bg-surface z-10">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};
