import { useEffect, useMemo, useRef, useState } from 'react';
import { Folder, Plus, Upload } from 'lucide-react';
import { useFileStore } from '../../../store/fileStore';
import { addFileVersion, uploadFile } from '../../../api/files';

const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">{children}</span>
);

interface FileListProps {
  showNewButton?: boolean;
  serviceId?: string | null;
}

export const FileList = ({ showNewButton = true, serviceId }: FileListProps) => {
  // fileStore.files 변경 시에만 재계산 (getUiFiles 가 매 호출마다 새 배열을 만들기 때문에 selector 직접 호출 금지).
  const storeFiles = useFileStore((s) => s.files);
  const files = useMemo(() => useFileStore.getState().getUiFiles(), [storeFiles]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const targetFileIdRef = useRef<string | null>(null);

  // 파일 목록은 시나리오 생성 파이프라인(doc_update 등) 완료 시점에 갱신되지만,
  // 그 타이밍을 놓치는 경우(폴링 race, 다른 트리거 경로 등)에도 "반영 여부" 배지가
  // 항상 최신 상태를 보여주도록, 팝업이 열려 이 컴포넌트가 마운트될 때마다 재조회한다.
  useEffect(() => {
    if (!serviceId) return;
    useFileStore.getState().loadFiles(serviceId).catch((err) => console.error('파일 목록 로드 실패', err));
  }, [serviceId]);

  const triggerUpload = (targetFileId: string | null = null) => {
    if (!serviceId || uploading) return;
    targetFileIdRef.current = targetFileId;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetFileId = targetFileIdRef.current;
    targetFileIdRef.current = null;
    e.target.value = '';
    if (!file || !serviceId) return;
    setUploading(true);
    try {
      if (targetFileId) {
        await addFileVersion(serviceId, targetFileId, file);
      } else {
        await uploadFile(serviceId, file);
      }
      await useFileStore.getState().loadFiles(serviceId);
    } catch (err) {
      console.error('파일 업로드 실패', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-0 h-full">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <Label>Files</Label>
        {showNewButton && (
          <button onClick={() => triggerUpload()} disabled={!serviceId || uploading}
            title={!serviceId ? '서비스를 선택해야 업로드할 수 있습니다' : undefined}
            className="flex items-center gap-1 text-xs text-[#9ca3af] hover:text-[#3615CF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[#9ca3af]">
            <Plus className="w-3.5 h-3.5" /> {uploading ? '업로드 중…' : 'new'}
          </button>
        )}
      </div>
      <div className="space-y-1 flex-1 min-h-0 overflow-y-auto max-h-[60vh] pr-1">
        {files.map(file => (
          <div key={file.id} className="flex items-center gap-3 py-2.5 group">
            <Folder className="w-5 h-5 flex-shrink-0 text-[#a0a8b4]" fill="currentColor" strokeWidth={0} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#1a1a2e]">{file.name}</div>
              <div className="text-[11px] text-[#9ca3af]">{file.version} · {file.date}</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {file.reflected ? (
                <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-[#3615CF]/10 text-[#3615CF]">
                  시나리오 반영됨
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-[#f0f0f0] text-[#9ca3af]">
                  미반영
                </span>
              )}
              <button onClick={() => triggerUpload(file.id)} disabled={!serviceId || uploading}
                title={!serviceId ? '서비스를 선택해야 업로드할 수 있습니다' : undefined}
                className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-[#e5e7eb] text-[#6b7280] hover:bg-gray-50 hover:text-[#1a1a2e] hover:border-[#d0d7de] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#6b7280]">
                <Upload className="w-3 h-3" /> 업데이트 +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
