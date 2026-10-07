import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { CardFace } from '@/components/CardFace';
import { GWatermark } from '@/components/GWatermark';
import { ScreenHeader } from '@/components/ScreenHeader';
import { createCard, getCardPricing } from '@/api/cards';
import { setPendingAction } from '@/lib/pendingAction';
import { colors, headerGradient } from '@/theme';
import type { CardPricing } from '@/types';
import { formatNaira, formatUsd } from '@/utils/format';

const BENEFITS = [
  'Works on Netflix, Spotify, Amazon and AWS',
  'Freeze, unfreeze and set limits any time',
  'Issued instantly after payment',
];

export default function CreateCardScreen() {
  const router = useRouter();
  const [pricing, setPricing] = useState<CardPricing | null>(null);

  useFocusEffect(
    useCallback(() => {
      getCardPricing()
        .then(setPricing)
        .catch(() => setPricing(null));
    }, [])
  );

  const fee = pricing?.creation_fee_usd ?? 5;

  const handleCreate = () => {
    setPendingAction({
      title: 'Confirm card creation',
      amountLabel: formatUsd(fee),
      subtitle: `charged from Naira Wallet${pricing ? ` · ${formatNaira(pricing.creation_fee_ngn)}` : ''}`,
      run: async (pin) => {
        const card = await createCard(pin);
        return {
          id: card.id,
          reference: `CARD-${card.last4}`,
          type: 'card_funding' as const,
          direction: 'out' as const,
          title: 'Card created',
          subtitle: `Gutter USD · ${card.last4}`,
          amount: fee,
          currency: 'USD' as const,
          status: 'successful' as const,
          created_at: new Date().toISOString(),
        };
      },
    });
    router.push('/security/confirm-pin');
  };

  return (
    <View className="flex-1 bg-page">
      <LinearGradient
        colors={[...headerGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        className="absolute left-0 right-0 top-0 h-[210px] overflow-hidden"
      >
        <GWatermark light size={400} className="-right-24 -top-24" />
      </LinearGradient>

      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView contentContainerClassName="flex-grow px-[22px] pb-6 pt-3">
          <ScreenHeader title="Create a card" dark />

          <View className="mt-4">
            <CardFace card={null} compact />
          </View>

          <Text className="mt-4 font-sans-extrabold text-[22px] tracking-tight text-ink">
            Dollar virtual card
          </Text>
          <Text className="mt-1.5 font-sans text-[13px] leading-5 text-ink-muted">
            Spend online worldwide in USD. Funded from your Naira wallet at the live rate.
          </Text>

          <View className="mt-4 rounded-[22px] border border-line bg-surface px-[18px]">
            <FeeRow label="One-time creation fee" value={formatUsd(fee)} big />
            <FeeRow
              label="Naira equivalent"
              value={pricing ? formatNaira(pricing.creation_fee_ngn) : '—'}
            />
            <FeeRow label="Monthly maintenance" value="Free" mint />
            <FeeRow label="Charged from" value="Naira Wallet" last />
          </View>

          <View className="mt-4 gap-[11px]">
            {BENEFITS.map((benefit) => (
              <View key={benefit} className="flex-row items-center gap-[11px]">
                <View className="h-[22px] w-[22px] items-center justify-center rounded-[7px] bg-mint-bg">
                  <Ionicons name="checkmark" size={12} color={colors.mintDark} />
                </View>
                <Text className="flex-1 font-sans text-[12.5px] text-ink-mid">{benefit}</Text>
              </View>
            ))}
          </View>

          <View className="mt-auto gap-3 pt-6">
            <Button title={`Create card · ${formatUsd(fee)}`} onPress={handleCreate} />
            <Text className="text-center font-sans text-[11px] text-ink-faint">
              By continuing you accept the card terms
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function FeeRow({
  label,
  value,
  big = false,
  mint = false,
  last = false,
}: {
  label: string;
  value: string;
  big?: boolean;
  mint?: boolean;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between py-[15px] ${
        last ? '' : 'border-b border-line-soft'
      }`}
    >
      <Text className="font-sans-semibold text-[12.5px] text-ink-mid">{label}</Text>
      <Text
        className={`${big ? 'font-grotesk-bold text-[15px]' : 'font-sans-bold text-[12.5px]'} ${
          mint ? 'text-mint-dark' : 'text-ink'
        }`}
      >
        {value}
      </Text>
    </View>
  );
}
