import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useSecurity } from '@/context/SecurityContext';
import { colors } from '@/theme';

const NUMPAD_KEYS = [
  '1', '2', '3',
  '4', '5', '6',
  '7', '8', '9',
  'bio', '0', 'del',
] as const;

export function SecurityLockOverlay() {
  const { isAuthenticated, user, signOut } = useAuth();
  const {
    isLocked,
    isInBackground,
    verifyUnlockPin,
    authenticateWithBiometrics,
    canUseBiometrics,
    biometricLabel,
  } = useSecurity();

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Reset PIN and error when overlay opens or closes
  useEffect(() => {
    if (isLocked) {
      setPin('');
      setError(null);
      setIsVerifying(false);
    }
  }, [isLocked]);

  // Handle digit input
  const handleDigit = async (digit: string) => {
    if (isVerifying || pin.length >= 4) return;
    setError(null);

    const nextPin = pin + digit;
    setPin(nextPin);

    // If 4 digits entered, verify immediately
    if (nextPin.length === 4) {
      setIsVerifying(true);
      const res = await verifyUnlockPin(nextPin);
      setIsVerifying(false);

      if (!res.success) {
        setPin('');
        setError(res.error || 'Incorrect PIN. Please try again.');
      }
    }
  };

  const handleDelete = () => {
    if (isVerifying || pin.length === 0) return;
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleSignOut = () => {
    Alert.alert(
      'Log Out of Gutter',
      'Are you sure you want to log out and switch accounts?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            void signOut();
          },
        },
      ]
    );
  };

  // Only render if authenticated and either locked or in background
  if (!isAuthenticated) return null;
  if (!isLocked && !isInBackground) return null;

  // 1. Privacy Shield when in background / app switcher
  if (isInBackground && !isLocked) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.privacyShield]}>
        <View className="items-center">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full border border-mint/40 bg-mint/10">
            <Ionicons name="shield-checkmark" size={40} color={colors.mint} />
          </View>
          <Text className="font-grotesk text-2xl font-bold tracking-widest text-white">
            GUTTER
          </Text>
          <Text className="mt-1 font-sans-semibold text-sm text-white/60">
            Secured Session
          </Text>
        </View>
      </View>
    );
  }

  // 2. OPay-standard Quick Unlock Screen
  const initials =
    ((user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')).toUpperCase() || 'GU';

  return (
    <View style={[StyleSheet.absoluteFill, styles.lockOverlay]}>
      <SafeAreaView className="flex-1 justify-between px-6 pb-6 pt-2">
        {/* Top Bar */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center rounded-full bg-navy/10 px-3 py-1.5">
            <View className="mr-2 h-2 w-2 rounded-full bg-mint" />
            <Text className="font-grotesk text-xs font-bold tracking-wider text-navy">
              GUTTER
            </Text>
          </View>

          <Pressable
            onPress={handleSignOut}
            className="flex-row items-center gap-1.5 py-1.5 active:opacity-70"
            hitSlop={12}
          >
            <Ionicons name="log-out-outline" size={16} color={colors.inkMid} />
            <Text className="font-sans-semibold text-xs text-ink-mid">
              Switch Account
            </Text>
          </Pressable>
        </View>

        {/* User Profile Header */}
        <View className="items-center">
          <View className="relative mb-3">
            <View className="h-20 w-20 items-center justify-center rounded-full border-2 border-mint bg-navy-deep shadow-md">
              <Text className="font-grotesk text-2xl font-bold text-white">
                {initials}
              </Text>
            </View>
            <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full border-2 border-page bg-navy">
              <Ionicons name="lock-closed" size={11} color={colors.white} />
            </View>
          </View>

          <Text className="font-grotesk text-2xl font-bold text-ink">
            Welcome back, {user?.first_name || 'Account Holder'}
          </Text>

          {error ? (
            <View className="mt-2 flex-row items-center gap-1.5 rounded-xl bg-red/10 px-3 py-1.5">
              <Ionicons name="alert-circle" size={15} color={colors.red} />
              <Text className="font-sans-semibold text-xs text-red">{error}</Text>
            </View>
          ) : (
            <Text className="mt-1 font-sans-medium text-sm text-ink-muted">
              Enter your 4-digit PIN to continue
            </Text>
          )}

          {/* 4 PIN Dots */}
          <View className="my-5 flex-row justify-center gap-5">
            {[0, 1, 2, 3].map((index) => {
              const isFilled = pin.length > index;
              return (
                <View
                  key={index}
                  className={`h-4 w-4 rounded-full ${
                    error
                      ? 'border-2 border-red'
                      : isFilled
                      ? 'scale-110 bg-navy-deep'
                      : 'border-2 border-[#C3CFE3]'
                  }`}
                />
              );
            })}
          </View>

          {/* Verification Status */}
          <View className="h-6 items-center justify-center">
            {isVerifying && (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color={colors.navy} />
                <Text className="font-sans-semibold text-xs text-navy">
                  Verifying PIN...
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 3x4 Numpad Grid */}
        <View className="w-full">
          <View className="flex-row flex-wrap gap-[11px]">
            {NUMPAD_KEYS.map((key, index) => {
              if (key === 'bio') {
                if (!canUseBiometrics) {
                  return <View key={index} className="h-[60px] basis-[30%] flex-grow" />;
                }
                return (
                  <Pressable
                    key={index}
                    disabled={isVerifying}
                    onPress={() => void authenticateWithBiometrics()}
                    className="h-[60px] basis-[30%] flex-grow items-center justify-center rounded-2xl border border-line bg-chip active:opacity-75"
                  >
                    <Ionicons
                      name={
                        Platform.OS === 'ios'
                          ? 'scan-outline'
                          : 'finger-print-outline'
                      }
                      size={24}
                      color={colors.navy}
                    />
                  </Pressable>
                );
              }

              if (key === 'del') {
                return (
                  <Pressable
                    key={index}
                    disabled={isVerifying || pin.length === 0}
                    onPress={handleDelete}
                    className="h-[60px] basis-[30%] flex-grow items-center justify-center rounded-2xl bg-chip active:opacity-75"
                  >
                    <Ionicons
                      name="backspace-outline"
                      size={22}
                      color={pin.length === 0 ? colors.inkGhost : colors.navy}
                    />
                  </Pressable>
                );
              }

              return (
                <Pressable
                  key={index}
                  disabled={isVerifying}
                  onPress={() => handleDigit(key)}
                  className="h-[60px] basis-[30%] flex-grow items-center justify-center rounded-2xl border border-line bg-surface active:opacity-75"
                >
                  <Text className="font-grotesk text-2xl font-bold text-ink">
                    {key}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Bottom Biometrics Pill & Forgot PIN */}
        <View className="items-center gap-3">
          {canUseBiometrics ? (
            <Pressable
              onPress={() => void authenticateWithBiometrics()}
              className="flex-row items-center gap-2 rounded-full bg-navy/10 px-5 py-2.5 active:opacity-80"
              hitSlop={8}
            >
              <Ionicons
                name={
                  Platform.OS === 'ios'
                    ? 'scan-outline'
                    : 'finger-print-outline'
                }
                size={17}
                color={colors.navy}
              />
              <Text className="font-sans-bold text-xs text-navy">
                {biometricLabel}
              </Text>
            </Pressable>
          ) : null}

          <Pressable onPress={handleSignOut} hitSlop={8}>
            <Text className="font-sans-semibold text-xs text-ink-muted underline">
              Forgot PIN? Tap to sign in with password
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  privacyShield: {
    backgroundColor: '#08122E',
    zIndex: 999999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockOverlay: {
    backgroundColor: colors.page,
    zIndex: 999998,
  },
});
