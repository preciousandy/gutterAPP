import React from 'react';
import { Pressable, View } from 'react-native';

/** Mint pill toggle matching the design (44x26, white knob). */
export function Toggle({
  value,
  onChange,
  disabled = false,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      disabled={disabled}
      className={`h-[26px] w-11 rounded-full ${value ? 'bg-mint' : 'bg-[#D6DCE8]'} ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <View
        className={`absolute top-[3px] h-5 w-5 rounded-full bg-white ${
          value ? 'right-[3px]' : 'left-[3px]'
        }`}
      />
    </Pressable>
  );
}
