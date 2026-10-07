import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Toggle } from '@/components/Toggle';
import {
  getCryptoAddresses,
  simulateDeposit,
  toggleAutoConvert,
} from '@/api/crypto';
import { useWallet } from '@/context';
import { colors } from '@/theme';
import type { Coin, CryptoNetwork, CryptoWalletAddress } from '@/types';

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

export default function ReceiveCryptoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ symbol?: string }>();
  const { refreshWallet } = useWallet();

  const [symbol, setSymbol] = useState<Coin['symbol']>(
    (params.symbol as Coin['symbol']) || 'USDT'
  );
  const [addresses, setAddresses] = useState<CryptoWalletAddress[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<CryptoNetwork>('TRC20');
  const [autoConvert, setAutoConvert] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [updatingAutoConvert, setUpdatingAutoConvert] = useState(false);

  // Simulation modal state
  const [simModalVisible, setSimModalVisible] = useState(false);
  const [simAmount, setSimAmount] = useState('50');
  const [simulating, setSimulating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCryptoAddresses(symbol);
      setAddresses(res.addresses);
      setAutoConvert(res.auto_convert_crypto);
      if (res.addresses.length > 0) {
        // Keep selected if valid, or default to first
        const exists = res.addresses.some((a) => a.network === selectedNetwork);
        if (!exists) {
          setSelectedNetwork(res.addresses[0].network);
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to load wallet address. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [symbol, selectedNetwork]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeAddress =
    addresses.find((a) => a.network === selectedNetwork) || addresses[0];

  const handleCopy = async () => {
    if (!activeAddress) return;
    await Clipboard.setStringAsync(activeAddress.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (!activeAddress) return;
    try {
      await Share.share({
        message: `My Gutter ${symbol} (${activeAddress.network_name}) deposit address:\n\n${activeAddress.address}\n\nOnly send ${symbol} via ${activeAddress.network_name}.`,
      });
    } catch {
      // Ignored
    }
  };

  const handleToggleAutoConvert = async (next: boolean) => {
    setUpdatingAutoConvert(true);
    try {
      const res = await toggleAutoConvert(next);
      setAutoConvert(res.auto_convert_crypto);
    } catch {
      Alert.alert('Error', 'Could not update auto-convert preference.');
    } finally {
      setUpdatingAutoConvert(false);
    }
  };

  const handleExecuteSimulation = async () => {
    const val = Number(simAmount);
    if (!val || val <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to simulate.');
      return;
    }
    setSimulating(true);
    try {
      const res = await simulateDeposit({
        symbol,
        network: selectedNetwork,
        amount: val,
      });
      setSimModalVisible(false);
      void refreshWallet();
      Alert.alert(
        res.data.auto_converted ? 'Auto-Converted to Naira!' : 'Crypto Received!',
        res.message,
        [
          {
            text: 'Go to Wallet',
            onPress: () => router.replace('/(tabs)'),
          },
          { text: 'Done', style: 'cancel' },
        ]
      );
    } catch {
      Alert.alert('Simulation Failed', 'Could not simulate incoming deposit.');
    } finally {
      setSimulating(false);
    }
  };

  const currentCoin = COIN_CONFIG[symbol];

  return (
    <View className="flex-1 bg-page">
      <GWatermark size={480} className="-right-36 top-48" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-[22px] pt-3">
          <ScreenHeader title="Receive crypto" />
        </View>

        <ScrollView
          contentContainerClassName="px-[22px] pb-12 pt-4"
          showsVerticalScrollIndicator={false}
        >
          {/* Asset Selector */}
          <View className="mb-4 flex-row items-center justify-between rounded-[20px] border border-line bg-surface p-4 shadow-sm">
            <View className="flex-row items-center gap-3">
              <View
                className={`h-11 w-11 items-center justify-center rounded-2xl ${currentCoin.chipBg}`}
              >
                <Text className="font-sans-bold text-lg text-ink">
                  {currentCoin.glyph}
                </Text>
              </View>
              <View>
                <Text className="font-sans-bold text-[15px] text-ink">
                  {currentCoin.name}
                </Text>
                <Text className="font-sans text-[12px] text-ink-muted">{symbol}</Text>
              </View>
            </View>

            <View className="rounded-xl bg-chip px-3 py-1.5">
              <Text className="font-sans-bold text-[12px] text-navy">Deposit Ready</Text>
            </View>
          </View>

          {/* Network Selection Pills */}
          {addresses.length > 1 && (
            <View className="mb-4">
              <Text className="mb-2 font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-muted">
                Choose Network
              </Text>
              <View className="flex-row gap-2">
                {addresses.map((addr) => {
                  const active = selectedNetwork === addr.network;
                  return (
                    <Pressable
                      key={addr.network}
                      onPress={() => setSelectedNetwork(addr.network)}
                      className={`flex-1 rounded-2xl border px-3 py-2.5 items-center ${
                        active
                          ? 'border-navy bg-navy-deep'
                          : 'border-line bg-surface'
                      } active:opacity-85`}
                    >
                      <Text
                        className={`font-sans-bold text-[12.5px] ${
                          active ? 'text-white' : 'text-ink'
                        }`}
                      >
                        {addr.network}
                      </Text>
                      <Text
                        className={`mt-0.5 text-[10px] font-sans ${
                          active ? 'text-mint' : 'text-ink-muted'
                        }`}
                      >
                        {addr.network === 'TRC20'
                          ? 'Low Fee'
                          : addr.network === 'BEP20'
                          ? 'Fast'
                          : 'Standard'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {loading || !activeAddress ? (
            <View className="my-16 items-center justify-center">
              <ActivityIndicator size="large" color={colors.navy} />
              <Text className="mt-3 font-sans text-xs text-ink-muted">
                Generating your secure deposit address…
              </Text>
            </View>
          ) : (
            <>
              {/* QR Code & Address Card */}
              <View className="items-center rounded-[28px] border border-line bg-surface p-6 shadow-sm">
                <View className="rounded-3xl border border-line-input/80 bg-white p-4 shadow-sm">
                  <Image
                    source={{ uri: activeAddress.qr_code_url }}
                    style={{ width: 190, height: 190 }}
                    resizeMode="contain"
                  />
                </View>

                {/* Network Badge */}
                <View className="mt-4 flex-row items-center gap-1.5 rounded-full bg-chip px-3.5 py-1">
                  <View className="h-2 w-2 rounded-full bg-mint" />
                  <Text className="font-sans-bold text-[11px] text-navy">
                    {activeAddress.network_name}
                  </Text>
                </View>

                {/* Address Container */}
                <View className="mt-4 w-full rounded-2xl bg-page p-3.5 border border-line-soft">
                  <Text className="text-center font-grotesk-bold text-[13px] leading-[19px] text-ink select-all">
                    {activeAddress.address}
                  </Text>
                </View>

                {/* Actions: Copy & Share */}
                <View className="mt-4 w-full flex-row gap-2.5">
                  <Pressable
                    onPress={handleCopy}
                    hitSlop={8}
                    className={`flex-1 flex-row h-12 items-center justify-center gap-2 rounded-2xl border ${
                      copied
                        ? 'border-mint bg-mint-bg'
                        : 'border-line-input bg-surface active:bg-chip'
                    }`}
                  >
                    <Ionicons
                      name={copied ? 'checkmark-circle' : 'copy-outline'}
                      size={18}
                      color={copied ? colors.mint : colors.navy}
                    />
                    <Text
                      className={`font-sans-bold text-[13px] ${
                        copied ? 'text-mint' : 'text-navy'
                      }`}
                    >
                      {copied ? 'Copied!' : 'Copy address'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleShare}
                    hitSlop={8}
                    className="flex-1 flex-row h-12 items-center justify-center gap-2 rounded-2xl bg-navy active:opacity-85"
                  >
                    <Ionicons name="share-social-outline" size={18} color="#fff" />
                    <Text className="font-sans-bold text-[13px] text-white">
                      Share address
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Deposit specs */}
              <View className="mt-4 gap-2.5 rounded-[22px] border border-line bg-surface p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="font-sans text-[12px] text-ink-muted">Minimum deposit</Text>
                  <Text className="font-sans-bold text-[12px] text-ink">
                    {activeAddress.min_deposit} {symbol}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="font-sans text-[12px] text-ink-muted">Network arrival</Text>
                  <Text className="font-sans-bold text-[12px] text-ink">
                    {activeAddress.confirmations} confirmation
                    {activeAddress.confirmations > 1 ? 's' : ''}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="font-sans text-[12px] text-ink-muted">Network speed</Text>
                  <Text className="font-sans text-[12px] text-ink-secondary">
                    {activeAddress.fee_desc}
                  </Text>
                </View>
              </View>

              {/* Auto-Convert to Naira Banner & Toggle */}
              <View
                className={`mt-4 rounded-[22px] border p-4 ${
                  autoConvert
                    ? 'border-mint/60 bg-mint-bg/40'
                    : 'border-line bg-surface'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3 flex-1 pr-3">
                    <View
                      className={`h-10 w-10 items-center justify-center rounded-xl ${
                        autoConvert ? 'bg-mint' : 'bg-chip'
                      }`}
                    >
                      <Ionicons
                        name="swap-horizontal"
                        size={20}
                        color={autoConvert ? '#fff' : colors.navy}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans-bold text-[13.5px] text-ink">
                        Auto-convert to Naira
                      </Text>
                      <Text className="mt-0.5 font-sans text-[11px] leading-[15px] text-ink-muted">
                        {autoConvert
                          ? 'Active · Incoming deposits convert to NGN immediately'
                          : 'Inactive · Deposits remain in your crypto wallet'}
                      </Text>
                    </View>
                  </View>

                  <Toggle
                    value={autoConvert}
                    onChange={handleToggleAutoConvert}
                    disabled={updatingAutoConvert}
                  />
                </View>
              </View>

              {/* Action Buttons: Convert to Naira & Test Simulate */}
              <View className="mt-4 gap-2.5">
                <Button
                  title={`Convert ${symbol} to Naira`}
                  variant="dark"
                  onPress={() =>
                    router.push({
                      pathname: '/crypto/trade',
                      params: { side: 'sell', symbol },
                    })
                  }
                />

                <Button
                  title="Simulate incoming deposit (Test)"
                  variant="ghost"
                  onPress={() => setSimModalVisible(true)}
                />
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Simulated Deposit Sheet / Modal */}
      <Modal
        visible={simModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSimModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-navy-darkest/60">
          <View className="rounded-t-[32px] bg-surface p-6 pb-10">
            <View className="items-center pb-3">
              <View className="h-1 w-11 rounded-full bg-line-input" />
            </View>

            <Text className="font-sans-extrabold text-[18px] text-ink">
              Simulate Incoming {symbol}
            </Text>
            <Text className="mt-1 font-sans text-[12.5px] leading-[18px] text-ink-muted">
              Test receiving crypto into this address. If Auto-Convert is on, it will
              instantly credit your Naira wallet!
            </Text>

            <View className="mt-5 rounded-2xl border border-line-input bg-page p-4">
              <Text className="font-sans-bold text-[11px] uppercase tracking-[1px] text-ink-muted">
                Deposit Amount ({symbol})
              </Text>
              <TextInput
                value={simAmount}
                onChangeText={setSimAmount}
                keyboardType="decimal-pad"
                placeholder="50"
                className="mt-2 font-grotesk-bold text-[28px] text-ink"
              />
            </View>

            <View className="mt-3 flex-row gap-2">
              {['25', '50', '100', '250'].map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => setSimAmount(preset)}
                  className={`flex-1 items-center justify-center rounded-xl py-2 ${
                    simAmount === preset ? 'bg-navy' : 'bg-chip'
                  }`}
                >
                  <Text
                    className={`font-sans-bold text-[11.5px] ${
                      simAmount === preset ? 'text-white' : 'text-navy'
                    }`}
                  >
                    {preset} {symbol}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="mt-6 flex-row gap-3">
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setSimModalVisible(false)}
                className="flex-1"
              />
              <Button
                title={simulating ? 'Simulating…' : 'Confirm Deposit'}
                variant="dark"
                loading={simulating}
                onPress={handleExecuteSimulation}
                className="flex-1"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
