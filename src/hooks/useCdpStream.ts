import { useEffect, useRef, useState } from 'react';

/** 마지막 프레임 후 이 시간(ms) 동안 새 프레임이 없으면 stale 로 보고 화면을 비운다. */
const STALE_FRAME_MS = 1200;

/**
 * FastAPI WebSocket (`/api/agent/ws/stream/{traceId}`) 에서 CDP Screencast
 * JPEG 프레임을 수신해 `data:image/jpeg;base64,...` URL 로 반환한다.
 *
 * - 스텝별 스크린샷 폴링과 독립적으로 동작 (스트리밍은 라이브 화면, 스크린샷은 폴백).
 * - `enabled` 가 false 이거나 traceId 가 없으면 WebSocket 을 열지 않는다.
 * - 개발 환경: vite proxy 가 `/api/agent/ws` → FastAPI(8001) 로 포워딩.
 *   배포 환경: `VITE_FASTAPI_WS_URL` 로 절대 WS URL 지정 가능.
 * - 연결 종료/오류 시 자동 정리한다.
 * - **Stale 방지**: TC 가 바뀌는 동안(컨텍스트 재생성 등) 프레임이 잠시 끊기면,
 *   `cdpFrameDataUrl` 이 이전 TC 의 마지막 프레임에 멈춰 "현재 테스트와 다른 화면"
 *   으로 보이는 문제가 있었다. 마지막 프레임 후 STALE_FRAME_MS 동안 새 프레임이
 *   없으면 null 로 비워, 호출 측이 현재 스텝 스크린샷으로 폴백하게 한다.
 */
export function useCdpStream(
  traceId: string | null | undefined,
  enabled: boolean,
): string | null {
  const [frameDataUrl, setFrameDataUrl] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !traceId) {
      setFrameDataUrl(null);
      return;
    }

    // VITE_FASTAPI_WS_URL 명시 시 직접 연결, 미설정 시 현재 host 기준 상대 경로
    // (vite proxy `/api/agent/ws` → ws://localhost:8001 경유).
    const wsBase =
      (import.meta.env.VITE_FASTAPI_WS_URL as string | undefined) ??
      `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
    const url = `${wsBase}/api/agent/ws/stream/${encodeURIComponent(traceId)}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    const armStaleTimer = () => {
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
      staleTimerRef.current = setTimeout(() => setFrameDataUrl(null), STALE_FRAME_MS);
    };

    ws.onmessage = (e: MessageEvent) => {
      const data = e.data as string;
      if (!data) return; // keep-alive 빈 문자열 무시
      setFrameDataUrl(`data:image/jpeg;base64,${data}`);
      armStaleTimer(); // 새 프레임 도착 → stale 타이머 리셋
    };

    ws.onerror = () => {
      // 스트리밍 실패는 치명적이지 않다 — 스크린샷 폴링이 폴백으로 동작.
      console.warn('[useCdpStream] WebSocket error', url);
    };

    ws.onclose = (e) => {
      console.info('[useCdpStream] WebSocket closed', 'code:', e.code);
      if (wsRef.current === ws) wsRef.current = null;
      setFrameDataUrl(null);
    };

    return () => {
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
      ws.close();
      if (wsRef.current === ws) wsRef.current = null;
      setFrameDataUrl(null);
    };
  }, [traceId, enabled]);

  return frameDataUrl;
}
