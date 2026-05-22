'use client';

import { Check, Copy } from 'lucide-react';
import { useCallback, useState } from 'react';

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy fallback (some mobile browsers / non-HTTPS)
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  iconSize?: number;
  showLabel?: boolean;
}

export default function CopyButton({
  text,
  label = 'Copy',
  className = '',
  iconSize = 14,
  showLabel = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopied(true);
    setShowToast(true);
    window.setTimeout(() => {
      setCopied(false);
      setShowToast(false);
    }, 2000);
  }, [text]);

  return (
    <>
      <button
        type="button"
        onClick={handleCopy}
        disabled={!text}
        className={`focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none touch-manipulation min-w-[36px] min-h-[36px] sm:min-w-[32px] sm:min-h-[32px] ${className}`}
        aria-label={copied ? 'Copied' : label}
        title={copied ? 'Copied!' : label}
      >
        {copied ? (
          <Check size={iconSize} className="text-emerald-400 shrink-0" aria-hidden />
        ) : (
          <Copy size={iconSize} className="shrink-0" aria-hidden />
        )}
        {showLabel && (
          <span className="text-xs font-bold">{copied ? 'Copied!' : label}</span>
        )}
      </button>

      {showToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-semibold shadow-xl pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-[90vw] text-center"
        >
          Copied!
        </div>
      )}
    </>
  );
}
