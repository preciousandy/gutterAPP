import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import * as Clipboard from 'expo-clipboard';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { getCryptoBalances, getMarket, getSendFee, sendCrypto } from '@/api/crypto';
import { setPendingAction } from '@/lib/pendingAction';
import { colors } from '@/theme';
import type { Coin, CryptoHolding, CryptoNetwork, CryptoSendFee } from '@/types';
import { formatCrypto, formatNaira } from '@/utils/format';

const COIN_CONFIG: Record<
  Coin['symbol'],
  { name: string; glyph: string; chipBg: string; logoBg: string }
> = {
  USDT: { name: 'Tether USD', glyph: '₮', chipBg: 'bg-mint-bg', logoBg: 'bg-mint-dark' },
  BTC: { name: 'Bitcoin', glyph: '₿', chipBg: 'bg-btc-bg', logoBg: 'bg-btc-logo' },
  ETH: { name: 'Ethereum', glyph: 'Ξ', chipBg: 'bg-eth-bg', logoBg: 'bg-eth' },
  SOL: { name: 'Solana', glyph: 'S', chipBg: 'bg-sol-bg', logoBg: 'bg-sol' },
  BNB: { name: 'BNB Chain', glyph: 'B', chipBg: 'bg-bnb-bg', logoBg: 'bg-bnb' },
};

const COIN_NETWORKS: Record<Coin['symbol'], { network: CryptoNetwork; name: string }[]> = {
  USDT: [
    { network: 'TRC20', name: 'Tron (TRC20)' },
    { network: 'BEP20', name: 'BNB Smart Chain (BEP20)' },
    { network: 'ERC20', name: 'Ethereum (ERC20)' },
  ],
  BTC: [{ network: 'BTC', name: 'Bitcoin Network' }],
  ETH: [{ network: 'ERC20', name: 'Ethereum Network' }],
  SOL: [{ network: 'SOL', name: 'Solana Network' }],
  BNB: [{ network: 'BEP20', name: 'BNB Smart Chain (BEP20)' }],
};

export default function SendCryptoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ symbol?: string; recipient?: string }>();

  const [symbol, setSymbol] = useState<Coin['symbol']>(
    (params.symbol as Coin['symbol']) || 'USDT'
  );
  const [destinationType, setDestinationType] = useState<'gutter_user' | 'external_address'>(
    'gutter_user'
  );
  const [recipient, setRecipient] = useState(params.recipient || '');
  const [network, setNetwork] = useState<CryptoNetwork>('TRC20');
  const [memo, setMemo] = useState('');
  const [amount, setAmount] = useState('');
  const [balances, setBalances] = useState<Record<string, CryptoHolding>>({});
  const [rate, setRate] = useState<number>(1500);
  const [feeInfo, setFeeInfo] = useState<CryptoSendFee | null>(null);
  const [loadingFee, setLoadingFee] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coinPicker, setCoinPicker] = useState(false);

  // Set default network when symbol changes
  useEffect(() => {
    const available = COIN_NETWORKS[symbol];
    if (available && available.length > 0) {
      setNetwork(available[0].network);
    }
  }, [symbol]);

  // Load balances and rate
  const loadData = useCallback(async () => {
    try {
      const [balRes, marketRes] = await Promise.all([
        getCryptoBalances().catch(() => null),
        getMarket().catch(() => null),
      ]);

      if (balRes?.balances) {
        const map: Record<string, CryptoHolding> = {};
        for (const b of balRes.balances) {
          map[b.symbol] = b;
        }
        setBalances(map);
      }

      if (marketRes?.coins) {
        const found = marketRes.coins.find((c) => c.symbol === symbol);
        if (found) setRate(found.price);
      }
    } catch {
      // fallback
    }
  }, [symbol]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Fetch fee whenever symbol, destinationType, or network changes
  useEffect(() => {
    let cancelled = false;
    setLoadingFee(true);
    getSendFee({
      symbol,
      destination_type: destinationType,
      network: destinationType === 'external_address' ? network : undefined,
    })
      .then((res) => {
        if (!cancelled) {
          setFeeInfo(res);
          setLoadingFee(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFeeInfo({
            symbol,
            fee: destinationType === 'gutter_user' ? 0 : 1,
            fee_naira: destinationType === 'gutter_user' ? 0 : 1500,
            destination_type: destinationType,
          });
          setLoadingFee(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, destinationType, network]);

  const currentHolding = balances[symbol]?.amount ?? 0;
  const numAmount = Number(amount.replace(/,/g, '')) || 0;
  const currentFee = feeInfo?.fee ?? (destinationType === 'gutter_user' ? 0 : 1);
  const totalCryptoNeeded = numAmount + currentFee;
  const fiatEquivalent = numAmount * rate;

  const handleMax = () => {
    if (destinationType === 'gutter_user') {
      setAmount(currentHolding > 0 ? currentHolding.toString() : '0');
    } else {
      const maxSendable = Math.max(0, currentHolding - currentFee);
      setAmount(maxSendable > 0 ? maxSendable.toFixed(6).replace(/\.?0+$/, '') : '0');
    }
  };

  const handlePasteAddress = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setRecipient(text.trim());
    }
  };

  const handleReview = () => {
    setError(null);

    if (!recipient.trim()) {
      setError(
        destinationType === 'gutter_user'
          ? 'Enter the recipient Gutter email or phone number.'
          : 'Enter the destination blockchain wallet address.'
      );
      return;
    }

    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount to send.');
      return;
    }

    if (totalCryptoNeeded > currentHolding) {
      setError(
        `Insufficient balance. You need ${formatCrypto(totalCryptoNeeded)} ${symbol} (including fee), but only have ${formatCrypto(currentHolding)} ${symbol}.`
      );
      return;
    }

    const shortRecipient =
      destinationType === 'external_address' && recipient.length > 12
        ? `${recipient.slice(0, 6)}...${recipient.slice(-4)}`
        : recipient;

    setPendingAction({
      title: 'Confirm Send Crypto',
      amountLabel: `${formatCrypto(numAmount, 6)} ${symbol}`,
      subtitle:
        destinationType === 'gutter_user'
          ? `Sending to Gutter user ${recipient} (Zero fee)`
          : `Sending via ${network} to ${shortRecipient}`,
      run: (pin) =>
        sendCrypto({
          symbol,
          destination_type: destinationType,
          recipient: recipient.trim(),
          amount: numAmount,
          pin,
          network: destinationType === 'external_address' ? network : undefined,
          memo: memo.trim() || undefined,
        }),
    });

    router.push('/security/confirm-pin');
  };

  const currentCoinStyle = COIN_CONFIG[symbol];
  const networksForSymbol = COIN_NETWORKS[symbol] || [];

  return (
    <View className="flex-1 bg-page">
      <GWatermark size={480} className="-right-40 bottom-28" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView
            contentContainerClassName="flex-grow px-[22px] pb-8 pt-3"
            keyboardShouldPersistTaps="handled"
          >
            <ScreenHeader title="Send Crypto" />

            {/* Destination Mode Toggle */}
            <View className="mt-[18px]">
              <SegmentedControl
                options={[
                  { value: 'gutter_user', label: 'To Gutter User (Free)' },
                  { value: 'external_address', label: 'External Wallet' },
                ]}
                value={destinationType}
                onChange={(next) => {
                  setDestinationType(next as any);
                  setError(null);
                }}
              />
            </View>

            {error ? (
              <View className="mt-4 flex-row items-center gap-2 rounded-2xl bg-red-bg p-3.5">
                <Ionicons name="alert-circle" size={18} color={colors.red} />
                <Text className="flex-1 font-sans text-[13px] text-red">{error}</Text>
              </View>
            ) : null}

            {/* Asset Selector & Available Balance */}
            <View className="mt-4 rounded-[22px] border border-line bg-surface p-4">
              <View className="flex-row items-center justify-between">
                <Text className="font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-muted">
                  Asset to send
                </Text>
                <Text className="font-sans text-[11px] text-ink-soft">
                  Available: <Text className="font-sans-bold text-ink">{formatCrypto(currentHolding, 4)} {symbol}</Text>
                </Text>
              </View>

              <Pressable
                onPress={() => setCoinPicker(true)}
                className="mt-3 flex-row items-center justify-between rounded-xl bg-page p-3 active:opacity-80"
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className={`h-9 w-9 items-center justify-center rounded-xl ${currentCoinStyle.logoBg}`}
                  >
                    <Text className="font-sans-bold text-sm text-white">
                      {currentCoinStyle.glyph}
                    </Text>
                  </View>
                  <View>
                    <Text className="font-sans-bold text-[15px] text-ink">
                      {currentCoinStyle.name}
                    </Text>
                    <Text className="font-sans text-xs text-ink-muted">{symbol}</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-1">
                  <Text className="font-sans-semibold text-xs text-mint-dark">Change</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.mint} />
                </View>
              </Pressable>
            </View>

            {/* Recipient Input */}
            <View className="mt-4 rounded-[22px] border border-line bg-surface p-4">
              <Text className="font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-muted">
                {destinationType === 'gutter_user' ? 'Gutter Recipient' : 'Destination Address'}
              </Text>

              {destinationType === 'gutter_user' ? (
                <>
                  <View className="mt-3 flex-row items-center rounded-xl bg-page px-3.5 py-2.5">
                    <Ionicons name="person-outline" size={18} color={colors.inkMuted} />
                    <TextInput
                      value={recipient}
                      onChangeText={(val) => {
                        setRecipient(val);
                        setError(null);
                      }}
                      placeholder="Email or phone number"
                      placeholderTextColor={colors.inkMuted}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      className="ml-2.5 flex-1 font-sans text-sm text-ink"
                    />
                  </View>
                  <Text className="mt-2 font-sans text-[11px] text-ink-soft">
                    Zero network fees · Settles immediately into their Gutter wallet.
                  </Text>
                </>
              ) : (
                <>
                  {/* Network Selector */}
                  <Text className="mt-3 font-sans-semibold text-xs text-ink">Choose Network</Text>
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {networksForSymbol.map((item) => {
                      const isSelected = item.network === network;
                      return (
                        <Pressable
                          key={item.network}
                          onPress={() => setNetwork(item.network)}
                          className={`rounded-xl px-3 py-2 border ${
                            isSelected
                              ? 'border-navy bg-navy'
                              : 'border-line bg-page'
                          }`}
                        >
                          <Text
                            className={`font-sans-bold text-xs ${
                              isSelected ? 'text-white' : 'text-ink'
                            }`}
                          >
                            {item.network}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Blockchain Address Input */}
                  <View className="mt-3 flex-row items-center rounded-xl bg-page px-3.5 py-2.5">
                    <TextInput
                      value={recipient}
                      onChangeText={(val) => {
                        setRecipient(val);
                        setError(null);
                      }}
                      placeholder={`Paste ${network} address`}
                      placeholderTextColor={colors.inkMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      className="flex-1 font-mono text-xs text-ink"
                    />
                    <Pressable
                      onPress={handlePasteAddress}
                      className="ml-2 rounded-lg bg-chip px-2.5 py-1 active:opacity-70"
                    >
                      <Text className="font-sans-bold text-[11px] text-navy">Paste</Text>
                    </Pressable>
                  </View>

                  {/* Optional Memo/Tag for networks that need it */}
                  <View className="mt-3 flex-row items-center rounded-xl bg-page px-3.5 py-2.5">
                    <TextInput
                      value={memo}
                      onChangeText={setMemo}
                      placeholder="Memo / Destination Tag (optional)"
                      placeholderTextColor={colors.inkMuted}
                      className="flex-1 font-sans text-xs text-ink"
                    />
                  </View>
                </>
              )}
            </View>

            {/* Amount Input */}
            <View className="mt-4 rounded-[22px] border border-line bg-surface p-4">
              <View className="flex-row items-center justify-between">
                <Text className="font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-muted">
                  Amount
                </Text>
                <Pressable
                  onPress={handleMax}
                  className="rounded-md bg-mint-bg px-2 py-0.5 active:opacity-70"
                >
                  <Text className="font-sans-bold text-[11px] text-mint-dark">USE MAX</Text>
                </Pressable>
              </View>

              <View className="mt-3 flex-row items-center justify-between">
                <TextInput
                  value={amount}
                  onChangeText={(val) => {
                    setAmount(val);
                    setError(null);
                  }}
                  placeholder="0.00"
                  placeholderTextColor={colors.inkMuted}
                  keyboardType="numeric"
                  className="flex-1 font-grotesk-bold text-[32px] text-ink"
                />
                <Text className="font-grotesk-bold text-lg text-ink-muted">{symbol}</Text>
              </View>

              <Text className="mt-1 font-sans text-xs text-ink-soft">
                ≈ {formatNaira(fiatEquivalent)}
              </Text>
            </View>

            {/* Fee & Breakdown Card */}
            <View className="mt-4 gap-2.5 rounded-[22px] border border-line bg-surface p-4">
              <View className="flex-row items-center justify-between">
                <Text className="font-sans text-xs text-ink-muted">Transfer Fee</Text>
                {loadingFee ? (
                  <ActivityIndicator size="small" color={colors.inkMuted} />
                ) : destinationType === 'gutter_user' ? (
                  <Text className="font-sans-bold text-xs text-mint-dark">FREE</Text>
                ) : (
                  <Text className="font-grotesk-bold text-xs text-ink">
                    {currentFee} {symbol} ({formatNaira(feeInfo?.fee_naira ?? currentFee * rate)})
                  </Text>
                )}
              </View>

              <View className="flex-row items-center justify-between">
                <Text className="font-sans text-xs text-ink-muted">Settlement Speed</Text>
                <Text className="font-sans-semibold text-xs text-ink">
                  {destinationType === 'gutter_user' ? 'Instant (0 seconds)' : '~5-15 mins'}
                </Text>
              </View>

              <View className="my-1 border-t border-line-soft" />

              <View className="flex-row items-center justify-between">
                <Text className="font-sans-bold text-xs text-ink">Total Deduction</Text>
                <Text className="font-grotesk-bold text-sm text-navy">
                  {formatCrypto(totalCryptoNeeded, 6)} {symbol}
                </Text>
              </View>
            </View>

            {/* Review Button */}
            <View className="mt-6">
              <Button
                title={
                  destinationType === 'gutter_user'
                    ? 'Send to Gutter User'
                    : 'Review Blockchain Withdrawal'
                }
                onPress={handleReview}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Coin Selector Modal */}
      {coinPicker ? (
        <Pressable
          className="absolute inset-0 justify-end bg-navy-darkest/60"
          onPress={() => setCoinPicker(false)}
        >
          <View className="rounded-t-[32px] bg-surface px-6 pb-8 pt-4">
            <View className="items-center pb-3">
              <View className="h-1 w-11 rounded-full bg-line-input" />
            </View>
            <Text className="mb-3 font-sans-extrabold text-base text-ink">Select Asset to Send</Text>
            {(Object.keys(COIN_CONFIG) as Coin['symbol'][]).map((s) => {
              const cfg = COIN_CONFIG[s];
              const h = balances[s]?.amount ?? 0;
              const isSelected = s === symbol;
              return (
                <Pressable
                  key={s}
                  onPress={() => {
                    setSymbol(s);
                    setCoinPicker(false);
                    setAmount('');
                  }}
                  className={`flex-row items-center justify-between border-b border-line-soft py-3.5 ${
                    isSelected ? 'bg-mint-bg/30' : ''
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <View className={`h-9 w-9 items-center justify-center rounded-xl ${cfg.logoBg}`}>
                      <Text className="font-sans-bold text-sm text-white">{cfg.glyph}</Text>
                    </View>
                    <View>
                      <Text className="font-sans-bold text-sm text-ink">{cfg.name}</Text>
                      <Text className="font-sans text-xs text-ink-muted">{s}</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="font-grotesk-bold text-sm text-ink">
                      {formatCrypto(h, 4)} {s}
                    </Text>
                    <Text className="font-sans text-[11px] text-ink-muted">
                      ≈ {formatNaira(h * (balances[s]?.price ?? rate))}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
