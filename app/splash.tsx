import React from 'react';
import { useRouter } from 'expo-router';
import { SplashScreenView } from '@/components/SplashScreenView';

export default function SplashScreenRoute() {
  const router = useRouter();

  return (
    <SplashScreenView
      duration={1800}
      onFinish={() => {
        router.replace('/(auth)/login');
      }}
    />
  );
}
