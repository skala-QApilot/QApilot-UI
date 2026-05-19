import { api } from './client';

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  user?: {
    user_id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  project_slug?: string;
  server_auth_token?: string;
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const res = await api.post<AuthTokens>('/api/auth/login', { email, password });
  return res.data;
}

export async function register(payload: RegisterPayload): Promise<AuthTokens> {
  const res = await api.post<AuthTokens>('/api/auth/register', payload);
  return res.data;
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const res = await api.post<AuthTokens>('/api/auth/refresh', { refresh_token: refreshToken });
  return res.data;
}

export async function logout(accessToken: string): Promise<void> {
  await api.post('/api/auth/logout', null, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
