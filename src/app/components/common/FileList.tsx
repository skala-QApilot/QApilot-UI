import { Folder, Plus, Upload } from 'lucide-react';
import { useFileStore } from '../../../store/fileStore';

const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">{children}</span>
);

interface FileListProps {
  showNewButton?: boolean;
}

export const FileList = ({ showNewButton = true }: FileListProps) => {
  const files = useFileStore((s) => s.files);
  const uiFiles = files.map(f => ({
    id: f.file_id,
    name: f.name,
    version: f.version,
    reflected: f.reflected,
    date: (f.uploaded_at || '').slice(0, 10),
  }));
  return (
  <div>
    <div className="flex items-center justify-between mb-4">
      <Label>Files</Label>
      {showNewButton && (
        <button className="flex items-center gap-1 text-xs text-[#9ca3af] hover:text-[#3615CF] transition-colors">
          <Plus className="w-3.5 h-3.5" /> new
        </button>
      )}
    </div>
    <div className="space-y-1">
      {uiFiles.length === 0 && (
        <div className="py-6 text-center text-xs text-[#9ca3af]">파일이 없습니다.</div>
      )}
      {uiFiles.map(file => (
        <div key={file.id} className="flex items-center gap-3 py-2.5 group">
          <Folder className="w-5 h-5 flex-shrink-0 text-[#a0a8b4]" fill="currentColor" strokeWidth={0} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[#1a1a2e]">{file.name}</div>
            <div className="text-xs text-[#9ca3af]">{file.version} · {file.date}</div>
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
            <button className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-[#e5e7eb] text-[#6b7280] hover:bg-gray-50 hover:text-[#1a1a2e] hover:border-[#d0d7de] transition-colors">
              <Upload className="w-3 h-3" /> 업데이트 +
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
  );
};
