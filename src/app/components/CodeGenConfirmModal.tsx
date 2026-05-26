import { Code2 } from 'lucide-react';

interface CodeGenConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

/**
 * 검토 완료 → 코드 생성 트리거 전 확인 모달.
 *
 * 시나리오 검토가 완료된 후 `POST /api/services/{id}/code-generation` 을
 * 호출하기 직전에 사용자의 명시적 확인을 받는다.
 */
export function CodeGenConfirmModal({ open, onConfirm, onDismiss }: CodeGenConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-full bg-[#3615CF] flex items-center justify-center mx-auto mb-4">
          <Code2 className="w-6 h-6 text-white" />
        </div>
        <div className="font-semibold text-[#1a1a2e] mb-2">테스트 코드 생성</div>
        <div className="text-sm text-[#6b7280] mb-6">
          검토하신 시나리오를 기반으로 테스트 코드가 자동 생성됩니다.<br />
          계속하시겠습니까?
        </div>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-[#3615CF] text-white rounded-lg font-medium text-sm hover:shadow-md transition-shadow"
          >
            생성 시작
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 px-4 py-2 bg-white border border-[#f0f0f0] rounded-lg hover:bg-gray-50 text-sm"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
