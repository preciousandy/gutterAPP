import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { CardFace } from '@/components/CardFace';
import { EmptyState } from '@/components/EmptyState';
import { GWatermark } from '@/components/GWatermark';
import { Toggle } from '@/components/Toggle';
import { listCards, setCardFrozen, updateCardControls } from '@/api/cards';
import { errorMessage } from '@/api/client';
import { colors, headerGradient } from '@/theme';
import type { CardControls, VirtualCard } from '@/types';
import { formatUsd } from '@/utils/format';
import { useKycGate } from '@/context';

export default function CardsScreen() {
  const router = useRouter();
  const { requireKyc } = useKycGate();
  const [card, setCard] = useState<VirtualCard | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freezeModal, setFreezeModal] = useState(false);
  const [freezing, setFreezing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const cards = await listCards();
      setCard(cards[0] ?? null);
      setLoaded(true);
    } catch (e) {
      setError(errorMessage(e));
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const toggleControl = async (key: keyof CardControls, value: boolean) => {
    if (!card) return;
    const previous = card;
    setCard({ ...card, controls: { ...card.controls, [key]: value } });
    try {
      setCard(await updateCardControls(card.id, { [key]: value }));
    } catch {
      setCard(previous);
    }
  };

  const confirmFreeze = async () => {
    if (!card) return;
    setFreezing(true);
    try {
      setCard(await setCardFrozen(card.id, !card.frozen));
      setFreezeModal(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setFreezing(false);
    }
  };

  return (
    <View className="flex-1 bg-page">
      <LinearGradient
        colors={[...headerGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        className="absolute left-0 right-0 top-0 h-[200px] overflow-hidden"
      >
        <GWatermark light size={400} className="-left-24 -top-24" />
      </LinearGradient>

      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView contentContainerClassName="px-[22px] pb-8 pt-3">
          <Text className="font-sans-extrabold text-[19px] text-white">Virtual card</Text>

          {!loaded ? (
            <ActivityIndicator className="mt-16" color={colors.white} size="large" />
          ) : error ? (
            <View className="mt-5 rounded-[22px] border border-line bg-surface">
              <EmptyState
                icon="cloud-offline-outline"
                title="Couldn't load your card"
                message={error}
                actionTitle="Retry"
                onAction={() => void load()}
              />
            </View>
          ) : !card ? (
            <View className="mt-5">
              <CardFace card={null} compact />
              <View className="mt-4 rounded-[22px] border border-line bg-surface p-5">
                <Text className="font-sans-extrabold text-[22px] tracking-tight text-ink">
                  Dollar virtual card
                </Text>
                <Text className="mt-1.5 font-sans text-[13px] leading-5 text-ink-muted">
                  Spend online worldwide in USD. Funded from your Naira wallet at the live rate.
                </Text>
                <Button
                  title="Create card"
                  onPress={() => requireKyc(() => router.push('/card/create'), 'Virtual Cards')}
                  className="mt-5"
                />
              </View>
            </View>
          ) : (
            <>
              <View className="mt-4">
                <CardFace card={card} />
              </View>

              {card.frozen ? (
                <View className="mt-3 flex-row items-center gap-2.5 rounded-2xl border border-amber-line bg-amber-bg px-4 py-3">
                  <Ionicons name="snow-outline" size={15} color={colors.inkMid} />
                  <Text className="flex-1 font-sans-semibold text-xs text-amber">
                    This card is frozen. New payments will be declined.
                  </Text>
                </View>
              ) : null}

              <View className="mt-4 flex-row gap-2.5">
                <Button
                  title="Fund card"
                  variant="dark"
                  small
                  onPress={() => requireKyc(() => router.push('/card/fund'), 'Funding Virtual Cards')}
                  className="flex-1"
                />
                <Button
                  title="Details"
                  variant="ghost"
                  small
                  onPress={() => router.push('/card/details')}
                  className="flex-1"
                />
                <Button
                  title={card.frozen ? 'Unfreeze' : 'Freeze'}
                  variant="ghost"
                  small
                  onPress={() => setFreezeModal(true)}
                  className="flex-1"
                />
              </View>

              <View className="mt-4 rounded-[22px] border border-line bg-surface px-[18px] py-1.5">
                <ControlRow
                  label="Online payments"
                  value={card.controls.online_payments}
                  onChange={(v) => void toggleControl('online_payments', v)}
                />
                <ControlRow
                  label="ATM withdrawals"
                  value={card.controls.atm_withdrawals}
                  onChange={(v) => void toggleControl('atm_withdrawals', v)}
                />
                <ControlRow
                  label="Contactless payments"
                  value={card.controls.contactless}
                  onChange={(v) => void toggleControl('contactless', v)}
                  last
                />
              </View>

              <View className="mt-4 gap-[18px] rounded-[22px] border border-line bg-surface p-[18px]">
                <LimitBar
                  label="Daily spending limit"
                  used={card.limits.daily_spend_used}
                  limit={card.limits.daily_spend_limit}
                  mint={false}
                />
                <LimitBar
                  label="ATM withdrawal limit"
                  used={card.limits.atm_used}
                  limit={card.limits.atm_limit}
                  mint
                />
              </View>

              <Button
                title="Cardless ATM withdrawal"
                variant="ghost"
                small
                onPress={() => router.push('/atm-withdrawal')}
                className="mt-4"
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={freezeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setFreezeModal(false)}
      >
        <Pressable className="flex-1 bg-navy-darkest/60" onPress={() => setFreezeModal(false)} />
        <View className="rounded-t-[32px] bg-surface px-[26px] pb-8 pt-6">
          <View className="items-center">
            <View className="h-1 w-11 rounded-full bg-line-input" />
            <View className="mt-4 h-[62px] w-[62px] items-center justify-center rounded-[20px] bg-chip">
              <Ionicons name="snow-outline" size={26} color={colors.navy} />
            </View>
            <Text className="mt-4 font-sans-extrabold text-[21px] tracking-tight text-ink">
              {card?.frozen ? 'Unfreeze this card?' : 'Freeze this card?'}
            </Text>
            <Text className="mt-2 text-center font-sans text-[13px] leading-5 text-ink-muted">
              {card?.frozen
                ? 'Payments, subscriptions and ATM use will work again immediately.'
                : 'All new payments, subscriptions and ATM use will be declined until you unfreeze it.'}
            </Text>
          </View>

          {!card?.frozen ? (
            <View className="mt-4 rounded-[18px] bg-sheet px-4">
              <SheetRow ok text="Your balance stays on the card" />
              <SheetRow ok text="Unfreeze any time, no fee" />
              <SheetRow ok={false} text="Recurring subscriptions may fail" last />
            </View>
          ) : null}

          <View className="mt-4 gap-2.5">
            <Button
              title={card?.frozen ? 'Unfreeze card' : 'Freeze card'}
              variant="dark"
              onPress={confirmFreeze}
              loading={freezing}
            />
            <Button title="Cancel" variant="muted" onPress={() => setFreezeModal(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ControlRow({
  label,
  value,
  onChange,
  last = false,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between py-3.5 ${last ? '' : 'border-b border-line-soft'}`}
    >
      <Text className="font-sans-bold text-[13px] text-ink">{label}</Text>
      <Toggle value={value} onChange={onChange} />
    </View>
  );
}

function LimitBar({
  label,
  used,
  limit,
  mint,
}: {
  label: string;
  used: number;
  limit: number;
  mint: boolean;
}) {
  const ratio = limit > 0 ? Math.min(1, used / limit) : 0;
  return (
    <View className="gap-2.5">
      <View className="flex-row items-center justify-between">
        <Text className="font-sans-bold text-xs text-ink-mid">{label}</Text>
        <Text className="font-grotesk-bold text-xs text-ink">
          {formatUsd(used)} / {formatUsd(limit)}
        </Text>
      </View>
      <View className="h-1.5 overflow-hidden rounded bg-line-sheet">
        <View
          className={`h-full rounded ${mint ? 'bg-mint' : 'bg-navy'}`}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </View>
    </View>
  );
}

function SheetRow({ ok, text, last = false }: { ok: boolean; text: string; last?: boolean }) {
  return (
    <View
      className={`flex-row items-center gap-2.5 py-3 ${last ? '' : 'border-b border-line-sheet'}`}
    >
      <View
        className={`h-5 w-5 items-center justify-center rounded-md ${ok ? 'bg-mint-bg' : 'bg-red-bg'}`}
      >
        <Ionicons
          name={ok ? 'checkmark' : 'alert'}
          size={11}
          color={ok ? colors.mintDark : colors.red}
        />
      </View>
      <Text className="flex-1 font-sans-semibold text-xs text-ink-mid">{text}</Text>
    </View>
  );
}
