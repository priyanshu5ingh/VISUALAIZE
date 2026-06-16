'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`focus-ring inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-slate-700 shadow-lg shadow-slate-200/40 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200 dark:shadow-black/20 dark:hover:bg-slate-800/80 ${className}`}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
      <span>{isDark ? 'LIGHT' : 'DARK'}</span>
    </button>
  );
}
