import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionTitle?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  actionTitle,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="items-center justify-center px-6 py-16">
      <Ionicons name={icon} size={44} color={colors.inkFaint} />
      <Text className="mt-4 text-center font-sans-bold text-base text-ink">{title}</Text>
      {message ? (
        <Text className="mt-2 text-center font-sans text-[13px] leading-5 text-ink-muted">
          {message}
        </Text>
      ) : null}
      {actionTitle && onAction ? (
        <Button title={actionTitle} onPress={onAction} variant="ghost" small className="mt-5 px-6" />
      ) : null}
    </View>
  );
}
