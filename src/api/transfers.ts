import { api } from './client';
import type { AccountLookup, Bank, GutterUserLookup, Transaction, TransferPayload } from '@/types';

export async function listBanks(): Promise<Bank[]> {
  const { data } = await api.get<{ data: Bank[] }>('/banks');
  return data.data;
}

export async function verifyAccount(
  bank_code: string,
  account_number: string
): Promise<AccountLookup> {
  const { data } = await api.post<{ data: AccountLookup }>('/transfers/verify-account', {
    bank_code,
    account_number,
  });
  return data.data;
}

export async function resolveGutterUser(identifier: string): Promise<GutterUserLookup> {
  const { data } = await api.post<{ data: GutterUserLookup }>('/transfers/resolve-gutter-user', {
    identifier,
  });
  return data.data;
}

export async function createTransfer(payload: TransferPayload): Promise<Transaction> {
  const { data } = await api.post<{ data: Transaction }>('/transfers', payload);
  return data.data;
}
