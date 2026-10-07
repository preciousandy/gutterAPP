import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GWatermark } from '@/components/GWatermark';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  AppNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/api/notifications';
import { errorMessage } from '@/api/client';
import { colors } from '@/theme';

type FilterType = 'all' | 'transactions' | 'security' | 'system';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setError(null);
    try {
      const res = await getNotifications();
      setNotifications(res.data);
    } catch (e) {
      setError(errorMessage(e));
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchItems();
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      // Ignore background failure
    }
  };

  const handlePressItem = async (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
    try {
      await markNotificationRead(id);
    } catch {
      // Ignore background failure
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (filter === 'all') return true;
    return item.category === filter;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View className="flex-1 bg-page">
      <GWatermark size={480} className="-right-36 top-52" />
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-[22px] pt-3">
          <ScreenHeader
            title="Notifications"
            right={
              unreadCount > 0 ? (
                <Pressable
                  onPress={handleMarkAllRead}
                  hitSlop={8}
                  className="rounded-xl border border-line-input bg-surface px-3 py-2 active:opacity-75"
                >
                  <Text className="font-sans-bold text-[12px] text-navy">
                    Mark all read
                  </Text>
                </Pressable>
              ) : null
            }
          />

          {/* Filter Pills */}
          <View className="mt-4 flex-row gap-2">
            {(
              [
                { label: 'All', key: 'all' },
                { label: 'Transactions', key: 'transactions' },
                { label: 'Security', key: 'security' },
                { label: 'System', key: 'system' },
              ] as const
            ).map((tab) => {
              const active = filter === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setFilter(tab.key)}
                  className={`rounded-full px-3.5 py-1.5 ${
                    active ? 'bg-navy' : 'border border-line-input bg-surface'
                  } active:opacity-80`}
                >
                  <Text
                    className={`font-sans-bold text-[12px] ${
                      active ? 'text-white' : 'text-ink-secondary'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* List Content */}
        <ScrollView
          contentContainerClassName="px-[22px] pb-10 pt-4"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.navy}
            />
          }
        >
          {loading ? (
            <View className="mt-16 items-center justify-center">
              <ActivityIndicator size="small" color={colors.navy} />
              <Text className="mt-2.5 font-sans text-[12px] text-ink-muted">
                Loading notifications…
              </Text>
            </View>
          ) : error && notifications.length === 0 ? (
            <View className="mt-16 items-center justify-center px-6">
              <View className="h-16 w-16 items-center justify-center rounded-3xl bg-red-bg">
                <Ionicons name="cloud-offline-outline" size={28} color={colors.red} />
              </View>
              <Text className="mt-4 font-sans-bold text-[16px] text-ink">
                Could not load notifications
              </Text>
              <Text className="mt-1 text-center font-sans text-[13px] leading-[18px] text-ink-muted">
                {error}
              </Text>
              <Pressable
                onPress={() => void fetchItems()}
                hitSlop={8}
                className="mt-4 rounded-xl bg-navy px-4 py-2.5 active:opacity-85"
              >
                <Text className="font-sans-bold text-[13px] text-white">Try again</Text>
              </Pressable>
            </View>
          ) : filteredNotifications.length === 0 ? (
            <View className="mt-20 items-center justify-center px-6">
              <View className="h-16 w-16 items-center justify-center rounded-3xl bg-chip">
                <Ionicons name="notifications-off-outline" size={28} color={colors.inkMuted} />
              </View>
              <Text className="mt-4 font-sans-bold text-[16px] text-ink">
                No notifications
              </Text>
              <Text className="mt-1 text-center font-sans text-[13px] leading-[18px] text-ink-muted">
                {filter === 'all'
                  ? "You're all caught up! When you have new alerts or updates, they'll appear here."
                  : `No ${filter} notifications found right now.`}
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {filteredNotifications.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handlePressItem(item.id)}
                  className={`flex-row items-start gap-3.5 rounded-[20px] border p-4 ${
                    item.read
                      ? 'border-line-input/80 bg-surface/70'
                      : 'border-navy/30 bg-surface shadow-sm'
                  } active:opacity-85`}
                >
                  {/* Icon */}
                  <View
                    style={{ backgroundColor: `${item.icon_color}18` }}
                    className="h-10 w-10 items-center justify-center rounded-[14px]"
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={item.icon_color || colors.navy}
                    />
                  </View>

                  {/* Body */}
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text
                        className={`font-sans-bold text-[13.5px] ${
                          item.read ? 'text-ink' : 'text-navy-darkest'
                        }`}
                      >
                        {item.title}
                      </Text>
                      <Text className="font-sans text-[11px] text-ink-muted">
                        {item.created_at}
                      </Text>
                    </View>

                    <Text className="mt-1 font-sans text-[12px] leading-[17px] text-ink-secondary">
                      {item.message}
                    </Text>
                  </View>

                  {/* Unread indicator */}
                  {!item.read && (
                    <View className="mt-1.5 h-2 w-2 rounded-full bg-mint" />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
