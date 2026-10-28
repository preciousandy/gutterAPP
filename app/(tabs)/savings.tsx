import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { colors, headerGradient } from '@/theme';
import { formatNaira } from '@/utils/format';
import { useAuth, useSettings, useWallet } from '@/context';
import {
  getSavingsDashboard,
  getTargetCategories,
  depositSavings,
  withdrawSavings,
  breakSavings,
  getBreakSavingsPreview,
  type SavingsPlanDto,
  type SavingsGoalDto,
  type TargetCategoryDto,
  type BreakSavingsPreviewDto,
} from '@/api/savings';
import { setPendingAction } from '@/lib/pendingAction';
import { errorMessage } from '@/api/client';

interface SavingsPlan {
  id: string | number;
  key: string;
  name: string;
  category: 'gvault' | 'target' | 'fixed' | 'spend_save';
  tagline: string;
  rate: string;
  rateNumber: number;
  badge: string;
  badgeBg: string;
  badgeText: string;
  icon: keyof typeof Ionicons.glyphMap;
  themeColor: string;
  themeBg: string;
  description: string;
  features: string[];
  minDeposit: number;
  lockPeriod: string;
  userBalance: number;
  isEnabled: boolean;
  allowWithdrawals: boolean;
}

const SAVINGS_PLANS: SavingsPlan[] = [
  {
    id: 'gvault',
    key: 'gvault',
    name: 'G-Vault',
    category: 'gvault',
    tagline: 'Daily interest with free anytime withdrawal',
    rate: '15.0% p.a.',
    rateNumber: 15.0,
    badge: 'DAILY PAYOUT',
    badgeBg: '#ECFDF5',
    badgeText: '#059669',
    icon: 'wallet-outline',
    themeColor: '#059669',
    themeBg: '#F0FDF4',
    description: 'Earn high daily compounding interest on your spare balance in your G-Vault. Deposit anytime and withdraw whenever you want with zero penalty fees.',
    features: ['Daily interest paid at 6:00 AM', 'Withdraw 100% anytime free', 'Automated compounding'],
    minDeposit: 500,
    lockPeriod: 'None (Instant)',
    userBalance: 0,
    isEnabled: true,
    allowWithdrawals: true,
  },
  {
    id: 'target',
    key: 'target',
    name: 'Target Savings',
    category: 'target',
    tagline: 'Set financial goals and hit your targets',
    rate: '16.5% p.a.',
    rateNumber: 16.5,
    badge: 'POPULAR GOAL',
    badgeBg: '#EDE9FE',
    badgeText: '#6D28D9',
    icon: 'flag-outline',
    themeColor: '#7C3AED',
    themeBg: '#F5F3FF',
    description: 'Save toward specific personal milestones like Rent, Business, Vacation, or Tuition. Automate daily, weekly, or monthly savings.',
    features: ['Flexible target amounts & dates', 'Automated recurring stashing', 'Goal milestone celebrations'],
    minDeposit: 1000,
    lockPeriod: 'Flexible Goal End Date',
    userBalance: 0,
    isEnabled: true,
    allowWithdrawals: true,
  },
  {
    id: 'fixed',
    key: 'fixed',
    name: 'SafeBox (Fixed)',
    category: 'fixed',
    tagline: 'Lock funds for maximum guaranteed returns',
    rate: '20.0% p.a.',
    rateNumber: 20.0,
    badge: 'HIGHEST YIELD',
    badgeBg: '#FEF3C7',
    badgeText: '#B45309',
    icon: 'lock-closed-outline',
    themeColor: '#D97706',
    themeBg: '#FFFBEB',
    description: 'Lock away disciplined lump sums for 30, 60, 90, 180, or 365 days. Protect your capital from impulsive spending while locking in top yield.',
    features: ['Guaranteed up to 20% annual yield', 'Choice of 30 to 365 days lock', 'Interest paid upfront or maturity'],
    minDeposit: 5000,
    lockPeriod: '30 - 365 Days',
    userBalance: 0,
    isEnabled: true,
    allowWithdrawals: true,
  },
  {
    id: 'spend_save',
    key: 'spend_save',
    name: 'Spend & Save',
    category: 'spend_save',
    tagline: 'Automate micro-savings every time you spend',
    rate: '15.0% p.a.',
    rateNumber: 15.0,
    badge: 'EFFORTLESS',
    badgeBg: '#E0F2FE',
    badgeText: '#0369A1',
    icon: 'flash-outline',
    themeColor: '#0284C7',
    themeBg: '#F0F9FF',
    description: 'Never worry about saving manually. Whenever you pay a bill, buy airtime, or transfer money, a percentage is automatically stashed into high-yield savings.',
    features: ['Save 5% to 20% on each transaction', 'Interest compounds automatically', 'Turn on/off anytime with 1 tap'],
    minDeposit: 100,
    lockPeriod: 'Instant Access',
    userBalance: 0,
    isEnabled: true,
    allowWithdrawals: true,
  },
];

interface ActiveGoal {
  id: string;
  title: string;
  planId?: number;
  planName: string;
  planKey?: string;
  categoryName?: string;
  categoryIcon?: string;
  savedAmount: number;
  targetAmount: number;
  principal?: number;
  totalInterestEarned?: number;
  rate: string;
  daysRemaining: number | null;
  maturityDateFormatted?: string;
  isLocked?: boolean;
  earlyBreakFeePercentage?: number;
  color: string;
}

export default function SavingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { wallet, refreshWallet } = useWallet();
  const { hideBalances, toggleHideBalances } = useSettings();

  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [plans, setPlans] = useState<SavingsPlan[]>(SAVINGS_PLANS);
  const [targetCategories, setTargetCategories] = useState<TargetCategoryDto[]>([]);
  const [selectedTargetCat, setSelectedTargetCat] = useState<TargetCategoryDto | null>(null);
  const [targetGoalAmount, setTargetGoalAmount] = useState('100000');
  const [customGoalTitle, setCustomGoalTitle] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<SavingsPlan | null>(null);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [breakModalVisible, setBreakModalVisible] = useState(false);
  const [breakingGoal, setBreakingGoal] = useState<ActiveGoal | null>(null);
  const [breakPreview, setBreakPreview] = useState<BreakSavingsPreviewDto | null>(null);
  const [loadingBreakPreview, setLoadingBreakPreview] = useState(false);
  const [depositAmount, setDepositAmount] = useState('10000');
  const [withdrawAmount, setWithdrawAmount] = useState('10000');
  const [withdrawPlanId, setWithdrawPlanId] = useState<string | number>('gvault');
  const [activeDuration, setActiveDuration] = useState<number>(90);
  const [processingAction, setProcessingAction] = useState(false);

  const [backendTotalBalance, setBackendTotalBalance] = useState<number | null>(null);
  const [backendTotalEarned, setBackendTotalEarned] = useState<number | null>(null);
  const [backendYesterdayInterest, setBackendYesterdayInterest] = useState<number | null>(null);
  const [activeGoals, setActiveGoals] = useState<ActiveGoal[]>([]);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await getSavingsDashboard();
      if (data) {
        setBackendTotalBalance(data.total_savings_balance);
        setBackendTotalEarned(data.total_interest_earned);
        setBackendYesterdayInterest(data.yesterday_interest);

        if (Array.isArray(data.plans) && data.plans.length > 0) {
          const mapped: SavingsPlan[] = data.plans.map((p) => {
            const fallback = SAVINGS_PLANS.find((sp) => sp.key === p.key || sp.id === p.key);
            return {
              id: p.id,
              key: p.key,
              name: p.name,
              category: p.category as any,
              tagline: p.tagline || fallback?.tagline || '',
              rate: `${Number(p.annual_rate).toFixed(1)}% p.a.`,
              rateNumber: Number(p.annual_rate),
              badge: p.badge || fallback?.badge || 'SAVINGS',
              badgeBg: p.badge_bg || fallback?.badgeBg || '#ECFDF5',
              badgeText: p.badge_text || fallback?.badgeText || '#059669',
              icon: (fallback?.icon || 'wallet-outline') as any,
              themeColor: p.theme_color || fallback?.themeColor || '#059669',
              themeBg: p.theme_bg || fallback?.themeBg || '#F0FDF4',
              description: p.description || fallback?.description || '',
              features: Array.isArray(p.features) ? p.features : (fallback?.features || []),
              minDeposit: Number(p.min_deposit || fallback?.minDeposit || 500),
              lockPeriod: p.lock_period || fallback?.lockPeriod || 'Instant',
              userBalance: Number(p.user_balance ?? fallback?.userBalance ?? 0),
              isEnabled: Boolean(p.is_enabled),
              allowWithdrawals: Boolean(p.allow_withdrawals),
            };
          });
          setPlans(mapped);
        }

        if (Array.isArray(data.target_categories) && data.target_categories.length > 0) {
          setTargetCategories(data.target_categories);
          setSelectedTargetCat((prev) => prev || data.target_categories![0]);
        } else {
          getTargetCategories().then((cats) => {
            if (Array.isArray(cats) && cats.length > 0) {
              setTargetCategories(cats);
              setSelectedTargetCat((prev) => prev || cats[0]);
            }
          }).catch(() => {});
        }

        if (Array.isArray(data.goals)) {
          setActiveGoals(
            data.goals.map((g) => ({
              id: String(g.id),
              title: g.title,
              planId: g.plan_id,
              planName: g.plan_name,
              planKey: g.plan_key,
              categoryName: g.category_name || undefined,
              categoryIcon: g.category_icon || undefined,
              savedAmount: g.saved_amount,
              targetAmount: g.target_amount,
              principal: g.principal ?? Math.max(0, g.saved_amount - (g.total_interest_earned ?? 0)),
              totalInterestEarned: g.total_interest_earned ?? 0,
              rate: `${Number(g.annual_rate).toFixed(1)}% p.a.`,
              daysRemaining: g.days_remaining,
              maturityDateFormatted: g.maturity_date_formatted || undefined,
              isLocked: g.is_locked ?? (g.days_remaining !== null && g.days_remaining > 0),
              earlyBreakFeePercentage: g.early_break_fee_percentage ?? 2.5,
              color: g.color || '#7C3AED',
            }))
          );
        }
      }
    } catch {
      // Fallback to initial state if offline
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await Promise.all([refreshWallet(true), loadDashboard()]);
    } finally {
      setPullRefreshing(false);
    }
  }, [refreshWallet, loadDashboard]);

  useFocusEffect(
    useCallback(() => {
      void refreshWallet();
      void loadDashboard();
    }, [refreshWallet, loadDashboard])
  );

  // Aggregated savings statistics
  const totalSavingsBalance = useMemo(() => {
    if (backendTotalBalance !== null) return backendTotalBalance;
    return plans.reduce((sum, p) => sum + p.userBalance, 0);
  }, [backendTotalBalance, plans]);

  const totalInterestEarned = useMemo(() => {
    if (backendTotalEarned !== null) return backendTotalEarned;
    return 0.00;
  }, [backendTotalEarned]);

  const yesterdayInterest = useMemo(() => {
    if (backendYesterdayInterest !== null) return backendYesterdayInterest;
    return totalSavingsBalance > 0 ? Math.round((totalSavingsBalance * 0.15) / 365) : 0;
  }, [backendYesterdayInterest, totalSavingsBalance]);

  // Projected return calculation for the calculator
  const projectedInterest = useMemo(() => {
    const principal = parseFloat(depositAmount.replace(/,/g, '')) || 0;
    const rate = (selectedPlan?.rateNumber ?? 15.0) / 100;
    const days = activeDuration;
    const interest = (principal * rate * days) / 365;
    return Math.round(interest);
  }, [depositAmount, selectedPlan, activeDuration]);

  const handleOpenPlan = (plan: SavingsPlan) => {
    if (!plan.isEnabled) {
      Alert.alert('Plan Temporarily Unavailable', `${plan.name} is currently suspended by admin.`);
      return;
    }
    setSelectedPlan(plan);
    const isTarget = plan.category === 'target' || plan.key === 'target';
    if (isTarget) {
      setDepositAmount('1000');
      setTargetGoalAmount('100000');
      const defCat = selectedTargetCat || targetCategories[0];
      if (defCat) {
        setSelectedTargetCat(defCat);
        setCustomGoalTitle(defCat.name);
      } else {
        setCustomGoalTitle('Rent & Accommodation');
      }
      setActiveDuration(90);
    } else {
      setDepositAmount(String(plan.minDeposit));
    }
    setDepositModalVisible(true);
  };

  const handleConfirmDeposit = async () => {
    if (processingAction || !selectedPlan) return;
    const amount = parseFloat(depositAmount.replace(/,/g, ''));
    const isTarget = selectedPlan.category === 'target' || selectedPlan.key === 'target';
    const minRequired = isTarget ? 1000 : selectedPlan.minDeposit;

    if (!amount || amount < minRequired) {
      Alert.alert(
        'Minimum Deposit Required',
        `The minimum deposit for ${selectedPlan.name} is ${formatNaira(minRequired, 0)}.`
      );
      return;
    }

    if (isTarget) {
      const targetGoal = parseFloat(targetGoalAmount.replace(/,/g, '')) || 0;
      if (targetGoal < 1000) {
        Alert.alert('Target Goal Amount', 'Please set a target goal amount of at least ₦1,000.');
        return;
      }
      if (amount > targetGoal) {
        Alert.alert('Deposit Amount', 'Initial deposit cannot be greater than the target goal amount.');
        return;
      }
    }

    setProcessingAction(true);
    try {
      const maturityDateObj = new Date();
      maturityDateObj.setDate(maturityDateObj.getDate() + activeDuration);
      const maturityDateStr = maturityDateObj.toISOString().split('T')[0];

      const res = await depositSavings({
        plan_id: selectedPlan.id,
        amount,
        target_category_id: isTarget ? selectedTargetCat?.id : undefined,
        target_amount: isTarget ? parseFloat(targetGoalAmount.replace(/,/g, '')) : undefined,
        title: isTarget ? (customGoalTitle.trim() || selectedTargetCat?.name || 'Target Savings Goal') : undefined,
        duration_days: (selectedPlan.category === 'fixed' || isTarget) ? activeDuration : undefined,
        maturity_date: isTarget ? maturityDateStr : undefined,
      });

      await refreshWallet();
      await loadDashboard();
      setDepositModalVisible(false);

      router.push({
        pathname: '/receipt',
        params: { data: JSON.stringify(res.transaction) },
      });
    } catch (e) {
      Alert.alert('Deposit Failed', errorMessage(e));
    } finally {
      setProcessingAction(false);
    }
  };

  const handleOpenWithdraw = (planId?: string | number) => {
    if (planId) {
      setWithdrawPlanId(planId);
    } else {
      const planWithBal = plans.find((p) => p.userBalance > 0);
      setWithdrawPlanId(planWithBal?.id || plans[0]?.id || 'gvault');
    }
    setWithdrawAmount('5000');
    setWithdrawModalVisible(true);
  };

  const handleOpenBreakSavings = async (goal: ActiveGoal) => {
    setBreakingGoal(goal);
    setBreakModalVisible(true);
    setLoadingBreakPreview(true);

    try {
      const preview = await getBreakSavingsPreview(Number(goal.id));
      setBreakPreview(preview);
    } catch {
      // Fallback calculation in case network preview fails
      const balance = goal.savedAmount;
      const interest = goal.totalInterestEarned ?? 0;
      const forfeited = Math.min(interest, balance);
      const principal = Math.max(0, balance - forfeited);
      const feePct = goal.earlyBreakFeePercentage ?? 2.5;
      const fee = Math.round(principal * (feePct / 100) * 100) / 100;
      const net = Math.max(0, principal - fee);

      setBreakPreview({
        user_saving_id: Number(goal.id),
        title: goal.title,
        plan_name: goal.planName,
        plan_key: goal.planKey || 'fixed',
        balance,
        principal,
        accrued_interest: interest,
        forfeited_interest: forfeited,
        fee_percentage: feePct,
        early_break_fee: fee,
        net_payout: net,
        is_before_maturity: Boolean(goal.isLocked),
        locked_until_formatted: goal.maturityDateFormatted,
        warning_message: `Breaking this savings plan early will attract a ${feePct}% fee on your eligible savings principal. You will also lose all interest earned on this plan. You will receive ${formatNaira(net, 2)} from a principal of ${formatNaira(principal, 2)}. Do you want to continue?`,
      });
    } finally {
      setLoadingBreakPreview(false);
    }
  };

  const handleConfirmBreak = () => {
    if (!breakingGoal) return;

    if (!user?.has_pin) {
      Alert.alert(
        'Transaction PIN Required',
        'You need to create a 4-digit transaction PIN before authorizing early withdrawals.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Create PIN', onPress: () => router.push('/security/change-pin') },
        ]
      );
      return;
    }

    const currentGoal = breakingGoal;
    const currentPreview = breakPreview;
    setBreakModalVisible(false);

    setPendingAction({
      title: 'Break Savings Plan',
      amountLabel: formatNaira(currentPreview?.net_payout ?? currentGoal.savedAmount, 2),
      subtitle: `Early liquidation for ${currentGoal.title}`,
      run: async (pin: string) => {
        const res = await breakSavings({
          user_saving_id: Number(currentGoal.id),
          pin,
        });
        await refreshWallet();
        await loadDashboard();
        return res.transaction;
      },
    });

    router.push('/security/confirm-pin');
  };

  const handleConfirmWithdraw = () => {
    const amount = parseFloat(withdrawAmount.replace(/,/g, ''));
    if (!amount || amount < 50) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to withdraw (minimum ₦50.00).');
      return;
    }

    if (amount > totalSavingsBalance) {
      Alert.alert('Insufficient Balance', 'The requested withdrawal amount exceeds your available savings balance.');
      return;
    }

    const targetPlan = plans.find((p) => p.id === withdrawPlanId || p.key === withdrawPlanId) || selectedPlan || plans[0];

    // Check if target plan is locked
    const matchingGoal = activeGoals.find(
      (g) => (g.planKey === targetPlan?.key || g.planId === targetPlan?.id) && g.isLocked
    );
    if (matchingGoal) {
      Alert.alert(
        'Locked Savings Plan',
        `This ${targetPlan.name} is locked until maturity. Standard withdrawals are restricted, but you can choose to Break Savings Early (attracts a ${matchingGoal.earlyBreakFeePercentage ?? 2.5}% fee on eligible principal and forfeits accrued interest).`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Break Early',
            style: 'destructive',
            onPress: () => {
              setWithdrawModalVisible(false);
              handleOpenBreakSavings(matchingGoal);
            },
          },
        ]
      );
      return;
    }

    // Strict 4-Digit Transaction PIN Requirement
    if (!user?.has_pin) {
      Alert.alert(
        'Transaction PIN Required',
        'You need to create a 4-digit transaction PIN before authorizing withdrawals.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Create PIN', onPress: () => router.push('/security/change-pin') },
        ]
      );
      return;
    }

    setWithdrawModalVisible(false);

    // Register pending action for PIN authorization
    setPendingAction({
      title: 'Savings Withdrawal',
      amountLabel: formatNaira(amount, 2),
      subtitle: `Transfer from ${targetPlan?.name || 'Gutter Vault'} to Naira wallet`,
      run: async (pin: string) => {
        const res = await withdrawSavings({
          plan_id: targetPlan?.id || 'gvault',
          amount,
          pin,
        });
        await refreshWallet();
        await loadDashboard();
        return res.transaction;
      },
    });

    // Route to PIN verification keypad
    router.push('/security/confirm-pin');
  };

  return (
    <View style={styles.screenBg}>
      {/* Background Gradient & Watermark */}
      <LinearGradient
        colors={[...headerGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={styles.gradientHeader}
      >
        <GWatermark light size={440} className="-right-24 -top-20 opacity-20" />
      </LinearGradient>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Top App Bar */}
        <View style={styles.topNav}>
          <View style={styles.navBrand}>
            <View style={styles.navBrandDot} />
            <Text style={styles.navBrandText}>GUTTER WEALTH</Text>
          </View>

          <View style={styles.navRightGroup}>
            <Pressable
              onPress={toggleHideBalances}
              hitSlop={10}
              style={styles.navIconBtn}
            >
              <Ionicons
                name={hideBalances ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.white}
              />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/transactions')}
              hitSlop={10}
              style={styles.navIconBtn}
            >
              <Ionicons name="receipt-outline" size={17} color={colors.white} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={pullRefreshing}
              onRefresh={onRefresh}
              tintColor="#FFFFFF"
            />
          }
        >
          {/* Main Portfolio Wealth Card */}
          <View style={styles.portfolioCard}>
            <View style={styles.portfolioHeader}>
              <View style={styles.portfolioTitleRow}>
                <Ionicons name="shield-checkmark" size={15} color="#23D3A5" />
                <Text style={styles.portfolioTitle}>TOTAL SAVINGS BALANCE</Text>
              </View>
              <View style={styles.rateBadge}>
                <Text style={styles.rateBadgeText}>Up to 20% p.a.</Text>
              </View>
            </View>

            <Text style={styles.portfolioBalanceText}>
              {hideBalances ? '••••••••' : formatNaira(totalSavingsBalance, 2)}
            </Text>

            {/* Daily Return & Total Accumulated Return */}
            <View style={styles.statsPillRow}>
              <View style={styles.statPill}>
                <View style={styles.pulsingDot} />
                <Text style={styles.statPillLabel}>Yesterday's Interest:</Text>
                <Text style={styles.statPillValue}>
                  +{formatNaira(yesterdayInterest, 2)}
                </Text>
              </View>

              <View style={styles.statPill}>
                <Ionicons name="trending-up" size={13} color="#23D3A5" />
                <Text style={styles.statPillLabel}>Total Earned:</Text>
                <Text style={styles.statPillValue}>
                  +{formatNaira(totalInterestEarned, 2)}
                </Text>
              </View>
            </View>

            {/* Quick Action Buttons */}
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => handleOpenPlan(plans[0] || SAVINGS_PLANS[0])}
                style={styles.primaryActionBtn}
              >
                <Ionicons name="add" size={18} color="#062B22" />
                <Text style={styles.primaryActionText}>Save Money</Text>
              </Pressable>

              <Pressable
                onPress={() => handleOpenWithdraw()}
                style={styles.secondaryActionBtn}
              >
                <Ionicons name="arrow-up" size={16} color={colors.white} />
                <Text style={styles.secondaryActionText}>Withdraw</Text>
              </Pressable>
            </View>
          </View>

          {/* Daily Compounding Notice Banner */}
          <View style={styles.noticeBanner}>
            <View style={styles.noticeIconCircle}>
              <Ionicons name="sparkles" size={15} color="#059669" />
            </View>
            <View style={styles.noticeTextCol}>
              <Text style={styles.noticeTitle}>Daily Returns Paid Every 6:00 AM</Text>
              <Text style={styles.noticeSub}>
                Your money never sits idle. Interest compounds automatically into your wallet.
              </Text>
            </View>
          </View>

          {/* Section: Savings Products */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Savings Products</Text>
            <Text style={styles.sectionSub}>Choose the plan that suits your goals</Text>
          </View>

          {/* The 4 Core OPay-Style Savings Cards */}
          <View style={styles.plansContainer}>
            {plans.map((plan) => {
              const isSuspended = !plan.isEnabled;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => handleOpenPlan(plan)}
                  style={[styles.planCard, isSuspended && styles.planCardDisabled]}
                >
                  <View style={styles.planCardTop}>
                    <View
                      style={[
                        styles.planIconBox,
                        {
                          backgroundColor: isSuspended ? '#F1F5F9' : plan.themeBg,
                          borderColor: isSuspended ? '#CBD5E1' : `${plan.themeColor}30`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={isSuspended ? 'lock-closed' : plan.icon}
                        size={22}
                        color={isSuspended ? '#64748B' : plan.themeColor}
                      />
                    </View>

                    <View style={styles.planNameCol}>
                      <View style={styles.planTitleLine}>
                        <Text style={[styles.planTitle, isSuspended && styles.planTitleDisabled]}>
                          {plan.name}
                        </Text>
                        <View
                          style={[
                            styles.planBadge,
                            {
                              backgroundColor: isSuspended ? '#F1F5F9' : plan.badgeBg,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.planBadgeText,
                              {
                                color: isSuspended ? '#64748B' : plan.badgeText,
                              },
                            ]}
                          >
                            {isSuspended ? 'SUSPENDED' : plan.badge}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.planTagline} numberOfLines={1}>
                        {isSuspended ? 'Temporarily disabled by admin' : plan.tagline}
                      </Text>
                    </View>

                    <View style={styles.planRateCol}>
                      <Text
                        style={[
                          styles.planRateText,
                          { color: isSuspended ? '#94A3B8' : plan.themeColor },
                        ]}
                      >
                        {plan.rate}
                      </Text>
                      <Text style={styles.planRateLabel}>Annual Yield</Text>
                    </View>
                  </View>

                  {/* Balance + Micro Feature Chips */}
                  <View style={styles.planFooterRow}>
                    <View style={styles.planBalanceGroup}>
                      <Text style={styles.planBalanceLabel}>Saved Balance</Text>
                      <Text style={styles.planBalanceValue}>
                        {hideBalances ? '••••••' : formatNaira(plan.userBalance, 2)}
                      </Text>
                    </View>

                    <View style={styles.planCtaBtn}>
                      <Text
                        style={[
                          styles.planCtaText,
                          { color: isSuspended ? '#64748B' : plan.themeColor },
                        ]}
                      >
                        {isSuspended ? 'Unavailable' : 'Save'}
                      </Text>
                      <Ionicons
                        name={isSuspended ? 'ban-outline' : 'chevron-forward'}
                        size={14}
                        color={isSuspended ? '#64748B' : plan.themeColor}
                      />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Section: Active Savings Goals */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderWithCount}>
              <Text style={styles.sectionTitle}>My Active Goals</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{activeGoals.length}</Text>
              </View>
            </View>
            <Text style={styles.sectionSub}>Track progress toward your milestones</Text>
          </View>

          <View style={styles.goalsList}>
            {activeGoals.map((goal) => {
              const progressPct = Math.min(
                100,
                Math.round((goal.savedAmount / Math.max(1, goal.targetAmount)) * 100)
              );

              return (
                <View key={goal.id} style={styles.goalCard}>
                  <View style={styles.goalCardHeader}>
                    <View style={styles.goalTitleGroup}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {goal.categoryIcon ? (
                          <Ionicons name={goal.categoryIcon as any} size={15} color={goal.color} />
                        ) : null}
                        <Text style={styles.goalTitle}>{goal.title}</Text>
                      </View>
                      <Text style={styles.goalPlanSub}>
                        {goal.categoryName ? `${goal.categoryName} • ` : ''}{goal.planName} • {goal.rate}
                      </Text>
                    </View>
                    <View style={styles.goalDaysPill}>
                      <Ionicons name="time-outline" size={12} color="#0E2050" />
                      <Text style={styles.goalDaysText}>
                        {goal.daysRemaining !== null ? `${goal.daysRemaining}d left` : 'Flexible'}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${progressPct}%`, backgroundColor: goal.color },
                      ]}
                    />
                  </View>

                  <View style={styles.goalProgressDetails}>
                    <Text style={styles.goalSavedAmount}>
                      {hideBalances ? '••••••' : formatNaira(goal.savedAmount, 0)}
                      <Text style={styles.goalTargetAmount}>
                        {' / ' + (hideBalances ? '••••••' : formatNaira(goal.targetAmount, 0))}
                      </Text>
                    </Text>
                    <Text style={[styles.goalPercentText, { color: goal.color }]}>
                      {progressPct}% Completed
                    </Text>
                  </View>

                  {goal.maturityDateFormatted ? (
                    <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name="calendar-outline" size={12} color={colors.inkMuted} />
                      <Text style={{ fontSize: 11, fontFamily: 'Manrope_500Medium', color: colors.inkMuted }}>
                        Matures: {goal.maturityDateFormatted}
                      </Text>
                    </View>
                  ) : null}

                  {/* Early Break / Withdraw Action */}
                  <View style={styles.goalActionsRow}>
                    <Pressable
                      style={[
                        styles.breakSavingsBtn,
                        !goal.isLocked && { backgroundColor: '#ECFDF5' },
                      ]}
                      onPress={() => handleOpenBreakSavings(goal)}
                    >
                      <Ionicons
                        name={goal.isLocked ? 'flash-outline' : 'wallet-outline'}
                        size={13}
                        color={goal.isLocked ? '#DC2626' : '#059669'}
                      />
                      <Text
                        style={[
                          styles.breakSavingsBtnText,
                          { color: goal.isLocked ? '#DC2626' : '#059669' },
                        ]}
                      >
                        {goal.isLocked ? 'Break Early' : 'Withdraw'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Trust & NDIC Insurance Guarantee */}
          <View style={styles.trustBadgeCard}>
            <View style={styles.trustIconHalo}>
              <Ionicons name="lock-closed" size={18} color="#059669" />
            </View>
            <View style={styles.trustTextCol}>
              <Text style={styles.trustTitle}>NDIC Insured & Regulated Custody</Text>
              <Text style={styles.trustSubtitle}>
                Your funds are held securely with CBN-licensed custodian partners and insured up to the legal statutory limit.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Interactive Deposit & Calculator Modal */}
      <Modal
        visible={depositModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDepositModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalHeaderIconBox,
                    { backgroundColor: selectedPlan?.themeBg || '#ECFDF5' },
                  ]}
                >
                  <Ionicons
                    name={selectedPlan?.icon || 'wallet'}
                    size={20}
                    color={selectedPlan?.themeColor || '#059669'}
                  />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Save to {selectedPlan?.name}</Text>
                  <Text style={styles.modalSubtitle}>
                    Earn {selectedPlan?.rate} compounding daily
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setDepositModalVisible(false)}
                hitSlop={10}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.inkMid} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              {selectedPlan?.category === 'target' || selectedPlan?.key === 'target' ? (
                /* ============================================== */
                /* TARGET SAVINGS SPECIAL FORM                    */
                /* ============================================== */
                <View>
                  {/* 1. Target Category Selector */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.inputLabel}>1. Select Target Category (Set by Admin)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChipsRow}>
                      {targetCategories.map((cat) => {
                        const isSelected = selectedTargetCat?.id === cat.id;
                        return (
                          <Pressable
                            key={cat.id}
                            onPress={() => {
                              setSelectedTargetCat(cat);
                              setCustomGoalTitle(cat.name);
                            }}
                            style={[
                              styles.catChip,
                              isSelected && { borderColor: cat.color, backgroundColor: `${cat.color}15` },
                            ]}
                          >
                            <View style={[styles.catChipIconCircle, { backgroundColor: `${cat.color}20` }]}>
                              <Ionicons
                                name={(cat.icon || 'flag-outline') as any}
                                size={15}
                                color={cat.color}
                              />
                            </View>
                            <Text style={[styles.catChipText, isSelected && { color: cat.color, fontFamily: 'Manrope_800ExtraBold' }]}>
                              {cat.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* 2. Custom Goal Name */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.inputLabel}>2. Goal Name</Text>
                    <TextInput
                      style={styles.textInputRegular}
                      value={customGoalTitle}
                      onChangeText={setCustomGoalTitle}
                      placeholder="e.g. Rent 2027"
                      placeholderTextColor={colors.inkFaint}
                    />
                  </View>

                  {/* 3. Target Amount */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.inputLabel}>3. Target Financial Goal (₦)</Text>
                    <View style={styles.amountInputRow}>
                      <Text style={styles.nairaPrefix}>₦</Text>
                      <TextInput
                        style={styles.amountInput}
                        keyboardType="number-pad"
                        value={targetGoalAmount}
                        onChangeText={setTargetGoalAmount}
                        placeholder="100,000"
                        placeholderTextColor={colors.inkFaint}
                      />
                    </View>
                    <View style={styles.quickPillsRow}>
                      {['50000', '100000', '250000', '500000', '1000000'].map((val) => (
                        <Pressable
                          key={val}
                          onPress={() => setTargetGoalAmount(val)}
                          style={[styles.quickPill, targetGoalAmount === val && styles.quickPillActive]}
                        >
                          <Text style={[styles.quickPillText, targetGoalAmount === val && styles.quickPillTextActive]}>
                            {formatNaira(Number(val), 0)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* 4. Initial Deposit Amount (Min ₦1,000) */}
                  <View style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.inputLabel}>4. Initial Deposit (Minimum ₦1,000)</Text>
                      <Text style={{ fontSize: 11, fontFamily: 'Manrope_700Bold', color: '#059669' }}>Min ₦1,000</Text>
                    </View>
                    <View style={styles.amountInputRow}>
                      <Text style={styles.nairaPrefix}>₦</Text>
                      <TextInput
                        style={styles.amountInput}
                        keyboardType="number-pad"
                        value={depositAmount}
                        onChangeText={setDepositAmount}
                        placeholder="1,000"
                        placeholderTextColor={colors.inkFaint}
                      />
                    </View>
                    <View style={styles.quickPillsRow}>
                      {['1000', '5000', '10000', '25000', '50000'].map((val) => (
                        <Pressable
                          key={val}
                          onPress={() => setDepositAmount(val)}
                          style={[styles.quickPill, depositAmount === val && styles.quickPillActive]}
                        >
                          <Text style={[styles.quickPillText, depositAmount === val && styles.quickPillTextActive]}>
                            +{formatNaira(Number(val), 0)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* 5. Maturity Date Selection */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.inputLabel}>5. Target Duration / Maturity</Text>
                    <View style={styles.durationPillsRow}>
                      {[
                        { days: 30, label: '30 Days' },
                        { days: 60, label: '60 Days' },
                        { days: 90, label: '90 Days' },
                        { days: 180, label: '180 Days' },
                        { days: 365, label: '1 Year' },
                      ].map((item) => (
                        <Pressable
                          key={item.days}
                          onPress={() => setActiveDuration(item.days)}
                          style={[
                            styles.durationPill,
                            activeDuration === item.days && styles.durationPillActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.durationPillText,
                              activeDuration === item.days && styles.durationPillTextActive,
                            ]}
                          >
                            {item.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <View style={styles.maturityBanner}>
                      <Ionicons name="calendar-outline" size={15} color="#7C3AED" />
                      <Text style={styles.maturityBannerText}>
                        Maturity Date:{' '}
                        <Text style={{ fontFamily: 'Manrope_800ExtraBold', color: '#7C3AED' }}>
                          {(() => {
                            const d = new Date();
                            d.setDate(d.getDate() + activeDuration);
                            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                          })()}
                        </Text>
                        {' '}({activeDuration} days)
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                /* ============================================== */
                /* STANDARD SAVINGS FORM (G-Vault, SafeBox, etc.) */
                /* ============================================== */
                <View>
                  {/* Deposit Amount Input */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Deposit Amount</Text>
                    <View style={styles.amountInputRow}>
                      <Text style={styles.nairaPrefix}>₦</Text>
                      <TextInput
                        style={styles.amountInput}
                        keyboardType="number-pad"
                        value={depositAmount}
                        onChangeText={setDepositAmount}
                        placeholder="0.00"
                        placeholderTextColor={colors.inkFaint}
                      />
                    </View>
                  </View>

                  {/* Quick Amount Pills */}
                  <View style={styles.quickPillsRow}>
                    {['5000', '10000', '25000', '50000', '100000'].map((val) => (
                      <Pressable
                        key={val}
                        onPress={() => setDepositAmount(val)}
                        style={[
                          styles.quickPill,
                          depositAmount === val && styles.quickPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.quickPillText,
                            depositAmount === val && styles.quickPillTextActive,
                          ]}
                        >
                          +{formatNaira(Number(val), 0)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Lock Duration Selector (if fixed plan) */}
                  {selectedPlan?.category === 'fixed' ? (
                    <View style={styles.durationSection}>
                      <Text style={styles.inputLabel}>Lock Duration</Text>
                      <View style={styles.durationPillsRow}>
                        {[
                          { days: 30, label: '30 Days' },
                          { days: 90, label: '90 Days' },
                          { days: 180, label: '180 Days' },
                          { days: 365, label: '1 Year' },
                        ].map((item) => (
                          <Pressable
                            key={item.days}
                            onPress={() => setActiveDuration(item.days)}
                            style={[
                              styles.durationPill,
                              activeDuration === item.days && styles.durationPillActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.durationPillText,
                                activeDuration === item.days && styles.durationPillTextActive,
                              ]}
                            >
                              {item.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Interactive Return Calculator Card */}
              <View style={styles.calcCard}>
                <View style={styles.calcHeader}>
                  <Ionicons name="calculator-outline" size={16} color="#059669" />
                  <Text style={styles.calcTitle}>Projected Earnings Calculator</Text>
                </View>

                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Estimated Interest ({activeDuration} days):</Text>
                  <Text style={styles.calcValueBold}>+{formatNaira(projectedInterest, 2)}</Text>
                </View>

                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Total Maturity Payout:</Text>
                  <Text style={styles.calcValueTotal}>
                    {formatNaira(
                      (parseFloat(depositAmount.replace(/,/g, '')) || 0) + projectedInterest,
                      2
                    )}
                  </Text>
                </View>
              </View>

              {/* Plan Highlights */}
              <View style={styles.featuresList}>
                {selectedPlan?.features.map((feat, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={15} color="#059669" />
                    <Text style={styles.featureItemText}>{feat}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Modal Bottom CTA */}
            <View style={styles.modalCtaContainer}>
              <Button
                title={processingAction ? 'Processing…' : `Save ${formatNaira(parseFloat(depositAmount.replace(/,/g, '')) || 0, 0)} Now`}
                onPress={handleConfirmDeposit}
                disabled={processingAction}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Instant Withdrawal Modal */}
      <Modal
        visible={withdrawModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Withdraw to Naira Wallet</Text>
                <Text style={styles.modalSubtitle}>
                  Requires 4-digit PIN • Instant transfer with 0 fees
                </Text>
              </View>

              <Pressable
                onPress={() => setWithdrawModalVisible(false)}
                hitSlop={10}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.inkMid} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              {/* Select Plan to withdraw from */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Withdraw From Plan</Text>
                <View style={styles.withdrawPlansRow}>
                  {plans.map((p) => {
                    const isSelected = withdrawPlanId === p.id || withdrawPlanId === p.key;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => setWithdrawPlanId(p.id)}
                        style={[
                          styles.withdrawPlanPill,
                          isSelected && styles.withdrawPlanPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.withdrawPlanPillName,
                            isSelected && styles.withdrawPlanPillNameActive,
                          ]}
                        >
                          {p.name}
                        </Text>
                        <Text
                          style={[
                            styles.withdrawPlanPillBal,
                            isSelected && styles.withdrawPlanPillBalActive,
                          ]}
                        >
                          {formatNaira(p.userBalance, 0)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Amount Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Amount to Withdraw</Text>
                <View style={styles.amountInputRow}>
                  <Text style={styles.nairaPrefix}>₦</Text>
                  <TextInput
                    style={styles.amountInput}
                    keyboardType="number-pad"
                    value={withdrawAmount}
                    onChangeText={setWithdrawAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.inkFaint}
                  />
                </View>
              </View>

              {/* Quick Amount Pills */}
              <View style={styles.quickPillsRow}>
                {['2000', '5000', '10000', '25000', '50000'].map((val) => (
                  <Pressable
                    key={val}
                    onPress={() => setWithdrawAmount(val)}
                    style={[
                      styles.quickPill,
                      withdrawAmount === val && styles.quickPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickPillText,
                        withdrawAmount === val && styles.quickPillTextActive,
                      ]}
                    >
                      +{formatNaira(Number(val), 0)}
                    </Text>
                  </Pressable>
                ))}
                {totalSavingsBalance > 0 ? (
                  <Pressable
                    onPress={() => setWithdrawAmount(String(totalSavingsBalance))}
                    style={[
                      styles.quickPill,
                      withdrawAmount === String(totalSavingsBalance) && styles.quickPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickPillText,
                        withdrawAmount === String(totalSavingsBalance) && styles.quickPillTextActive,
                      ]}
                    >
                      All ({formatNaira(totalSavingsBalance, 0)})
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Available Balances Summary */}
              <View style={styles.availableBox}>
                <View style={styles.availableRow}>
                  <Text style={styles.availableLabel}>Total Available Savings:</Text>
                  <Text style={styles.availableValue}>{formatNaira(totalSavingsBalance, 2)}</Text>
                </View>
                <View style={styles.availableRow}>
                  <Text style={styles.availableLabel}>Primary Naira Wallet:</Text>
                  <Text style={styles.availableValue}>{formatNaira(wallet?.balance ?? 0, 2)}</Text>
                </View>
              </View>

              {/* PIN Security Notice */}
              <View style={styles.pinRequiredBanner}>
                <Ionicons name="shield-checkmark" size={16} color="#059669" />
                <Text style={styles.pinRequiredText}>
                  Your 4-digit transaction PIN will be requested on the next screen to authorize this withdrawal.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalCtaContainer}>
              <Button
                title={processingAction ? 'Transferring…' : 'Enter PIN to Withdraw'}
                onPress={handleConfirmWithdraw}
                disabled={processingAction || !parseFloat(withdrawAmount) || parseFloat(withdrawAmount) <= 0}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Break Savings Early Confirmation Modal */}
      <Modal
        visible={breakModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBreakModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalHeaderIconBox,
                    { backgroundColor: breakPreview?.is_before_maturity ? '#FEE2E2' : '#ECFDF5' },
                  ]}
                >
                  <Ionicons
                    name={breakPreview?.is_before_maturity ? 'warning-outline' : 'wallet-outline'}
                    size={20}
                    color={breakPreview?.is_before_maturity ? '#DC2626' : '#059669'}
                  />
                </View>
                <View>
                  <Text style={styles.modalTitle}>
                    {breakPreview?.is_before_maturity ? 'Break Savings Plan' : 'Liquidate Savings'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {breakingGoal?.title || 'Savings Plan'}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setBreakModalVisible(false)}
                hitSlop={10}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.inkMid} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              {loadingBreakPreview ? (
                <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color="#DC2626" />
                  <Text style={{ marginTop: 12, color: colors.inkMuted, fontSize: 13, fontFamily: 'Manrope_500Medium' }}>
                    Calculating liquidation breakdown…
                  </Text>
                </View>
              ) : (
                <>
                  {/* Warning Box (only for early break before maturity) */}
                  {breakPreview?.is_before_maturity ? (
                    <View style={styles.breakWarningBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                        <Ionicons name="alert-circle" size={22} color="#DC2626" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.breakWarningTitle}>Early Withdrawal Warning</Text>
                          <Text style={styles.breakWarningBody}>
                            {breakPreview?.warning_message ||
                              `Breaking this savings plan early will attract a ${breakPreview?.fee_percentage ?? 2.5}% fee on your eligible savings principal. You will also lose all interest earned on this plan. You will receive ${formatNaira(breakPreview?.net_payout ?? 0, 2)} from a principal of ${formatNaira(breakPreview?.principal ?? 0, 2)}. Do you want to continue?`}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.breakWarningBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                        <Ionicons name="checkmark-circle" size={22} color="#059669" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.breakWarningTitle, { color: '#065F46' }]}>Plan Matured</Text>
                          <Text style={[styles.breakWarningBody, { color: '#047857' }]}>
                            This savings plan has reached maturity. You will receive 100% of your principal and accrued interest with zero penalty fees.
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Financial Breakdown Table */}
                  <View style={styles.breakBreakdownCard}>
                    <Text style={styles.breakBreakdownHeader}>LIQUIDATION BREAKDOWN</Text>

                    <View style={styles.breakDetailRow}>
                      <Text style={styles.breakDetailLabel}>Savings Plan</Text>
                      <Text style={styles.breakDetailValue}>{breakPreview?.plan_name || breakingGoal?.planName}</Text>
                    </View>

                    <View style={styles.breakDetailRow}>
                      <Text style={styles.breakDetailLabel}>Current Savings Balance</Text>
                      <Text style={styles.breakDetailValue}>
                        {formatNaira(breakPreview?.balance ?? breakingGoal?.savedAmount ?? 0, 2)}
                      </Text>
                    </View>

                    <View style={styles.breakDetailRow}>
                      <Text style={styles.breakDetailLabel}>Eligible Principal</Text>
                      <Text style={styles.breakDetailValueHighlight}>
                        {formatNaira(breakPreview?.principal ?? 0, 2)}
                      </Text>
                    </View>

                    <View style={styles.breakDetailRow}>
                      <Text style={styles.breakDetailLabel}>Interest Earned to Date</Text>
                      <Text style={[styles.breakDetailValue, { color: '#059669' }]}>
                        +{formatNaira(breakPreview?.accrued_interest ?? 0, 2)}
                      </Text>
                    </View>

                    <View style={styles.breakDivider} />

                    {breakPreview?.is_before_maturity ? (
                      <>
                        <View style={styles.breakDetailRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="remove-circle-outline" size={14} color="#DC2626" />
                            <Text style={styles.breakDetailLabelPenalty}>
                              Early-Break Fee ({breakPreview?.fee_percentage ?? 2.5}%)
                            </Text>
                          </View>
                          <Text style={styles.breakDetailPenaltyValue}>
                            -{formatNaira(breakPreview?.early_break_fee ?? 0, 2)}
                          </Text>
                        </View>

                        <View style={styles.breakDetailRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="remove-circle-outline" size={14} color="#DC2626" />
                            <Text style={styles.breakDetailLabelPenalty}>Interest Forfeited (100%)</Text>
                          </View>
                          <Text style={styles.breakDetailPenaltyValue}>
                            -{formatNaira(breakPreview?.forfeited_interest ?? 0, 2)}
                          </Text>
                        </View>

                        <View style={styles.breakDivider} />
                      </>
                    ) : null}

                    <View style={[styles.breakDetailRow, { paddingTop: 6 }]}>
                      <Text style={styles.breakNetPayoutLabel}>Final Amount to Wallet</Text>
                      <Text style={styles.breakNetPayoutValue}>
                        {formatNaira(breakPreview?.net_payout ?? 0, 2)}
                      </Text>
                    </View>
                  </View>

                  {/* Irreversibility Banner */}
                  <View style={styles.irreversibleBanner}>
                    <Ionicons name="information-circle-outline" size={16} color="#64748B" />
                    <Text style={styles.irreversibleText}>
                      This operation is irreversible. The final payout will be credited to your primary Naira wallet immediately and this savings plan will be permanently closed.
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            {/* Modal Bottom CTA */}
            <View style={styles.breakModalCtaContainer}>
              <Pressable
                style={styles.breakCancelBtn}
                onPress={() => setBreakModalVisible(false)}
                disabled={processingAction}
              >
                <Text style={styles.breakCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.breakConfirmBtn,
                  !breakPreview?.is_before_maturity && { backgroundColor: '#059669' },
                ]}
                onPress={handleConfirmBreak}
                disabled={processingAction || loadingBreakPreview}
              >
                <Text style={styles.breakConfirmBtnText}>
                  {processingAction ? 'Processing…' : (breakPreview?.is_before_maturity ? 'Confirm Break' : 'Confirm Withdrawal')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenBg: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  gradientHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 380,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  navBrandDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#23D3A5',
  },
  navBrandText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: colors.white,
  },
  navRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 48,
  },
  portfolioCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  portfolioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  portfolioTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  portfolioTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  rateBadge: {
    backgroundColor: 'rgba(35, 211, 165, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#23D3A5',
  },
  rateBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10.5,
    color: '#23D3A5',
  },
  portfolioBalanceText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 34,
    color: colors.white,
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  statsPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 16,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#23D3A5',
  },
  statPillLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  statPillValue: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11.5,
    color: colors.white,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#23D3A5',
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#23D3A5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13.5,
    color: '#062B22',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 13,
    borderRadius: 14,
  },
  secondaryActionText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13.5,
    color: colors.white,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  noticeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeTextCol: {
    flex: 1,
  },
  noticeTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12.5,
    color: colors.navy,
  },
  noticeSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionHeaderWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: colors.navy,
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: '#EEF2FB',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: colors.navy,
  },
  sectionSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },
  plansContainer: {
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  planCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  planNameCol: {
    flex: 1,
  },
  planTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14.5,
    color: colors.navy,
  },
  planBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  planBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  planTagline: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11.5,
    color: colors.inkMuted,
    marginTop: 2,
  },
  planRateCol: {
    alignItems: 'flex-end',
  },
  planRateText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14.5,
  },
  planRateLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    color: colors.inkMuted,
  },
  planFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  planBalanceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planBalanceLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
    color: colors.inkMuted,
  },
  planBalanceValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13.5,
    color: colors.navy,
  },
  planCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  planCtaText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12.5,
  },
  goalsList: {
    gap: 12,
    marginBottom: 24,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF2',
  },
  goalCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  goalTitleGroup: {
    flex: 1,
  },
  goalTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13.5,
    color: colors.navy,
  },
  goalPlanSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  goalDaysPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  goalDaysText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10.5,
    color: colors.navy,
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: '#EEF2F6',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalProgressDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  goalSavedAmount: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12.5,
    color: colors.navy,
  },
  goalTargetAmount: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11.5,
    color: colors.inkMuted,
  },
  goalPercentText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
  },
  trustBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 14,
    borderRadius: 16,
  },
  trustIconHalo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustTextCol: {
    flex: 1,
  },
  trustTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: '#065F46',
  },
  trustSubtitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10.5,
    color: '#047857',
    marginTop: 2,
    lineHeight: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 34,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalHeaderIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: colors.navy,
  },
  modalSubtitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
    color: '#059669',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    marginTop: 16,
  },
  inputLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: colors.inkMid,
    marginBottom: 6,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#FAFCFF',
  },
  nairaPrefix: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    color: colors.navy,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    color: colors.navy,
    paddingVertical: 12,
  },
  quickPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 14,
  },
  quickPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quickPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  quickPillText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11.5,
    color: colors.navy,
  },
  quickPillTextActive: {
    color: '#059669',
  },
  durationSection: {
    marginBottom: 14,
  },
  durationPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  durationPillActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  durationPillText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11.5,
    color: colors.navy,
  },
  durationPillTextActive: {
    color: '#B45309',
  },
  calcCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  calcTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: colors.navy,
  },
  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  calcLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: colors.inkMuted,
  },
  calcValueBold: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13.5,
    color: '#059669',
  },
  calcValueTotal: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14.5,
    color: colors.navy,
  },
  featuresList: {
    gap: 6,
    paddingBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureItemText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: colors.inkMid,
  },
  modalCtaContainer: {
    marginTop: 10,
  },
  availableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  availableLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: colors.inkMuted,
  },
  availableValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: colors.navy,
  },
  planCardDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.72,
  },
  planTitleDisabled: {
    color: '#64748B',
  },
  withdrawPlansRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  withdrawPlanPill: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  withdrawPlanPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  withdrawPlanPillName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: colors.navy,
  },
  withdrawPlanPillNameActive: {
    color: '#059669',
  },
  withdrawPlanPillBal: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12.5,
    color: colors.inkMuted,
    marginTop: 2,
  },
  withdrawPlanPillBalActive: {
    color: '#047857',
  },
  availableBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    marginBottom: 12,
  },
  pinRequiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  pinRequiredText: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: '#065F46',
    lineHeight: 15,
  },
  catChipsRow: {
    paddingVertical: 4,
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  catChipIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catChipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: colors.navy,
  },
  textInputRegular: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    color: colors.navy,
    marginTop: 6,
  },
  maturityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 10,
  },
  maturityBannerText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
    color: '#4C1D95',
  },
  goalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  breakSavingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
  },
  breakSavingsBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
  },
  breakWarningBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 14,
    marginVertical: 10,
  },
  breakWarningTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13.5,
    color: '#991B1B',
  },
  breakWarningBody: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12.5,
    color: '#7F1D1D',
    lineHeight: 18,
    marginTop: 4,
  },
  breakBreakdownCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginVertical: 6,
  },
  breakBreakdownHeader: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  breakDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  breakDetailLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: '#475569',
  },
  breakDetailValue: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#0F172A',
  },
  breakDetailValueHighlight: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13.5,
    color: '#0284C7',
  },
  breakDetailLabelPenalty: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
    color: '#DC2626',
  },
  breakDetailPenaltyValue: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#DC2626',
  },
  breakDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 6,
  },
  breakNetPayoutLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: '#0E2050',
  },
  breakNetPayoutValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16.5,
    color: '#059669',
  },
  irreversibleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginTop: 6,
    marginBottom: 10,
  },
  irreversibleText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: '#64748B',
    flex: 1,
    lineHeight: 15,
  },
  breakModalCtaContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  breakCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakCancelBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: '#475569',
  },
  breakConfirmBtn: {
    flex: 1.6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakConfirmBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
