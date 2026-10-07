import React from 'react';
import { View } from 'react-native';
import { Link, Stack } from 'expo-router';
import { EmptyState } from '@/components/EmptyState';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View className="flex-1 items-center justify-center bg-page">
        <EmptyState
          icon="compass-outline"
          title="This screen doesn't exist"
          message="The link you followed may be broken."
        />
        <Link href="/" className="mt-3 p-3 font-sans-bold text-navy">
          Go home
        </Link>
      </View>
    </>
  );
}
