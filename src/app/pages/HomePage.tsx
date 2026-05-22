import React, { useState } from 'react';
import { Copy, Check, Download, Edit2, KeyRound, Link2, MoreHorizontal, Plus, Shield, ShieldCheck, Users, X } from 'lucide-react';
import { SearchBar } from '../components/common/SearchBar';
import { FileList } from '../components/common/FileList';
import { ExecutionHistoryRow } from '../components/common/ExecutionHistoryRow';
import { PassRateChart } from '../components/common/PassRateChart';
import { RTMDonutChart } from '../components/common/RTMDonutChart';
import { useRtmStore } from '../../store/rtmStore';
import { useTestStore } from '../../store/testStore';
import type { RtmRequirement } from '../../api/rtm';

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

function CopyBlock({ label, icon, value }: { label: string; icon: React.ReactNode; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-6">
      <label className="flex items-center gap-1.5 text-sm font-semibold text-[#1a1a2e] mb-1.5">
        {icon}
        {label}
      </label>
      <div className="w-full max-w-lg flex items-center gap-2 px-3 py-2 rounded-lg border border-[#e5e7eb] bg-[#f9fafb]">
        <span className="flex-1 text-sm text-[#374151] font-mono truncate">{value}</span>
        <button
          onClick={handleCopy}
          className="shrink-0 flex items-center gap-1 text-xs text-[#6b7280] hover:text-[#3615CF] transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? '복사됨' : '복사'}</span>
        </button>
      </div>
    </div>
  );
}

function SettingsTab({
  serviceName,
  projectSlug,
  dashboardUrl,
  serverAuthToken,
  localPath,
  framework,
  language,
}: {
  serviceName: string;
  projectSlug?: string;
  dashboardUrl?: string;
  serverAuthToken?: string;
  localPath?: string;
  framework?: string;
  language?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(serviceName);
  const [descVal, setDescVal] = useState('');
  const [savedName, setSavedName] = useState(serviceName);
  const [savedDesc, setSavedDesc] = useState('');

  const slug = projectSlug || savedName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-') || 'my-project';

  const handleEdit = () => { setNameVal(savedName); setDescVal(savedDesc); setEditing(true); };
  const handleCancel = () => setEditing(false);
  const handleSave = () => { setSavedName(nameVal); setSavedDesc(descVal); setEditing(false); };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex h-full px-20 py-12">

        {/* Left */}
        <div className="flex-1 pr-16">
          <div className="border-b border-[#f0f0f0] pb-2 mb-7 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1a1a2e]">General</h2>
            {editing ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-1.5 bg-[#3615CF] text-white text-xs font-semibold rounded-lg hover:bg-[#3615CF]/90 transition-colors"
                >
                  저장
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1 px-4 py-1.5 border border-[#e5e7eb] text-xs text-[#6b7280] rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="w-3 h-3" /> 취소
                </button>
              </div>
            ) : (
              <button
                onClick={handleEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6b7280] border border-[#e5e7eb] rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> 수정
              </button>
            )}
          </div>

          {/* 서비스 표시 이름 */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-[#1a1a2e] mb-1.5">서비스 표시 이름</label>
            {editing ? (
              <input
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#f3f4f6] border border-transparent focus:border-[#3615CF]/40 focus:bg-white focus:outline-none text-sm text-[#374151] transition-colors"
              />
            ) : (
              <p className="text-sm text-[#374151] px-3 py-2 rounded-lg bg-[#f9fafb] border border-[#f0f0f0]">{savedName}</p>
            )}
          </div>

          {/* 설명 */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-[#1a1a2e] mb-1.5">설명</label>
            {editing ? (
              <textarea
                rows={4}
                value={descVal}
                onChange={e => setDescVal(e.target.value)}
                placeholder="서비스에 대한 간단한 설명을 입력하세요"
                className="w-full px-3 py-2 rounded-lg bg-[#f3f4f6] border border-transparent focus:border-[#3615CF]/40 focus:bg-white focus:outline-none text-sm text-[#374151] resize-none transition-colors placeholder-[#9ca3af]"
              />
            ) : (
              <p className="text-sm text-[#9ca3af] px-3 py-2 rounded-lg bg-[#f9fafb] border border-[#f0f0f0] min-h-[80px]">
                {savedDesc || '설명 없음'}
              </p>
            )}
          </div>

        </div>
        
       
        {/* Divider */}
        <div className="w-px bg-[#f0f0f0] self-stretch" />

        {/* Right */}
        <div className="flex-1 pl-16">
          <div className="border-b border-[#f0f0f0] pb-2 mb-7">
            <h2 className="text-xl font-bold text-[#1a1a2e]">연동 정보</h2>
          </div>
          <CopyBlock
            label="URL"
            icon={<Link2 className="w-4 h-4 text-[#9ca3af]" />}
            value={dashboardUrl || `http://localhost:8080/${slug}`}
          />
          <CopyBlock
            label="서버 인증 토큰"
            icon={<KeyRound className="w-4 h-4 text-[#9ca3af]" />}
            value={serverAuthToken || `qap_${slug}_tok_a3f8d2c1e9b4`}
          />
          <CopyBlock
            label="로컬 경로"
            icon={<Link2 className="w-4 h-4 text-[#9ca3af]" />}
            value={localPath || '(로컬 경로 없음)'}
          />
          <div className="mt-6 rounded-2xl border border-[#ece9fb] bg-[#f9f8ff] px-5 py-4">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#9ca3af] mb-2">Project Runtime</div>
            <div className="text-sm text-[#374151]">
              {framework || '-'} / {language || '-'}
            </div>
          </div>
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
  projectSlug,
  projectMeta,
  projectSummary,
  projectCredentials,
}: {
  setCurrentPage: (page: string) => void;
  navigateToHistory: (filter: string) => void;
  activeTab?: string;
  serviceName?: string;
  projectSlug?: string;
  projectMeta?: ProjectMeta | null;
  projectSummary?: ProjectSummary | null;
  projectCredentials?: { dashboard_url: string; server_auth_token: string } | null;
}) {
  void navigateToHistory;

  // RTM 도넛 — 선택된 버전의 requirements 에서 derive
  const selectedRtmVersion = useRtmStore((s) => s.getSelectedVersion());
  const rtmRequirements = selectedRtmVersion?.requirements ?? EMPTY_REQUIREMENTS;
  const totalReqs = rtmRequirements.length;
  const metReqs = rtmRequirements.filter(r => r.status === '충족').length;
  const unmetReqs = rtmRequirements.filter(r => r.status === '미충족').length;
  const unrunReqs = rtmRequirements.filter(r => r.totalCount === 0).length;
  const overallPassTotal = rtmRequirements.reduce((s, r) => s + r.passCount, 0);
  const overallTotal = rtmRequirements.reduce((s, r) => s + r.totalCount, 0);
  const overallPct = overallTotal > 0 ? Math.round((overallPassTotal / overallTotal) * 100) : 0;

  // 실행 이력 / PASS 추이 — testStore 에서 derive
  const testResults = useTestStore((s) => s.results);
  const executionHistory = React.useMemo(
    () => useTestStore.getState().getExecutionHistory(),
    [testResults],
  );
  const passHistory = React.useMemo(
    () => useTestStore.getState().getPassHistory(14),
    [testResults],
  );
  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {activeTab === 'overview' && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* 상단 — RTM + PASS율 */}
          <div className="flex-shrink-0 flex items-start gap-10 px-10 py-6 border-b border-[#f0f0f0]">

            {/* RTM */}
            <div className="flex-shrink-0">
              <Label>RTM</Label>
              <div className="flex items-center gap-6 mt-[28px]">
                <RTMDonutChart
                  metReqs={metReqs}
                  unmetReqs={unmetReqs}
                  unrunReqs={unrunReqs}
                  totalReqs={totalReqs}
                  overallPct={overallPct}
                  size="xl"
                />
              </div>
            </div>

            {/* PASS율 — Y축 고정, 데이터만 가로 스크롤 */}
            <div className="flex-1 min-w-0">
              <PassRateChart
                data={passHistory}
                height={260}
                stickyAxes
              />
            </div>
          </div>

          {/* 하단 — FILES + 이력 2분할 */}
          <div className="flex-1 min-h-0 overflow-y-auto flex gap-8 px-12 py-10">

            {/* FILES */}
            <div className="flex-1 min-w-0 rounded-[2.5rem] border border-[#ece9fb] bg-[#f9f8ff] shadow-sm px-8 py-7">
              <FileList />
            </div>

            {/* 이력 */}
            <div className="flex-1 min-w-0 rounded-[2.5rem] border border-[#ece9fb] bg-[#f9f8ff] shadow-sm px-8 py-7">
              <Label>이력</Label>
              <div className="mt-4 space-y-0.5">
                {executionHistory.map(exec => (
                  <ExecutionHistoryRow
                    key={exec.id}
                    exec={exec}
                    onClick={() => setCurrentPage('테스트')}
                  />
                ))}
              </div>
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
          projectSlug={projectSlug}
          dashboardUrl={projectCredentials?.dashboard_url || (projectSlug ? `http://localhost:8080/${projectSlug}` : undefined)}
          serverAuthToken={projectCredentials?.server_auth_token}
          localPath={projectMeta?.local_path}
          framework={projectMeta?.framework}
          language={projectMeta?.language}
        />
      )}
    </div>
  );
}
