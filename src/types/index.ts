export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  account_number?: string;
  bank_name?: string;
  tier?: number;
  kyc_status?: 'unverified' | 'pending' | 'verified';
  has_pin?: boolean;
  email_verified?: boolean;
  created_at?: string;
}

export interface Wallet {
  /** Naira balance in kobo-safe decimal string or number from the API. */
  balance: number;
  currency: 'NGN';
  bank_name: string;
  account_number: string;
}

export interface AssetBalance {
  asset: 'NGN' | 'BTC' | 'ETH' | 'USDT' | 'BNB' | 'SOL';
  amount: number;
}

export type TransactionType =
  | 'deposit'
  | 'transfer'
  | 'crypto_buy'
  | 'crypto_sell'
  | 'card_funding'
  | 'card_payment'
  | 'airtime'
  | 'data'
  | 'electricity'
  | 'cable'
  | 'betting'
  | 'refund'
  | 'atm_withdrawal';

export type TransactionDirection = 'in' | 'out';

export interface Transaction {
  id: number;
  reference: string;
  type: TransactionType;
  direction: TransactionDirection;
  title: string;
  subtitle?: string | null;
  amount: number;
  currency: 'NGN' | 'USD';
  status: 'pending' | 'successful' | 'failed';
  fee?: number | null;
  description?: string | null;
  counterparty?: string | null;
  counterparty_bank?: string | null;
  token?: string | null;
  units?: string | null;
  created_at: string;
}

export interface Beneficiary {
  id: number;
  name: string;
  nickname?: string | null;
  bank_name: string;
  bank_code?: string | null;
  account_number?: string | null;
  category?: 'transfer' | 'electricity' | 'cable' | 'betting' | string;
  meter_type?: 'prepaid' | 'postpaid' | null;
  created_at?: string;
}

export interface DashboardData {
  wallet: Wallet;
  balances: AssetBalance[];
  recent_transactions: Transaction[];
}

export interface Bank {
  code: string;
  name: string;
}

export interface AccountLookup {
  account_number: string;
  account_name: string;
  bank_code: string;
  bank_name?: string;
  is_gutter_user?: boolean;
  recipient_id?: number;
  fee?: number;
}

export interface GutterUserLookup {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  account_number?: string | null;
  bank_name: string;
  is_gutter_user: boolean;
}

export interface TransferPayload {
  type?: 'bank' | 'gutter';
  bank_code?: string;
  account_number?: string;
  recipient_id?: number;
  recipient_identifier?: string;
  amount: number;
  description?: string | null;
  pin: string;
}

export interface Coin {
  symbol: 'BTC' | 'ETH' | 'USDT' | 'BNB' | 'SOL';
  name: string;
  /** Price in NGN. */
  price: number;
  change_24h: number;
  sparkline: number[];
}

export type CryptoNetwork = 'TRC20' | 'BEP20' | 'ERC20' | 'BTC' | 'SOL';

export interface CryptoWalletAddress {
  symbol: Coin['symbol'];
  network: CryptoNetwork;
  network_name: string;
  address: string;
  memo?: string | null;
  fee_desc: string;
  confirmations: number;
  min_deposit: number;
  qr_code_url: string;
  warning?: string;
}

export interface CryptoDepositRecord {
  id: number;
  tx_hash: string;
  symbol: Coin['symbol'];
  network: CryptoNetwork;
  amount: number;
  net_amount?: number;
  platform_fee?: number;
  confirmations?: number;
  status: string;
  converted_to_naira: boolean;
  naira_amount?: number | null;
  rate?: number | null;
  created_at: string;
}

export interface CryptoAddressesResponse {
  symbol: Coin['symbol'];
  auto_convert_crypto: boolean;
  deposit_fee_percentage?: number;
  deposit_fixed_fee_ngn?: number;
  addresses: CryptoWalletAddress[];
  recent_deposits?: CryptoDepositRecord[];
}

export interface CryptoHolding {
  symbol: Coin['symbol'];
  name: string;
  amount: number;
  locked_amount?: number;
  price: number;
  value_naira: number;
  change_24h: number;
  sparkline: number[];
  enabled?: boolean;
}

export interface CryptoBalancesResponse {
  portfolio_value: number;
  auto_convert_crypto: boolean;
  balances: CryptoHolding[];
}

export interface SimulatedDepositResponse {
  message: string;
  data: {
    auto_converted: boolean;
    naira_credited: number | null;
    crypto_credited: number;
    net_amount?: number;
    symbol: string;
  };
}

export interface CryptoQuote {
  side: 'buy' | 'sell';
  symbol: Coin['symbol'];
  /** NGN amount paid (buy) or received (sell). */
  fiat_amount: number;
  gross_fiat_amount?: number;
  /** Crypto amount received (buy) or sold (sell). */
  crypto_amount: number;
  rate: number;
  fee: number;
  fee_percentage?: number;
  fixed_fee_ngn?: number;
  min_amount?: number;
  max_amount?: number;
  expires_at: string;
}

export interface CryptoSendFee {
  symbol: Coin['symbol'];
  fee: number;
  network_fee?: number;
  platform_fee?: number;
  platform_fee_ngn?: number;
  fee_naira: number;
  rate?: number;
  min_withdrawal?: number;
  max_withdrawal?: number;
  destination_type: 'gutter_user' | 'external_address';
}

export interface CryptoSendPayload {
  symbol: Coin['symbol'];
  destination_type: 'gutter_user' | 'external_address';
  recipient: string;
  amount: number;
  pin: string;
  network?: string;
  memo?: string;
  idempotency_key?: string;
}

export interface CryptoTransactionRecord {
  id: number;
  transaction_id?: number | null;
  reference: string;
  quidax_reference?: string | null;
  type: 'receive_crypto' | 'send_crypto' | 'convert_to_naira' | 'buy_crypto';
  transaction_type?: 'receive_crypto' | 'send_crypto' | 'convert_to_naira' | 'buy_crypto';
  symbol: Coin['symbol'];
  network?: string | null;
  destination_type?: string | null;
  wallet_address?: string | null;
  memo?: string | null;
  tx_hash?: string | null;
  crypto_amount: number;
  fiat_amount: number;
  exchange_rate: number;
  network_fee: number;
  network_fee_crypto?: number;
  platform_fee_crypto: number;
  platform_fee_ngn: number;
  total_crypto_deducted: number;
  net_crypto_amount: number;
  net_fiat_amount: number;
  status: 'pending' | 'processing' | 'successful' | 'failed' | 'rejected' | 'refunded' | 'refund_processing';
  failure_reason?: string | null;
  is_refunded?: boolean;
  refunded_amount?: number | null;
  refunded_currency?: string | null;
  refund_reference?: string | null;
  refunded_at?: string | null;
  fee_config_snapshot?: Record<string, any> | null;
  created_at: string;
  completed_at?: string | null;
}

export interface CryptoSendResponse {
  message: string;
  data: {
    symbol: string;
    amount: number;
    fee: number;
    recipient: string;
    destination_type: 'gutter_user' | 'external_address';
    tx_hash?: string;
    internal_transfer?: boolean;
    auto_converted?: boolean;
  };
}


export interface VirtualCard {
  id: number;
  currency: 'USD';
  brand: 'mastercard' | 'visa';
  last4: string;
  holder_name: string;
  expiry_month: string;
  expiry_year: string;
  balance: number;
  frozen: boolean;
  controls: CardControls;
  limits: {
    daily_spend_used: number;
    daily_spend_limit: number;
    atm_used: number;
    atm_limit: number;
  };
}

export interface CardControls {
  online_payments: boolean;
  atm_withdrawals: boolean;
  contactless: boolean;
}

export interface CardSecret {
  number: string;
  cvv: string;
  expiry_month: string;
  expiry_year: string;
  holder_name: string;
  billing_address: {
    line1: string;
    city: string;
    state: string;
    country: string;
    zip: string;
  };
}

export interface CardPricing {
  creation_fee_usd: number;
  creation_fee_ngn: number;
  usd_rate: number;
  funding_fee_percent: number;
}

export interface AtmWithdrawal {
  id: number;
  code: string;
  amount: number;
  expires_at: string;
  status: 'active' | 'used' | 'cancelled' | 'expired';
}

/** Laravel API Resource collection with pagination meta. */
export interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface TierInfo {
  tier: number;
  name: string;
  short_name: string;
  daily_limit: number;
  single_limit: number;
  max_balance: number | null;
  requirements: string;
  benefits: string[];
  status: 'active' | 'completed' | 'next' | 'locked';
  is_current: boolean;
}

export interface TransactionLimitsData {
  current_tier: number;
  tier_name: string;
  short_name: string;
  daily_limit: number;
  daily_spent: number;
  daily_remaining: number;
  single_limit: number;
  max_balance: number | null;
  percentage_used: number;
  kyc_status: 'unverified' | 'pending' | 'verified';
  tiers: TierInfo[];
}
