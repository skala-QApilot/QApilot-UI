import { Sparkles } from 'lucide-react';
import { FileList } from './common/FileList';

interface LinkedFilesModalProps {
  open: boolean;
  onClose: () => void;
  onRequestChange: () => void;
  serviceId?: string | null;
}

export function LinkedFilesModal({ open, onClose, onRequestChange, serviceId }: LinkedFilesModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="px-8 pt-7 pb-5">
          <FileList serviceId={serviceId} />
        </div>
        <div className="px-6 pb-5 flex items-center gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 bg-white border border-[#e5e7eb] rounded-lg text-sm hover:bg-gray-50">
            닫기
          </button>
          <button
            onClick={onRequestChange}
            className="flex-1 px-4 py-2 bg-[#3615CF] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:shadow-md transition-shadow">
            수정 요청
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
