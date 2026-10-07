import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { OtpInput } from '@/components/OtpInput';
import { useAuth } from '@/context/AuthContext';
import { requestEmailOtp, verifyEmailOtp } from '@/api/auth';
import { errorMessage } from '@/api/client';

const OTP_TTL_SECONDS = 5 * 60;

export default function VerifyEmailScreen() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(
    secondsLeft % 60
  ).padStart(2, '0')}`;

  const handleVerify = async () => {
    setFormError(null);
    setLoading(true);
    try {
      await verifyEmailOtp(code);
      await refreshUser();
      router.replace('/(tabs)');
    } catch (e) {
      setFormError(errorMessage(e));
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    setFormError(null);
    try {
      await requestEmailOtp();
      setSecondsLeft(OTP_TTL_SECONDS);
      setCode('');
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setResending(false);
    }
  };

  return (
    <View className="flex-1 bg-navy-deep">
      <GWatermark light size={540} className="-right-36 -top-10" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-[30px] pb-8 pt-10">
          <Text className="font-sans-extrabold text-[32px] leading-[38px] tracking-tight text-white">
            Verify your email
          </Text>
          <Text className="mt-2.5 font-sans text-sm leading-[21px] text-white/60">
            We sent a 6-digit code to{'\n'}
            <Text className="font-sans-bold text-mint">{user?.email ?? 'your email'}</Text>
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

          <OtpInput value={code} onChange={setCode} />

          <View className="mt-[22px] flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-[7px] w-[7px] rounded-full bg-mint" />
              <Text className="font-sans-semibold text-[13px] text-ink-mid">
                Code expires in <Text className="font-sans-extrabold text-ink">{mmss}</Text>
              </Text>
            </View>
            <Pressable onPress={handleResend} hitSlop={8} disabled={secondsLeft > 0}>
              <Text
                className={`font-sans-bold text-[13px] ${
                  secondsLeft > 0 ? 'text-ink-ghost' : 'text-navy'
                }`}
              >
                {resending ? 'Sending…' : 'Resend'}
              </Text>
            </Pressable>
          </View>

          <Button
            title="Verify email"
            onPress={handleVerify}
            loading={loading}
            disabled={code.length !== 6}
            className="mt-[22px]"
          />

          <View className="mt-[22px] flex-row gap-3 rounded-[18px] border border-line bg-surface p-4">
            <View className="h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-chip">
              <Text className="font-sans-extrabold text-sm text-navy">i</Text>
            </View>
            <Text className="flex-1 font-sans text-[12.5px] leading-[19px] text-ink-muted">
              Check your spam folder if the email has not arrived within two minutes. You can also{' '}
              <Text className="font-sans-bold text-navy">verify by SMS</Text> instead.
            </Text>
          </View>

          <View className="mt-auto flex-row justify-center pt-8">
            <Text className="font-sans-semibold text-[13px] text-ink-muted">Wrong address? </Text>
            <Pressable onPress={() => router.push('/(onboarding)/change-email')} hitSlop={8}>
              <Text className="font-sans-extrabold text-[13px] text-navy">Change email</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
