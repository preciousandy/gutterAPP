import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cardGradient } from '@/theme';
import { formatUsd } from '@/utils/format';
import { useSettings } from '@/context';
import type { VirtualCard } from '@/types';

/** The navy virtual-card visual with Mastercard circles and G watermark. */
export function CardFace({
  card,
  compact = false,
}: {
  /** null renders the "not issued" state from the create-card screen. */
  card: VirtualCard | null;
  compact?: boolean;
}) {
  const { hideBalances } = useSettings();
  return (
    <LinearGradient
      colors={[...cardGradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className={`${compact ? 'h-[172px]' : 'h-[214px]'} overflow-hidden rounded-3xl p-[22px] shadow-lg shadow-navy-darker/60`}
    >
      <Text
        className="absolute -bottom-24 -right-14 font-sans-extrabold text-white/5"
        style={{ fontSize: 280, lineHeight: 280, letterSpacing: -16 }}
      >
        G
      </Text>

      <View className="flex-1 justify-between">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="font-sans-extrabold text-base text-white">Gutter</Text>
            <Text className="mt-1 font-sans-semibold text-[8.5px] tracking-[2.5px] text-mint">
              VIRTUAL · USD
            </Text>
          </View>
          <View className="flex-row">
            <View className="h-[26px] w-[26px] rounded-full bg-[#EB001B]" />
            <View className="-ml-[11px] h-[26px] w-[26px] rounded-full bg-[#F79E1B]" />
          </View>
        </View>

        <Text
          className={`font-grotesk text-[19px] tracking-[3px] ${card ? 'text-white' : 'text-white/45'}`}
        >
          {card ? `${card.last4 === '' ? '••••' : '5399'}  ••••  ••••  ${card.last4}` : '••••  ••••  ••••  ••••'}
        </Text>

        <View className="flex-row items-end justify-between">
          {card ? (
            <View className="flex-row gap-5">
              <View>
                <Text className="font-sans-semibold text-[8px] tracking-[1.8px] text-white/50">
                  HOLDER
                </Text>
                <Text className="mt-1.5 font-sans-semibold text-xs text-white">
                  {card.holder_name.toUpperCase()}
                </Text>
              </View>
              <View>
                <Text className="font-sans-semibold text-[8px] tracking-[1.8px] text-white/50">EXP</Text>
                <Text className="mt-1.5 font-grotesk text-xs text-white">
                  {card.expiry_month}/{card.expiry_year}
                </Text>
              </View>
              <View>
                <Text className="font-sans-semibold text-[8px] tracking-[1.8px] text-white/50">CVV</Text>
                <Text className="mt-1.5 font-grotesk text-xs text-white">•••</Text>
              </View>
            </View>
          ) : (
            <Text className="font-sans-semibold text-[11px] tracking-[1.5px] text-white/45">
              CARD NOT ISSUED
            </Text>
          )}
          {card ? (
            <View className="items-end">
              <Text className="font-sans-semibold text-[8px] tracking-[1.8px] text-white/50">
                BALANCE
              </Text>
              <Text className="mt-1 font-grotesk-bold text-base text-mint">
                {hideBalances ? '$ • • •' : formatUsd(card.balance)}
              </Text>
            </View>
          ) : (
            <View className="h-[26px] justify-center rounded-[9px] bg-mint/15 px-[11px]">
              <Text className="font-sans-bold text-[10px] tracking-wide text-mint">
                READY TO CREATE
              </Text>
            </View>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}
