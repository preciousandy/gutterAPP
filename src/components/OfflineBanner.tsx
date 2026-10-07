import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useWallet } from '@/context';
import { colors } from '@/theme';

export function OfflineBanner() {
  const { isOffline: authOffline } = useAuth();
  const { isOffline: walletOffline, refreshWallet } = useWallet();

  const isOffline = authOffline || walletOffline;

  if (!isOffline) return null;

  return (
    <Pressable
      onPress={() => void refreshWallet()}
      className="mx-[22px] mb-3 flex-row items-center justify-between rounded-2xl border border-amber-line bg-amber-bg px-4 py-2.5 shadow-sm active:opacity-90"
    >
      <View className="flex-1 flex-row items-center gap-2.5">
        <Ionicons name="cloud-offline-outline" size={17} color="#8A6412" />
        <Text className="flex-1 font-sans-semibold text-[11.5px] leading-[15px] text-amber">
          Offline · Showing cached account data. Tap to reconnect.
        </Text>
      </View>
      <View className="ml-2 rounded-lg bg-white/80 px-2 py-0.5 border border-amber-line">
        <Text className="font-sans-bold text-[10px] text-amber">Retry</Text>
      </View>
    </Pressable>
  );
}
