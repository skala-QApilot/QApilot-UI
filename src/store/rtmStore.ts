import { create } from 'zustand';
import * as rtmApi from '../api/rtm';

export type RtmLoadState = 'idle' | 'loading' | 'loaded' | 'error';

interface RtmState {
  versions: rtmApi.RtmVersion[];
  selectedVersionId: string | null;
  loadState: RtmLoadState;
  error: string | null;

  loadVersions: (serviceId: string) => Promise<void>;
  selectVersion: (rtmVersionId: string) => void;
  exportVersion: (serviceId: string, rtmVersionId: string) => Promise<string>;
  reset: () => void;

  /** 셀렉터 헬퍼 — 현재 선택된 버전 (없으면 첫 버전, 없으면 null) */
  getSelectedVersion: () => rtmApi.RtmVersion | null;
}

const initialState = {
  versions: [] as rtmApi.RtmVersion[],
  selectedVersionId: null as string | null,
  loadState: 'idle' as RtmLoadState,
  error: null as string | null,
};

export const useRtmStore = create<RtmState>()((set, get) => ({
  ...initialState,

  loadVersions: async (serviceId) => {
    set({ loadState: 'loading', error: null });
    try {
      const versions = await rtmApi.listRtmVersions(serviceId);
      set((state) => ({
        versions,
        // 기존 선택이 새 목록에 없으면 첫 버전으로 fallback
        selectedVersionId:
          state.selectedVersionId && versions.some((v) => v.rtmVersionId === state.selectedVersionId)
            ? state.selectedVersionId
            : versions[0]?.rtmVersionId ?? null,
        loadState: 'loaded',
      }));
    } catch (e) {
      set({ loadState: 'error', error: e instanceof Error ? e.message : 'RTM 로드 실패' });
    }
  },

  selectVersion: (rtmVersionId) => set({ selectedVersionId: rtmVersionId }),

  exportVersion: async (serviceId, rtmVersionId) =>
    rtmApi.exportRtm(serviceId, rtmVersionId),

  reset: () => set({ ...initialState }),

  getSelectedVersion: () => {
    const { versions, selectedVersionId } = get();
    if (!selectedVersionId) return versions[0] ?? null;
    return versions.find((v) => v.rtmVersionId === selectedVersionId) ?? versions[0] ?? null;
  },
}));
