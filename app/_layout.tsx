import '../global.css';

import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { cssInterop } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { AppProviders, useAuth } from '@/context';
import { SplashScreenView } from '@/components/SplashScreenView';
import { colors } from '@/theme';

// Keep the splash screen up until fonts load and the session is restored.
void SplashScreen.preventAutoHideAsync();

// Let Tailwind classes style icons and gradients.
cssInterop(Ionicons, { className: 'style' });
cssInterop(LinearGradient, { className: 'style' });

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (fontsReady && !isBootstrapping) {
      void SplashScreen.hideAsync();
    }
  }, [fontsReady, isBootstrapping]);

  if (!fontsReady || isBootstrapping) return null;


  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.page },
        }}
      >
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="transfer/index" />
          <Stack.Screen name="bills/index" />
          <Stack.Screen name="crypto/trade" />
          <Stack.Screen name="crypto/receive" />
          <Stack.Screen name="crypto/send" />
          <Stack.Screen name="card/create" />
          <Stack.Screen name="card/fund" />
          <Stack.Screen name="card/details" />
          <Stack.Screen name="atm-withdrawal" />
          <Stack.Screen name="security/confirm-pin" />
          <Stack.Screen name="security/change-pin" />
          <Stack.Screen name="security/transaction-limits" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="receipt" />
          <Stack.Screen name="help" />
        </Stack.Protected>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>

      {showSplash && (
        <SplashScreenView
          duration={1800}
          onFinish={() => setShowSplash(false)}
        />
      )}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  return (
    <AppProviders>
      <StatusBar style="light" />
      <RootNavigator fontsReady={fontsLoaded} />
    </AppProviders>
  );
}
