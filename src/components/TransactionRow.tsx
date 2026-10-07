import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Transaction } from '@/types';
import { colors } from '@/theme';
import { formatSigned, formatTime } from '@/utils/format';

function getTransactionMeta(
  type: Transaction['type'],
  direction: Transaction['direction'],
  transaction?: Transaction
): {
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  color: string;
} {
  if (transaction) {
    const isElectricity = Boolean(
      transaction.token ||
      (transaction.title && /electric/i.test(transaction.title)) ||
      (transaction.subtitle && /meter/i.test(transaction.subtitle)) ||
      (transaction.counterparty && /electric|meter|disco/i.test(transaction.counterparty))
    );
    if (isElectricity) {
      return {
        icon: 'flash-outline',
        bg: 'bg-[#FEF3C7]',
        color: '#D97706',
      };
    }
    const isBetting = Boolean(
      (transaction.reference && transaction.reference.startsWith('BET_')) ||
      (transaction.title && /bet|sport|top-up|biller/i.test(transaction.title)) ||
      (transaction.counterparty_bank && /sporty|bet9ja|1xbet|betway|betking|bangbet|merrybet|nairabet|msport|betting/i.test(transaction.counterparty_bank)) ||
      (transaction.counterparty && /sporty|bet9ja|1xbet|betway|betking|bangbet|merrybet|nairabet|msport|betting/i.test(transaction.counterparty)) ||
      (transaction.description && /betting/i.test(transaction.description))
    );
    if (isBetting) {
      return {
        icon: 'trophy-outline',
        bg: 'bg-mint-bg',
        color: colors.mintDark,
      };
    }
    const isCable = Boolean(
      (transaction.reference && transaction.reference.startsWith('CBL_')) ||
      (transaction.title && /cable|dstv|gotv|startimes|showmax/i.test(transaction.title)) ||
      (transaction.counterparty_bank && /dstv|gotv|startimes|showmax/i.test(transaction.counterparty_bank)) ||
      (transaction.counterparty && /dstv|gotv|startimes|showmax/i.test(transaction.counterparty)) ||
      (transaction.description && /dstv|gotv|startimes|showmax|cable tv/i.test(transaction.description))
    );
    if (isCable) {
      return {
        icon: 'tv-outline',
        bg: 'bg-[#EEF2FF]',
        color: '#4F46E5',
      };
    }
  }

  switch (type) {
    case 'deposit':
      return {
        icon: 'arrow-down-outline',
        bg: 'bg-mint-bg',
        color: colors.mintDark,
      };
    case 'transfer':
      return direction === 'in'
        ? { icon: 'arrow-down-outline', bg: 'bg-mint-bg', color: colors.mintDark }
        : { icon: 'paper-plane-outline', bg: 'bg-chip', color: colors.navy };
    case 'airtime':
      return {
        icon: 'phone-portrait-outline',
        bg: 'bg-[#FFF7E8]',
        color: colors.btc,
      };
    case 'card_funding':
    case 'card_payment':
      return {
        icon: 'card-outline',
        bg: 'bg-[#EEF0FF]',
        color: colors.eth,
      };
    case 'crypto_buy':
      return {
        icon: 'logo-bitcoin',
        bg: 'bg-btc-bg',
        color: colors.btc,
      };
    case 'crypto_sell':
      return {
        icon: 'swap-horizontal-outline',
        bg: 'bg-eth-bg',
        color: colors.eth,
      };
    case 'atm_withdrawal':
      return {
        icon: 'cash-outline',
        bg: 'bg-red-bg',
        color: colors.red,
      };
    default:
      return direction === 'in'
        ? { icon: 'arrow-down-outline', bg: 'bg-mint-bg', color: colors.mintDark }
        : { icon: 'paper-plane-outline', bg: 'bg-chip', color: colors.navy };
  }
}

export function TransactionRow({
  transaction,
  showStatus = false,
  last = false,
  onPress,
}: {
  transaction: Transaction;
  showStatus?: boolean;
  last?: boolean;
  onPress?: () => void;
}) {
  const router = useRouter();
  const meta = getTransactionMeta(transaction.type, transaction.direction, transaction);
  const signedAmount =
    transaction.direction === 'in' ? Math.abs(transaction.amount) : -Math.abs(transaction.amount);

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    router.push({
      pathname: '/receipt',
      params: { data: JSON.stringify(transaction) },
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      className={`flex-row items-center gap-3 py-3 active:opacity-70 ${
        last ? '' : 'border-b border-line-soft'
      }`}
    >
      <View className={`h-[38px] w-[38px] items-center justify-center rounded-xl ${meta.bg}`}>
        <Ionicons name={meta.icon} size={18} color={meta.color} />
      </View>
      <View className="flex-1">
        <Text className="font-sans-bold text-[13px] text-ink">{transaction.title}</Text>
        <Text className="mt-1 font-sans text-[11px] text-ink-soft" numberOfLines={1}>
          {transaction.subtitle ?? formatTime(transaction.created_at)}
        </Text>
      </View>
      <View className="items-end">
        <Text
          className={`font-grotesk-bold text-[13px] ${
            signedAmount > 0 ? 'text-mint-dark' : 'text-ink'
          }`}
        >
          {formatSigned(signedAmount, transaction.currency === 'USD' ? 'USD' : 'NGN')}
        </Text>
        {showStatus ? (
          <Text
            className={`mt-1 font-sans-semibold text-[10px] ${
              transaction.status === 'successful'
                ? 'text-mint-dark'
                : transaction.status === 'pending'
                  ? 'text-btc'
                  : 'text-red'
            }`}
          >
            {transaction.status === 'successful'
              ? 'Successful'
              : transaction.status === 'pending'
                ? 'Pending'
                : 'Failed'}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
