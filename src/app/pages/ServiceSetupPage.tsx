import React, { useState, useRef, useMemo } from 'react';
import { Upload, Sparkles, FileText, FolderOpen, Boxes, Workflow, Cpu } from 'lucide-react';
import type { ProjectMeta, ProjectSummary } from './HomePage';

interface ServiceSetupPageProps {
  serviceName: string;
  onGenerateScenarios: () => void;
  projectSlug?: string;
  projectMeta?: ProjectMeta | null;
  projectSummary?: ProjectSummary | null;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-') || 'my-project';
}

export function ServiceSetupPage({
  serviceName,
  onGenerateScenarios,
  projectSlug,
  projectMeta,
  projectSummary,
}: ServiceSetupPageProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const slug = useMemo(() => projectSlug || toSlug(serviceName), [projectSlug, serviceName]);
  const infoCards = [
    { label: '파일 수', value: projectSummary?.file_count ?? '-', icon: FolderOpen },
    { label: '엔드포인트 수', value: projectSummary?.endpoint_count ?? '-', icon: Workflow },
    { label: '모델 수', value: projectSummary?.model_count ?? '-', icon: Boxes },
    { label: 'FRAMEWORK', value: projectMeta?.framework ?? '-', icon: Cpu },
  ];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setUploadedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-white px-6 py-10">
      <div className="w-full max-w-5xl">

        <div className="text-center mb-15">
          <div className="w-14 h-14 rounded-2xl bg-[#EAE8F9] flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-bold text-[#3615CF]">{serviceName.slice(0, 1)}</span>
          </div>
          <h2 className="text-lg font-bold text-[#1a1a2e]">{serviceName}</h2>
          <p className="text-sm text-[#9ca3af] mt-1.5">
            서비스 URL 또는 문서를 추가하여 시나리오를 자동으로 생성하세요
          </p>
        </div>

        <div className="mb-10 rounded-[2rem] border border-[#e6e8f5] bg-[linear-gradient(135deg,#fbfbff_0%,#f5f7ff_100%)] px-8 py-7 shadow-[0_16px_40px_rgba(54,21,207,0.06)]">
          <div className="flex flex-col gap-7 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-[0.28em] text-[#9ca3af]">Project Dashboard</div>
              <h3 className="mt-4 text-[2rem] font-bold text-[#1a1a2e] break-all">{projectMeta?.display_name || serviceName}</h3>
              <div className="mt-2 text-lg text-[#6b7280] break-all">
                /{slug} · {projectMeta?.language || 'unknown'} · {projectMeta?.framework || 'unknown'}
              </div>
              <div className="mt-5 text-base text-[#6b7280] break-all">
                {projectMeta?.local_path || '로컬 경로 정보가 아직 없습니다.'}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-full border border-[#dfe3f5] bg-white/80 px-4 py-2 text-sm text-[#6b7280]">
                  최근 스캔: {projectSummary?.last_scanned_at || projectMeta?.updated_at || '-'}
                </div>
                <div className="rounded-full border border-[#dfe3f5] bg-white/80 px-4 py-2 text-sm text-[#6b7280]">
                  인덱스 상태: {projectSummary?.has_index ? 'connected' : 'missing'}
                </div>
                <div className="rounded-full border border-[#dfe3f5] bg-white/80 px-4 py-2 text-sm text-[#6b7280] break-all">
                  config: {projectMeta?.config_path || '-'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 xl:w-[440px]">
              {infoCards.map(card => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="rounded-[1.35rem] border border-[#e6e8f5] bg-white/90 px-5 py-5 shadow-[0_8px_24px_rgba(17,24,39,0.04)]"
                  >
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]">
                      <Icon className="w-3.5 h-3.5" />
                      {card.label}
                    </div>
                    <div className="mt-4 text-[2rem] font-bold leading-none text-[#1a1a2e]">{card.value}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* File upload zone */}
        <label className="flex items-center gap-1.5 text-xs font-semibold text-[#6b7280] tracking-wide mb-2 mt-2 max-w-2xl mx-auto">
          <Upload className="w-3.5 h-3.5" />
          프로젝트 관련 파일 (PRD, 인터페이스 정의서, 정책 등.)
        </label>
        <div
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full max-w-2xl mx-auto h-36 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer transition-all mb-12 ${
            isDragOver
              ? 'border-[#3615CF] bg-[#3615CF]/5'
              : uploadedFile
              ? 'border-[#10b981] bg-[#10b981]/5'
              : 'border-[#e5e7eb] hover:border-[#3615CF]/30 hover:bg-gray-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xlsx,.xls,.txt"
            onChange={handleFileChange}
          />
          {uploadedFile ? (
            <>
              <FileText className="w-7 h-7 text-[#10b981] mb-2" />
              <span className="text-sm font-medium text-[#10b981]">{uploadedFile.name}</span>
              <span className="text-xs text-[#9ca3af] mt-0.5">클릭하여 변경</span>
            </>
          ) : (
            <>
              <Upload className={`w-7 h-7 mb-2 transition-colors ${isDragOver ? 'text-[#3615CF]' : 'text-[#c4c9d4]'}`} />
              <span className="text-sm text-[#9ca3af]">파일을 드래그하거나 클릭하여 업로드</span>
              <span className="text-xs text-[#c4c9d4] mt-1">PDF, DOC, XLSX 지원</span>
            </>
          )}
        </div>

        {/* Generate button */}
        <button
          onClick={onGenerateScenarios}
          className="w-full max-w-2xl mx-auto flex items-center justify-center gap-2 py-3.5 bg-[#3615CF] text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-[#3615CF]/20 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          총 시나리오를 자동으로 생성하기
        </button>
      </div>
    </div>
  );
}
