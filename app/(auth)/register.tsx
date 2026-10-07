import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/context/AuthContext';
import { errorMessage, isApiError } from '@/api/client';
import { colors } from '@/theme';

function passwordStrength(password: string): 'WEAK' | 'OKAY' | 'STRONG' | null {
  if (!password) return null;
  if (password.length < 8) return 'WEAK';
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((r) => r.test(password)).length;
  return classes >= 3 ? 'STRONG' : 'OKAY';
}

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const strength = passwordStrength(password);

  const handleContinue = async () => {
    if (!agreed) {
      setFormError('Please accept the Terms of Service to continue.');
      return;
    }
    setFormError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      await signUp({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: `+234${phone.replace(/\D/g, '').replace(/^0/, '')}`,
        email: email.trim(),
        password,
      });
      router.replace('/(onboarding)/verify-email');
    } catch (e) {
      if (isApiError(e) && e.status === 422) {
        setFieldErrors({
          first_name: e.firstError('first_name'),
          last_name: e.firstError('last_name'),
          phone: e.firstError('phone'),
          email: e.firstError('email'),
          password: e.firstError('password'),
        });
      }
      setFormError(errorMessage(e));
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-sheet">
      <GWatermark size={520} className="-bottom-16 -right-36" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView
            contentContainerClassName="flex-grow px-[30px] pb-8 pt-3.5"
            keyboardShouldPersistTaps="handled"
          >
            <View className="mb-[18px] flex-row items-center gap-3.5">
              <Pressable
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/(auth)/login');
                  }
                }}
                className="h-[38px] w-[38px] items-center justify-center rounded-xl border border-line-input bg-surface"
              >
                <Ionicons name="arrow-back" size={18} color={colors.ink} />
              </Pressable>
              <View className="h-[5px] flex-1 overflow-hidden rounded-full bg-line-input">
                <View className="h-full w-2/5 rounded-full bg-mint" />
              </View>
              <Text className="font-sans-bold text-xs text-ink-muted">1 of 3</Text>
            </View>

            <Text className="font-sans-extrabold text-[30px] leading-[36px] tracking-tight text-ink">
              Create your account
            </Text>
            <Text className="mb-[18px] mt-1.5 font-sans text-sm leading-5 text-ink-muted">
              Takes about two minutes. You will verify your identity after this step.
            </Text>

            {formError ? (
              <Text className="mb-4 rounded-2xl bg-red-bg p-3.5 font-sans text-[13px] text-red">
                {formError}
              </Text>
            ) : null}

            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextField
                  label="First name"
                  placeholder="Chidi"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoComplete="given-name"
                  error={fieldErrors.first_name}
                />
              </View>
              <View className="flex-1">
                <TextField
                  label="Last name"
                  placeholder="Okeke"
                  value={lastName}
                  onChangeText={setLastName}
                  autoComplete="family-name"
                  error={fieldErrors.last_name}
                />
              </View>
            </View>
            <TextField
              label="Phone number"
              placeholder="803 412 8877"
              prefix="+234"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              error={fieldErrors.phone}
            />
            <TextField
              label="Email address"
              placeholder="chidi.okeke@gmail.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              error={fieldErrors.email}
            />
            <TextField
              label="Create password"
              placeholder="••••••••••"
              secureTextEntry
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
              error={fieldErrors.password}
              accessory={
                strength ? (
                  <Text
                    className={`font-sans-bold text-[11px] ${
                      strength === 'STRONG'
                        ? 'text-mint-dark'
                        : strength === 'OKAY'
                          ? 'text-btc'
                          : 'text-red'
                    }`}
                  >
                    {strength}
                  </Text>
                ) : undefined
              }
            />

            <Pressable onPress={() => setAgreed((v) => !v)} className="mt-1 flex-row items-start gap-3">
              <View
                className={`h-5 w-5 items-center justify-center rounded-md ${
                  agreed ? 'bg-navy' : 'border-2 border-line-input bg-surface'
                }`}
              >
                {agreed ? <Ionicons name="checkmark" size={13} color={colors.white} /> : null}
              </View>
              <Text className="flex-1 font-sans text-xs leading-[18px] text-ink-muted">
                I agree to the <Text className="font-sans-bold text-navy">Terms of Service</Text> and{' '}
                <Text className="font-sans-bold text-navy">Privacy Policy</Text>, and consent to
                identity verification.
              </Text>
            </Pressable>

            <View className="mt-auto pt-6">
              <Button title="Continue" onPress={handleContinue} loading={loading} />
              <View className="mt-3.5 flex-row justify-center">
                <Text className="font-sans-semibold text-sm text-ink-muted">
                  Already have an account?{' '}
                </Text>
                <Link href="/(auth)/login" asChild>
                  <Pressable hitSlop={8}>
                    <Text className="font-sans-extrabold text-sm text-navy">Log in</Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
