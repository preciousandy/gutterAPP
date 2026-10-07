import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { buttonGradient, colors } from '@/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  /**
   * primary  — navy gradient CTA ("Log in", "Continue")
   * mint     — mint background, dark text ("Fund Account", "Capture")
   * dark     — solid navy-deep ("Freeze card", "Fund card")
   * ghost    — white with border ("Details", "Cancel" on light bg)
   * muted    — light grey ("Cancel" in sheets)
   * glass    — translucent white on navy ("Cancel request", "Transfer")
   */
  variant?: 'primary' | 'mint' | 'dark' | 'ghost' | 'muted' | 'glass';
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  className?: string;
}

const solid = {
  mint: 'bg-mint',
  dark: 'bg-navy-deep',
  ghost: 'bg-surface border border-line-input',
  muted: 'bg-page',
  glass: 'bg-white/10 border border-white/20',
} as const;

const labelColor = {
  mint: 'text-mint-on',
  dark: 'text-white',
  ghost: 'text-ink',
  muted: 'text-ink-mid',
  glass: 'text-white',
} as const;

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  small = false,
  className = '',
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const height = small ? 'h-12' : 'h-[58px]';
  const radius = small ? 'rounded-2xl' : 'rounded-[18px]';
  const spinnerColor = variant === 'ghost' || variant === 'muted' ? colors.navy : colors.white;
  const label = small ? 'text-[13px]' : 'text-base';

  if (variant === 'primary') {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        disabled={isDisabled}
        className={`${height} ${radius} overflow-hidden active:opacity-90 ${
          isDisabled ? 'opacity-50' : ''
        } ${className}`}
      >
        <LinearGradient
          colors={[...buttonGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="h-full w-full items-center justify-center"
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text className={`font-sans-bold ${label} text-white`}>{title}</Text>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      className={`${height} ${radius} items-center justify-center active:opacity-90 ${solid[variant]} ${
        isDisabled ? 'opacity-50' : ''
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'mint' ? colors.mintOn : spinnerColor} />
      ) : (
        <View className="flex-row items-center gap-2">
          <Text className={`font-sans-bold ${label} ${labelColor[variant]}`}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}
