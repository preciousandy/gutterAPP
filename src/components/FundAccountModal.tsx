import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors } from '@/theme';

interface FundAccountModalProps {
  visible: boolean;
  onClose: () => void;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  onDepositCrypto?: () => void;
}

export function FundAccountModal({
  visible,
  onClose,
  bankName = 'Wema Bank',
  accountNumber = '–',
  accountName = 'Gutter Customer',
  onDepositCrypto,
}: FundAccountModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!accountNumber || accountNumber === '–') return;
    await Clipboard.setStringAsync(accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `My Gutter Account Details:\nBank: ${bankName}\nAccount Number: ${accountNumber}\nAccount Name: ${accountName}\n\nTransfer from any Nigerian bank to fund instantly.`,
      });
    } catch {
      // Ignored
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-navy-darkest/65" onPress={onClose}>
        <Pressable
          className="max-h-[90%] rounded-t-[32px] bg-surface px-6 pb-9 pt-3 shadow-2xl"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Drag Handle */}
          <View className="items-center pb-3">
            <View className="h-1 w-11 rounded-full bg-line-input" />
          </View>

          {/* Header Row */}
          <View className="flex-row items-start justify-between pt-1">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-mint-bg">
                <Ionicons name="arrow-down-circle" size={26} color={colors.mintDark} />
              </View>
              <View>
                <Text className="font-sans-extrabold text-[18px] text-ink">
                  Fund Your Account
                </Text>
                <Text className="font-sans text-[12px] text-ink-secondary">
                  Instant deposit via bank transfer
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="h-8 w-8 items-center justify-center rounded-full bg-page active:opacity-70"
            >
              <Ionicons name="close" size={18} color={colors.inkMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="mt-4">
            {/* Account Card */}
            <View className="overflow-hidden rounded-[24px] border border-line-input bg-page p-5 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="h-6 w-6 items-center justify-center rounded-lg bg-navy">
                    <Text className="font-sans-bold text-[11px] text-white">G</Text>
                  </View>
                  <Text className="font-sans-bold text-[13px] text-ink">
                    Virtual NUBAN Account
                  </Text>
                </View>

                <View className="rounded-full bg-mint-bg px-2.5 py-0.5">
                  <Text className="font-sans-bold text-[10.5px] uppercase tracking-wider text-mint-dark">
                    Instant Credit
                  </Text>
                </View>
              </View>

              {/* Bank & Account Number */}
              <View className="mt-4 rounded-2xl border border-line-input/60 bg-surface p-4">
                <Text className="font-sans text-[11px] uppercase tracking-[1.5px] text-ink-muted">
                  Bank Name
                </Text>
                <Text className="mt-0.5 font-sans-bold text-[16px] text-ink">
                  {bankName}
                </Text>

                <View className="my-3.5 h-[1px] bg-line-input/50" />

                <Text className="font-sans text-[11px] uppercase tracking-[1.5px] text-ink-muted">
                  Account Number
                </Text>
                <View className="mt-1 flex-row items-center justify-between">
                  <Text className="font-grotesk-bold text-[26px] tracking-wider text-navy">
                    {accountNumber}
                  </Text>
                  <Pressable
                    onPress={handleCopy}
                    hitSlop={8}
                    className={`flex-row items-center gap-1.5 rounded-xl px-3 py-2 ${
                      copied ? 'bg-mint-bg' : 'bg-navy/10 active:opacity-75'
                    }`}
                  >
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy-outline'}
                      size={15}
                      color={copied ? colors.mintDark : colors.navy}
                    />
                    <Text
                      className={`font-sans-bold text-[12px] ${
                        copied ? 'text-mint-dark' : 'text-navy'
                      }`}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Text>
                  </Pressable>
                </View>

                <View className="my-3.5 h-[1px] bg-line-input/50" />

                <Text className="font-sans text-[11px] uppercase tracking-[1.5px] text-ink-muted">
                  Account Name
                </Text>
                <Text className="mt-0.5 font-sans-bold text-[14px] text-ink">
                  {accountName}
                </Text>
              </View>
            </View>

            {onDepositCrypto ? (
              <Pressable
                onPress={() => {
                  onClose();
                  onDepositCrypto();
                }}
                className="mt-3 flex-row items-center justify-between rounded-2xl border border-line-input bg-page p-3.5 active:bg-chip"
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-mint-bg">
                    <Ionicons name="qr-code-outline" size={18} color={colors.mintDark} />
                  </View>
                  <View>
                    <Text className="font-sans-bold text-[13px] text-ink">Deposit via Crypto</Text>
                    <Text className="font-sans text-[11px] text-ink-secondary">
                      USDT, BTC, ETH — auto-converts to Naira
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
              </Pressable>
            ) : null}

            {/* Guide Steps */}
            <View className="mt-5">
              <Text className="font-sans-bold text-[14px] text-ink">
                How to fund in 3 easy steps
              </Text>

              <View className="mt-3 gap-3">
                <View className="flex-row items-start gap-3 rounded-2xl border border-line-input/70 bg-surface p-3.5">
                  <View className="h-7 w-7 items-center justify-center rounded-xl bg-chip">
                    <Text className="font-sans-bold text-[12px] text-navy">1</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-sans-bold text-[13px] text-ink">
                      Open your bank app or USSD
                    </Text>
                    <Text className="mt-0.5 font-sans text-[12px] leading-[17px] text-ink-secondary">
                      Launch GTBank, Access, Zenith, Kuda, OPay, PalmPay, or your preferred banking app.
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start gap-3 rounded-2xl border border-line-input/70 bg-surface p-3.5">
                  <View className="h-7 w-7 items-center justify-center rounded-xl bg-chip">
                    <Text className="font-sans-bold text-[12px] text-navy">2</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-sans-bold text-[13px] text-ink">
                      Select Transfer & choose {bankName}
                    </Text>
                    <Text className="mt-0.5 font-sans text-[12px] leading-[17px] text-ink-secondary">
                      Paste your account number <Text className="font-sans-bold text-ink">{accountNumber}</Text>. Confirm the recipient is <Text className="font-sans-bold text-ink">{accountName}</Text>.
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start gap-3 rounded-2xl border border-line-input/70 bg-surface p-3.5">
                  <View className="h-7 w-7 items-center justify-center rounded-xl bg-chip">
                    <Text className="font-sans-bold text-[12px] text-navy">3</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-sans-bold text-[13px] text-ink">
                      Enter amount and complete transfer
                    </Text>
                    <Text className="mt-0.5 font-sans text-[12px] leading-[17px] text-ink-secondary">
                      Your funds will reflect instantly in your Gutter wallet balance with automatic notification.
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Notice Callout */}
            <View className="mt-4 flex-row items-center gap-2.5 rounded-2xl bg-chip/70 p-3.5">
              <Ionicons name="flash-outline" size={18} color={colors.mintDark} />
              <Text className="flex-1 font-sans text-[11.5px] leading-[16px] text-ink-secondary">
                Transfers to this virtual account are processed 24/7 with zero deposit fees.
              </Text>
            </View>

            {/* Bottom Actions */}
            <View className="mt-5 flex-row gap-2.5 pb-2">
              <Button
                title="Share Details"
                variant="ghost"
                onPress={handleShare}
                className="flex-1"
              />
              <Button
                title={copied ? 'Copied!' : 'Copy Account'}
                onPress={handleCopy}
                className="flex-1"
              />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
