import React, { useState, useRef } from 'react';
import { Plus, Sparkles, FileText, Upload, X, Server, ChevronLeft, CornerDownRight, Info, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router';

interface GithubEntry {
  id: string;
  url: string;
  token: string;
}

interface ServiceSetupPageProps {
  serviceName?: string;
  onGenerateScenarios: (name: string) => void;
}

export function ServiceSetupPage({ serviceName = '', onGenerateScenarios }: ServiceSetupPageProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(serviceName);
  const [stagingUrl, setStagingUrl] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [githubEntries, setGithubEntries] = useState<GithubEntry[]>([
    { id: '1', url: '', token: '' },
  ]);

  const addGithubEntry = () => {
    setGithubEntries(prev => [...prev, { id: `${Date.now()}`, url: '', token: '' }]);
  };

  const removeGithubEntry = (id: string) => {
    setGithubEntries(prev => prev.filter(e => e.id !== id));
  };

  const updateGithubEntry = (id: string, field: 'url' | 'token', value: string) => {
    setGithubEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setUploadedFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const canSubmit = name.trim().length > 0;

  const isNameComplete = name.trim().length > 0;
  const isGithubComplete = githubEntries.some(entry => entry.url.trim().length > 0);
  const isStagingComplete = stagingUrl.trim().length > 0;
  const isDocsComplete = uploadedFiles.length > 0;

  const StepMarker = ({ step, completed = false }: { step: string; completed?: boolean }) => (
    <div className="absolute left-[-3rem] top-0 flex w-8 justify-center">
      <div className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
        completed
          ? 'border-[#3615CF] bg-[#3615CF] text-white'
          : 'border-[#dfe3f0] bg-white text-[#6b7280]'
      }`}>
        {step}
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#f9f8ff]">
      <div className="mx-auto w-full max-w-2xl px-6 pt-10 pb-20 ">
        <button
          onClick={() => navigate('/services')}
          className="mb-4 flex items-center gap-1.5 text-sm text-[#b8beca] transition-colors hover:text-[#3615CF]"
        >
          <ChevronLeft className="h-4 w-4" />
          서비스 대시보드로 돌아가기
        </button>

        <div className="mb-10">
          <h1 className="text-xl font-bold text-[#1a1a2e]">새 테스트 대시보드 설정</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">연결할 프로젝트 정보를 입력하면 시나리오를 자동으로 생성해 드립니다.</p>
        </div>

        <div className="space-y-8">
          <div className="relative space-y-8">
            <div className="absolute bottom-4 left-[-2rem] top-4 w-px bg-[#dddff0]" />

            <section className="relative">
              <StepMarker step="1" completed={isNameComplete} />
              <div className="space-y-4">
                <div className="flex min-h-7 items-center gap-2">
                  <h2 className="text-sm font-semibold text-[#1a1a2e]">대시보드 이름</h2>
                  <span className="text-xs text-[#f43b47]">*</span>
                </div>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="예: Frontend App, Backend API"
                  className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3.5 py-3 text-sm text-[#1a1a2e] transition-all placeholder:text-[#c4c9d4] focus:border-[#3615CF]/50 focus:ring-2 focus:ring-[#3615CF]/10 focus:outline-none"
                />
              </div>
            </section>

            <section className="relative">
              <StepMarker step="2" completed={isGithubComplete} />
              <div className="space-y-4">
                <div className="flex min-h-7 items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-[#1a1a2e]">GitHub 저장소</h2>
                  </div>
                  <button
                    onClick={addGithubEntry}
                    className="flex shrink-0 items-center gap-1 text-xs font-medium text-[#3615CF] transition-colors hover:text-[#2d11b0]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    저장소 추가
                  </button>
                </div>

                <div className="space-y-4">
                  {githubEntries.map(entry => (
                    <div key={entry.id} className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="group relative">
                          <input
                            type="url"
                            value={entry.url}
                            onChange={e => updateGithubEntry(entry.id, 'url', e.target.value)}
                            placeholder="https://github.com/owner/repo"
                            className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-3 pr-10 text-sm transition-all placeholder:text-[#c4c9d4] focus:border-[#3615CF]/50 focus:ring-2 focus:ring-[#3615CF]/10 focus:outline-none"
                          />
                          {entry.url.trim() && (
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute right-3 top-1/2 hidden -translate-y-1/2 text-[#c4c9d4] transition-colors hover:text-[#3615CF] group-hover:block"
                              aria-label="GitHub 저장소 열기"
                              title="GitHub 저장소 열기"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      <div className="flex items-center gap-2">
                        <CornerDownRight className="h-4 w-4 shrink-0 text-[#c4c9d4]" />
                        <div className="group relative flex-1">
                          <input
                            type="password"
                            value={entry.token}
                            onChange={e => updateGithubEntry(entry.id, 'token', e.target.value)}
                            placeholder="GitHub Personal Access Token (optional)"
                            className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-3 pr-10 font-mono text-sm transition-all placeholder:text-[#c4c9d4] focus:border-[#3615CF]/50 focus:ring-2 focus:ring-[#3615CF]/10 focus:outline-none"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Info className="h-4 w-4 text-[#c4c9d4]" />
                          </div>
                          <div className="pointer-events-none absolute right-0 top-12 z-10 hidden w-56 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-xs leading-5 text-[#6b7280] shadow-sm group-hover:block">
                            저장소를 공개적으로 읽을 수 없는 경우에만 Private Repository 접근 권한이 필요합니다.
                          </div>
                        </div>
                      </div>
                      </div>
                      {githubEntries.length > 1 && (
                        <button
                          onClick={() => removeGithubEntry(entry.id)}
                          className="mt-2 shrink-0 rounded-lg p-1.5 text-[#c4c9d4] transition-colors hover:bg-red-50 hover:text-[#f43b47]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="relative">
              <StepMarker step="3" completed={isStagingComplete} />
              <div className="space-y-4">
                <div className="flex min-h-7 items-center gap-2">
                  <Server className="h-4 w-4 text-[#1a1a2e]" />
                  <h2 className="text-sm font-semibold text-[#1a1a2e]">Staging 서버 URL</h2>
                </div>
                <input
                  type="url"
                  value={stagingUrl}
                  onChange={e => setStagingUrl(e.target.value)}
                  placeholder="https://staging.example.com"
                  className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3.5 py-3 text-sm transition-all placeholder:text-[#c4c9d4] focus:border-[#3615CF]/50 focus:ring-2 focus:ring-[#3615CF]/10 focus:outline-none"
                />
              </div>
            </section>

            <section className="relative">
              <StepMarker step="4" completed={isDocsComplete} />
              <div className="space-y-4">
                <div className="flex min-h-7 items-center gap-2">
                  <Upload className="h-4 w-4 text-[#1a1a2e]" />
                  <h2 className="text-sm font-semibold text-[#1a1a2e]">관련 문서</h2>
                  <span className="text-xs text-[#9ca3af]">PRD, 인터페이스 정의서, 정책 등</span>
                </div>

                <div
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
                    isDragOver ? 'border-[#3615CF] bg-white' : 'border-[#e5e7eb] bg-white hover:border-[#3615CF]/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xlsx,.xls,.txt,.md"
                    onChange={handleFileChange}
                  />
                  <Upload className={`mb-1.5 h-5 w-5 ${isDragOver ? 'text-[#3615CF]' : 'text-[#c4c9d4]'}`} />
                  <span className="text-xs text-[#9ca3af]">파일을 드래그하거나 클릭하여 업로드</span>
                  <span className="mt-0.5 text-[10px] text-[#c4c9d4]">PDF, DOC, XLSX, MD 지원</span>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2">
                        <FileText className="h-3.5 w-3.5 flex-shrink-0 text-[#3615CF]" />
                        <span className="flex-1 truncate text-xs text-[#1a1a2e]">{file.name}</span>
                        <span className="flex-shrink-0 text-[10px] text-[#9ca3af]">{(file.size / 1024).toFixed(0)}KB</span>
                        <button
                          onClick={e => { e.stopPropagation(); removeFile(index); }}
                          className="p-0.5 text-[#c4c9d4] transition-colors hover:text-[#f43b47]"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="pt-8">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => onGenerateScenarios(name.trim())}
                disabled={!canSubmit}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#3615CF] px-5 py-3.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Sparkles className="h-4 w-4" />
                테스트 대시보드 생성하기
              </button>
              <button
                onClick={() => navigate('/services')}
                className="rounded-xl border border-[#e5e7eb] px-6 py-3.5 text-sm text-[#6b7280] transition-colors hover:bg-white"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
