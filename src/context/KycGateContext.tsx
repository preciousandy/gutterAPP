import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'expo-router';
import { KycGateModal } from '@/components/KycGateModal';
import { useAuth } from './AuthContext';
import { setOnKycRequired } from '@/api/client';

interface KycGateContextValue {
  /** Check if user is verified before executing an action. If unverified, opens the prompt. */
  requireKyc: (action?: () => void, featureName?: string) => boolean;
  /** True when user is verified */
  isKycVerified: boolean;
  /** Manually open the KYC required modal with an optional feature name */
  openKycGate: (featureName?: string) => void;
  /** Close the KYC required modal */
  closeKycGate: () => void;
}

const KycGateContext = createContext<KycGateContextValue | undefined>(undefined);

export function KycGateProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [featureName, setFeatureName] = useState<string | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const isKycVerified = user?.kyc_status === 'verified';

  const openKycGate = useCallback((name?: string) => {
    setFeatureName(name);
    setIsOpen(true);
  }, []);

  const closeKycGate = useCallback(() => {
    setIsOpen(false);
    setPendingAction(null);
  }, []);

  const requireKyc = useCallback(
    (action?: () => void, name?: string): boolean => {
      if (isKycVerified) {
        action?.();
        return true;
      }

      setPendingAction(() => action ?? null);
      openKycGate(name);
      return false;
    },
    [isKycVerified, openKycGate]
  );

  // Hook into API client 403 kyc_required responses
  useEffect(() => {
    setOnKycRequired((status) => {
      openKycGate(status === 'pending' ? 'Verification Step 2' : undefined);
    });

    return () => {
      setOnKycRequired(null);
    };
  }, [openKycGate]);

  const handleStartVerification = useCallback(() => {
    closeKycGate();

    if (user?.kyc_status === 'pending') {
      router.push('/(onboarding)/face-verification');
    } else {
      router.push('/(onboarding)/verify-identity');
    }
  }, [closeKycGate, router, user?.kyc_status]);

  const value = useMemo(
    () => ({
      requireKyc,
      isKycVerified,
      openKycGate,
      closeKycGate,
    }),
    [requireKyc, isKycVerified, openKycGate, closeKycGate]
  );

  return (
    <KycGateContext.Provider value={value}>
      {children}
      <KycGateModal
        visible={isOpen}
        featureName={featureName}
        kycStatus={user?.kyc_status}
        onClose={closeKycGate}
        onStartVerification={handleStartVerification}
      />
    </KycGateContext.Provider>
  );
}

export function useKycGate(): KycGateContextValue {
  const ctx = useContext(KycGateContext);
  if (!ctx) {
    throw new Error('useKycGate must be used within a KycGateProvider');
  }
  return ctx;
}
