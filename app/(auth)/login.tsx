import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { useAuth, useSettings } from '@/context';
import { errorMessage, isApiError } from '@/api/client';
import { colors } from '@/theme';
import {
  checkBiometricStatus,
  promptBiometricAuth,
  hasSavedBiometricSession,
  getSavedBiometricToken,
  saveBiometricSession,
  clearBiometricSession,
  getSavedLoginId,
  saveLoginId,
  clearSavedLoginId,
  BiometricStatus,
} from '@/lib/biometrics';

export default function LoginScreen() {
  const { signIn, signInWithToken } = useAuth();
  const { biometricsEnabled } = useSettings();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus>({
    isAvailable: false,
    hasHardware: false,
    isEnrolled: false,
    biometricType: 'face',
    label: 'Use Face ID',
  });

  useEffect(() => {
    // Check device biometric capabilities and load remembered login ID
    (async () => {
      try {
        const [status, savedLogin] = await Promise.all([
          checkBiometricStatus(),
          getSavedLoginId(),
        ]);
        setBiometricStatus(status);
        if (savedLogin) {
          setLoginId(savedLogin);
        }
      } catch {
        // Silently proceed if storage is inaccessible
      }
    })();
  }, []);

  const handleLogin = async () => {
    setFormError(null);
    setFieldErrors({});
    if (!loginId.trim()) {
      setFieldErrors({ login: 'Phone or email is required.' });
      return;
    }
    if (!password) {
      setFieldErrors({ password: 'Password is required.' });
      return;
    }

    setLoading(true);
    try {
      const auth = await signIn(loginId.trim(), password);
      if (remember) {
        await saveBiometricSession(auth.token, loginId.trim());
      } else {
        await Promise.all([clearBiometricSession(), clearSavedLoginId()]);
      }
    } catch (e: any) {
      if (isApiError(e)) {
        if (e.status === 422) {
          setFieldErrors({ login: e.firstError('login'), password: e.firstError('password') });
        } else if (e.status === 429) {
          setFormError('Too many login attempts. Please wait 1 minute before trying again.');
          return;
        }
      }
      setFormError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    setFormError(null);
    setFieldErrors({});

    if (!biometricsEnabled) {
      setFormError('Face ID login is turned off in Settings. Please log in with your password.');
      return;
    }

    const hasSession = await hasSavedBiometricSession();
    if (!hasSession) {
      setFormError(
        `Please log in with your password once to activate ${biometricStatus.label}.`
      );
      return;
    }

    if (!biometricStatus.isAvailable) {
      if (!biometricStatus.hasHardware) {
        setFormError('Biometric authentication is not supported on this device.');
      } else if (!biometricStatus.isEnrolled) {
        setFormError(
          'No biometric credentials found. Please set up Face ID or Fingerprint in your device settings.'
        );
      }
      return;
    }

    setBiometricLoading(true);
    try {
      // First verify biometric intent
      const authResult = await promptBiometricAuth(
        `Authenticate with ${biometricStatus.label} to log in`
      );

      if (!authResult.success) {
        if (authResult.error && !authResult.error.toLowerCase().includes('cancel')) {
          setFormError(authResult.error);
        }
        return;
      }

      // Securely unlock token from Secure Enclave
      const savedToken = await getSavedBiometricToken(`Unlock Gutter session`);
      if (!savedToken) {
        setFormError(`Biometric session could not be unlocked. Please enter your password.`);
        return;
      }

      // Sign in with hardware-verified token
      await signInWithToken(savedToken);
    } catch (e: any) {
      // If token expired or revoked, clear saved token
      await clearBiometricSession();
      setFormError('Session expired. Please log in with your password to re-enable biometrics.');
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-navy-deep">
      <GWatermark light size={560} className="-left-36 -top-10" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <View className="px-[30px] pb-8 pt-10">
            <Text className="font-sans-extrabold text-[34px] leading-[40px] tracking-tight text-white">
              Welcome back
            </Text>
            <Text className="mt-2 font-sans text-sm text-white/60">
              Log in to your Gutter account
            </Text>
          </View>

          <ScrollView
            className="flex-1 rounded-t-[36px] bg-sheet"
            contentContainerClassName="flex-grow px-[30px] py-[34px]"
            keyboardShouldPersistTaps="handled"
          >
            {formError ? (
              <Text className="mb-4 rounded-2xl bg-red-bg p-3.5 font-sans text-[13px] text-red">
                {formError}
              </Text>
            ) : null}

            <View className="mb-[18px]">
              <Text className="mb-2 font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-muted">
                Phone or email
              </Text>
              <View
                className={`h-14 flex-row items-center rounded-2xl border bg-surface px-[18px] ${
                  fieldErrors.login ? 'border-[1.5px] border-red' : 'border-line-input'
                }`}
              >
                <TextInputStyled
                  value={loginId}
                  onChangeText={setLoginId}
                  placeholder="chidi.okeke@gmail.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="username"
                />
              </View>
              {fieldErrors.login ? (
                <Text className="mt-1.5 font-sans text-[12px] text-red">{fieldErrors.login}</Text>
              ) : null}
            </View>

            <View className="mb-[18px]">
              <Text className="mb-2 font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-muted">
                Password
              </Text>
              <View
                className={`h-14 flex-row items-center rounded-2xl border bg-surface px-[18px] ${
                  fieldErrors.password ? 'border-[1.5px] border-red' : 'border-[1.5px] border-navy'
                }`}
              >
                <TextInputStyled
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                  <Text className="font-sans-semibold text-xs text-navy">
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              </View>
              {fieldErrors.password ? (
                <Text className="mt-1.5 font-sans text-[12px] text-red">{fieldErrors.password}</Text>
              ) : null}
            </View>

            <View className="mb-5 flex-row items-center justify-between">
              <Pressable
                onPress={() => setRemember((v) => !v)}
                className="flex-row items-center gap-2"
              >
                <View
                  className={`h-5 w-5 items-center justify-center rounded-md ${
                    remember ? 'bg-navy' : 'border-2 border-line-input bg-surface'
                  }`}
                >
                  {remember ? <Ionicons name="checkmark" size={13} color={colors.white} /> : null}
                </View>
                <Text className="font-sans-semibold text-[13px] text-ink-slate">Remember me</Text>
              </Pressable>
              <Link href="/(auth)/forgot-password" asChild>
                <Pressable hitSlop={8}>
                  <Text className="font-sans-bold text-[13px] text-navy">Forgot password?</Text>
                </Pressable>
              </Link>
            </View>

            <Button title="Log in" onPress={handleLogin} loading={loading} />

            {biometricsEnabled && biometricStatus.hasHardware ? (
              <>
                <View className="my-[18px] flex-row items-center gap-3.5">
                  <View className="h-px flex-1 bg-line-input" />
                  <Text className="font-sans-semibold text-[11px] tracking-[1.3px] text-ink-faint">OR</Text>
                  <View className="h-px flex-1 bg-line-input" />
                </View>

                <Pressable
                  onPress={handleBiometricAuth}
                  disabled={biometricLoading || loading}
                  className="h-[58px] flex-row items-center justify-center gap-3 rounded-[18px] border border-line-input bg-surface active:opacity-90 disabled:opacity-50"
                >
                  {biometricLoading ? (
                    <ActivityIndicator size="small" color={colors.mintDark} />
                  ) : (
                    <>
                      <View className="h-[26px] w-[26px] items-center justify-center rounded-[9px] border border-[#BDEEDF] bg-mint-bg">
                        <Ionicons
                          name={
                            biometricStatus.biometricType === 'fingerprint'
                              ? 'finger-print-outline'
                              : 'scan-outline'
                          }
                          size={14}
                          color={colors.mintDark}
                        />
                      </View>
                      <Text className="font-sans-bold text-[15px] text-ink">{biometricStatus.label}</Text>
                    </>
                  )}
                </Pressable>
              </>
            ) : null}

            <View className="mt-auto flex-row justify-center pt-8">
              <Text className="font-sans-semibold text-sm text-ink-muted">New here? </Text>
              <Link href="/(auth)/register" asChild>
                <Pressable hitSlop={8}>
                  <Text className="font-sans-extrabold text-sm text-navy">Create an account</Text>
                </Pressable>
              </Link>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function TextInputStyled(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.inkFaint}
      className="h-full flex-1 font-sans-semibold text-[15px] text-ink"
      {...props}
    />
  );
}
