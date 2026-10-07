import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/** Buy/Sell pill switcher from the trade screens. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.tab, active && styles.activeTab]}
          >
            <Text style={[styles.text, active ? styles.activeText : styles.inactiveText]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 50,
    flexDirection: 'row',
    gap: 5,
    borderRadius: 16,
    backgroundColor: '#E7EBF4',
    padding: 5,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  text: {
    fontSize: 14,
  },
  activeText: {
    fontFamily: 'Manrope_800ExtraBold',
    color: '#0E2050',
  },
  inactiveText: {
    fontFamily: 'Manrope_700Bold',
    color: '#7C8AA6',
  },
});

