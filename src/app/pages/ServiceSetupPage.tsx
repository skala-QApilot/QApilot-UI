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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const slug = useMemo(() => projectSlug || toSlug(serviceName), [projectSlug, serviceName]);
  const infoCards = [
    { label: '파일 수', value: projectSummary?.file_count ?? '-', icon: FolderOpen },
    { label: '엔드포인트', value: projectSummary?.endpoint_count ?? '-', icon: Workflow },
    { label: '모델 수', value: projectSummary?.model_count ?? '-', icon: Boxes },
    { label: 'Framework', value: projectMeta?.framework ?? '-', icon: Cpu },
  ];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) setUploadedFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="h-full overflow-y-auto bg-white flex items-center">
      <div className="w-full max-w-2xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#EAE8F9] flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-[#3615CF]">{serviceName.slice(0, 1).toUpperCase()}</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1a1a2e]">{serviceName}</h2>
            <p className="text-xs text-[#9ca3af] mt-0.5">서비스 문서를 추가하여 시나리오를 자동으로 생성하세요</p>
          </div>
        </div>

        {/* Project info */}
        <div className="border-t border-[#f0f0f0] pt-6 mb-6">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9ca3af] mb-3">Project Dashboard</div>

          <div className="flex items-center gap-1.5 text-sm mb-1">
            <span className="font-semibold text-[#1a1a2e]">/{slug}</span>
            <span className="text-[#e5e7eb]">·</span>
            <span className="text-[#6b7280]">{projectMeta?.language || 'unknown'}</span>
            <span className="text-[#e5e7eb]">·</span>
            <span className="text-[#6b7280]">{projectMeta?.framework || 'unknown'}</span>
          </div>
          <div className="text-xs text-[#9ca3af] mb-6">
            {projectMeta?.local_path || '로컬 경로 정보가 아직 없습니다.'}
          </div>

          {/* Stats — flat row with dividers */}
          <div className="flex divide-x divide-[#f0f0f0]">
            {infoCards.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="flex-1 px-4 first:pl-0 last:pr-0">
                  <div className="flex items-center gap-1 mb-1.5">
                    <Icon className="w-3 h-3 text-[#c4c9d4] flex-shrink-0" />
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-[#9ca3af] truncate">{card.label}</span>
                  </div>
                  <div className="text-xl font-bold text-[#1a1a2e] leading-none">{card.value}</div>
                </div>
              );
            })}
          </div>

          {/* Status meta */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-5 text-xs text-[#9ca3af]">
            <span>최근 스캔: {projectSummary?.last_scanned_at || projectMeta?.updated_at || '-'}</span>
            <span className="text-[#e5e7eb]">·</span>
            <span>인덱스 상태: {projectSummary?.has_index ? 'connected' : 'missing'}</span>
            <span className="text-[#e5e7eb]">·</span>
            <span>config: {projectMeta?.config_path || '-'}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#f0f0f0] mb-6" />

        {/* File upload */}
        <label className="flex items-center gap-1.5 text-xs font-semibold text-[#6b7280] mb-2">
          <Upload className="w-3.5 h-3.5" />
          프로젝트 관련 파일 (PRD, 인터페이스 정의서, 정책 등.)
        </label>
        <div
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full flex flex-col items-center justify-center border-2 border-dashed cursor-pointer transition-all ${uploadedFiles.length ? 'h-10 mb-3 rounded-lg' : 'h-28 mb-5 rounded-2xl'} ${
            isDragOver
              ? 'border-[#3615CF] bg-[#3615CF]/5'
              : 'border-[#e5e7eb] hover:border-[#3615CF]/30 hover:bg-gray-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xlsx,.xls,.txt"
            multiple
            onChange={handleFileChange}
          />
          {uploadedFiles.length ? (
            <Upload className={`w-4 h-4 transition-colors ${isDragOver ? 'text-[#3615CF]' : 'text-[#c4c9d4]'}`} />
          ) : (
            <>
              <Upload className={`w-6 h-6 mb-1.5 transition-colors ${isDragOver ? 'text-[#3615CF]' : 'text-[#c4c9d4]'}`} />
              <span className="text-sm text-[#9ca3af]">파일을 드래그하거나 클릭하여 업로드</span>
              <span className="text-xs text-[#c4c9d4] mt-0.5">PDF, DOC/X, XLS/X 지원</span>
            </>
          )}
        </div>

        {/* Uploaded file list */}
        {uploadedFiles.length > 0 && (
          <ul className="flex flex-col gap-1.5 mb-5">
            {uploadedFiles.map((file, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f9f9fb] border border-[#f0f0f0]">
                <FileText className="w-3.5 h-3.5 text-[#3615CF] flex-shrink-0" />
                <span className="text-xs text-[#1a1a2e] flex-1 truncate">{file.name}</span>
                <button
                  onClick={() => handleRemoveFile(i)}
                  className="text-[#c4c9d4] hover:text-[#6b7280] text-xs leading-none flex-shrink-0"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Generate button */}
        <button
          onClick={onGenerateScenarios}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#3615CF] text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-[#3615CF]/20 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          총 시나리오를 자동으로 생성하기
        </button>
      </div>
    </div>
  );
}
