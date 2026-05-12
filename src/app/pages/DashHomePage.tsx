import React, { useState } from 'react';
import { Plus, ChevronRight, X, User } from 'lucide-react';

export interface Service {
  id: string;
  name: string;
  isNew: boolean;
  createdAt: string;
}

interface DashHomePageProps {
  services: Service[];
  onServiceSelect: (service: Service) => void;
  onCreateService: (name: string) => void;
}

export function DashHomePage({ services, onServiceSelect, onCreateService }: DashHomePageProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');

  const handleCreate = () => {
    const trimmed = newServiceName.trim();
    if (trimmed) {
      onCreateService(trimmed);
      setNewServiceName('');
      setShowCreateModal(false);
    }
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setNewServiceName('');
  };

  return (
    <div className="flex-1 flex bg-[#f9f8ff] overflow-hidden">
      {/* 좌측 하단 유저 아이콘 — 사이드바와 동일 위치 */}
      <div className="w-[68px] flex-shrink-0 flex flex-col items-center justify-end pb-2.5">
        <button
          title="프로필"
          className="w-full flex items-center justify-center h-12 text-[#9ca3af] hover:text-[#6b7280] transition-colors"
        >
          <User className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-12">

          {/* Header row */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-xl font-bold text-[#1a1a2e]">서비스 대시보드</h1>
              <p className="text-sm text-[#9ca3af] mt-0.5">{services.length}개의 서비스</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-9 h-9 flex items-center justify-center bg-white border border-[#e5e7eb] rounded-xl text-[#6b7280] hover:text-[#3615CF] hover:border-[#3615CF]/30 hover:shadow-sm transition-all"
              title="서비스 추가"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Service list */}
          <div className="space-y-3">
            {services.map(service => (
              <button
                key={service.id}
                onClick={() => onServiceSelect(service)}
                className="w-full flex items-center gap-4 px-6 py-4 bg-white rounded-2xl border border-[#e5e7eb] hover:border-[#3615CF]/30 hover:shadow-md transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-xl bg-[#EAE8F9] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#3615CF]">
                    {service.name.slice(0, 1)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#1a1a2e] group-hover:text-[#3615CF] transition-colors">
                    {service.name}
                  </div>
                  <div className="text-xs text-[#9ca3af] mt-0.5">{service.createdAt}</div>
                </div>
                {service.isNew && (
                  <span className="text-[10px] font-semibold text-[#f59e0b] bg-[#fef3c7] px-2 py-0.5 rounded-full border border-[#fde68a] flex-shrink-0">
                    설정 필요
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-[#d1d5db] group-hover:text-[#3615CF] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>
            ))}

            {services.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-[#EAE8F9] flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-7 h-7 text-[#3615CF] opacity-50" />
                </div>
                <p className="text-sm text-[#9ca3af]">아직 등록된 서비스가 없습니다</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-3 text-sm text-[#3615CF] hover:underline font-medium"
                >
                  첫 번째 서비스 추가하기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={handleModalClose}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-[#1a1a2e]">새 서비스 대시보드</h3>
              <button
                onClick={handleModalClose}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-[#9ca3af]" />
              </button>
            </div>

            <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">
              서비스 이름
            </label>
            <input
              autoFocus
              type="text"
              value={newServiceName}
              onChange={e => setNewServiceName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') handleModalClose();
              }}
              placeholder="예: 서비스C"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5e7eb] focus:border-[#3615CF]/40 focus:ring-2 focus:ring-[#3615CF]/10 focus:outline-none text-sm text-[#1a1a2e] placeholder-[#c4c9d4] mb-5 transition-all"
            />

            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!newServiceName.trim()}
                className="flex-1 px-4 py-2.5 bg-[#3615CF] text-white rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#3615CF]/90 transition-colors"
              >
                만들기
              </button>
              <button
                onClick={handleModalClose}
                className="flex-1 px-4 py-2.5 border border-[#e5e7eb] rounded-xl text-sm text-[#6b7280] hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
