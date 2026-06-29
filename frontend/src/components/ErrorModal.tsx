import React from 'react';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';

interface ErrorModalProps {
  show: boolean;
  title: string;
  message: string;
  type?: 'missing_key' | 'invalid_key' | 'rate_limit' | 'bad_request' | 'generic';
  onRetry?: () => void;
  onClose: () => void;
}

export default function ErrorModal({
  show,
  title,
  message,
  type,
  onRetry,
  onClose,
}: ErrorModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative max-w-md w-full mx-4 p-8 rounded-3xl border border-red-500/20 bg-slate-950/90 text-center shadow-[0_0_50px_rgba(239,68,68,0.15)] animate-in zoom-in-95 duration-200">
        
        {/* Warn Circle Icon matching the layout and bubbles */}
        <div className="relative mx-auto mb-6 w-20 h-20 flex items-center justify-center">
          {/* Pulsing outer ring */}
          <div className="absolute inset-0 rounded-full bg-red-500/10 animate-pulse" />
          {/* Middle solid ring */}
          <div className="absolute inset-2 rounded-full bg-red-500/20" />
          {/* Solid inner circle */}
          <div className="absolute inset-4 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/50">
            <AlertTriangle className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          {/* Decorative bubbles on the right */}
          <div className="absolute -right-1 top-4 w-2 h-2 rounded-full bg-red-500/60 animate-bounce" style={{ animationDuration: '3s' }} />
          <div className="absolute -right-3 top-7 w-3 h-3 rounded-full bg-red-500/80 animate-bounce" style={{ animationDuration: '4s' }} />
          <div className="absolute -right-2 top-11 w-1.5 h-1.5 rounded-full bg-red-500/40 animate-bounce" style={{ animationDuration: '2s' }} />
        </div>

        <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{title}</h3>
        
        <p className="text-sm text-slate-400 leading-relaxed mb-8 px-4">
          {message}
        </p>

        <button 
          type="button"
          onClick={onRetry}
          disabled={!onRetry}
          className={`w-full py-3.5 px-6 rounded-full text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 group cursor-pointer ${
            onRetry 
              ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25' 
              : 'bg-slate-800 cursor-not-allowed opacity-55'
          }`}
        >
          Try Again 
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>

        <button 
          type="button"
          onClick={onClose}
          className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider cursor-pointer"
        >
          <X className="w-3.5 h-3.5" /> Close Window
        </button>

      </div>
    </div>
  );
}
