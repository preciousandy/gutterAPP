import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useWallet } from '@/context';
import { fundCard, getCardPricing, listCards } from '@/api/cards';
import { setPendingAction } from '@/lib/pendingAction';
import { cardGradient, colors } from '@/theme';
import type { CardPricing, VirtualCard } from '@/types';
import { formatNaira, formatUsd } from '@/utils/format';

const PRESETS = [10, 20, 50, 100];

export default function FundCardScreen() {
  const router = useRouter();
  const { wallet, refreshWallet } = useWallet();
  const [card, setCard] = useState<VirtualCard | null>(null);
  const [pricing, setPricing] = useState<CardPricing | null>(null);
  const nairaBalance = wallet?.balance ?? null;
  const [amount, setAmount] = useState('50');
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshWallet();
      (async () => {
        try {
          const [cards, priceInfo] = await Promise.all([
            listCards(),
            getCardPricing().catch(() => null),
          ]);
          setCard(cards[0] ?? null);
          setPricing(priceInfo);
        } catch {
          // Errors surface on submit.
        }
      })();
    }, [refreshWallet])
  );

  const value = Number(amount.replace(/,/g, ''));
  const rate = pricing?.usd_rate ?? null;
  const feePercent = pricing?.funding_fee_percent ?? 1;
  const nairaEquivalent = rate && value ? value * rate : null;
  const fee = nairaEquivalent ? (nairaEquivalent * feePercent) / 100 : null;
  const totalDebit = nairaEquivalent != null && fee != null ? nairaEquivalent + fee : null;

  const handleFund = () => {
    setError(null);
    if (!card) {
      setError('No card to fund yet — create one first.');
      return;
    }
    if (!value || value < 2) {
      setError('Minimum load is $2.');
      return;
    }
    setPendingAction({
      title: 'Confirm card funding',
      amountLabel: formatUsd(value),
      subtitle: `Gutter USD · ${card.last4}${totalDebit ? ` · debit ${formatNaira(totalDebit)}` : ''}`,
      run: (pin) => fundCard(card.id, value, pin),
    });
    router.push('/security/confirm-pin');
  };

  return (
    <View className="flex-1 bg-page">
      <GWatermark size={480} className="-right-40 bottom-10" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView
            contentContainerClassName="flex-grow px-[22px] pb-6 pt-3"
            keyboardShouldPersistTaps="handled"
          >
            <ScreenHeader title="Fund card" />

            {error ? (
              <Text className="mt-4 rounded-2xl bg-red-bg p-3.5 font-sans text-[13px] text-red">
                {error}
              </Text>
            ) : null}

            <View className="mt-4 flex-row items-center gap-3 rounded-[20px] border border-line bg-surface p-4">
              <LinearGradient
                colors={[...cardGradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="h-[34px] w-[52px] overflow-hidden rounded-[9px]"
              >
                <View className="absolute bottom-1 right-1.5 h-2.5 w-2.5 rounded-full bg-[#F79E1B]" />
              </LinearGradient>
              <View className="flex-1">
                <Text className="font-sans-bold text-[13px] text-ink">
                  Gutter USD{card ? ` · ${card.last4}` : ''}
                </Text>
                <Text className="mt-0.5 font-sans text-[11px] text-ink-soft">
                  {card ? `Current balance ${formatUsd(card.balance)}` : 'No card yet'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color={colors.inkGhost} />
            </View>

            <View className="mt-4 gap-4 rounded-[22px] border border-line bg-surface p-5">
              <View className="flex-row items-center justify-between">
                <Text className="font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-muted">
                  Amount to load
                </Text>
                <Text className="font-sans text-[11px] text-ink-soft">Min $2</Text>
              </View>
              <View className="flex-row items-center justify-between gap-3">
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="50.00"
                  placeholderTextColor={colors.inkFaint}
                  className="flex-1 font-grotesk-bold text-[34px] text-ink"
                />
                <View className="h-10 flex-row items-center gap-2 rounded-[13px] bg-chip px-3.5">
                  <View className="h-[22px] w-[22px] items-center justify-center rounded-lg bg-navy">
                    <Text className="font-sans-bold text-[11px] text-white">$</Text>
                  </View>
                  <Text className="font-sans-bold text-[13px] text-ink">USD</Text>
                </View>
              </View>
              <View className="flex-row gap-2">
                {PRESETS.map((preset) => {
                  const active = value === preset;
                  return (
                    <Text
                      key={preset}
                      onPress={() => setAmount(String(preset))}
                      className={`h-8 flex-1 rounded-[10px] text-center font-sans-bold text-[11px] leading-8 ${
                        active ? 'bg-navy-deep text-white' : 'bg-page text-ink-mid'
                      }`}
                    >
                      ${preset}
                    </Text>
                  );
                })}
              </View>
            </View>

            <View className="mt-4 rounded-[22px] border border-line bg-surface px-5">
              <SummaryRow
                label="Exchange rate"
                value={rate ? `$1 = ${formatNaira(rate)}` : '—'}
              />
              <SummaryRow
                label={`Funding fee (${feePercent}%)`}
                value={fee != null ? formatNaira(fee) : '—'}
              />
              <SummaryRow
                label="You will be debited"
                value={totalDebit != null ? formatNaira(totalDebit) : '—'}
                bold
                last
              />
            </View>

            <Text className="mb-2 mt-4 font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-muted">
              Pay from
            </Text>
            <View className="h-[62px] flex-row items-center gap-3 rounded-[18px] border-[1.5px] border-navy bg-surface px-4">
              <View className="h-[38px] w-[38px] items-center justify-center rounded-xl bg-chip">
                <Text className="font-sans-bold text-[15px] text-navy">₦</Text>
              </View>
              <View className="flex-1">
                <Text className="font-sans-bold text-[13px] text-ink">Naira Wallet</Text>
                <Text className="mt-0.5 font-sans text-[11px] text-ink-soft">
                  {nairaBalance != null ? `${formatNaira(nairaBalance)} available` : ''}
                </Text>
              </View>
              <View className="h-5 w-5 items-center justify-center rounded-full bg-navy">
                <Ionicons name="checkmark" size={12} color={colors.white} />
              </View>
            </View>

            <View className="mt-4 flex-row items-start gap-3 rounded-2xl bg-chip p-3.5">
              <View className="h-5 w-5 items-center justify-center rounded-md bg-navy">
                <Ionicons name="flash" size={11} color={colors.white} />
              </View>
              <Text className="flex-1 font-sans text-[11px] leading-4 text-ink-slate">
                Funds land on the card instantly. The rate is locked once you confirm with your PIN.
              </Text>
            </View>

            <View className="mt-auto pt-6">
              <Button
                title={value ? `Fund ${formatUsd(value)}` : 'Fund card'}
                onPress={handleFund}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  bold = false,
  last = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between py-3.5 ${last ? '' : 'border-b border-line-soft'}`}
    >
      <Text
        className={`text-xs ${bold ? 'font-sans-bold text-[12.5px] text-ink' : 'font-sans-semibold text-ink-muted'}`}
      >
        {label}
      </Text>
      <Text className={`font-grotesk-bold ${bold ? 'text-[15px]' : 'text-xs'} text-ink`}>
        {value}
      </Text>
    </View>
  );
}
