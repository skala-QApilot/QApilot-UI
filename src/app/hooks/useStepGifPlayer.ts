import { useEffect, useState } from 'react';
import { fetchTcScreenshotUrl } from '../../api/artifacts';

interface StepGifPlayerOptions {
  /** 재생 순서대로 정렬된 스텝 번호. */
  stepNos: number[];
  /** 스텝 번호 → 스크린샷 엔드포인트 (없으면 null). */
  endpointFor: (stepNo: number) => string | null;
  /** TC 가 바뀌면 캐시/재생을 초기화하기 위한 키. */
  resetKey: string | null;
  intervalMs?: number;
}

/**
 * 실행 스텝 캡처를 GIF 처럼 자동 재생하는 훅.
 * - stepNos 순서대로 intervalMs(기본 0.5초) 마다 다음 스텝으로 (마지막 → 처음 반복).
 * - 끊김 없이 보이도록 모든 스텝 캡처를 미리 받아 blob URL 캐시에 보관 (재생 중 즉시 전환).
 * - pick() 으로 특정 스텝을 직접 고르면 자동 재생을 멈춘다. setPlaying(true) 로 재개.
 */
export function useStepGifPlayer({ stepNos, endpointFor, resetKey, intervalMs = 500 }: StepGifPlayerOptions) {
  const [active, setActive] = useState<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const [cache, setCache] = useState<Record<number, string>>({});

  // stepNos 의 내용 기반 키 — 배열 정체성이 매 렌더 바뀌어도 내용이 같으면 effect 가 안 돈다.
  const key = stepNos.join(',');

  // TC(또는 스텝 구성) 변경 시 첫 스텝부터 자동 재생으로 초기화.
  useEffect(() => {
    setActive(stepNos[0] ?? null);
    setPlaying(true);
    // stepNos 는 key 로 대표 (내용 동일하면 재실행 불필요).
  }, [resetKey, key]); // eslint-disable-line react-hooks/exhaustive-deps

  // 모든 스텝 캡처를 미리 받아 캐시. TC/스텝 구성이 바뀌면 새로 받고 이전 URL 은 해제.
  useEffect(() => {
    setCache({});
    if (!stepNos.length) return;
    let cancelled = false;
    const created: string[] = [];
    (async () => {
      for (const n of stepNos) {
        const endpoint = endpointFor(n);
        if (!endpoint) continue;
        const url = await fetchTcScreenshotUrl(endpoint);
        if (cancelled) { if (url) URL.revokeObjectURL(url); return; }
        if (url) {
          created.push(url);
          setCache((prev) => ({ ...prev, [n]: url }));
        }
      }
    })();
    return () => { cancelled = true; created.forEach(URL.revokeObjectURL); };
  }, [resetKey, key]); // eslint-disable-line react-hooks/exhaustive-deps

  // 0.5초마다 다음 스텝 (반복).
  useEffect(() => {
    if (!playing || stepNos.length <= 1) return;
    const id = setInterval(() => {
      setActive((prev) => {
        const idx = stepNos.indexOf(prev ?? stepNos[0]);
        return stepNos[(idx + 1) % stepNos.length];
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [playing, key, intervalMs]); // eslint-disable-line react-hooks/exhaustive-deps

  /** 스텝을 직접 선택 → 자동 재생 정지 후 해당 스텝 표시. */
  const pick = (stepNo: number) => { setActive(stepNo); setPlaying(false); };

  return {
    active,
    playing,
    setPlaying,
    pick,
    /** 현재 활성 스텝의 캡처 blob URL (없으면 null). */
    src: active != null ? cache[active] ?? null : null,
  };
}
