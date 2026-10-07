import React from 'react';
import { View, ViewProps } from 'react-native';

/** White design-system card: rounded-[22px], hairline border. */
export function Card({ className = '', children, ...props }: ViewProps & { className?: string }) {
  return (
    <View className={`rounded-[22px] border border-line bg-surface ${className}`} {...props}>
      {children}
    </View>
  );
}
