import { useEffect, useRef, useState } from 'react';

/**
 * FastAPI WebSocket (`/api/agent/ws/stream/{traceId}`) 에서 CDP Screencast
 * JPEG 프레임을 수신해 `data:image/jpeg;base64,...` URL 로 반환한다.
 *
 * - 스텝별 스크린샷 폴링과 독립적으로 동작 (스트리밍은 라이브 화면, 스크린샷은 폴백).
 * - `enabled` 가 false 이거나 traceId 가 없으면 WebSocket 을 열지 않는다.
 * - 개발 환경: vite proxy 가 `/api/agent/ws` → FastAPI(8001) 로 포워딩.
 *   배포 환경: `VITE_FASTAPI_WS_URL` 로 절대 WS URL 지정 가능.
 * - 연결 종료/오류 시 자동 정리한다.
 */
export function useCdpStream(
  traceId: string | null | undefined,
  enabled: boolean,
): string | null {
  const [frameDataUrl, setFrameDataUrl] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

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

    ws.onmessage = (e: MessageEvent) => {
      const data = e.data as string;
      if (!data) return; // keep-alive 빈 문자열 무시
      setFrameDataUrl(`data:image/jpeg;base64,${data}`);
    };

    ws.onerror = () => {
      // 스트리밍 실패는 치명적이지 않다 — 스크린샷 폴링이 폴백으로 동작.
      console.warn('[useCdpStream] WebSocket error', url);
    };

    ws.onclose = (e) => {
      console.info('[useCdpStream] WebSocket closed', 'code:', e.code);
      if (wsRef.current === ws) wsRef.current = null;
    };

    return () => {
      ws.close();
      if (wsRef.current === ws) wsRef.current = null;
      setFrameDataUrl(null);
    };
  }, [traceId, enabled]);

  return frameDataUrl;
}
