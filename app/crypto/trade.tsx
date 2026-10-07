import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { getMarket, getQuote, placeOrder } from '@/api/crypto';
import { getDashboard } from '@/api/wallet';
import { errorMessage } from '@/api/client';
import { setPendingAction } from '@/lib/pendingAction';
import { colors } from '@/theme';
import type { Coin, CryptoQuote } from '@/types';
import { countdownTo, formatCrypto, formatNaira } from '@/utils/format';

const COIN_STYLE: Record<Coin['symbol'], { glyph: string; chipBg: string; logoBg: string }> = {
  BTC: { glyph: '₿', chipBg: 'bg-btc-bg', logoBg: 'bg-btc-logo' },
  ETH: { glyph: 'Ξ', chipBg: 'bg-eth-bg', logoBg: 'bg-eth' },
  USDT: { glyph: '₮', chipBg: 'bg-mint-bg', logoBg: 'bg-mint-dark' },
  BNB: { glyph: 'B', chipBg: 'bg-bnb-bg', logoBg: 'bg-bnb' },
  SOL: { glyph: 'S', chipBg: 'bg-sol-bg', logoBg: 'bg-sol' },
};

const BUY_PRESETS = [20_000, 50_000, 100_000];
const SELL_PRESETS = [0.25, 0.5, 0.75, 1];

export default function TradeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ side?: string; symbol?: string }>();
  const [side, setSide] = useState<'buy' | 'sell'>(params.side === 'sell' ? 'sell' : 'buy');
  const [symbol, setSymbol] = useState<Coin['symbol']>(
    (params.symbol as Coin['symbol']) || 'BTC'
  );
  const [coins, setCoins] = useState<Coin[]>([]);
  const [nairaBalance, setNairaBalance] = useState<number | null>(null);
  const [holding, setHolding] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<CryptoQuote | null>(null);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [coinPicker, setCoinPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const [market, dashboard] = await Promise.all([
            getMarket(),
            getDashboard().catch(() => null),
          ]);
          setCoins(market.coins);
          if (dashboard) {
            setNairaBalance(dashboard.wallet.balance);
            const asset = dashboard.balances.find((b) => b.asset === symbol);
            setHolding(asset?.amount ?? 0);
          }
        } catch {
          // Quotes will surface connectivity errors on demand.
        }
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [symbol])
  );

  // Debounced live quote.
  useEffect(() => {
    const value = Number(amount.replace(/,/g, ''));
    if (!value || value <= 0) {
      setQuote(null);
      return;
    }
    const timer = setTimeout(() => {
      getQuote({ side, symbol, amount: value })
        .then(setQuote)
        .catch(() => setQuote(null));
    }, 450);
    return () => clearTimeout(timer);
  }, [amount, side, symbol]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const coin = coins.find((c) => c.symbol === symbol);
  const style = COIN_STYLE[symbol];

  const handleReview = () => {
    setError(null);
    const value = Number(amount.replace(/,/g, ''));
    if (!value || value <= 0) {
      setError(side === 'buy' ? 'Enter how much Naira to spend.' : 'Enter how much to sell.');
      return;
    }
    setPendingAction({
      title: side === 'buy' ? 'Confirm purchase' : 'Confirm conversion',
      amountLabel:
        side === 'buy' ? formatNaira(value) : `${formatCrypto(value)} ${symbol}`,
      subtitle:
        side === 'buy'
          ? `buying ${symbol} at ${coin ? formatNaira(coin.price) : 'market rate'}`
          : `receiving ~${quote ? formatNaira(quote.fiat_amount) : '—'} into Naira Wallet`,
      run: (pin) => placeOrder({ side, symbol, amount: value, pin }),
    });
    router.push('/security/confirm-pin');
  };

  return (
    <View className="flex-1 bg-page">
      <GWatermark size={480} className="-right-40 bottom-28" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView
            contentContainerClassName="flex-grow px-[22px] pb-6 pt-3"
            keyboardShouldPersistTaps="handled"
          >
            <ScreenHeader
              title={side === 'buy' ? 'Buy crypto' : 'Convert crypto'}
            />

            <View className="mt-[18px]">
              <SegmentedControl
                options={[
                  { value: 'buy', label: 'Buy' },
                  { value: 'sell', label: 'Convert to NGN' },
                ]}
                value={side}
                onChange={(next) => {
                  setSide(next);
                  setAmount('');
                  setQuote(null);
                }}
              />
            </View>

            {error ? (
              <Text className="mt-4 rounded-2xl bg-red-bg p-3.5 font-sans text-[13px] text-red">
                {error}
              </Text>
            ) : null}

            <View className="mt-[18px] gap-4 rounded-[22px] border border-line bg-surface p-5">
              <View className="flex-row items-center justify-between">
                <Text className="font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-muted">
                  {side === 'buy' ? 'You pay' : 'You sell'}
                </Text>
                <Text className="font-sans text-[11px] text-ink-soft">
                  {side === 'buy'
                    ? nairaBalance != null
                      ? `Balance ${formatNaira(nairaBalance)}`
                      : ''
                    : holding != null
                      ? `Holding ${formatCrypto(holding)} ${symbol}`
                      : ''}
                </Text>
              </View>
              <View className="flex-row items-center justify-between gap-3">
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder={side === 'buy' ? '₦100,000' : '0.001234'}
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="decimal-pad"
                  className="flex-1 font-grotesk-bold text-[34px] text-ink"
                />
                {side === 'buy' ? (
                  <View className="h-10 flex-row items-center gap-2 rounded-[13px] bg-chip px-3.5">
                    <View className="h-[22px] w-[22px] items-center justify-center rounded-lg bg-navy">
                      <Text className="font-sans-bold text-[11px] text-white">₦</Text>
                    </View>
                    <Text className="font-sans-bold text-[13px] text-ink">NGN</Text>
                  </View>
                ) : (
                  <CoinChip symbol={symbol} onPress={() => setCoinPicker(true)} />
                )}
              </View>
              <View className="flex-row gap-2">
                {side === 'buy'
                  ? BUY_PRESETS.map((preset) => (
                      <PresetChip
                        key={preset}
                        label={`₦${preset / 1000}k`}
                        active={Number(amount.replace(/,/g, '')) === preset}
                        onPress={() => setAmount(String(preset))}
                      />
                    ))
                  : SELL_PRESETS.map((fraction) => (
                      <PresetChip
                        key={fraction}
                        label={fraction === 1 ? 'All' : `${fraction * 100}%`}
                        active={false}
                        onPress={() =>
                          holding != null && setAmount(formatCrypto(holding * fraction, 8))
                        }
                      />
                    ))}
                {side === 'buy' ? (
                  <PresetChip
                    label="Max"
                    active={false}
                    onPress={() => nairaBalance != null && setAmount(String(nairaBalance))}
                  />
                ) : null}
              </View>
            </View>

            <View className="z-10 -my-2.5 items-center">
              <View className="h-9 w-9 items-center justify-center rounded-xl border-4 border-page bg-navy-deep">
                <Ionicons name="arrow-down" size={15} color={colors.mint} />
              </View>
            </View>

            <View className="gap-4 rounded-[22px] border border-line bg-surface p-5">
              <Text className="font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-muted">
                You receive
              </Text>
              <View className="flex-row items-center justify-between gap-3">
                <Text className="flex-1 font-grotesk-bold text-[34px] text-ink" numberOfLines={1}>
                  {quote
                    ? side === 'buy'
                      ? formatCrypto(quote.crypto_amount, 8)
                      : formatNaira(quote.fiat_amount)
                    : '—'}
                </Text>
                {side === 'buy' ? (
                  <CoinChip symbol={symbol} onPress={() => setCoinPicker(true)} />
                ) : (
                  <View className="h-10 flex-row items-center gap-2 rounded-[13px] bg-chip px-3.5">
                    <View className="h-[22px] w-[22px] items-center justify-center rounded-lg bg-navy">
                      <Text className="font-sans-bold text-[11px] text-white">₦</Text>
                    </View>
                    <Text className="font-sans-bold text-[13px] text-ink">NGN</Text>
                  </View>
                )}
              </View>
            </View>

            <View className="mt-4 gap-3 rounded-[22px] border border-line bg-surface px-5 py-4">
              <InfoRow
                label="Live rate"
                value={coin ? `1 ${symbol} = ${formatNaira(coin.price)}` : '—'}
              />
              <InfoRow
                label={side === 'buy' ? 'Fee (0.5%)' : 'Network fee'}
                value={quote ? formatNaira(quote.fee) : '—'}
              />
              {side === 'buy' ? (
                <InfoRow
                  label="Rate expires in"
                  value={quote ? countdownTo(quote.expires_at, now) : '—'}
                  mint
                />
              ) : (
                <InfoRow label="Settlement" value="Instant" mint />
              )}
            </View>

            <Text className="mb-2 mt-4 font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-muted">
              {side === 'buy' ? 'Payment method' : 'Deposit into'}
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

            <View className="mt-auto pt-6">
              <Button
                title={side === 'buy' ? 'Review order' : 'Review conversion'}
                onPress={handleReview}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {coinPicker ? (
        <Pressable
          className="absolute inset-0 justify-end bg-navy-darkest/60"
          onPress={() => setCoinPicker(false)}
        >
          <View className="rounded-t-[32px] bg-surface px-6 pb-8 pt-4">
            <View className="items-center pb-3">
              <View className="h-1 w-11 rounded-full bg-line-input" />
            </View>
            <Text className="mb-2 font-sans-extrabold text-base text-ink">Choose asset</Text>
            {(Object.keys(COIN_STYLE) as Coin['symbol'][]).map((s) => (
              <Pressable
                key={s}
                onPress={() => {
                  setSymbol(s);
                  setCoinPicker(false);
                  setQuote(null);
                }}
                className="flex-row items-center gap-3 border-b border-line-soft py-3.5 active:bg-page"
              >
                <View
                  className={`h-9 w-9 items-center justify-center rounded-xl ${COIN_STYLE[s].chipBg}`}
                >
                  <Text className="font-sans-bold text-sm text-ink">{COIN_STYLE[s].glyph}</Text>
                </View>
                <Text className="flex-1 font-sans-semibold text-[15px] text-ink">
                  {coins.find((c) => c.symbol === s)?.name ?? s}
                </Text>
                {s === symbol ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.navy} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

function CoinChip({ symbol, onPress }: { symbol: Coin['symbol']; onPress: () => void }) {
  const style = COIN_STYLE[symbol];
  return (
    <Pressable
      onPress={onPress}
      className={`h-10 flex-row items-center gap-2 rounded-[13px] px-3.5 active:opacity-80 ${style.chipBg}`}
    >
      <View className={`h-[22px] w-[22px] items-center justify-center rounded-lg ${style.logoBg}`}>
        <Text className="font-sans-bold text-[11px] text-white">{style.glyph}</Text>
      </View>
      <Text className="font-sans-bold text-[13px] text-ink">{symbol} ▾</Text>
    </Pressable>
  );
}

function PresetChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`h-8 flex-1 items-center justify-center rounded-[10px] ${
        active ? 'bg-navy-deep' : 'bg-page'
      }`}
    >
      <Text className={`font-sans-bold text-[11px] ${active ? 'text-white' : 'text-ink-mid'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function InfoRow({ label, value, mint = false }: { label: string; value: string; mint?: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-sans-semibold text-xs text-ink-muted">{label}</Text>
      <Text className={`font-grotesk-bold text-xs ${mint ? 'text-mint-dark' : 'text-ink'}`}>
        {value}
      </Text>
    </View>
  );
}
