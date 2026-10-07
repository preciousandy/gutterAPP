import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { GWatermark } from '@/components/GWatermark';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getCardSecret, listCards } from '@/api/cards';
import { errorMessage } from '@/api/client';
import { colors } from '@/theme';
import type { CardSecret } from '@/types';

const HIDE_AFTER_SECONDS = 60;

function groupCardNumber(number: string): string {
  return number.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
}

export default function CardDetailsScreen() {
  const router = useRouter();
  const [secret, setSecret] = useState<CardSecret | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(HIDE_AFTER_SECONDS);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cards = await listCards();
      if (!cards[0]) {
        setError('No card yet — create one first.');
        return;
      }
      setSecret(await getCardSecret(cards[0].id));
      setSecondsLeft(HIDE_AFTER_SECONDS);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => setSecret(null); // never keep card secrets mounted in memory
    }, [load])
  );

  // Auto-hide countdown per the design's security note.
  useEffect(() => {
    if (!secret) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/cards');
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secret, router]);

  const copy = (value: string) => void Clipboard.setStringAsync(value);

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(
    secondsLeft % 60
  ).padStart(2, '0')}`;

  return (
    <View className="flex-1 bg-navy-deep">
      <GWatermark light size={520} className="-right-36 top-16" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-[26px] pb-5 pt-3">
          <ScreenHeader title="Card details" dark />
        </View>

        <ScrollView
          className="flex-1 rounded-t-[36px] bg-sheet"
          contentContainerClassName="flex-grow px-[26px] py-[26px]"
        >
          {loading ? (
            <ActivityIndicator className="mt-10" color={colors.navy} size="large" />
          ) : error || !secret ? (
            <EmptyState
              icon="card-outline"
              title="Card details unavailable"
              message={error ?? undefined}
              actionTitle="Retry"
              onAction={() => void load()}
            />
          ) : (
            <>
              <View className="rounded-2xl border border-amber-line bg-amber-bg px-4 py-3.5">
                <Text className="font-sans-semibold text-[11.5px] leading-4 text-amber">
                  Details are hidden after 60 seconds. Never share them.
                </Text>
              </View>

              <View className="mt-4 rounded-[22px] border border-line bg-surface px-5">
                <SecretRow
                  label="Card number"
                  value={groupCardNumber(secret.number)}
                  grotesk
                  onCopy={() => copy(secret.number)}
                />
                <SecretRow
                  label="Expiry"
                  value={`${secret.expiry_month} / ${secret.expiry_year}`}
                  grotesk
                  onCopy={() => copy(`${secret.expiry_month}/${secret.expiry_year}`)}
                />
                <SecretRow label="CVV" value={secret.cvv} grotesk onCopy={() => copy(secret.cvv)} />
                <SecretRow label="Card holder" value={secret.holder_name.toUpperCase()} last />
              </View>

              <Text className="mb-2 mt-4 font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-muted">
                Billing address
              </Text>
              <View className="gap-1.5 rounded-[20px] border border-line bg-surface px-[18px] py-4">
                <Text className="font-sans-semibold text-[13px] leading-5 text-ink">
                  {secret.billing_address.line1}
                  {'\n'}
                  {secret.billing_address.city}, {secret.billing_address.state}{' '}
                  {secret.billing_address.zip}
                </Text>
                <Text className="font-sans text-[11.5px] text-ink-soft">
                  {secret.billing_address.country} · ZIP {secret.billing_address.zip}
                </Text>
              </View>

              <View className="mt-4 flex-row gap-[11px]">
                <Button
                  title="Copy all details"
                  variant="dark"
                  small
                  onPress={() =>
                    copy(
                      `${secret.number}\nEXP ${secret.expiry_month}/${secret.expiry_year}\nCVV ${secret.cvv}\n${secret.holder_name}`
                    )
                  }
                  className="flex-1"
                />
                <Button
                  title="Hide details"
                  variant="ghost"
                  small
                  onPress={() => {
                    if (router.canGoBack()) {
                      router.back();
                    } else {
                      router.replace('/(tabs)/cards');
                    }
                  }}
                  className="flex-1"
                />
              </View>

              <View className="mt-auto flex-row items-center justify-center gap-2 pt-6">
                <View className="h-[7px] w-[7px] rounded-full bg-mint" />
                <Text className="font-sans-semibold text-xs text-ink-mid">
                  Auto-hiding in <Text className="font-sans-extrabold text-ink">{mmss}</Text>
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SecretRow({
  label,
  value,
  grotesk = false,
  last = false,
  onCopy,
}: {
  label: string;
  value: string;
  grotesk?: boolean;
  last?: boolean;
  onCopy?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <View
      className={`flex-row items-center justify-between py-4 ${last ? '' : 'border-b border-line-soft'}`}
    >
      <View className="gap-1.5">
        <Text className="font-sans-semibold text-[10.5px] uppercase tracking-[1.4px] text-ink-soft">
          {label}
        </Text>
        <Text
          className={
            grotesk
              ? 'font-grotesk text-[17px] tracking-wider text-ink'
              : 'font-sans-bold text-sm text-ink'
          }
        >
          {value}
        </Text>
      </View>
      {onCopy ? (
        <Pressable
          onPress={() => {
            onCopy();
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="h-[30px] justify-center rounded-[10px] bg-chip px-3"
        >
          <Text className="font-sans-bold text-[11px] text-navy">{copied ? 'Copied' : 'Copy'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
