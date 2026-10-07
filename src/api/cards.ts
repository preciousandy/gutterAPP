import { api } from './client';
import type { CardControls, CardPricing, CardSecret, Transaction, VirtualCard } from '@/types';

export async function listCards(): Promise<VirtualCard[]> {
  const { data } = await api.get<{ data: VirtualCard[] }>('/cards');
  return data.data;
}

export async function getCardPricing(): Promise<CardPricing> {
  const { data } = await api.get<{ data: CardPricing }>('/cards/pricing');
  return data.data;
}

export async function createCard(pin: string): Promise<VirtualCard> {
  const { data } = await api.post<{ data: VirtualCard }>('/cards', { pin });
  return data.data;
}

export async function fundCard(
  id: number,
  amount_usd: number,
  pin: string
): Promise<Transaction> {
  const { data } = await api.post<{ data: Transaction }>(`/cards/${id}/fund`, {
    amount: amount_usd,
    pin,
  });
  return data.data;
}

export async function getCardSecret(id: number): Promise<CardSecret> {
  const { data } = await api.get<{ data: CardSecret }>(`/cards/${id}/details`);
  return data.data;
}

export async function setCardFrozen(id: number, frozen: boolean): Promise<VirtualCard> {
  const { data } = await api.post<{ data: VirtualCard }>(
    `/cards/${id}/${frozen ? 'freeze' : 'unfreeze'}`
  );
  return data.data;
}

export async function updateCardControls(
  id: number,
  controls: Partial<CardControls>
): Promise<VirtualCard> {
  const { data } = await api.patch<{ data: VirtualCard }>(`/cards/${id}/controls`, controls);
  return data.data;
}
