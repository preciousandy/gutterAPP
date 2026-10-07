import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { Numpad, PinDots } from '@/components/Numpad';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { changePin } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/api/client';
import { colors } from '@/theme';

type Stage = 'current' | 'new' | 'confirm' | 'success';

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

export default function ChangePinScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const userHasExistingPin = Boolean(user?.has_pin);

  const [stage, setStage] = useState<Stage>(userHasExistingPin ? 'current' : 'new');
  const [securityMethod, setSecurityMethod] = useState<'pin' | 'password'>('pin');

  // Security Challenge state
  const [currentPin, setCurrentPin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // New PIN state
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Active PIN buffer depending on current stage
  const activePinLength =
    stage === 'current'
      ? currentPin.length
      : stage === 'new'
      ? newPin.length
      : stage === 'confirm'
      ? confirmPin.length
      : 0;

  // Validation rules for new PIN
  const rules = [
    { label: 'No repeated digits (1111)', ok: newPin.length < 4 || !hasRepeats(newPin) },
    { label: 'No sequences (1234)', ok: newPin.length < 4 || !isSequence(newPin) },
    {
      label: 'Different from current PIN',
      ok: !currentPin || newPin.length < 4 || newPin !== currentPin,
    },
  ];

  const handleKey = (digit: string) => {
    setFormError(null);
    if (stage === 'current') {
      if (currentPin.length < 4) {
        const next = currentPin + digit;
        setCurrentPin(next);
        if (next.length === 4) {
          // Advance to new PIN stage
          setStage('new');
        }
      }
    } else if (stage === 'new') {
      if (newPin.length < 4) {
        const next = newPin + digit;
        setNewPin(next);
      }
    } else if (stage === 'confirm') {
      if (confirmPin.length < 4) {
        const next = confirmPin + digit;
        setConfirmPin(next);
        if (next.length === 4) {
          void submitChange(next);
        }
      }
    }
  };

  const handleDelete = () => {
    setFormError(null);
    if (stage === 'current') {
      setCurrentPin((prev) => prev.slice(0, -1));
    } else if (stage === 'new') {
      setNewPin((prev) => prev.slice(0, -1));
    } else if (stage === 'confirm') {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
  };

  const handlePasswordContinue = () => {
    if (!password.trim()) {
      setFormError('Please enter your account password.');
      return;
    }
    setFormError(null);
    setStage('new');
  };

  const handleNewPinContinue = () => {
    if (newPin.length !== 4) {
      setFormError('Please enter a 4-digit PIN.');
      return;
    }
    if (hasRepeats(newPin) || isSequence(newPin)) {
      setFormError('Choose a less predictable PIN.');
      return;
    }
    if (currentPin && newPin === currentPin) {
      setFormError('New PIN must be different from your current PIN.');
      return;
    }
    setFormError(null);
    setStage('confirm');
  };

  const submitChange = async (finalConfirmation?: string) => {
    const confirmation = finalConfirmation ?? confirmPin;
    if (confirmation !== newPin) {
      setFormError('PINs do not match. Please try again.');
      setConfirmPin('');
      return;
    }

    setLoading(true);
    setFormError(null);

    try {
      await changePin({
        current_pin: securityMethod === 'pin' && currentPin ? currentPin : undefined,
        password: securityMethod === 'password' && password ? password : undefined,
        pin: newPin,
        pin_confirmation: confirmation,
      });

      await refreshUser().catch(() => undefined);
      setStage('success');
    } catch (e) {
      const msg = errorMessage(e);
      setFormError(msg);

      // If current security credential failed, route back to step 1
      if (
        msg.toLowerCase().includes('current pin') ||
        msg.toLowerCase().includes('password')
      ) {
        setStage('current');
        setCurrentPin('');
        setPassword('');
      } else {
        setConfirmPin('');
      }
    } finally {
      setLoading(false);
    }
  };

  const stepNumber =
    stage === 'current' ? 1 : stage === 'new' ? (userHasExistingPin ? 2 : 1) : 3;
  const totalSteps = userHasExistingPin ? 3 : 2;

  if (stage === 'success') {
    return (
      <View className="flex-1 bg-sheet">
        <GWatermark size={500} className="-bottom-6 -right-40" />
        <SafeAreaView className="flex-1 justify-center px-[26px]">
          <View className="items-center py-8">
            <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-mint-bg">
              <Ionicons name="checkmark-circle" size={48} color={colors.mintDark} />
            </View>
            <Text className="text-center font-sans-extrabold text-[24px] tracking-tight text-ink">
              {userHasExistingPin ? 'PIN Changed Successfully' : 'PIN Created Successfully'}
            </Text>
            <Text className="mt-2.5 max-w-[280px] text-center font-sans text-[13.5px] leading-5 text-ink-muted">
              {userHasExistingPin
                ? 'Your new 4-digit transaction PIN is now active. Use it to approve all future transactions.'
                : 'Your 4-digit transaction PIN is now active. You can now use it to approve all transactions.'}
            </Text>
          </View>
          <View className="mt-6">
            <Button
              title="Done"
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)/profile');
                }
              }}
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-sheet">
      <GWatermark size={500} className="-bottom-6 -right-40" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView contentContainerClassName="flex-grow px-[26px] pb-6 pt-3">
          <ScreenHeader
            title="Transaction PIN"
            onBack={() => {
              if (stage === 'confirm') setStage('new');
              else if (stage === 'new' && userHasExistingPin) setStage('current');
              else {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)/profile');
                }
              }
            }}
          />

          {/* Step Pill */}
          <View className="mt-4 flex-row items-center gap-1.5 self-start rounded-full border border-card-border bg-surface px-3 py-1">
            <Ionicons name="shield-checkmark-outline" size={13} color={colors.navy} />
            <Text className="font-sans-bold text-[11px] uppercase tracking-[1px] text-ink-muted">
              Step {stepNumber} of {totalSteps}
            </Text>
          </View>

          {/* Stage Titles & Subtitles */}
          {stage === 'current' ? (
            <>
              <Text className="mt-3 font-sans-extrabold text-[26px] leading-[32px] tracking-tight text-ink">
                {securityMethod === 'pin' ? 'Verify Current PIN' : 'Verify Password'}
              </Text>
              <Text className="mt-2 font-sans text-[13px] leading-5 text-ink-muted">
                {securityMethod === 'pin'
                  ? 'Enter your current 4-digit PIN to confirm your identity before setting a new one.'
                  : 'Enter your account password to authorize changing your transaction PIN.'}
              </Text>
            </>
          ) : stage === 'new' ? (
            <>
              <Text className="mt-3 font-sans-extrabold text-[26px] leading-[32px] tracking-tight text-ink">
                Create New PIN
              </Text>
              <Text className="mt-2 font-sans text-[13px] leading-5 text-ink-muted">
                Choose a new 4-digit PIN for approving transfers, withdrawals, and crypto trades.
              </Text>
            </>
          ) : (
            <>
              <Text className="mt-3 font-sans-extrabold text-[26px] leading-[32px] tracking-tight text-ink">
                Confirm New PIN
              </Text>
              <Text className="mt-2 font-sans text-[13px] leading-5 text-ink-muted">
                Re-enter your new 4-digit PIN to make sure it matches.
              </Text>
            </>
          )}

          {/* Form Error Banner */}
          {formError ? (
            <View className="mt-3 flex-row items-center gap-2 rounded-2xl bg-red-bg p-3.5">
              <Ionicons name="alert-circle-outline" size={16} color={colors.red} />
              <Text className="flex-1 font-sans text-[12.5px] leading-4 text-red">
                {formError}
              </Text>
            </View>
          ) : null}

          {/* Stage Content: Password challenge vs PIN Dots */}
          {stage === 'current' && securityMethod === 'password' ? (
            <View className="mt-6">
              <TextField
                label="Account Password"
                placeholder="Enter your account password"
                value={password}
                onChangeText={(t) => {
                  setFormError(null);
                  setPassword(t);
                }}
                secureTextEntry={!showPassword}
                accessory={
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={12}
                    className="px-2"
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.inkMuted}
                    />
                  </Pressable>
                }
              />
              <Button
                title="Verify & Continue"
                onPress={handlePasswordContinue}
                className="mt-2"
              />
              <Pressable
                onPress={() => {
                  setFormError(null);
                  setSecurityMethod('pin');
                }}
                className="mt-4 items-center py-2"
              >
                <Text className="font-sans-bold text-[12.5px] text-navy">
                  Use current 4-digit PIN instead
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* PIN Dots */}
              <View className="py-6">
                <PinDots filled={activePinLength} />
              </View>

              {/* Security switch option on step 1 */}
              {stage === 'current' ? (
                <Pressable
                  onPress={() => {
                    setFormError(null);
                    setSecurityMethod('password');
                  }}
                  className="flex-row items-center justify-center gap-1.5 pb-2"
                >
                  <Ionicons name="key-outline" size={14} color={colors.navy} />
                  <Text className="font-sans-bold text-[12.5px] text-navy">
                    Forgot PIN? Verify with password
                  </Text>
                </Pressable>
              ) : null}

              {/* Rule Checklist on Step 2 */}
              {stage === 'new' ? (
                <View className="gap-2.5 pb-2">
                  {rules.map((rule) => (
                    <View key={rule.label} className="flex-row items-center gap-2.5">
                      <View
                        className={`h-5 w-5 items-center justify-center rounded-md ${
                          rule.ok ? 'bg-mint-bg' : 'bg-red-bg'
                        }`}
                      >
                        <Ionicons
                          name={rule.ok ? 'checkmark' : 'close'}
                          size={13}
                          color={rule.ok ? colors.mintDark : colors.red}
                        />
                      </View>
                      <Text
                        className={`font-sans text-[12.5px] ${
                          rule.ok ? 'text-ink' : 'text-red'
                        }`}
                      >
                        {rule.label}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Numpad */}
              <View className="mt-auto">
                <Numpad
                  onKey={(digit) => {
                    if (!loading) handleKey(digit);
                  }}
                  onDelete={() => {
                    if (!loading) handleDelete();
                  }}
                />

                {/* Continue button for Step 2 */}
                {stage === 'new' ? (
                  <View className="mt-4">
                    <Button
                      title="Continue"
                      disabled={newPin.length !== 4}
                      onPress={handleNewPinContinue}
                    />
                  </View>
                ) : null}

                {/* Confirming indicator for Step 3 */}
                {stage === 'confirm' && loading ? (
                  <Text className="mt-3 text-center font-sans-semibold text-[12.5px] text-ink-muted">
                    Updating your PIN…
                  </Text>
                ) : null}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
