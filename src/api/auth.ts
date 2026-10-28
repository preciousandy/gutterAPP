import { Platform } from 'react-native';
import { api } from './client';
import type { AuthResponse, User } from '@/types';

const deviceName = () => `${Platform.OS}-gutter-app`;

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  password: string;
}

export async function login(login_id: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', {
    login: login_id, // phone or email
    password,
    device_name: deviceName(),
  });
  return data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', {
    ...payload,
    device_name: deviceName(),
  });
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email });
  return data;
}

export async function me(): Promise<User> {
  const { data } = await api.get<{ data: User }>('/user');
  return data.data;
}

// ---- Onboarding -----------------------------------------------------------

export async function requestEmailOtp(): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/email/otp');
  return data;
}

export async function verifyEmailOtp(code: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/email/verify', { code });
  return data;
}

export async function changeEmail(email: string): Promise<{ message: string; user: User }> {
  const { data } = await api.post<{ message: string; user: User }>('/auth/email/change', { email });
  return data;
}

export type KycDocumentType = 'nin' | 'bvn' | 'pvc' | 'passport';

export interface KycSubmitResponse {
  message: string;
  status: 'id_verified';
  next_step: 'face_verification';
  data?: {
    document_type: string;
    provider: string;
  };
}

export async function submitKyc(payload: {
  document_type: KycDocumentType;
  document_number: string;
  document_image: string;
}): Promise<KycSubmitResponse> {
  const { data } = await api.post<KycSubmitResponse>('/kyc/submit', payload);
  return data;
}

export interface KycFaceCheckResponse {
  message: string;
  status: 'verified' | 'pending';
  user: User;
}

export async function submitFaceCheck(selfie?: string): Promise<KycFaceCheckResponse> {
  const { data } = await api.post<KycFaceCheckResponse>('/kyc/face-check', {
    selfie: selfie ?? null,
  });
  return data;
}

export interface KycStatusData {
  kyc_status: 'unverified' | 'pending' | 'verified';
  tier: number;
  has_submitted_document: boolean;
  document_type?: string | null;
  verification_status: string;
  verified_at?: string | null;
}

export async function getKycStatus(): Promise<KycStatusData> {
  const { data } = await api.get<{ data: KycStatusData }>('/kyc/status');
  return data.data;
}

export async function createPin(pin: string, pin_confirmation: string): Promise<{ message: string; user: User }> {
  const { data } = await api.post<{ message: string; user: User }>('/pin', { pin, pin_confirmation });
  return data;
}

export interface ChangePinPayload {
  current_pin?: string;
  password?: string;
  pin: string;
  pin_confirmation: string;
}

export async function changePin(payload: ChangePinPayload): Promise<{ message: string; user: User }> {
  const { data } = await api.post<{ message: string; user: User }>('/pin/change', payload);
  return data;
}

export async function verifyPin(pin: string): Promise<{ message: string; verified: boolean }> {
  const { data } = await api.post<{ message: string; verified: boolean }>('/pin/verify', { pin });
  return data;
}

