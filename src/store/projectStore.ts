import { create } from 'zustand';
import * as servicesApi from '../api/services';
import * as projectsApi from '../api/projects';
import { ApiError } from '../api/client';
import type { ProjectMeta, ProjectSummary } from '../app/pages/HomePage';

/** UI 가 사용하는 서비스 표현 — DashHomePage 의 Service 인터페이스와 호환 */
export interface UiService {
  /** URL slug (라우팅용) */
  id: string;
  /** 백엔드 service_id (UUID, service-scope API 호출용) */
  serviceId: string;
  name: string;
  /** 로컬에서 막 생성되어 SETUP 미완료 상태인지. 백엔드 로드분은 항상 false. */
  isNew: boolean;
  createdAt: string;
}

export interface ProjectCredentials {
  dashboard_url: string;
  server_auth_token: string;
}

export type ProjectLoadState = 'idle' | 'loading' | 'loaded' | 'missing' | 'error';

interface ProjectState {
  services: UiService[];
  projectMeta: ProjectMeta | null;
  projectSummary: ProjectSummary | null;
  projectCredentials: ProjectCredentials | null;
  loadState: ProjectLoadState;
  showAuthForProject: boolean;

  loadServices: () => Promise<void>;
  loadProject: (slug: string) => Promise<void>;
  createService: (payload: servicesApi.ServiceCreatePayload) => Promise<UiService>;
  markServiceSetupDone: (slug: string) => void;
  setShowAuthForProject: (show: boolean) => void;
  clearProjectAuth: () => void;
  reset: () => void;
}

function toUiService(dto: servicesApi.ServiceDto, isNew = false): UiService {
  return {
    id: dto.project_slug,
    serviceId: dto.service_id,
    name: dto.display_name,
    isNew,
    createdAt: (dto.created_at || '').slice(0, 10),
  };
}

const initialState = {
  services: [] as UiService[],
  projectMeta: null,
  projectSummary: null,
  projectCredentials: null,
  loadState: 'idle' as ProjectLoadState,
  showAuthForProject: false,
};

export const useProjectStore = create<ProjectState>()((set, get) => ({
  ...initialState,

  loadServices: async () => {
    const dtos = await servicesApi.listServices();
    set({ services: dtos.map((d) => toUiService(d)) });
  },

  loadProject: async (slug) => {
    set({ loadState: 'loading', showAuthForProject: false });
    try {
      const data = await projectsApi.getProject(slug);
      set({
        projectMeta: data.project,
        projectSummary: data.summary,
        projectCredentials: data.credentials ?? null,
        loadState: 'loaded',
      });
    } catch (error) {
      const status = error instanceof ApiError ? error.status : undefined;
      if (status === 401) {
        set({ showAuthForProject: true, loadState: 'idle' });
      } else if (status === 404) {
        set({ loadState: 'missing' });
      } else {
        set({ loadState: 'error' });
      }
    }
  },

  createService: async (payload) => {
    const dto = await servicesApi.createService(payload);
    const service = toUiService(dto, true);
    set((state) => ({ services: [...state.services, service] }));
    return service;
  },

  markServiceSetupDone: (slug) => {
    set((state) => ({
      services: state.services.map((s) => (s.id === slug ? { ...s, isNew: false } : s)),
    }));
  },

  setShowAuthForProject: (show) => set({ showAuthForProject: show }),

  clearProjectAuth: () => set({ showAuthForProject: false, loadState: 'idle' }),

  reset: () => set({ ...initialState }),
}));
