import React, { useState } from 'react';
import { Download, MoreHorizontal, Plus, Shield, ShieldCheck, Users } from 'lucide-react';
import { SearchBar } from '../components/common/SearchBar';
import { FileList } from '../components/common/FileList';
import { ExecutionHistoryRow } from '../components/common/ExecutionHistoryRow';
import { PassRateChart } from '../components/common/PassRateChart';
import { RTMDonutChart } from '../components/common/RTMDonutChart';
import { mockExecutionHistory, mockPassHistory, mockRTMRequirements } from '../data/mockData';

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

const SettingsTab = () => (
  <div className="flex-1 overflow-y-auto px-10 py-8">
    <div className="max-w-2xl">
      {/* General */}
      <div className="border-b border-[#f0f0f0] pb-2 mb-7">
        <h2 className="text-xl font-bold text-[#1a1a2e]">General</h2>
      </div>

      <Field label="서비스 표시 이름" placeholder="QAPilot Org" />
     
      <div className="mb-6">
        <label className="block text-sm font-semibold text-[#1a1a2e] mb-1.5">설명</label>
        <textarea
          rows={3}
          placeholder="서비스에 대한 간단한 설명을 입력하세요"
          className="w-full max-w-lg px-3 py-2 rounded-lg bg-[#f3f4f6] border border-transparent focus:border-[#3615CF]/40 focus:bg-white focus:outline-none text-sm text-[#374151] resize-none transition-colors placeholder-[#9ca3af]"
        />
      </div>

      <Field label="URL" placeholder="https://qapilot.io" />

      {/* Save */}
      <div className="mt-8 flex items-center gap-3">
        <button className="px-5 py-2 bg-[#3615CF] text-white text-sm font-semibold rounded-lg hover:bg-[#3615CF]/90 transition-colors">
          저장
        </button>
        <button className="px-5 py-2 border border-[#e5e7eb] text-sm text-[#6b7280] rounded-lg hover:bg-gray-50 transition-colors">
          취소
        </button>
      </div>
    </div>
  </div>
);

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
}: {
  setCurrentPage: (page: string) => void;
  navigateToHistory: (filter: string) => void;
  activeTab?: string;
}) {
  void navigateToHistory;

  const totalReqs = mockRTMRequirements.length;
  const metReqs = mockRTMRequirements.filter(r => r.status === '충족').length;
  const unmetReqs = mockRTMRequirements.filter(r => r.status === '미충족').length;
  const unrunReqs = mockRTMRequirements.filter(r => r.totalCount === 0).length;
  const overallPassTotal = mockRTMRequirements.reduce((s, r) => s + r.passCount, 0);
  const overallTotal = mockRTMRequirements.reduce((s, r) => s + r.totalCount, 0);
  const overallPct = overallTotal > 0 ? Math.round((overallPassTotal / overallTotal) * 100) : 0;

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {activeTab === 'overview' && (
        <div className="flex-1 flex flex-col overflow-y-auto">

          {/* 상단 — RTM + PASS율 */}
          <div className="flex items-start gap-10 px-10 py-9 border-b border-[#f0f0f0]">

            {/* RTM */}
            <div className="flex-shrink-0">
              <Label>RTM</Label>
              <div className="flex items-center gap-6 mt-6">
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
                data={mockPassHistory}
                height={260}
                stickyAxes
                scrollMinWidth={700}
              />
            </div>
          </div>

          {/* 하단 — FILES + 이력 2분할 */}
          <div className="flex gap-8 px-12 py-10">

            {/* FILES */}
            <div className="flex-1 min-w-0 rounded-[2.5rem] border border-[#ece9fb] bg-[#f9f8ff] shadow-sm px-8 py-7">
              <FileList />
            </div>

            {/* 이력 */}
            <div className="flex-1 min-w-0 rounded-[2.5rem] border border-[#ece9fb] bg-[#f9f8ff] shadow-sm px-8 py-7">
              <Label>이력</Label>
              <div className="mt-4 space-y-0.5">
                {mockExecutionHistory.map(exec => (
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

      {activeTab === 'settings' && <SettingsTab />}
    </div>
  );
}
