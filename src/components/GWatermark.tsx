import React from 'react';
import { Text } from 'react-native';


export function GWatermark({
  light = false,
  size = 460,
  className = '',
}: {
  light?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <Text
      className={`absolute font-sans-extrabold ${className}`}
      style={{
        fontSize: size,
        lineHeight: size,
        letterSpacing: -size * 0.06,
        color: light ? 'rgba(255,255,255,0.06)' : 'rgba(14,32,80,0.045)',
      }}
      pointerEvents="none"
    >
      G
    </Text>
  );
}
