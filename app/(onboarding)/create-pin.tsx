import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { Numpad, PinDots } from '@/components/Numpad';
import { ScreenHeader } from '@/components/ScreenHeader';
import { createPin } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/api/client';
import { colors } from '@/theme';

function hasRepeats(pin: string) {
  return /^(\d)\1{3}$/.test(pin);
}

function isSequence(pin: string) {
  if (pin.length < 4) return false;
  const digits = pin.split('').map(Number);
  const ascending = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
  const descending = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
  return ascending || descending;
}

export default function CreatePinScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [stage, setStage] = useState<'enter' | 'confirm'>('enter');
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const active = stage === 'enter' ? pin : confirmation;

  const rules = [
    { label: 'No repeated digits (1111)', ok: pin.length < 4 || !hasRepeats(pin) },
    { label: 'No sequences (1234)', ok: pin.length < 4 || !isSequence(pin) },
    { label: 'Not your date of birth', ok: true },
  ];

  const handleKey = (digit: string) => {
    setFormError(null);
    if (stage === 'enter') {
      if (pin.length < 4) setPin(pin + digit);
    } else if (confirmation.length < 4) {
      setConfirmation(confirmation + digit);
    }
  };

  const handleDelete = () => {
    if (stage === 'enter') setPin(pin.slice(0, -1));
    else setConfirmation(confirmation.slice(0, -1));
  };

  const handleContinue = async () => {
    if (stage === 'enter') {
      if (hasRepeats(pin) || isSequence(pin)) {
        setFormError('Choose a less predictable PIN.');
        return;
      }
      setStage('confirm');
      return;
    }
    if (confirmation !== pin) {
      setFormError('PINs do not match. Try again.');
      setConfirmation('');
      return;
    }
    setLoading(true);
    try {
      await createPin(pin, confirmation);
      await refreshUser().catch(() => undefined);
      router.replace('/(tabs)');
    } catch (e) {
      setFormError(errorMessage(e));
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-sheet">
      <GWatermark size={500} className="-bottom-6 -right-40" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView contentContainerClassName="flex-grow px-[26px] pb-6 pt-3">
          <ScreenHeader title="Transaction PIN" />

          <Text className="mt-5 font-sans-extrabold text-[27px] leading-[32px] tracking-tight text-ink">
            {stage === 'enter' ? 'Create a 4-digit PIN' : 'Confirm your PIN'}
          </Text>
          <Text className="mt-2 font-sans text-[13px] leading-5 text-ink-muted">
            You will use this PIN to approve every transfer, card payment and crypto trade.
          </Text>

          {formError ? (
            <Text className="mt-3 rounded-2xl bg-red-bg p-3.5 font-sans text-[13px] text-red">
              {formError}
            </Text>
          ) : null}

          <View className="py-[26px]">
            <PinDots filled={active.length} />
          </View>

          <View className="gap-2.5">
            {rules.map((rule) => (
              <View key={rule.label} className="flex-row items-center gap-2.5">
                <View
                  className={`h-5 w-5 items-center justify-center rounded-md ${
                    rule.ok ? 'bg-mint-bg' : 'bg-red-bg'
                  }`}
                >
                  <Ionicons
                    name={rule.ok ? 'checkmark' : 'close'}
                    size={11}
                    color={rule.ok ? colors.mintDark : colors.red}
                  />
                </View>
                <Text className="font-sans-semibold text-xs text-ink-mid">{rule.label}</Text>
              </View>
            ))}
          </View>

          <View className="mt-auto pt-6">
            <Numpad onKey={handleKey} onDelete={handleDelete} />
            <Button
              title={stage === 'enter' ? 'Continue' : 'Save PIN'}
              onPress={handleContinue}
              loading={loading}
              disabled={active.length !== 4}
              className="mt-4"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
