import React, { useState, useRef } from 'react';
import { Link2, Upload, Sparkles, FileText } from 'lucide-react';

interface ServiceSetupPageProps {
  serviceName: string;
  onGenerateScenarios: () => void;
}

export function ServiceSetupPage({ serviceName, onGenerateScenarios }: ServiceSetupPageProps) {
  const [url, setUrl] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#EAE8F9] flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-bold text-[#3615CF]">{serviceName.slice(0, 1)}</span>
          </div>
          <h2 className="text-lg font-bold text-[#1a1a2e]">{serviceName}</h2>
          <p className="text-sm text-[#9ca3af] mt-1.5">
            서비스 URL 또는 문서를 추가하여 시나리오를 자동으로 생성하세요
          </p>
        </div>

        {/* URL input */}
        <div className="mb-4">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">
            <Link2 className="w-3.5 h-3.5" />
            URL
          </label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-4 py-3 rounded-xl border border-[#e5e7eb] focus:border-[#3615CF]/40 focus:ring-2 focus:ring-[#3615CF]/10 focus:outline-none text-sm text-[#1a1a2e] placeholder-[#c4c9d4] transition-all"
          />
        </div>

        {/* File upload zone */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full h-36 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer transition-all mb-6 ${
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
