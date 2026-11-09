import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { GWatermark } from '@/components/GWatermark';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getCryptoTransactions } from '@/api/crypto';
import { errorMessage } from '@/api/client';
import { colors } from '@/theme';
import type { CryptoTransactionRecord } from '@/types';
import { formatCrypto, formatDateTime, formatNaira } from '@/utils/format';

type FilterType = 'all' | 'receive_crypto' | 'send_crypto' | 'convert_to_naira' | 'buy_crypto';

const TYPE_META: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; color: string }
> = {
  receive_crypto: {
    label: 'Receive Crypto',
    icon: 'arrow-down-circle-outline',
    bg: 'bg-mint-bg',
    color: colors.mint,
  },
  send_crypto: {
    label: 'Send Crypto',
    icon: 'arrow-up-circle-outline',
    bg: 'bg-chip',
    color: colors.navy,
  },
  convert_to_naira: {
    label: 'Convert to Naira',
    icon: 'swap-horizontal-outline',
    bg: 'bg-mint-bg',
    color: colors.mint,
  },
  buy_crypto: {
    label: 'Buy Crypto',
    icon: 'cart-outline',
    bg: 'bg-chip',
    color: colors.navy,
  },
};

export default function CryptoHistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');
  const [items, setItems] = useState<CryptoTransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<CryptoTransactionRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCryptoTransactions({
        type: filter === 'all' ? undefined : filter,
        per_page: 40,
      });
      setItems(res.data ?? []);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const statusBadgeStyle = (status: string) => {
    switch (status) {
      case 'successful':
        return { bg: 'bg-mint-bg', text: 'text-mint-dark' };
      case 'failed':
      case 'rejected':
        return { bg: 'bg-red-bg', text: 'text-red' };
      case 'refunded':
        return { bg: 'bg-chip', text: 'text-navy' };
      default:
        return { bg: 'bg-amber-bg', text: 'text-amber' };
    }
  };

  return (
    <View className="flex-1 bg-page">
      <GWatermark size={480} className="-right-36 top-48" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-[22px] pt-3">
          <ScreenHeader title="Crypto History" />

          {/* Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2 py-3"
          >
            {(
              [
                { value: 'all', label: 'All' },
                { value: 'receive_crypto', label: 'Receive' },
                { value: 'send_crypto', label: 'Send' },
                { value: 'convert_to_naira', label: 'Convert' },
                { value: 'buy_crypto', label: 'Buy' },
              ] as { value: FilterType; label: string }[]
            ).map((f) => {
              const active = filter === f.value;
              return (
                <Pressable
                  key={f.value}
                  onPress={() => setFilter(f.value)}
                  className={`h-9 items-center justify-center rounded-xl px-4 ${
                    active ? 'bg-navy-deep' : 'border border-line bg-surface'
                  }`}
                >
                  <Text
                    className={`font-sans-bold text-xs ${
                      active ? 'text-white' : 'text-ink-soft'
                    }`}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView
          contentContainerClassName="px-[22px] pb-12 pt-1"
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator size="large" color={colors.navy} className="mt-16" />
          ) : error ? (
            <View className="mt-4 rounded-[22px] border border-line bg-surface">
              <EmptyState
                icon="cloud-offline-outline"
                title="Couldn't load crypto history"
                message={error}
                actionTitle="Retry"
                onAction={() => void load()}
              />
            </View>
          ) : items.length === 0 ? (
            <View className="mt-4 rounded-[22px] border border-line bg-surface">
              <EmptyState
                icon="swap-horizontal-outline"
                title="No crypto transactions yet"
                message="Your deposits, withdrawals, Naira conversions, and crypto purchases will appear here."
              />
            </View>
          ) : (
            <View className="rounded-[24px] border border-line bg-surface px-4 shadow-sm">
              {items.map((tx, idx) => {
                const txType = tx.type || tx.transaction_type || 'receive_crypto';
                const meta = TYPE_META[txType] ?? TYPE_META.receive_crypto;
                const badge = statusBadgeStyle(tx.status);
                const isLast = idx === items.length - 1;

                return (
                  <Pressable
                    key={tx.id}
                    onPress={() => setSelectedTx(tx)}
                    className={`flex-row items-center gap-3 py-4 active:opacity-80 ${
                      isLast ? '' : 'border-b border-line-soft'
                    }`}
                  >
                    <View
                      className={`h-10 w-10 items-center justify-center rounded-xl ${meta.bg}`}
                    >
                      <Ionicons name={meta.icon} size={20} color={meta.color} />
                    </View>

                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="font-sans-bold text-[13px] text-ink">
                          {meta.label} · {tx.symbol}
                        </Text>
                        {tx.network ? (
                          <View className="rounded bg-chip px-1.5 py-0.5">
                            <Text className="font-sans-bold text-[9.5px] text-navy">
                              {tx.network}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="mt-0.5 font-sans text-[11px] text-ink-muted">
                        Ref: {tx.reference}
                      </Text>
                      <Text className="mt-0.5 font-sans text-[10.5px] text-ink-soft">
                        {formatDateTime(tx.created_at)}
                      </Text>
                    </View>

                    <View className="items-end">
                      <Text className="font-grotesk-bold text-[13px] text-ink">
                        {formatCrypto(tx.crypto_amount, 6)} {tx.symbol}
                      </Text>
                      <Text className="font-sans text-[11px] text-ink-soft">
                        {formatNaira(tx.fiat_amount)}
                      </Text>
                      <View className={`mt-1 rounded-full px-2 py-0.5 ${badge.bg}`}>
                        <Text className={`font-sans-bold text-[9.5px] uppercase ${badge.text}`}>
                          {tx.status}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Full Crypto Transaction Details Modal */}
      <Modal
        visible={!!selectedTx}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTx(null)}
      >
        <View className="flex-1 justify-end bg-navy-darkest/60">
          {selectedTx && (
            <View className="rounded-t-[32px] bg-surface p-6 pb-10">
              <View className="items-center pb-3">
                <View className="h-1 w-11 rounded-full bg-line-input" />
              </View>

              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-sans-extrabold text-[18px] text-ink">
                    {(TYPE_META[selectedTx.type]?.label ?? 'Crypto Transaction')}
                  </Text>
                  <Text className="mt-0.5 font-sans text-xs text-ink-muted">
                    {formatDateTime(selectedTx.created_at)}
                  </Text>
                </View>
                <View className={`rounded-full px-3 py-1 ${statusBadgeStyle(selectedTx.status).bg}`}>
                  <Text className={`font-sans-bold text-xs uppercase ${statusBadgeStyle(selectedTx.status).text}`}>
                    {selectedTx.status}
                  </Text>
                </View>
              </View>

              <View className="my-4 items-center rounded-2xl bg-page p-4 border border-line-soft">
                <Text className="font-grotesk-bold text-[26px] text-ink">
                  {formatCrypto(selectedTx.crypto_amount, 8)} {selectedTx.symbol}
                </Text>
                <Text className="mt-1 font-sans-semibold text-sm text-ink-soft">
                  ≈ {formatNaira(selectedTx.fiat_amount)}
                </Text>
              </View>

              <View className="gap-2.5 rounded-2xl border border-line bg-surface p-4">
                <DetailRow label="Transaction Type" value={TYPE_META[selectedTx.type]?.label ?? selectedTx.type} />
                <DetailRow label="Cryptocurrency" value={selectedTx.symbol} />
                <DetailRow label="Network" value={selectedTx.network || 'INTERNAL'} />
                <DetailRow label="Exchange Rate" value={`1 ${selectedTx.symbol} = ${formatNaira(selectedTx.exchange_rate)}`} />
                <DetailRow
                  label="Platform Fee"
                  value={
                    selectedTx.platform_fee_crypto > 0
                      ? `${formatCrypto(selectedTx.platform_fee_crypto, 6)} ${selectedTx.symbol} (${formatNaira(selectedTx.platform_fee_ngn)})`
                      : formatNaira(selectedTx.platform_fee_ngn)
                  }
                />
                {selectedTx.network_fee > 0 && (
                  <DetailRow
                    label="Network Fee"
                    value={`${formatCrypto(selectedTx.network_fee, 6)} ${selectedTx.symbol}`}
                  />
                )}
                <DetailRow
                  label="Transaction Reference"
                  value={selectedTx.reference}
                  copyable
                />
                {selectedTx.quidax_reference ? (
                  <DetailRow
                    label="Quidax Reference"
                    value={selectedTx.quidax_reference}
                    copyable
                  />
                ) : null}
                {selectedTx.wallet_address ? (
                  <DetailRow
                    label="Wallet Address"
                    value={selectedTx.wallet_address}
                    copyable
                  />
                ) : null}
                {selectedTx.tx_hash ? (
                  <DetailRow
                    label="Blockchain TX Hash"
                    value={selectedTx.tx_hash}
                    copyable
                  />
                ) : null}
                {selectedTx.is_refunded && selectedTx.refund_reference ? (
                  <DetailRow
                    label="Refund Reference"
                    value={`${selectedTx.refund_reference} (${selectedTx.refunded_amount} ${selectedTx.refunded_currency})`}
                  />
                ) : null}
              </View>

              <View className="mt-6 flex-row gap-3">
                <Button
                  title="Close"
                  variant="ghost"
                  onPress={() => setSelectedTx(null)}
                  className="flex-1"
                />
                {selectedTx.transaction_id ? (
                  <Button
                    title="View Receipt"
                    variant="dark"
                    onPress={() => {
                      const txId = selectedTx.transaction_id;
                      setSelectedTx(null);
                      router.push({ pathname: '/receipt', params: { id: String(txId) } });
                    }}
                    className="flex-1"
                  />
                ) : null}
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({
  label,
  value,
  copyable = false,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="font-sans text-xs text-ink-muted">{label}</Text>
      <Pressable
        disabled={!copyable}
        onPress={() => {
          if (copyable) {
            void Clipboard.setStringAsync(value);
          }
        }}
        className="flex-row items-center gap-1 max-w-[62%]"
      >
        <Text className="font-sans-bold text-xs text-ink" numberOfLines={1}>
          {value}
        </Text>
        {copyable && <Ionicons name="copy-outline" size={12} color={colors.navy} />}
      </Pressable>
    </View>
  );
}

