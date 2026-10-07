import { api } from './client';
import type { TransactionLimitsData } from '@/types';

/**
 * Fetch real-time transaction limits, daily outflow usage, and tier status.
 */
export async function getTransactionLimits(): Promise<TransactionLimitsData> {
  const { data } = await api.get<{ data: TransactionLimitsData }>('/limits');
  return data.data;
}

/**
 * Default fallback limits if offline or awaiting initial load.
 */
export function getDefaultLimitsForTier(tier: number = 1): TransactionLimitsData {
  const isTier2 = tier >= 2;
  const isTier3 = tier >= 3;

  return {
    current_tier: tier,
    tier_name: isTier3 ? 'Tier 3 (Enhanced)' : isTier2 ? 'Tier 2 (Verified)' : 'Tier 1 (Basic)',
    short_name: `Tier ${tier}`,
    daily_limit: isTier3 ? 25000000 : isTier2 ? 5000000 : 50000,
    daily_spent: 0,
    daily_remaining: isTier3 ? 25000000 : isTier2 ? 5000000 : 50000,
    single_limit: isTier3 ? 5000000 : isTier2 ? 1000000 : 20000,
    max_balance: isTier2 ? null : 300000,
    percentage_used: 0,
    kyc_status: isTier2 ? 'verified' : 'unverified',
    tiers: [
      {
        tier: 1,
        name: 'Tier 1 (Basic)',
        short_name: 'Tier 1',
        daily_limit: 50000,
        single_limit: 20000,
        max_balance: 300000,
        requirements: 'Email & Phone Number verified',
        benefits: [
          'Send up to ₦20,000 per transaction',
          '₦50,000 daily transfer limit',
          'Hold up to ₦300,000 wallet balance',
        ],
        status: tier === 1 ? 'active' : 'completed',
        is_current: tier === 1,
      },
      {
        tier: 2,
        name: 'Tier 2 (Verified)',
        short_name: 'Tier 2',
        daily_limit: 5000000,
        single_limit: 1000000,
        max_balance: null,
        requirements: 'Valid ID (NIN / BVN / Passport) + Face Verification',
        benefits: [
          'Send up to ₦1,000,000 per transaction',
          '₦5,000,000 daily transfer limit',
          'Unlimited wallet balance holding',
          'Virtual & Physical cards access',
        ],
        status: tier === 2 ? 'active' : tier > 2 ? 'completed' : 'next',
        is_current: tier === 2,
      },
      {
        tier: 3,
        name: 'Tier 3 (Enhanced)',
        short_name: 'Tier 3',
        daily_limit: 25000000,
        single_limit: 5000000,
        max_balance: null,
        requirements: 'Proof of Address (Utility bill) + Bank statement',
        benefits: [
          'Send up to ₦5,000,000 per transaction',
          '₦25,000,000 daily transfer limit',
          'Unlimited wallet balance holding',
          'Dedicated account manager & VIP support',
        ],
        status: tier === 3 ? 'active' : 'locked',
        is_current: tier === 3,
      },
    ],
  };
}
