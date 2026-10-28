import { api } from './client';
import type { Transaction } from '@/types';

export type NetworkProvider = 'MTN' | 'Airtel' | 'Glo' | '9mobile';

export interface AirtimeDataPurchasePayload {
  category: 'airtime' | 'data';
  network: NetworkProvider;
  phone: string;
  amount: number;
  plan_name?: string;
  variation_code?: string;
  pin: string;
}

export interface ElectricityPurchasePayload {
  category: 'electricity';
  disco: string;
  meter_number: string;
  meter_type: 'prepaid' | 'postpaid';
  amount: number;
  customer_name?: string;
  phone?: string;
  phone_number?: string;
  pin: string;
  save_beneficiary?: boolean;
  beneficiary_nickname?: string;
}

export interface BettingPurchasePayload {
  category: 'betting';
  biller_code: string;
  biller_name?: string;
  customer_id: string;
  customer_name?: string;
  amount: number;
  pin: string;
  idempotency_key?: string;
  save_beneficiary?: boolean;
  beneficiary_nickname?: string;
}

export interface CablePurchasePayload {
  category: 'cable';
  cable_name: string;
  smartcard_number: string;
  cable_plan: string | number;
  package_name?: string;
  customer_name?: string;
  amount: number;
  months?: number;
  pin: string;
  idempotency_key?: string;
  save_beneficiary?: boolean;
  beneficiary_nickname?: string;
}

export type BillPurchasePayload =
  | AirtimeDataPurchasePayload
  | ElectricityPurchasePayload
  | BettingPurchasePayload
  | CablePurchasePayload;

export interface BettingBillerItem {
  code: string;
  name: string;
  min_amount: number;
  max_amount: number;
}

export interface VerifyBettingResponse {
  success: boolean;
  name?: string;
  customer_id?: string;
  biller_code?: string;
  message?: string;
}

export interface ElectricityProviderItem {
  name: string;
  code: string;
  min_amount_prepaid?: number;
  min_amount_postpaid?: number;
}

export interface VerifyMeterResponse {
  success: boolean;
  name: string;
  address: string;
  tariff: string;
  meter_number: string;
  disco: string;
  meter_type: 'prepaid' | 'postpaid';
  message?: string;
}

export interface BillPlanItem {
  variation_code: string;
  name: string;
  variation_amount: string;
  fixedPrice: string;
  id?: number | string;
  size?: string;
  validity?: string;
  period?: 'daily' | 'weekly' | 'monthly';
  price?: number;
  plantype?: string;
}

export interface BillPlansResponse {
  network: NetworkProvider;
  provider: string;
  plans: BillPlanItem[];
  grouped?: {
    daily: BillPlanItem[];
    weekly: BillPlanItem[];
    monthly: BillPlanItem[];
  };
}

export async function getBillPlans(
  network: NetworkProvider,
  period?: 'daily' | 'weekly' | 'monthly'
): Promise<BillPlansResponse> {
  const { data } = await api.get<BillPlansResponse>('/bills/plans', {
    params: { network, period },
  });
  return data;
}

export async function getElectricityProviders(): Promise<ElectricityProviderItem[]> {
  const { data } = await api.get<{ success: boolean; providers: ElectricityProviderItem[] }>(
    '/bills/electricity/providers'
  );
  return data.providers || [];
}

export async function verifyElectricityMeter(
  disco: string,
  meterNumber: string,
  meterType: 'prepaid' | 'postpaid' = 'prepaid'
): Promise<VerifyMeterResponse> {
  const { data } = await api.post<VerifyMeterResponse>('/bills/electricity/verify', {
    disco,
    meter_number: meterNumber,
    meter_type: meterType,
  });
  return data;
}

export async function getBettingBillers(): Promise<BettingBillerItem[]> {
  const { data } = await api.get<{ success: boolean; billers: BettingBillerItem[] }>(
    '/bills/betting/billers'
  );
  return data.billers || [];
}

export async function verifyBettingAccount(
  billerCode: string,
  customerId: string
): Promise<VerifyBettingResponse> {
  const { data } = await api.post<VerifyBettingResponse>('/bills/betting/verify', {
    biller_code: billerCode,
    customer_id: customerId,
  });
  return data;
}

export interface CablePlanItem {
  id: number | string;
  cable_name: string;
  product_name: string;
  variation_code: string;
  amount: number;
}

export interface CableProviderItem {
  provider: string;
  provider_code: string;
  plans: {
    name: string;
    code: string;
    amount: number;
    duration?: string;
    description?: string;
  }[];
}

export interface VerifyCableResponse {
  success: boolean;
  name?: string;
  smartcard_number?: string;
  cable_name?: string;
  due_date?: string;
  status?: string;
  message?: string;
}

export async function getCablePlans(provider?: string): Promise<{
  success: boolean;
  plans: CablePlanItem[];
  providers?: CableProviderItem[];
}> {
  const { data } = await api.get<{
    success: boolean;
    plans: CablePlanItem[];
    providers?: CableProviderItem[];
  }>('/bills/cable/plans', {
    params: provider ? { provider } : undefined,
  });
  return data;
}

export async function verifyCableSmartcard(
  cableName: string,
  smartcardNumber: string
): Promise<VerifyCableResponse> {
  const { data } = await api.post<VerifyCableResponse>('/bills/cable/verify', {
    cable_name: cableName,
    smartcard_number: smartcardNumber,
  });
  return data;
}

export async function purchaseBill(
  payload: BillPurchasePayload
): Promise<Transaction & { token?: string | null; units?: string | null }> {
  const { data } = await api.post<{
    message: string;
    data: Transaction;
    token?: string | null;
    units?: string | null;
  }>('/bills/purchase', payload, {
    timeout: 75000,
  });

  return {
    ...data.data,
    token: data.token ?? data.data.token ?? null,
    units: data.units ?? data.data.units ?? null,
  };
}

export function detectNigerianNetwork(phone: string): NetworkProvider | null {
  const clean = phone.replace(/[^0-9]/g, '');
  let normalized = clean;
  if (clean.startsWith('234') && clean.length >= 13) {
    normalized = '0' + clean.slice(3);
  } else if (clean.length === 10 && !clean.startsWith('0')) {
    normalized = '0' + clean;
  }

  // Exempt universal test numbers (0801...)
  if (normalized.startsWith('0801')) return null;

  const prefixes: Record<NetworkProvider, string[]> = {
    MTN: [
      '0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814',
      '0903', '0906', '0913', '0916', '0704', '07025', '07026',
    ],
    Glo: [
      '0805', '0807', '0705', '0815', '0811', '0905', '0915',
    ],
    Airtel: [
      '0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904',
      '0907', '0912', '0911',
    ],
    '9mobile': [
      '0809', '0817', '0818', '0909', '0908',
    ],
  };

  const p5 = normalized.slice(0, 5);
  for (const [net, list] of Object.entries(prefixes)) {
    if (list.includes(p5)) return net as NetworkProvider;
  }

  const p4 = normalized.slice(0, 4);
  for (const [net, list] of Object.entries(prefixes)) {
    if (list.includes(p4)) return net as NetworkProvider;
  }

  return null;
}

