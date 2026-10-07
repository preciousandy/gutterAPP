import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { Numpad, PinDots } from '@/components/Numpad';
import { TransactionProcessingModal } from '@/components/TransactionProcessingModal';
import { useAuth, useWallet } from '@/context';
import { clearPendingAction, getPendingAction, type PendingAction } from '@/lib/pendingAction';
import { errorMessage } from '@/api/client';
import { colors } from '@/theme';

export default function ConfirmPinScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshWallet, prependTransaction } = useWallet();
  const actionRef = useRef<PendingAction | null>(null);

  const userHasPin = user?.has_pin !== false;

  // Capture pending action once on initial mount
  if (actionRef.current === null) {
    actionRef.current = getPendingAction();
  }
  const action = actionRef.current;

  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Nothing to confirm on initial mount (e.g. deep link) — leave.
  useEffect(() => {
    if (!action) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [action, router]);

  useEffect(() => {
    if (pin.length !== 4 || submitting || !action) return;
    setSubmitting(true);
    setFormError(null);
    action
      .run(pin)
      .then((transaction) => {
        clearPendingAction();
        if (transaction && typeof transaction === 'object' && 'id' in transaction) {
          prependTransaction(transaction as any);
        }
        void refreshWallet();
        router.replace({
          pathname: '/receipt',
          params: { data: JSON.stringify(transaction) },
        });
      })
      .catch((e) => {
        setFormError(errorMessage(e));
        setPin('');
        setSubmitting(false);
      });
  }, [pin, submitting, action, router, prependTransaction, refreshWallet]);

  if (!action) return null;

  return (
    <View className="flex-1 bg-navy-deep">
      <GWatermark light size={520} className="-left-36 top-24" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-[26px] pt-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans-extrabold text-lg text-white">{action.title}</Text>
            <Pressable
              onPress={() => {
                clearPendingAction();
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)');
                }
              }}
              className="h-[34px] w-[34px] items-center justify-center rounded-[11px] border border-white/20 bg-white/10"
            >
              <Ionicons name="close" size={17} color={colors.white} />
            </Pressable>
          </View>

          <View className="items-center gap-2.5 pb-8 pt-5">
            <Text className="font-sans-semibold text-[11px] uppercase tracking-[1.8px] text-white/55">
              Sending
            </Text>
            <Text className="font-grotesk-bold text-4xl text-white">{action.amountLabel}</Text>
            <Text className="font-sans-semibold text-[12.5px] text-white/60">{action.subtitle}</Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 rounded-t-[36px] bg-sheet"
          contentContainerClassName="flex-grow px-[26px] pb-7 pt-[30px]"
        >
          {!userHasPin ? (
            <View className="flex-1 items-center justify-center py-6">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl border border-amber-line bg-amber-bg">
                <Ionicons name="key-outline" size={30} color={colors.btc} />
              </View>
              <Text className="text-center font-sans-extrabold text-[18px] text-ink">
                Set Up Transaction PIN
              </Text>
              <Text className="mt-2 px-4 text-center font-sans text-[13px] leading-5 text-ink-muted">
                You haven't created your 4-digit transaction PIN yet. Please create a PIN to secure and authorize your transactions.
              </Text>

              <View className="mt-8 w-full">
                <Button
                  title="Create Transaction PIN"
                  onPress={() => router.push('/security/change-pin')}
                />
              </View>
            </View>
          ) : (
            <>
              <Text className="text-center font-sans-bold text-sm text-ink">
                Enter your transaction PIN
              </Text>

              {formError ? (
                <Text className="mt-3 rounded-2xl bg-red-bg p-3.5 text-center font-sans text-[13px] text-red">
                  {formError}
                </Text>
              ) : null}

              <View className="pt-4">
                <PinDots filled={pin.length} />
              </View>

              <View className="flex-row items-center justify-center gap-2 py-4">
                <View className="h-[22px] w-[22px] items-center justify-center rounded-[7px] bg-mint-bg">
                  <Ionicons name="scan-outline" size={12} color={colors.mintDark} />
                </View>
                <Text className="font-sans-bold text-[12.5px] text-navy">Use Face ID instead</Text>
              </View>

              <Numpad
                onKey={(d) => {
                  if (!submitting && pin.length < 4) setPin(pin + d);
                }}
                onDelete={() => setPin(pin.slice(0, -1))}
              />

              {submitting ? (
                <Text className="mt-4 text-center font-sans-semibold text-[12.5px] text-ink-muted">
                  Confirming…
                </Text>
              ) : null}

              <Pressable
                onPress={() => router.push('/security/change-pin')}
                hitSlop={8}
                className="mt-auto pt-5"
              >
                <Text className="text-center font-sans-semibold text-[12px] text-navy">
                  Forgot PIN? Reset it in Settings → Security
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <TransactionProcessingModal
        visible={submitting}
        title={action.title}
        amountLabel={action.amountLabel}
        onTimeoutAction={() => {
          setSubmitting(false);
          clearPendingAction();
          router.replace('/(tabs)/transactions');
        }}
      />
    </View>
  );
}
