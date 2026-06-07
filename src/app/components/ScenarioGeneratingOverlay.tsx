import { useEffect, useRef, useState } from 'react';
import loadingGif from '../../assets/loading.gif';

export interface OverlayStep {
  message: string;
  duration: number;
}

const SCENARIO_STEPS: OverlayStep[] = [
  { message: 'PRD/정책 문서를 읽는 중...', duration: 2200 },
  { message: '요구사항을 분석하는 중...', duration: 2400 },
  { message: '시나리오를 생성하는 중...', duration: 2600 },
  { message: '실행 시퀀스로 변환하는 중...', duration: 1800 },
  { message: 'Playwright 코드를 작성하는 중...', duration: 2200 },
  { message: '시나리오 생성이 완료됐어요!', duration: 1200 },
];

interface Props {
  onComplete?: () => void;
  /** 커스텀 진행 단계. 미입력 시 시나리오 생성 기본 단계 사용. */
  steps?: OverlayStep[];
  /**
   * 백엔드 실시간 진행률 (0-100) + 메시지. 제공되면(controlled 모드) 타이머 대신
   * 이 값으로 바를 구동하고, 오버레이 닫기는 부모(trace 폴링)가 담당한다.
   * null/미입력이면 기존 타이머 애니메이션 + onComplete 로 동작 (Redis 미설정 fallback).
   */
  progress?: { percent: number; message?: string } | null;
}

export default function ScenarioGeneratingOverlay({ onComplete, steps, progress }: Props) {
  const STEPS = steps ?? SCENARIO_STEPS;
  const controlled = progress != null;
  const [stepIdx, setStepIdx] = useState(0);
  const [displayPct, setDisplayPct] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let blob: Blob | null = null;
    let currentUrl = '';

    const restart = () => {
      if (!blob || !imgRef.current) return;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      currentUrl = URL.createObjectURL(blob);
      imgRef.current.src = currentUrl;
    };

    fetch(loadingGif)
      .then(r => r.blob())
      .then(b => { blob = b; restart(); });

    const t = setInterval(restart, 2000);
    return () => {
      clearInterval(t);
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, []);

  // 타이머 단계 진행 — controlled 모드에서는 실시간 이벤트가 바를 구동하므로 비활성.
  useEffect(() => {
    if (controlled) return;
    if (stepIdx >= STEPS.length) return;
    const t = setTimeout(() => setStepIdx(s => s + 1), STEPS[stepIdx].duration);
    return () => clearTimeout(t);
  }, [stepIdx, controlled]);

  // 타이머 기반 자동 완료 — controlled 모드에서는 부모(trace 폴링)가 닫는다.
  useEffect(() => {
    if (controlled) return;
    if (stepIdx === STEPS.length) {
      const t = setTimeout(() => onComplete?.(), 800);
      return () => clearTimeout(t);
    }
  }, [stepIdx, onComplete, controlled]);

  const isDone = !controlled && stepIdx >= STEPS.length;
  const current = STEPS[Math.min(stepIdx, STEPS.length - 1)];
  const timerPct = Math.round((Math.min(stepIdx, STEPS.length - 1) / (STEPS.length - 1)) * 100);

  // 표시 진행률 — controlled/타이머 어느 쪽이든 단조 증가로 클램프(역행 방지).
  useEffect(() => {
    const candidate = controlled ? progress!.percent : (isDone ? 100 : timerPct);
    setDisplayPct(p => Math.max(p, candidate));
  }, [controlled, progress, isDone, timerPct]);

  // controlled 모드 creep — 실시간 이벤트 사이 긴 공백(예: doc_import 수십 초) 동안 바가
  // 멈춰 보이지 않도록, 다음 이벤트 값을 넘지 않는 선에서 1%씩 완만히 전진시킨다.
  useEffect(() => {
    if (!controlled) return;
    const target = Math.min((progress?.percent ?? 0) + 8, 97);
    const t = setInterval(() => {
      setDisplayPct(p => (p < target ? Math.min(p + 1, target) : p));
    }, 1200);
    return () => clearInterval(t);
  }, [controlled, progress]);

  const message = controlled ? (progress?.message || '생성하는 중...') : current.message;
  const leftLabel = controlled
    ? '진행 중'
    : (isDone ? '완료' : `${Math.min(stepIdx, STEPS.length - 1)} / ${STEPS.length - 1} 단계`);

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm gap-6">
      <img
        ref={imgRef}
        src={loadingGif}
        alt="loading mascot"
        className={`w-24 h-24 object-contain transition-all ${isDone ? 'scale-110' : ''}`}
      />

      <div className="text-center">
        <p className="text-sm font-semibold text-[#1a1a2e]">{message}</p>
      </div>

      <div className="w-64">
        <div className="flex justify-between text-[10px] text-[#9ca3af] mb-1.5">
          <span>{leftLabel}</span>
          <span>{displayPct}%</span>
        </div>
        <div className="h-1 rounded-full bg-[#f0f0f0] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#3615CF] transition-all duration-700"
            style={{ width: `${displayPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
