import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const PREF_HIDE_BALANCES_KEY = 'gutter_pref_hide_balances';
const PREF_BIOMETRICS_KEY = 'gutter_pref_biometrics';
const PREF_PUSH_KEY = 'gutter_pref_push';

interface SettingsContextValue {
  hideBalances: boolean;
  setHideBalances: (hide: boolean) => void;
  toggleHideBalances: () => void;
  biometricsEnabled: boolean;
  setBiometricsEnabled: (enabled: boolean) => void;
  pushEnabled: boolean;
  setPushEnabled: (enabled: boolean) => void;
  isReady: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

async function getStoredPref(key: string, defaultValue: boolean): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(key);
      return v !== null ? v === 'true' : defaultValue;
    }
    return defaultValue;
  }
  try {
    const v = await SecureStore.getItemAsync(key);
    return v !== null ? v === 'true' : defaultValue;
  } catch {
    return defaultValue;
  }
}

async function setStoredPref(key: string, value: boolean): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, String(value));
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, String(value));
  } catch {
    // Ignore storage errors on restricted environments
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [hideBalances, setHideBalancesState] = useState(false);
  const [biometricsEnabled, setBiometricsEnabledState] = useState(true);
  const [pushEnabled, setPushEnabledState] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [storedHide, storedBio, storedPush] = await Promise.all([
          getStoredPref(PREF_HIDE_BALANCES_KEY, false),
          getStoredPref(PREF_BIOMETRICS_KEY, true),
          getStoredPref(PREF_PUSH_KEY, true),
        ]);
        setHideBalancesState(storedHide);
        setBiometricsEnabledState(storedBio);
        setPushEnabledState(storedPush);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const setHideBalances = useCallback((hide: boolean) => {
    setHideBalancesState(hide);
    void setStoredPref(PREF_HIDE_BALANCES_KEY, hide);
  }, []);

  const toggleHideBalances = useCallback(() => {
    setHideBalancesState((prev) => {
      const next = !prev;
      void setStoredPref(PREF_HIDE_BALANCES_KEY, next);
      return next;
    });
  }, []);

  const setBiometricsEnabled = useCallback((enabled: boolean) => {
    setBiometricsEnabledState(enabled);
    void setStoredPref(PREF_BIOMETRICS_KEY, enabled);
  }, []);

  const setPushEnabled = useCallback((enabled: boolean) => {
    setPushEnabledState(enabled);
    void setStoredPref(PREF_PUSH_KEY, enabled);
  }, []);

  const value: SettingsContextValue = {
    hideBalances,
    setHideBalances,
    toggleHideBalances,
    biometricsEnabled,
    setBiometricsEnabled,
    pushEnabled,
    setPushEnabled,
    isReady,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
