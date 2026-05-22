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
  /** 시나리오 ↔ RTM 매핑 평탄화 — FR 별 ts/tc 매핑 (mockRTMData 호환 shape). */
  getRtmMappings: () => Array<{
    frId: string;
    requirement: string;
    ts: string;
    tc: string;
    result: 'PASS' | 'FAIL' | 'UNCOVERED';
  }>;
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

  getRtmMappings: () => {
    const version = (() => {
      const { versions, selectedVersionId } = get();
      if (!selectedVersionId) return versions[0] ?? null;
      return versions.find((v) => v.rtmVersionId === selectedVersionId) ?? versions[0] ?? null;
    })();
    if (!version) return [];
    const out: Array<{
      frId: string;
      requirement: string;
      ts: string;
      tc: string;
      result: 'PASS' | 'FAIL' | 'UNCOVERED';
    }> = [];
    for (const req of version.requirements ?? []) {
      if ((req.history ?? []).length === 0) {
        out.push({
          frId: req.frId,
          requirement: req.content,
          ts: '-',
          tc: '-',
          result: 'UNCOVERED',
        });
        continue;
      }
      for (const raw of req.history) {
        const h = raw as { ts?: string; tc?: string; pass?: boolean };
        out.push({
          frId: req.frId,
          requirement: req.content,
          ts: h.ts ?? '-',
          tc: h.tc ?? '-',
          result: h.pass ? 'PASS' : 'FAIL',
        });
      }
    }
    return out;
  },
}));
