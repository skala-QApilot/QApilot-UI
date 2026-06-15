import { api } from './client';

/** 서비스 멤버 — Slack 공유 대상 선택용. */
export interface ServiceMember {
  user_id: string;
  email: string | null;
  name: string | null;
  role: string;
}

export async function getServiceMembers(serviceId: string): Promise<ServiceMember[]> {
  const res = await api.get<{ members: ServiceMember[]; count: number }>(
    `/api/services/${encodeURIComponent(serviceId)}/members`,
  );
  return res.data.members;
}
