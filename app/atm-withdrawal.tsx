import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { Numpad, PinDots } from '@/components/Numpad';
import { ScreenHeader } from '@/components/ScreenHeader';
import { cancelWithdrawal, createWithdrawal } from '@/api/atm';
import { errorMessage } from '@/api/client';
import { colors } from '@/theme';
import type { AtmWithdrawal } from '@/types';
import { countdownTo, formatNaira } from '@/utils/format';

const STEPS = [
  'Visit any ATM that supports cardless service.',
  'Select Cardless Withdrawal on the ATM screen.',
  'Enter the 6-digit code shown above.',
  'Collect your cash. No physical card needed.',
];

export default function AtmWithdrawalScreen() {
  const router = useRouter();
  const [withdrawal, setWithdrawal] = useState<AtmWithdrawal | null>(null);
  const [amount, setAmount] = useState('20000');
  const [pin, setPin] = useState('');
  const [askPin, setAskPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-submit once the 4-digit PIN is entered.
  useEffect(() => {
    if (!askPin || pin.length !== 4 || loading) return;
    const value = Number(amount.replace(/,/g, ''));
    setLoading(true);
    setError(null);
    createWithdrawal(value, pin)
      .then((result) => {
        setWithdrawal(result);
        setAskPin(false);
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => {
        setPin('');
        setLoading(false);
      });
  }, [askPin, pin, loading, amount]);

  const handleGenerate = () => {
    setError(null);
    const value = Number(amount.replace(/,/g, ''));
    if (!value || value <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setAskPin(true);
  };

  const handleCancel = async () => {
    if (!withdrawal) return;
    setCancelling(true);
    try {
      await cancelWithdrawal(withdrawal.id);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch (e) {
      setError(errorMessage(e));
      setCancelling(false);
    }
  };

  return (
    <View className="flex-1 bg-navy-deep">
      <GWatermark light size={540} className="-left-32 top-28" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView contentContainerClassName="flex-grow px-[22px] pb-7 pt-3">
            <ScreenHeader title="Cardless withdrawal" dark />

            {error ? (
              <Text className="mt-4 rounded-2xl bg-red-bg p-3.5 font-sans text-[13px] text-red">
                {error}
              </Text>
            ) : null}

            {withdrawal ? (
              <>
                <View className="mt-[22px] items-center gap-4 rounded-[26px] border border-white/15 bg-white/5 px-5 py-[26px]">
                  <Text className="font-sans-semibold text-[11px] uppercase tracking-[2.5px] text-white/60">
                    Withdrawal code
                  </Text>
                  <View className="flex-row gap-2.5">
                    {withdrawal.code.split('').map((digit, i) => (
                      <View
                        key={i}
                        className="h-[60px] w-[46px] items-center justify-center rounded-[14px] bg-surface"
                      >
                        <Text className="font-grotesk-bold text-[26px] text-ink">{digit}</Text>
                      </View>
                    ))}
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View className="h-[7px] w-[7px] rounded-full bg-mint" />
                    <Text className="font-sans-bold text-xs text-mint">
                      Expires in {countdownTo(withdrawal.expires_at, now)}
                    </Text>
                  </View>
                  <View className="mt-1 w-full flex-row gap-2.5">
                    <Pressable
                      onPress={() => {
                        void Clipboard.setStringAsync(withdrawal.code);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="h-[46px] flex-1 items-center justify-center rounded-[14px] bg-mint active:opacity-90"
                    >
                      <Text className="font-sans-bold text-[13px] text-mint-on">
                        {copied ? 'Copied!' : 'Copy code'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        void Share.share({
                          message: `Gutter cardless withdrawal code: ${withdrawal.code} · ${formatNaira(withdrawal.amount)}`,
                        })
                      }
                      className="h-[46px] flex-1 items-center justify-center rounded-[14px] border border-white/20 bg-white/10 active:opacity-90"
                    >
                      <Text className="font-sans-bold text-[13px] text-white">Share</Text>
                    </Pressable>
                  </View>
                </View>

                <View className="mt-4 flex-row gap-3">
                  <View className="flex-1 gap-2 rounded-[20px] border border-white/10 bg-white/5 p-4">
                    <Text className="font-sans-semibold text-[10px] uppercase tracking-[1.5px] text-white/55">
                      Amount
                    </Text>
                    <Text className="font-grotesk-bold text-xl text-white">
                      {formatNaira(withdrawal.amount)}
                    </Text>
                  </View>
                  <View className="flex-1 gap-2 rounded-[20px] border border-white/10 bg-white/5 p-4">
                    <Text className="font-sans-semibold text-[10px] uppercase tracking-[1.5px] text-white/55">
                      Debit from
                    </Text>
                    <Text className="font-sans-bold text-sm text-white">Naira Wallet</Text>
                  </View>
                </View>

                <View className="mt-4 gap-4 rounded-[26px] bg-sheet p-[22px]">
                  <Text className="font-sans-extrabold text-[15px] text-ink">How to withdraw</Text>
                  {STEPS.map((step, i) => (
                    <View key={step} className="flex-row items-start gap-3">
                      <View
                        className={`h-[26px] w-[26px] items-center justify-center rounded-[9px] ${
                          i === STEPS.length - 1 ? 'bg-mint-bg' : 'bg-chip'
                        }`}
                      >
                        <Text
                          className={`font-sans-extrabold text-xs ${
                            i === STEPS.length - 1 ? 'text-mint-dark' : 'text-navy'
                          }`}
                        >
                          {i + 1}
                        </Text>
                      </View>
                      <Text className="flex-1 font-sans text-[13px] leading-5 text-ink-mid">
                        {step}
                      </Text>
                    </View>
                  ))}
                </View>

                <View className="mt-auto pt-5">
                  <Button
                    title="Cancel request"
                    variant="glass"
                    onPress={handleCancel}
                    loading={cancelling}
                  />
                </View>
              </>
            ) : askPin ? (
              <View className="mt-6 rounded-[26px] bg-sheet p-6">
                <Text className="text-center font-sans-bold text-sm text-ink">
                  Enter your transaction PIN
                </Text>
                <View className="py-5">
                  <PinDots filled={pin.length} />
                </View>
                <Numpad
                  onKey={(d) => {
                    if (!loading && pin.length < 4) setPin(pin + d);
                  }}
                  onDelete={() => setPin(pin.slice(0, -1))}
                />
                {loading ? (
                  <Text className="mt-4 text-center font-sans-semibold text-[12.5px] text-ink-muted">
                    Generating code…
                  </Text>
                ) : null}
                <Pressable onPress={() => setAskPin(false)} className="mt-4">
                  <Text className="text-center font-sans-bold text-[13px] text-navy">Back</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text className="mt-6 font-sans text-[13px] leading-5 text-white/60">
                  Generate a one-time code to withdraw cash from any supported ATM without your
                  card. The amount is held from your Naira Wallet until the code is used or expires.
                </Text>

                <Text className="mb-2 mt-6 font-sans-bold text-[11px] uppercase tracking-[1.8px] text-white/60">
                  Amount
                </Text>
                <View className="h-16 flex-row items-center gap-2 rounded-[18px] border border-white/15 bg-white/5 px-5">
                  <Text className="font-grotesk-bold text-[22px] text-white/60">₦</Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="number-pad"
                    placeholder="20,000"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    className="h-full flex-1 font-grotesk-bold text-[26px] text-white"
                  />
                </View>
                <View className="mt-3 flex-row gap-2">
                  {[5000, 10000, 20000, 40000].map((preset) => (
                    <Pressable
                      key={preset}
                      onPress={() => setAmount(String(preset))}
                      className={`h-9 flex-1 items-center justify-center rounded-xl ${
                        Number(amount) === preset
                          ? 'bg-mint'
                          : 'border border-white/15 bg-white/5'
                      }`}
                    >
                      <Text
                        className={`font-sans-bold text-[11px] ${
                          Number(amount) === preset ? 'text-mint-on' : 'text-white'
                        }`}
                      >
                        ₦{preset / 1000}k
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View className="mt-auto pt-6">
                  <Button title="Generate code" variant="mint" onPress={handleGenerate} />
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
