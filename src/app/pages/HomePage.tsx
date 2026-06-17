import React, { useEffect, useRef, useState } from 'react';
import { Download, Edit2, ExternalLink, GitBranch, MoreHorizontal, Plus, Shield, ShieldCheck, Users, X, Server } from 'lucide-react';
import { SutServiceGraph } from '../components/SutServiceGraph';
import { SearchBar } from '../components/common/SearchBar';
import { FileList } from '../components/common/FileList';
import { ExecutionHistoryRow } from '../components/common/ExecutionHistoryRow';
import { ExecutionHistoryList } from '../components/common/ExecutionHistoryList';
import { PassRateChart } from '../components/common/PassRateChart';
import { RTMDonutChart } from '../components/common/RTMDonutChart';
import { useMemo } from 'react';
import { useRtmStore } from '../../store/rtmStore';
import { useTestStore } from '../../store/testStore';
import type { RtmRequirement } from '../../api/rtm';
import { updateService, type ServiceDto } from '../../api/services';

/** 모듈 상수 — `?? []` 인라인 fallback 은 매 렌더 새 배열을 만들어 Zustand 무한 루프 유발. */
const EMPTY_REQUIREMENTS: RtmRequirement[] = [];

export interface ProjectMeta {
  project_slug: string;
  display_name: string;
  local_path: string;
  config_path: string;
  index_path: string;
  framework: string;
  language: string;
  created_at: string;
  updated_at: string;
  /** 백엔드 service_id (UUID) — 설정 저장(PATCH) 시 필요. */
  service_id?: string;
  /** 설정 화면용 — repo 메타(PAT 실제 값 없음, token_set 만). */
  repos?: Array<{ repo_url: string; branch?: string | null; role?: string | null; token_set?: boolean }>;
  staging_url?: string | null;
}

export interface ProjectSummary {
  file_count: number;
  endpoint_count: number;
  model_count: number;
  last_scanned_at: string;
  has_index?: boolean;
  endpoints?: Array<{
    path: string;
    method: string;
    handler: string;
    file: string;
  }>;
}

const MOCK_MEMBERS = [
  { id: '1', name: '김지수',  username: 'kshyun00',        role: '관리자', teams: 2, roles: 1, twoFa: true,  avatar: null, color: '#3615CF' },
  { id: '2', name: '이민준',  username: 'flsrinn',          role: '개발자', teams: 1, roles: 1, twoFa: true,  avatar: null, color: '#10b981' },
  { id: '3', name: '박서연',  username: 'd1v1n-commed1a',   role: '개발자', teams: 1, roles: 0, twoFa: false, avatar: null, color: '#f59e0b' },
  { id: '4', name: '최현우',  username: 'jkwltx177',        role: '테스터', teams: 3, roles: 2, twoFa: true,  avatar: null, color: '#6366f1' },
  { id: '5', name: '정유진',  username: 'yujin-1027',       role: '뷰어',   teams: 0, roles: 0, twoFa: true,  avatar: null, color: '#ec4899' },
];

const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">{children}</span>
);

const Field = ({ label, placeholder, type = 'text' }: { label: string; placeholder?: string; type?: string }) => (
  <div className="mb-6">
    <label className="block text-sm font-semibold text-[#1a1a2e] mb-1.5">{label}</label>
    <input
      type={type}
      placeholder={placeholder}
      className="w-full max-w-lg px-3 py-2 rounded-lg bg-[#f3f4f6] border border-transparent focus:border-[#3615CF]/40 focus:bg-white focus:outline-none text-sm text-[#374151] transition-colors placeholder-[#9ca3af]"
    />
  </div>
);

function SettingsTab({
  serviceName,
  serviceId,
  reposFromServer,
  stagingUrlFromServer,
  onServiceUpdated,
}: {
  serviceName: string;
  serviceId?: string;
  reposFromServer?: Array<{ repo_url: string; branch?: string | null; role?: string | null; token_set?: boolean }>;
  stagingUrlFromServer?: string | null;
  onServiceUpdated?: (dto: ServiceDto) => void;
}) {
  type GithubEntry = {
    id: string;
    url: string;
    /** 신규 입력 PAT. 비우면 기존 토큰 유지(서버 보존). */
    token: string;
    /** 서버에 이미 저장된 PAT 가 있는지 — 표시/placeholder 용. */
    tokenSet: boolean;
    /** UI 미편집 — round-trip 으로 보존. */
    branch: string | null;
    role: string | null;
  };

  type SettingsDraft = {
    name: string;
    githubEntries: GithubEntry[];
    stagingUrl: string;
  };

  const createGithubEntry = (): GithubEntry => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url: '',
    token: '',
    tokenSet: false,
    branch: null,
    role: null,
  });

  // 서버 응답(repos/staging_url)에서 초기 draft 를 구성한다 — localStorage 사용 X.
  const buildDraftFromServer = (): SettingsDraft => {
    const entries: GithubEntry[] = (reposFromServer ?? []).map(r => ({
      id: `${r.repo_url}-${Math.random().toString(36).slice(2, 8)}`,
      url: r.repo_url,
      token: '',
      tokenSet: Boolean(r.token_set),
      branch: r.branch ?? null,
      role: r.role ?? null,
    }));
    return {
      name: serviceName,
      githubEntries: entries.length ? entries : [createGithubEntry()],
      stagingUrl: stagingUrlFromServer ?? '',
    };
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SettingsDraft>(buildDraftFromServer);
  const [savedDraft, setSavedDraft] = useState<SettingsDraft>(buildDraftFromServer);
  const [saving, setSaving] = useState(false);

  // 서버에서 받은 값이 바뀌면(프로젝트 로드/저장 후) draft 재구성. 편집 중이면 덮어쓰지 않음.
  useEffect(() => {
    if (editing) return;
    const next = buildDraftFromServer();
    setDraft(next);
    setSavedDraft(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceName, stagingUrlFromServer, reposFromServer]);

  const addGithubEntry = () => {
    setDraft(prev => ({
      ...prev,
      githubEntries: [...prev.githubEntries, createGithubEntry()],
    }));
  };

  const removeGithubEntry = (id: string) => {
    setDraft(prev => ({
      ...prev,
      githubEntries: prev.githubEntries.filter(entry => entry.id !== id),
    }));
  };

  const updateGithubEntry = (id: string, field: 'url' | 'token' | 'branch', value: string) => {
    setDraft(prev => ({
      ...prev,
      githubEntries: prev.githubEntries.map(entry => (
        entry.id === id ? { ...entry, [field]: field === 'branch' ? (value || null) : value } : entry
      )),
    }));
  };

  const handleSave = async () => {
    if (!serviceId) {
      console.error('설정 저장 실패: serviceId 미확보');
      return;
    }
    setSaving(true);
    try {
      // token 이 빈 entry 는 token 미전송 → 서버가 기존 PAT 보존.
      const repos = draft.githubEntries
        .filter(e => e.url.trim())
        .map(e => ({
          repo_url: e.url.trim(),
          token: e.token.trim() ? e.token.trim() : null,
          branch: e.branch,
          role: e.role,
        }));
      const dto = await updateService(serviceId, {
        name: draft.name,
        repos,
        staging_url: draft.stagingUrl,
      });
      onServiceUpdated?.(dto);
      setSavedDraft(draft);
      setEditing(false);
    } catch (err) {
      console.error('설정 저장 실패', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(savedDraft);
    setEditing(false);
  };

  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 border-b border-[#e8e6f5] pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#1a1a2e]">서비스 설정</h2>
            <p className="mt-1 text-sm text-[#9ca3af]">
              대시보드 이름과 GitHub 저장소, Staging 서버 연결 정보를 관리합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="rounded-xl border border-[#e5e7eb] px-4 py-2 text-sm font-medium text-[#6b7280] transition-colors hover:bg-[#f8f8fc]"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                  className="rounded-xl bg-[#3615CF] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#2d11b0] disabled:cursor-not-allowed disabled:bg-[#cfc9f8]"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#3615CF] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#2d11b0]"
              >
                <Edit2 className="h-4 w-4" />
                설정 수정
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <section className="border-b border-[#ece9fb] pb-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3615CF] text-[10px] font-bold text-white">1</span>
              <h3 className="text-sm font-semibold text-[#1a1a2e]">대시보드 이름</h3>
              <span className="text-xs text-[#f43b47]">*</span>
            </div>
            <input
              type="text"
              value={draft.name}
              onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
              disabled={!editing}
              placeholder="예: Frontend App, Backend API"
              className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#1a1a2e] outline-none transition-all placeholder:text-[#c4c9d4] focus:border-[#3615CF]/50 focus:ring-2 focus:ring-[#3615CF]/10 disabled:bg-white disabled:text-[#9ca3af]"
            />
          </section>

          <section className="border-b border-[#ece9fb] pb-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3615CF] text-[10px] font-bold text-white">2</span>
                <h3 className="text-sm font-semibold text-[#1a1a2e]">GitHub 저장소</h3>
              </div>

              <button
                onClick={addGithubEntry}
                disabled={!editing}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#3615CF] transition-colors hover:text-[#2d11b0] disabled:cursor-not-allowed disabled:text-[#c7c2ef]"
              >
                <Plus className="h-3.5 w-3.5" />
                저장소 추가
              </button>
            </div>

            <div className="space-y-3">
              {draft.githubEntries.map(entry => (
                <div key={entry.id} className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="group relative">
                      <input
                        type="url"
                        value={entry.url}
                        onChange={e => updateGithubEntry(entry.id, 'url', e.target.value)}
                        disabled={!editing}
                        placeholder="https://github.com/owner/repo"
                        className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 pr-10 text-sm text-[#1a1a2e] outline-none transition-all placeholder:text-[#c4c9d4] focus:border-[#3615CF]/50 focus:ring-2 focus:ring-[#3615CF]/10 disabled:bg-white disabled:text-[#9ca3af]"
                      />
                      {entry.url.trim() && (
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute right-3 top-1/2 hidden -translate-y-1/2 text-[#c4c9d4] transition-colors hover:text-[#3615CF] group-hover:block"
                          aria-label="GitHub 저장소 열기"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <GitBranch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c9d4]" />
                        <input
                          type="text"
                          value={entry.branch ?? ''}
                          onChange={e => updateGithubEntry(entry.id, 'branch', e.target.value)}
                          disabled={!editing}
                          placeholder="branch (기본: main)"
                          className="w-full rounded-xl border border-[#e5e7eb] bg-white pl-9 pr-3 py-3 font-mono text-sm text-[#1a1a2e] outline-none transition-all placeholder:text-[#c4c9d4] focus:border-[#3615CF]/50 focus:ring-2 focus:ring-[#3615CF]/10 disabled:bg-white disabled:text-[#9ca3af]"
                        />
                      </div>
                      <input
                        type="password"
                        value={entry.token}
                        onChange={e => updateGithubEntry(entry.id, 'token', e.target.value)}
                        disabled={!editing}
                        placeholder={entry.tokenSet ? '토큰 저장됨 — 변경하려면 입력' : 'Personal Access Token (optional)'}
                        className="flex-1 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 font-mono text-sm text-[#1a1a2e] outline-none transition-all placeholder:text-[#c4c9d4] focus:border-[#3615CF]/50 focus:ring-2 focus:ring-[#3615CF]/10 disabled:bg-white disabled:text-[#9ca3af]"
                      />
                    </div>
                  </div>

                  {draft.githubEntries.length > 1 && (
                    <button
                      onClick={() => removeGithubEntry(entry.id)}
                      disabled={!editing}
                      className="mt-2 rounded-lg p-1.5 text-[#c4c9d4] transition-colors hover:bg-red-50 hover:text-[#f43b47] disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#c4c9d4]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="border-b border-[#ece9fb] pb-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3615CF] text-[10px] font-bold text-white">3</span>
              <Server className="h-4 w-4 text-[#1a1a2e]" />
              <h3 className="text-sm font-semibold text-[#1a1a2e]">Staging 서버 URL</h3>
            </div>
            <input
              type="url"
              value={draft.stagingUrl}
              onChange={e => setDraft(prev => ({ ...prev, stagingUrl: e.target.value }))}
              disabled={!editing}
              placeholder="https://staging.example.com"
              className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#1a1a2e] outline-none transition-all placeholder:text-[#c4c9d4] focus:border-[#3615CF]/50 focus:ring-2 focus:ring-[#3615CF]/10 disabled:bg-white disabled:text-[#9ca3af]"
            />
          </section>
        </div>

      </div>
    </div>
  );
}

const PeopleTab = () => {
  const [search, setSearch] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const filtered = MOCK_MEMBERS.filter(m =>
    m.name.includes(search) || m.username.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAll = () => {
    setChecked(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(m => m.id)));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-10 py-4 border-b border-[#f0f0f0] flex-shrink-0">
        <SearchBar value={search} onChange={setSearch} placeholder="멤버 검색..." className="max-w-xs" />
        <div className="flex items-center gap-2 ml-auto">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm text-[#6b7280] hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> 내보내기
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#3615CF] text-white text-sm font-medium hover:bg-[#3615CF]/90 transition-colors">
            <Plus className="w-3.5 h-3.5" /> 멤버 초대
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-4 px-10 py-2.5 border-b border-[#f0f0f0] bg-[#fafafa]">
          <input type="checkbox" checked={checked.size === filtered.length && filtered.length > 0}
            onChange={toggleAll}
            className="w-3.5 h-3.5 rounded accent-[#3615CF] flex-shrink-0" />
          <span className="text-xs font-semibold text-[#6b7280] flex-1">멤버</span>
          <span className="text-xs font-semibold text-[#6b7280] w-20 text-center">2FA</span>
          <span className="text-xs font-semibold text-[#6b7280] w-20 text-center">역할</span>
          <span className="text-xs font-semibold text-[#6b7280] w-16 text-center">팀</span>
          <span className="text-xs font-semibold text-[#6b7280] w-8" />
        </div>

        {/* Rows */}
        {filtered.map(member => {
          const isChecked = checked.has(member.id);
          const initials = member.name.slice(0, 1);
          return (
            <div key={member.id} className={`flex items-center gap-4 px-10 py-3.5 border-b border-[#f5f5f5] hover:bg-gray-50 transition-colors ${isChecked ? 'bg-[#EAE8F9]/30' : ''}`}>
              <input type="checkbox" checked={isChecked}
                onChange={() => setChecked(prev => { const n = new Set(prev); n.has(member.id) ? n.delete(member.id) : n.add(member.id); return n; })}
                className="w-3.5 h-3.5 rounded accent-[#3615CF] flex-shrink-0" />

              {/* Avatar + info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: member.color }}>
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#3615CF]">{member.name}</div>
                  <div className="text-xs text-[#9ca3af]">@{member.username}</div>
                  <div className="mt-0.5 flex items-center gap-1">
                    <span className="text-[10px] text-[#9ca3af]">멤버십:</span>
                    <span className="px-1.5 py-0.5 text-[10px] border border-[#e5e7eb] rounded text-[#6b7280]">직접 지정</span>
                  </div>
                </div>
              </div>

              {/* 2FA */}
              <div className="w-20 flex justify-center">
                {member.twoFa
                  ? <ShieldCheck className="w-4 h-4 text-[#3615CF]" />
                  : <Shield className="w-4 h-4 text-[#d1d5db]" />}
              </div>

              {/* Role */}
              <div className="w-20 flex justify-center">
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                  member.role === '관리자' ? 'bg-[#EAE8F9] text-[#3615CF]' : 'bg-[#f3f4f6] text-[#6b7280]'
                }`}>{member.role}</span>
              </div>

              {/* Teams */}
              <div className="w-16 flex items-center justify-center gap-1 text-xs text-[#9ca3af]">
                <Users className="w-3.5 h-3.5" />
                {member.teams}
              </div>

              {/* More */}
              <button className="w-8 flex justify-center text-[#9ca3af] hover:text-[#3615CF] transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function HomePage({
  setCurrentPage,
  navigateToHistory,
  activeTab = 'overview',
  serviceName = 'My Project',
  serviceId,
  projectSlug,
  projectMeta,
  projectSummary,
  projectCredentials,
  onServiceUpdated,
}: {
  setCurrentPage: (page: string) => void;
  navigateToHistory: (filter: string) => void;
  activeTab?: string;
  serviceName?: string;
  serviceId?: string | null;
  projectSlug?: string;
  projectMeta?: ProjectMeta | null;
  projectSummary?: ProjectSummary | null;
  projectCredentials?: { dashboard_url: string; server_auth_token: string } | null;
  onServiceUpdated?: (dto: ServiceDto) => void;
}) {
  void navigateToHistory;

  // RTM 도넛 — 선택된 버전의 requirements 에서 derive (Phase 1 회귀 복구).
  const selectedRtmVersion = useRtmStore((s) => s.getSelectedVersion());
  const rtmRequirements: RtmRequirement[] = selectedRtmVersion?.requirements ?? EMPTY_REQUIREMENTS;
  const totalReqs = rtmRequirements.length;
  const metReqs = rtmRequirements.filter(r => r.status === '충족').length;
  const unmetReqs = rtmRequirements.filter(r => r.status === '미충족').length;
  // 미측정 = status 기준 (totalCount===0 은 '미측정'의 부분집합 — RTMPage 와 동일).
  const unrunReqs = rtmRequirements.filter(r => r.status === '미측정').length;
  const overallPassTotal = rtmRequirements.reduce((s, r) => s + r.passCount, 0);
  const overallTotal = rtmRequirements.reduce((s, r) => s + r.totalCount, 0);
  const overallPct = overallTotal > 0 ? Math.round((overallPassTotal / overallTotal) * 100) : 0;

  // PASS율 박스 높이 동적 측정
  const passRateBoxRef = useRef<HTMLDivElement>(null);
  const [passRateChartH, setPassRateChartH] = useState(120);
  useEffect(() => {
    const el = passRateBoxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      setPassRateChartH(Math.max(60, Math.floor(e.contentRect.height) - 34));
    });
    ro.observe(el);
    setPassRateChartH(Math.max(60, el.clientHeight - 34));
    return () => ro.disconnect();
  }, []);

  // 실행 이력 / PASS 추이 — testStore.results 변경 시에만 재계산 (getter 가 매 호출마다 새 배열을 만들기 때문에 selector 직접 호출 금지).
  const testResults = useTestStore((s) => s.results);
  const executionHistory = useMemo(
    () => useTestStore.getState().getExecutionHistory(),
    [testResults],
  );
  const passRateHistory = useMemo(() => {
    const raw = useTestStore.getState().getPassHistory(14);
    if (raw.length === 0) return [];

    // M/D → Date 파싱 (dayKey 가 'M/D' 형식을 반환)
    const parseDate = (md: string) => {
      const [m, d] = md.split('/').map(Number);
      const now = new Date();
      const year = (m > now.getMonth() + 1) ? now.getFullYear() - 1 : now.getFullYear();
      return new Date(year, m - 1, d);
    };

    const mapped = raw.map(p => {
      const executed = p.pass + p.fail + p.skipped + p.unverified;
      const rate = (v: number) => executed > 0 ? Math.round(v / executed * 100) : null;
      return { date: p.date, passRate: rate(p.pass), skipRate: rate(p.skipped), unverifiedRate: rate(p.unverified) };
    });

    // 날짜 범위 채우기 — 빈 날짜는 null (차트에서 connectNulls 로 연결)
    const dateMap = new Map(mapped.map(p => [p.date, p]));
    const start = parseDate(raw[0].date);
    const end   = parseDate(raw[raw.length - 1].date);
    const filled = [];
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      filled.push(dateMap.get(label) ?? { date: label, passRate: null, skipRate: null, unverifiedRate: null });
    }
    return filled;
  }, [testResults]);
  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {activeTab === 'overview' && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 px-2 py-3">

          {/* 상단 — RTM(2) + Service Graph(3) + PASS율(2.5) · 박스 없음 */}
          <div className="flex-1 min-h-0 flex items-stretch gap-6 pl-10 pr-8 pt-4 pb-5 border-b border-[#f0f0f0]">

            {/* RTM — 콘텐츠 크기만큼만 */}
            <div className="flex-shrink-0 flex flex-col">
              <Label>RTM</Label>
              <div className="flex-1 flex items-center">
                <RTMDonutChart
                  metReqs={metReqs}
                  unmetReqs={unmetReqs}
                  unrunReqs={unrunReqs}
                  totalReqs={totalReqs}
                  overallPct={overallPct}
                  size="lg"
                />
              </div>
            </div>

            {/* 구분선 */}
            <div className="w-px bg-[#f0f0f0] self-stretch flex-shrink-0" />

            {/* Service Graph — 1.2 */}
            <div style={{ flex: 2.4 }} className="min-w-0 flex flex-col">
              <span className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest mb-1">Service Graph</span>
              <div className="flex-1 min-h-0">
                <SutServiceGraph serviceId={serviceId} />
              </div>
            </div>

            {/* 구분선 */}
            <div className="w-px bg-[#f0f0f0] self-stretch flex-shrink-0" />

            {/* PASS율 — flex:2.4 */}
            <div ref={passRateBoxRef} style={{ flex: 2.4 }} className="min-w-0 flex flex-col overflow-hidden">
              <PassRateChart
                data={passRateHistory}
                height={passRateChartH}
                stickyAxes
                lines={[
                  { dataKey: 'passRate',      stroke: 'var(--status-pass)', strokeWidth: 2.5, name: 'PASS율', gradient: true },
                  { dataKey: 'skipRate',       stroke: '#9ca3af',            strokeWidth: 2,   name: 'SKIP율' },
                  { dataKey: 'unverifiedRate', stroke: '#7c8db5',            strokeWidth: 2,   dashed: true, name: 'UNVERIFIED율' },
                ]}
                legend={[
                  { color: 'var(--status-pass)', label: 'PASS율' },
                  { color: '#9ca3af',             label: 'SKIP율' },
                  { color: '#7c8db5',             label: 'UNVERIFIED율', dashed: true },
                ]}
              />
            </div>
          </div>

          {/* 하단 — FILES + 이력 · 박스 있음 */}
          <div className="flex-1 min-h-0 flex gap-6 px-10 pt-6 pb-10">

            {/* FILES — 박스 (flex:3 = 0.6) */}
            <div style={{ flex: 3 }} className="min-w-0 min-h-0 flex flex-col rounded-[3rem] border border-[#ece9fb] bg-[#f9f8ff] shadow-sm overflow-hidden px-10 py-7">
              <FileList serviceId={serviceId} />
            </div>

            {/* 이력 — FILES 와 동일한 박스 */}
            <div style={{ flex: 5 }} className="min-w-0 min-h-0 flex flex-col rounded-[3rem] border border-[#ece9fb] bg-[#f9f8ff] shadow-sm overflow-hidden px-10 py-7">
              <ExecutionHistoryList
                history={executionHistory}
                onRowClick={() => setCurrentPage('테스트')}
              />
            </div>

          </div>
        </div>
      )}

      {activeTab === 'people' && (
        <PeopleTab />
      )}

      {activeTab === 'settings' && (
        <SettingsTab
          serviceName={serviceName}
          serviceId={projectMeta?.service_id}
          reposFromServer={projectMeta?.repos}
          stagingUrlFromServer={projectMeta?.staging_url}
          onServiceUpdated={onServiceUpdated}
        />
      )}
    </div>
  );
}
