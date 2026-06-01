import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';

export type RunEventType = 'status' | 'annotate' | 'tc_result' | 'artifact';

export interface RunEvent {
  type: RunEventType | string;
  data: Record<string, unknown>;
}

interface UseRunStreamOptions {
  /** false 이면 EventSource 안 만듦 — 폴링 only 모드로 강제 가능. */
  enabled?: boolean;
  /** 각 이벤트 도착 시 호출 (status/tc_result/artifact 모두). 폴링 tick 트리거용으로 사용. */
  onEvent?: (event: RunEvent) => void;
}

interface UseRunStreamResult {
  /** EventSource 의 readyState 매핑. */
  state: 'idle' | 'connecting' | 'open' | 'closed';
  /** 가장 최근 도착 이벤트. 같은 type 이 연속 와도 새 객체로 setState 되므로 useEffect 트리거 가능. */
  lastEvent: RunEvent | null;
}

/**
 * Spring SSE 엔드포인트 (`/api/services/{X}/runs/{Y}/stream`) 를 EventSource 로 구독한다.
 *
 * 인증은 ?access_token= 쿼리 파라미터로 — 브라우저 EventSource 가 헤더를 못 보내므로.
 * Spring 의 JwtAuthenticationFilter 가 /stream 경로 한정으로 쿼리 토큰 fallback 을 허용한다.
 *
 * 자동 재연결 — EventSource 내장 동작에 맡김. 인증 실패(401) 등 영구 오류는 close 호출로 막는다.
 * REDIS_URL 미설정 또는 SSE 끊김 시 호출 측은 기존 1초 폴링을 그대로 fallback 으로 사용한다.
 */
export function useRunStream(
  serviceId: string | null | undefined,
  runId: string | null | undefined,
  options: UseRunStreamOptions = {},
): UseRunStreamResult {
  const { enabled = true, onEvent } = options;
  const [state, setState] = useState<'idle' | 'connecting' | 'open' | 'closed'>('idle');
  const [lastEvent, setLastEvent] = useState<RunEvent | null>(null);
  const onEventRef = useRef(onEvent);

  // 콜백 최신화 — 재구독 없이 onEvent reference 갱신.
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled || !serviceId || !runId) {
      setState('idle');
      return;
    }
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      setState('idle');
      return;
    }

    const url = `/api/services/${encodeURIComponent(serviceId)}/runs/${encodeURIComponent(runId)}/stream?access_token=${encodeURIComponent(token)}`;
    setState('connecting');
    const es = new EventSource(url);

    es.onopen = () => setState('open');
    es.onerror = () => {
      // EventSource 는 자체 재연결 — readyState=CLOSED 면 영구 종료된 것.
      if (es.readyState === EventSource.CLOSED) {
        setState('closed');
      }
    };

    const handle = (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data) as RunEvent;
        setLastEvent(parsed);
        onEventRef.current?.(parsed);
      } catch {
        // ignore malformed
      }
    };

    // FastAPI 가 `event:` 라인 포함해 보내면 타입별 listener 가 잡음.
    // Spring 이 forward 하면서 raw `data:` 만 보내는 케이스는 onmessage 가 잡음.
    es.addEventListener('status', handle);
    es.addEventListener('annotate', handle);
    es.addEventListener('tc_result', handle);
    es.addEventListener('artifact', handle);
    es.onmessage = handle;

    return () => {
      es.close();
      setState('closed');
    };
  }, [enabled, serviceId, runId]);

  return { state, lastEvent };
}
