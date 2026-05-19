import { useEffect, useRef, useState } from 'react';
import loadingGif from '../../assets/loading.gif';

const STEPS = [
  { message: 'PRD/정책 문서를 읽는 중...', duration: 2200 },
  { message: '코드베이스를 스캔하는 중...', duration: 2000 },
  { message: '자연어 요구사항을 해석하는 중...', duration: 2400 },
  { message: '시나리오를 생성하는 중...', duration: 2600 },
  { message: '실행 시퀀스로 변환하는 중...', duration: 1800 },
  { message: 'Playwright 코드를 작성하는 중...', duration: 2200 },
  { message: '시나리오 생성이 완료됐어요!', duration: 1200 },
];

interface Props { onComplete?: () => void; }

export default function ScenarioGeneratingOverlay({ onComplete }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
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

  useEffect(() => {
    if (stepIdx >= STEPS.length) return;
    const t = setTimeout(() => setStepIdx(s => s + 1), STEPS[stepIdx].duration);
    return () => clearTimeout(t);
  }, [stepIdx]);

  useEffect(() => {
    if (stepIdx === STEPS.length) {
      const t = setTimeout(() => onComplete?.(), 800);
      return () => clearTimeout(t);
    }
  }, [stepIdx, onComplete]);

  const isDone = stepIdx >= STEPS.length;
  const current = STEPS[Math.min(stepIdx, STEPS.length - 1)];
  const progress = Math.round((Math.min(stepIdx, STEPS.length - 1) / (STEPS.length - 1)) * 100);

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm gap-6">
      <img
        ref={imgRef}
        src={loadingGif}
        alt="loading mascot"
        className={`w-24 h-24 object-contain transition-all ${isDone ? 'scale-110' : ''}`}
      />

      <div className="text-center">
        <p className="text-sm font-semibold text-[#1a1a2e]">{current.message}</p>
      </div>

      <div className="w-64">
        <div className="flex justify-between text-[10px] text-[#9ca3af] mb-1.5">
          <span>{isDone ? '완료' : `${Math.min(stepIdx, STEPS.length - 1)} / ${STEPS.length - 1} 단계`}</span>
          <span>{isDone ? 100 : progress}%</span>
        </div>
        <div className="h-1 rounded-full bg-[#f0f0f0] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#3615CF] transition-all duration-700"
            style={{ width: `${isDone ? 100 : progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
