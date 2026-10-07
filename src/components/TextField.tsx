import React from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import { colors } from '@/theme';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  /** Right-side accessory (e.g. "Show", "STRONG"). */
  accessory?: React.ReactNode;
  /** Left-side prefix (e.g. "+234"). */
  prefix?: string;
}

/** Design-system input: uppercase tracking label + 54px white rounded field. */
export function TextField({
  label,
  error,
  accessory,
  prefix,
  className = '',
  ...inputProps
}: TextFieldProps) {
  return (
    <View className="mb-3.5">
      <Text className="mb-2 font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-muted">
        {label}
      </Text>
      <View
        className={`h-[54px] flex-row items-center rounded-2xl border bg-surface px-4 ${
          error ? 'border-[1.5px] border-red' : 'border-line-input'
        }`}
      >
        {prefix ? (
          <>
            <Text className="font-sans-semibold text-[15px] text-ink-muted">{prefix}</Text>
            <View className="mx-3 h-[22px] w-px bg-line-input" />
          </>
        ) : null}
        <TextInput
          placeholderTextColor={colors.inkFaint}
          className={`h-full flex-1 font-sans-semibold text-[15px] text-ink ${className}`}
          {...inputProps}
        />
        {accessory}
      </View>
      {error ? <Text className="mt-1.5 font-sans text-[12px] text-red">{error}</Text> : null}
    </View>
  );
}
