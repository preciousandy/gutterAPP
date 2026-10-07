import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors } from '@/theme';

interface KycGateModalProps {
  visible: boolean;
  featureName?: string;
  kycStatus?: string;
  onClose: () => void;
  onStartVerification: () => void;
}

const BENEFIT_ITEMS = [
  {
    icon: 'paper-plane-outline' as const,
    title: 'Instant Transfers & Withdrawals',
    desc: 'Send money to any Nigerian bank or withdraw at ATMs.',
  },
  {
    icon: 'card-outline' as const,
    title: 'Virtual & Physical Cards',
    desc: 'Create USD virtual cards for global online shopping.',
  },
  {
    icon: 'trending-up-outline' as const,
    title: 'Increased Daily Limit',
    desc: 'Enjoy Tier 2 daily limits up to ₦1,000,000.',
  },
];

export function KycGateModal({
  visible,
  featureName,
  kycStatus,
  onClose,
  onStartVerification,
}: KycGateModalProps) {
  const isPendingFaceCheck = kycStatus === 'pending';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-navy-darkest/60" onPress={onClose}>
        <Pressable
          className="rounded-t-[32px] bg-surface px-6 pb-9 pt-3 shadow-2xl"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Drag Handle */}
          <View className="items-center pb-3">
            <View className="h-1 w-11 rounded-full bg-line-input" />
          </View>

          {/* Header Row */}
          <View className="flex-row items-start justify-between pt-1">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-chip">
              <Ionicons name="shield-checkmark" size={24} color={colors.navy} />
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="h-8 w-8 items-center justify-center rounded-full bg-page active:opacity-70"
            >
              <Ionicons name="close" size={18} color={colors.inkMuted} />
            </Pressable>
          </View>

          {/* Heading & Subtitle */}
          <Text className="mt-3.5 font-sans-extrabold text-[22px] leading-7 tracking-tight text-ink">
            Identity verification required
          </Text>
          <Text className="mt-1.5 font-sans text-[13px] leading-5 text-ink-muted">
            {featureName
              ? `To use ${featureName} and protect your funds, regulatory standards require identity verification.`
              : 'To comply with financial regulations and protect your funds, please verify your identity before accessing this feature.'}
          </Text>

          {/* Benefit Cards List */}
          <View className="mt-4 gap-2.5 rounded-2xl bg-page p-3.5">
            {BENEFIT_ITEMS.map((item, idx) => (
              <View key={idx} className="flex-row items-center gap-3">
                <View className="h-8 w-8 items-center justify-center rounded-xl bg-surface">
                  <Ionicons name={item.icon} size={15} color={colors.navy} />
                </View>
                <View className="flex-1">
                  <Text className="font-sans-bold text-[12.5px] text-ink">{item.title}</Text>
                  <Text className="font-sans text-[11px] text-ink-soft">{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Status Note */}
          {isPendingFaceCheck ? (
            <View className="mt-3.5 flex-row items-center gap-2 rounded-xl bg-[#FFF9E6] px-3.5 py-2.5">
              <Ionicons name="information-circle" size={16} color="#B38600" />
              <Text className="flex-1 font-sans-semibold text-[11.5px] text-[#805F00]">
                Step 1 completed! Only quick face verification remains.
              </Text>
            </View>
          ) : null}

          {/* Actions */}
          <View className="mt-5 gap-2.5">
            <Button
              title={isPendingFaceCheck ? 'Complete Face Verification' : 'Verify Identity Now'}
              onPress={onStartVerification}
            />
            <Pressable
              onPress={onClose}
              className="h-11 items-center justify-center rounded-xl active:bg-page"
            >
              <Text className="font-sans-semibold text-[13px] text-ink-muted">
                Explore app first
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
