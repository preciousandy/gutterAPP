import React from 'react';
import { View } from 'react-native';

const UP = ['#D7F3E9', '#D7F3E9', '#D7F3E9', '#A9E7D3', '#A9E7D3', '#23D3A5', '#23D3A5'];
const DOWN = ['#FBE0E5', '#FBE0E5', '#F6C4CD', '#F6C4CD', '#EC8C9E', '#D6455F', '#D6455F'];

/** Seven-bar mini chart from the market screen. Values are 0–1 heights. */
export function Sparkline({ values, up }: { values: number[]; up: boolean }) {
  const palette = up ? UP : DOWN;
  return (
    <View className="h-[30px] flex-1 flex-row items-end gap-0.5">
      {values.slice(0, 7).map((v, i) => (
        <View
          key={i}
          className="flex-1 rounded-sm"
          style={{
            height: `${Math.round(Math.min(1, Math.max(0.05, v)) * 100)}%`,
            backgroundColor: palette[i] ?? palette[palette.length - 1],
          }}
        />
      ))}
    </View>
  );
}
