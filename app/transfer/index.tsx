import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { useAuth, useKycGate, useWallet } from '@/context';
import { createTransfer, listBanks, verifyAccount } from '@/api/transfers';
import { fetchAppConfig, type AppConfig } from '@/api/config';
import { errorMessage } from '@/api/client';
import { setPendingAction } from '@/lib/pendingAction';
import { colors } from '@/theme';
import type { Bank } from '@/types';
import { formatNaira } from '@/utils/format';

const POPULAR_BANK_CODES = [
  '999991', // Gutter (Instant & Free)
  '000014', // Access Bank
  '100033', // PalmPay
  '100004', // OPay
  '090405', // Moniepoint
  '090267', // Kuda
  '000013', // GTBank
  '000015', // Zenith Bank
  '000016', // First Bank
  '000004', // UBA
  '000005', // Access Bank (Diamond)
  '044', '999992', '50515', '50211', '058', '057', '011', '033', '063'
];

export default function TransferScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { requireKyc } = useKycGate();
  const { wallet, refreshWallet } = useWallet();

  const [banks, setBanks] = useState<Bank[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const walletBalance = wallet?.balance ?? null;

  // Transfer state
  const [bankCode, setBankCode] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState<string | null>(null);
  const [verifyingBank, setVerifyingBank] = useState(false);
  const [isGutterAccount, setIsGutterAccount] = useState(false);
  const [resolvedGutterRecipientId, setResolvedGutterRecipientId] = useState<number | null>(null);

  // Common transfer state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  // Initial load
  useEffect(() => {
    void refreshWallet();
    let isMounted = true;
    listBanks()
      .then((bankList) => {
        if (isMounted) setBanks(bankList);
      })
      .catch(() => {});

    fetchAppConfig()
      .then((cfg) => {
        if (isMounted) setAppConfig(cfg);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [refreshWallet]);

  // Is this effectively a Gutter-to-Gutter transfer?
  const isGutterEffective = isGutterAccount || bankCode === '999991';

  // Real-time admin fee calculation
  const bankTransferFeeSetting = appConfig?.fees?.bank_transfer;

  const calculatedBankFee = useMemo(() => {
    if (isGutterEffective) return 0;
    const flat = Number(bankTransferFeeSetting?.flat_fee ?? 30);
    const percent = Number(bankTransferFeeSetting?.percent_fee ?? 0);
    const numAmount = Number(amount.replace(/,/g, '')) || 0;
    return flat + (numAmount * percent) / 100;
  }, [isGutterEffective, bankTransferFeeSetting, amount]);

  const bankFeeLabel = useMemo(() => {
    if (isGutterEffective) {
      return 'FREE · ₦0.00 Fee';
    }
    if (!bankTransferFeeSetting) {
      return `fee ${formatNaira(calculatedBankFee)}`;
    }
    const flat = Number(bankTransferFeeSetting.flat_fee ?? 0);
    const percent = Number(bankTransferFeeSetting.percent_fee ?? 0);
    const numAmount = Number(amount.replace(/,/g, '')) || 0;

    if (numAmount > 0) {
      return `fee ${formatNaira(calculatedBankFee)}`;
    }
    if (percent > 0 && flat > 0) {
      return `fee ${formatNaira(flat)} + ${percent}%`;
    }
    if (percent > 0) {
      return `fee ${percent}%`;
    }
    return `fee ${formatNaira(flat)}`;
  }, [isGutterEffective, bankTransferFeeSetting, amount, calculatedBankFee]);

  // Frequent popular banks for quick selection
  const popularBanks = useMemo(() => {
    const list: Bank[] = [];
    const seen = new Set<string>();
    for (const code of POPULAR_BANK_CODES) {
      const match = banks.find((b) => b.code === code);
      if (match) {
        const key = match.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!seen.has(key)) {
          seen.add(key);
          list.push(match);
        }
      }
      if (list.length >= 9) break;
    }
    return list;
  }, [banks]);

  // CBN NUBAN checksum algorithm to detect and suggest matching banks for the entered 10 digits
  const suggestedBanks = useMemo(() => {
    const digits = accountNumber.replace(/\D/g, '');
    if (digits.length !== 10 || banks.length === 0) return [];
    const serial = digits.slice(0, 9);
    const checkDigit = Number(digits[9]);
    const weights = [3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3];

    return banks
      .filter((b) => {
        const code = b.code.padStart(3, '0').slice(-3);
        if (!/^\d{3}$/.test(code)) return false;
        const str = code + serial;
        let sum = 0;
        for (let i = 0; i < 12; i++) {
          sum += Number(str[i]) * weights[i];
        }
        const calcCheck = (10 - (sum % 10)) % 10;
        return calcCheck === checkDigit;
      })
      .slice(0, 4);
  }, [accountNumber, banks]);

  // Auto-select when a single bank uniquely matches the entered NUBAN and user hasn't selected a bank yet
  useEffect(() => {
    if (!bankCode && !isGutterAccount && suggestedBanks.length === 1) {
      setBankCode(suggestedBanks[0].code);
    }
  }, [bankCode, isGutterAccount, suggestedBanks]);

  const ownAccountDigits = useMemo(() => {
    return (wallet?.account_number || user?.account_number || '').replace(/\D/g, '');
  }, [wallet?.account_number, user?.account_number]);

  // Resolve external account name or auto-detect Gutter user when 10 digits are entered
  useEffect(() => {
    const digits = accountNumber.replace(/\D/g, '');

    const isOwnGutterVirtualAccount =
      ownAccountDigits.length === 10 &&
      digits === ownAccountDigits &&
      (bankCode === '999991' || bankCode === '100033' || !bankCode);

    if (digits.length === 10 && isOwnGutterVirtualAccount) {
      setAccountName(null);
      setIsGutterAccount(false);
      setResolvedGutterRecipientId(null);
      setFieldErrors((prev) => ({
        ...prev,
        account_number: 'You cannot transfer money to your own Gutter deposit account.',
      }));
      setVerifyingBank(false);
      return;
    }

    if (digits.length !== 10) {
      setAccountName(null);
      setIsGutterAccount(false);
      setResolvedGutterRecipientId(null);
      return;
    }

    let cancelled = false;
    setVerifyingBank(true);
    setAccountName(null);
    setFieldErrors((prev) => ({ ...prev, account_number: undefined }));

    verifyAccount(bankCode, digits)
      .then((lookup) => {
        if (!cancelled) {
          if (lookup.is_gutter_user) {
            setAccountName(lookup.account_name);
            setIsGutterAccount(true);
            setResolvedGutterRecipientId(lookup.recipient_id ?? null);
            if (!bankCode) {
              setBankCode('999991');
            }
            setFieldErrors((prev) => ({ ...prev, account_number: undefined }));
          } else if (lookup.account_name) {
            setAccountName(lookup.account_name);
            setIsGutterAccount(false);
            setResolvedGutterRecipientId(null);
            setFieldErrors((prev) => ({ ...prev, account_number: undefined }));
          } else {
            setAccountName(null);
            setIsGutterAccount(false);
            setResolvedGutterRecipientId(null);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setAccountName(null);
          setIsGutterAccount(false);
          setResolvedGutterRecipientId(null);
          if (bankCode) {
            setFieldErrors((prev) => ({
              ...prev,
              account_number: errorMessage(err) || 'Could not verify account name.',
            }));
          }
        }
      })
      .finally(() => {
        if (!cancelled) setVerifyingBank(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bankCode, accountNumber, ownAccountDigits]);

  const handleContinue = () => {
    if (!requireKyc(undefined, 'Transfers')) {
      return;
    }

    setFormError(null);
    setFieldErrors({});
    const value = Number(amount.replace(/,/g, ''));

    if (!value || value <= 0) {
      setFieldErrors({ amount: 'Enter a valid amount.' });
      return;
    }

    const userTier = user?.tier ?? 1;
    const singleLimit = userTier >= 3 ? 5000000 : userTier === 2 ? 1000000 : 20000;
    if (value > singleLimit) {
      setFieldErrors({
        amount: `Exceeds single transfer limit of ${formatNaira(singleLimit)} for Tier ${userTier}. Upgrade your account to send more.`,
      });
      return;
    }

    const digits = accountNumber.replace(/\D/g, '');

    const isOwnGutterVirtualAccount =
      ownAccountDigits.length === 10 &&
      digits === ownAccountDigits &&
      (bankCode === '999991' || bankCode === '100033' || !bankCode);

    if (digits.length === 10 && isOwnGutterVirtualAccount) {
      setFieldErrors({ account_number: 'You cannot transfer money to your own Gutter deposit account.' });
      return;
    }

    if (digits.length !== 10) {
      setFieldErrors({ account_number: 'Enter the 10-digit account number.' });
      return;
    }
    if (!accountName) {
      setFieldErrors({ account_number: 'Please wait for account name verification to complete.' });
      return;
    }

    if (isGutterEffective) {
      setPendingAction({
        title: 'Confirm Gutter transfer',
        amountLabel: formatNaira(value),
        subtitle: `to ${accountName} · Gutter Account (Instant & Free)`,
        run: (pin) =>
          createTransfer({
            type: 'bank',
            bank_code: '999991',
            account_number: digits,
            recipient_id: resolvedGutterRecipientId ?? undefined,
            amount: value,
            description: description.trim() || null,
            pin,
          }),
      });
      router.push('/security/confirm-pin');
    } else {
      if (!bankCode) {
        setFieldErrors({ bank_code: 'Select a bank.' });
        return;
      }

      if (bankTransferFeeSetting && !bankTransferFeeSetting.is_enabled) {
        setFieldErrors({ amount: 'Bank transfers are temporarily paused for system maintenance.' });
        return;
      }

      const bank = banks.find((b) => b.code === bankCode);
      const feeNote = calculatedBankFee > 0 ? ` · Fee: ${formatNaira(calculatedBankFee)}` : ' · Free';
      setPendingAction({
        title: 'Confirm bank transfer',
        amountLabel: formatNaira(value),
        subtitle: `to ${accountName ?? 'recipient'} · ${bank?.name ?? 'bank'} ${digits}${feeNote}`,
        run: (pin) =>
          createTransfer({
            type: 'bank',
            bank_code: bankCode,
            account_number: digits,
            amount: value,
            description: description.trim() || null,
            pin,
          }),
      });
      router.push('/security/confirm-pin');
    }
  };

  return (
    <View className="flex-1 bg-page">
      <GWatermark size={460} className="-right-36 top-64" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView
            contentContainerClassName="flex-grow px-[22px] pb-6 pt-3"
            keyboardShouldPersistTaps="handled"
          >
            <ScreenHeader title="Transfer money" />

            {formError ? (
              <Text className="mt-4 rounded-2xl bg-red-bg p-3.5 font-sans text-[13px] text-red">
                {formError}
              </Text>
            ) : null}

            {/* UNIFIED TRANSFER FLOW */}
            <View className="mt-4">
              <SelectField
                label="Select bank"
                placeholder="Choose a bank"
                value={bankCode}
                onChange={(val) => {
                  setBankCode(val);
                  if (val !== '999991') {
                    setIsGutterAccount(false);
                    setResolvedGutterRecipientId(null);
                  }
                }}
                options={banks.map((b) => ({
                  value: b.code,
                  label: b.name,
                  badge: b.name
                    .split(' ')
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase(),
                }))}
                error={fieldErrors.bank_code}
                emptyMessage="Bank list unavailable. Check your connection."
                searchable={true}
                searchPlaceholder="Search bank name or code..."
              />

              {popularBanks.length > 0 ? (
                <View className="mb-3.5">
                  <Text className="mb-1.5 font-sans-bold text-[10px] uppercase tracking-[1.2px] text-ink-muted">
                    Frequent banks
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6 }}
                  >
                    {popularBanks.map((b) => {
                      const isSelected = bankCode === b.code;
                      const isGutterItem = b.code === '999991';
                      return (
                        <Pressable
                          key={b.code}
                          onPress={() => {
                            setBankCode(b.code);
                            if (!isGutterItem) {
                              setIsGutterAccount(false);
                              setResolvedGutterRecipientId(null);
                            }
                          }}
                          className={`rounded-xl px-3 py-1.5 border ${
                            isSelected
                              ? isGutterItem
                                ? 'bg-mint-dark border-mint-dark'
                                : 'bg-navy border-navy'
                              : 'bg-surface border-line-soft'
                          }`}
                        >
                          <View className="flex-row items-center gap-1.5">
                            {isGutterItem ? (
                              <Ionicons
                                name="flash"
                                size={12}
                                color={isSelected ? colors.white : colors.mintDark}
                              />
                            ) : null}
                            <Text
                              className={`font-sans-bold text-[12px] ${
                                isSelected
                                  ? 'text-white'
                                  : isGutterItem
                                    ? 'text-mint-dark'
                                    : 'text-ink'
                              }`}
                            >
                              {isGutterItem ? 'Gutter (Free)' : b.name.replace(/ Microfinance Bank| Bank| \(Paycom\)/g, '')}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              <Text className="mb-2 font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-muted">
                Account number
              </Text>
              <View
                className={`h-14 flex-row items-center rounded-2xl border bg-surface px-4 ${
                  fieldErrors.account_number
                    ? 'border-[1.5px] border-red'
                    : accountNumber.length > 0
                      ? 'border-[1.5px] border-navy'
                      : 'border-line-input'
                }`}
              >
                <TextInput
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  placeholder="0123456789"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="number-pad"
                  maxLength={10}
                  className="h-full flex-1 font-grotesk text-base tracking-wider text-ink"
                />
                {verifyingBank ? (
                  <View className="flex-row items-center gap-1">
                    <ActivityIndicator size="small" color={colors.inkMuted} />
                    <Text className="font-sans-semibold text-[11px] text-ink-faint">Checking…</Text>
                  </View>
                ) : null}
              </View>

              {suggestedBanks.length > 0 && !isGutterAccount ? (
                <View className="mt-2.5 rounded-2xl border border-mint-dark/30 bg-mint-bg/60 p-3">
                  <View className="flex-row items-center gap-1.5 mb-1.5">
                    <Ionicons name="sparkles" size={13} color={colors.mintDark} />
                    <Text className="font-sans-bold text-[11px] text-mint-deeper uppercase tracking-wider">
                      Suggested bank{suggestedBanks.length > 1 ? 's' : ''} for this account
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-1.5">
                    {suggestedBanks.map((sb) => {
                      const isSelected = bankCode === sb.code;
                      return (
                        <Pressable
                          key={sb.code}
                          onPress={() => setBankCode(sb.code)}
                          className={`flex-row items-center gap-1.5 rounded-xl px-3 py-1.5 border ${
                            isSelected ? 'bg-mint-dark border-mint-dark' : 'bg-white border-line-soft'
                          }`}
                        >
                          {isSelected ? (
                            <Ionicons name="checkmark-circle" size={12} color={colors.white} />
                          ) : null}
                          <Text
                            className={`font-sans-bold text-[12px] ${
                              isSelected ? 'text-white' : 'text-ink'
                            }`}
                          >
                            {sb.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {fieldErrors.account_number ? (
                <Text className="mt-1.5 font-sans text-[12px] text-red">
                  {fieldErrors.account_number}
                </Text>
              ) : null}

              {accountName ? (
                isGutterEffective ? (
                  <View style={localStyles.gutterDetectedCard}>
                    <View style={localStyles.gutterAvatar}>
                      <Text style={localStyles.gutterAvatarText}>
                        {accountName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="font-sans-bold text-[13px] text-ink">
                          {accountName.toUpperCase()}
                        </Text>
                        <Ionicons name="checkmark-circle" size={15} color={colors.mintDark} />
                      </View>
                      <View className="flex-row items-center gap-2 mt-0.5">
                        <Text className="font-sans text-[11px] text-mint-dark">
                          Gutter Account
                        </Text>
                        <View style={localStyles.freeBadge}>
                          <Ionicons name="flash" size={10} color={colors.mintDark} />
                          <Text style={localStyles.freeBadgeText}>FREE & INSTANT</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View className="mt-2 flex-row items-center gap-2 rounded-xl bg-mint-bg px-3.5 py-2.5">
                    <View className="h-[18px] w-[18px] items-center justify-center rounded-full bg-mint-dark">
                      <Ionicons name="checkmark" size={11} color={colors.white} />
                    </View>
                    <Text className="font-sans-bold text-xs text-mint-deeper">
                      {accountName.toUpperCase()}
                    </Text>
                  </View>
                )
              ) : null}
            </View>

            {/* Amount input */}
            <Text className="mb-2 mt-4 font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-muted">
              Amount
            </Text>
            <View
              className={`h-16 flex-row items-center gap-2 rounded-2xl border bg-surface px-4 ${
                fieldErrors.amount ? 'border-[1.5px] border-red' : 'border-line-input'
              }`}
            >
              <Text className="font-grotesk-bold text-[22px] text-ink-muted">₦</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="45,000"
                placeholderTextColor={colors.inkFaint}
                keyboardType="decimal-pad"
                className="h-full flex-1 font-grotesk-bold text-[26px] text-ink"
              />
            </View>
            {fieldErrors.amount ? (
              <Text className="mt-1.5 font-sans text-[12px] text-red">{fieldErrors.amount}</Text>
            ) : null}

            {/* Description */}
            <View className="mt-3.5">
              <TextField
                label="Description"
                placeholder="What is this transfer for?"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Source Wallet Card */}
            <Text className="mb-2 mt-2 font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-muted">
              Pay from
            </Text>
            <View className="h-[62px] flex-row items-center gap-3 rounded-[18px] border border-line-input bg-surface px-4">
              <View className="h-[38px] w-[38px] items-center justify-center rounded-xl bg-chip">
                <Text className="font-sans-bold text-[15px] text-navy">₦</Text>
              </View>
              <View className="flex-1">
                <Text className="font-sans-bold text-[13px] text-ink">Naira Wallet</Text>
                <Text className="mt-0.5 font-sans text-[11px] text-ink-soft">
                  {walletBalance != null ? `${formatNaira(walletBalance)} · ` : ''}
                  {isGutterEffective ? (
                    <Text className="font-sans-bold text-mint-deeper">
                      FREE · ₦0.00 Fee
                    </Text>
                  ) : (
                    bankFeeLabel
                  )}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={15} color={colors.inkMuted} />
            </View>

            <View className="mt-auto pt-6">
              <Button
                title={isGutterEffective ? 'Send Gutter Transfer (Free)' : 'Continue with Bank Transfer'}
                onPress={handleContinue}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  gutterDetectedCard: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    backgroundColor: '#EBFBF7',
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#23D3A5',
  },
  gutterAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0FA97F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gutterAvatarText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  freeBadgeText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 9.5,
    color: '#065F46',
    letterSpacing: 0.5,
  },
});
