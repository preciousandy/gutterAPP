import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

/** 3x4 numeric keypad from the PIN screens. */
export function Numpad({
  onKey,
  onDelete,
}: {
  onKey: (digit: string) => void;
  onDelete: () => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-[11px]">
      {KEYS.map((key, index) =>
        key === '' ? (
          <View key={index} className="h-[58px] basis-[30%] flex-grow" />
        ) : (
          <Pressable
            key={index}
            onPress={() => (key === 'del' ? onDelete() : onKey(key))}
            className={`h-[58px] basis-[30%] flex-grow items-center justify-center rounded-2xl active:opacity-80 ${
              key === 'del' ? 'bg-chip' : 'border border-line bg-surface'
            }`}
          >
            {key === 'del' ? (
              <Ionicons name="backspace-outline" size={22} color={colors.navy} />
            ) : (
              <Text className="font-grotesk text-[23px] text-ink">{key}</Text>
            )}
          </Pressable>
        )
      )}
    </View>
  );
}

/** The row of filled/empty PIN dots. */
export function PinDots({ length = 4, filled }: { length?: number; filled: number }) {
  return (
    <View className="flex-row justify-center gap-4">
      {Array.from({ length }, (_, i) => (
        <View
          key={i}
          className={`h-[18px] w-[18px] rounded-full ${
            i < filled ? 'bg-navy-deep' : 'border-2 border-[#C3CFE3]'
          }`}
        />
      ))}
    </View>
  );
}
