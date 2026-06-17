'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface Settings {
  autoHideMinimap: boolean;
  disableAnimations: boolean;
}

interface SettingsContextValue extends Settings {
  toggleAutoHideMinimap: () => void;
  toggleDisableAnimations: () => void;
}

const STORAGE_KEY = 'visualaize-settings';
const DEFAULT_SETTINGS: Settings = {
  autoHideMinimap: false,
  disableAnimations: false,
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // Ignore corrupt settings
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: Settings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or unavailable
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const toggleAutoHideMinimap = useCallback(() => {
    setSettings(prev => ({ ...prev, autoHideMinimap: !prev.autoHideMinimap }));
  }, []);

  const toggleDisableAnimations = useCallback(() => {
    setSettings(prev => ({ ...prev, disableAnimations: !prev.disableAnimations }));
  }, []);

  const value = useMemo(
    () => ({
      ...settings,
      toggleAutoHideMinimap,
      toggleDisableAnimations,
    }),
    [settings, toggleAutoHideMinimap, toggleDisableAnimations]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
