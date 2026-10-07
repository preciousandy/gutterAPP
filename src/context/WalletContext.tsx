import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from './AuthContext';
import { getDashboard } from '@/api/wallet';
import { errorMessage } from '@/api/client';
import type { AssetBalance, DashboardData, Transaction, Wallet } from '@/types';

interface WalletContextValue {
  wallet: Wallet | null;
  balances: AssetBalance[];
  recentTransactions: Transaction[];
  loading: boolean;
  refreshing: boolean;
  isOffline: boolean;
  error: string | null;
  refreshWallet: (isRefresh?: boolean) => Promise<void>;
  updateWalletBalance: (newBalance: number) => void;
  prependTransaction: (tx: Transaction) => void;
}

const DASHBOARD_CACHE_KEY = 'gutter_app_dashboard_cache';

async function getStoredDashboard(): Promise<DashboardData | null> {
  try {
    const raw =
      Platform.OS === 'web'
        ? typeof localStorage !== 'undefined'
          ? localStorage.getItem(DASHBOARD_CACHE_KEY)
          : null
        : await SecureStore.getItemAsync(DASHBOARD_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function storeDashboard(dashboard: DashboardData): Promise<void> {
  try {
    const serialized = JSON.stringify(dashboard);
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(DASHBOARD_CACHE_KEY, serialized);
      }
      return;
    }
    await SecureStore.setItemAsync(DASHBOARD_CACHE_KEY, serialized, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    // Ignore storage issues
  }
}

async function clearStoredDashboard(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(DASHBOARD_CACHE_KEY);
      }
      return;
    }
    await SecureStore.deleteItemAsync(DASHBOARD_CACHE_KEY);
  } catch {
    // Ignore
  }
}

const DEFAULT_BALANCES: AssetBalance[] = [
  { asset: 'NGN', amount: 0 },
  { asset: 'BTC', amount: 0 },
  { asset: 'ETH', amount: 0 },
  { asset: 'USDT', amount: 0 },
];

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    setError(null);

    try {
      const res = await getDashboard();
      setData(res);
      setIsOffline(false);
      void storeDashboard(res);
    } catch (e) {
      setIsOffline(true);
      setError(errorMessage(e));
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      }
      setLoading(false);
    }
  }, []);

  // Sync wallet when authentication state changes, restoring from cache first
  useEffect(() => {
    let cancelled = false;

    if (isAuthenticated) {
      (async () => {
        // Instant load from cache
        const cached = await getStoredDashboard();
        if (cached && !cancelled) {
          setData(cached);
        }
        // Background network sync
        if (!cancelled) {
          await fetchDashboard();
        }
      })();
    } else {
      setData(null);
      setError(null);
      void clearStoredDashboard();
    }

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, fetchDashboard]);

  const refreshWallet = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated) return;
    await fetchDashboard(isRefresh);
  }, [isAuthenticated, fetchDashboard]);

  const updateWalletBalance = useCallback((newBalance: number) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        wallet: {
          ...prev.wallet,
          balance: newBalance,
        },
      };
    });
  }, []);

  const prependTransaction = useCallback((tx: Transaction) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        recent_transactions: [tx, ...prev.recent_transactions.filter((t) => t.id !== tx.id)],
      };
    });
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({
      wallet: data?.wallet ?? null,
      balances: data?.balances ?? DEFAULT_BALANCES,
      recentTransactions: data?.recent_transactions ?? [],
      loading,
      refreshing,
      isOffline,
      error,
      refreshWallet,
      updateWalletBalance,
      prependTransaction,
    }),
    [data, loading, refreshing, isOffline, error, refreshWallet, updateWalletBalance, prependTransaction]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
