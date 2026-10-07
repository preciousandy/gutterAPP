import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { NetworkProvider } from './bills';

export interface AirtimeBeneficiary {
  phone: string;
  network: NetworkProvider;
  name?: string;
  lastUsedAt: string;
  useCount: number;
}

const STORAGE_KEY = 'gutter_airtime_data_beneficiaries';

/**
 * Retrieve all cached airtime/data beneficiaries from local secure storage.
 */
export async function getAirtimeBeneficiaries(): Promise<AirtimeBeneficiary[]> {
  try {
    if (Platform.OS === 'web') {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      return raw ? JSON.parse(raw) : [];
    }
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save or update a phone number with its carrier after a recharge.
 * Increments useCount and updates lastUsedAt, sorting by most recent.
 */
export async function saveAirtimeBeneficiary(
  phone: string,
  network: NetworkProvider,
  name?: string
): Promise<AirtimeBeneficiary[]> {
  try {
    const list = await getAirtimeBeneficiaries();
    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) return list;

    const existingIndex = list.findIndex((b) => b.phone === cleanPhone);
    let updated: AirtimeBeneficiary[];

    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      const item: AirtimeBeneficiary = {
        ...existing,
        network, // Update network in case of porting/changes
        name: name || existing.name,
        lastUsedAt: new Date().toISOString(),
        useCount: (existing.useCount || 1) + 1,
      };
      // Place most recently used at the top
      updated = [item, ...list.filter((_, idx) => idx !== existingIndex)];
    } else {
      const item: AirtimeBeneficiary = {
        phone: cleanPhone,
        network,
        name,
        lastUsedAt: new Date().toISOString(),
        useCount: 1,
      };
      updated = [item, ...list];
    }

    // Keep top 20 cached numbers
    updated = updated.slice(0, 20);

    const raw = JSON.stringify(updated);
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, raw);
      }
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, raw);
    }

    return updated;
  } catch {
    return [];
  }
}

/**
 * Delete a cached phone number.
 */
export async function removeAirtimeBeneficiary(phone: string): Promise<AirtimeBeneficiary[]> {
  try {
    const list = await getAirtimeBeneficiaries();
    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
    const updated = list.filter((b) => b.phone !== cleanPhone);
    const raw = JSON.stringify(updated);

    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, raw);
      }
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, raw);
    }

    return updated;
  } catch {
    return [];
  }
}
