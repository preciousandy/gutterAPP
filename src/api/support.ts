import { api } from './client';

export interface ComplaintPayload {
  category: string;
  reference?: string;
  message: string;
}

export interface ComplaintResponse {
  message: string;
  ticket_id: string;
  category: string;
}

export async function submitComplaint(payload: ComplaintPayload): Promise<ComplaintResponse> {
  const { data } = await api.post<ComplaintResponse>('/support/complaint', payload);
  return data;
}
