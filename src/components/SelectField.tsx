import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

export interface SelectOption<T> {
  value: T;
  label: string;
  sublabel?: string;
  /** Two-letter badge shown in a tinted square, e.g. "GT". */
  badge?: string;
  badgeClassName?: string;
}

interface SelectFieldProps<T> {
  label: string;
  placeholder: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  error?: string;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

/** Design-styled dropdown: 56px field opening a searchable bottom-sheet list. */
export function SelectField<T extends string | number>({
  label,
  placeholder,
  value,
  options,
  onChange,
  error,
  emptyMessage = 'Nothing to select yet.',
  searchable = true,
  searchPlaceholder = 'Search...',
}: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);

  const filteredOptions = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return options;
    return options.filter((o) => {
      const matchLabel = o.label.toLowerCase().includes(clean);
      const matchSub = o.sublabel ? o.sublabel.toLowerCase().includes(clean) : false;
      const matchBadge = o.badge ? o.badge.toLowerCase().includes(clean) : false;
      const matchVal = String(o.value).toLowerCase().includes(clean);
      return matchLabel || matchSub || matchBadge || matchVal;
    });
  }, [options, query]);

  const handleOpen = () => {
    setQuery('');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View className="mb-3.5">
      <Text className="mb-2 font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-muted">
        {label}
      </Text>
      <Pressable
        onPress={handleOpen}
        className={`h-14 flex-row items-center justify-between rounded-2xl border bg-surface px-4 ${
          error ? 'border-[1.5px] border-red' : 'border-line-input'
        }`}
      >
        <View className="flex-1 flex-row items-center gap-3">
          {selected?.badge ? (
            <View
              className={`h-[30px] w-[30px] items-center justify-center rounded-[10px] ${
                selected.badgeClassName ?? 'bg-chip'
              }`}
            >
              <Text className="font-sans-bold text-[12px] text-navy">{selected.badge}</Text>
            </View>
          ) : null}
          <Text
            className={`shrink font-sans-semibold text-[15px] ${selected ? 'text-ink' : 'text-ink-faint'}`}
            numberOfLines={1}
          >
            {selected ? selected.label : placeholder}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={colors.inkMuted} />
      </Pressable>
      {error ? <Text className="mt-1.5 font-sans text-[12px] text-red">{error}</Text> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={handleClose}>
        <Pressable className="flex-1 justify-end bg-navy-darkest/60" onPress={handleClose}>
          <Pressable
            className="max-h-[85%] min-h-[50%] rounded-t-[32px] bg-surface pb-8"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="items-center pt-3">
              <View className="h-1 w-11 rounded-full bg-line-input" />
            </View>

            <View className="flex-row items-center justify-between px-6 pt-3 pb-2">
              <View>
                <Text className="font-sans-extrabold text-lg text-ink">{label}</Text>
                <Text className="font-sans text-[12px] text-ink-muted">
                  {options.length} options available
                </Text>
              </View>
              <Pressable
                onPress={handleClose}
                hitSlop={12}
                className="h-8 w-8 items-center justify-center rounded-full bg-page"
              >
                <Ionicons name="close" size={18} color={colors.inkMuted} />
              </Pressable>
            </View>

            {searchable && options.length > 5 ? (
              <View className="px-6 py-2">
                <View className="h-12 flex-row items-center rounded-2xl border border-line-input bg-page px-3.5">
                  <Ionicons name="search-outline" size={18} color={colors.inkMuted} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder={searchPlaceholder}
                    placeholderTextColor={colors.inkFaint}
                    className="ml-2.5 h-full flex-1 font-sans text-[14px] text-ink"
                    autoCorrect={false}
                    autoCapitalize="none"
                    clearButtonMode="while-editing"
                  />
                  {query.length > 0 ? (
                    <Pressable onPress={() => setQuery('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={16} color={colors.inkMuted} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}

            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => String(item.value)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
              ListEmptyComponent={
                <View className="p-8 items-center justify-center">
                  <Ionicons name="search" size={28} color={colors.inkFaint} />
                  <Text className="mt-2 text-center font-sans-medium text-[13px] text-ink-muted">
                    {query.trim().length > 0 ? `No results for "${query}"` : emptyMessage}
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    handleClose();
                  }}
                  className="flex-row items-center gap-3 border-b border-line-soft px-6 py-3.5 active:bg-page"
                >
                  {item.badge ? (
                    <View
                      className={`h-[32px] w-[32px] items-center justify-center rounded-[10px] ${
                        item.badgeClassName ?? 'bg-chip'
                      }`}
                    >
                      <Text className="font-sans-bold text-[12px] text-navy">{item.badge}</Text>
                    </View>
                  ) : null}
                  <View className="flex-1 pr-3">
                    <Text className="font-sans-semibold text-[15px] text-ink">{item.label}</Text>
                    {item.sublabel ? (
                      <Text className="mt-0.5 font-sans text-[12px] text-ink-soft" numberOfLines={1}>
                        {item.sublabel}
                      </Text>
                    ) : null}
                  </View>
                  {item.value === value ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.navy} />
                  ) : null}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

