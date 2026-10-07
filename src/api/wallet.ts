import { api } from './client';
import type { DashboardData, Paginated, Transaction, TransactionDirection } from '@/types';

export async function getDashboard(): Promise<DashboardData> {
  const { data } = await api.get<{ data: DashboardData }>('/dashboard');
  return data.data;
}

export interface TransactionFilters {
  direction?: TransactionDirection;
  search?: string;
  page?: number;
  per_page?: number;
  from_date?: string;
  to_date?: string;
}

export async function listTransactions(
  filters: TransactionFilters = {}
): Promise<Paginated<Transaction>> {
  const { data } = await api.get<Paginated<Transaction>>('/transactions', { params: filters });
  return data;
}

export async function getTransaction(id: number | string): Promise<Transaction> {
  const { data } = await api.get<{ data: Transaction }>(`/transactions/${id}`);
  return data.data;
}
