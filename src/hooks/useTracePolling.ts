import { useEffect, useRef, useState } from 'react';
import { getTrace, type TraceResponse } from '../api/trace';
import { useAuthStore, DEV_BYPASS_SENTINEL } from '../store/authStore';

export type TraceStatus = 'idle' | 'polling' | 'completed' | 'failed' | 'error';

interface UseTracePollingOptions {
  intervalMs?: number;
  enabled?: boolean;
}

interface UseTracePollingResult {
  trace: TraceResponse | null;
  status: TraceStatus;
  error: Error | null;
  isPolling: boolean;
}

const TERMINAL_TRACE_STATUSES = new Set(['completed', 'failed', 'succeeded', 'error']);

/**
 * trace_id 기반 Agent 실행 상태를 주기 폴링한다.
 * - trace.status 가 completed/failed/succeeded/error 면 자동 중지.
 * - traceId/serviceId 가 비거나 enabled=false 면 폴링 안 함.
 * - dev bypass sentinel 토큰 상태에서는 API 호출 없이 idle 유지 (mock 흐름 보존).
 */
export function useTracePolling(
  serviceId: string | null | undefined,
  traceId: string | null | undefined,
  options: UseTracePollingOptions = {},
): UseTracePollingResult {
  const { intervalMs = 2000, enabled = true } = options;
  const [trace, setTrace] = useState<TraceResponse | null>(null);
  const [status, setStatus] = useState<TraceStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setTrace(null);
    setError(null);

    if (!enabled || !serviceId || !traceId) {
      setStatus('idle');
      return;
    }

    const token = useAuthStore.getState().accessToken;
    if (!token || token === DEV_BYPASS_SENTINEL) {
      setStatus('idle');
      return;
    }

    setStatus('polling');

    const poll = async () => {
      try {
        const next = await getTrace(serviceId, traceId, token);
        if (cancelledRef.current) return;
        setTrace(next);

        const traceStatus = String(next.status ?? '').toLowerCase();
        if (TERMINAL_TRACE_STATUSES.has(traceStatus)) {
          setStatus(traceStatus === 'failed' || traceStatus === 'error' ? 'failed' : 'completed');
          return;
        }
        timerRef.current = setTimeout(poll, intervalMs);
      } catch (e) {
        if (cancelledRef.current) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setStatus('error');
      }
    };

    poll();

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [serviceId, traceId, enabled, intervalMs]);

  return {
    trace,
    status,
    error,
    isPolling: status === 'polling',
  };
}
