import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { TextField } from '@/components/TextField';
import { forgotPassword } from '@/api/auth';
import { errorMessage, isApiError } from '@/api/client';
import { colors } from '@/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);

  const handleSubmit = async () => {
    setFormError(null);
    setEmailError(undefined);
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      if (isApiError(e) && e.status === 422) setEmailError(e.firstError('email'));
      setFormError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-navy-deep">
      <GWatermark light size={540} className="-right-36 -top-10" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <View className="px-[30px] pb-8 pt-6">
            <Pressable
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(auth)/login');
                }
              }}
              className="mb-6 h-[38px] w-[38px] items-center justify-center rounded-xl border border-white/20 bg-white/15"
            >
              <Ionicons name="arrow-back" size={18} color={colors.white} />
            </Pressable>
            <Text className="font-sans-extrabold text-[32px] leading-[38px] tracking-tight text-white">
              Reset password
            </Text>
            <Text className="mt-2 font-sans text-sm leading-5 text-white/60">
              Enter your email and we&apos;ll send you a reset link.
            </Text>
          </View>

          <ScrollView
            className="flex-1 rounded-t-[36px] bg-sheet"
            contentContainerClassName="flex-grow px-[30px] py-[34px]"
            keyboardShouldPersistTaps="handled"
          >
            {sent ? (
              <View className="items-center pt-6">
                <View className="h-[74px] w-[74px] items-center justify-center rounded-full bg-mint">
                  <Ionicons name="mail-open-outline" size={32} color={colors.mintOn} />
                </View>
                <Text className="mt-4 font-sans-extrabold text-[21px] text-ink">
                  Check your email
                </Text>
                <Text className="mt-2 text-center font-sans text-[13px] leading-5 text-ink-muted">
                  If an account exists for {email.trim()}, a password reset link is on its way.
                </Text>
                <Button
                  title="Back to log in"
                  variant="ghost"
                  onPress={() => {
                    if (router.canGoBack()) {
                      router.back();
                    } else {
                      router.replace('/(auth)/login');
                    }
                  }}
                  className="mt-6 self-stretch"
                />
              </View>
            ) : (
              <>
                {formError ? (
                  <Text className="mb-4 rounded-2xl bg-red-bg p-3.5 font-sans text-[13px] text-red">
                    {formError}
                  </Text>
                ) : null}
                <TextField
                  label="Email address"
                  placeholder="chidi.okeke@gmail.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                  error={emailError}
                />
                <Button title="Send reset link" onPress={handleSubmit} loading={loading} className="mt-2" />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
