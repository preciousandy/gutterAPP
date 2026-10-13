import { api } from './client';

export interface FeeSetting {
  key?: string;
  service_key?: string;
  label?: string;
  category?: string;
  category_label?: string;
  icon?: string;
  is_enabled: boolean;
  flat_fee: number;
  percent_fee: number;
  description?: string;
  updated_by?: string;
  updated_at?: string | null;
}

export interface AppConfig {
  status?: string;
  features?: {
    feature_airtime?: boolean;
    feature_data?: boolean;
    feature_cable_tv?: boolean;
    feature_electricity?: boolean;
    feature_bank_transfer?: boolean;
    feature_crypto_deposit?: boolean;
    feature_crypto_swap?: boolean;
    feature_virtual_cards?: boolean;
    feature_peer_transfer?: boolean;
    kyc_require_for_transfers?: boolean;
    kyc_require_for_bills?: boolean;
    kyc_require_for_crypto?: boolean;
    kyc_strict_name_match?: boolean;
    system_maintenance_mode?: boolean;
    system_announcement_active?: boolean;
    [key: string]: boolean | undefined;
  };
  fees?: Record<string, FeeSetting>;
  maintenance: boolean;
}

/**
 * Fetch real-time mobile app configuration and button toggles managed by the Admin Dashboard.
 */
export async function fetchAppConfig(): Promise<AppConfig> {
  const res = await api.get<AppConfig>('/app/config');
  return res.data;
}
