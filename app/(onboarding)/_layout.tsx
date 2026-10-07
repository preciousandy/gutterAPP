import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '@/theme';

export const unstable_settings = {
  initialRouteName: 'verify-email',
};

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.page },
      }}
    >
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="change-email" />
      <Stack.Screen name="verify-identity" />
      <Stack.Screen name="face-verification" />
      <Stack.Screen name="create-pin" />
    </Stack>
  );
}
