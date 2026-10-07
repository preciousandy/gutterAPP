import React, { useRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

/**
 * Six OTP boxes backed by one hidden TextInput, as on the verify-email screen.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
}: {
  length?: number;
  value: string;
  onChange: (code: string) => void;
}) {
  const inputRef = useRef<TextInput>(null);

  return (
    <Pressable onPress={() => inputRef.current?.focus()}>
      <View className="flex-row gap-2.5">
        {Array.from({ length }, (_, i) => {
          const char = value[i];
          const isActive = i === value.length;
          return (
            <View
              key={i}
              className={`h-[62px] flex-1 items-center justify-center rounded-2xl bg-surface ${
                isActive ? 'border-[1.5px] border-navy' : 'border border-line-input'
              }`}
            >
              <Text className={`font-grotesk-bold text-[26px] ${char ? 'text-ink' : 'text-ink-ghost'}`}>
                {char ?? '–'}
              </Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus
        className="absolute h-px w-px opacity-0"
      />
    </Pressable>
  );
}
