import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/context';
import { getDefaultLimitsForTier, getTransactionLimits } from '@/api/limits';
import { colors } from '@/theme';
import type { TierInfo, TransactionLimitsData } from '@/types';
import { formatNaira } from '@/utils/format';

export default function TransactionLimitsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [limitsData, setLimitsData] = useState<TransactionLimitsData>(() =>
    getDefaultLimitsForTier(user?.tier ?? 1)
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLimits = useCallback(async () => {
    try {
      const data = await getTransactionLimits();
      setLimitsData(data);
    } catch {
      // Keep cached / default tier values on error
      setLimitsData(getDefaultLimitsForTier(user?.tier ?? 1));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.tier]);

  useEffect(() => {
    void fetchLimits();
  }, [fetchLimits]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchLimits();
  };

  const currentTier = limitsData.current_tier;
  const isTier1 = currentTier === 1;
  const isTier2 = currentTier === 2;
  const isTier3 = currentTier >= 3;

  return (
    <View className="flex-1 bg-page">
      <GWatermark size={480} className="-right-36 top-52" />
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-[22px] pt-3">
          <ScreenHeader
            title="Transaction limits"
            right={
              <Pressable
                onPress={onRefresh}
                hitSlop={8}
                className="h-[38px] w-[38px] items-center justify-center rounded-xl border border-line-input bg-surface active:opacity-75"
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={colors.navy} />
                ) : (
                  <Ionicons name="reload-outline" size={17} color={colors.ink} />
                )}
              </Pressable>
            }
          />
        </View>

        <ScrollView
          contentContainerClassName="px-[22px] pb-10 pt-4"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.navy}
            />
          }
        >
          {/* Active Limit Hero Card */}
          <LinearGradient
            colors={[colors.navyDarkest, colors.navy, colors.navyDarker]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="overflow-hidden rounded-[26px] p-5 shadow-sm"
          >
            {/* Top row with badge */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                <View className="h-2 w-2 rounded-full bg-mint" />
                <Text className="font-sans-bold text-[11px] tracking-wide text-white">
                  {limitsData.short_name} ACTIVE
                </Text>
              </View>
              <Text className="font-sans text-[11.5px] text-white/70">Daily Limit</Text>
            </View>

            {/* Big Limit Amount */}
            <View className="mt-3">
              <Text className="font-grotesk text-[32px] text-white">
                {formatNaira(limitsData.daily_limit)}
              </Text>
              <Text className="font-sans text-[12px] text-white/65">
                Maximum transfer & withdrawal limit per calendar day
              </Text>
            </View>

            {/* Daily Usage Progress Bar */}
            <View className="mt-5 rounded-2xl bg-white/10 p-3.5">
              <View className="flex-row items-center justify-between pb-2">
                <Text className="font-sans-semibold text-[12px] text-white">
                  Today's Usage
                </Text>
                <Text className="font-grotesk text-[12px] text-white/90">
                  {limitsData.percentage_used}% used
                </Text>
              </View>

              {/* Progress Track */}
              <View className="h-2.5 w-full overflow-hidden rounded-full bg-white/20">
                <View
                  style={{ width: `${Math.max(4, Math.min(100, limitsData.percentage_used))}%` }}
                  className={`h-full rounded-full ${
                    limitsData.percentage_used > 85 ? 'bg-red' : 'bg-mint'
                  }`}
                />
              </View>

              <View className="mt-2.5 flex-row items-center justify-between">
                <Text className="font-sans text-[11.5px] text-white/70">
                  Spent: <Text className="font-grotesk font-semibold text-white">{formatNaira(limitsData.daily_spent)}</Text>
                </Text>
                <Text className="font-sans text-[11.5px] text-white/70">
                  Remaining: <Text className="font-grotesk font-semibold text-mint">{formatNaira(limitsData.daily_remaining)}</Text>
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Quick Stats Grid */}
          <View className="mt-3.5 flex-row gap-2.5">
            <View className="flex-1 rounded-[20px] border border-line-input bg-surface p-3.5">
              <View className="h-8 w-8 items-center justify-center rounded-xl bg-chip">
                <Ionicons name="arrow-up" size={16} color={colors.navy} />
              </View>
              <Text className="mt-2 font-sans text-[11px] text-ink-muted">Single Transfer</Text>
              <Text className="mt-0.5 font-grotesk text-[15px] text-ink">
                {formatNaira(limitsData.single_limit)}
              </Text>
            </View>

            <View className="flex-1 rounded-[20px] border border-line-input bg-surface p-3.5">
              <View className="h-8 w-8 items-center justify-center rounded-xl bg-chip">
                <Ionicons name="wallet-outline" size={16} color={colors.navy} />
              </View>
              <Text className="mt-2 font-sans text-[11px] text-ink-muted">Max Balance</Text>
              <Text className="mt-0.5 font-grotesk text-[15px] text-ink">
                {limitsData.max_balance ? formatNaira(limitsData.max_balance) : 'Unlimited'}
              </Text>
            </View>
          </View>

          {/* Upgrade Banner for Tier 1 */}
          {isTier1 && (
            <View className="mt-4 rounded-2xl border border-mint/30 bg-mint-bg p-4">
              <View className="flex-row items-start gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-mint/20">
                  <Ionicons name="shield-checkmark" size={20} color={colors.mintDark} />
                </View>
                <View className="flex-1">
                  <Text className="font-sans-bold text-[14px] text-ink">
                    Need higher limits?
                  </Text>
                  <Text className="mt-0.5 font-sans text-[12px] leading-[17px] text-ink-secondary">
                    Verify your identity with your NIN, BVN or Passport to unlock up to ₦5,000,000 daily transfers and virtual cards.
                  </Text>
                  <View className="mt-3">
                    <Button
                      title="Upgrade to Tier 2"
                      small
                      onPress={() => router.push('/(onboarding)/verify-identity')}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Tiers Breakdown Section */}
          <View className="mt-6">
            <Text className="font-sans-extrabold text-[15px] text-ink">
              All Account Tiers
            </Text>
            <Text className="mt-0.5 font-sans text-[12px] text-ink-muted">
              Higher tiers give you larger transfer limits and enhanced account features.
            </Text>

            <View className="mt-3.5 gap-3">
              {limitsData.tiers.map((t) => {
                const isCurrent = t.is_current;
                const isCompleted = t.status === 'completed';
                const isNext = t.status === 'next';

                return (
                  <View
                    key={t.tier}
                    className={`rounded-[22px] border p-4 ${
                      isCurrent
                        ? 'border-navy bg-surface shadow-sm'
                        : isCompleted
                          ? 'border-line-input bg-surface/80'
                          : 'border-line-input/70 bg-surface/50'
                    }`}
                  >
                    {/* Header Row */}
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View
                          className={`h-7 w-7 items-center justify-center rounded-lg ${
                            isCurrent
                              ? 'bg-navy'
                              : isCompleted
                                ? 'bg-mint-bg'
                                : 'bg-chip'
                          }`}
                        >
                          <Text
                            className={`font-sans-bold text-[12px] ${
                              isCurrent
                                ? 'text-white'
                                : isCompleted
                                  ? 'text-mint-dark'
                                  : 'text-ink-muted'
                            }`}
                          >
                            T{t.tier}
                          </Text>
                        </View>
                        <Text className="font-sans-bold text-[14px] text-ink">
                          {t.name}
                        </Text>
                      </View>

                      {/* Status Tag */}
                      <View
                        className={`rounded-full px-2.5 py-0.5 ${
                          isCurrent
                            ? 'bg-navy/10'
                            : isCompleted
                              ? 'bg-mint-bg'
                              : isNext
                                ? 'bg-amber-bg'
                                : 'bg-chip'
                        }`}
                      >
                        <Text
                          className={`font-sans-bold text-[10.5px] uppercase tracking-wider ${
                            isCurrent
                              ? 'text-navy'
                              : isCompleted
                                ? 'text-mint-dark'
                                : isNext
                                  ? 'text-amber'
                                  : 'text-ink-muted'
                          }`}
                        >
                          {isCurrent
                            ? 'Active'
                            : isCompleted
                              ? 'Completed'
                              : isNext
                                ? 'Next Level'
                                : 'Locked'}
                        </Text>
                      </View>
                    </View>

                    {/* Requirements */}
                    <View className="mt-2.5 flex-row items-center gap-1.5">
                      <Ionicons
                        name="information-circle-outline"
                        size={14}
                        color={colors.inkMuted}
                      />
                      <Text className="flex-1 font-sans text-[11.5px] text-ink-secondary">
                        {t.requirements}
                      </Text>
                    </View>

                    {/* Limits Summary */}
                    <View className="mt-3 rounded-xl bg-chip/60 p-2.5">
                      <View className="flex-row items-center justify-between">
                        <Text className="font-sans text-[11px] text-ink-muted">
                          Daily Outflow:
                        </Text>
                        <Text className="font-grotesk text-[12px] font-semibold text-ink">
                          {formatNaira(t.daily_limit)}
                        </Text>
                      </View>
                      <View className="mt-1 flex-row items-center justify-between">
                        <Text className="font-sans text-[11px] text-ink-muted">
                          Single Transfer:
                        </Text>
                        <Text className="font-grotesk text-[12px] font-semibold text-ink">
                          {formatNaira(t.single_limit)}
                        </Text>
                      </View>
                      <View className="mt-1 flex-row items-center justify-between">
                        <Text className="font-sans text-[11px] text-ink-muted">
                          Max Balance:
                        </Text>
                        <Text className="font-grotesk text-[12px] font-semibold text-ink">
                          {t.max_balance ? formatNaira(t.max_balance) : 'Unlimited'}
                        </Text>
                      </View>
                    </View>

                    {/* Action button if this is next tier */}
                    {isNext && t.tier === 2 && (
                      <View className="mt-3">
                        <Button
                          title="Verify identity to unlock"
                          small
                          variant="muted"
                          onPress={() => router.push('/(onboarding)/verify-identity')}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
