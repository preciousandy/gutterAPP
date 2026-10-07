import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GWatermark } from '@/components/GWatermark';
import { EmptyState } from '@/components/EmptyState';
import { TransactionRow } from '@/components/TransactionRow';
import { Button } from '@/components/Button';
import { listTransactions } from '@/api/wallet';
import { errorMessage } from '@/api/client';
import { useAuth, useSettings, useWallet } from '@/context';
import { colors } from '@/theme';
import type { Transaction, TransactionDirection } from '@/types';
import { dayGroupLabel, formatNaira } from '@/utils/format';
import { downloadStatementPdf } from '@/utils/statementPdf';

type Filter = 'all' | TransactionDirection;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in', label: 'Money in' },
  { value: 'out', label: 'Money out' },
];

type PeriodOption = '30_days' | '90_days' | 'this_year' | 'all_time';

const PERIODS: { id: PeriodOption; label: string; sub: string }[] = [
  { id: '30_days', label: 'Last 30 days', sub: 'Recent monthly activity' },
  { id: '90_days', label: 'Last 90 days', sub: 'Quarterly financial overview' },
  { id: 'this_year', label: 'This year (2026)', sub: 'From 1 Jan 2026 to date' },
  { id: 'all_time', label: 'All time', sub: 'Complete account history' },
];

export default function TransactionsScreen() {
  const { user } = useAuth();
  const { wallet } = useWallet();
  const { hideBalances } = useSettings();

  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Statement modal state
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('30_days');
  const [generatingStatement, setGeneratingStatement] = useState(false);

  const load = useCallback(
    async (nextFilter: Filter, query: string, nextPage: number, append: boolean) => {
      append ? setLoadingMore(true) : setLoading(true);
      if (!append) setError(null);
      try {
        const res = await listTransactions({
          direction: nextFilter === 'all' ? undefined : nextFilter,
          search: query || undefined,
          page: nextPage,
        });
        setTransactions((prev) => (append ? [...prev, ...res.data] : res.data));
        setPage(res.meta.current_page);
        setLastPage(res.meta.last_page);
      } catch (e) {
        if (!append) {
          setTransactions([]);
          setError(errorMessage(e));
        }
      } finally {
        append ? setLoadingMore(false) : setLoading(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      void load(filter, search, 1, false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter, load])
  );

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const label = dayGroupLabel(t.created_at);
      map.set(label, [...(map.get(label) ?? []), t]);
    }
    return Array.from(map.entries());
  }, [transactions]);

  const handleGenerateStatement = async (mode: 'download' | 'share') => {
    setGeneratingStatement(true);
    try {
      const now = new Date();
      let fromDate: Date | null = null;
      let periodLabel = 'Last 30 Days';

      if (selectedPeriod === '30_days') {
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        periodLabel = 'Last 30 Days';
      } else if (selectedPeriod === '90_days') {
        fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        periodLabel = 'Last 90 Days';
      } else if (selectedPeriod === 'this_year') {
        fromDate = new Date(now.getFullYear(), 0, 1);
        periodLabel = `Year ${now.getFullYear()}`;
      } else {
        fromDate = null;
        periodLabel = 'All Time';
      }

      const fromDateStr = fromDate ? fromDate.toISOString().split('T')[0] : undefined;
      const toDateStr = now.toISOString().split('T')[0];

      // Fetch transactions for statement
      let statementTxs = transactions;
      try {
        const res = await listTransactions({
          from_date: fromDateStr,
          to_date: toDateStr,
          per_page: 100,
        });
        if (res.data && res.data.length > 0) {
          statementTxs = res.data;
        }
      } catch {
        if (fromDate) {
          statementTxs = transactions.filter((t) => new Date(t.created_at) >= fromDate!);
        }
      }

      const formattedStartDate = fromDate
        ? fromDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Account Opening';
      const formattedEndDate = now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      if (mode === 'download') {
        await downloadStatementPdf({
          user,
          wallet,
          transactions: statementTxs,
          periodLabel,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
        });
        setShowStatementModal(false);
      } else {
        let totalIn = 0;
        let totalOut = 0;
        statementTxs.forEach((t) => {
          if (t.direction === 'in') totalIn += Math.abs(t.amount);
          else totalOut += Math.abs(t.amount);
        });

        await Share.share({
          title: `Gutter Statement - ${wallet?.account_number ?? 'Account'}`,
          message:
            `📊 GUTTER ACCOUNT STATEMENT\n` +
            `--------------------------------\n` +
            `Account: ${user ? `${user.first_name} ${user.last_name}` : 'Customer'}\n` +
            `Account No: ${wallet?.account_number ?? '0000000000'} (${wallet?.bank_name ?? 'Wema Bank'})\n` +
            `Period: ${periodLabel} (${formattedStartDate} - ${formattedEndDate})\n` +
            `Total Inflow: +₦${formatNaira(totalIn, 2)}\n` +
            `Total Outflow: -₦${formatNaira(totalOut, 2)}\n` +
            `Closing Balance: ₦${formatNaira(wallet?.balance ?? 0, 2)}\n` +
            `Total Transactions: ${statementTxs.length}\n` +
            `--------------------------------\n` +
            `Powered by Gutter Digital Bank`,
        });
      }
    } catch {
      Alert.alert(
        'Statement Error',
        'Unable to generate account statement at this time. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setGeneratingStatement(false);
    }
  };

  return (
    <View className="flex-1 bg-page">
      <GWatermark size={460} className="-right-40 bottom-24" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="flex-row items-center justify-between px-[22px] pt-3">
          <Text className="font-sans-extrabold text-[22px] tracking-tight text-ink">
            Transactions
          </Text>
          <Pressable
            onPress={() => setShowStatementModal(true)}
            className="h-9 flex-row items-center gap-1.5 rounded-xl border border-line-input bg-surface px-3.5 active:opacity-70"
          >
            <Ionicons name="document-text-outline" size={14} color={colors.navy} />
            <Text className="font-sans-bold text-xs text-navy">Statement</Text>
          </Pressable>
        </View>

        <View className="mx-[22px] mt-4 h-[46px] flex-row items-center gap-2.5 rounded-[14px] border border-line-input bg-surface px-4">
          <Ionicons name="search-outline" size={16} color={colors.inkFaint} />
          <TextInput
            className="h-full flex-1 font-sans text-sm text-ink"
            placeholder="Search transactions"
            placeholderTextColor={colors.inkFaint}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => void load(filter, search, 1, false)}
            returnKeyType="search"
          />
        </View>

        <View className="mt-3.5 flex-row gap-2 px-[22px]">
          {FILTERS.map((f) => {
            const active = f.value === filter;
            return (
              <Pressable
                key={f.value}
                onPress={() => setFilter(f.value)}
                className={`h-9 items-center justify-center rounded-xl px-[18px] ${
                  active ? 'bg-navy-deep' : 'border border-line-input bg-surface'
                }`}
              >
                <Text
                  className={`font-sans-bold text-xs ${active ? 'text-white' : 'text-ink-mid'}`}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator className="mt-10" color={colors.navy} size="large" />
        ) : error ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load transactions"
            message={error}
            actionTitle="Retry"
            onAction={() => void load(filter, search, 1, false)}
          />
        ) : (
          <ScrollView
            className="mt-2 flex-1"
            contentContainerClassName="px-[22px] pb-8"
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              const nearBottom =
                layoutMeasurement.height + contentOffset.y >= contentSize.height - 240;
              if (nearBottom && !loadingMore && page < lastPage) {
                void load(filter, search, page + 1, true);
              }
            }}
            scrollEventThrottle={120}
          >
            {groups.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="No transactions found"
                message="Transactions from your Laravel API will appear here."
              />
            ) : (
              groups.map(([label, items]) => (
                <View key={label} className="mt-4">
                  <Text className="mb-2.5 font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-soft">
                    {label}
                  </Text>
                  <View className="rounded-[20px] border border-line bg-surface px-4">
                    {items.map((t, i) => (
                      <TransactionRow
                        key={t.id}
                        transaction={t}
                        showStatus
                        last={i === items.length - 1}
                      />
                    ))}
                  </View>
                </View>
              ))
            )}
            {loadingMore ? <ActivityIndicator className="mt-4" color={colors.navy} /> : null}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Account Statement Modal */}
      <Modal
        visible={showStatementModal}
        animationType="slide"
        transparent
        onRequestClose={() => !generatingStatement && setShowStatementModal(false)}
      >
        <View className="flex-1 justify-end bg-navy-deep/60">
          <Pressable
            className="flex-1"
            onPress={() => !generatingStatement && setShowStatementModal(false)}
          />
          <View className="rounded-t-[32px] border-t border-line bg-surface p-6 pb-9 shadow-2xl">
            <View className="flex-row items-center justify-between pb-2">
              <View className="flex-row items-center gap-2.5">
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-navy/10">
                  <Ionicons name="document-text-outline" size={20} color={colors.navy} />
                </View>
                <Text className="font-sans-extrabold text-[20px] tracking-tight text-ink">
                  Account Statement
                </Text>
              </View>
              <Pressable
                onPress={() => setShowStatementModal(false)}
                disabled={generatingStatement}
                className="h-8 w-8 items-center justify-center rounded-full bg-line active:opacity-75"
              >
                <Ionicons name="close" size={18} color={colors.inkMid} />
              </Pressable>
            </View>

            <Text className="mt-1 font-sans text-xs text-ink-muted">
              Select a period to export your official electronic PDF account statement.
            </Text>

            {/* Account Info Card */}
            <View className="mt-4 flex-row items-center justify-between rounded-2xl border border-line-soft bg-page px-4 py-3">
              <View>
                <Text className="font-sans-semibold text-[10px] uppercase tracking-wider text-ink-soft">
                  Account
                </Text>
                <Text className="font-grotesk-bold text-[13px] text-ink">
                  {wallet?.account_number ?? '0000000000'}{' '}
                  <Text className="font-sans text-xs text-ink-muted">
                    ({wallet?.bank_name ?? 'Wema Bank'})
                  </Text>
                </Text>
              </View>
              <View className="items-end">
                <Text className="font-sans-semibold text-[10px] uppercase tracking-wider text-ink-soft">
                  Balance
                </Text>
                <Text className="font-grotesk-bold text-[13px] text-mint-dark">
                  {hideBalances ? '₦ • • • • • •' : `₦${formatNaira(wallet?.balance ?? 0, 2)}`}
                </Text>
              </View>
            </View>

            {/* Period Selector */}
            <Text className="mb-2 mt-4 font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-soft">
              Select Period
            </Text>
            <View className="gap-2">
              {PERIODS.map((p) => {
                const isSelected = selectedPeriod === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setSelectedPeriod(p.id)}
                    className={`flex-row items-center justify-between rounded-2xl border p-3.5 active:opacity-80 ${
                      isSelected
                        ? 'border-navy bg-navy/5'
                        : 'border-line-soft bg-surface'
                    }`}
                  >
                    <View>
                      <Text
                        className={`font-sans-bold text-[13px] ${
                          isSelected ? 'text-navy' : 'text-ink'
                        }`}
                      >
                        {p.label}
                      </Text>
                      <Text className="mt-0.5 font-sans text-[11px] text-ink-soft">{p.sub}</Text>
                    </View>
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? colors.navy : colors.inkSoft}
                    />
                  </Pressable>
                );
              })}
            </View>

            {/* Action Buttons */}
            <View className="mt-5 gap-2.5">
              <Button
                title={generatingStatement ? 'Generating Statement…' : 'Download PDF Statement'}
                loading={generatingStatement}
                onPress={() => void handleGenerateStatement('download')}
              />
              <Button
                title="Share Summary"
                variant="ghost"
                small
                disabled={generatingStatement}
                onPress={() => void handleGenerateStatement('share')}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
