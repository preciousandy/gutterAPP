import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { Toggle } from '@/components/Toggle';
import { useAuth, useSettings } from '@/context';
import {
  checkBiometricStatus,
  clearBiometricSession,
  promptBiometricAuth,
  saveBiometricSession,
} from '@/lib/biometrics';
import { getStoredToken } from '@/api/token';
import { colors, headerGradient } from '@/theme';
import { initials } from '@/utils/format';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const {
    hideBalances,
    setHideBalances,
    biometricsEnabled,
    setBiometricsEnabled,
    pushEnabled,
    setPushEnabled,
  } = useSettings();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);

  const handleToggleBiometrics = async (enable: boolean) => {
    if (enable) {
      setBioLoading(true);
      try {
        const status = await checkBiometricStatus();
        if (!status.hasHardware) {
          Alert.alert(
            'Biometrics Not Supported',
            'Your device does not support Face ID or biometric authentication.'
          );
          return;
        }
        if (!status.isEnrolled) {
          Alert.alert(
            'Biometrics Not Enrolled',
            `No ${status.label} setup found on this device. Please set up Face ID or Passcode in your device Settings first.`
          );
          return;
        }

        const auth = await promptBiometricAuth('Scan to enable Face ID login for Gutter');
        if (!auth.success) {
          if (auth.error && !auth.error.toLowerCase().includes('cancel')) {
            Alert.alert('Authentication Failed', auth.error);
          }
          return;
        }

        const token = await getStoredToken();
        if (token) {
          await saveBiometricSession(token, user?.email || user?.phone);
        }
        setBiometricsEnabled(true);
        Alert.alert('Face ID Enabled', 'You can now sign in to Gutter quickly with Face ID.');
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Could not enable Face ID login.');
      } finally {
        setBioLoading(false);
      }
    } else {
      await clearBiometricSession();
      setBiometricsEnabled(false);
      Alert.alert('Face ID Disabled', 'Biometric login has been turned off.');
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Log out', 'Are you sure you want to log out of your Gutter account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
          } finally {
            setSigningOut(false);
            router.replace('/(auth)/login');
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-page">
      <LinearGradient
        colors={[...headerGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        className="absolute left-0 right-0 top-0 h-[186px] overflow-hidden"
      >
        <GWatermark light size={400} className="-left-24 -top-24" />
      </LinearGradient>

      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView contentContainerClassName="px-[22px] pb-8 pt-2">
          <Text className="font-sans-extrabold text-[22px] tracking-tight text-white">Settings</Text>

          <View className="mt-3 flex-row items-center gap-3.5 rounded-[22px] border border-line bg-surface p-3.5 shadow-lg shadow-navy-deep/20">
            <View className="h-[52px] w-[52px] items-center justify-center rounded-[18px] bg-chip">
              <Text className="font-sans-bold text-lg text-navy">
                {initials(user?.first_name, user?.last_name) || '–'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-sans-extrabold text-[15px] text-ink">
                {user ? `${user.first_name} ${user.last_name}` : ''}
              </Text>
              <Text className="mt-1 font-sans text-[11.5px] text-ink-soft">
                {user?.phone ?? ''} · Tier {user?.tier ?? 1}
              </Text>
            </View>
            {user?.kyc_status === 'verified' ? (
              <View className="h-7 flex-row items-center gap-1.5 rounded-[9px] bg-mint-bg px-2.5">
                <View className="h-3.5 w-3.5 items-center justify-center rounded-full bg-mint-dark">
                  <Ionicons name="checkmark" size={9} color={colors.white} />
                </View>
                <Text className="font-sans-bold text-[10.5px] text-mint-deeper">Verified</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => router.push('/(onboarding)/verify-identity')}
                className="h-7 items-center justify-center rounded-[9px] bg-btc-bg px-2.5"
              >
                <Text className="font-sans-bold text-[10.5px] text-btc">Verify now</Text>
              </Pressable>
            )}
          </View>

          <Section title="Security">
            <Row badge="2F" label="Two-factor authentication">
              <Toggle value={twoFactor} onChange={setTwoFactor} />
            </Row>
            <Row icon="scan-outline" label="Face ID login">
              {bioLoading ? (
                <ActivityIndicator size="small" color={colors.navy} />
              ) : (
                <Toggle value={biometricsEnabled} onChange={handleToggleBiometrics} />
              )}
            </Row>
            <Row
              icon="key-outline"
              label="Change transaction PIN"
              onPress={() => router.push('/security/change-pin')}
              chevron
              last
            />
          </Section>

          <Section title="Account">
            <Row
              badge="ID"
              badgeClass="bg-mint-bg"
              badgeTextClass="text-mint-dark"
              label="Identity verification"
              sublabel={
                user?.kyc_status === 'verified' ? 'Verified' : 'Not verified yet'
              }
              onPress={() => router.push('/(onboarding)/verify-identity')}
              chevron
            />
            <Row
              badge="₦"
              label="Transaction limits"
              sublabel={`Tier ${user?.tier ?? 1} account`}
              chevron
              onPress={() => router.push('/security/transaction-limits')}
            >
              <Text className="font-grotesk text-[11.5px] text-ink-muted">
                {user?.tier === 2 ? '₦5M / day' : user?.tier && user.tier >= 3 ? '₦25M / day' : '₦50K / day'}
              </Text>
            </Row>
            <Row icon="card-outline" label="Linked bank accounts" chevron last />
          </Section>

          <Section title="Preferences">
            <Row icon="notifications-outline" label="Push notifications">
              <Toggle value={pushEnabled} onChange={setPushEnabled} />
            </Row>
            <Row icon="eye-off-outline" label="Hide balances by default" last>
              <Toggle value={hideBalances} onChange={setHideBalances} />
            </Row>
          </Section>

          <Section title="Support & Help">
            <Row
              icon="headset"
              label="Help Center & Complaints"
              sublabel="Chat on WhatsApp, call, or file a dispute ticket"
              chevron
              last
              onPress={() => router.push('/help')}
            />
          </Section>

          <View className="mt-4 flex-row gap-2.5">
            <Button
              title="Help centre"
              variant="ghost"
              small
              onPress={() => router.push('/help')}
              className="flex-1"
            />
            <Pressable
              onPress={confirmSignOut}
              disabled={signingOut}
              className="h-12 flex-1 items-center justify-center rounded-2xl bg-red-bg active:opacity-85"
            >
              {signingOut ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color={colors.red} />
                  <Text className="font-sans-bold text-[13px] text-red">Logging out…</Text>
                </View>
              ) : (
                <Text className="font-sans-bold text-[13px] text-red">Log out</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-4">
      <Text className="mb-2 font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-soft">
        {title}
      </Text>
      <View className="rounded-[20px] border border-line bg-surface px-4">{children}</View>
    </View>
  );
}

function Row({
  badge,
  icon,
  iconColor = colors.navy,
  badgeClass = 'bg-chip',
  badgeTextClass = 'text-navy',
  label,
  sublabel,
  onPress,
  chevron = false,
  last = false,
  children,
}: {
  badge?: React.ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  badgeClass?: string;
  badgeTextClass?: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  chevron?: boolean;
  last?: boolean;
  children?: React.ReactNode;
}) {
  const content = (
    <>
      <View className={`h-[34px] w-[34px] items-center justify-center rounded-[11px] ${badgeClass}`}>
        {icon ? (
          <Ionicons name={icon} size={16} color={iconColor} />
        ) : typeof badge === 'string' ? (
          <Text className={`font-sans-bold text-[12px] ${badgeTextClass}`}>{badge}</Text>
        ) : (
          badge
        )}
      </View>
      <View className="flex-1">
        <Text className="font-sans-bold text-[13px] text-ink">{label}</Text>
        {sublabel ? (
          <Text className="mt-0.5 font-sans text-[10.5px] text-ink-soft">{sublabel}</Text>
        ) : null}
      </View>
      {children}
      {chevron ? <Ionicons name="chevron-forward" size={15} color={colors.inkGhost} /> : null}
    </>
  );

  const rowClass = `flex-row items-center gap-3 py-3 ${last ? '' : 'border-b border-line-soft'}`;

  return onPress ? (
    <Pressable onPress={onPress} className={`${rowClass} active:opacity-80`}>
      {content}
    </Pressable>
  ) : (
    <View className={rowClass}>{content}</View>
  );
}
