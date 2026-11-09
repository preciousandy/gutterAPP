import { api } from './client';
import type {
  Coin,
  CryptoAddressesResponse,
  CryptoBalancesResponse,
  CryptoNetwork,
  CryptoQuote,
  CryptoSendFee,
  CryptoSendPayload,
  CryptoTransactionRecord,
  Paginated,
  SimulatedDepositResponse,
  Transaction,
} from '@/types';

export async function getMarket(): Promise<{
  coins: Coin[];
  portfolio_value: number;
  portfolio_change: number;
  auto_convert_crypto?: boolean;
}> {
  const { data } = await api.get<{
    data: {
      coins: Coin[];
      portfolio_value: number;
      portfolio_change: number;
      auto_convert_crypto?: boolean;
    };
  }>('/crypto/market');
  return data.data;
}

export async function getCryptoBalances(): Promise<CryptoBalancesResponse> {
  const { data } = await api.get<{ data: CryptoBalancesResponse }>('/crypto/balances');
  return data.data;
}

export async function getCryptoAddresses(symbol: Coin['symbol'] = 'USDT'): Promise<CryptoAddressesResponse> {
  const { data } = await api.get<{ data: CryptoAddressesResponse }>('/crypto/addresses', {
    params: { symbol },
  });
  return data.data;
}

export async function toggleAutoConvert(enabled?: boolean): Promise<{ message: string; auto_convert_crypto: boolean }> {
  const { data } = await api.post<{ message: string; auto_convert_crypto: boolean }>(
    '/crypto/auto-convert',
    enabled !== undefined ? { enabled } : {}
  );
  return data;
}

export async function simulateDeposit(params: {
  symbol: Coin['symbol'];
  network: CryptoNetwork;
  amount: number;
}): Promise<SimulatedDepositResponse> {
  const { data } = await api.post<SimulatedDepositResponse>('/crypto/receive/simulate', params);
  return data;
}

export async function getQuote(params: {
  side: 'buy' | 'sell';
  symbol: Coin['symbol'];
  /** For buys: NGN to spend (or crypto if amount_type='crypto'). For sells: crypto amount to sell. */
  amount: number;
  amount_type?: 'fiat' | 'crypto';
}): Promise<CryptoQuote> {
  const { data } = await api.post<{ data: CryptoQuote }>('/crypto/quote', params);
  return data.data;
}

export async function placeOrder(params: {
  side: 'buy' | 'sell';
  symbol: Coin['symbol'];
  amount: number;
  pin: string;
  idempotency_key?: string;
}): Promise<Transaction> {
  const { data } = await api.post<{ data: Transaction }>('/crypto/orders', params);
  return data.data;
}

export async function getSendFee(params: {
  symbol: Coin['symbol'];
  destination_type: 'gutter_user' | 'external_address';
  network?: string;
  amount?: number;
}): Promise<CryptoSendFee> {
  const { data } = await api.get<{ data: CryptoSendFee }>('/crypto/send/fee', {
    params,
  });
  return data.data;
}

export async function validateCryptoAddress(params: {
  symbol: Coin['symbol'];
  network: string;
  address: string;
}): Promise<{ valid: boolean; message: string }> {
  const { data } = await api.post<{ data: { valid: boolean; message: string } }>(
    '/crypto/validate-address',
    params
  );
  return data.data;
}

export async function sendCrypto(params: CryptoSendPayload): Promise<Transaction> {
  const { data } = await api.post<{ message: string; data: { transaction: Transaction; [key: string]: any } }>('/crypto/send', params);
  return data.data.transaction;
}

export async function getCryptoTransactions(params?: {
  type?: string;
  symbol?: string;
  network?: string;
  status?: string;
  search?: string;
  page?: number;
  per_page?: number;
}): Promise<Paginated<CryptoTransactionRecord>> {
  const { data } = await api.get<Paginated<CryptoTransactionRecord>>('/crypto/transactions', {
    params,
  });
  return data;
}

export async function getCryptoTransaction(id: number | string): Promise<CryptoTransactionRecord> {
  const { data } = await api.get<{ data: CryptoTransactionRecord }>(`/crypto/transactions/${id}`);
  return data.data;
}
