import { useEffect, useRef, useState } from 'react';
import { Bot, X, CheckCircle, XCircle, Eye, Play, Pause } from 'lucide-react';
import {
  getTcResult, getApiResult, getActionMapping, tcScreenshotUrl,
  type UiResult, type ApiResult, type ActionMapping,
} from '../../api/artifacts';
import { listDefects, type Defect } from '../../api/defects';
import { buildVerdictSummary, koAction } from '../utils/verdictSummary';
import { useStepGifPlayer } from '../hooks/useStepGifPlayer';

interface ResultDrawerProps {
  open: boolean;
  onClose: () => void;
  serviceId: string;
  traceId: string;        // 결과(테스트) run trace
  tsId: string;           // TS-001
  tcId: string;           // 전체 tc_id — TS-001-TC-01
  pass: boolean;
  tcName?: string;
}

/** RTM 등에서 TC 클릭 시 우측에 뜨는 리사이즈 결과 패널 (Notion side-peek 느낌).
 *  테스트 결과 화면처럼 실행 스텝 + 스텝별 캡처 + 봇 말투 pass/fail 이유 요약. */
export function ResultDrawer({
  open, onClose, serviceId, traceId, tsId, tcId, pass, tcName,
}: ResultDrawerProps) {
  const [width, setWidth] = useState(480);
  const [ui, setUi] = useState<UiResult | null>(null);
  const [am, setAm] = useState<ActionMapping | null>(null);   // 실제 입력값(value) 출처
  const [apiRes, setApiRes] = useState<ApiResult | null>(null);
  const [defect, setDefect] = useState<Defect | null>(null);

  // 결과 데이터 로드 (tcId 바뀌면 재로드).
  useEffect(() => {
    if (!open || !serviceId || !traceId || !tcId) return;
    let cancelled = false;
    (async () => {
      const [u, a, m, defects] = await Promise.all([
        getTcResult(serviceId, traceId, tsId, tcId),
        getApiResult(serviceId, traceId, tsId, tcId),
        getActionMapping(serviceId, traceId, tcId),
        pass ? Promise.resolve([] as Defect[]) : listDefects(serviceId, { runId: traceId }),
      ]);
      if (cancelled) return;
      setUi(u);
      setAm(m);
      setApiRes(a);
      setDefect(defects.find(d => d.tc_id === tcId) ?? null);
    })();
    return () => { cancelled = true; };
  }, [open, serviceId, traceId, tsId, tcId, pass]);

  // 실행 스텝 캡처를 GIF 처럼 0.5초마다 자동 재생 (스텝 행 클릭 시 정지).
  const gif = useStepGifPlayer({
    stepNos: (ui?.steps ?? []).map((s) => s.step_no),
    endpointFor: (n) => tcScreenshotUrl(serviceId, traceId, tsId, tcId, n),
    resetKey: `${traceId}/${tsId}/${tcId}`,
  });
  const activeStep = gif.active;

  // 리사이즈 드래그 (좌측 핸들)
  const dragging = useRef(false);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setWidth(Math.min(Math.max(window.innerWidth - e.clientX, 360), 920));
    };
    const onUp = () => { dragging.current = false; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // Esc 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const steps = ui?.steps ?? [];
  // 실행 스텝(ui_result)엔 value 가 없음 — action_mapping 의 실제 입력값을 step_no 로 합쳐 표시.
  const amByStep = new Map((am?.steps ?? []).map(s => [s.step_no, s] as const));
  const apiCalls = (apiRes?.calls ?? []).filter(c => /\/api\//.test(c.url));
  const summary = buildVerdictSummary({ pass, ui, api: apiRes, defect });

  return (
    <div
      className="fixed top-16 right-0 z-50 bg-white shadow-2xl border-l border-[#e5e7eb] flex flex-col"
      style={{ width, height: 'calc(100vh - 4rem)' }}
    >
      {/* 리사이즈 핸들 */}
      <div
        onMouseDown={() => { dragging.current = true; document.body.style.userSelect = 'none'; }}
        className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-[#3615CF]/30"
        title="드래그로 너비 조절"
      />
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[#f0f0f0] flex-shrink-0">
        {pass ? <CheckCircle className="w-4 h-4 text-status-pass" /> : <XCircle className="w-4 h-4 text-status-fail" />}
        <span className="font-mono text-sm font-bold text-[#1a1a2e]">{tcId}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${pass ? 'bg-green-100 text-status-pass' : 'bg-red-100 text-status-fail'}`}>
          {pass ? 'PASS' : 'FAIL'}
        </span>
        <button onClick={onClose} className="ml-auto text-[#9ca3af] hover:text-[#1a1a2e]" title="닫기 (Esc)">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {tcName && <div className="text-sm text-[#374151] leading-snug">{tcName}</div>}

        {/* 봇 요약 — 왜 pass/fail 인지 한눈에 */}
        <div className={`rounded-lg border p-4 flex gap-3 ${pass ? 'bg-[#f0fdf4] border-green-200' : 'bg-[#fef2f2] border-red-200'}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${pass ? 'bg-status-pass/15' : 'bg-status-fail/15'}`}>
            <Bot className={`w-4 h-4 ${pass ? 'text-status-pass' : 'text-status-fail'}`} />
          </div>
          <div className="min-w-0">
            <div className="text-sm text-[#1a1a2e] leading-relaxed">{summary.headline}</div>
            {summary.detail && (
              <div className="mt-2 text-xs text-[#6b7280] leading-relaxed">
                <span className="font-semibold">해결: </span>{summary.detail}
              </div>
            )}
          </div>
        </div>

        {/* 결과 화면 — 스텝 캡처 GIF 자동 재생 (▶/⏸ 로 정지·재개) */}
        <div>
          <div className="flex items-center mb-2">
            <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">
              결과 화면 {steps.length ? <span className="text-[#9ca3af] normal-case">· step {activeStep}</span> : null}
            </div>
            {steps.length > 1 && (
              <button
                type="button"
                onClick={() => gif.setPlaying((p) => !p)}
                title={gif.playing ? '자동 재생 정지' : '자동 재생'}
                className="ml-auto flex items-center gap-1 text-[10px] text-[#9ca3af] hover:text-[#3615CF] transition-colors"
              >
                {gif.playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {gif.playing ? '재생 중' : '정지됨'}
              </button>
            )}
          </div>
          <div className="w-full bg-gray-100 rounded border border-[#f0f0f0] flex items-center justify-center overflow-hidden" style={{ minHeight: 180 }}>
            {gif.src
              ? <img src={gif.src} alt={`step ${activeStep} 캡처`} className="w-full object-contain" />
              : <div className="text-xs text-[#9ca3af] py-14">이 스텝의 캡처가 없습니다</div>}
          </div>
        </div>

        {/* 실행 스텝 — 클릭 시 그 스텝 캡처로 전환 (테스트 결과 화면과 동일 형태) */}
        <div>
          <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">실행 스텝</div>
          {steps.length ? (
            <table className="w-full text-xs">
              <tbody>
                {steps.map((st) => {
                  const isFail = st.status === 'fail';
                  const isActive = st.step_no === activeStep;
                  return (
                    <tr
                      key={st.step_no}
                      onClick={() => gif.pick(st.step_no)}
                      className={`border-t border-[#f5f5f5] cursor-pointer ${isActive ? 'bg-[#3615CF]/5' : isFail ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="py-1.5 w-8 text-[#9ca3af] align-top">{st.step_no}</td>
                      <td className="py-1.5 w-20 text-[#1a1a2e] font-medium align-top">{koAction(st.action)}</td>
                      <td className="py-1.5 text-[#6b7280] align-top truncate max-w-[120px]" title={amByStep.get(st.step_no)?.value ?? ''}>
                        {amByStep.get(st.step_no)?.value ?? <span className="text-[#d1d5db]">—</span>}
                      </td>
                      <td className="py-1.5 align-top">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          st.status === 'pass' ? 'bg-status-pass/15 text-status-pass'
                          : isFail ? 'bg-status-fail/15 text-status-fail'
                          : 'bg-gray-100 text-[#9ca3af]'
                        }`}>{st.status ?? '실행'}{isFail ? ' ← 실패' : ''}</span>
                        {isFail && st.error ? (
                          <div className="mt-1 text-[10px] text-status-fail whitespace-pre-wrap break-all">{st.error.split('\n')[0]}</div>
                        ) : null}
                      </td>
                      <td className="py-1.5 w-8 text-right align-top">
                        <Eye className={`w-3.5 h-3.5 inline ${isActive ? 'text-[#3615CF]' : 'text-[#d1d5db]'}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-xs text-[#9ca3af]">실행 스텝 기록이 없습니다.</div>
          )}
        </div>

        {/* API 호출 */}
        {apiCalls.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">API 호출</div>
            <div className="rounded border border-[#f0f0f0] bg-white divide-y divide-[#f5f5f5]">
              {apiCalls.map((c, i) => {
                const ok = (c.status_code ?? 0) >= 200 && (c.status_code ?? 0) < 400;
                const path = c.url.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '');
                return (
                  <div key={i} className="px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono">
                    <span className="text-[#1a1a2e] w-12">{c.method}</span>
                    <span className="text-[#6b7280] flex-1 truncate">{path}</span>
                    <span className={`font-semibold ${ok ? 'text-status-pass' : 'text-status-fail'}`}>{c.status_code ?? '—'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
