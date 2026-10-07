import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

/** In-screen header: 38px rounded back square + bold title, per the design. */
export function ScreenHeader({
  title,
  dark = false,
  right,
  onBack,
}: {
  title: string;
  /** true when rendered on a navy background. */
  dark?: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View className="flex-row items-center gap-3.5">
      <Pressable
        onPress={handleBack}
        hitSlop={8}
        className={`h-[38px] w-[38px] items-center justify-center rounded-xl ${
          dark ? 'border border-white/20 bg-white/15' : 'border border-line-input bg-surface'
        }`}
      >
        <Ionicons name="arrow-back" size={18} color={dark ? colors.white : colors.ink} />
      </Pressable>
      <Text className={`flex-1 font-sans-extrabold text-[19px] ${dark ? 'text-white' : 'text-ink'}`}>
        {title}
      </Text>
      {right}
    </View>
  );
}
