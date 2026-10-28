import { api } from './client';
import type { Transaction } from '@/types';

export interface SavingsPlanDto {
  id: number;
  key: string;
  name: string;
  category: 'gvault' | 'target' | 'fixed' | 'spend_save';
  tagline: string;
  annual_rate: number;
  badge: string;
  badge_bg: string;
  badge_text: string;
  icon: string;
  theme_color: string;
  theme_bg: string;
  description: string;
  features: string[];
  min_deposit: number;
  lock_period: string;
  is_enabled: boolean;
  allow_withdrawals: boolean;
  user_balance?: number;
  early_break_fee_percentage?: number;
}

export interface TargetCategoryDto {
  id: number;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  is_enabled: boolean;
  order_index: number;
}

export interface SavingsGoalDto {
  id: number;
  title: string;
  plan_id?: number;
  plan_name: string;
  plan_key: string;
  category_id?: number | null;
  category_name?: string | null;
  category_icon?: string | null;
  saved_amount: number;
  target_amount: number;
  principal?: number;
  total_interest_earned?: number;
  annual_rate: number;
  maturity_date?: string | null;
  maturity_date_formatted?: string | null;
  days_remaining: number | null;
  is_locked?: boolean;
  early_break_fee_percentage?: number;
  color: string;
}

export interface SavingsDashboardResponse {
  total_savings_balance: number;
  total_interest_earned: number;
  yesterday_interest: number;
  wallet_balance: number;
  plans: SavingsPlanDto[];
  target_categories?: TargetCategoryDto[];
  goals: SavingsGoalDto[];
}

export interface DepositSavingsPayload {
  plan_id: string | number;
  user_saving_id?: number;
  target_category_id?: number;
  target_amount?: number;
  amount: number;
  title?: string;
  duration_days?: number;
  maturity_date?: string;
  idempotency_key?: string;
}

export interface WithdrawSavingsPayload {
  plan_id?: string | number;
  user_saving_id?: number;
  amount: number;
  pin: string;
  idempotency_key?: string;
  break_early?: boolean;
}

export interface BreakSavingsPayload {
  user_saving_id?: number;
  plan_id?: string | number;
  pin: string;
  idempotency_key?: string;
}

export interface BreakSavingsPreviewDto {
  user_saving_id: number;
  title: string;
  plan_name: string;
  plan_key: string;
  balance: number;
  principal: number;
  accrued_interest: number;
  forfeited_interest: number;
  fee_percentage: number;
  early_break_fee: number;
  net_payout: number;
  is_before_maturity: boolean;
  locked_until?: string | null;
  locked_until_formatted?: string | null;
  warning_message?: string | null;
}

export interface BreakSavingsResult {
  savings_balance: number;
  wallet_balance: number;
  principal: number;
  early_break_fee: number;
  early_break_fee_percentage: number;
  forfeited_interest: number;
  net_payout: number;
  status: string;
  is_before_maturity: boolean;
  transaction: Transaction;
}

export interface SavingsActionResult {
  savings_balance: number;
  wallet_balance: number;
  transaction: Transaction;
}

export async function getSavingsPlans(): Promise<SavingsPlanDto[]> {
  const { data } = await api.get<{ success: boolean; data: SavingsPlanDto[] }>('/savings/plans');
  return data.data;
}

export async function getTargetCategories(): Promise<TargetCategoryDto[]> {
  const { data } = await api.get<{ success: boolean; data: TargetCategoryDto[] }>('/savings/target-categories');
  return data.data;
}

export async function getSavingsDashboard(): Promise<SavingsDashboardResponse> {
  const { data } = await api.get<{ success: boolean; data: SavingsDashboardResponse }>('/savings/dashboard');
  return data.data;
}

export async function getBreakSavingsPreview(
  param: number | { user_saving_id?: number; plan_id?: string | number }
): Promise<BreakSavingsPreviewDto> {
  if (typeof param === 'number') {
    const { data } = await api.get<{ success: boolean; data: BreakSavingsPreviewDto }>(
      `/savings/${param}/break-preview`
    );
    return data.data;
  }
  const { data } = await api.post<{ success: boolean; data: BreakSavingsPreviewDto }>(
    '/savings/break-preview',
    param
  );
  return data.data;
}

export async function depositSavings(payload: DepositSavingsPayload): Promise<SavingsActionResult> {
  const idempotency_key = payload.idempotency_key || `sav_dep_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const { data } = await api.post<{ success: boolean; message: string; data: SavingsActionResult }>('/savings/deposit', {
    ...payload,
    idempotency_key,
  });
  return data.data;
}

export async function withdrawSavings(payload: WithdrawSavingsPayload): Promise<SavingsActionResult> {
  const idempotency_key = payload.idempotency_key || `sav_wth_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const { data } = await api.post<{ success: boolean; message: string; data: SavingsActionResult }>('/savings/withdraw', {
    ...payload,
    idempotency_key,
  });
  return data.data;
}

export async function breakSavings(payload: BreakSavingsPayload): Promise<BreakSavingsResult> {
  const idempotency_key = payload.idempotency_key || `sav_brk_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const { data } = await api.post<{ success: boolean; message: string; data: BreakSavingsResult }>('/savings/break', {
    ...payload,
    idempotency_key,
  });
  return data.data;
}
