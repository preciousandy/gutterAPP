import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GWatermark } from '@/components/GWatermark';
import { BillsModal } from '@/components/BillsModal';
import { EmptyState } from '@/components/EmptyState';
import { FundAccountModal } from '@/components/FundAccountModal';
import { OfflineBanner } from '@/components/OfflineBanner';
import { TransactionRow } from '@/components/TransactionRow';
import { useAuth, useKycGate, useSettings, useWallet } from '@/context';
import { getNotifications } from '@/api/notifications';
import { colors, headerGradient } from '@/theme';
import { formatCrypto, formatNaira, formatNairaCompact, initials } from '@/utils/format';

const ASSET_STYLE: Record<string, { glyph: string; bg: string; fg: string }> = {
  NGN: { glyph: '₦', bg: 'bg-chip', fg: 'text-navy' },
  BTC: { glyph: '₿', bg: 'bg-btc-bg', fg: 'text-btc' },
  ETH: { glyph: 'Ξ', bg: 'bg-eth-bg', fg: 'text-eth' },
  USDT: { glyph: '₮', bg: 'bg-mint-bg', fg: 'text-mint-dark' },
  BNB: { glyph: 'B', bg: 'bg-bnb-bg', fg: 'text-bnb' },
  SOL: { glyph: 'S', bg: 'bg-sol-bg', fg: 'text-sol' },
};

export default function HomeScreen() {
  const { user, refreshUser } = useAuth();
  const { wallet, balances, recentTransactions, refreshWallet, error } = useWallet();
  const { hideBalances, toggleHideBalances } = useSettings();
  const { requireKyc } = useKycGate();
  const router = useRouter();
  const [fundModalVisible, setFundModalVisible] = useState(false);
  const [billsModalVisible, setBillsModalVisible] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const checkNotifications = useCallback(async () => {
    try {
      const res = await getNotifications();
      setUnreadNotifications(res.unread_count ?? 0);
    } catch {
      // Ignore background notification check error
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshWallet();
      void refreshUser();
      void checkNotifications();
    }, [refreshWallet, refreshUser, checkNotifications])
  );

  const onRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await Promise.all([refreshWallet(true), refreshUser(), checkNotifications()]);
    } finally {
      setPullRefreshing(false);
    }
  }, [refreshWallet, refreshUser, checkNotifications]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const fullName = user ? `${user.first_name} ${user.last_name}` : '';

  return (
    <View className="flex-1 bg-page">
      <LinearGradient
        colors={[...headerGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        className="absolute left-0 right-0 top-0 h-[300px] overflow-hidden"
      >
        <GWatermark light size={460} className="-right-28 -top-16" />
      </LinearGradient>

      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          contentContainerClassName="pb-8"
          refreshControl={
            <RefreshControl refreshing={pullRefreshing} onRefresh={onRefresh} tintColor="#fff" />
          }
        >
          <OfflineBanner />
          <View className="px-[22px] pt-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-white/20 bg-white/15">
                  <Text className="font-sans-bold text-base text-white">
                    {initials(user?.first_name, user?.last_name) || '–'}
                  </Text>
                </View>
                <View>
                  <Text className="font-sans text-xs text-white/60">{greeting}</Text>
                  <Text className="mt-0.5 font-sans-bold text-[15px] text-white">{fullName}</Text>
                </View>
              </View>
              <View className="flex-row gap-2.5">
                <Pressable
                  onPress={() => router.push('/(tabs)/transactions')}
                  hitSlop={8}
                  className="h-[38px] w-[38px] items-center justify-center rounded-xl border border-white/20 bg-white/10 active:opacity-70"
                >
                  <Ionicons name="search-outline" size={17} color={colors.white} />
                </Pressable>
                <Pressable
                  onPress={() => router.push('/notifications')}
                  hitSlop={8}
                  className="h-[38px] w-[38px] items-center justify-center rounded-xl border border-white/20 bg-white/10 active:opacity-70"
                >
                  <Ionicons name="notifications-outline" size={17} color={colors.white} />
                  {unreadNotifications > 0 && (
                    <View className="absolute right-2 top-2 h-[7px] w-[7px] rounded-full bg-mint" />
                  )}
                </Pressable>
              </View>
            </View>

            <View className="mt-5">
              <Pressable
                onPress={toggleHideBalances}
                className="flex-row items-center gap-2"
                hitSlop={8}
              >
                <Text className="font-sans-semibold text-xs tracking-wide text-white/60">
                  Naira balance
                </Text>
                <Ionicons
                  name={hideBalances ? 'eye-outline' : 'eye-off-outline'}
                  size={13}
                  color="rgba(255,255,255,0.45)"
                />
              </Pressable>
              <Text className="mt-2.5 font-grotesk-bold text-[40px] leading-[44px] text-white">
                {hideBalances ? '₦ • • • • • •' : formatNaira(wallet?.balance)}
              </Text>
              <Pressable
                onPress={() => setFundModalVisible(true)}
                hitSlop={6}
                className="mt-2 flex-row items-center gap-1.5 active:opacity-80"
              >
                <Text className="font-sans-semibold text-xs text-white/70">
                  {wallet ? `${wallet.bank_name} · ${wallet.account_number}` : ' '}
                </Text>
                <Ionicons name="copy-outline" size={12} color="rgba(255,255,255,0.6)" />
              </Pressable>
              <View className="mt-3.5 flex-row gap-3">
                <Pressable
                  onPress={() => setFundModalVisible(true)}
                  className="h-[50px] flex-1 flex-row items-center justify-center gap-1.5 rounded-[15px] bg-mint active:opacity-90"
                >
                  <Ionicons name="add" size={18} color={colors.mintOn} />
                  <Text className="font-sans-bold text-sm text-mint-on">Fund Account</Text>
                </Pressable>
                <Pressable
                  onPress={() => requireKyc(() => router.push('/transfer'), 'Bank Transfers')}
                  className="h-[50px] flex-1 flex-row items-center justify-center gap-1.5 rounded-[15px] border border-white/20 bg-white/10 active:opacity-90"
                >
                  <Feather name="arrow-up-right" size={17} color={colors.white} />
                  <Text className="font-sans-bold text-sm text-white">Transfer</Text>
                </Pressable>
              </View>
            </View>

            <View className="mt-5 flex-row rounded-[22px] bg-surface px-3.5 py-[18px] shadow-lg shadow-navy-deep/20">
              <QuickAction
                icon="paper-plane-outline"
                label={'Bank\nTransfer'}
                onPress={() => requireKyc(() => router.push('/transfer'), 'Bank Transfers')}
              />
              <QuickAction
                icon="arrow-up-circle-outline"
                label={'Send\nCrypto'}
                onPress={() => requireKyc(() => router.push('/crypto/send'), 'Send Crypto')}
              />
              <QuickAction
                icon="qr-code-outline"
                label={'Receive\nCrypto'}
                mint
                onPress={() => router.push('/crypto/receive')}
              />
              <QuickAction
                icon="swap-horizontal-outline"
                label={'Trade\nCrypto'}
                onPress={() =>
                  requireKyc(
                    () => router.push({ pathname: '/crypto/trade', params: { side: 'sell' } }),
                    'Crypto Trading'
                  )
                }
              />
              <QuickAction
                icon="flash-outline"
                label={'Pay\nBills'}
                onPress={() => router.push('/bills')}
              />
            </View>

            {/* KYC Notice banner when user is not verified */}
            {user?.kyc_status !== 'verified' ? (
              <KycNoticeCard
                status={user?.kyc_status ?? 'unverified'}
                onPress={() => router.push('/(onboarding)/verify-identity')}
              />
            ) : null}
          </View>

          <View className="mt-5 px-[22px]">
            <View className="flex-row items-center justify-between">
              <Text className="font-sans-extrabold text-[15px] text-ink">Your balances</Text>
              <Pressable onPress={() => router.push('/(tabs)/crypto')} hitSlop={8}>
                <Text className="font-sans-bold text-xs text-navy">See all</Text>
              </Pressable>
            </View>
            <View className="mt-2.5 flex-row gap-3">
              {balances.slice(0, 3).map((b) => {
                const style = ASSET_STYLE[b.asset] ?? ASSET_STYLE.NGN;
                return (
                  <View key={b.asset} className="flex-1 gap-2.5 rounded-[18px] border border-line bg-surface p-3.5">
                    <View className={`h-[30px] w-[30px] items-center justify-center rounded-[10px] ${style.bg}`}>
                      <Text className={`font-sans-bold text-[13px] ${style.fg}`}>{style.glyph}</Text>
                    </View>
                    <Text className="font-sans-semibold text-[10px] tracking-wide text-ink-soft">
                      {b.asset}
                    </Text>
                    <Text className="font-grotesk-bold text-sm text-ink">
                      {hideBalances
                        ? '• • •'
                        : b.asset === 'NGN'
                          ? formatNairaCompact(b.amount)
                          : formatCrypto(b.amount, 4)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View className="mt-5 px-[22px]">
            <View className="flex-row items-center justify-between">
              <Text className="font-sans-extrabold text-[15px] text-ink">Recent transactions</Text>
              <Pressable onPress={() => router.push('/(tabs)/transactions')} hitSlop={8}>
                <Text className="font-sans-bold text-xs text-navy">History</Text>
              </Pressable>
            </View>
            <View className="mt-2.5 rounded-[20px] border border-line bg-surface px-4">
              {error ? (
                <EmptyState
                  icon="cloud-offline-outline"
                  title="Couldn't load your account"
                  message={error}
                  actionTitle="Retry"
                  onAction={() => void refreshWallet()}
                />
              ) : recentTransactions.length === 0 ? (
                <EmptyState
                  icon="receipt-outline"
                  title="No transactions yet"
                  message="Fund your account to get started."
                />
              ) : (
                recentTransactions.slice(0, 4).map((t, i, arr) => (
                  <TransactionRow key={t.id} transaction={t} last={i === arr.length - 1} />
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <FundAccountModal
        visible={fundModalVisible}
        onClose={() => setFundModalVisible(false)}
        bankName={wallet?.bank_name || 'Wema Bank'}
        accountNumber={wallet?.account_number || '–'}
        accountName={fullName || 'Gutter Customer'}
        onDepositCrypto={() => router.push('/crypto/receive')}
      />

      <BillsModal
        visible={billsModalVisible}
        onClose={() => setBillsModalVisible(false)}
      />
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  mint = false,
  red = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  mint?: boolean;
  red?: boolean;
}) {
  const iconColor = mint ? colors.mintDark : red ? colors.red : colors.navy;

  return (
    <Pressable onPress={onPress} className="flex-1 items-center gap-2 active:opacity-80">
      <View
        className={`h-11 w-11 items-center justify-center rounded-[14px] ${mint ? 'bg-mint-bg' : red ? 'bg-red-bg' : 'bg-chip'
          }`}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text className="text-center font-sans-semibold text-[9.5px] leading-3 text-ink-mid">
        {label}
      </Text>
    </Pressable>
  );
}

function KycNoticeCard({
  status,
  onPress,
}: {
  status: 'unverified' | 'pending' | 'verified';
  onPress: () => void;
}) {
  const router = useRouter();

  if (status === 'verified') return null;

  if (status === 'pending') {
    return (
      <Pressable
        onPress={() => router.push('/(onboarding)/face-verification')}
        className="mt-4 flex-row items-center justify-between rounded-[22px] border border-[#BDEEDF] bg-mint-bg p-4 active:opacity-90 shadow-sm shadow-mint/10"
      >
        <View className="flex-1 flex-row items-center gap-3.5 pr-2">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
            <Ionicons name="scan-outline" size={21} color={colors.mintDark} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="font-sans-extrabold text-[13.5px] text-ink">Complete Face Check</Text>
              <View className="rounded-full bg-mint/20 px-2 py-0.5">
                <Text className="font-sans-bold text-[10px] text-mint-dark">Step 2</Text>
              </View>
            </View>
            <Text className="mt-0.5 font-sans text-xs leading-[16px] text-ink-mid">
              ID verified. Complete your quick face scan to finish verification.
            </Text>
          </View>
        </View>
        <View className="h-8 items-center justify-center rounded-xl border border-mint/30 bg-white px-3 shadow-sm">
          <Text className="font-sans-bold text-xs text-mint-dark">Scan →</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className="mt-4 flex-row items-center justify-between rounded-[22px] border border-amber-line bg-amber-bg p-4 active:opacity-90 shadow-sm shadow-amber/10"
    >
      <View className="flex-1 flex-row items-center gap-3 pr-2">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
          <Ionicons name="shield-outline" size={21} color="#C79A0B" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-sans-extrabold text-[13.5px] text-ink">Verify your identity</Text>
            <View className="rounded-full bg-amber/15 px-2 py-0.5">
              <Text className="font-sans-bold text-[10px] text-amber">Tier 1</Text>
            </View>
          </View>
          <Text className="mt-0.5 font-sans text-xs leading-[16px] text-ink-mid" numberOfLines={2}>
            Verify your BVN or NIN to upgrade to Tier 2 and unlock higher transfer limits.
          </Text>
        </View>
      </View>
      <View className="h-8 items-center justify-center rounded-xl border border-amber-line bg-white px-3 shadow-sm">
        <Text className="font-sans-bold text-xs text-ink">Verify →</Text>
      </View>
    </Pressable>
  );
}
