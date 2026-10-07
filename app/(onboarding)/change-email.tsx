import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/context/AuthContext';
import { changeEmail } from '@/api/auth';
import { errorMessage, isApiError } from '@/api/client';
import { colors } from '@/theme';

export default function ChangeEmailScreen() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const handleUpdate = async () => {
    const trimmed = newEmail.trim().toLowerCase();

    if (!trimmed) {
      setFormError('Please enter your new email address.');
      return;
    }

    if (trimmed === user?.email?.toLowerCase()) {
      setFormError('The new email must be different from your current email.');
      return;
    }

    setFormError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      await changeEmail(trimmed);
      await refreshUser();
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch (e) {
      if (isApiError(e) && e.status === 422) {
        setFieldErrors({
          email: e.firstError('email'),
        });
      }
      setFormError(errorMessage(e));
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-navy-deep">
      <GWatermark light size={540} className="-right-36 -top-10" />
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Top Header */}
        <View className="px-[30px] pb-8 pt-6">
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
            hitSlop={12}
            className="mb-5 h-[38px] w-[38px] items-center justify-center rounded-xl bg-white/10"
          >
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>

          <Text className="font-sans-extrabold text-[32px] leading-[38px] tracking-tight text-white">
            Change email
          </Text>
          <Text className="mt-2 font-sans text-sm leading-[21px] text-white/60">
            Enter your correct email address below. We'll send a fresh 6-digit code.
          </Text>
        </View>

        {/* Content Sheet */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView
            className="flex-1 rounded-t-[36px] bg-sheet"
            contentContainerClassName="flex-grow px-[30px] py-[34px]"
            keyboardShouldPersistTaps="handled"
          >
            {formError ? (
              <Text className="mb-4 rounded-2xl bg-red-bg p-3.5 font-sans text-[13px] text-red">
                {formError}
              </Text>
            ) : null}

            {/* Current Email Badge */}
            <View className="mb-6 rounded-2xl border border-line bg-surface p-4">
              <Text className="font-sans-semibold text-xs uppercase tracking-wider text-ink-muted">
                Current email address
              </Text>
              <Text className="mt-1 font-sans-bold text-base text-ink">
                {user?.email ?? 'Not set'}
              </Text>
            </View>

            {/* New Email Input */}
            <TextField
              label="New email address"
              placeholder="correct.email@gmail.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={newEmail}
              onChangeText={setNewEmail}
              error={fieldErrors.email}
            />

            {/* Information Callout */}
            <View className="mt-4 flex-row gap-3 rounded-[18px] border border-line bg-surface p-4">
              <View className="h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-chip">
                <Text className="font-sans-extrabold text-sm text-navy">i</Text>
              </View>
              <Text className="flex-1 font-sans text-[12.5px] leading-[19px] text-ink-muted">
                Once updated, your previous verification code will be invalidated and a new code will be
                delivered to your new inbox.
              </Text>
            </View>

            <View className="mt-auto pt-8">
              <Button
                title="Update & send code"
                onPress={handleUpdate}
                loading={loading}
                disabled={!newEmail.trim()}
              />

              <View className="mt-4 flex-row justify-center">
                <Pressable
                  onPress={() => {
                    if (router.canGoBack()) {
                      router.back();
                    } else {
                      router.replace('/(tabs)');
                    }
                  }}
                  hitSlop={8}
                >
                  <Text className="font-sans-bold text-[13px] text-ink-muted">Cancel</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
