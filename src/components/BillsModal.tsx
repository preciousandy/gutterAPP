import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Button } from './Button';
import { SegmentedControl } from './SegmentedControl';
import {
  purchaseBill,
  detectNigerianNetwork,
  getBillPlans,
  type NetworkProvider,
} from '@/api/bills';
import {
  getAirtimeBeneficiaries,
  saveAirtimeBeneficiary,
  removeAirtimeBeneficiary,
  type AirtimeBeneficiary,
} from '@/api/airtimeBeneficiaries';
import { useWallet } from '@/context';
import { setPendingAction } from '@/lib/pendingAction';
import { colors } from '@/theme';
import { formatNaira } from '@/utils/format';

interface BillsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface DataPlan {
  id: string;
  name: string;
  data: string;
  validity: string;
  price: number;
  variationCode: string;
  period?: 'daily' | 'weekly' | 'monthly';
  plantype?: string;
}

const NETWORKS: { key: NetworkProvider; name: string; bg: string; text: string }[] = [
  { key: 'MTN', name: 'MTN', bg: '#FFCC00', text: '#000000' },
  { key: 'Airtel', name: 'Airtel', bg: '#E60000', text: '#FFFFFF' },
  { key: 'Glo', name: 'Glo', bg: '#008000', text: '#FFFFFF' },
  { key: '9mobile', name: '9mobile', bg: '#004F35', text: '#FFFFFF' },
];

const NETWORK_COLORS: Record<NetworkProvider, { bg: string; text: string }> = {
  MTN: { bg: '#FFCC00', text: '#000000' },
  Airtel: { bg: '#E60000', text: '#FFFFFF' },
  Glo: { bg: '#008000', text: '#FFFFFF' },
  '9mobile': { bg: '#004F35', text: '#FFFFFF' },
};

function formatPhoneNumber(num: string): string {
  const digits = num.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return num;
}

const AIRTIME_PRESETS = [200, 500, 1000, 2000, 5000];

const DATA_PLANS: Record<NetworkProvider, DataPlan[]> = {
  MTN: [
    { id: 'mtn-1', name: '1.5GB Monthly', data: '1.5GB', validity: '30 Days', price: 1000, variationCode: 'mtn-100mb-1000' },
    { id: 'mtn-2', name: '4.5GB Monthly', data: '4.5GB', validity: '30 Days', price: 2000, variationCode: 'mtn-500mb-2000' },
    { id: 'mtn-3', name: '6GB Weekly', data: '6GB', validity: '7 Days', price: 1500, variationCode: 'mtn-20hrs-1500' },
    { id: 'mtn-4', name: '8GB Monthly', data: '8GB', validity: '30 Days', price: 3000, variationCode: 'mtn-data-3000' },
    { id: 'mtn-5', name: '10GB Monthly', data: '10GB', validity: '30 Days', price: 3500, variationCode: 'mtn-1gb-3500' },
  ],
  Airtel: [
    { id: 'air-1', name: '750MB Bundle', data: '750MB', validity: '14 Days', price: 500, variationCode: 'airt-500' },
    { id: 'air-2', name: '1.5GB Monthly', data: '1.5GB', validity: '30 Days', price: 1000, variationCode: 'airt-1000' },
    { id: 'air-3', name: '3GB Monthly', data: '3GB', validity: '30 Days', price: 1500, variationCode: 'airt-1500' },
    { id: 'air-4', name: '8GB Monthly', data: '8GB', validity: '30 Days', price: 3000, variationCode: 'airt-3000' },
    { id: 'air-5', name: '15GB Monthly', data: '15GB', validity: '30 Days', price: 5000, variationCode: 'airt-5000' },
  ],
  Glo: [
    { id: 'glo-1', name: '1.05GB 14-Day', data: '1.05GB', validity: '14 Days', price: 500, variationCode: 'glo500' },
    { id: 'glo-2', name: '2.5GB Monthly', data: '2.5GB', validity: '30 Days', price: 1000, variationCode: 'glo1000' },
    { id: 'glo-3', name: '4.1GB Monthly', data: '4.1GB', validity: '30 Days', price: 1500, variationCode: 'glo1500' },
    { id: 'glo-4', name: '10GB Monthly', data: '10GB', validity: '30 Days', price: 3000, variationCode: 'glo3000' },
    { id: 'glo-5', name: '18.25GB Monthly', data: '18.25GB', validity: '30 Days', price: 5000, variationCode: 'glo5000' },
  ],
  '9mobile': [
    { id: '9m-1', name: '500MB Monthly', data: '500MB', validity: '30 Days', price: 500, variationCode: 'eti-500' },
    { id: '9m-2', name: '1.5GB Monthly', data: '1.5GB', validity: '30 Days', price: 1000, variationCode: 'eti-1000' },
    { id: '9m-3', name: '4.5GB Monthly', data: '4.5GB', validity: '30 Days', price: 2000, variationCode: 'eti-2000' },
    { id: '9m-4', name: '11GB Monthly', data: '11GB', validity: '30 Days', price: 2500, variationCode: 'eti-2500' },
    { id: '9m-5', name: '15GB Monthly', data: '15GB', validity: '30 Days', price: 5000, variationCode: 'eti-5000' },
  ],
};

export function BillsModal({ visible, onClose }: BillsModalProps) {
  const router = useRouter();
  const { wallet } = useWallet();

  const [category, setCategory] = useState<'airtime' | 'data'>('airtime');
  const [network, setNetwork] = useState<NetworkProvider>('MTN');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Backend live plans and validity category filter state
  const [backendPlans, setBackendPlans] = useState<Record<NetworkProvider, DataPlan[]>>({
    MTN: [],
    Airtel: [],
    Glo: [],
    '9mobile': [],
  });
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [validityFilter, setValidityFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');

  // Fetch live plans from backend whenever modal is open and on data tab or network change
  useEffect(() => {
    if (!visible || category !== 'data') return;

    let isMounted = true;
    setLoadingPlans(true);

    getBillPlans(network)
      .then((res) => {
        if (!isMounted) return;
        if (res?.plans && res.plans.length > 0) {
          const mapped: DataPlan[] = res.plans.map((p) => ({
            id: String(p.id ?? p.variation_code),
            name: p.name,
            data: p.size || p.name,
            validity: p.validity || (p.period ? p.period : 'Standard'),
            price: Number(p.price ?? p.variation_amount),
            variationCode: p.variation_code,
            period: p.period || 'monthly',
            plantype: p.plantype,
          }));

          setBackendPlans((prev) => ({
            ...prev,
            [network]: mapped,
          }));
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch live data plans:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingPlans(false);
      });

    return () => {
      isMounted = false;
    };
  }, [visible, network, category]);

  // Cached phone beneficiaries and suggestions state
  const [cachedBeneficiaries, setCachedBeneficiaries] = useState<AirtimeBeneficiary[]>([]);
  const [dismissSuggestions, setDismissSuggestions] = useState(false);

  useEffect(() => {
    if (visible) {
      void getAirtimeBeneficiaries().then((list) => {
        setCachedBeneficiaries(list);
      });
      setDismissSuggestions(false);
    }
  }, [visible]);

  const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
  const detectedNetwork = cleanPhone.length >= 4 ? detectNigerianNetwork(cleanPhone) : null;
  const isNetworkMismatch = Boolean(detectedNetwork && detectedNetwork !== network);

  // Filter matching suggestions when typing 4 or more digits
  const matchingBeneficiaries =
    cleanPhone.length >= 4 && cleanPhone.length < 11 && !dismissSuggestions
      ? cachedBeneficiaries.filter((b) => b.phone.includes(cleanPhone))
      : [];

  const handleSelectBeneficiary = (b: AirtimeBeneficiary) => {
    setPhone(b.phone);
    setNetwork(b.network);
    setSelectedPlan(null);
    if (category === 'data') setAmount('');
    setError(null);
    setDismissSuggestions(true);
  };

  const handleDeleteBeneficiary = async (targetPhone: string, e: any) => {
    e?.stopPropagation?.();
    const updated = await removeAirtimeBeneficiary(targetPhone);
    setCachedBeneficiaries(updated);
  };

  const handlePastePhone = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      const clean = text.replace(/[^0-9]/g, '');
      if (clean) {
        setPhone(clean);
        setDismissSuggestions(false);
      }
    }
  };

  const handleSelectPlan = (plan: DataPlan) => {
    setSelectedPlan(plan);
    setAmount(plan.price.toString());
    setError(null);
  };

  const handleReview = () => {
    setError(null);

    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter a valid 11-digit phone number.');
      return;
    }

    // Strict validation: Notify user if selected network mismatches phone prefix
    if (detectedNetwork && detectedNetwork !== network) {
      setError(
        `${cleanPhone} is a ${detectedNetwork} number, but you selected ${network}. Please switch to ${detectedNetwork} or enter an ${network} number.`
      );
      return;
    }

    const numAmount = category === 'data' ? (selectedPlan?.price ?? 0) : Number(amount);
    if (!numAmount || numAmount < 50) {
      setError(
        category === 'data' ? 'Please select a data bundle plan.' : 'Minimum airtime recharge is ₦50.'
      );
      return;
    }

    const currentBalance = Number(wallet?.balance ?? 0);
    if (currentBalance < numAmount) {
      setError(
        `Insufficient Naira wallet balance. You have ${formatNaira(currentBalance)}, but need ${formatNaira(numAmount)}.`
      );
      return;
    }

    const isAirtime = category === 'airtime';
    const planName = selectedPlan?.name;

    // Register pending transaction for PIN authorization
    setPendingAction({
      title: isAirtime ? `Confirm ${network} Airtime` : `Confirm ${network} Data`,
      amountLabel: formatNaira(numAmount),
      subtitle: isAirtime
        ? `Recharge to ${cleanPhone}`
        : `${planName ?? 'Data Bundle'} · ${cleanPhone}`,
      run: async (pin) => {
        const tx = await purchaseBill({
          category,
          network,
          phone: cleanPhone,
          amount: numAmount,
          plan_name: planName,
          variation_code: selectedPlan?.variationCode,
          pin,
        });

        // Automatically cache number and network locally
        try {
          await saveAirtimeBeneficiary(cleanPhone, network);
        } catch {
          // Storage failure is non-blocking
        }

        return tx;
      },
    });

    onClose();
    router.push('/security/confirm-pin');
  };

  // Determine active plans for current network: prefer live backend plans, fallback to presets
  const currentNetworkPlans =
    backendPlans[network]?.length > 0 ? backendPlans[network] : DATA_PLANS[network] || [];

  // Plan counts for period tabs (All, Daily, Weekly, Monthly)
  const planCounts = useMemo(() => {
    let daily = 0;
    let weekly = 0;
    let monthly = 0;
    for (const p of currentNetworkPlans) {
      if (p.period === 'daily') {
        daily++;
      } else if (p.period === 'weekly') {
        weekly++;
      } else if (p.period === 'monthly') {
        monthly++;
      } else {
        const val = (p.validity + ' ' + p.name).toLowerCase();
        if (
          val.includes('day') &&
          !val.includes('7') &&
          !val.includes('14') &&
          !val.includes('30')
        ) {
          daily++;
        } else if (val.includes('week') || val.includes('7') || val.includes('14')) {
          weekly++;
        } else {
          monthly++;
        }
      }
    }
    return {
      all: currentNetworkPlans.length,
      daily,
      weekly,
      monthly,
    };
  }, [currentNetworkPlans]);

  // Filter plans based on selected validity tab
  const displayedPlans = useMemo(() => {
    if (validityFilter === 'all') return currentNetworkPlans;
    return currentNetworkPlans.filter((p) => {
      if (p.period) {
        return p.period === validityFilter;
      }
      const val = (p.validity + ' ' + p.name).toLowerCase();
      if (validityFilter === 'daily') {
        return (
          val.includes('day') &&
          !val.includes('7') &&
          !val.includes('14') &&
          !val.includes('30')
        );
      }
      if (validityFilter === 'weekly') {
        return val.includes('week') || val.includes('7') || val.includes('14');
      }
      if (validityFilter === 'monthly') {
        return val.includes('month') || val.includes('30');
      }
      return true;
    });
  }, [currentNetworkPlans, validityFilter]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Drag Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="flash-outline" size={24} color={colors.mintDark} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Pay Bills</Text>
                <Text style={styles.headerSubtitle}>Instant Airtime & Mobile Data</Text>
              </View>
            </View>

            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={colors.inkMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {/* Quick Link to Full Pay Bills Hub */}
            <Pressable
              onPress={() => {
                onClose();
                router.push('/bills');
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: `${colors.navy}08`,
                borderWidth: 1,
                borderColor: `${colors.navy}15`,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 14,
                marginBottom: 14,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: colors.navy,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="apps" size={17} color={colors.white} />
                </View>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.navy }}>
                    Explore All Bill Services
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '500', color: colors.inkMuted }}>
                    Electricity, Betting, Cable TV & Flights
                  </Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={16} color={colors.navy} />
            </Pressable>

            {/* Category Toggle: Airtime vs Data */}
            <View style={styles.sectionMargin}>
              <SegmentedControl
                options={[
                  { value: 'airtime', label: 'Airtime' },
                  { value: 'data', label: 'Mobile Data' },
                ]}
                value={category}
                onChange={(next) => {
                  setCategory(next);
                  setAmount('');
                  setSelectedPlan(null);
                  setError(null);
                }}
              />
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={17} color={colors.red} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Network Provider Selector */}
            <Text style={styles.sectionLabel}>Select Network</Text>
            <View style={styles.networkRow}>
              {NETWORKS.map((n) => {
                const isSelected = n.key === network;
                return (
                  <Pressable
                    key={n.key}
                    onPress={() => {
                      setNetwork(n.key);
                      setSelectedPlan(null);
                      if (category === 'data') setAmount('');
                      setValidityFilter('all');
                    }}
                    style={[
                      styles.networkBtn,
                      isSelected ? styles.networkBtnActive : styles.networkBtnInactive,
                    ]}
                  >
                    <View style={[styles.networkBadge, { backgroundColor: n.bg }]}>
                      <Text style={[styles.networkBadgeText, { color: n.text }]}>
                        {n.name[0]}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.networkBtnText,
                        isSelected ? styles.networkBtnTextActive : styles.networkBtnTextInactive,
                      ]}
                    >
                      {n.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Phone Number Input */}
            <View style={[styles.inputCard, isNetworkMismatch && styles.inputCardWarning]}>
              <View style={styles.inputCardHeader}>
                <Text style={styles.sectionLabel}>Phone Number</Text>
                <View style={styles.headerRightActions}>
                  {detectedNetwork && !isNetworkMismatch ? (
                    <View style={styles.matchBadge}>
                      <Ionicons name="checkmark-circle" size={13} color="#059669" />
                      <Text style={styles.matchBadgeText}>{detectedNetwork}</Text>
                    </View>
                  ) : null}
                  <Pressable onPress={handlePastePhone} style={styles.pasteBtn}>
                    <Text style={styles.pasteBtnText}>Paste</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.phoneInputRow}>
                <Ionicons
                  name="call-outline"
                  size={17}
                  color={isNetworkMismatch ? '#D97706' : colors.inkMuted}
                />
                <TextInput
                  value={phone}
                  onChangeText={(val) => {
                    setPhone(val);
                    setError(null);
                    setDismissSuggestions(false);
                  }}
                  placeholder="e.g. 08012345678"
                  placeholderTextColor={colors.inkMuted}
                  keyboardType="phone-pad"
                  maxLength={11}
                  style={styles.phoneInput}
                />
                {phone.length > 0 ? (
                  <Pressable
                    onPress={() => {
                      setPhone('');
                      setError(null);
                      setDismissSuggestions(false);
                    }}
                    hitSlop={8}
                    style={styles.clearPhoneBtn}
                  >
                    <Ionicons name="close-circle" size={17} color={colors.inkMuted} />
                  </Pressable>
                ) : null}
              </View>

              {/* Predictive Autocomplete Suggestions on 4+ Digits */}
              {matchingBeneficiaries.length > 0 ? (
                <View style={styles.suggestionsBox}>
                  <View style={styles.suggestionsHeader}>
                    <View style={styles.suggestionsTitleRow}>
                      <Ionicons name="sparkles" size={13} color={colors.navy} />
                      <Text style={styles.suggestionsTitle}>
                        Suggested Numbers ({matchingBeneficiaries.length})
                      </Text>
                    </View>
                    <Pressable onPress={() => setDismissSuggestions(true)} hitSlop={8}>
                      <Text style={styles.suggestionsDismissText}>Hide</Text>
                    </Pressable>
                  </View>

                  {matchingBeneficiaries.slice(0, 4).map((b) => {
                    const netColor = NETWORK_COLORS[b.network] || { bg: '#12306E', text: '#FFFFFF' };
                    return (
                      <Pressable
                        key={b.phone}
                        onPress={() => handleSelectBeneficiary(b)}
                        style={styles.suggestionRow}
                      >
                        <View style={styles.suggestionRowLeft}>
                          <View style={[styles.suggestionBadge, { backgroundColor: netColor.bg }]}>
                            <Text style={[styles.suggestionBadgeText, { color: netColor.text }]}>
                              {b.network}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.suggestionPhone}>{formatPhoneNumber(b.phone)}</Text>
                            <Text style={styles.suggestionMeta}>
                              {b.name ? `${b.name} · ` : ''}
                              {b.useCount} {b.useCount === 1 ? 'recharge' : 'recharges'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.suggestionRowRight}>
                          <View style={styles.suggestionActionPill}>
                            <Text style={styles.suggestionActionText}>Autofill</Text>
                            <Ionicons name="arrow-forward" size={11} color={colors.navy} />
                          </View>
                          <Pressable
                            onPress={(e) => handleDeleteBeneficiary(b.phone, e)}
                            hitSlop={10}
                            style={styles.suggestionDeleteBtn}
                          >
                            <Ionicons name="trash-outline" size={15} color={colors.inkMuted} />
                          </Pressable>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {/* Recent Numbers Quick Row when input is empty */}
              {cleanPhone.length === 0 && cachedBeneficiaries.length > 0 ? (
                <View style={styles.recentsContainer}>
                  <View style={styles.recentsHeader}>
                    <Text style={styles.recentsTitle}>Recent Numbers</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.recentsScroll}
                    contentContainerStyle={styles.recentsScrollContent}
                  >
                    {cachedBeneficiaries.slice(0, 6).map((b) => {
                      const netColor = NETWORK_COLORS[b.network] || { bg: '#12306E', text: '#FFFFFF' };
                      return (
                        <Pressable
                          key={b.phone}
                          onPress={() => handleSelectBeneficiary(b)}
                          style={styles.recentChip}
                        >
                          <View style={[styles.recentChipBadge, { backgroundColor: netColor.bg }]}>
                            <Text style={[styles.recentChipBadgeText, { color: netColor.text }]}>
                              {b.network}
                            </Text>
                          </View>
                          <Text style={styles.recentChipPhone}>{formatPhoneNumber(b.phone)}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              {/* Strict Network Mismatch Notification */}
              {isNetworkMismatch && detectedNetwork ? (
                <View style={styles.warningBox}>
                  <View style={styles.warningHeader}>
                    <Ionicons name="warning" size={16} color="#D97706" />
                    <Text style={styles.warningTitle}>Network Mismatch</Text>
                  </View>
                  <Text style={styles.warningText}>
                    <Text style={styles.warningHighlight}>{phone}</Text> is a{' '}
                    <Text style={styles.warningBold}>{detectedNetwork}</Text> number, but you selected{' '}
                    <Text style={styles.warningBold}>{network}</Text>.
                  </Text>
                  <Pressable
                    onPress={() => {
                      setNetwork(detectedNetwork);
                      setSelectedPlan(null);
                      if (category === 'data') setAmount('');
                      setError(null);
                    }}
                    style={styles.switchBtn}
                  >
                    <Ionicons name="swap-horizontal" size={14} color="#FFFFFF" />
                    <Text style={styles.switchBtnText}>Switch to {detectedNetwork}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {/* Airtime Specific: Amount Input & Presets */}
            {category === 'airtime' ? (
              <View style={styles.inputCard}>
                <Text style={styles.sectionLabel}>Amount</Text>
                <View style={styles.amountInputRow}>
                  <Text style={styles.currencySymbol}>₦</Text>
                  <TextInput
                    value={amount}
                    onChangeText={(val) => {
                      setAmount(val);
                      setError(null);
                    }}
                    placeholder="0"
                    placeholderTextColor={colors.inkMuted}
                    keyboardType="numeric"
                    style={styles.amountInput}
                  />
                </View>

                {/* Amount Presets */}
                <View style={styles.presetsRow}>
                  {AIRTIME_PRESETS.map((p) => {
                    const active = amount === p.toString();
                    return (
                      <Pressable
                        key={p}
                        onPress={() => {
                          setAmount(p.toString());
                          setError(null);
                        }}
                        style={[
                          styles.presetBtn,
                          active ? styles.presetBtnActive : styles.presetBtnInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.presetBtnText,
                            active ? styles.presetBtnTextActive : styles.presetBtnTextInactive,
                          ]}
                        >
                          ₦{p}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              /* Data Bundle Specific: Live Plans with Validity Tabs (Daily, Weekly, Monthly) */
              <View style={styles.dataSection}>
                <View style={styles.dataSectionHeader}>
                  <Text style={styles.dataSectionLabel}>
                    Choose {network} Data Plan
                  </Text>
                  {loadingPlans ? (
                    <ActivityIndicator size="small" color={colors.navy} />
                  ) : null}
                </View>

                {/* Validity Period Selector Tabs (All, Daily, Weekly, Monthly) */}
                <View style={styles.validityTabsRow}>
                  {(
                    [
                      { key: 'all', label: 'All', count: planCounts.all },
                      { key: 'daily', label: 'Daily', count: planCounts.daily },
                      { key: 'weekly', label: 'Weekly', count: planCounts.weekly },
                      { key: 'monthly', label: 'Monthly', count: planCounts.monthly },
                    ] as const
                  ).map((tab) => {
                    const active = validityFilter === tab.key;
                    return (
                      <Pressable
                        key={tab.key}
                        onPress={() => setValidityFilter(tab.key)}
                        style={[
                          styles.validityTab,
                          active ? styles.validityTabActive : styles.validityTabInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.validityTabText,
                            active ? styles.validityTabTextActive : styles.validityTabTextInactive,
                          ]}
                        >
                          {tab.label}
                        </Text>
                        {tab.count > 0 ? (
                          <View
                            style={[
                              styles.validityTabBadge,
                              active ? styles.validityTabBadgeActive : styles.validityTabBadgeInactive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.validityTabBadgeText,
                                active ? styles.validityTabBadgeTextActive : styles.validityTabBadgeTextInactive,
                              ]}
                            >
                              {tab.count}
                            </Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>

                {/* Plans List */}
                <View style={styles.plansContainer}>
                  {displayedPlans.map((p) => {
                    const isSelected =
                      selectedPlan?.variationCode === p.variationCode || selectedPlan?.id === p.id;
                    return (
                      <Pressable
                        key={p.id + '-' + p.variationCode}
                        onPress={() => handleSelectPlan(p)}
                        style={[
                          styles.planCard,
                          isSelected ? styles.planCardActive : styles.planCardInactive,
                        ]}
                      >
                        <View style={styles.planLeft}>
                          <View
                            style={[
                              styles.planIconContainer,
                              isSelected ? styles.planIconActive : styles.planIconInactive,
                            ]}
                          >
                            <Ionicons
                              name="wifi-outline"
                              size={17}
                              color={isSelected ? colors.white : colors.navy}
                            />
                          </View>
                          <View style={styles.planInfoColumn}>
                            <View style={styles.planDataRow}>
                              <Text style={styles.planDataText}>{p.data}</Text>
                              {p.plantype ? (
                                <View style={styles.planTypePill}>
                                  <Text style={styles.planTypePillText}>{p.plantype}</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={styles.planValidityText}>
                              Valid {p.validity}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.planRight}>
                          <Text style={styles.planPriceText}>{formatNaira(p.price)}</Text>
                          <View
                            style={[
                              styles.radioCircle,
                              isSelected ? styles.radioActive : styles.radioInactive,
                            ]}
                          >
                            {isSelected && (
                              <Ionicons name="checkmark" size={12} color={colors.white} />
                            )}
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}

                  {displayedPlans.length === 0 && !loadingPlans ? (
                    <View style={styles.emptyPlansBox}>
                      <Ionicons name="information-circle-outline" size={20} color={colors.inkMuted} />
                      <Text style={styles.emptyPlansText}>
                        No {validityFilter === 'all' ? '' : validityFilter} data plans found for {network}.
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            )}

            {/* Wallet Balance Pill */}
            <View style={styles.balancePill}>
              <Text style={styles.balancePillLabel}>Paying from Naira Wallet</Text>
              <Text style={styles.balancePillValue}>
                {formatNaira(wallet?.balance ?? 0)} available
              </Text>
            </View>

            {/* Pay Button */}
            <View style={styles.payBtnContainer}>
              <Button
                title={
                  amount && Number(amount) > 0
                    ? `Pay ${formatNaira(Number(amount))} for ${
                        category === 'data' ? 'Data' : 'Airtime'
                      }`
                    : `Pay for ${category === 'data' ? 'Data' : 'Airtime'}`
                }
                onPress={handleReview}
              />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8, 18, 46, 0.65)',
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  handle: {
    height: 4,
    width: 44,
    borderRadius: 2,
    backgroundColor: colors.lineInput,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    color: colors.ink,
  },
  headerSubtitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: colors.inkMid,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    marginTop: 16,
  },
  sectionMargin: {
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: colors.red,
  },
  sectionLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.inkMuted,
  },
  networkRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  networkBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 12,
  },
  networkBtnActive: {
    borderColor: colors.navy,
    backgroundColor: colors.navy,
  },
  networkBtnInactive: {
    borderColor: colors.lineInput,
    backgroundColor: colors.page,
  },
  networkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  networkBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
  },
  networkBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
  },
  networkBtnTextActive: {
    color: colors.white,
  },
  networkBtnTextInactive: {
    color: colors.ink,
  },
  inputCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineInput,
    backgroundColor: colors.page,
    padding: 14,
  },
  inputCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pasteBtn: {
    backgroundColor: colors.chip,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pasteBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10.5,
    color: colors.navy,
  },
  phoneInputRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneInput: {
    flex: 1,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 0,
  },
  clearPhoneBtn: {
    padding: 2,
  },
  inputCardWarning: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFDF5',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  matchBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10.5,
    color: '#059669',
  },

  // Recent numbers chip row
  recentsContainer: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  recentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recentsTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.inkMuted,
  },
  recentsScroll: {
    flexDirection: 'row',
  },
  recentsScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineInput,
  },
  recentChipBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  recentChipBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 8.5,
    letterSpacing: 0.3,
  },
  recentChipPhone: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11.5,
    color: colors.ink,
  },

  // Predictive autocomplete suggestions box
  suggestionsBox: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D0DCF2',
    overflow: 'hidden',
    shadowColor: '#0E2050',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F3F6FD',
    borderBottomWidth: 1,
    borderBottomColor: '#E2EAF8',
  },
  suggestionsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  suggestionsTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: colors.navy,
  },
  suggestionsDismissText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: colors.inkMuted,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4FA',
  },
  suggestionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  suggestionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 42,
  },
  suggestionBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9.5,
    letterSpacing: 0.3,
  },
  suggestionPhone: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: colors.ink,
  },
  suggestionMeta: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 1,
  },
  suggestionRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  suggestionActionText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10.5,
    color: colors.navy,
  },
  suggestionDeleteBtn: {
    padding: 3,
  },
  warningBox: {
    marginTop: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  warningTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: '#92400E',
  },
  warningText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
  },
  warningHighlight: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#78350F',
  },
  warningBold: {
    fontFamily: 'Manrope_800ExtraBold',
    color: '#92400E',
  },
  switchBtn: {
    marginTop: 10,
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  switchBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  amountInputRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
    color: colors.ink,
  },
  amountInput: {
    flex: 1,
    marginLeft: 4,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
    color: colors.ink,
    paddingVertical: 0,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  presetBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 8,
  },
  presetBtnActive: {
    backgroundColor: colors.navy,
  },
  presetBtnInactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineInput,
  },
  presetBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11.5,
  },
  presetBtnTextActive: {
    color: colors.white,
  },
  presetBtnTextInactive: {
    color: colors.ink,
  },
  dataSection: {
    marginTop: 16,
  },
  dataSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dataSectionLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.inkMuted,
  },

  // Validity tabs
  validityTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  validityTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  validityTabActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  validityTabInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.lineInput,
  },
  validityTabText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
  },
  validityTabTextActive: {
    color: colors.white,
  },
  validityTabTextInactive: {
    color: colors.inkMid,
  },
  validityTabBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  validityTabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  validityTabBadgeInactive: {
    backgroundColor: colors.chip,
  },
  validityTabBadgeText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 9,
  },
  validityTabBadgeTextActive: {
    color: colors.white,
  },
  validityTabBadgeTextInactive: {
    color: colors.navy,
  },

  planInfoColumn: {
    flex: 1,
  },
  planDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planTypePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#BFDBFE',
  },
  planTypePillText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 8.5,
    color: '#1D4ED8',
    textTransform: 'uppercase',
  },
  emptyPlansBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 24,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lineInput,
  },
  emptyPlansText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: colors.inkMuted,
  },
  plansContainer: {
    gap: 10,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  planCardActive: {
    borderColor: colors.navy,
    backgroundColor: '#F0F4FC',
  },
  planCardInactive: {
    borderColor: colors.lineInput,
    backgroundColor: colors.page,
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  planIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  planIconActive: {
    backgroundColor: colors.navy,
  },
  planIconInactive: {
    backgroundColor: colors.chip,
  },
  planDataText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: colors.ink,
  },
  planValidityText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: colors.inkSoft,
    marginTop: 1,
  },
  planRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  planPriceText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14.5,
    color: colors.ink,
    textAlign: 'right',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioActive: {
    borderColor: colors.navy,
    backgroundColor: colors.navy,
  },
  radioInactive: {
    borderColor: colors.lineInput,
    backgroundColor: colors.surface,
  },
  balancePill: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    backgroundColor: '#EEF2FB',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  balancePillLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: colors.inkMuted,
  },
  balancePillValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    color: colors.navy,
  },
  payBtnContainer: {
    marginTop: 20,
    paddingBottom: 8,
  },
});
