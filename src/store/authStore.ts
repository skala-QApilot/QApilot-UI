import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as authApi from '../api/auth';

export interface AuthUser {
  user_id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;

  /** 실 API 로그인 */
  login: (email: string, password: string) => Promise<void>;
  /** 외부 응답에서 받은 토큰을 그대로 주입 (회원가입 등) */
  setSession: (tokens: authApi.AuthTokens) => void;
  /** refresh 토큰으로 access 재발급. 성공 시 새 accessToken 반환, 실패 시 null */
  refresh: () => Promise<string | null>;
  /** 토큰/사용자 초기화 */
  logout: () => void;

  isAuthenticated: () => boolean;
}

// Phase B 의 sentinel 토큰을 가진 사용자가 남아있을 경우 1회성 정리
const LEGACY_SENTINEL = 'dev-bypass';
const LEGACY_DIRECT_KEYS = ['qapilot_access_token', 'qapilot_refresh_token'];

if (typeof window !== 'undefined') {
  LEGACY_DIRECT_KEYS.forEach((k) => window.localStorage.removeItem(k));
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      login: async (email, password) => {
        const tokens = await authApi.login(email, password);
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? null,
          user: tokens.user ?? null,
        });
      },

      setSession: (tokens) => {
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? null,
          user: tokens.user ?? get().user,
        });
      },

      refresh: async () => {
        const refreshToken = get().refreshToken;
        if (!refreshToken) return null;
        try {
          const tokens = await authApi.refresh(refreshToken);
          set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token ?? refreshToken,
            user: tokens.user ?? get().user,
          });
          return tokens.access_token;
        } catch {
          set({ accessToken: null, refreshToken: null, user: null });
          return null;
        }
      },

      logout: () => {
        set({ accessToken: null, refreshToken: null, user: null });
      },

      isAuthenticated: () => Boolean(get().accessToken),
    }),
    {
      name: 'qapilot-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.accessToken === LEGACY_SENTINEL) {
          state.accessToken = null;
          state.refreshToken = null;
          state.user = null;
        }
      },
    },
  ),
);
