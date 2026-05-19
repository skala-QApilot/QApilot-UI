import { useEffect, useRef, useState } from 'react';
import loadingGif from '../../assets/loading.gif';

export interface ScenarioOverlayStep {
  message: string;
  duration: number;
}

export type OverlayStatus = 'polling' | 'completed' | 'failed' | 'error' | 'idle';

interface Props {
  /** trace 폴링 상태. polling/completed/failed/error/idle */
  status: OverlayStatus;
  /** 단계 메시지. 기본은 Layer 1A 3단계. C5 코드 생성 시 1B 단계로 교체. */
  steps?: ScenarioOverlayStep[];
  /** 실패 시 에러 메시지 (있으면 status='failed'/'error' UI 에서 표시). */
  errorMessage?: string | null;
  /** trace 완료 후 호출. 보통 store reload + overlay close. */
  onComplete?: () => void;
  /** 사용자가 닫기 버튼 클릭 (실패 시 노출). */
  onClose?: () => void;
}

const DEFAULT_STEPS_1A: ScenarioOverlayStep[] = [
  { message: 'PRD/정책 문서를 읽는 중...', duration: 2200 },
  { message: '요구사항을 분석하는 중...', duration: 2400 },
  { message: '시나리오를 생성하는 중...', duration: 2600 },
];

export default function ScenarioGeneratingOverlay({
  status,
  steps = DEFAULT_STEPS_1A,
  errorMessage,
  onComplete,
  onClose,
}: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  // GIF 루프 — 일정 간격으로 재시작
  useEffect(() => {
    let blob: Blob | null = null;
    let currentUrl = '';
    const restart = () => {
      if (!blob || !imgRef.current) return;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      currentUrl = URL.createObjectURL(blob);
      imgRef.current.src = currentUrl;
    };
    fetch(loadingGif).then(r => r.blob()).then(b => { blob = b; restart(); });
    const t = setInterval(restart, 2000);
    return () => {
      clearInterval(t);
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, []);

  // 폴링 중에는 단계 메시지를 순환 표시 (사용자 시각 피드백).
  // trace 가 완료되면 마지막 단계로 점프 → onComplete 호출.
  useEffect(() => {
    if (status === 'completed') {
      setStepIdx(steps.length);
      const t = setTimeout(() => onComplete?.(), 800);
      return () => clearTimeout(t);
    }
    if (status === 'polling') {
      if (stepIdx >= steps.length) return;
      const t = setTimeout(() => setStepIdx(s => Math.min(s + 1, steps.length - 1)), steps[stepIdx].duration);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [status, stepIdx, steps, onComplete]);

  const isFailed = status === 'failed' || status === 'error';
  const isDone = status === 'completed';
  const safeIdx = Math.min(stepIdx, steps.length - 1);
  const currentMessage = isFailed
    ? (errorMessage || '시나리오 생성 중 오류가 발생했습니다.')
    : isDone
      ? '시나리오 생성이 완료됐어요!'
      : steps[safeIdx]?.message ?? '준비 중...';
  const progress = isDone
    ? 100
    : Math.round((safeIdx / Math.max(steps.length - 1, 1)) * 100);

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm gap-6">
      <img
        ref={imgRef}
        src={loadingGif}
        alt="loading mascot"
        className={`w-24 h-24 object-contain transition-all ${isDone ? 'scale-110' : ''} ${isFailed ? 'opacity-60 grayscale' : ''}`}
      />

      <div className="text-center max-w-md px-4">
        <p className={`text-sm font-semibold ${isFailed ? 'text-[#dc2626]' : 'text-[#1a1a2e]'}`}>
          {currentMessage}
        </p>
      </div>

      {!isFailed && (
        <div className="w-64">
          <div className="flex justify-between text-[10px] text-[#9ca3af] mb-1.5">
            <span>{isDone ? '완료' : `${safeIdx} / ${steps.length - 1} 단계`}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 rounded-full bg-[#f0f0f0] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#3615CF] transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {isFailed && onClose && (
        <button
          onClick={onClose}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#dc2626] rounded-lg hover:bg-[#b91c1c]"
        >
          닫기
        </button>
      )}
    </div>
  );
}
