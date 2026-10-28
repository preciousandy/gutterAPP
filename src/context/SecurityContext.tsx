import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import * as authApi from '@/api/auth';
import { promptBiometricAuth, checkBiometricStatus } from '@/lib/biometrics';

// Banking Standard: 2 minutes grace period before locking
export const BACKGROUND_LOCK_TIMEOUT_MS = 2 * 60 * 1000;

interface SecurityContextValue {
  isLocked: boolean;
  isInBackground: boolean;
  lock: () => void;
  unlock: () => void;
  verifyUnlockPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  authenticateWithBiometrics: () => Promise<boolean>;
  canUseBiometrics: boolean;
  biometricLabel: string;
}

const SecurityContext = createContext<SecurityContextValue | null>(null);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isBootstrapping, user, signOut } = useAuth();
  const { biometricsEnabled } = useSettings();

  const [isLocked, setIsLocked] = useState(false);
  const [isInBackground, setIsInBackground] = useState(false);
  const [canUseBiometrics, setCanUseBiometrics] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Use Biometrics');

  const backgroundTimestampRef = useRef<number | null>(null);
  const autoPromptedRef = useRef(false);
  const initialBootCheckedRef = useRef(false);

  // Cold launch security: require quick unlock when restoring a saved session
  useEffect(() => {
    if (!initialBootCheckedRef.current && !isBootstrapping) {
      initialBootCheckedRef.current = true;
      if (isAuthenticated) {
        setIsLocked(true);
      }
    }
  }, [isBootstrapping, isAuthenticated]);

  // Check biometric capability
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await checkBiometricStatus();
        if (!cancelled) {
          setCanUseBiometrics(status.isAvailable);
          setBiometricLabel(status.label);
        }
      } catch {
        if (!cancelled) {
          setCanUseBiometrics(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // When user signs out, clear locked state
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLocked(false);
      backgroundTimestampRef.current = null;
    }
  }, [isAuthenticated]);

  const unlock = useCallback(() => {
    setIsLocked(false);
    backgroundTimestampRef.current = null;
    autoPromptedRef.current = false;
  }, []);

  const lock = useCallback(() => {
    if (isAuthenticated) {
      setIsLocked(true);
      autoPromptedRef.current = false;
    }
  }, [isAuthenticated]);

  const verifyUnlockPin = useCallback(
    async (pin: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await authApi.verifyPin(pin);
        if (response.verified) {
          unlock();
          return { success: true };
        }
        return { success: false, error: response.message || 'Incorrect PIN.' };
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.message ||
          err?.response?.data?.errors?.pin?.[0] ||
          err?.message ||
          'Incorrect PIN. Please try again.';
        return { success: false, error: errorMsg };
      }
    },
    [unlock]
  );

  const authenticateWithBiometrics = useCallback(async (): Promise<boolean> => {
    if (!canUseBiometrics) return false;
    try {
      const result = await promptBiometricAuth('Unlock Gutter');
      if (result.success) {
        unlock();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [canUseBiometrics, unlock]);

  // AppState listener for privacy shield and background lock timer
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (Platform.OS === 'web') return;

      if (nextAppState === 'inactive' || nextAppState === 'background') {
        setIsInBackground(true);
        if (backgroundTimestampRef.current === null) {
          backgroundTimestampRef.current = Date.now();
        }
      } else if (nextAppState === 'active') {
        setIsInBackground(false);
        if (backgroundTimestampRef.current !== null) {
          const elapsed = Date.now() - backgroundTimestampRef.current;
          backgroundTimestampRef.current = null;

          // Lock if authenticated and minimized for longer than grace period (2 mins)
          if (isAuthenticated && elapsed >= BACKGROUND_LOCK_TIMEOUT_MS) {
            setIsLocked(true);
            autoPromptedRef.current = false;
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  // Auto-trigger biometric prompt on lock if biometrics is available & enabled
  useEffect(() => {
    if (
      isLocked &&
      isAuthenticated &&
      biometricsEnabled &&
      canUseBiometrics &&
      !autoPromptedRef.current
    ) {
      autoPromptedRef.current = true;
      // Slight delay so the UI transition completes smoothly before system prompt
      const timer = setTimeout(() => {
        void authenticateWithBiometrics();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isLocked, isAuthenticated, biometricsEnabled, canUseBiometrics, authenticateWithBiometrics]);

  const value: SecurityContextValue = {
    isLocked,
    isInBackground,
    lock,
    unlock,
    verifyUnlockPin,
    authenticateWithBiometrics,
    canUseBiometrics,
    biometricLabel,
  };

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}
