import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { api } from './client';
import type { Beneficiary } from '@/types';

const BENEFICIARIES_STORAGE_KEY = 'gutter_saved_beneficiaries';

async function getLocalBeneficiaries(): Promise<Beneficiary[]> {
  try {
    if (Platform.OS === 'web') {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(BENEFICIARIES_STORAGE_KEY) : null;
      return raw ? JSON.parse(raw) : [];
    }
    const raw = await SecureStore.getItemAsync(BENEFICIARIES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function setLocalBeneficiaries(items: Beneficiary[]): Promise<void> {
  try {
    const raw = JSON.stringify(items);
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(BENEFICIARIES_STORAGE_KEY, raw);
      return;
    }
    await SecureStore.setItemAsync(BENEFICIARIES_STORAGE_KEY, raw);
  } catch {
    // Ignore storage errors on restricted environments
  }
}

export async function listBeneficiaries(category?: string): Promise<Beneficiary[]> {
  try {
    const url = category ? `/beneficiaries?category=${encodeURIComponent(category)}` : '/beneficiaries';
    const { data } = await api.get<{ data: Beneficiary[] }>(url);
    if (data?.data) {
      if (!category) {
        void setLocalBeneficiaries(data.data);
      }
      return data.data;
    }
  } catch {
    // Fall back to offline storage
  }

  const all = await getLocalBeneficiaries();
  if (category) {
    return all.filter((b) => (b.category || 'transfer') === category);
  }
  return all;
}

export async function saveBeneficiary(payload: {
  name: string;
  bank_name: string;
  bank_code?: string | null;
  account_number?: string | null;
  category?: 'transfer' | 'electricity' | 'cable' | 'betting' | string;
  nickname?: string | null;
  meter_type?: 'prepaid' | 'postpaid' | null;
}): Promise<Beneficiary> {
  let saved: Beneficiary | null = null;
  try {
    const { data } = await api.post<{ data: Beneficiary }>('/beneficiaries', payload);
    if (data?.data) {
      saved = data.data;
    }
  } catch {
    // If backend is unreachable or offline, construct local entity
  }

  if (!saved) {
    saved = {
      id: Date.now(),
      name: payload.name,
      nickname: payload.nickname ?? null,
      bank_name: payload.bank_name,
      bank_code: payload.bank_code ?? null,
      account_number: payload.account_number ?? null,
      category: payload.category ?? 'transfer',
      meter_type: payload.meter_type ?? null,
      created_at: new Date().toISOString(),
    };
  }

  // Update local storage
  const current = await getLocalBeneficiaries();
  const existingIdx = current.findIndex(
    (b) =>
      b.account_number === saved!.account_number &&
      (b.bank_code === saved!.bank_code || b.bank_name.toLowerCase() === saved!.bank_name.toLowerCase()) &&
      (b.category || 'transfer') === (saved!.category || 'transfer')
  );
  if (existingIdx >= 0) {
    current[existingIdx] = saved;
  } else {
    current.unshift(saved);
  }
  await setLocalBeneficiaries(current);

  return saved;
}

export async function deleteBeneficiary(id: number): Promise<void> {
  try {
    await api.delete(`/beneficiaries/${id}`);
  } catch {
    // Continue and remove locally
  }

  const current = await getLocalBeneficiaries();
  const filtered = current.filter((b) => b.id !== id);
  await setLocalBeneficiaries(filtered);
}

export async function isBeneficiarySavedLocally(name: string, bankName?: string | null): Promise<boolean> {
  const current = await getLocalBeneficiaries();
  return current.some(
    (b) =>
      b.name.trim().toLowerCase() === name.trim().toLowerCase() &&
      (!bankName || b.bank_name.trim().toLowerCase() === bankName.trim().toLowerCase())
  );
}
