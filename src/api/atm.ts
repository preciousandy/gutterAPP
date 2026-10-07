import { api } from './client';
import type { AtmWithdrawal } from '@/types';

export async function createWithdrawal(amount: number, pin: string): Promise<AtmWithdrawal> {
  const { data } = await api.post<{ data: AtmWithdrawal }>('/atm-withdrawals', { amount, pin });
  return data.data;
}

export async function cancelWithdrawal(id: number): Promise<void> {
  await api.delete(`/atm-withdrawals/${id}`);
}
