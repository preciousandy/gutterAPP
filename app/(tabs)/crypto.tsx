import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { GWatermark } from '@/components/GWatermark';
import { Sparkline } from '@/components/Sparkline';
import { getCryptoBalances, getMarket } from '@/api/crypto';
import { errorMessage } from '@/api/client';
import { colors, headerGradient } from '@/theme';
import type { Coin, CryptoHolding } from '@/types';
import { formatCrypto, formatNaira } from '@/utils/format';
import { useSettings } from '@/context';

const COIN_STYLE: Record<Coin['symbol'], { glyph: string; bg: string; fg: string }> = {
  BTC: { glyph: '₿', bg: 'bg-btc-bg', fg: 'text-btc' },
  ETH: { glyph: 'Ξ', bg: 'bg-eth-bg', fg: 'text-eth' },
  USDT: { glyph: '₮', bg: 'bg-mint-bg', fg: 'text-mint-dark' },
  BNB: { glyph: 'B', bg: 'bg-bnb-bg', fg: 'text-bnb' },
  SOL: { glyph: 'S', bg: 'bg-sol-bg', fg: 'text-sol' },
};

type MarketFilter = 'all' | 'gainers' | 'watchlist';

export default function CryptoScreen() {
  const router = useRouter();
  const { hideBalances } = useSettings();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [holdings, setHoldings] = useState<Record<string, number>>({});
  const [autoConvert, setAutoConvert] = useState(false);
  const [portfolio, setPortfolio] = useState<{ value: number; change: number } | null>(null);
  const [filter, setFilter] = useState<MarketFilter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [market, balancesData] = await Promise.all([
        getMarket(),
        getCryptoBalances().catch(() => null),
      ]);
      setCoins(market.coins);
      setPortfolio({ value: market.portfolio_value, change: market.portfolio_change });
      if (balancesData) {
        setAutoConvert(balancesData.auto_convert_crypto);
        const map: Record<string, number> = {};
        balancesData.balances.forEach((b) => {
          map[b.symbol] = b.amount;
        });
        setHoldings(map);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const visible = filter === 'gainers' ? coins.filter((c) => c.change_24h > 0) : coins;

  return (
    <View className="flex-1 bg-page">
      <LinearGradient
        colors={[...headerGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        className="absolute left-0 right-0 top-0 h-[190px] overflow-hidden"
      >
        <GWatermark light size={400} className="-right-28 -top-20" />
      </LinearGradient>

      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-[22px] pt-3">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="font-sans-extrabold text-[22px] tracking-tight text-white">
                Market
              </Text>
              <Text className="mt-2 font-sans text-xs text-white/60">
                Portfolio{' '}
                {portfolio
                  ? hideBalances
                    ? '₦ • • • • • •'
                    : formatNaira(portfolio.value)
                  : '—'}{' '}
                ·{' '}
                <Text className="font-sans-bold text-mint">
                  {portfolio
                    ? `${portfolio.change >= 0 ? '+' : ''}${portfolio.change.toFixed(1)}%`
                    : ''}
                </Text>
              </Text>
            </View>
            <View className="h-[34px] justify-center rounded-[11px] border border-white/20 bg-white/10 px-3.5">
              <Text className="font-sans-bold text-[11px] text-white">24H ▾</Text>
            </View>
          </View>

          <View className="mt-4 flex-row gap-2">
            {(
              [
                { value: 'all', label: 'All coins' },
                { value: 'gainers', label: 'Gainers' },
                { value: 'watchlist', label: 'Watchlist' },
              ] as { value: MarketFilter; label: string }[]
            ).map((f) => {
              const active = filter === f.value;
              return (
                <Pressable
                  key={f.value}
                  onPress={() => setFilter(f.value)}
                  className={`h-[34px] items-center justify-center rounded-[11px] px-4 ${
                    active ? 'bg-surface' : 'border border-white/20 bg-white/10'
                  }`}
                >
                  <Text
                    className={`font-sans-bold text-[11px] ${active ? 'text-ink' : 'text-white'}`}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ScrollView className="mt-4 flex-1" contentContainerClassName="px-[22px] pb-8">
          {/* Quick Action Pill Buttons */}
          <View className="mb-4 flex-row gap-2">
            <Pressable
              onPress={() => router.push('/crypto/receive')}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-navy py-2.5 active:opacity-85"
            >
              <Ionicons name="qr-code-outline" size={15} color="#fff" />
              <Text className="font-sans-bold text-xs text-white">Receive</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/crypto/send')}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-navy py-2.5 active:opacity-85"
            >
              <Ionicons name="arrow-up-circle-outline" size={15} color="#fff" />
              <Text className="font-sans-bold text-xs text-white">Send</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push({ pathname: '/crypto/trade', params: { side: 'sell' } })}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-line-input bg-surface py-2.5 active:bg-chip"
            >
              <Ionicons name="swap-horizontal" size={15} color={colors.navy} />
              <Text className="font-sans-bold text-xs text-navy">Convert</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push({ pathname: '/crypto/trade', params: { side: 'buy' } })}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-line-input bg-surface py-2.5 active:bg-chip"
            >
              <Ionicons name="add-circle-outline" size={15} color={colors.navy} />
              <Text className="font-sans-bold text-xs text-navy">Buy</Text>
            </Pressable>
          </View>

          {/* Auto-Convert to Naira Banner */}
          <Pressable
            onPress={() => router.push('/crypto/receive')}
            className={`mb-4 flex-row items-center justify-between rounded-2xl border p-3.5 ${
              autoConvert ? 'border-mint/50 bg-mint-bg/30' : 'border-line bg-surface'
            } active:opacity-85 shadow-sm`}
          >
            <View className="flex-row items-center gap-2.5 flex-1 pr-2">
              <View
                className={`h-8 w-8 items-center justify-center rounded-xl ${
                  autoConvert ? 'bg-mint' : 'bg-chip'
                }`}
              >
                <Ionicons
                  name="swap-horizontal"
                  size={16}
                  color={autoConvert ? '#fff' : colors.navy}
                />
              </View>
              <View className="flex-1">
                <Text className="font-sans-bold text-[12.5px] text-ink">
                  {autoConvert ? 'Auto-Convert to Naira is Active' : 'Auto-Convert to Naira is Off'}
                </Text>
                <Text className="font-sans text-[10.5px] text-ink-muted">
                  {autoConvert
                    ? 'Incoming deposits automatically convert to Naira'
                    : 'Tap to configure deposit addresses & auto-convert'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
          </Pressable>

          {loading && coins.length === 0 ? (
            <ActivityIndicator className="mt-10" color={colors.navy} size="large" />
          ) : error ? (
            <View className="rounded-[22px] border border-line bg-surface">
              <EmptyState
                icon="cloud-offline-outline"
                title="Couldn't load the market"
                message={error}
                actionTitle="Retry"
                onAction={() => void load()}
              />
            </View>
          ) : (
            <View className="rounded-[22px] border border-line bg-surface px-4 shadow-sm">
              {visible.length === 0 ? (
                <EmptyState
                  icon="trending-up"
                  title="Nothing here yet"
                  message={
                    filter === 'watchlist'
                      ? 'Coins you watch will appear here.'
                      : 'Market data from your Laravel API will appear here.'
                  }
                />
              ) : (
                visible.map((coin, i) => {
                  const style = COIN_STYLE[coin.symbol];
                  const up = coin.change_24h >= 0;
                  const holding = holdings[coin.symbol] ?? 0;
                  return (
                    <Pressable
                      key={coin.symbol}
                      onPress={() =>
                        router.push({
                          pathname: '/crypto/trade',
                          params: { side: 'buy', symbol: coin.symbol },
                        })
                      }
                      className={`flex-row items-center gap-3 py-3.5 active:opacity-80 ${
                        i === visible.length - 1 ? '' : 'border-b border-line-soft'
                      }`}
                    >
                      <View
                        className={`h-[38px] w-[38px] items-center justify-center rounded-xl ${style.bg}`}
                      >
                        <Text className={`font-sans-bold text-[15px] ${style.fg}`}>
                          {style.glyph}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="font-sans-bold text-[13px] text-ink">{coin.name}</Text>
                        <View className="flex-row items-center gap-2 mt-0.5">
                          <Text className="font-sans-semibold text-[10px] tracking-wide text-ink-soft">
                            {coin.symbol}
                          </Text>
                          {holding > 0 && (
                            <Text className="font-sans-bold text-[10px] text-mint-dark">
                              · Holding {formatCrypto(holding, 4)}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Sparkline values={coin.sparkline} up={up} />
                      <View className="w-[96px] items-end">
                        <Text className="font-grotesk-bold text-[12.5px] text-ink">
                          {formatNaira(coin.price)}
                        </Text>
                        <Text
                          className={`mt-1 font-sans-bold text-[10.5px] ${
                            up ? 'text-mint-dark' : 'text-red'
                          }`}
                        >
                          {up ? '▲' : '▼'} {Math.abs(coin.change_24h).toFixed(2)}%
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          )}

          <View className="mt-4 flex-row gap-3">
            <Button
              title="Receive crypto"
              variant="dark"
              small
              onPress={() => router.push('/crypto/receive')}
              className="flex-1"
            />
            <Button
              title="Convert to Naira"
              variant="ghost"
              small
              onPress={() => router.push({ pathname: '/crypto/trade', params: { side: 'sell' } })}
              className="flex-1"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
