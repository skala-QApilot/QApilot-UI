import { useEffect, useRef, useState } from 'react';
import { ChevronRight, LayoutList, Network, Plus, Trash2, User } from 'lucide-react';
import { deleteService } from '../../api/projects';
import { ServiceGraphCanvas } from '../components/ServiceGraphCanvas';

export interface Service {
  id: string;
  serviceId?: string;  // UUID
  name: string;
  isNew: boolean;
  createdAt: string;
}

interface DashHomePageProps {
  services: Service[];
  onServiceSelect: (service: Service) => void;
  onAddNew: () => void;
  onDeleteService: (serviceId: string) => void;
}

export function DashHomePage({ services, onServiceSelect, onAddNew, onDeleteService }: DashHomePageProps) {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [graphSize, setGraphSize] = useState({ width: 800, height: 500 });

  useEffect(() => {
    if (viewMode !== 'graph') return;
    const el = graphContainerRef.current;
    if (!el) return;

    const obs = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      setGraphSize({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      });
    });
    obs.observe(el);
    // initial size
    setGraphSize({ width: Math.floor(el.clientWidth), height: Math.floor(el.clientHeight) });
    return () => obs.disconnect();
  }, [viewMode]);

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    await deleteService(deleteTargetId);
    onDeleteService(deleteTargetId);
    setDeleteTargetId(null);
  };

  return (
    <div className="flex-1 flex bg-[#f9f8ff] overflow-hidden">
      {/* 좌측 하단 유저 아이콘 */}
      <div className="w-[68px] flex-shrink-0 flex flex-col items-center justify-end pb-2.5">
        <button
          title="프로필"
          className="w-full flex items-center justify-center h-12 text-[#9ca3af] hover:text-[#6b7280] transition-colors"
        >
          <User className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-8 pt-10 pb-6">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#1a1a2e]">서비스 대시보드</h1>
              <p className="text-sm text-[#9ca3af] mt-0.5">{services.length}개의 서비스</p>
            </div>

            <div className="flex items-center gap-2">
              {/* List / Graph toggle */}
              <div className="flex items-center bg-white border border-[#e5e7eb] rounded-xl p-0.5">
                <button
                  onClick={() => setViewMode('list')}
                  title="리스트 뷰"
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                    viewMode === 'list'
                      ? 'bg-[#3615CF] text-white shadow-sm'
                      : 'text-[#9ca3af] hover:text-[#6b7280]'
                  }`}
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('graph')}
                  title="서비스 그래프"
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                    viewMode === 'graph'
                      ? 'bg-[#3615CF] text-white shadow-sm'
                      : 'text-[#9ca3af] hover:text-[#6b7280]'
                  }`}
                >
                  <Network className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={onAddNew}
                className="w-9 h-9 flex items-center justify-center bg-white border border-[#e5e7eb] rounded-xl text-[#6b7280] hover:text-[#3615CF] hover:border-[#3615CF]/30 hover:shadow-sm transition-all"
                title="서비스 추가"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'list' ? (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 pb-12">
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
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setDeleteTargetId(service.serviceId ?? service.id);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#d1d5db] hover:text-red-400 hover:bg-red-50 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                      onClick={onAddNew}
                      className="mt-3 text-sm text-[#3615CF] hover:underline font-medium"
                    >
                      첫 번째 서비스 추가하기
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            ref={graphContainerRef}
            className="flex-1 overflow-hidden mx-6 mb-6 rounded-2xl border border-[#e5e7eb] shadow-sm"
          >
            {services.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center">
                <Network className="w-10 h-10 text-[#3615CF] opacity-20 mb-3" />
                <p className="text-sm text-[#9ca3af]">등록된 서비스가 없습니다</p>
              </div>
            ) : graphSize.width > 0 && (
              <ServiceGraphCanvas
                services={services}
                onServiceSelect={onServiceSelect}
                width={graphSize.width}
                height={graphSize.height}
              />
            )}
          </div>
        )}
      </div>

      {/* 삭제 확인 팝업 */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl">
            <h2 className="text-base font-bold text-[#1a1a2e] mb-2">서비스 삭제</h2>
            <p className="text-sm text-[#6b7280] mb-6">삭제하면 복구할 수 없습니다. 정말 삭제할까요?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 py-2 rounded-xl border border-[#e5e7eb] text-sm text-[#6b7280] hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 rounded-xl bg-red-500 text-sm text-white hover:bg-red-600"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
