'use client';
import { Check, AlertTriangle, Info, X } from 'lucide-react';

const icons = {
  success: <Check size={16} className="text-success" />,
  error: <AlertTriangle size={16} className="text-danger" />,
  info: <Info size={16} className="text-accent" />,
};

export default function Toast({ type = 'info', message, visible = false, onClose }) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[60] animate-slide-up">
      <div className="glass-strong rounded-xl px-5 py-3.5 flex items-center gap-3 shadow-card max-w-sm">
        {icons[type]}
        <p className="text-sm text-text flex-1">{message}</p>
        <button onClick={onClose} className="p-1 text-muted hover:text-text transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
