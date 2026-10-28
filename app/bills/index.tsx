import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import {
  purchaseBill,
  detectNigerianNetwork,
  getBillPlans,
  getElectricityProviders,
  verifyElectricityMeter,
  getBettingBillers,
  verifyBettingAccount,
  getCablePlans,
  verifyCableSmartcard,
  type NetworkProvider,
  type ElectricityProviderItem,
  type CablePlanItem,
} from '@/api/bills';
import {
  getAirtimeBeneficiaries,
  saveAirtimeBeneficiary,
  removeAirtimeBeneficiary,
  type AirtimeBeneficiary,
} from '@/api/airtimeBeneficiaries';
import {
  listBeneficiaries,
  saveBeneficiary,
  deleteBeneficiary,
} from '@/api/beneficiaries';
import type { Beneficiary } from '@/types';
import { useAuth, useWallet } from '@/context';
import { setPendingAction } from '@/lib/pendingAction';
import { colors } from '@/theme';
import { formatNaira } from '@/utils/format';
import { NETWORK_LOGOS, CABLE_LOGOS } from '@/constants/networkAssets';
import { pickContactPhoneNumber } from '@/utils/contacts';

// ----------------------------------------------------
// Category Definitions
// ----------------------------------------------------
export type BillCategory = 'electricity' | 'betting' | 'cable' | 'flight' | 'airtime' | 'data';

interface CategoryTab {
  key: BillCategory;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
  color: string;
}

const CATEGORY_TABS: CategoryTab[] = [
  {
    key: 'airtime',
    title: 'Airtime',
    subtitle: 'Instant Top-up',
    icon: 'call',
    color: '#0EA5E9',
  },
  {
    key: 'data',
    title: 'Data',
    subtitle: 'Internet Bundles',
    icon: 'wifi',
    color: '#6366F1',
  },
  {
    key: 'electricity',
    title: 'Electricity',
    subtitle: 'Power & Meters',
    icon: 'flash',
    color: '#F59E0B',
  },
  {
    key: 'betting',
    title: 'Betting',
    subtitle: 'Wallet Top-up',
    icon: 'football',
    color: '#10B981',
  },
  {
    key: 'cable',
    title: 'Cable TV',
    subtitle: 'Decoder Sub',
    icon: 'tv',
    color: '#3B82F6',
  },
  {
    key: 'flight',
    title: 'Flight',
    subtitle: 'Airlines & Travel',
    icon: 'airplane',
    badge: 'COMING SOON',
    color: '#8B5CF6',
  },
];

// Clean trailing price pattern from raw provider plan names (e.g. "DStv Padi N4,400" -> "DStv Padi")
export function cleanBouquetName(name: string): string {
  if (!name) return '';
  return name
    .replace(/\s*[-–—:]?\s*(?:N|₦|NGN)\s*[\d,]+(?:\.\d+)?\s*$/i, '')
    .trim();
}

// ----------------------------------------------------
// Electricity Providers & Data
// ----------------------------------------------------
interface DiscoProvider {
  code: string;
  name: string;
  shortCode: string;
  fullName: string;
  color: string;
}

const DISCOS: DiscoProvider[] = [
  { code: 'ikeja-electric', shortCode: 'IKEDC', name: 'Ikeja Electric', fullName: 'Ikeja Electric (IKEDC)', color: '#EF4444' },
  { code: 'eko-electric', shortCode: 'EKEDC', name: 'Eko Electric', fullName: 'Eko Electricity Distribution (EKEDC)', color: '#3B82F6' },
  { code: 'abuja-electric', shortCode: 'AEDC', name: 'Abuja Electric', fullName: 'Abuja Electricity Distribution (AEDC)', color: '#10B981' },
  { code: 'ibadan-electric', shortCode: 'IBEDC', name: 'Ibadan Electric', fullName: 'Ibadan Electricity Distribution (IBEDC)', color: '#F59E0B' },
  { code: 'enugu-electric', shortCode: 'EEDC', name: 'Enugu Electric', fullName: 'Enugu Electricity Distribution (EEDC)', color: '#8B5CF6' },
  { code: 'kano-electric', shortCode: 'KEDCO', name: 'Kano Electric', fullName: 'Kano Electricity Distribution (KEDCO)', color: '#059669' },
  { code: 'portharcourt-electric', shortCode: 'PHED', name: 'Port Harcourt', fullName: 'Port Harcourt Electricity (PHED)', color: '#D97706' },
  { code: 'jos-electric', shortCode: 'JED', name: 'Jos Electric', fullName: 'Jos Electricity Distribution (JED)', color: '#8B5CF6' },
  { code: 'kaduna-electric', shortCode: 'KAEDCO', name: 'Kaduna Electric', fullName: 'Kaduna Electricity Distribution (KAEDCO)', color: '#059669' },
  { code: 'benin-electric', shortCode: 'BEDC', name: 'Benin Electric', fullName: 'Benin Electricity Distribution (BEDC)', color: '#2563EB' },
];

const ELECTRICITY_PRESETS = [1000, 2000, 5000, 10000, 20000, 50000];

// ----------------------------------------------------
// Betting Platforms & Data
// ----------------------------------------------------
interface BettingPlatform {
  code: string;
  name: string;
  color: string;
  minAmount: number;
  maxAmount?: number;
}


const BETTING_PLATFORMS: BettingPlatform[] = [
  { code: 'biller-sporty-bet', name: 'SportyBet', color: '#DC2626', minAmount: 100, maxAmount: 100000 },
  { code: 'BET9JA', name: 'Bet9ja', color: '#15803D', minAmount: 100, maxAmount: 100000 },
  { code: 'biller-1x-bet', name: '1xBet', color: '#1D4ED8', minAmount: 100 },
  { code: 'biller-bet-way', name: 'BetWay', color: '#0F172A', minAmount: 100 },
  { code: 'biller-bet-king', name: 'BetKing', color: '#7C3AED', minAmount: 100, maxAmount: 100000 },
  { code: 'biller-bang-bet', name: 'BangBet', color: '#B45309', minAmount: 100 },
  { code: 'biller-merry-bet', name: 'MerryBet', color: '#CA8A04', minAmount: 100 },
  { code: 'biller-nairabet', name: 'Nairabet', color: '#047857', minAmount: 100 },
  { code: 'biller-m-sport', name: 'MSport', color: '#EA580C', minAmount: 100 },
];

// Non-bookmaker billers returned by Bigisub's betting endpoint (game top-ups)
const NON_BETTING_BILLERS = ['biller-ff-dtu', 'biller-pubg-m-uc', 'biller-steam-us'];
const BETTING_FALLBACK_COLORS = ['#0EA5E9', '#14B8A6', '#F43F5E', '#8B5CF6', '#22C55E', '#F97316'];

const BETTING_PRESETS = [500, 1000, 2000, 5000, 10000, 25000];

// ----------------------------------------------------
// Cable TV Providers & Bouquets
// ----------------------------------------------------
interface CableBouquet {
  id: string;
  name: string;
  price: number;
}

interface CableProvider {
  code: string;
  name: string;
  color: string;
  bouquets: CableBouquet[];
}

const CABLE_PROVIDERS: CableProvider[] = [
  {
    code: 'dstv',
    name: 'DSTV',
    color: '#0284C7',
    bouquets: [
      { id: 'dstv-padi', name: 'DStv Padi', price: 3600 },
      { id: 'dstv-yanga', name: 'DStv Yanga', price: 5100 },
      { id: 'dstv-confam', name: 'DStv Confam', price: 9300 },
      { id: 'dstv-compact', name: 'DStv Compact', price: 15700 },
      { id: 'dstv-compact-plus', name: 'DStv Compact Plus', price: 25000 },
      { id: 'dstv-premium', name: 'DStv Premium', price: 37000 },
    ],
  },
  {
    code: 'gotv',
    name: 'GOtv',
    color: '#059669',
    bouquets: [
      { id: 'gotv-jinja', name: 'GOtv Jinja', price: 3300 },
      { id: 'gotv-jolli', name: 'GOtv Jolli', price: 4850 },
      { id: 'gotv-max', name: 'GOtv Max', price: 7200 },
      { id: 'gotv-supa', name: 'GOtv Supa', price: 9600 },
      { id: 'gotv-supa-plus', name: 'GOtv Supa+', price: 15700 },
    ],
  },
  {
    code: 'startimes',
    name: 'StarTimes',
    color: '#EA580C',
    bouquets: [
      { id: 'startimes-nova', name: 'Nova Bouquet', price: 1900 },
      { id: 'startimes-basic', name: 'Basic Bouquet', price: 3300 },
      { id: 'startimes-smart', name: 'Smart Bouquet', price: 4200 },
      { id: 'startimes-classic', name: 'Classic Bouquet', price: 5500 },
      { id: 'startimes-super', name: 'Super Bouquet', price: 9000 },
    ],
  },
  {
    code: 'showmax',
    name: 'Showmax',
    color: '#DB2777',
    bouquets: [
      { id: 'showmax-ent', name: 'Entertainment Mobile', price: 1600 },
      { id: 'showmax-pl', name: 'Premier League Mobile', price: 2900 },
      { id: 'showmax-all', name: 'All Inclusive (Ent + PL)', price: 4000 },
    ],
  },
];

// ----------------------------------------------------
// Airtime & Data Network Constants
// ----------------------------------------------------
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

const AIRTIME_PRESETS = [100, 200, 500, 1000, 2000, 5000];

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

const FALLBACK_DATA_PLANS: Record<NetworkProvider, DataPlan[]> = {
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

function formatPhoneNumber(num: string): string {
  const digits = num.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return num;
}

// ----------------------------------------------------
// Main Pay Bills Screen Component
// ----------------------------------------------------
export default function PayBillsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: BillCategory }>();
  const { user } = useAuth();
  const { wallet } = useWallet();

  // Active Category State
  const [activeCategory, setActiveCategory] = useState<BillCategory>(
    params.category && params.category !== 'flight' ? params.category : 'electricity'
  );
  const [error, setError] = useState<string | null>(null);

  // Flight Coming Soon Modal State
  const [flightModalVisible, setFlightModalVisible] = useState(params.category === 'flight');
  const [flightWaitlistJoined, setFlightWaitlistJoined] = useState(false);

  useEffect(() => {
    if (params.category) {
      if (params.category === 'flight') {
        setFlightModalVisible(true);
      } else {
        setFlightModalVisible(false);
        setActiveCategory(params.category);
      }
    }
  }, [params.category]);

  // --------------------------------------------------
  // 1. Electricity State
  // --------------------------------------------------
  const [selectedDisco, setSelectedDisco] = useState<DiscoProvider>(DISCOS[0]);
  const [meterType, setMeterType] = useState<'prepaid' | 'postpaid'>('prepaid');
  const [meterNumber, setMeterNumber] = useState('');
  const [electricityAmount, setElectricityAmount] = useState('');
  const [verifyingMeter, setVerifyingMeter] = useState(false);
  const [meterError, setMeterError] = useState<string | null>(null);
  const [verifiedMeterInfo, setVerifiedMeterInfo] = useState<{
    name: string;
    address: string;
    tariff: string;
  } | null>(null);

  // Standard Electricity Beneficiary State
  const [electricityBeneficiaries, setElectricityBeneficiaries] = useState<Beneficiary[]>([]);
  const [loadingElectricityBeneficiaries, setLoadingElectricityBeneficiaries] = useState(false);
  const [saveAsBeneficiary, setSaveAsBeneficiary] = useState(true);
  const [beneficiaryNickname, setBeneficiaryNickname] = useState('');
  const [showBeneficiariesModal, setShowBeneficiariesModal] = useState(false);
  const [beneficiarySearchQuery, setBeneficiarySearchQuery] = useState('');

  const loadElectricityBeneficiaries = useCallback(async () => {
    try {
      setLoadingElectricityBeneficiaries(true);
      const list = await listBeneficiaries('electricity');
      setElectricityBeneficiaries(list);
    } catch {
      // Fallback handled inside API helper
    } finally {
      setLoadingElectricityBeneficiaries(false);
    }
  }, []);

  useEffect(() => {
    if (activeCategory === 'electricity') {
      void loadElectricityBeneficiaries();
    }
  }, [activeCategory, loadElectricityBeneficiaries]);

  const handleSelectElectricityBeneficiary = (b: Beneficiary) => {
    // 1. Match DISCO
    const match = DISCOS.find(
      (d) =>
        d.code.toLowerCase() === (b.bank_code || '').toLowerCase() ||
        d.name.toLowerCase() === (b.bank_name || '').toLowerCase() ||
        d.shortCode.toLowerCase() === (b.bank_name || '').toLowerCase()
    );
    if (match) {
      setSelectedDisco(match);
    }

    // 2. Set meter type
    if (b.meter_type === 'prepaid' || b.meter_type === 'postpaid') {
      setMeterType(b.meter_type);
    }

    // 3. Set meter number
    const cleanMeter = (b.account_number || '').replace(/\D/g, '');
    setMeterNumber(cleanMeter);

    // 4. Pre-fill verified customer name immediately
    if (b.name) {
      setVerifiedMeterInfo({
        name: b.name,
        address: 'Saved Beneficiary Address',
        tariff: b.meter_type === 'prepaid' ? 'Prepaid Meter' : 'Postpaid Meter',
      });
      setMeterError(null);
    }

    // 5. Pre-fill nickname
    if (b.nickname) {
      setBeneficiaryNickname(b.nickname);
    }

    setShowBeneficiariesModal(false);
  };

  // Live meter verification via Bigisub API
  useEffect(() => {
    const clean = meterNumber.replace(/\D/g, '');
    if (clean.length < 9) {
      setVerifiedMeterInfo(null);
      setMeterError(null);
      setVerifyingMeter(false);
      return;
    }

    let isCurrent = true;
    setVerifyingMeter(true);
    setMeterError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await verifyElectricityMeter(selectedDisco.code, clean, meterType);
        if (!isCurrent) return;
        if (res?.success) {
          setVerifiedMeterInfo({
            name: res.name || 'Verified Customer',
            address: res.address || 'Registered Customer Address',
            tariff: res.tariff || (meterType === 'prepaid' ? 'Band A / MD' : 'Postpaid Tariff'),
          });
          setMeterError(null);
        } else {
          setVerifiedMeterInfo(null);
          setMeterError(res?.message || 'Meter verification failed. Check meter number & DISCO.');
        }
      } catch (err: any) {
        if (!isCurrent) return;
        const msg = err?.response?.data?.message || err?.message || 'Unable to verify meter number.';
        setVerifiedMeterInfo(null);
        setMeterError(msg);
      } finally {
        if (isCurrent) setVerifyingMeter(false);
      }
    }, 600);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [meterNumber, selectedDisco.code, meterType]);

  // --------------------------------------------------
  // 2. Betting State
  // --------------------------------------------------
  const [bettingPlatforms, setBettingPlatforms] = useState<BettingPlatform[]>(BETTING_PLATFORMS);
  const [selectedBetting, setSelectedBetting] = useState<BettingPlatform>(BETTING_PLATFORMS[0]);
  const [bettingUserId, setBettingUserId] = useState('');
  const [bettingAmount, setBettingAmount] = useState('');
  const [verifyingBetting, setVerifyingBetting] = useState(false);
  const [verifiedBettingUser, setVerifiedBettingUser] = useState<string | null>(null);
  const [bettingVerifyError, setBettingVerifyError] = useState<string | null>(null);
  const [bettingBeneficiaries, setBettingBeneficiaries] = useState<Beneficiary[]>([]);
  const [saveBettingBeneficiary, setSaveBettingBeneficiary] = useState(true);
  const [bettingBeneficiaryNickname, setBettingBeneficiaryNickname] = useState('');

  // Load saved betting beneficiaries
  const loadBettingBeneficiaries = useCallback(async () => {
    try {
      const list = await listBeneficiaries('betting');
      setBettingBeneficiaries(list);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (activeCategory === 'betting') {
      void loadBettingBeneficiaries();
    }
  }, [activeCategory, loadBettingBeneficiaries]);

  const handleSelectBettingBeneficiary = (b: Beneficiary) => {
    if (b.account_number) {
      setBettingUserId(b.account_number);
    }
    const match = bettingPlatforms.find(
      (p) =>
        p.code.toLowerCase() === (b.bank_code || '').toLowerCase() ||
        p.name.toLowerCase() === (b.bank_name || '').toLowerCase()
    );
    if (match) {
      setSelectedBetting(match);
    }
    if (b.name) {
      setVerifiedBettingUser(b.name);
    }
    if (b.nickname) {
      setBettingBeneficiaryNickname(b.nickname);
    }
    setError(null);
    setBettingVerifyError(null);
    setShowBeneficiariesModal(false);
  };

  // Load live bookmaker list from Bigisub (via backend)
  useEffect(() => {
    if (activeCategory !== 'betting') return;
    let isMounted = true;
    getBettingBillers()
      .then((billers) => {
        if (!isMounted || !billers.length) return;
        const known = new Map(BETTING_PLATFORMS.map((p) => [p.code, p]));
        const live: BettingPlatform[] = billers
          .filter((b) => !NON_BETTING_BILLERS.includes(b.code))
          .map((b, i) => ({
            code: b.code,
            name: b.name,
            color: known.get(b.code)?.color ?? BETTING_FALLBACK_COLORS[i % BETTING_FALLBACK_COLORS.length],
            minAmount: Math.max(100, Number(b.min_amount) || 100),
            maxAmount: Number(b.max_amount) || undefined,
          }));
        // Popular bookmakers first, then the rest alphabetically
        const popular = BETTING_PLATFORMS.map((p) => live.find((l) => l.code === p.code)).filter(
          (p): p is BettingPlatform => p !== undefined
        );
        const rest = live
          .filter((l) => !known.has(l.code))
          .sort((a, b) => a.name.localeCompare(b.name));
        const merged = [...popular, ...rest];
        if (merged.length) {
          setBettingPlatforms(merged);
          setSelectedBetting((prev) => merged.find((m) => m.code === prev.code) ?? merged[0]);
        }
      })
      .catch((err) => console.warn('Failed to fetch betting billers:', err));
    return () => {
      isMounted = false;
    };
  }, [activeCategory]);

  // Live account verification with the bookmaker
  useEffect(() => {
    const clean = bettingUserId.trim();
    setVerifiedBettingUser(null);
    setBettingVerifyError(null);

    if (clean.length < 4) {
      setVerifyingBetting(false);
      return;
    }

    let isCurrent = true;
    setVerifyingBetting(true);

    const timer = setTimeout(async () => {
      try {
        const res = await verifyBettingAccount(selectedBetting.code, clean);
        if (!isCurrent) return;
        if (res?.success) {
          setVerifiedBettingUser(res.name || 'Verified Account');
        } else {
          setBettingVerifyError(res?.message || 'Unable to verify this account ID.');
        }
      } catch (err: any) {
        if (!isCurrent) return;
        setBettingVerifyError(
          err?.response?.data?.message || err?.message || 'Unable to verify this account ID.'
        );
      } finally {
        if (isCurrent) setVerifyingBetting(false);
      }
    }, 700);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [bettingUserId, selectedBetting.code]);

  // --------------------------------------------------
  // 3. Cable TV State
  // --------------------------------------------------
  const [selectedCable, setSelectedCable] = useState<CableProvider>(CABLE_PROVIDERS[0]);
  const [smartcardNumber, setSmartcardNumber] = useState('');
  const [selectedBouquet, setSelectedBouquet] = useState<CableBouquet>(CABLE_PROVIDERS[0].bouquets[1]);
  const [cableDuration, setCableDuration] = useState<'1' | '2' | '3' | '12'>('1');
  const [verifyingCable, setVerifyingCable] = useState(false);
  const [verifiedCableOwner, setVerifiedCableOwner] = useState<{
    name: string;
    dueDate: string;
    status: string;
  } | null>(null);
  const [cableVerifyError, setCableVerifyError] = useState<string | null>(null);
  const [cableBeneficiaries, setCableBeneficiaries] = useState<Beneficiary[]>([]);
  const [saveCableBeneficiary, setSaveCableBeneficiary] = useState(true);
  const [cableBeneficiaryNickname, setCableBeneficiaryNickname] = useState('');
  const [liveCablePlans, setLiveCablePlans] = useState<Record<string, CableBouquet[]>>({});
  const [loadingCablePlans, setLoadingCablePlans] = useState(false);

  // Load saved cable beneficiaries
  const loadCableBeneficiaries = useCallback(async () => {
    try {
      const list = await listBeneficiaries('cable');
      setCableBeneficiaries(list);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (activeCategory === 'cable') {
      void loadCableBeneficiaries();
    }
  }, [activeCategory, loadCableBeneficiaries]);

  const handleSelectCableBeneficiary = (b: Beneficiary) => {
    if (b.account_number) {
      setSmartcardNumber(b.account_number);
    }
    const match = CABLE_PROVIDERS.find(
      (p) =>
        p.code.toLowerCase() === (b.bank_code || '').toLowerCase() ||
        p.name.toLowerCase() === (b.bank_name || '').toLowerCase()
    );
    if (match) {
      setSelectedCable(match);
    }
    if (b.name) {
      setVerifiedCableOwner({
        name: b.name,
        dueDate: 'Active',
        status: 'Active',
      });
    }
    if (b.nickname) {
      setCableBeneficiaryNickname(b.nickname);
    }
    setError(null);
    setCableVerifyError(null);
    setShowBeneficiariesModal(false);
  };

  // Fetch live bouquets & plans from Bigisub via backend
  useEffect(() => {
    if (activeCategory !== 'cable') return;
    let isMounted = true;
    setLoadingCablePlans(true);
    getCablePlans()
      .then((res) => {
        if (!isMounted) return;
        if (res.plans && res.plans.length > 0) {
          const grouped: Record<string, CableBouquet[]> = {
            dstv: [],
            gotv: [],
            startimes: [],
            showmax: [],
          };
          res.plans.forEach((p) => {
            const providerKey = p.cable_name?.toLowerCase();
            if (grouped[providerKey]) {
              grouped[providerKey].push({
                id: String(p.id ?? p.variation_code),
                name: p.product_name,
                price: Number(p.amount),
              });
            }
          });
          setLiveCablePlans(grouped);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch live cable plans:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingCablePlans(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeCategory]);

  const currentBouquets = useMemo(() => {
    const live = liveCablePlans[selectedCable.code];
    if (live && live.length > 0) return live;
    return selectedCable.bouquets;
  }, [liveCablePlans, selectedCable]);

  // Update default bouquet when provider switches or live plans load
  useEffect(() => {
    if (currentBouquets.length > 0) {
      const found = currentBouquets.find((b) => b.id === selectedBouquet?.id);
      if (!found) {
        setSelectedBouquet(currentBouquets[0]);
      }
    }
  }, [currentBouquets]);

  const [cablePackageSearch, setCablePackageSearch] = useState('');
  const [showAllCablePackages, setShowAllCablePackages] = useState(false);

  // Reset package search and show-more toggle when provider switches
  useEffect(() => {
    setCablePackageSearch('');
    setShowAllCablePackages(false);
  }, [selectedCable.code]);

  const filteredBouquets = useMemo(() => {
    let list = currentBouquets;
    if (cablePackageSearch.trim()) {
      const q = cablePackageSearch.toLowerCase().trim();
      list = list.filter((b) => b.name.toLowerCase().includes(q));
    }
    return list;
  }, [currentBouquets, cablePackageSearch]);

  const displayedBouquets = useMemo(() => {
    if (cablePackageSearch.trim() || showAllCablePackages || filteredBouquets.length <= 6) {
      return filteredBouquets;
    }
    const top = filteredBouquets.slice(0, 6);
    if (selectedBouquet && !top.some((b) => b.id === selectedBouquet.id)) {
      top.push(selectedBouquet);
    }
    return top;
  }, [filteredBouquets, showAllCablePackages, cablePackageSearch, selectedBouquet]);

  // Live Smartcard / IUC verification via Bigisub
  useEffect(() => {
    const clean = smartcardNumber.replace(/\D/g, '');
    setCableVerifyError(null);

    if (clean.length < 10) {
      setVerifiedCableOwner(null);
      setVerifyingCable(false);
      return;
    }

    let isCurrent = true;
    setVerifyingCable(true);

    const timer = setTimeout(async () => {
      try {
        const res = await verifyCableSmartcard(selectedCable.code, clean);
        if (!isCurrent) return;
        if (res.success && res.name) {
          setVerifiedCableOwner({
            name: res.name,
            dueDate: res.due_date || 'Active Account',
            status: res.status || 'Active · Verified',
          });
          setCableVerifyError(null);
        } else {
          setVerifiedCableOwner(null);
          setCableVerifyError(res?.message || 'Unable to verify smartcard number. Please check and try again.');
        }
      } catch (err: any) {
        if (!isCurrent) return;
        setVerifiedCableOwner(null);
        const serverMsg = err?.response?.data?.message || err?.message;
        setCableVerifyError(serverMsg || 'Smartcard verification failed. Please check the number.');
      } finally {
        if (isCurrent) setVerifyingCable(false);
      }
    }, 700);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [smartcardNumber, selectedCable.code]);

  // --------------------------------------------------
  // Unified Beneficiary Management & Add State
  // --------------------------------------------------
  const [beneficiaryModalTab, setBeneficiaryModalTab] = useState<'electricity' | 'cable' | 'betting'>('electricity');
  const [showAddBeneficiaryModal, setShowAddBeneficiaryModal] = useState(false);
  const [addBeneficiaryCategory, setAddBeneficiaryCategory] = useState<'electricity' | 'cable' | 'betting'>('electricity');
  const [addBeneficiaryDisco, setAddBeneficiaryDisco] = useState<DiscoProvider>(DISCOS[0]);
  const [addBeneficiaryMeterType, setAddBeneficiaryMeterType] = useState<'prepaid' | 'postpaid'>('prepaid');
  const [addBeneficiaryCable, setAddBeneficiaryCable] = useState<CableProvider>(CABLE_PROVIDERS[0]);
  const [addBeneficiaryBetting, setAddBeneficiaryBetting] = useState<BettingPlatform>(BETTING_PLATFORMS[0]);
  const [addBeneficiaryAccountNo, setAddBeneficiaryAccountNo] = useState('');
  const [addBeneficiaryNickname, setAddBeneficiaryNickname] = useState('');
  const [addBeneficiaryVerifiedName, setAddBeneficiaryVerifiedName] = useState<string | null>(null);
  const [verifyingAddBeneficiary, setVerifyingAddBeneficiary] = useState(false);
  const [addBeneficiaryVerifyError, setAddBeneficiaryVerifyError] = useState<string | null>(null);
  const [savingAddBeneficiary, setSavingAddBeneficiary] = useState(false);

  const currentModalBeneficiaries = useMemo(() => {
    if (beneficiaryModalTab === 'electricity') return electricityBeneficiaries;
    if (beneficiaryModalTab === 'cable') return cableBeneficiaries;
    return bettingBeneficiaries;
  }, [beneficiaryModalTab, electricityBeneficiaries, cableBeneficiaries, bettingBeneficiaries]);

  const filteredModalBeneficiaries = useMemo(() => {
    const q = beneficiarySearchQuery.trim().toLowerCase();
    if (!q) return currentModalBeneficiaries;
    return currentModalBeneficiaries.filter((b) => {
      const name = (b.name || '').toLowerCase();
      const nickname = (b.nickname || '').toLowerCase();
      const num = (b.account_number || '').toLowerCase();
      const bank = (b.bank_name || '').toLowerCase();
      return name.includes(q) || nickname.includes(q) || num.includes(q) || bank.includes(q);
    });
  }, [currentModalBeneficiaries, beneficiarySearchQuery]);

  const handleDeleteBeneficiary = (b: Beneficiary) => {
    const label = b.nickname || b.name || b.account_number || 'Beneficiary';
    Alert.alert(
      'Remove Beneficiary',
      `Are you sure you want to remove "${label}" (${b.account_number}) from your saved beneficiaries?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBeneficiary(b.id);
              setElectricityBeneficiaries((prev) => prev.filter((item) => item.id !== b.id));
              setCableBeneficiaries((prev) => prev.filter((item) => item.id !== b.id));
              setBettingBeneficiaries((prev) => prev.filter((item) => item.id !== b.id));
            } catch {
              Alert.alert('Error', 'Unable to remove beneficiary. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSelectBeneficiaryFromModal = (b: Beneficiary) => {
    if (beneficiaryModalTab === 'electricity') {
      setActiveCategory('electricity');
      handleSelectElectricityBeneficiary(b);
    } else if (beneficiaryModalTab === 'cable') {
      setActiveCategory('cable');
      handleSelectCableBeneficiary(b);
    } else if (beneficiaryModalTab === 'betting') {
      setActiveCategory('betting');
      handleSelectBettingBeneficiary(b);
    }
    setShowBeneficiariesModal(false);
  };

  const handleVerifyNewBeneficiary = async () => {
    const clean = addBeneficiaryCategory === 'betting'
      ? addBeneficiaryAccountNo.trim()
      : addBeneficiaryAccountNo.replace(/\D/g, '');

    if (!clean) {
      setAddBeneficiaryVerifyError('Please enter an account, meter, or smartcard number.');
      return;
    }

    setVerifyingAddBeneficiary(true);
    setAddBeneficiaryVerifyError(null);
    setAddBeneficiaryVerifiedName(null);

    try {
      if (addBeneficiaryCategory === 'electricity') {
        const res = await verifyElectricityMeter(addBeneficiaryDisco.code, clean, addBeneficiaryMeterType);
        if (res.success && res.name) {
          setAddBeneficiaryVerifiedName(res.name);
        } else {
          setAddBeneficiaryVerifyError(res.message || 'Unable to verify meter details.');
        }
      } else if (addBeneficiaryCategory === 'cable') {
        const res = await verifyCableSmartcard(addBeneficiaryCable.code, clean);
        if (res.success && res.name) {
          setAddBeneficiaryVerifiedName(res.name);
        } else {
          setAddBeneficiaryVerifyError('Smartcard number not found with provider.');
        }
      } else if (addBeneficiaryCategory === 'betting') {
        const res = await verifyBettingAccount(addBeneficiaryBetting.code, clean);
        if (res.success && res.name) {
          setAddBeneficiaryVerifiedName(res.name);
        } else {
          setAddBeneficiaryVerifyError(res.message || 'Betting account ID not found.');
        }
      }
    } catch (err: any) {
      setAddBeneficiaryVerifyError(err?.message || 'Verification failed. Please check details.');
    } finally {
      setVerifyingAddBeneficiary(false);
    }
  };

  const handleSaveNewBeneficiary = async () => {
    const clean = addBeneficiaryCategory === 'betting'
      ? addBeneficiaryAccountNo.trim()
      : addBeneficiaryAccountNo.replace(/\D/g, '');

    if (!clean) {
      Alert.alert('Required', 'Please enter an account, meter, or smartcard number.');
      return;
    }

    setSavingAddBeneficiary(true);
    try {
      let bName = addBeneficiaryVerifiedName;
      let bankName = '';
      let bankCode = '';
      let meterTypeVal: 'prepaid' | 'postpaid' | undefined = undefined;

      if (addBeneficiaryCategory === 'electricity') {
        bankName = addBeneficiaryDisco.name;
        bankCode = addBeneficiaryDisco.code;
        meterTypeVal = addBeneficiaryMeterType;
        if (!bName) bName = `${addBeneficiaryDisco.shortCode} Meter`;
      } else if (addBeneficiaryCategory === 'cable') {
        bankName = addBeneficiaryCable.name;
        bankCode = addBeneficiaryCable.code;
        if (!bName) bName = `${addBeneficiaryCable.name} Subscriber`;
      } else if (addBeneficiaryCategory === 'betting') {
        bankName = addBeneficiaryBetting.name;
        bankCode = addBeneficiaryBetting.code;
        if (!bName) bName = `${addBeneficiaryBetting.name} Account`;
      }

      const saved = await saveBeneficiary({
        name: bName || 'Saved Beneficiary',
        bank_name: bankName,
        bank_code: bankCode,
        account_number: clean,
        category: addBeneficiaryCategory,
        nickname: addBeneficiaryNickname.trim() || null,
        meter_type: meterTypeVal,
      });

      if (addBeneficiaryCategory === 'electricity') {
        await loadElectricityBeneficiaries();
        handleSelectElectricityBeneficiary(saved);
        setActiveCategory('electricity');
      } else if (addBeneficiaryCategory === 'cable') {
        await loadCableBeneficiaries();
        handleSelectCableBeneficiary(saved);
        setActiveCategory('cable');
      } else if (addBeneficiaryCategory === 'betting') {
        await loadBettingBeneficiaries();
        handleSelectBettingBeneficiary(saved);
        setActiveCategory('betting');
      }

      setShowAddBeneficiaryModal(false);
      setShowBeneficiariesModal(false);

      setAddBeneficiaryAccountNo('');
      setAddBeneficiaryNickname('');
      setAddBeneficiaryVerifiedName(null);
      setAddBeneficiaryVerifyError(null);

      Alert.alert('Beneficiary Saved', `"${addBeneficiaryNickname.trim() || bName}" has been saved successfully.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to save beneficiary. Please try again.');
    } finally {
      setSavingAddBeneficiary(false);
    }
  };

  // --------------------------------------------------
  // 4. Airtime & Data State
  // --------------------------------------------------
  const [network, setNetwork] = useState<NetworkProvider>('MTN');
  const [phone, setPhone] = useState('');
  const [airtimeAmount, setAirtimeAmount] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [validityFilter, setValidityFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [backendPlans, setBackendPlans] = useState<Record<NetworkProvider, DataPlan[]>>({
    MTN: [],
    Airtel: [],
    Glo: [],
    '9mobile': [],
  });
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [cachedBeneficiaries, setCachedBeneficiaries] = useState<AirtimeBeneficiary[]>([]);
  const [dismissSuggestions, setDismissSuggestions] = useState(false);

  useEffect(() => {
    void getAirtimeBeneficiaries().then((list) => {
      setCachedBeneficiaries(list);
    });
  }, []);

  useEffect(() => {
    if (activeCategory !== 'data') return;
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
        console.warn('Failed to fetch data plans:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingPlans(false);
      });

    return () => {
      isMounted = false;
    };
  }, [network, activeCategory]);

  const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
  const detectedNetwork = cleanPhone.length >= 4 ? detectNigerianNetwork(cleanPhone) : null;
  const isNetworkMismatch = Boolean(detectedNetwork && detectedNetwork !== network);

  const matchingBeneficiaries =
    cleanPhone.length >= 4 && cleanPhone.length < 11 && !dismissSuggestions
      ? cachedBeneficiaries.filter((b) => b.phone.includes(cleanPhone))
      : [];

  const handleSelectBeneficiary = (b: AirtimeBeneficiary) => {
    setPhone(b.phone);
    setNetwork(b.network);
    setSelectedPlan(null);
    setError(null);
    setDismissSuggestions(true);
  };

  const handleSelectContact = async () => {
    await pickContactPhoneNumber((selected) => {
      setPhone(selected.phone);
      setDismissSuggestions(true);
      setError(null);
      const detected = detectNigerianNetwork(selected.phone);
      if (detected) {
        setNetwork(detected);
      }
    });
  };

  const currentNetworkPlans =
    backendPlans[network]?.length > 0 ? backendPlans[network] : FALLBACK_DATA_PLANS[network] || [];

  const displayedPlans = useMemo(() => {
    if (validityFilter === 'all') return currentNetworkPlans;
    return currentNetworkPlans.filter((p) => {
      if (p.period) return p.period === validityFilter;
      const val = (p.validity + ' ' + p.name).toLowerCase();
      if (validityFilter === 'daily') return val.includes('day') && !val.includes('7') && !val.includes('30');
      if (validityFilter === 'weekly') return val.includes('week') || val.includes('7');
      if (validityFilter === 'monthly') return val.includes('month') || val.includes('30');
      return true;
    });
  }, [currentNetworkPlans, validityFilter]);

  // --------------------------------------------------
  // Category Tab Click Handler
  // --------------------------------------------------
  const handleCategoryPress = (cat: CategoryTab) => {
    setError(null);
    if (cat.key === 'flight') {
      // Flight triggers the Coming Soon experience
      setFlightModalVisible(true);
      return;
    }
    setActiveCategory(cat.key);
  };

  // --------------------------------------------------
  // Transaction Review & Submission Handler
  // --------------------------------------------------
  const handleProceedPayment = () => {
    setError(null);
    const balance = Number(wallet?.balance ?? 0);

    // 1. Electricity flow
    if (activeCategory === 'electricity') {
      const cleanMeter = meterNumber.replace(/\D/g, '');
      const numAmount = Number(electricityAmount);
      if (!cleanMeter || cleanMeter.length < 9) {
        setError('Please enter a valid meter number (minimum 9 digits).');
        return;
      }
      if (!numAmount || numAmount < 1000) {
        setError('Minimum payment for electricity recharge is ₦1,000.');
        return;
      }
      if (balance < numAmount) {
        setError(`Insufficient Naira wallet balance. You have ${formatNaira(balance)}, but need ${formatNaira(numAmount)}.`);
        return;
      }

      setPendingAction({
        title: `Confirm ${selectedDisco.name} Recharge`,
        amountLabel: formatNaira(numAmount),
        subtitle: `${meterType === 'prepaid' ? 'Prepaid Token' : 'Postpaid Bill'} · Meter ${cleanMeter}`,
        run: async (pin) => {
          const res = await purchaseBill({
            category: 'electricity',
            disco: selectedDisco.code,
            meter_number: cleanMeter,
            meter_type: meterType,
            amount: numAmount,
            customer_name: verifiedMeterInfo?.name,
            phone: user?.phone || undefined,
            pin,
            save_beneficiary: saveAsBeneficiary,
            beneficiary_nickname: beneficiaryNickname.trim() || undefined,
          });

          if (saveAsBeneficiary) {
            void saveBeneficiary({
              name: verifiedMeterInfo?.name || `${selectedDisco.name} Customer`,
              nickname: beneficiaryNickname.trim() || null,
              bank_name: selectedDisco.name,
              bank_code: selectedDisco.code,
              account_number: cleanMeter,
              category: 'electricity',
              meter_type: meterType,
            }).then(() => void loadElectricityBeneficiaries());
          }

          return res;
        },
      });
      router.push('/security/confirm-pin');
      return;
    }

    // 2. Betting flow
    if (activeCategory === 'betting') {
      const cleanUser = bettingUserId.trim();
      const numAmount = Number(bettingAmount);
      if (!cleanUser) {
        setError('Please enter your betting User ID or Account ID.');
        return;
      }
      if (!numAmount || numAmount < selectedBetting.minAmount) {
        setError(`Minimum deposit for ${selectedBetting.name} is ₦${selectedBetting.minAmount}.`);
        return;
      }
      if (selectedBetting.maxAmount && numAmount > selectedBetting.maxAmount) {
        setError(`Maximum deposit for ${selectedBetting.name} is ${formatNaira(selectedBetting.maxAmount)}.`);
        return;
      }
      if (verifyingBetting) {
        setError('Please wait while we verify the account ID.');
        return;
      }
      if (!verifiedBettingUser) {
        setError(bettingVerifyError || `Please enter a valid ${selectedBetting.name} account ID.`);
        return;
      }
      if (balance < numAmount) {
        setError(`Insufficient Naira wallet balance. You have ${formatNaira(balance)}, but need ${formatNaira(numAmount)}.`);
        return;
      }

      const idempotencyKey = `bet_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      setPendingAction({
        title: `Fund ${selectedBetting.name} Wallet`,
        amountLabel: formatNaira(numAmount),
        subtitle: `User: ${verifiedBettingUser ?? cleanUser}`,
        run: async (pin) => {
          const res = await purchaseBill({
            category: 'betting',
            biller_code: selectedBetting.code,
            biller_name: selectedBetting.name,
            customer_id: cleanUser,
            customer_name: verifiedBettingUser ?? undefined,
            amount: numAmount,
            pin,
            idempotency_key: idempotencyKey,
            save_beneficiary: saveBettingBeneficiary,
            beneficiary_nickname: bettingBeneficiaryNickname.trim() || undefined,
          });
          void loadBettingBeneficiaries();
          return res;
        },
      });
      router.push('/security/confirm-pin');
      return;
    }

    // 3. Cable TV flow
    if (activeCategory === 'cable') {
      const cleanIUC = smartcardNumber.replace(/\D/g, '');
      const months = Number(cableDuration) || 1;
      const totalCost = selectedBouquet.price * months;

      if (!cleanIUC || cleanIUC.length < 8) {
        setError('Please enter a valid Smartcard / IUC number.');
        return;
      }
      if (verifyingCable) {
        setError('Please wait while we verify your Smartcard / IUC number.');
        return;
      }
      if (cableVerifyError) {
        setError(cableVerifyError);
        return;
      }
      if (balance < totalCost) {
        setError(`Insufficient Naira wallet balance. You have ${formatNaira(balance)}, but need ${formatNaira(totalCost)}.`);
        return;
      }

      // Stable idempotency key per 60-second window to absorb accidental multi-taps
      const idempotencyKey = `cbl_${cleanIUC}_${selectedBouquet.id}_${Math.floor(Date.now() / 60000)}`;

      setPendingAction({
        title: `Renew ${selectedCable.name} (${cleanBouquetName(selectedBouquet.name)})`,
        amountLabel: formatNaira(totalCost),
        subtitle: `IUC ${cleanIUC} · ${months} ${months === 1 ? 'Month' : 'Months'}`,
        run: async (pin) => {
          const res = await purchaseBill({
            category: 'cable',
            cable_name: selectedCable.code,
            smartcard_number: cleanIUC,
            cable_plan: selectedBouquet.id,
            package_name: cleanBouquetName(selectedBouquet.name),
            customer_name: verifiedCableOwner?.name || undefined,
            amount: totalCost,
            months,
            pin,
            idempotency_key: idempotencyKey,
            save_beneficiary: saveCableBeneficiary,
            beneficiary_nickname: cableBeneficiaryNickname.trim() || undefined,
          });
          void loadCableBeneficiaries();
          return res;
        },
      });
      router.push('/security/confirm-pin');
      return;
    }

    // 4. Airtime flow
    if (activeCategory === 'airtime') {
      if (!cleanPhone || cleanPhone.length < 10) {
        setError('Please enter a valid 11-digit phone number.');
        return;
      }
      if (detectedNetwork && detectedNetwork !== network) {
        setError(`${cleanPhone} is an ${detectedNetwork} number, but you selected ${network}.`);
        return;
      }
      const numAmount = Number(airtimeAmount);
      if (!numAmount || numAmount < 50) {
        setError('Minimum airtime recharge is ₦50.');
        return;
      }
      if (balance < numAmount) {
        setError(`Insufficient Naira wallet balance. You have ${formatNaira(balance)}, but need ${formatNaira(numAmount)}.`);
        return;
      }

      setPendingAction({
        title: `Confirm ${network} Airtime`,
        amountLabel: formatNaira(numAmount),
        subtitle: `Recharge to ${cleanPhone}`,
        run: async (pin) => {
          const tx = await purchaseBill({
            category: 'airtime',
            network,
            phone: cleanPhone,
            amount: numAmount,
            pin,
          });
          try {
            await saveAirtimeBeneficiary(cleanPhone, network);
          } catch { }
          return tx;
        },
      });
      router.push('/security/confirm-pin');
      return;
    }

    // 5. Data flow
    if (activeCategory === 'data') {
      if (!cleanPhone || cleanPhone.length < 10) {
        setError('Please enter a valid 11-digit phone number.');
        return;
      }
      if (detectedNetwork && detectedNetwork !== network) {
        setError(`${cleanPhone} is an ${detectedNetwork} number, but you selected ${network}.`);
        return;
      }
      if (!selectedPlan) {
        setError('Please select a data bundle plan.');
        return;
      }
      if (balance < selectedPlan.price) {
        setError(`Insufficient Naira wallet balance. You have ${formatNaira(balance)}, but need ${formatNaira(selectedPlan.price)}.`);
        return;
      }

      setPendingAction({
        title: `Confirm ${network} Data`,
        amountLabel: formatNaira(selectedPlan.price),
        subtitle: `${selectedPlan.name} · ${cleanPhone}`,
        run: async (pin) => {
          const tx = await purchaseBill({
            category: 'data',
            network,
            phone: cleanPhone,
            amount: selectedPlan.price,
            plan_name: selectedPlan.name,
            variation_code: selectedPlan.variationCode,
            pin,
          });
          try {
            await saveAirtimeBeneficiary(cleanPhone, network);
          } catch { }
          return tx;
        },
      });
      router.push('/security/confirm-pin');
      return;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GWatermark />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerPadding}>
            <ScreenHeader
              title="Pay Bills"
              right={
                <View style={styles.balanceBadge}>
                  <Text style={styles.balanceBadgeLabel}>Naira Wallet</Text>
                  <Text style={styles.balanceBadgeValue}>{formatNaira(wallet?.balance ?? 0)}</Text>
                </View>
              }
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Category Selector Grid / Carousel */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Select Service</Text>
              <Text style={styles.sectionHint}>Instant Utility & Entertainment</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesScroll}
              contentContainerStyle={styles.categoriesContent}
            >
              {CATEGORY_TABS.map((cat) => {
                const isActive = activeCategory === cat.key;
                const isFlight = cat.key === 'flight';
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => handleCategoryPress(cat)}
                    style={[
                      styles.categoryCard,
                      isActive && !isFlight ? styles.categoryCardActive : styles.categoryCardInactive,
                      isFlight && styles.categoryCardFlight,
                    ]}
                  >
                    {cat.badge ? (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{cat.badge}</Text>
                      </View>
                    ) : null}

                    <View
                      style={[
                        styles.categoryIconCircle,
                        {
                          backgroundColor:
                            isActive && !isFlight ? colors.white : `${cat.color}15`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={cat.icon}
                        size={20}
                        color={isActive && !isFlight ? cat.color : cat.color}
                      />
                    </View>

                    <Text
                      style={[
                        styles.categoryCardTitle,
                        isActive && !isFlight ? styles.categoryCardTitleActive : styles.categoryCardTitleInactive,
                      ]}
                    >
                      {cat.title}
                    </Text>
                    <Text
                      style={[
                        styles.categoryCardSubtitle,
                        isActive && !isFlight
                          ? styles.categoryCardSubtitleActive
                          : styles.categoryCardSubtitleInactive,
                      ]}
                      numberOfLines={1}
                    >
                      {cat.subtitle}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Error Banner */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={17} color={colors.red} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* ---------------------------------------------------- */}
            {/* 1. ELECTRICITY FORM                                 */}
            {/* ---------------------------------------------------- */}
            {activeCategory === 'electricity' && (
              <View style={styles.formSection}>
                {/* Meter Type Toggle */}
                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>Select Meter Type</Text>
                  <SegmentedControl
                    options={[
                      { value: 'prepaid', label: 'Prepaid (Token)' },
                      { value: 'postpaid', label: 'Postpaid (Bill)' },
                    ]}
                    value={meterType}
                    onChange={(val) => {
                      setMeterType(val);
                      setError(null);
                    }}
                  />
                </View>

                {/* DISCO Distribution Company Selector */}
                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>Select Electricity Distribution (DISCO)</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.discoRow}
                  >
                    {DISCOS.map((disco) => {
                      const isSelected = selectedDisco.code === disco.code;
                      return (
                        <Pressable
                          key={disco.code}
                          onPress={() => {
                            setSelectedDisco(disco);
                            setError(null);
                          }}
                          style={[
                            styles.discoChip,
                            isSelected ? styles.discoChipActive : styles.discoChipInactive,
                          ]}
                        >
                          <View
                            style={[
                              styles.discoBadge,
                              { backgroundColor: isSelected ? colors.navy : disco.color },
                            ]}
                          >
                            <Text style={styles.discoBadgeText}>{disco.shortCode}</Text>
                          </View>
                          <Text
                            style={[
                              styles.discoName,
                              isSelected ? styles.discoNameActive : styles.discoNameInactive,
                            ]}
                          >
                            {disco.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Electricity Saved Beneficiaries Strip */}
                {electricityBeneficiaries.length > 0 ? (
                  <View style={styles.savedMetersSection}>
                    <View style={styles.savedMetersHeader}>
                      <View style={styles.savedMetersTitleGroup}>
                        <View style={styles.savedMetersIconPill}>
                          <Ionicons name="bookmark" size={12} color={colors.navy} />
                        </View>
                        <Text style={styles.savedMetersTitle}>Saved Meters</Text>
                        <View style={styles.savedMetersCountBadge}>
                          <Text style={styles.savedMetersCountText}>
                            {electricityBeneficiaries.length}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.savedMetersActions}>
                        <Pressable
                          onPress={() => {
                            setAddBeneficiaryCategory('electricity');
                            setShowAddBeneficiaryModal(true);
                          }}
                          hitSlop={8}
                          style={styles.savedMetersAddBtn}
                        >
                          <Ionicons name="add" size={14} color={colors.navy} />
                          <Text style={styles.savedMetersAddText}>Add</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setBeneficiaryModalTab('electricity');
                            setShowBeneficiariesModal(true);
                          }}
                          hitSlop={8}
                          style={styles.savedMetersManageBtn}
                        >
                          <Text style={styles.savedMetersManageText}>Manage</Text>
                          <Ionicons name="chevron-forward" size={12} color={colors.navy} />
                        </Pressable>
                      </View>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.savedMetersScroll}
                    >
                      {electricityBeneficiaries.map((b) => {
                        const cleanCurrent = meterNumber.replace(/\D/g, '');
                        const cleanSaved = (b.account_number || '').replace(/\D/g, '');
                        const isSelected = cleanCurrent.length >= 8 && cleanCurrent === cleanSaved;

                        const discoMatch = DISCOS.find(
                          (d) =>
                            d.code.toLowerCase() === (b.bank_code || '').toLowerCase() ||
                            d.name.toLowerCase() === (b.bank_name || '').toLowerCase()
                        );
                        const shortCode = discoMatch?.shortCode || b.bank_code || 'DISCO';
                        const discoColor = discoMatch?.color || colors.navy;

                        return (
                          <Pressable
                            key={b.id}
                            onPress={() => handleSelectElectricityBeneficiary(b)}
                            style={[
                              styles.savedMeterChip,
                              isSelected && styles.savedMeterChipActive,
                            ]}
                          >
                            <View style={styles.savedMeterChipTop}>
                              <View style={[styles.savedMeterDiscoBadge, { backgroundColor: isSelected ? colors.navy : discoColor }]}>
                                <Text style={styles.savedMeterDiscoText}>{shortCode}</Text>
                              </View>
                              <Text style={styles.savedMeterType}>
                                {b.meter_type ? b.meter_type.toUpperCase() : 'PREPAID'}
                              </Text>
                            </View>
                            <Text style={styles.savedMeterName} numberOfLines={1}>
                              {b.nickname || b.name}
                            </Text>
                            <Text style={styles.savedMeterNumber} numberOfLines={1}>
                              {b.account_number}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => {
                      setAddBeneficiaryCategory('electricity');
                      setShowAddBeneficiaryModal(true);
                    }}
                    style={styles.emptySavedStripBanner}
                  >
                    <View style={styles.emptySavedStripLeft}>
                      <View style={styles.savedMetersIconPill}>
                        <Ionicons name="bookmark-outline" size={13} color={colors.navy} />
                      </View>
                      <Text style={styles.emptySavedStripText}>Saved Meters</Text>
                    </View>
                    <View style={styles.emptySavedStripBtn}>
                      <Ionicons name="add-circle" size={14} color={colors.navy} />
                      <Text style={styles.emptySavedStripBtnText}>Add Meter</Text>
                    </View>
                  </Pressable>
                )}

                {/* Meter Number Input */}
                <View style={styles.card}>
                  <View style={styles.inputHeader}>
                    <Text style={styles.fieldLabel}>Meter Number</Text>
                    <View style={styles.headerRightGroup}>
                      {electricityBeneficiaries.length > 0 && (
                        <Pressable
                          onPress={() => setShowBeneficiariesModal(true)}
                          hitSlop={8}
                          style={styles.pickBeneficiaryBtn}
                        >
                          <Ionicons name="people-outline" size={13} color={colors.navy} />
                          <Text style={styles.pickBeneficiaryText}>Saved</Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={async () => {
                          const text = await Clipboard.getStringAsync();
                          if (text) setMeterNumber(text.replace(/\D/g, ''));
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.pasteText}>Paste</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.textInputRow}>
                    <Ionicons name="hardware-chip-outline" size={18} color={colors.inkMuted} />
                    <TextInput
                      value={meterNumber}
                      onChangeText={(val) => {
                        setMeterNumber(val);
                        setError(null);
                      }}
                      placeholder="e.g. 04192039201"
                      placeholderTextColor={colors.inkMuted}
                      keyboardType="number-pad"
                      maxLength={13}
                      style={styles.textInput}
                    />
                    {verifyingMeter ? (
                      <ActivityIndicator size="small" color={colors.navy} />
                    ) : meterNumber.length > 0 ? (
                      <Pressable onPress={() => setMeterNumber('')} hitSlop={6}>
                        <Ionicons name="close-circle" size={17} color={colors.inkMuted} />
                      </Pressable>
                    ) : null}
                  </View>

                  {/* Verified Meter Customer Card */}
                  {verifiedMeterInfo && (
                    <View style={styles.verifiedCard}>
                      <View style={styles.verifiedHeader}>
                        <Ionicons name="checkmark-circle" size={15} color="#059669" />
                        <Text style={styles.verifiedTitle}>Meter Verified</Text>
                      </View>
                      <Text style={styles.verifiedName}>{verifiedMeterInfo.name}</Text>
                      <View style={styles.tariffPill}>
                        <Text style={styles.tariffPillText}>{verifiedMeterInfo.tariff}</Text>
                      </View>
                    </View>
                  )}

                  {/* Save as Beneficiary Switch & Nickname Field */}
                  {verifiedMeterInfo && (
                    <View style={styles.saveBeneficiaryBox}>
                      <View style={styles.saveBeneficiaryRow}>
                        <View style={styles.saveBeneficiaryInfo}>
                          <View style={styles.saveBeneficiaryBadge}>
                            <Ionicons name="bookmark-outline" size={15} color={colors.navy} />
                          </View>
                          <View style={styles.saveBeneficiaryTextCol}>
                            <Text style={styles.saveBeneficiaryTitle}>Save as Beneficiary</Text>
                            <Text style={styles.saveBeneficiaryDesc}>
                              Save this meter for fast 1-tap recharges
                            </Text>
                          </View>
                        </View>
                        <Switch
                          value={saveAsBeneficiary}
                          onValueChange={setSaveAsBeneficiary}
                          trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                          thumbColor={saveAsBeneficiary ? colors.mintDark : '#94A3B8'}
                        />
                      </View>

                      {saveAsBeneficiary && (
                        <View style={styles.nicknameRow}>
                          <Ionicons name="pricetag-outline" size={14} color={colors.inkMuted} />
                          <TextInput
                            value={beneficiaryNickname}
                            onChangeText={setBeneficiaryNickname}
                            placeholder="Meter label (e.g. Home, Office, Flat 2)"
                            placeholderTextColor={colors.inkMuted}
                            maxLength={40}
                            style={styles.nicknameInput}
                          />
                        </View>
                      )}
                    </View>
                  )}

                  {/* Meter Verification Error */}
                  {meterError && !verifyingMeter ? (
                    <View style={styles.meterErrorCard}>
                      <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                      <Text style={styles.meterErrorText}>{meterError}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Amount Input & Quick Chips */}
                <View style={styles.card}>
                  <View style={styles.inputHeader}>
                    <Text style={styles.fieldLabel}>Recharge Amount</Text>
                    <Text style={styles.minAmountNote}>Min: ₦1,000</Text>
                  </View>
                  <View style={styles.amountInputRow}>
                    <Text style={styles.amountCurrency}>₦</Text>
                    <TextInput
                      value={electricityAmount}
                      onChangeText={(val) => {
                        setElectricityAmount(val);
                        setError(null);
                      }}
                      placeholder="0"
                      placeholderTextColor={colors.inkMuted}
                      keyboardType="numeric"
                      style={styles.amountTextInput}
                    />
                  </View>

                  <View style={styles.presetsGrid}>
                    {ELECTRICITY_PRESETS.map((amt) => {
                      const isActive = electricityAmount === String(amt);
                      return (
                        <Pressable
                          key={amt}
                          onPress={() => setElectricityAmount(String(amt))}
                          style={[
                            styles.presetChip,
                            isActive ? styles.presetChipActive : styles.presetChipInactive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              isActive ? styles.presetChipTextActive : styles.presetChipTextInactive,
                            ]}
                          >
                            ₦{amt.toLocaleString()}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {Number(electricityAmount) > 0 && (
                    <View style={styles.unitsEstimateRow}>
                      <Ionicons name="information-circle-outline" size={14} color={colors.inkMuted} />
                      <Text style={styles.unitsEstimateText}>
                        Est. Units: ~{(Number(electricityAmount) / 68).toFixed(1)} kWh (at standard tariff)
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* ---------------------------------------------------- */}
            {/* 2. BETTING FORM                                     */}
            {/* ---------------------------------------------------- */}
            {activeCategory === 'betting' && (
              <View style={styles.formSection}>
                {/* Platform Selector */}
                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>Select Betting Bookmaker</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.discoRow}
                  >
                    {bettingPlatforms.map((platform) => {
                      const isSelected = selectedBetting.code === platform.code;
                      return (
                        <Pressable
                          key={platform.code}
                          onPress={() => {
                            setSelectedBetting(platform);
                            setError(null);
                          }}
                          style={[
                            styles.bettingChip,
                            isSelected ? styles.bettingChipActive : styles.bettingChipInactive,
                          ]}
                        >
                          <View
                            style={[
                              styles.bettingBadge,
                              { backgroundColor: isSelected ? colors.navy : platform.color },
                            ]}
                          >
                            <Ionicons name="trophy" size={13} color="#FFFFFF" />
                          </View>
                          <Text
                            style={[
                              styles.bettingName,
                              isSelected ? styles.bettingNameActive : styles.bettingNameInactive,
                            ]}
                          >
                            {platform.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Saved Betting Accounts Strip */}
                {bettingBeneficiaries.length > 0 ? (
                  <View style={styles.savedMetersSection}>
                    <View style={styles.savedMetersHeader}>
                      <View style={styles.savedMetersTitleGroup}>
                        <View style={styles.savedMetersIconPill}>
                          <Ionicons name="bookmark" size={12} color={colors.navy} />
                        </View>
                        <Text style={styles.savedMetersTitle}>Saved Accounts</Text>
                        <View style={styles.savedMetersCountBadge}>
                          <Text style={styles.savedMetersCountText}>
                            {bettingBeneficiaries.length}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.savedMetersActions}>
                        <Pressable
                          onPress={() => {
                            setAddBeneficiaryCategory('betting');
                            setShowAddBeneficiaryModal(true);
                          }}
                          hitSlop={8}
                          style={styles.savedMetersAddBtn}
                        >
                          <Ionicons name="add" size={14} color={colors.navy} />
                          <Text style={styles.savedMetersAddText}>Add</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setBeneficiaryModalTab('betting');
                            setShowBeneficiariesModal(true);
                          }}
                          hitSlop={8}
                          style={styles.savedMetersManageBtn}
                        >
                          <Text style={styles.savedMetersManageText}>Manage</Text>
                          <Ionicons name="chevron-forward" size={12} color={colors.navy} />
                        </Pressable>
                      </View>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.savedMetersScroll}
                    >
                      {bettingBeneficiaries.map((b) => {
                        const cleanCurrent = bettingUserId.trim();
                        const cleanSaved = (b.account_number || '').trim();
                        const isSelected = cleanCurrent.length >= 3 && cleanCurrent === cleanSaved;

                        return (
                          <Pressable
                            key={b.id}
                            onPress={() => handleSelectBettingBeneficiary(b)}
                            style={[
                              styles.savedMeterChip,
                              isSelected && styles.savedMeterChipActive,
                            ]}
                          >
                            <View style={styles.savedMeterChipTop}>
                              <View
                                style={[
                                  styles.savedMeterDiscoBadge,
                                  { backgroundColor: isSelected ? colors.navy : '#10B981' },
                                ]}
                              >
                                <Text style={styles.savedMeterDiscoText}>
                                  {(b.bank_name || 'BET').slice(0, 8)}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.savedMeterName} numberOfLines={1}>
                              {b.nickname || b.name}
                            </Text>
                            <Text style={styles.savedMeterNumber} numberOfLines={1}>
                              {b.account_number}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => {
                      setAddBeneficiaryCategory('betting');
                      setShowAddBeneficiaryModal(true);
                    }}
                    style={styles.emptySavedStripBanner}
                  >
                    <View style={styles.emptySavedStripLeft}>
                      <View style={styles.savedMetersIconPill}>
                        <Ionicons name="bookmark-outline" size={13} color={colors.navy} />
                      </View>
                      <Text style={styles.emptySavedStripText}>Saved Betting Accounts</Text>
                    </View>
                    <View style={styles.emptySavedStripBtn}>
                      <Ionicons name="add-circle" size={14} color={colors.navy} />
                      <Text style={styles.emptySavedStripBtnText}>Add Account</Text>
                    </View>
                  </Pressable>
                )}

                {/* User / Account ID Input */}
                <View style={styles.card}>
                  <View style={styles.inputHeader}>
                    <Text style={styles.fieldLabel}>{selectedBetting.name} User ID / Account ID</Text>
                    <Pressable
                      onPress={async () => {
                        const text = await Clipboard.getStringAsync();
                        if (text) setBettingUserId(text.trim());
                      }}
                      hitSlop={8}
                    >
                      <Text style={styles.pasteText}>Paste</Text>
                    </Pressable>
                  </View>

                  <View style={styles.textInputRow}>
                    <Ionicons name="person-outline" size={18} color={colors.inkMuted} />
                    <TextInput
                      value={bettingUserId}
                      onChangeText={(val) => {
                        setBettingUserId(val);
                        setError(null);
                      }}
                      placeholder="e.g. 10293847"
                      placeholderTextColor={colors.inkMuted}
                      keyboardType="default"
                      style={styles.textInput}
                    />
                    {verifyingBetting ? (
                      <ActivityIndicator size="small" color={colors.navy} />
                    ) : bettingUserId.length > 0 ? (
                      <Pressable onPress={() => setBettingUserId('')} hitSlop={6}>
                        <Ionicons name="close-circle" size={17} color={colors.inkMuted} />
                      </Pressable>
                    ) : null}
                  </View>

                  {/* Verified User Card */}
                  {verifiedBettingUser && (
                    <View style={styles.verifiedCard}>
                      <View style={styles.verifiedHeader}>
                        <Ionicons name="checkmark-circle" size={15} color="#059669" />
                        <Text style={styles.verifiedTitle}>Account Verified</Text>
                      </View>
                      <Text style={styles.verifiedName}>{verifiedBettingUser}</Text>
                      <Text style={styles.verifiedSub}>
                        {selectedBetting.name} Player Account Active
                      </Text>
                    </View>
                  )}

                  {/* Save as Beneficiary Switch & Nickname Field */}
                  {verifiedBettingUser && (
                    <View style={styles.saveBeneficiaryBox}>
                      <View style={styles.saveBeneficiaryRow}>
                        <View style={styles.saveBeneficiaryInfo}>
                          <View style={styles.saveBeneficiaryBadge}>
                            <Ionicons name="bookmark-outline" size={15} color={colors.navy} />
                          </View>
                          <View style={styles.saveBeneficiaryTextCol}>
                            <Text style={styles.saveBeneficiaryTitle}>Save as Beneficiary</Text>
                            <Text style={styles.saveBeneficiaryDesc}>
                              Save this account for fast 1-tap funding
                            </Text>
                          </View>
                        </View>
                        <Switch
                          value={saveBettingBeneficiary}
                          onValueChange={setSaveBettingBeneficiary}
                          trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                          thumbColor={saveBettingBeneficiary ? colors.mintDark : '#94A3B8'}
                        />
                      </View>

                      {saveBettingBeneficiary && (
                        <View style={styles.nicknameRow}>
                          <Ionicons name="pricetag-outline" size={14} color={colors.inkMuted} />
                          <TextInput
                            value={bettingBeneficiaryNickname}
                            onChangeText={setBettingBeneficiaryNickname}
                            placeholder="Account label (e.g. My SportyBet, Weekend Bets)"
                            placeholderTextColor={colors.inkMuted}
                            maxLength={40}
                            style={styles.nicknameInput}
                          />
                        </View>
                      )}
                    </View>
                  )}

                  {!verifyingBetting && bettingVerifyError && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
                      <Ionicons name="alert-circle" size={15} color="#DC2626" />
                      <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600', flex: 1 }}>
                        {bettingVerifyError}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Amount Input & Quick Chips */}
                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>Top-up Amount</Text>
                  <View style={styles.amountInputRow}>
                    <Text style={styles.amountCurrency}>₦</Text>
                    <TextInput
                      value={bettingAmount}
                      onChangeText={(val) => {
                        setBettingAmount(val);
                        setError(null);
                      }}
                      placeholder="0"
                      placeholderTextColor={colors.inkMuted}
                      keyboardType="numeric"
                      style={styles.amountTextInput}
                    />
                  </View>

                  <View style={styles.presetsGrid}>
                    {BETTING_PRESETS.map((amt) => {
                      const isActive = bettingAmount === String(amt);
                      return (
                        <Pressable
                          key={amt}
                          onPress={() => setBettingAmount(String(amt))}
                          style={[
                            styles.presetChip,
                            isActive ? styles.presetChipActive : styles.presetChipInactive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              isActive ? styles.presetChipTextActive : styles.presetChipTextInactive,
                            ]}
                          >
                            ₦{amt.toLocaleString()}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* ---------------------------------------------------- */}
            {/* 3. CABLE TV FORM                                    */}
            {/* ---------------------------------------------------- */}
            {activeCategory === 'cable' && (
              <View style={styles.formSection}>
                {/* Cable Provider Selector */}
                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>Select Cable Provider</Text>
                  <View style={styles.providerGrid}>
                    {CABLE_PROVIDERS.map((provider) => {
                      const isSelected = selectedCable.code === provider.code;
                      return (
                        <Pressable
                          key={provider.code}
                          onPress={() => {
                            setSelectedCable(provider);
                            setError(null);
                            setCableVerifyError(null);
                          }}
                          style={[
                            styles.cableProviderCard,
                            isSelected ? styles.cableProviderActive : styles.cableProviderInactive,
                          ]}
                        >
                          <View
                            style={[
                              styles.cableIconCircle,
                              { backgroundColor: isSelected ? `${colors.navy}12` : '#FFFFFF' },
                            ]}
                          >
                            {CABLE_LOGOS[provider.code] ? (
                              <Image
                                source={CABLE_LOGOS[provider.code]}
                                style={styles.cableLogoImage}
                                resizeMode="contain"
                              />
                            ) : (
                              <Ionicons name="tv" size={16} color={isSelected ? colors.navy : provider.color} />
                            )}
                          </View>
                          <Text
                            style={[
                              styles.cableProviderName,
                              isSelected ? styles.cableProviderNameActive : styles.cableProviderNameInactive,
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.85}
                          >
                            {provider.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Saved Decoders Strip */}
                {cableBeneficiaries.length > 0 ? (
                  <View style={styles.savedMetersSection}>
                    <View style={styles.savedMetersHeader}>
                      <View style={styles.savedMetersTitleGroup}>
                        <View style={styles.savedMetersIconPill}>
                          <Ionicons name="bookmark" size={12} color={colors.navy} />
                        </View>
                        <Text style={styles.savedMetersTitle}>Saved Decoders</Text>
                        <View style={styles.savedMetersCountBadge}>
                          <Text style={styles.savedMetersCountText}>
                            {cableBeneficiaries.length}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.savedMetersActions}>
                        <Pressable
                          onPress={() => {
                            setAddBeneficiaryCategory('cable');
                            setShowAddBeneficiaryModal(true);
                          }}
                          hitSlop={8}
                          style={styles.savedMetersAddBtn}
                        >
                          <Ionicons name="add" size={14} color={colors.navy} />
                          <Text style={styles.savedMetersAddText}>Add</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setBeneficiaryModalTab('cable');
                            setShowBeneficiariesModal(true);
                          }}
                          hitSlop={8}
                          style={styles.savedMetersManageBtn}
                        >
                          <Text style={styles.savedMetersManageText}>Manage</Text>
                          <Ionicons name="chevron-forward" size={12} color={colors.navy} />
                        </Pressable>
                      </View>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.savedMetersScroll}
                    >
                      {cableBeneficiaries.map((b) => {
                        const cleanCurrent = smartcardNumber.replace(/\D/g, '');
                        const cleanSaved = (b.account_number || '').replace(/\D/g, '');
                        const isSelected = cleanCurrent.length >= 8 && cleanCurrent === cleanSaved;

                        return (
                          <Pressable
                            key={b.id}
                            onPress={() => handleSelectCableBeneficiary(b)}
                            style={[
                              styles.savedMeterChip,
                              isSelected && styles.savedMeterChipActive,
                            ]}
                          >
                            <View style={styles.savedMeterChipTop}>
                              <View
                                style={[
                                  styles.savedMeterDiscoBadge,
                                  { backgroundColor: isSelected ? colors.navy : '#4F46E5' },
                                ]}
                              >
                                <Text style={styles.savedMeterDiscoText}>
                                  {(b.bank_name || 'CABLE').slice(0, 8)}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.savedMeterName} numberOfLines={1}>
                              {b.nickname || b.name}
                            </Text>
                            <Text style={styles.savedMeterNumber} numberOfLines={1}>
                              {b.account_number}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => {
                      setAddBeneficiaryCategory('cable');
                      setShowAddBeneficiaryModal(true);
                    }}
                    style={styles.emptySavedStripBanner}
                  >
                    <View style={styles.emptySavedStripLeft}>
                      <View style={styles.savedMetersIconPill}>
                        <Ionicons name="bookmark-outline" size={13} color={colors.navy} />
                      </View>
                      <Text style={styles.emptySavedStripText}>Saved Cable Decoders</Text>
                    </View>
                    <View style={styles.emptySavedStripBtn}>
                      <Ionicons name="add-circle" size={14} color={colors.navy} />
                      <Text style={styles.emptySavedStripBtnText}>Add Decoder</Text>
                    </View>
                  </Pressable>
                )}

                {/* Smartcard / IUC Number Input */}
                <View style={styles.card}>
                  <View style={styles.inputHeader}>
                    <Text style={styles.fieldLabel}>Smartcard / IUC Number</Text>
                    <Pressable
                      onPress={async () => {
                        const text = await Clipboard.getStringAsync();
                        if (text) setSmartcardNumber(text.replace(/\D/g, ''));
                      }}
                      hitSlop={8}
                    >
                      <Text style={styles.pasteText}>Paste</Text>
                    </Pressable>
                  </View>

                  <View style={styles.textInputRow}>
                    <Ionicons name="card-outline" size={18} color={colors.inkMuted} />
                    <TextInput
                      value={smartcardNumber}
                      onChangeText={(val) => {
                        setSmartcardNumber(val);
                        setError(null);
                        setCableVerifyError(null);
                      }}
                      placeholder="e.g. 7029104921"
                      placeholderTextColor={colors.inkMuted}
                      keyboardType="number-pad"
                      maxLength={14}
                      style={styles.textInput}
                    />
                    {verifyingCable ? (
                      <ActivityIndicator size="small" color={colors.navy} />
                    ) : smartcardNumber.length > 0 ? (
                      <Pressable
                        onPress={() => {
                          setSmartcardNumber('');
                          setVerifiedCableOwner(null);
                          setCableVerifyError(null);
                        }}
                        hitSlop={6}
                      >
                        <Ionicons name="close-circle" size={17} color={colors.inkMuted} />
                      </Pressable>
                    ) : null}
                  </View>

                  {/* Verified Decoder Owner Card */}
                  {verifiedCableOwner && (
                    <View style={styles.verifiedCard}>
                      <View style={styles.verifiedHeader}>
                        <Ionicons name="checkmark-circle" size={15} color="#059669" />
                        <Text style={styles.verifiedTitle}>Decoder Verified</Text>
                      </View>
                      <Text style={styles.verifiedName}>{verifiedCableOwner.name}</Text>
                      <Text style={styles.verifiedSub}>{verifiedCableOwner.status}</Text>
                    </View>
                  )}

                  {/* Save as Beneficiary Switch & Nickname Field */}
                  {verifiedCableOwner && (
                    <View style={styles.saveBeneficiaryBox}>
                      <View style={styles.saveBeneficiaryRow}>
                        <View style={styles.saveBeneficiaryInfo}>
                          <View style={styles.saveBeneficiaryBadge}>
                            <Ionicons name="bookmark-outline" size={15} color={colors.navy} />
                          </View>
                          <View style={styles.saveBeneficiaryTextCol}>
                            <Text style={styles.saveBeneficiaryTitle}>Save as Beneficiary</Text>
                            <Text style={styles.saveBeneficiaryDesc}>
                              Save this decoder for fast 1-tap renewals
                            </Text>
                          </View>
                        </View>
                        <Switch
                          value={saveCableBeneficiary}
                          onValueChange={setSaveCableBeneficiary}
                          trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                          thumbColor={saveCableBeneficiary ? colors.mintDark : '#94A3B8'}
                        />
                      </View>

                      {saveCableBeneficiary && (
                        <View style={styles.nicknameRow}>
                          <Ionicons name="pricetag-outline" size={14} color={colors.inkMuted} />
                          <TextInput
                            value={cableBeneficiaryNickname}
                            onChangeText={setCableBeneficiaryNickname}
                            placeholder="Decoder label (e.g. Living Room, Bedroom TV)"
                            placeholderTextColor={colors.inkMuted}
                            maxLength={40}
                            style={styles.nicknameInput}
                          />
                        </View>
                      )}
                    </View>
                  )}

                  {/* Smartcard Verification Error Card */}
                  {!verifyingCable && cableVerifyError && (
                    <View style={styles.meterErrorCard}>
                      <Ionicons name="alert-circle" size={15} color="#DC2626" />
                      <Text style={styles.meterErrorText}>{cableVerifyError}</Text>
                    </View>
                  )}
                </View>

                {/* Bouquet / Package Selector */}
                <View style={styles.card}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>Select {selectedCable.name} Package</Text>
                    {loadingCablePlans && (
                      <ActivityIndicator size="small" color={colors.navy} />
                    )}
                  </View>

                  {/* Search Package Input (if provider has > 5 packages) */}
                  {currentBouquets.length > 5 && (
                    <View style={styles.bouquetSearchBox}>
                      <Ionicons name="search" size={14} color={colors.inkMuted} />
                      <TextInput
                        value={cablePackageSearch}
                        onChangeText={setCablePackageSearch}
                        placeholder={`Search ${selectedCable.name} packages...`}
                        placeholderTextColor={colors.inkMuted}
                        style={styles.bouquetSearchInput}
                        clearButtonMode="while-editing"
                      />
                      {cablePackageSearch.length > 0 && (
                        <Pressable onPress={() => setCablePackageSearch('')} hitSlop={6}>
                          <Ionicons name="close-circle" size={14} color={colors.inkMuted} />
                        </Pressable>
                      )}
                    </View>
                  )}

                  <View style={styles.bouquetsContainer}>
                    {displayedBouquets.length === 0 ? (
                      <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: colors.inkMuted, fontWeight: '500' }}>
                          No packages matching "{cablePackageSearch}"
                        </Text>
                      </View>
                    ) : (
                      displayedBouquets.map((b) => {
                        const isSelected = selectedBouquet?.id === b.id;
                        const displayName = cleanBouquetName(b.name);
                        return (
                          <Pressable
                            key={b.id}
                            onPress={() => setSelectedBouquet(b)}
                            style={[
                              styles.bouquetRow,
                              isSelected ? styles.bouquetRowActive : styles.bouquetRowInactive,
                            ]}
                          >
                            <View style={styles.bouquetLeft}>
                              <View
                                style={[
                                  styles.radioCircle,
                                  isSelected ? styles.radioActive : styles.radioInactive,
                                ]}
                              >
                                {isSelected && (
                                  <Ionicons name="checkmark" size={11} color={colors.white} />
                                )}
                              </View>
                              <Text
                                style={[
                                  styles.bouquetName,
                                  isSelected ? styles.bouquetNameActive : styles.bouquetNameInactive,
                                ]}
                                numberOfLines={2}
                              >
                                {displayName}
                              </Text>
                            </View>
                            <Text style={styles.bouquetPrice}>{formatNaira(b.price)} / mo</Text>
                          </Pressable>
                        );
                      })
                    )}
                  </View>

                  {/* Show All / Show Less Toggle Button */}
                  {filteredBouquets.length > 6 && !cablePackageSearch && (
                    <Pressable
                      onPress={() => setShowAllCablePackages((prev) => !prev)}
                      style={styles.showAllBouquetsBtn}
                    >
                      <Text style={styles.showAllBouquetsText}>
                        {showAllCablePackages
                          ? 'Show Fewer Packages'
                          : `View All ${filteredBouquets.length} Packages`}
                      </Text>
                      <Ionicons
                        name={showAllCablePackages ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={colors.navy}
                      />
                    </Pressable>
                  )}
                </View>

                {/* Duration Selector */}
                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>Subscription Duration</Text>
                  <SegmentedControl
                    options={[
                      { value: '1', label: '1 Mo' },
                      { value: '2', label: '2 Mos' },
                      { value: '3', label: '3 Mos' },
                      { value: '12', label: '1 Year' },
                    ]}
                    value={cableDuration}
                    onChange={(val) => setCableDuration(val as any)}
                  />
                  <View style={styles.cableTotalSummary}>
                    <Text style={styles.cableTotalLabel}>Total Amount Payable</Text>
                    <Text style={styles.cableTotalAmount}>
                      {formatNaira((selectedBouquet?.price || 0) * Number(cableDuration))}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* ---------------------------------------------------- */}
            {/* 4. AIRTIME & DATA FORM                              */}
            {/* ---------------------------------------------------- */}
            {/* 4. AIRTIME & DATA FORM                              */}
            {/* ---------------------------------------------------- */}
            {(activeCategory === 'airtime' || activeCategory === 'data') && (
              <View style={styles.formSection}>
                {/* Combined Recipient Card: Phone & Network */}
                <View style={[styles.card, isNetworkMismatch && styles.cardWarning]}>
                  <View style={styles.inputHeader}>
                    <Text style={styles.fieldLabel}>Phone Number</Text>
                    <View style={styles.headerRightGroup}>
                      {detectedNetwork && !isNetworkMismatch ? (
                        <View style={styles.matchBadge}>
                          {NETWORK_LOGOS[detectedNetwork] ? (
                            <Image
                              source={NETWORK_LOGOS[detectedNetwork]}
                              style={styles.detectedNetworkLogo}
                              resizeMode="contain"
                            />
                          ) : (
                            <Ionicons name="checkmark-circle" size={13} color="#059669" />
                          )}
                          <Text style={styles.matchBadgeText}>{detectedNetwork}</Text>
                        </View>
                      ) : null}
                      <Pressable
                        onPress={handleSelectContact}
                        style={styles.contactBtn}
                        hitSlop={8}
                      >
                        <Ionicons name="person-circle-outline" size={13} color={colors.navy} />
                        <Text style={styles.contactBtnText}>Contacts</Text>
                      </Pressable>
                      <Pressable
                        onPress={async () => {
                          const text = await Clipboard.getStringAsync();
                          if (text) {
                            setPhone(text.replace(/\D/g, ''));
                            setDismissSuggestions(false);
                          }
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.pasteText}>Paste</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.textInputRow}>
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
                      style={styles.textInput}
                    />
                    <View style={styles.inputEndActions}>
                      {phone.length > 0 && (
                        <Pressable onPress={() => setPhone('')} hitSlop={6}>
                          <Ionicons name="close-circle" size={17} color={colors.inkMuted} />
                        </Pressable>
                      )}
                      <Pressable
                        onPress={handleSelectContact}
                        hitSlop={8}
                        style={styles.contactIconBtn}
                        accessibilityLabel="Select contact from phone"
                      >
                        <Ionicons name="book-outline" size={17} color={colors.navy} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Network Provider Selector Pills */}
                  <View style={styles.networkSubSection}>
                    <Text style={styles.subFieldLabel}>Select Network</Text>
                    <View style={styles.networkRow}>
                      {NETWORKS.map((n) => {
                        const isSelected = n.key === network;
                        return (
                          <Pressable
                            key={n.key}
                            onPress={() => {
                              setNetwork(n.key);
                              setSelectedPlan(null);
                              setValidityFilter('all');
                            }}
                            style={[
                              styles.networkBtn,
                              isSelected ? styles.networkBtnActive : styles.networkBtnInactive,
                            ]}
                          >
                            <View style={styles.networkLogoContainer}>
                              <Image
                                source={NETWORK_LOGOS[n.key]}
                                style={styles.networkLogoImage}
                                resizeMode="contain"
                              />
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
                  </View>

                  {/* Beneficiary Suggestions */}
                  {matchingBeneficiaries.length > 0 && (
                    <View style={styles.suggestionsBox}>
                      <Text style={styles.suggestionsTitle}>Suggested Contacts</Text>
                      {matchingBeneficiaries.slice(0, 3).map((b) => (
                        <Pressable
                          key={b.phone}
                          onPress={() => handleSelectBeneficiary(b)}
                          style={styles.suggestionRow}
                        >
                          <Text style={styles.suggestionPhone}>{formatPhoneNumber(b.phone)}</Text>
                          <View style={styles.suggestionNetBadge}>
                            {NETWORK_LOGOS[b.network] && (
                              <Image
                                source={NETWORK_LOGOS[b.network]}
                                style={styles.suggestionNetLogo}
                                resizeMode="contain"
                              />
                            )}
                            <Text style={styles.suggestionNet}>{b.network}</Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {/* Network Mismatch Notice */}
                  {isNetworkMismatch && detectedNetwork && (
                    <View style={styles.warningBox}>
                      <Ionicons name="warning" size={15} color="#D97706" />
                      <Text style={styles.warningText}>
                        {phone} is a {detectedNetwork} number.
                      </Text>
                      <Pressable
                        onPress={() => setNetwork(detectedNetwork)}
                        style={styles.switchNetBtn}
                      >
                        <Text style={styles.switchNetText}>Switch to {detectedNetwork}</Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                {/* Airtime Specific: Amount Input & Presets */}
                {activeCategory === 'airtime' && (
                  <View style={styles.card}>
                    <Text style={styles.fieldLabel}>Recharge Amount</Text>
                    <View style={styles.amountInputRow}>
                      <Text style={styles.amountCurrency}>₦</Text>
                      <TextInput
                        value={airtimeAmount}
                        onChangeText={(val) => {
                          setAirtimeAmount(val);
                          setError(null);
                        }}
                        placeholder="0"
                        placeholderTextColor={colors.inkMuted}
                        keyboardType="numeric"
                        style={styles.amountTextInput}
                      />
                    </View>

                    <View style={styles.presetsGrid}>
                      {AIRTIME_PRESETS.map((amt) => {
                        const isActive = airtimeAmount === String(amt);
                        return (
                          <Pressable
                            key={amt}
                            onPress={() => setAirtimeAmount(String(amt))}
                            style={[
                              styles.presetChip,
                              isActive ? styles.presetChipActive : styles.presetChipInactive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.presetChipText,
                                isActive ? styles.presetChipTextActive : styles.presetChipTextInactive,
                              ]}
                            >
                              ₦{amt.toLocaleString()}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Data Specific: Plans Selector with Validity Filters */}
                {activeCategory === 'data' && (
                  <View style={styles.card}>
                    <View style={styles.inputHeader}>
                      <Text style={styles.fieldLabel}>Choose {network} Data Plan</Text>
                      {loadingPlans && <ActivityIndicator size="small" color={colors.navy} />}
                    </View>

                    {/* Validity Tabs */}
                    <View style={styles.validityRow}>
                      {(['all', 'daily', 'weekly', 'monthly'] as const).map((tab) => {
                        const isActive = validityFilter === tab;
                        return (
                          <Pressable
                            key={tab}
                            onPress={() => setValidityFilter(tab)}
                            style={[
                              styles.validityChip,
                              isActive ? styles.validityChipActive : styles.validityChipInactive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.validityChipText,
                                isActive ? styles.validityChipTextActive : styles.validityChipTextInactive,
                              ]}
                            >
                              {tab.toUpperCase()}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Plan Cards */}
                    <View style={styles.dataPlansList}>
                      {displayedPlans.slice(0, 8).map((p) => {
                        const isSelected = selectedPlan?.id === p.id || selectedPlan?.variationCode === p.variationCode;
                        return (
                          <Pressable
                            key={p.id + '-' + p.variationCode}
                            onPress={() => setSelectedPlan(p)}
                            style={[
                              styles.dataPlanCard,
                              isSelected ? styles.dataPlanCardActive : styles.dataPlanCardInactive,
                            ]}
                          >
                            <View style={styles.dataPlanLeft}>
                              <Ionicons
                                name="wifi"
                                size={16}
                                color={isSelected ? colors.white : colors.navy}
                              />
                              <View style={styles.dataPlanInfo}>
                                <Text
                                  style={[
                                    styles.dataPlanName,
                                    isSelected ? styles.dataPlanNameActive : styles.dataPlanNameInactive,
                                  ]}
                                >
                                  {p.data}
                                </Text>
                                <Text
                                  style={[
                                    styles.dataPlanValidity,
                                    isSelected ? styles.dataPlanValidityActive : styles.dataPlanValidityInactive,
                                  ]}
                                >
                                  {p.validity}
                                </Text>
                              </View>
                            </View>
                            <Text
                              style={[
                                styles.dataPlanPrice,
                                isSelected ? styles.dataPlanPriceActive : styles.dataPlanPriceInactive,
                              ]}
                            >
                              {formatNaira(p.price)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Wallet Source Banner */}
            <View style={styles.walletSourceCard}>
              <View style={styles.walletSourceLeft}>
                <Ionicons name="wallet-outline" size={16} color={colors.navy} />
                <Text style={styles.walletSourceLabel}>Paying from Naira Wallet</Text>
              </View>
              <Text style={styles.walletSourceBalance}>{formatNaira(wallet?.balance ?? 0)}</Text>
            </View>

            {/* Bottom Proceed Action Button */}
            <View style={styles.actionContainer}>
              <Button
                title={
                  activeCategory === 'electricity'
                    ? (Number(electricityAmount) > 0 ? `Pay ${formatNaira(Number(electricityAmount))}` : 'Recharge Meter')
                    : activeCategory === 'betting'
                      ? (Number(bettingAmount) > 0 ? `Fund ${formatNaira(Number(bettingAmount))}` : 'Fund Betting Wallet')
                      : activeCategory === 'cable'
                        ? (selectedBouquet ? `Pay ${formatNaira(selectedBouquet.price * Number(cableDuration))}` : 'Renew Subscription')
                        : activeCategory === 'airtime'
                          ? (Number(airtimeAmount) > 0 ? `Pay ${formatNaira(Number(airtimeAmount))}` : 'Buy Airtime')
                          : (selectedPlan ? `Pay ${formatNaira(selectedPlan.price)}` : 'Buy Data Bundle')
                }
                onPress={handleProceedPayment}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* ---------------------------------------------------- */}
      {/* 5. FLIGHT COMING SOON MODAL                          */}
      {/* ---------------------------------------------------- */}
      <Modal
        visible={flightModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFlightModalVisible(false)}
      >
        <Pressable
          style={styles.flightModalBackdrop}
          onPress={() => setFlightModalVisible(false)}
        >
          <Pressable style={styles.flightModalCard} onPress={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <Pressable
              onPress={() => setFlightModalVisible(false)}
              hitSlop={12}
              style={styles.flightCloseBtn}
            >
              <Ionicons name="close" size={20} color={colors.inkMuted} />
            </Pressable>

            {/* Airplane Graphic Header */}
            <View style={styles.flightIconContainer}>
              <View style={styles.flightIconOuter}>
                <Ionicons name="airplane" size={36} color="#8B5CF6" />
              </View>
              <View style={styles.flightSoonPill}>
                <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                <Text style={styles.flightSoonPillText}>COMING SOON IN V2.4</Text>
              </View>
            </View>

            <Text style={styles.flightModalTitle}>Flight Bookings & Travel</Text>
            <Text style={styles.flightModalSubtitle}>
              Search, compare, and book domestic & international flights seamlessly with your Gutter Naira or Crypto balance.
            </Text>

            {/* Feature Highlights */}
            <View style={styles.flightFeaturesBox}>
              <View style={styles.flightFeatureItem}>
                <View style={styles.flightFeatureIcon}>
                  <Ionicons name="navigate-outline" size={16} color="#8B5CF6" />
                </View>
                <View style={styles.flightFeatureTextCol}>
                  <Text style={styles.flightFeatureTitle}>Domestic & International Routes</Text>
                  <Text style={styles.flightFeatureDesc}>
                    Air Peace, Ibom Air, United Nigeria, Emirates, Qatar Airways & 200+ airlines.
                  </Text>
                </View>
              </View>

              <View style={styles.flightFeatureItem}>
                <View style={styles.flightFeatureIcon}>
                  <Ionicons name="wallet-outline" size={16} color="#10B981" />
                </View>
                <View style={styles.flightFeatureTextCol}>
                  <Text style={styles.flightFeatureTitle}>Pay With Naira or Crypto</Text>
                  <Text style={styles.flightFeatureDesc}>
                    Instant flight checkout directly from your USDT, BTC, or Naira wallet with zero hidden fees.
                  </Text>
                </View>
              </View>

              <View style={styles.flightFeatureItem}>
                <View style={styles.flightFeatureIcon}>
                  <Ionicons name="ticket-outline" size={16} color="#3B82F6" />
                </View>
                <View style={styles.flightFeatureTextCol}>
                  <Text style={styles.flightFeatureTitle}>Instant E-Ticketing</Text>
                  <Text style={styles.flightFeatureDesc}>
                    Boarding pass and booking reference delivered instantly to your WhatsApp & Email.
                  </Text>
                </View>
              </View>
            </View>

            {/* Waitlist / Notify Me CTA */}
            {flightWaitlistJoined ? (
              <View style={styles.flightJoinedCard}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.flightJoinedTitle}>You're on the VIP Priority List!</Text>
                  <Text style={styles.flightJoinedDesc}>
                    We will notify you immediately when flight bookings are unlocked.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ width: '100%' }}>
                <Button
                  title="Notify Me When Live"
                  onPress={() => {
                    setFlightWaitlistJoined(true);
                  }}
                />
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Unified Beneficiaries Management Modal */}
      <Modal
        visible={showBeneficiariesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBeneficiariesModal(false)}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.modalHeaderIconBadge}>
                <Ionicons name="bookmark" size={18} color={colors.navy} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Saved Beneficiaries</Text>
                <Text style={styles.modalSubtitle}>
                  {currentModalBeneficiaries.length} {beneficiaryModalTab === 'electricity' ? 'meter' : beneficiaryModalTab === 'cable' ? 'decoder' : 'account'}{currentModalBeneficiaries.length === 1 ? '' : 's'} saved
                </Text>
              </View>
            </View>
            <View style={styles.modalHeaderRightGroup}>
              <Pressable
                onPress={() => {
                  setAddBeneficiaryCategory(beneficiaryModalTab);
                  setShowAddBeneficiaryModal(true);
                }}
                hitSlop={8}
                style={styles.modalAddHeaderBtn}
              >
                <Ionicons name="add" size={16} color={colors.white} />
                <Text style={styles.modalAddHeaderBtnText}>Add</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowBeneficiariesModal(false)}
                hitSlop={10}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.ink} />
              </Pressable>
            </View>
          </View>

          {/* Service Category Switcher */}
          <View style={styles.modalCategoryTabs}>
            <Pressable
              onPress={() => setBeneficiaryModalTab('electricity')}
              style={[
                styles.modalCategoryTab,
                beneficiaryModalTab === 'electricity' && styles.modalCategoryTabActive,
              ]}
            >
              <Text
                style={[
                  styles.modalCategoryTabText,
                  beneficiaryModalTab === 'electricity' && styles.modalCategoryTabTextActive,
                ]}
              >
                Electricity ({electricityBeneficiaries.length})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setBeneficiaryModalTab('cable')}
              style={[
                styles.modalCategoryTab,
                beneficiaryModalTab === 'cable' && styles.modalCategoryTabActive,
              ]}
            >
              <Text
                style={[
                  styles.modalCategoryTabText,
                  beneficiaryModalTab === 'cable' && styles.modalCategoryTabTextActive,
                ]}
              >
                Cable TV ({cableBeneficiaries.length})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setBeneficiaryModalTab('betting')}
              style={[
                styles.modalCategoryTab,
                beneficiaryModalTab === 'betting' && styles.modalCategoryTabActive,
              ]}
            >
              <Text
                style={[
                  styles.modalCategoryTabText,
                  beneficiaryModalTab === 'betting' && styles.modalCategoryTabTextActive,
                ]}
              >
                Betting ({bettingBeneficiaries.length})
              </Text>
            </Pressable>
          </View>

          {/* Search Box */}
          <View style={styles.modalSearchBox}>
            <Ionicons name="search" size={16} color={colors.inkMuted} />
            <TextInput
              value={beneficiarySearchQuery}
              onChangeText={setBeneficiarySearchQuery}
              placeholder="Search nickname, name, or number..."
              placeholderTextColor={colors.inkMuted}
              style={styles.modalSearchInput}
              clearButtonMode="while-editing"
            />
          </View>

          {/* List of Beneficiaries */}
          <ScrollView contentContainerStyle={styles.modalListContent}>
            {filteredModalBeneficiaries.length === 0 ? (
              <View style={styles.modalEmptyState}>
                <View style={styles.modalEmptyIconPill}>
                  <Ionicons name="bookmark-outline" size={36} color={colors.inkMuted} />
                </View>
                <Text style={styles.modalEmptyTitle}>
                  No saved {beneficiaryModalTab === 'electricity' ? 'meters' : beneficiaryModalTab === 'cable' ? 'decoders' : 'betting accounts'} found
                </Text>
                <Text style={styles.modalEmptyText}>
                  {beneficiarySearchQuery
                    ? 'No beneficiaries match your search query.'
                    : 'Save accounts here for fast 1-tap recharges and instant renewals.'}
                </Text>
                <Pressable
                  onPress={() => {
                    setAddBeneficiaryCategory(beneficiaryModalTab);
                    setShowAddBeneficiaryModal(true);
                  }}
                  style={styles.modalEmptyAddBtn}
                >
                  <Ionicons name="add-circle" size={16} color={colors.white} />
                  <Text style={styles.modalEmptyAddBtnText}>
                    Add New {beneficiaryModalTab === 'electricity' ? 'Meter' : beneficiaryModalTab === 'cable' ? 'Decoder' : 'Account'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              filteredModalBeneficiaries.map((b) => {
                let badgeColor: string = colors.navy;
                let badgeText = 'BILL';

                if (beneficiaryModalTab === 'electricity') {
                  const discoMatch = DISCOS.find(
                    (d) =>
                      d.code.toLowerCase() === (b.bank_code || '').toLowerCase() ||
                      d.name.toLowerCase() === (b.bank_name || '').toLowerCase()
                  );
                  badgeText = discoMatch?.shortCode || b.bank_code || 'DISCO';
                  badgeColor = discoMatch?.color || colors.navy;
                } else if (beneficiaryModalTab === 'cable') {
                  badgeText = (b.bank_name || 'CABLE').slice(0, 6).toUpperCase();
                  badgeColor = '#4F46E5';
                } else {
                  badgeText = (b.bank_name || 'BET').slice(0, 6).toUpperCase();
                  badgeColor = '#10B981';
                }

                return (
                  <View key={b.id} style={styles.modalBeneficiaryCard}>
                    <Pressable
                      style={styles.modalBeneficiaryInfo}
                      onPress={() => handleSelectBeneficiaryFromModal(b)}
                    >
                      <View style={[styles.modalDiscoBadge, { backgroundColor: badgeColor }]}>
                        <Text style={styles.modalDiscoBadgeText}>{badgeText}</Text>
                      </View>
                      <View style={styles.modalBeneficiaryDetails}>
                        <View style={styles.modalBeneficiaryTopRow}>
                          <Text style={styles.modalBeneficiaryName} numberOfLines={1}>
                            {b.nickname || b.name}
                          </Text>
                          {b.meter_type && (
                            <View style={styles.modalMeterTypeBadge}>
                              <Text style={styles.modalMeterTypeText}>
                                {b.meter_type.toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                        {b.nickname && b.name ? (
                          <Text style={styles.modalBeneficiaryCustomerName} numberOfLines={1}>
                            {b.name}
                          </Text>
                        ) : null}
                        <Text style={styles.modalBeneficiaryNumber}>
                          {b.bank_name} · {b.account_number}
                        </Text>
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={() => handleDeleteBeneficiary(b)}
                      hitSlop={10}
                      style={styles.modalDeleteBtn}
                    >
                      <Ionicons name="trash-outline" size={17} color="#EF4444" />
                    </Pressable>
                  </View>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add New Beneficiary Modal */}
      <Modal
        visible={showAddBeneficiaryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddBeneficiaryModal(false)}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIconBadge}>
                  <Ionicons name="person-add" size={18} color={colors.navy} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Add Beneficiary</Text>
                  <Text style={styles.modalSubtitle}>Save for fast 1-tap recharges</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setShowAddBeneficiaryModal(false)}
                hitSlop={10}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.ink} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.addBeneficiaryScroll}
              keyboardShouldPersistTaps="handled"
            >
              {/* Category Segmented Control */}
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Select Service Category</Text>
                <SegmentedControl
                  options={[
                    { value: 'electricity', label: 'Electricity' },
                    { value: 'cable', label: 'Cable TV' },
                    { value: 'betting', label: 'Betting' },
                  ]}
                  value={addBeneficiaryCategory}
                  onChange={(val) => {
                    setAddBeneficiaryCategory(val as any);
                    setAddBeneficiaryAccountNo('');
                    setAddBeneficiaryVerifiedName(null);
                    setAddBeneficiaryVerifyError(null);
                  }}
                />
              </View>

              {/* Provider Selector */}
              {addBeneficiaryCategory === 'electricity' && (
                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>Meter Type</Text>
                  <SegmentedControl
                    options={[
                      { value: 'prepaid', label: 'Prepaid' },
                      { value: 'postpaid', label: 'Postpaid' },
                    ]}
                    value={addBeneficiaryMeterType}
                    onChange={(val) => {
                      setAddBeneficiaryMeterType(val as any);
                      setAddBeneficiaryVerifiedName(null);
                    }}
                  />

                  <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Select Electricity DISCO</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.discoRow}
                  >
                    {DISCOS.map((disco) => {
                      const isSel = addBeneficiaryDisco.code === disco.code;
                      return (
                        <Pressable
                          key={disco.code}
                          onPress={() => {
                            setAddBeneficiaryDisco(disco);
                            setAddBeneficiaryVerifiedName(null);
                          }}
                          style={[
                            styles.discoChip,
                            isSel ? styles.discoChipActive : styles.discoChipInactive,
                          ]}
                        >
                          <View
                            style={[
                              styles.discoBadge,
                              { backgroundColor: isSel ? colors.navy : disco.color },
                            ]}
                          >
                            <Text style={styles.discoBadgeText}>{disco.shortCode}</Text>
                          </View>
                          <Text
                            style={[
                              styles.discoName,
                              isSel ? styles.discoNameActive : styles.discoNameInactive,
                            ]}
                          >
                            {disco.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {addBeneficiaryCategory === 'cable' && (
                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>Select Cable TV Provider</Text>
                  <View style={styles.providerGrid}>
                    {CABLE_PROVIDERS.map((provider) => {
                      const isSel = addBeneficiaryCable.code === provider.code;
                      return (
                        <Pressable
                          key={provider.code}
                          onPress={() => {
                            setAddBeneficiaryCable(provider);
                            setAddBeneficiaryVerifiedName(null);
                          }}
                          style={[
                            styles.cableProviderCard,
                            isSel ? styles.cableProviderActive : styles.cableProviderInactive,
                          ]}
                        >
                          <View
                            style={[
                              styles.cableIconCircle,
                              { backgroundColor: isSel ? `${colors.navy}12` : '#FFFFFF' },
                            ]}
                          >
                            {CABLE_LOGOS[provider.code] ? (
                              <Image
                                source={CABLE_LOGOS[provider.code]}
                                style={styles.cableLogoImage}
                                resizeMode="contain"
                              />
                            ) : (
                              <Ionicons name="tv" size={16} color={isSel ? colors.navy : provider.color} />
                            )}
                          </View>
                          <Text
                            style={[
                              styles.cableProviderName,
                              isSel ? styles.cableProviderNameActive : styles.cableProviderNameInactive,
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.85}
                          >
                            {provider.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {addBeneficiaryCategory === 'betting' && (
                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>Select Bookmaker</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.discoRow}
                  >
                    {bettingPlatforms.map((platform) => {
                      const isSel = addBeneficiaryBetting.code === platform.code;
                      return (
                        <Pressable
                          key={platform.code}
                          onPress={() => {
                            setAddBeneficiaryBetting(platform);
                            setAddBeneficiaryVerifiedName(null);
                          }}
                          style={[
                            styles.discoChip,
                            isSel ? styles.discoChipActive : styles.discoChipInactive,
                          ]}
                        >
                          <View
                            style={[
                              styles.discoBadge,
                              { backgroundColor: isSel ? colors.navy : '#10B981' },
                            ]}
                          >
                            <Text style={styles.discoBadgeText}>{platform.name.slice(0, 3).toUpperCase()}</Text>
                          </View>
                          <Text
                            style={[
                              styles.discoName,
                              isSel ? styles.discoNameActive : styles.discoNameInactive,
                            ]}
                          >
                            {platform.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Account / Meter / Smartcard Input */}
              <View style={styles.card}>
                <View style={styles.inputHeader}>
                  <Text style={styles.fieldLabel}>
                    {addBeneficiaryCategory === 'electricity'
                      ? 'Meter Number'
                      : addBeneficiaryCategory === 'cable'
                      ? 'Smartcard / IUC Number'
                      : 'Customer / User ID'}
                  </Text>
                  <Pressable
                    onPress={async () => {
                      const text = await Clipboard.getStringAsync();
                      if (text) {
                        const val = addBeneficiaryCategory === 'betting' ? text.trim() : text.replace(/\D/g, '');
                        setAddBeneficiaryAccountNo(val);
                      }
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.pasteText}>Paste</Text>
                  </Pressable>
                </View>

                <View style={styles.textInputRow}>
                  <Ionicons
                    name={
                      addBeneficiaryCategory === 'electricity'
                        ? 'flash-outline'
                        : addBeneficiaryCategory === 'cable'
                        ? 'card-outline'
                        : 'person-outline'
                    }
                    size={18}
                    color={colors.inkMuted}
                  />
                  <TextInput
                    value={addBeneficiaryAccountNo}
                    onChangeText={(val) => {
                      setAddBeneficiaryAccountNo(val);
                      setAddBeneficiaryVerifiedName(null);
                      setAddBeneficiaryVerifyError(null);
                    }}
                    placeholder={
                      addBeneficiaryCategory === 'electricity'
                        ? 'e.g. 04192039201'
                        : addBeneficiaryCategory === 'cable'
                        ? 'e.g. 1029384756'
                        : 'e.g. 08012345678'
                    }
                    placeholderTextColor={colors.inkMuted}
                    keyboardType={addBeneficiaryCategory === 'betting' ? 'default' : 'number-pad'}
                    maxLength={20}
                    style={styles.textInput}
                  />
                  {addBeneficiaryAccountNo.length > 0 && (
                    <Pressable
                      onPress={() => {
                        setAddBeneficiaryAccountNo('');
                        setAddBeneficiaryVerifiedName(null);
                        setAddBeneficiaryVerifyError(null);
                      }}
                      hitSlop={6}
                    >
                      <Ionicons name="close-circle" size={17} color={colors.inkMuted} />
                    </Pressable>
                  )}
                </View>

                {/* Verify Action Button */}
                <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <Pressable
                    onPress={handleVerifyNewBeneficiary}
                    disabled={verifyingAddBeneficiary || !addBeneficiaryAccountNo.trim()}
                    style={[
                      styles.addVerifyBtn,
                      (!addBeneficiaryAccountNo.trim() || verifyingAddBeneficiary) && styles.addVerifyBtnDisabled,
                    ]}
                  >
                    {verifyingAddBeneficiary ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={styles.addVerifyBtnText}>Verify Details</Text>
                    )}
                  </Pressable>
                </View>

                {/* Verified feedback */}
                {addBeneficiaryVerifiedName && (
                  <View style={[styles.verifiedCard, { marginTop: 12 }]}>
                    <View style={styles.verifiedHeader}>
                      <Ionicons name="checkmark-circle" size={15} color="#059669" />
                      <Text style={styles.verifiedTitle}>Account Verified</Text>
                    </View>
                    <Text style={styles.verifiedName}>{addBeneficiaryVerifiedName}</Text>
                  </View>
                )}

                {addBeneficiaryVerifyError && (
                  <View style={[styles.meterErrorCard, { marginTop: 12 }]}>
                    <Ionicons name="alert-circle" size={15} color="#DC2626" />
                    <Text style={styles.meterErrorText}>{addBeneficiaryVerifyError}</Text>
                  </View>
                )}
              </View>

              {/* Nickname Input */}
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Beneficiary Nickname (Optional)</Text>
                <View style={styles.textInputRow}>
                  <Ionicons name="pricetag-outline" size={18} color={colors.inkMuted} />
                  <TextInput
                    value={addBeneficiaryNickname}
                    onChangeText={setAddBeneficiaryNickname}
                    placeholder="e.g. Home, Living Room TV, My ID"
                    placeholderTextColor={colors.inkMuted}
                    maxLength={40}
                    style={styles.textInput}
                  />
                </View>
              </View>

              {/* Save CTA */}
              <View style={{ marginTop: 10, marginBottom: 30 }}>
                <Button
                  title={savingAddBeneficiary ? 'Saving...' : 'Save Beneficiary'}
                  onPress={handleSaveNewBeneficiary}
                  disabled={savingAddBeneficiary || !addBeneficiaryAccountNo.trim()}
                  loading={savingAddBeneficiary}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ----------------------------------------------------
// Styles
// ----------------------------------------------------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.page,
  },
  container: {
    flex: 1,
  },
  headerPadding: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  balanceBadge: {
    backgroundColor: `${colors.navy}10`,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: 'flex-end',
  },
  balanceBadgeLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.inkMuted,
    textTransform: 'uppercase',
  },
  balanceBadgeValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.navy,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginTop: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.inkMuted,
    marginTop: 2,
  },

  // Category Selector Carousel
  categoriesScroll: {
    marginHorizontal: -20,
    marginBottom: 16,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryCard: {
    width: 104,
    minWidth: 104,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    position: 'relative',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCardActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryCardInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  },
  categoryCardFlight: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
  },
  categoryBadge: {
    position: 'absolute',
    top: -6,
    right: 4,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 10,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  categoryIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryCardTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  categoryCardTitleActive: {
    color: colors.white,
  },
  categoryCardTitleInactive: {
    color: colors.ink,
  },
  categoryCardSubtitle: {
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  categoryCardSubtitleActive: {
    color: '#CBD5E1',
  },
  categoryCardSubtitleInactive: {
    color: colors.inkMuted,
  },

  // Cards & Layout
  formSection: {
    gap: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardWarning: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 10,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  contactBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.navy,
  },
  pasteText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
  },
  inputEndActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactIconBtn: {
    padding: 3,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },

  // Input Fields
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.lineInput,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: colors.page,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.lineInput,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: colors.page,
    marginBottom: 12,
  },
  amountCurrency: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy,
    marginRight: 6,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
  },

  // Presets Grid
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  presetChipInactive: {
    backgroundColor: colors.chip,
    borderColor: colors.line,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  presetChipTextActive: {
    color: colors.white,
  },
  presetChipTextInactive: {
    color: colors.ink,
  },

  // Units Estimate
  unitsEstimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  unitsEstimateText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.inkMuted,
  },

  // Verified Entity Card
  verifiedCard: {
    marginTop: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
  },
  verifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  verifiedTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
  },
  verifiedName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
  },
  verifiedSub: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.inkMid,
    marginTop: 2,
  },
  tariffPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#10B98120',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  tariffPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  meterErrorCard: {
    marginTop: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meterErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
    flex: 1,
  },
  minAmountNote: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.btc,
  },

  // DISCO & Betting Selector Chips
  discoRow: {
    gap: 8,
    paddingVertical: 2,
  },
  discoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  discoChipActive: {
    backgroundColor: `${colors.navy}10`,
    borderColor: colors.navy,
  },
  discoChipInactive: {
    backgroundColor: colors.page,
    borderColor: colors.line,
  },
  discoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  discoName: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  discoNameActive: {
    color: colors.navy,
  },
  discoNameInactive: {
    color: colors.ink,
  },

  // Betting Specific
  bettingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bettingChipActive: {
    backgroundColor: `${colors.navy}10`,
    borderColor: colors.navy,
  },
  bettingChipInactive: {
    backgroundColor: colors.page,
    borderColor: colors.line,
  },
  bettingBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bettingName: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  bettingNameActive: {
    color: colors.navy,
  },
  bettingNameInactive: {
    color: colors.ink,
  },

  // Cable TV Specific
  providerGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  cableProviderCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  cableProviderActive: {
    backgroundColor: `${colors.navy}10`,
    borderColor: colors.navy,
  },
  cableProviderInactive: {
    backgroundColor: colors.page,
    borderColor: colors.line,
  },
  cableIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cableProviderName: {
    fontSize: 11.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  cableProviderNameActive: {
    color: colors.navy,
  },
  cableProviderNameInactive: {
    color: colors.ink,
  },
  bouquetSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.page,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
    gap: 8,
  },
  bouquetSearchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
    padding: 0,
  },
  showAllBouquetsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 8,
    gap: 6,
    borderRadius: 12,
    backgroundColor: `${colors.navy}08`,
  },
  showAllBouquetsText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.navy,
  },
  bouquetsContainer: {
    gap: 8,
  },
  bouquetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 52,
  },
  bouquetRowActive: {
    backgroundColor: `${colors.navy}08`,
    borderColor: colors.navy,
  },
  bouquetRowInactive: {
    backgroundColor: colors.page,
    borderColor: colors.line,
  },
  bouquetLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 10,
    minWidth: 0,
  },
  bouquetName: {
    flex: 1,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  bouquetNameActive: {
    color: colors.navy,
  },
  bouquetNameInactive: {
    color: colors.ink,
  },
  bouquetPrice: {
    flexShrink: 0,
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'right',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    backgroundColor: colors.navy,
  },
  radioInactive: {
    borderWidth: 1.5,
    borderColor: colors.inkGhost,
  },
  cableTotalSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  cableTotalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  cableTotalAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
  },

  // Airtime & Data Specific
  networkRow: {
    flexDirection: 'row',
    gap: 8,
  },
  networkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  networkBtnActive: {
    backgroundColor: `${colors.navy}10`,
    borderColor: colors.navy,
  },
  networkBtnInactive: {
    backgroundColor: colors.page,
    borderColor: colors.line,
  },
  networkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  networkBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  networkLogoContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  networkLogoImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  detectedNetworkLogo: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  suggestionNetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  suggestionNetLogo: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  cableLogoImage: {
    width: 26,
    height: 26,
    borderRadius: 6,
  },
  networkBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  networkBtnTextActive: {
    color: colors.navy,
  },
  networkBtnTextInactive: {
    color: colors.ink,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  matchBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
  },
  suggestionsBox: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  suggestionsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkMuted,
    marginBottom: 6,
  },
  suggestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  suggestionPhone: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  suggestionNet: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navy,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },
  switchNetBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  switchNetText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  validityRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  validityChip: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  validityChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  validityChipInactive: {
    backgroundColor: colors.page,
    borderColor: colors.line,
  },
  validityChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  validityChipTextActive: {
    color: colors.white,
  },
  validityChipTextInactive: {
    color: colors.inkMuted,
  },
  dataPlansList: {
    gap: 8,
  },
  dataPlanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dataPlanCardActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  dataPlanCardInactive: {
    backgroundColor: colors.page,
    borderColor: colors.line,
  },
  dataPlanLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dataPlanInfo: {
    gap: 2,
  },
  dataPlanName: {
    fontSize: 13,
    fontWeight: '800',
  },
  dataPlanNameActive: {
    color: colors.white,
  },
  dataPlanNameInactive: {
    color: colors.ink,
  },
  dataPlanValidity: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  dataPlanValidityActive: {
    color: '#CBD5E1',
  },
  dataPlanValidityInactive: {
    color: colors.inkMuted,
  },
  dataPlanPrice: {
    fontSize: 13,
    fontWeight: '800',
  },
  dataPlanPriceActive: {
    color: colors.white,
  },
  dataPlanPriceInactive: {
    color: colors.navy,
  },

  // Error Banner
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.red,
  },

  networkSubSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  subFieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.inkMuted,
    marginBottom: 8,
  },
  walletSourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${colors.navy}08`,
    borderWidth: 1,
    borderColor: `${colors.navy}12`,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 14,
  },
  walletSourceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletSourceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  walletSourceBalance: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
  },

  // Bottom Action
  actionContainer: {
    marginTop: 14,
  },

  // ----------------------------------------------------
  // Flight Coming Soon Modal
  // ----------------------------------------------------
  flightModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 18, 46, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  flightModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  flightCloseBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flightIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  flightIconOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FAF5FF',
    borderWidth: 2,
    borderColor: '#E9D5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  flightSoonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  flightSoonPillText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  flightModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  flightModalSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  flightFeaturesBox: {
    width: '100%',
    backgroundColor: colors.page,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 20,
  },
  flightFeatureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  flightFeatureIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  flightFeatureTextCol: {
    flex: 1,
  },
  flightFeatureTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.ink,
  },
  flightFeatureDesc: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.inkMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  flightJoinedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 14,
    width: '100%',
  },
  flightJoinedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  flightJoinedDesc: {
    fontSize: 11,
    fontWeight: '500',
    color: '#047857',
    marginTop: 2,
  },

  // Electricity Beneficiaries & Saved Meters
  savedMetersSection: {
    marginBottom: 4,
  },
  savedMetersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  savedMetersTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  savedMetersIconPill: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedMetersTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.ink,
  },
  savedMetersCountBadge: {
    backgroundColor: colors.navy,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  savedMetersCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.white,
  },
  savedMetersManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  savedMetersManageText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
  },
  savedMetersScroll: {
    gap: 10,
    paddingBottom: 4,
  },
  savedMeterChip: {
    width: 140,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  savedMeterChipActive: {
    borderColor: colors.navy,
    backgroundColor: '#F8FAFC',
  },
  savedMeterChipTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  savedMeterDiscoBadge: {
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  savedMeterDiscoText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 0.4,
  },
  savedMeterType: {
    fontSize: 8.5,
    fontWeight: '800',
    color: colors.inkMuted,
  },
  savedMeterName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 2,
  },
  savedMeterNumber: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  pickBeneficiaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pickBeneficiaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy,
  },

  // Save as Beneficiary Switch & Nickname
  saveBeneficiaryBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  saveBeneficiaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveBeneficiaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  saveBeneficiaryBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBeneficiaryTextCol: {
    flex: 1,
  },
  saveBeneficiaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
  saveBeneficiaryDesc: {
    fontSize: 10.5,
    fontWeight: '500',
    color: colors.inkMuted,
    marginTop: 1,
  },
  nicknameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.page,
    borderWidth: 1,
    borderColor: colors.lineInput,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginTop: 10,
  },
  nicknameInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },

  // Beneficiaries Management Modal
  modalSafeArea: {
    flex: 1,
    backgroundColor: colors.page,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalHeaderIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.inkMuted,
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineInput,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 46,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.ink,
  },
  modalListContent: {
    padding: 16,
    gap: 12,
  },
  modalEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  modalEmptyIconPill: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalEmptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 6,
    textAlign: 'center',
  },
  modalEmptyText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalBeneficiaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  modalBeneficiaryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalDiscoBadge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDiscoBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 0.4,
  },
  modalBeneficiaryDetails: {
    flex: 1,
    gap: 2,
  },
  modalBeneficiaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalBeneficiaryName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
    flexShrink: 1,
  },
  modalMeterTypeBadge: {
    backgroundColor: '#EEF2F6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  modalMeterTypeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.navy,
  },
  modalBeneficiaryCustomerName: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.inkMid,
  },
  modalBeneficiaryNumber: {
    fontSize: 11.5,
    fontWeight: '500',
    color: colors.inkMuted,
  },
  modalDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  savedMetersActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savedMetersAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  savedMetersAddText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.navy,
  },
  emptySavedStripBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  emptySavedStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptySavedStripText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.ink,
  },
  emptySavedStripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.navy}10`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  emptySavedStripBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.navy,
  },
  modalHeaderRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalAddHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.navy,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  modalAddHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  modalCategoryTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginHorizontal: 16,
    marginTop: 12,
  },
  modalCategoryTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  modalCategoryTabActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  modalCategoryTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  modalCategoryTabTextActive: {
    color: colors.navy,
    fontWeight: '800',
  },
  modalEmptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.navy,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    marginTop: 16,
  },
  modalEmptyAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  addBeneficiaryScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  addVerifyBtn: {
    backgroundColor: colors.navy,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addVerifyBtnDisabled: {
    backgroundColor: colors.lineInput,
  },
  addVerifyBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
});
