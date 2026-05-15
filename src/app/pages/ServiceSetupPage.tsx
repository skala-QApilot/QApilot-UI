import React, { useState, useRef, useMemo } from 'react';
import { Link2, Upload, Sparkles, FileText, Copy, Check, KeyRound } from 'lucide-react';

interface ServiceSetupPageProps {
  serviceName: string;
  onGenerateScenarios: () => void;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-') || 'my-project';
}

function CopyBlock({ label, icon, value }: { label: string; icon: React.ReactNode; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-6">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">
        {icon}
        {label}
      </label>
      <div className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-[#e5e7eb] bg-[#f9fafb]">
        <span className="flex-1 text-sm text-[#1a1a2e] font-mono truncate">{value}</span>
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

export function ServiceSetupPage({ serviceName, onGenerateScenarios }: ServiceSetupPageProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const slug = useMemo(() => toSlug(serviceName), [serviceName]);
  const dashboardUrl = `https://qapilot.io/dashboard/${slug}`;
  const serverToken = useMemo(() => `qap_${slug}_tok_a3f8d2c1e9b4`, [slug]);

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
    <div className="h-full flex flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-md">

        <div className="text-center mb-15">
          <div className="w-14 h-14 rounded-2xl bg-[#EAE8F9] flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-bold text-[#3615CF]">{serviceName.slice(0, 1)}</span>
          </div>
          <h2 className="text-lg font-bold text-[#1a1a2e]">{serviceName}</h2>
          <p className="text-sm text-[#9ca3af] mt-1.5">
            서비스 URL 또는 문서를 추가하여 시나리오를 자동으로 생성하세요
          </p>
        </div>

        <CopyBlock
          label="URL"
          icon={<Link2 className="w-3.5 h-3.5" />}
          value={dashboardUrl}
        />

        <CopyBlock
          label="서버 인증 토큰"
          icon={<KeyRound className="w-3.5 h-3.5" />}
          value={serverToken}
        />

        {/* File upload zone */}
        <label className="flex items-center gap-1.5 text-xs font-semibold text-[#6b7280] tracking-wide mb-2 mt-2">
          <Upload className="w-3.5 h-3.5" />
          프로젝트 관련 파일 (PRD, 인터페이스 정의서, 정책 등.)
        </label>
        <div
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full h-36 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer transition-all mb-20 ${
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
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#3615CF] text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-[#3615CF]/20 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          총 시나리오를 자동으로 생성하기
        </button>
      </div>
    </div>
  );
}
