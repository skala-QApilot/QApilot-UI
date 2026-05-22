import { RotateCcw } from 'lucide-react';

interface RetestNavModalProps {
  open: boolean;
  retestCheckedIds: Set<string>;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function RetestNavModal({ open, retestCheckedIds, onConfirm, onDismiss }: RetestNavModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-full bg-[#3615CF] flex items-center justify-center mx-auto mb-4">
          <RotateCcw className="w-6 h-6 text-white" />
        </div>
        <div className="font-semibold text-[#1a1a2e] mb-2">재테스트 시나리오 그룹이 생성되었습니다</div>
        <div className="text-sm text-[#6b7280] mb-6">
          선택한 {retestCheckedIds.size}건의 FAIL 케이스로 재테스트 시나리오 그룹을 생성했습니다.<br />
          테스트 실행 페이지로 이동하겠습니까?
        </div>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-[#3615CF] text-white rounded-lg font-medium text-sm hover:shadow-md transition-shadow"
          >
            이동
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 px-4 py-2 bg-white border border-[#f0f0f0] rounded-lg hover:bg-gray-50 text-sm"
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  );
}
