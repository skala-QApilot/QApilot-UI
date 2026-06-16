import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { CheckCircle, ChevronLeft, Download, Eye, Loader2, Pause, Play, RotateCcw, Send, XCircle, MinusCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { SubHeader } from '../components/common/SubHeader';
import { useTestStore } from '../../store/testStore';
import { useScenarioStore } from '../../store/scenarioStore';
import { listDefects, type Defect } from '../../api/defects';
import { listScenarios } from '../../api/scenarios';
import {
  getTcResult, listTcResults, getApiResult, getActionMapping, tcScreenshotUrl, fetchTcScreenshotUrl,
  type UiResult, type ApiResult, type ActionMapping, type ActionStep, type ApiCall,
} from '../../api/artifacts';
import { useStepGifPlayer } from '../hooks/useStepGifPlayer';

/**
 * 인증 필요한 스크린샷 엔드포인트를 Blob 으로 받아 objectURL 로 반환하는 훅.
 * <img src=endpoint> 직접 로드는 Authorization 헤더 미첨부로 401 → 빈 화면이라,
 * authed fetch 후 objectURL 로 바인딩한다. endpoint 변경/언마운트 시 자동 revoke.
 */
function useBlobImage(endpoint: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!endpoint) { setUrl(null); return; }
    let active = true;
    let obj: string | null = null;
    fetchTcScreenshotUrl(endpoint).then((u) => {
      if (active) { obj = u; setUrl(u); }
      else if (u) URL.revokeObjectURL(u);
    });
    return () => { active = false; if (obj) URL.revokeObjectURL(obj); };
  }, [endpoint]);
  return url;
}

type HistoryDetailTab = 'FAIL' | 'PASS' | 'SKIP' | 'UNVERIFIED';

/** "전체 결과" vs "FAIL 탭에서 체크된 항목만" — CSV/PDF/Slack 공유가 공통으로 사용하는 범위. */
export type ResultShareScope = 'all' | 'selected-fail';

/** Slack 전송 팝업(App 레벨)에 전달하는 공유 대상 — 버튼 클릭 시점에 행/제목/파일명을 확정해 넘긴다. */
export interface SlackShareContext {
  scope: ResultShareScope;
  rows: string[][];
  /** rows(헤더 제외) 와 1:1 대응하는 스텝/API 호출 상세 — PDF 카드 렌더링용. */
  details: ResultRowDetail[];
  title: string;
  filenameBase: string;
  meta: ResultReportMeta;
  /** scope === 'selected-fail' 일 때만 채워지는 git 이력 기반 추천 담당자 목록. */
  recommendedAssignees: RecommendedAssignee[];
}

const RESULT_ROW_HEADER = [
  '결과', 'TS ID', 'TS명', 'TC ID', 'TC명', '분류', '원인 분석', '해결 방안', '테스트 스텝', 'API 호출', '검증 요약',
];

// CSV 셀 값 escape — 쉼표/줄바꿈/쌍따옴표 포함 시 쌍따옴표로 감싸고 내부 쌍따옴표는 두 배로.
const escapeCsvField = (value: string): string =>
  /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

/** 행렬 → CSV Blob (UTF-8 BOM 포함, 엑셀 한글 깨짐 방지). */
export const csvBlobFromRows = (rows: string[][]): Blob => {
  const csvContent = rows.map(row => row.map(escapeCsvField).join(',')).join('\r\n');
  return new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
};

/** PDF 표지/요약에 쓰이는 실행 메타데이터 — Slack 공유 컨텍스트에도 포함되어 전달된다. */
export interface ResultReportMeta {
  groupId: string;
  executionNumber: number;
  startDate: string;
  duration: string;
  /** 표지 하단 요약 표 — scope 별로 호출 측(TestResultPage)에서 구성. */
  summary: Array<{ label: string; value: string }>;
}

/** 항목 1건의 스텝/API 호출 상세 — CSV 추가 컬럼 + PDF 카드의 ①②③ 영역에 공통으로 쓰인다. */
export interface ResultRowDetail {
  steps: ActionStep[];
  calls: ApiCall[];
  summary: string;
}

/** FAIL 선택 공유 시 — git 이력(blame) 기준으로 추천된 담당자 1명과 매칭된 TC 목록. */
export interface RecommendedAssignee {
  /** git 커밋 author_email(우선) 또는 author 이름. */
  assignee: string;
  /** 해당 담당자에 매칭된 "TS-xxx-TC-xx" 라벨 목록. */
  tcLabels: string[];
}

// PDF 표지/목차 페이지를 만들 오프스크린 컨테이너 크기 — A4 비율(1:√2)에 맞춰 stretch.
const REPORT_PAGE_PX_WIDTH = 800;
const REPORT_PAGE_PX_HEIGHT = Math.round(REPORT_PAGE_PX_WIDTH * Math.SQRT2);

const STATUS_ORDER = ['FAIL', 'PASS', 'SKIPPED', 'UNVERIFIED'] as const;
const STATUS_SECTION_LABEL: Record<string, string> = {
  FAIL: 'FAIL 목록', PASS: 'PASS 목록', SKIPPED: 'SKIPPED 목록', UNVERIFIED: 'UNVERIFIED 목록',
};
const STATUS_ACCENT: Record<string, string> = {
  FAIL: '#C27272', PASS: '#5E9E7E', SKIPPED: '#d4a017', UNVERIFIED: '#7c8db5',
};
// 섹션 페이지 레이아웃 상수 — 항목 카드 사이 여백 / 제목 블록 여백 / 페이지 상하 패딩.
const ENTRY_GAP_PX = 10;
const SECTION_TITLE_GAP_PX = 20;
const SECTION_PADDING_PX = 48;

/** action 코드 → 한글 라벨 (스텝 표 표시용). */
const ACTION_LABEL: Record<string, string> = {
  navigate: '이동', fill: '입력', click: '클릭', assert: '검증', reload: '새로고침',
  wait: '대기', select: '선택', check: '체크', press: '키입력', hover: '호버',
};

/** 동시 요청 수를 제한하며 items 를 fn 으로 매핑 — N×3 상세 조회가 한꺼번에 몰리지 않도록. */
const mapWithConcurrency = async <T, R>(
  items: T[], limit: number, fn: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
};

/** TC 1건의 스텝/API 호출 상세 — ui_result + api_result + action_mapping 을 묶어 CSV/PDF 공통으로 사용. */
const fetchTcDetail = async (
  serviceUuid: string, traceId: string, tsId: string, tcId: string,
): Promise<ResultRowDetail> => {
  const [ui, apiRes, am] = await Promise.all([
    getTcResult(serviceUuid, traceId, tsId, tcId),
    getApiResult(serviceUuid, traceId, tsId, tcId),
    getActionMapping(serviceUuid, traceId, tcId),
  ]);
  const steps = am?.steps ?? [];
  const calls = apiRes?.calls ?? [];
  const errorCalls = apiRes?.error_calls ?? 0;
  const isApiModeTc = (ui as any)?.verify_mode === 'api';
  const summary = isApiModeTc
    ? `참고 화면 ${steps.length} 스텝 · API 오류 ${errorCalls}건`
    : `${ui?.steps?.filter(s => s.status === 'pass').length ?? 0}/${ui?.steps?.length ?? 0} 스텝 통과 · API 오류 ${errorCalls}건`;
  return { steps, calls, summary };
};

/** "테스트 스텝" CSV 셀 — 스텝별 동작/대상/값/호출 API 를 줄바꿈으로 나열. */
const stepsToCsvText = (steps: ActionStep[]): string =>
  steps.map(s => {
    const target = (s as { selector?: string | null }).selector || s.target_name || s.target_kind || '-';
    return `${s.step_no}. ${ACTION_LABEL[s.action] ?? s.action} / ${target} / ${s.value ?? '-'} / ${s.api_endpoint ?? '-'}`;
  }).join('\n');

/** "API 호출" CSV 셀 — 호출별 METHOD/URL/상태/지연을 줄바꿈으로 나열. */
const callsToCsvText = (calls: ApiCall[]): string =>
  calls.map(c => `${c.method} ${c.url} → ${c.status_code ?? '-'} (${c.latency_ms != null ? `${c.latency_ms}ms` : '-'})`).join('\n');

/** 오프스크린 컨테이너를 build 콜백으로 채운 뒤 html2canvas 로 캡처. fixedHeight 지정 시 단일 페이지용으로 높이를 고정한다. */
const renderReportPage = async (
  build: (container: HTMLDivElement) => void,
  fixedHeight?: number,
): Promise<HTMLCanvasElement> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = `${REPORT_PAGE_PX_WIDTH}px`;
  container.style.boxSizing = 'border-box';
  container.style.background = '#ffffff';
  container.style.fontFamily = "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";
  if (fixedHeight) {
    container.style.height = `${fixedHeight}px`;
    container.style.overflow = 'hidden';
  }
  build(container);
  document.body.appendChild(container);
  try {
    return await html2canvas(container, { scale: 2, backgroundColor: '#ffffff' });
  } finally {
    document.body.removeChild(container);
  }
};

/** 표지 — 제목 + 실행 정보 + 요약 표 + 생성일시. */
const buildCoverPage = (container: HTMLDivElement, title: string, meta: ResultReportMeta) => {
  container.style.padding = '64px 56px';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';

  const top = document.createElement('div');
  top.style.flex = '1';
  top.style.display = 'flex';
  top.style.flexDirection = 'column';
  top.style.justifyContent = 'center';

  const bar = document.createElement('div');
  bar.style.width = '48px';
  bar.style.height = '6px';
  bar.style.background = '#3615CF';
  bar.style.marginBottom = '24px';
  top.appendChild(bar);

  const kicker = document.createElement('div');
  kicker.style.fontSize = '13px';
  kicker.style.letterSpacing = '2px';
  kicker.style.color = '#9ca3af';
  kicker.style.marginBottom = '12px';
  kicker.textContent = 'QAPILOT TEST RESULT REPORT';
  top.appendChild(kicker);

  const heading = document.createElement('div');
  heading.style.fontSize = '30px';
  heading.style.fontWeight = '700';
  heading.style.color = '#1a1a2e';
  heading.style.marginBottom = '16px';
  heading.style.wordBreak = 'break-word';
  heading.textContent = title;
  top.appendChild(heading);

  const execLine1 = document.createElement('div');
  execLine1.style.fontSize = '14px';
  execLine1.style.color = '#6b7280';
  execLine1.textContent = `${meta.groupId} · #${meta.executionNumber}번째 실행`;
  top.appendChild(execLine1);

  const execLine2 = document.createElement('div');
  execLine2.style.fontSize = '14px';
  execLine2.style.color = '#6b7280';
  execLine2.style.marginBottom = '32px';
  execLine2.textContent = `${meta.startDate} · ${meta.duration}`;
  top.appendChild(execLine2);

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.fontSize = '13px';
  meta.summary.forEach(row => {
    const tr = document.createElement('tr');
    const label = document.createElement('td');
    label.textContent = row.label;
    label.style.padding = '10px 16px';
    label.style.borderBottom = '1px solid #f0f0f0';
    label.style.color = '#6b7280';
    label.style.width = '160px';
    const value = document.createElement('td');
    value.textContent = row.value;
    value.style.padding = '10px 16px';
    value.style.borderBottom = '1px solid #f0f0f0';
    value.style.color = '#1a1a2e';
    value.style.fontWeight = '600';
    tr.appendChild(label);
    tr.appendChild(value);
    table.appendChild(tr);
  });
  top.appendChild(table);
  container.appendChild(top);

  const footer = document.createElement('div');
  footer.style.fontSize = '11px';
  footer.style.color = '#9ca3af';
  footer.style.borderTop = '1px solid #f0f0f0';
  footer.style.paddingTop = '16px';
  footer.textContent = `생성일시: ${new Date().toLocaleString('ko-KR')}`;
  container.appendChild(footer);
};

/** 목차 — 섹션명/건수/시작 페이지 번호. */
const buildTocPage = (container: HTMLDivElement, entries: Array<{ label: string; page: number; count: number }>) => {
  container.style.padding = '64px 56px';

  const heading = document.createElement('div');
  heading.style.fontSize = '22px';
  heading.style.fontWeight = '700';
  heading.style.color = '#1a1a2e';
  heading.style.marginBottom = '8px';
  heading.textContent = '목차';
  container.appendChild(heading);

  const bar = document.createElement('div');
  bar.style.width = '48px';
  bar.style.height = '4px';
  bar.style.background = '#3615CF';
  bar.style.marginBottom = '32px';
  container.appendChild(bar);

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.fontSize = '14px';
  if (entries.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.textContent = '표시할 항목이 없습니다.';
    td.style.padding = '14px 8px';
    td.style.color = '#9ca3af';
    tr.appendChild(td);
    table.appendChild(tr);
  }
  entries.forEach((entry, i) => {
    const tr = document.createElement('tr');
    const label = document.createElement('td');
    label.textContent = `${i + 1}. ${entry.label} (${entry.count}건)`;
    label.style.padding = '14px 8px';
    label.style.borderBottom = '1px solid #f0f0f0';
    label.style.color = '#1a1a2e';
    const page = document.createElement('td');
    page.textContent = String(entry.page);
    page.style.padding = '14px 8px';
    page.style.borderBottom = '1px solid #f0f0f0';
    page.style.color = '#6b7280';
    page.style.textAlign = 'right';
    page.style.width = '60px';
    tr.appendChild(label);
    tr.appendChild(page);
    table.appendChild(tr);
  });
  container.appendChild(table);
};

/** 섹션 제목 — 제목 + 색상 강조선. 페이지 분할 시 각 페이지 첫머리에 반복될 수 있다. */
const buildSectionTitle = (heading: string, accent: string): HTMLDivElement => {
  const wrap = document.createElement('div');
  wrap.style.marginBottom = `${SECTION_TITLE_GAP_PX}px`;

  const title = document.createElement('div');
  title.style.fontSize = '18px';
  title.style.fontWeight = '700';
  title.style.color = '#1a1a2e';
  title.style.marginBottom = '4px';
  title.textContent = heading;
  wrap.appendChild(title);

  const bar = document.createElement('div');
  bar.style.width = '36px';
  bar.style.height = '4px';
  bar.style.background = accent;
  wrap.appendChild(bar);

  return wrap;
};

/** "테스트 스텝 (동작 → 호출 API)" 표 — action_mapping.steps. */
const buildStepTable = (steps: ActionStep[]): HTMLElement => {
  if (!steps.length) {
    const empty = document.createElement('div');
    empty.style.fontSize = '11px';
    empty.style.color = '#9ca3af';
    empty.textContent = '스텝 정보가 없습니다.';
    return empty;
  }
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.fontSize = '10px';
  table.style.tableLayout = 'fixed';

  const headRow = document.createElement('tr');
  ([['#', '24px'], ['동작', '46px'], ['대상', '26%'], ['값', '26%'], ['호출 API', '']] as const).forEach(([label, width]) => {
    const th = document.createElement('th');
    th.textContent = label;
    th.style.textAlign = 'left';
    th.style.padding = '3px 6px';
    th.style.color = '#9ca3af';
    th.style.fontWeight = '600';
    th.style.borderBottom = '1px solid #e5e7eb';
    if (width) th.style.width = width;
    headRow.appendChild(th);
  });
  table.appendChild(headRow);

  steps.forEach(s => {
    const tr = document.createElement('tr');
    const target = (s as { selector?: string | null }).selector || s.target_name || s.target_kind || '—';
    [String(s.step_no), ACTION_LABEL[s.action] ?? s.action, target, s.value ?? '—', s.api_endpoint ?? '—']
      .forEach(text => {
        const td = document.createElement('td');
        td.textContent = text;
        td.style.padding = '3px 6px';
        td.style.borderBottom = '1px solid #f5f5f5';
        td.style.color = '#1a1a2e';
        td.style.wordBreak = 'break-word';
        tr.appendChild(td);
      });
    table.appendChild(tr);
  });
  return table;
};

/** "실제 API 호출" 표 — api_result.calls. */
const buildApiCallTable = (calls: ApiCall[]): HTMLElement => {
  if (!calls.length) {
    const empty = document.createElement('div');
    empty.style.fontSize = '11px';
    empty.style.color = '#9ca3af';
    empty.textContent = '기록된 API 호출이 없습니다.';
    return empty;
  }
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.fontSize = '10px';
  table.style.tableLayout = 'fixed';

  const headRow = document.createElement('tr');
  ([['METHOD', '60px'], ['URL', ''], ['상태', '44px'], ['지연', '56px']] as const).forEach(([label, width]) => {
    const th = document.createElement('th');
    th.textContent = label;
    th.style.textAlign = label === '지연' ? 'right' : 'left';
    th.style.padding = '3px 6px';
    th.style.color = '#9ca3af';
    th.style.fontWeight = '600';
    th.style.borderBottom = '1px solid #e5e7eb';
    if (width) th.style.width = width;
    headRow.appendChild(th);
  });
  table.appendChild(headRow);

  calls.forEach(c => {
    const ok = (c.status_code ?? 0) >= 200 && (c.status_code ?? 0) < 400;
    const tr = document.createElement('tr');
    const addCell = (text: string, opts: { align?: string; color?: string; bold?: boolean } = {}) => {
      const td = document.createElement('td');
      td.textContent = text;
      td.style.padding = '3px 6px';
      td.style.borderBottom = '1px solid #f5f5f5';
      td.style.color = opts.color ?? '#1a1a2e';
      td.style.wordBreak = 'break-word';
      if (opts.align) td.style.textAlign = opts.align;
      if (opts.bold) td.style.fontWeight = '600';
      tr.appendChild(td);
    };
    addCell(c.method);
    addCell(c.url);
    addCell(String(c.status_code ?? '—'), { color: ok ? '#5E9E7E' : '#C27272', bold: true });
    addCell(c.latency_ms != null ? `${c.latency_ms}ms` : '—', { align: 'right' });
    table.appendChild(tr);
  });
  return table;
};

/** "검증 요약" 박스 — ui_result 스텝 통과율 + api_result 오류 건수를 사실 그대로 서술. */
const buildVerifySummaryBox = (summary: string): HTMLDivElement => {
  const box = document.createElement('div');
  box.style.fontSize = '11px';
  box.style.color = '#1a1a2e';
  box.style.background = '#f8f9fb';
  box.style.borderRadius = '6px';
  box.style.padding = '8px 10px';
  box.textContent = summary || '-';
  return box;
};

/** 카드 하단에 "테스트 스텝/실제 API 호출/검증 요약" 3블록을 추가 — FAIL/PASS/SKIPPED/UNVERIFIED 공통. */
const appendDetailBlocks = (card: HTMLDivElement, detail: ResultRowDetail) => {
  const addBlock = (label: string, content: HTMLElement) => {
    const block = document.createElement('div');
    block.style.marginTop = '8px';
    const labelEl = document.createElement('div');
    labelEl.style.fontSize = '10px';
    labelEl.style.fontWeight = '700';
    labelEl.style.color = '#9ca3af';
    labelEl.style.marginBottom = '4px';
    labelEl.textContent = label;
    block.appendChild(labelEl);
    block.appendChild(content);
    card.appendChild(block);
  };
  addBlock('테스트 스텝 (동작 → 호출 API)', buildStepTable(detail.steps));
  addBlock('실제 API 호출', buildApiCallTable(detail.calls));
  addBlock('검증 요약', buildVerifySummaryBox(detail.summary));
};

/** FAIL 항목 카드 — TS/TC 식별 정보 + 분류 배지 + 원인 분석/해결 방안 + 스텝/API 상세. */
const buildFailEntry = (row: string[], index: number, accent: string, detail: ResultRowDetail): HTMLDivElement => {
  const [tsId, tsName, tcId, tcName, category, cause, solution] = row;
  const card = document.createElement('div');
  card.style.border = '1px solid #e5e7eb';
  card.style.borderRadius = '8px';
  card.style.padding = '12px 14px';
  card.style.marginBottom = `${ENTRY_GAP_PX}px`;

  const head = document.createElement('div');
  head.style.display = 'flex';
  head.style.justifyContent = 'space-between';
  head.style.alignItems = 'flex-start';
  head.style.gap = '8px';

  const idCol = document.createElement('div');
  const idLine = document.createElement('div');
  idLine.style.fontSize = '12px';
  idLine.style.fontWeight = '700';
  idLine.style.color = '#1a1a2e';
  idLine.textContent = `${index}. ${tsId} / ${tcId}`;
  const nameLine = document.createElement('div');
  nameLine.style.fontSize = '11px';
  nameLine.style.color = '#6b7280';
  nameLine.style.marginTop = '2px';
  nameLine.textContent = [tsName, tcName].filter(Boolean).join(' · ') || '-';
  idCol.appendChild(idLine);
  idCol.appendChild(nameLine);
  head.appendChild(idCol);

  if (category) {
    const badge = document.createElement('div');
    badge.style.fontSize = '10px';
    badge.style.fontWeight = '600';
    badge.style.color = accent;
    badge.style.background = `${accent}1f`;
    badge.style.padding = '2px 8px';
    badge.style.borderRadius = '4px';
    badge.style.whiteSpace = 'nowrap';
    badge.textContent = category;
    head.appendChild(badge);
  }
  card.appendChild(head);

  const addField = (label: string, value: string) => {
    const block = document.createElement('div');
    block.style.marginTop = '8px';
    const labelEl = document.createElement('div');
    labelEl.style.fontSize = '10px';
    labelEl.style.fontWeight = '700';
    labelEl.style.color = '#9ca3af';
    labelEl.style.marginBottom = '2px';
    labelEl.textContent = label;
    const valueEl = document.createElement('div');
    valueEl.style.fontSize = '11px';
    valueEl.style.color = '#1a1a2e';
    valueEl.style.lineHeight = '1.5';
    valueEl.style.whiteSpace = 'pre-wrap';
    valueEl.style.wordBreak = 'break-word';
    valueEl.textContent = value || '-';
    block.appendChild(labelEl);
    block.appendChild(valueEl);
    card.appendChild(block);
  };
  addField('원인 분석', cause);
  addField('해결 방안', solution);

  appendDetailBlocks(card, detail);
  return card;
};

/** PASS/SKIPPED/UNVERIFIED 항목 카드 — TS/TC 식별 정보 + 스텝/API 상세. */
const buildSimpleEntry = (row: string[], index: number, detail: ResultRowDetail): HTMLDivElement => {
  const [tsId, tsName, tcId, tcName] = row;
  const card = document.createElement('div');
  card.style.border = '1px solid #e5e7eb';
  card.style.borderRadius = '8px';
  card.style.padding = '12px 14px';
  card.style.marginBottom = `${ENTRY_GAP_PX}px`;

  const head = document.createElement('div');
  head.style.display = 'flex';
  head.style.justifyContent = 'space-between';
  head.style.alignItems = 'flex-start';
  head.style.gap = '8px';

  const idLine = document.createElement('div');
  idLine.style.fontSize = '12px';
  idLine.style.fontWeight = '700';
  idLine.style.color = '#1a1a2e';
  idLine.style.whiteSpace = 'nowrap';
  idLine.textContent = `${index}. ${tsId} / ${tcId}`;
  head.appendChild(idLine);

  const nameLine = document.createElement('div');
  nameLine.style.fontSize = '11px';
  nameLine.style.color = '#6b7280';
  nameLine.style.textAlign = 'right';
  nameLine.textContent = [tsName, tcName].filter(Boolean).join(' · ') || '-';
  head.appendChild(nameLine);

  card.appendChild(head);
  appendDetailBlocks(card, detail);
  return card;
};

/**
 * 섹션 항목 카드들을 페이지 단위로 묶어 캡처. 카드 높이를 먼저 측정해
 * 한 페이지(REPORT_PAGE_PX_HEIGHT)에 들어갈 만큼만 묶고, 첫 페이지에만
 * 섹션 제목을 붙인다. 카드 하나가 한 페이지보다 길면(긴 원인분석/해결방안 등)
 * 그 카드만 고정 높이 없이 렌더링해 `full: false` 로 표시 — 호출 측에서
 * 이미지 슬라이싱으로 여러 페이지에 나눠 담는다.
 */
const renderSectionPages = async (
  heading: string, accent: string, entries: HTMLDivElement[],
): Promise<Array<{ canvas: HTMLCanvasElement; full: boolean }>> => {
  const measure = document.createElement('div');
  measure.style.position = 'fixed';
  measure.style.left = '-9999px';
  measure.style.top = '0';
  measure.style.width = `${REPORT_PAGE_PX_WIDTH}px`;
  measure.style.boxSizing = 'border-box';
  measure.style.padding = `${SECTION_PADDING_PX}px 40px`;
  measure.style.fontFamily = "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";
  document.body.appendChild(measure);

  const titleEl = buildSectionTitle(heading, accent);
  measure.appendChild(titleEl);
  const titleHeight = titleEl.getBoundingClientRect().height + SECTION_TITLE_GAP_PX;
  measure.removeChild(titleEl);

  entries.forEach(e => measure.appendChild(e));
  const heights = entries.map(e => e.getBoundingClientRect().height + ENTRY_GAP_PX);
  entries.forEach(e => measure.removeChild(e));
  document.body.removeChild(measure);

  const availableHeight = REPORT_PAGE_PX_HEIGHT - SECTION_PADDING_PX * 2;

  type Group = { withTitle: boolean; items: Array<{ el: HTMLDivElement; height: number }> };
  const groups: Group[] = [];
  let current: Group['items'] = [];
  let currentHeight = titleHeight;
  let isFirst = true;
  entries.forEach((el, i) => {
    const height = heights[i];
    if (current.length > 0 && currentHeight + height > availableHeight) {
      groups.push({ withTitle: isFirst, items: current });
      current = [];
      currentHeight = 0;
      isFirst = false;
    }
    current.push({ el, height });
    currentHeight += height;
  });
  groups.push({ withTitle: isFirst, items: current });

  const pages: Array<{ canvas: HTMLCanvasElement; full: boolean }> = [];
  for (const group of groups) {
    const budget = availableHeight - (group.withTitle ? titleHeight : 0);
    const oversized = group.items.length === 1 && group.items[0].height > budget;
    const canvas = await renderReportPage(container => {
      container.style.padding = `${SECTION_PADDING_PX}px 40px`;
      if (group.withTitle) container.appendChild(buildSectionTitle(heading, accent));
      group.items.forEach(({ el }) => container.appendChild(el));
    }, oversized ? undefined : REPORT_PAGE_PX_HEIGHT);
    pages.push({ canvas, full: !oversized });
  }
  return pages;
};

/**
 * 행렬 → 보고서 형태의 PDF Blob. 표지(제목/실행정보/요약 표) → 목차 → 결과별
 * (FAIL/PASS/SKIPPED/UNVERIFIED) 섹션 순으로 페이지를 구성한다. 각 페이지는
 * 오프스크린 HTML 을 html2canvas 로 캡처해 이미지로 삽입하며, 섹션 내용이
 * 길면 여러 페이지로 분할한다. 한글 폰트 임베드 없이도 브라우저 폰트로
 * 한글이 그대로 렌더링된다.
 */
export const pdfBlobFromRows = async (
  title: string, rows: string[][], meta: ResultReportMeta, details: ResultRowDetail[],
): Promise<Blob> => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const addFullPage = (canvas: HTMLCanvasElement, startNewPage: boolean) => {
    if (startNewPage) doc.addPage();
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight);
  };

  const pageCountFor = (canvas: HTMLCanvasElement): number => {
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    let heightLeft = imgHeight - pageHeight;
    let pages = 1;
    while (heightLeft > 1) { pages++; heightLeft -= pageHeight; }
    return pages;
  };

  const addPaginated = (canvas: HTMLCanvasElement, startNewPage: boolean) => {
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png');
    let heightLeft = imgHeight;
    let position = 0;
    if (startNewPage) doc.addPage();
    doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 1) {
      position = heightLeft - imgHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
  };

  // 본문 — 결과(FAIL/PASS/SKIPPED/UNVERIFIED) 별로 묶어 섹션 구성 (빈 섹션은 제외).
  // FAIL 은 분류/원인분석/해결방안까지 포함한 카드, 나머지는 TS/TC 식별 정보만 담은 카드.
  // 모든 카드에 테스트 스텝/실제 API 호출/검증 요약(details)을 공통으로 덧붙인다.
  const body = rows.slice(1).map((row, i) => ({ row, detail: details[i] }));
  const sections = STATUS_ORDER
    .map(status => ({ status, items: body.filter(b => b.row[0] === status) }))
    .filter(s => s.items.length > 0);

  const sectionPages: Array<Array<{ canvas: HTMLCanvasElement; full: boolean }>> = [];
  for (const section of sections) {
    const entries = section.items.map(({ row, detail }, i) => section.status === 'FAIL'
      ? buildFailEntry(row.slice(1), i + 1, STATUS_ACCENT.FAIL, detail)
      : buildSimpleEntry(row.slice(1, 5), i + 1, detail));
    const pages = await renderSectionPages(
      `${STATUS_SECTION_LABEL[section.status]} (${section.items.length}건)`, STATUS_ACCENT[section.status], entries,
    );
    sectionPages.push(pages);
  }

  // 표지(1p) + 목차(1p) 다음부터 섹션이 시작 — 목차에 표기할 페이지 번호를 미리 계산.
  let pageNo = 3;
  const tocEntries = sections.map((section, i) => {
    const entry = { label: STATUS_SECTION_LABEL[section.status], page: pageNo, count: section.items.length };
    pageNo += sectionPages[i].reduce((sum, p) => sum + (p.full ? 1 : pageCountFor(p.canvas)), 0);
    return entry;
  });

  const coverCanvas = await renderReportPage(c => buildCoverPage(c, title, meta), REPORT_PAGE_PX_HEIGHT);
  addFullPage(coverCanvas, false);

  const tocCanvas = await renderReportPage(c => buildTocPage(c, tocEntries), REPORT_PAGE_PX_HEIGHT);
  addFullPage(tocCanvas, true);

  for (const pages of sectionPages) {
    for (const page of pages) {
      if (page.full) addFullPage(page.canvas, true);
      else addPaginated(page.canvas, true);
    }
  }

  return doc.output('blob');
};

/** Blob → 다운로드 트리거 (ScenarioPage 의 CSV 다운로드 패턴과 동일). */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

interface TestResultPageProps {
  selectedExecutionId: string | null;
  setSelectedExecutionId: Dispatch<SetStateAction<string | null>>;
  selectedFailTC: string | null;
  setSelectedFailTC: Dispatch<SetStateAction<string | null>>;
  historyDetailTab: HistoryDetailTab;
  setHistoryDetailTab: Dispatch<SetStateAction<HistoryDetailTab>>;
  retestCheckedIds: Set<string>;
  setRetestCheckedIds: Dispatch<SetStateAction<Set<string>>>;
  setShowRetestNavModal: Dispatch<SetStateAction<boolean>>;
  /** 재테스트 대상 TS — 체크된 FAIL 의 ts_id 들 (App 이 실제 run 트리거에 사용). */
  setRetestTsIds: Dispatch<SetStateAction<string[]>>;
  /** Spring 호출에 필요한 service UUID. selectedExecutionId 는 trace_id. */
  serviceUuid: string | null;
  setShowSlackSendModal: Dispatch<SetStateAction<boolean>>;
  setSlackShareContext: Dispatch<SetStateAction<SlackShareContext | null>>;
}

interface DetailError {
  id: string;
  scenario: string;
  testCase: string;
  tcName: string;
  errorCode: string;
  /** Layer 3 분류 원본 — PRODUCT_DEFECT_CANDIDATE = '결함 검출'(FAIL 이 정상),
   *  그 외 TEST_*­/ENV_* = 테스트·환경 문제(FAIL 이 비정상). FAIL 세분 표시용. */
  category: string;
  summary: string;
  solutions: Array<{ cause: string; solution: string }>;
  errorLog: string;
  /** git 이력(blame) 기준 추천 담당자 — 없으면 null (defects.assignee). */
  assignee: string | null;
}

/** FAIL 이 '정상'(시스템이 제품 결함을 검출한 것)인 분류인지. */
const isDefectDetection = (category: string) => category === 'PRODUCT_DEFECT_CANDIDATE';

/**
 * defects 한 row → TestResultPage 가 기대하는 DetailError 모양으로 변환.
 * scenario 는 ts_id ("TS-002"), testCase 는 tc_id 의 TC- 이후 ("TC-05").
 * Backend 가 단일 root cause + 단일 fix suggestion 만 채우므로 solutions 도 1개.
 * tcName / errorLog 는 defect 스키마에 없음 — 향후 scenario payload + ui_result 조인 필요.
 */
function defectToDetailError(d: Defect): DetailError {
  const tcParts = d.tc_id.split('-TC-');
  const testCase = tcParts.length >= 2 ? `TC-${tcParts[1]}` : d.tc_id;
  return {
    id: d.id,
    scenario: d.ts_id,
    testCase,
    tcName: '',  // TODO: scenarios 의 test_cases 에서 join
    errorCode: ({
      PRODUCT_DEFECT_CANDIDATE: '제품 결함 후보',
      TEST_DEFECT_MAPPING: '테스트 결함 (매핑)',
      TEST_DEFECT_UNVERIFIABLE: '검증 표현력 한계',
      ENV_TIMEOUT: '환경/사전조건 (타임아웃)',
      ENV_UNVERIFIED: '검증 환경 부재',
      UI_ERROR: 'UI 오류', API_ERROR: 'API 오류', DATA_MISMATCH: '데이터 불일치',
      INFRA: '인프라', DOMAIN_RULE: '도메인 규칙',
    } as Record<string, string>)[d.category] ?? d.category,
    category: d.category,
    summary: d.root_cause_top1 ?? '',
    solutions: d.root_cause_top1 || d.solution_guide
      ? [{ cause: d.root_cause_top1 ?? '', solution: d.solution_guide ?? '' }]
      : [],
    errorLog: d.file_location ?? '',
    assignee: d.assignee,
  };
}

export const TestResultPage = ({
  selectedExecutionId,
  setSelectedExecutionId,
  selectedFailTC,
  setSelectedFailTC,
  historyDetailTab,
  setHistoryDetailTab,
  retestCheckedIds,
  setRetestCheckedIds,
  setShowRetestNavModal,
  setRetestTsIds,
  serviceUuid,
  setShowSlackSendModal,
  setSlackShareContext,
}: TestResultPageProps) => {
  // 실제 defects API → mockDetailErrors 형태로 변환.
  // PASS 탭의 mockPassCases 는 향후 tc_results API 로 교체 예정 (현재는 빈 배열).
  const [detailErrors, setDetailErrors] = useState<DetailError[]>([]);

  useEffect(() => {
    if (!serviceUuid || !selectedExecutionId) {
      setDetailErrors([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const defects = await listDefects(serviceUuid, { runId: selectedExecutionId });
        if (cancelled) return;
        setDetailErrors(defects.map(defectToDetailError));
      } catch (err) {
        if (cancelled) return;
        console.error('defects 로드 실패', err);
        setDetailErrors([]);
      }
    })();
    return () => { cancelled = true; };
  }, [serviceUuid, selectedExecutionId]);

  // CSV/PDF/Slack 공유 버튼 — 항목별 스텝/API 상세를 추가 조회하는 동안 버튼에 로딩 표시.
  const [exportBusy, setExportBusy] = useState<{ scope: ResultShareScope; action: 'csv' | 'pdf' | 'slack' } | null>(null);

  // 선택된 TC 의 결과들 — ui_result(스텝/스크린샷), api_result(실제 호출), action_mapping(동작→API).
  const [activeUiResult, setActiveUiResult] = useState<UiResult | null>(null);
  const [activeApiResult, setActiveApiResult] = useState<ApiResult | null>(null);
  // 스텝별 캡처 라이트박스 — 스텝 행 우측 카메라 버튼으로 열림
  const [stepShot, setStepShot] = useState<{ src: string; label: string } | null>(null);
  const [activeActionMapping, setActiveActionMapping] = useState<ActionMapping | null>(null);

  // PASS 탭 — tc_results 직접조회로 채운다 (kind='ui' && status='passed').
  const [passCases, setPassCases] = useState<
    Array<{ id: string; scenario: string; testCase: string; tcName: string; runtimeLog: string }>
  >([]);
  // S 탭 — 검증 미완 (ui kind 'skipped': 자동화 불가 step 보유 등, 수동 검토 대상)
  const [skipCases, setSkipCases] = useState<
    Array<{ id: string; scenario: string; testCase: string; tcName: string; runtimeLog: string }>
  >([]);
  // U 탭 — 판정 보류 (cross_check 'unverified': 검증축 부재/입력결손/분석실패)
  const [unverifiedCases, setUnverifiedCases] = useState<
    Array<{ id: string; scenario: string; testCase: string; tcName: string; runtimeLog: string }>
  >([]);
  // verdict 기준 failed tc_id — FAIL 탭이 defects 전체가 아닌 진짜 F 만 나열하도록
  const [failedVerdictIds, setFailedVerdictIds] = useState<Set<string> | null>(null);

  // 시나리오 payload 의 사람이 읽는 이름 — TS/TC 번호 옆에 "회원가입 - 정상…" 표시용.
  const [tcNames, setTcNames] = useState<Record<string, string>>({});  // 전체 tc_id → 이름
  const [tsNames, setTsNames] = useState<Record<string, string>>({});  // ts_id → 이름
  useEffect(() => {
    if (!serviceUuid) { setTcNames({}); setTsNames({}); return; }
    let cancelled = false;
    listScenarios(serviceUuid).then((scs) => {
      if (cancelled) return;
      const tcm: Record<string, string> = {};
      const tsm: Record<string, string> = {};
      for (const s of scs) {
        if (s.ts_id) tsm[s.ts_id] = s.name ?? '';
        for (const tc of s.test_cases ?? []) tcm[tc.tc_id] = tc.name ?? '';
      }
      setTcNames(tcm); setTsNames(tsm);
    }).catch(() => { if (!cancelled) { setTcNames({}); setTsNames({}); } });
    return () => { cancelled = true; };
  }, [serviceUuid]);
  const tcNm = (scenario: string, testCase: string) => tcNames[`${scenario}-${testCase}`] ?? '';
  const tsNm = (tsId: string) => tsNames[tsId] ?? '';

  useEffect(() => {
    if (!serviceUuid || !selectedExecutionId) {
      setPassCases([]);
      setSkipCases([]);
      setUnverifiedCases([]);
      setFailedVerdictIds(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const items = await listTcResults(serviceUuid, selectedExecutionId);
      if (cancelled) return;
      // verdict 는 cross_check kind (UI/API/DB 정합 + 의도 판정) — ui kind 단독은
      // "의도 도달 구제" 케이스를 누락한다. cc row 없는 옛 run 은 ui fallback.
      // skip 보호: ui 가 검증 안 한 TC 의 cc pass 는 통과로 치지 않는다 (서버 동일 규칙).
      const uiStatus = new Map(items.filter(it => it.kind === 'ui').map(it => [it.tc_id, it.status]));
      const hasCc = items.some(it => it.kind === 'cross_check');
      const verdictKind = hasCc ? 'cross_check' : 'ui';
      const passes = items
        .filter(it => it.kind === verdictKind && it.status === 'passed'
          && !(verdictKind === 'cross_check' && uiStatus.get(it.tc_id) === 'skipped'))
        .map(it => ({
          id: it.tc_id,                                  // 전체 tc_id (예: TS-001-TC-05) — 선택/조회 키
          scenario: it.ts_id,
          testCase: it.tc_id.includes('-TC-') ? `TC-${it.tc_id.split('-TC-')[1]}` : it.tc_id,
          tcName: '',
          runtimeLog: '',
        }));
      setPassCases(passes);
      const skips = items
        .filter(it => it.kind === 'ui' && it.status === 'skipped')
        .map(it => ({
          id: it.tc_id,
          scenario: it.ts_id,
          testCase: it.tc_id.includes('-TC-') ? `TC-${it.tc_id.split('-TC-')[1]}` : it.tc_id,
          tcName: '',
          runtimeLog: '',
        }));
      setSkipCases(skips);
      const skippedIds = new Set(skips.map(x => x.id));
      const unverifieds = items
        .filter(it => it.kind === 'cross_check' && it.status === 'unverified' && !skippedIds.has(it.tc_id))
        .map(it => ({
          id: it.tc_id,
          scenario: it.ts_id,
          testCase: it.tc_id.includes('-TC-') ? `TC-${it.tc_id.split('-TC-')[1]}` : it.tc_id,
          tcName: '',
          runtimeLog: '',
        }));
      setUnverifiedCases(unverifieds);
      setFailedVerdictIds(new Set(
        items.filter(it => it.kind === verdictKind && it.status === 'failed').map(it => it.tc_id)
      ));
    })();
    return () => { cancelled = true; };
  }, [serviceUuid, selectedExecutionId]);

  // FAIL 탭 = verdict(failed) 인 TC 의 defect 만 — ENV/TEST/UNVERIFIABLE 분류
  // defect 는 S/U 탭 영역이라 여기 나열하면 F 카운트와 불일치 (run d054cbe6 실증).
  const verdictFails = failedVerdictIds === null
    ? detailErrors
    : detailErrors.filter(err => failedVerdictIds.has(`${err.scenario}-${err.testCase}`));
  // FAIL 세분 — 결함 검출(정상 FAIL: 시스템이 제품 결함을 잡은 것) vs
  // 테스트·환경(비정상 FAIL: 테스트 자산/환경 문제). Layer 3 분류 기반.
  const defectFailCount = verdictFails.filter(e => isDefectDetection(e.category)).length;
  const abnormalFailCount = verdictFails.length - defectFailCount;
  const failsByTS = verdictFails.reduce((acc, err) => {
    if (!acc[err.scenario]) acc[err.scenario] = [];
    acc[err.scenario].push(err);
    return acc;
  }, {} as Record<string, DetailError[]>);

  const passByTS = passCases.reduce((acc, p) => {
    if (!acc[p.scenario]) acc[p.scenario] = [];
    acc[p.scenario].push(p);
    return acc;
  }, {} as Record<string, typeof passCases>);

  const skipByTS = skipCases.reduce((acc, p) => {
    if (!acc[p.scenario]) acc[p.scenario] = [];
    acc[p.scenario].push(p);
    return acc;
  }, {} as Record<string, typeof skipCases>);

  const unverifiedByTS = unverifiedCases.reduce((acc, p) => {
    if (!acc[p.scenario]) acc[p.scenario] = [];
    acc[p.scenario].push(p);
    return acc;
  }, {} as Record<string, typeof unverifiedCases>);

  // TS명/TC명 조회 — scenarioStore (RTMPage 와 동일한 lazy-load 패턴).
  const scenarios = useScenarioStore((s) => s.scenarios);
  const testCasesByTs = useScenarioStore((s) => s.testCasesByTs);
  const scenarioLoadState = useScenarioStore((s) => s.loadState);
  useEffect(() => {
    if (serviceUuid && scenarioLoadState === 'idle') {
      useScenarioStore.getState().loadScenarios(serviceUuid);
    }
  }, [serviceUuid, scenarioLoadState]);
  const tsNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of scenarios) m[s.ts_id] = s.name;
    return m;
  }, [scenarios]);
  const tcNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const tcs of Object.values(testCasesByTs)) {
      for (const tc of tcs) if (tc.tc_id) m[tc.tc_id] = tc.name;
    }
    return m;
  }, [testCasesByTs]);

  if (!selectedExecutionId) return null;

  // selectedExecutionId 는 testStore.getExecutionHistory() 가 만든 trace_id.
  // store getter 가 매번 새 배열을 만드므로 1회성 lookup 패턴 (조회 즉시 종료) 으로 안전.
  const exec = useTestStore.getState().getExecutionHistory().find(e => e.id === selectedExecutionId);
  // exec 없음 = stale id 또는 aborted/running 상태 — raw results 에서 raw status 확인.
  if (!exec) {
    const raw = useTestStore.getState().results.find(r => r.trace_id === selectedExecutionId);
    const rawStatus = String(raw?.status || '').toLowerCase();
    const heading = rawStatus === 'aborted' ? '이 실행은 중단되었습니다'
      : rawStatus === 'running' ? '진행 중인 테스트입니다'
      : '결과를 찾을 수 없습니다';
    const description = rawStatus === 'aborted'
      ? '"진행 중" 패널의 "이어서 실행" 으로 중단 지점부터 재개할 수 있습니다.'
      : rawStatus === 'running'
        ? '"진행 중" 패널에서 해당 실행을 선택하면 실시간 화면을 볼 수 있습니다.'
        : '선택한 실행 이력이 더 이상 존재하지 않거나 표시할 수 있는 결과가 없습니다.';
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <SubHeader
          leftContent={(
            <button
              type="button"
              onClick={() => { setSelectedExecutionId(null); setSelectedFailTC(null); }}
              className="flex items-center gap-1 text-[#9ca3af] hover:text-[#3615CF] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">이력</span>
            </button>
          )}
        />
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="max-w-md text-center">
            <div className="text-sm font-semibold text-[#1a1a2e] mb-2">{heading}</div>
            <div className="text-xs text-[#6b7280]">{description}</div>
          </div>
        </div>
      </div>
    );
  }

  // CSV/PDF/Slack 공유가 공통으로 쓰는 행렬 빌더 — 'all' 은 PASS/FAIL/SKIP/UNVERIFIED 전체,
  // 'selected-fail' 은 FAIL 탭에서 체크된 항목만 (retestCheckedIds 재사용).
  // 각 항목마다 ui_result/api_result/action_mapping 을 추가 조회해 스텝/API 호출 상세를 붙인다.
  const buildResultRows = async (
    scope: ResultShareScope,
  ): Promise<{ rows: string[][]; details: ResultRowDetail[]; recommendedAssignees: RecommendedAssignee[] }> => {
    const rows: string[][] = [RESULT_ROW_HEADER];
    const fails = scope === 'all'
      ? verdictFails
      : verdictFails.filter(e => retestCheckedIds.has(e.id));

    // FAIL 선택 공유일 때만 — git 이력(blame) 기반 추천 담당자를 assignee 기준으로 그룹핑.
    const assigneeMap = new Map<string, string[]>();
    if (scope === 'selected-fail') {
      fails.forEach(e => {
        if (!e.assignee) return;
        const tcLabel = `${e.scenario}-${e.testCase}`;
        const labels = assigneeMap.get(e.assignee) ?? [];
        labels.push(tcLabel);
        assigneeMap.set(e.assignee, labels);
      });
    }
    const recommendedAssignees: RecommendedAssignee[] = [...assigneeMap].map(([assignee, tcLabels]) => ({
      assignee, tcLabels,
    }));

    type Item = { status: string; tsId: string; tcId: string; base: string[] };
    const items: Item[] = [];

    fails.forEach(e => {
      const sol = e.solutions[0];
      items.push({
        status: 'FAIL', tsId: e.scenario, tcId: `${e.scenario}-${e.testCase}`,
        base: [
          e.scenario, tsNameMap[e.scenario] ?? '', e.testCase, tcNameMap[`${e.scenario}-${e.testCase}`] ?? '',
          e.errorCode, sol?.cause ?? e.summary, sol?.solution ?? '',
        ],
      });
    });

    if (scope === 'all') {
      const pushCase = (status: string, p: { scenario: string; testCase: string; id: string }) =>
        items.push({
          status, tsId: p.scenario, tcId: p.id,
          base: [p.scenario, tsNameMap[p.scenario] ?? '', p.testCase, tcNameMap[p.id] ?? '', '', '', ''],
        });
      passCases.forEach(p => pushCase('PASS', p));
      skipCases.forEach(p => pushCase('SKIPPED', p));
      unverifiedCases.forEach(p => pushCase('UNVERIFIED', p));
    }

    const details = serviceUuid && selectedExecutionId && items.length
      ? await mapWithConcurrency(items, 4, item =>
          fetchTcDetail(serviceUuid, selectedExecutionId, item.tsId, item.tcId))
      : items.map(() => ({ steps: [], calls: [], summary: '' }));

    items.forEach((item, i) => {
      const d = details[i];
      rows.push([item.status, ...item.base, stepsToCsvText(d.steps), callsToCsvText(d.calls), d.summary]);
    });

    return { rows, details, recommendedAssignees };
  };

  const resultFilenameBase = (scope: ResultShareScope): string =>
    scope === 'all'
      ? `테스트결과_${exec.groupId}_${exec.executionNumber}회`
      : `FAIL선택_${exec.groupId}_${exec.executionNumber}회`;

  const resultTitle = (scope: ResultShareScope, rows: string[][]): string =>
    scope === 'all'
      ? `${exec.groupId} #${exec.executionNumber} 테스트 결과`
      : `${exec.groupId} #${exec.executionNumber} FAIL 선택 결과 (${rows.length - 1}건)`;

  // PDF 표지에 들어갈 실행 정보 + 요약 표 — 'all' 은 전체 4종 카운트, 'selected-fail' 은 선택 FAIL 건수만.
  const buildResultMeta = (scope: ResultShareScope, rows: string[][]): ResultReportMeta => {
    const totalCount = (exec.pass ?? 0) + (exec.fail ?? 0)
      + (exec.skipped ?? skipCases.length) + (exec.unverified ?? unverifiedCases.length);
    const summary = scope === 'all'
      ? [
          { label: '총 케이스', value: `${totalCount}건` },
          { label: 'PASS', value: `${exec.pass ?? 0}건` },
          { label: 'FAIL', value: `${exec.fail ?? 0}건 (결함 검출 ${defectFailCount} / 이상 FAIL ${abnormalFailCount})` },
          { label: 'SKIPPED', value: `${exec.skipped ?? skipCases.length}건` },
          { label: 'UNVERIFIED', value: `${exec.unverified ?? unverifiedCases.length}건` },
        ]
      : [
          { label: '선택 FAIL', value: `${rows.length - 1}건` },
          { label: '전체 실행 FAIL', value: `${exec.fail ?? 0}건` },
        ];
    return {
      groupId: exec.groupId,
      executionNumber: exec.executionNumber,
      startDate: exec.startDate,
      duration: exec.duration,
      summary,
    };
  };

  const handleDownloadCsv = async (scope: ResultShareScope) => {
    setExportBusy({ scope, action: 'csv' });
    try {
      const { rows } = await buildResultRows(scope);
      downloadBlob(csvBlobFromRows(rows), `${resultFilenameBase(scope)}.csv`);
    } finally {
      setExportBusy(null);
    }
  };

  const handleDownloadPdf = async (scope: ResultShareScope) => {
    setExportBusy({ scope, action: 'pdf' });
    try {
      const { rows, details } = await buildResultRows(scope);
      const blob = await pdfBlobFromRows(resultTitle(scope, rows), rows, buildResultMeta(scope, rows), details);
      downloadBlob(blob, `${resultFilenameBase(scope)}.pdf`);
    } finally {
      setExportBusy(null);
    }
  };

  const handleOpenSlackShare = async (scope: ResultShareScope) => {
    setExportBusy({ scope, action: 'slack' });
    try {
      const { rows, details, recommendedAssignees } = await buildResultRows(scope);
      setSlackShareContext({
        scope, rows, details, title: resultTitle(scope, rows), filenameBase: resultFilenameBase(scope),
        meta: buildResultMeta(scope, rows), recommendedAssignees,
      });
      setShowSlackSendModal(true);
    } finally {
      setExportBusy(null);
    }
  };

  const activeError = historyDetailTab === 'FAIL'
    ? (verdictFails.find(e => e.id === selectedFailTC) ?? verdictFails[0] ?? null)
    : null;

  const activePass = historyDetailTab === 'PASS'
    ? (passCases.find(p => p.id === selectedFailTC) ?? null)
    : null;

  const activeSkip = historyDetailTab === 'SKIP'
    ? (skipCases.find(p => p.id === selectedFailTC) ?? null)
    : null;

  const activeUnverified = historyDetailTab === 'UNVERIFIED'
    ? (unverifiedCases.find(p => p.id === selectedFailTC) ?? null)
    : null;

  // 활성 TC(fail 또는 pass)의 결과 3종 로드 — ui_result / api_result / action_mapping.
  useEffect(() => {
    const tsId = activeError?.scenario ?? activePass?.scenario ?? activeSkip?.scenario ?? activeUnverified?.scenario ?? null;
    // fail 은 defect 의 축약 testCase 를 full tc_id 로 복원, pass 는 id 가 이미 full tc_id.
    const tcId = activeError
      ? `${activeError.scenario}-${activeError.testCase}`
      : (activePass?.id ?? activeSkip?.id ?? activeUnverified?.id ?? null);
    if (!serviceUuid || !selectedExecutionId || !tsId || !tcId) {
      setActiveUiResult(null);
      setActiveApiResult(null);
      setActiveActionMapping(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const [ui, apiRes, am] = await Promise.all([
        getTcResult(serviceUuid, selectedExecutionId, tsId, tcId),
        getApiResult(serviceUuid, selectedExecutionId, tsId, tcId),
        getActionMapping(serviceUuid, selectedExecutionId, tcId),
      ]);
      if (cancelled) return;
      setActiveUiResult(ui);
      setActiveApiResult(apiRes);
      setActiveActionMapping(am);
    })();
    return () => { cancelled = true; };
    // activeSkip/activeUnverified 누락이 'SKIP/U 탭 클릭 시 상세 미로드' 의
    // 근본 원인이었다 (UI 전수 점검) — deps 에 포함.
  }, [serviceUuid, selectedExecutionId, activeError, activePass, activeSkip, activeUnverified]);

  // FAIL — 첫 fail step 의 step_no + error (Runtime 에러 로그 + UI 캡처 step).
  const failStep = activeUiResult?.steps?.find(s => s.status === 'fail') ?? null;
  const liveErrorLog = failStep?.error ?? activeError?.errorLog ?? '';

  // 실행 스텝(ui_result)엔 value 가 없음 — action_mapping 의 값(실제 입력값)을 step_no 로 합쳐 표시.
  const amByStep = new Map((activeActionMapping?.steps ?? []).map(s => [s.step_no, s] as const));

  // PASS — 스텝 요약을 runtime 로그로, 스크린샷이 있는 step 을 캡처로 사용. 값(value) 포함.
  const passRuntimeLog = activeUiResult?.steps?.length
    ? activeUiResult.steps.map(s => {
        const v = amByStep.get(s.step_no)?.value;
        return `${s.step_no}. ${s.action}${v ? ` (${v})` : ''} → ${s.status ?? '실행'}`;
      }).join('\n')
    : '모든 검증 항목을 통과했습니다.';

  // api-mode TC — 브라우저 미수행이라 스크린샷이 본질적으로 없음. 대신 API
  // 검증 내역 (호출/응답/observe 사유) 을 우측 패널에 표시 (UI 전수 점검 F7/F8).
  const isApiModeTc = (activeUiResult as any)?.verify_mode === 'api';
  const activeAnyTc = activeError ?? activePass ?? activeSkip ?? activeUnverified;

  // 우측 UI 캡처 — fail 은 fail step, 그 외 (pass/skip/unverified) 는 스크린샷
  // 보유 step. api-mode 는 참고 화면 캡처 (step_1.png, agent 가 부가 저장)
  // 를 시도 — 구 run 엔 없을 수 있어 onError placeholder 로 폴백.
  const anyShotStep = activeUiResult?.steps?.find(s => s.screenshot_path) ?? null;
  const activeFullTcId = activeError
    ? `${activeError.scenario}-${activeError.testCase}`
    : (activeAnyTc as any)?.id ?? null;

  // 스텝별 캡처 URL — ui-mode 는 실행 캡처, api-mode 는 참고 화면 (agent 가
  // navigate 만 수행해 스텝 시점 화면 저장). 없으면 라이트박스가 안내 표시.
  const stepShotUrl = (stepNo: number): string | null =>
    (serviceUuid && selectedExecutionId && activeAnyTc && activeFullTcId)
      ? tcScreenshotUrl(serviceUuid, selectedExecutionId, activeAnyTc.scenario, activeFullTcId, stepNo)
      : null;
  const openStepShot = async (stepNo: number, action: string) => {
    const endpoint = stepShotUrl(stepNo);
    if (!endpoint) return;
    // 인증 fetch → Blob (img 직접 로드 시 401 방지). 라이트박스라 클릭 시점에 받음.
    const src = await fetchTcScreenshotUrl(endpoint);
    if (!src) return;
    setStepShot((prev) => {
      if (prev?.src) URL.revokeObjectURL(prev.src);
      return { src, label: `step ${stepNo} · ${ACTION_LABEL[action] ?? action}${isApiModeTc ? ' (참고 화면 — 검증은 API)' : ''}` };
    });
  };
  const closeStepShot = () => setStepShot((prev) => {
    if (prev?.src) URL.revokeObjectURL(prev.src);
    return null;
  });
  // api-mode 대표 화면 — 제출 직전(입력 완료된 폼) 이 가장 시연-친화적이라
  // 터미널 submit 스텝(api_endpoint 보유)을 hero 로. 없으면 마지막 스텝, 그것도
  // 없으면 step 1. (참고 화면은 스텝별로 다르게 저장됨 — navigate→fill→제출직전→결과)
  const apiModeHeroStep =
    activeActionMapping?.steps?.find(s => s.api_endpoint)?.step_no
    ?? (activeActionMapping?.steps?.length
          ? activeActionMapping.steps[activeActionMapping.steps.length - 1].step_no
          : 1);
  // 실행 스텝 캡처를 GIF 처럼 0.5초마다 자동 재생 — ui 스텝(없으면 action_mapping 스텝) 순서대로.
  // 매끄러운 전환을 위해 모든 스텝 캡처를 미리 받아 캐시한다 (스텝의 눈 아이콘 클릭 시 정지).
  const gif = useStepGifPlayer({
    stepNos: (activeUiResult?.steps?.length
      ? activeUiResult.steps.map(s => s.step_no)
      : (activeActionMapping?.steps ?? []).map(s => s.step_no)),
    endpointFor: (n) =>
      (serviceUuid && selectedExecutionId && activeAnyTc && activeFullTcId)
        ? tcScreenshotUrl(serviceUuid, selectedExecutionId, activeAnyTc.scenario, activeFullTcId, n)
        : null,
    resetKey: activeFullTcId,
  });
  // hero 캡처 스텝 — 자동 재생/선택된 스텝(gif.active) 우선, 없으면 기본(실패/캡처보유 스텝).
  const baseHeroStep = isApiModeTc
    ? apiModeHeroStep
    : (activeError && failStep ? failStep.step_no : (anyShotStep ? anyShotStep.step_no : null));
  const heroStep = gif.active ?? baseHeroStep;
  const screenshotEndpoint = (serviceUuid && selectedExecutionId && activeAnyTc && activeFullTcId && heroStep != null)
    ? tcScreenshotUrl(serviceUuid, selectedExecutionId, activeAnyTc.scenario, activeFullTcId, heroStep)
    : null;
  // 프리로드 캐시(gif.src) 우선. 캐시 히트면 fetch 를 건너뛰고(엔드포인트 null),
  // 미스(캡처 없음/스텝 없음)일 때만 인증 fetch → Blob objectURL (img 직접 로드 시 401 방지)
  const fallbackShot = useBlobImage(gif.src ? null : screenshotEndpoint);
  const screenshotSrc = gif.src ?? fallbackShot;

  const formatDuration = (duration: string) => duration;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <SubHeader
        leftContent={(
          <>
            <button
              type="button"
              onClick={() => {
                setSelectedExecutionId(null);
                setSelectedFailTC(null);
              }}
              className="flex items-center gap-1 text-[#9ca3af] hover:text-[#3615CF] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">이력</span>
            </button>
            <div className="w-px h-4 bg-[#e5e7eb]" />
          </>
        )}
        title={exec.groupId}
        titleExtra={(
          <div className="flex items-center gap-3 ml-1">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#3615CF]/10 text-[#3615CF]">#{exec.executionNumber}번째 실행</span>
            <span className="text-sm text-[#9ca3af]">{exec.startDate}</span>
            <span className="text-sm text-[#9ca3af]">{formatDuration(exec.duration)}</span>
            {/* 유효 판정율 — run 상세에서만 강조 (홈/이력의 PASS율 과 다른 지표:
                PASS율 = SUT 품질, 유효 판정율 = 시스템이 결론을 낸 비율) */}
            {(() => {
              const totalCount = (exec.pass ?? 0) + (exec.fail ?? 0)
                + (exec.skipped ?? skipCases.length) + (exec.unverified ?? unverifiedCases.length);
              const validCount = (exec.pass ?? 0) + defectFailCount;
              const rate = totalCount ? Math.round((validCount / totalCount) * 100) : 0;
              return (
                <span
                  className="px-3 py-1 text-xs font-bold rounded-full bg-status-pass/10 text-status-pass border border-status-pass/20"
                  title="유효 판정율 = (PASS + 결함 검출 FAIL) / 전체 — 시스템이 유의미한 결론을 낸 비율"
                >
                  유효 판정율 {rate}%
                </span>
              );
            })()}
          </div>
        )}
        rightContent={(
          <>
            <button
              onClick={() => handleDownloadCsv('all')}
              disabled={exportBusy !== null}
              className="px-3 py-1.5 bg-transparent border border-[#e5e7eb] rounded-lg text-xs text-[#6b7280] hover:text-[#1a1a2e] hover:bg-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {exportBusy?.scope === 'all' && exportBusy.action === 'csv'
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} CSV
            </button>
            <button
              onClick={() => handleDownloadPdf('all')}
              disabled={exportBusy !== null}
              className="px-3 py-1.5 bg-transparent border border-[#e5e7eb] rounded-lg text-xs text-[#6b7280] hover:text-[#1a1a2e] hover:bg-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {exportBusy?.scope === 'all' && exportBusy.action === 'pdf'
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PDF
            </button>
            <button
              onClick={() => handleOpenSlackShare('all')}
              disabled={exportBusy !== null}
              className="px-3 py-1.5 bg-transparent border border-[#e5e7eb] rounded-lg text-xs text-[#6b7280] hover:text-[#1a1a2e] hover:bg-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {exportBusy?.scope === 'all' && exportBusy.action === 'slack'
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Slack 공유
            </button>
          </>
        )}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-white border-r border-[#f0f0f0] flex flex-col flex-shrink-0">
          {/* 4탭 풀스펠링이 w-64 를 넘칠 수 있어 wrap 허용 (UNVERIFIED 삐져나옴 수정) */}
          <div className="px-2 border-b border-[#f0f0f0] flex items-center gap-0 flex-wrap flex-shrink-0">
            {([
              { id: 'FAIL' as const, label: 'FAIL', count: exec.fail, color: 'text-status-fail' },
              { id: 'PASS' as const, label: 'PASS', count: exec.pass, color: 'text-status-pass' },
              { id: 'SKIP' as const, label: 'SKIPPED', count: exec.skipped ?? skipCases.length, color: 'text-[#d4a017]' },
              { id: 'UNVERIFIED' as const, label: 'UNVERIFIED', count: exec.unverified ?? unverifiedCases.length, color: 'text-[#7c8db5]' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => { setHistoryDetailTab(tab.id); setSelectedFailTC(null); }}
                className={`px-2 py-3 text-[11px] font-semibold relative flex items-center gap-1 transition-colors ${
                  historyDetailTab === tab.id ? tab.color : 'text-[#9ca3af] hover:text-[#6b7280]'
                }`}
              >
                {tab.label}
                <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                  historyDetailTab === tab.id
                    ? (tab.id === 'FAIL' ? 'bg-status-fail/15 text-status-fail'
                       : tab.id === 'PASS' ? 'bg-status-pass/15 text-status-pass'
                       : tab.id === 'SKIP' ? 'bg-[#d4a017]/15 text-[#d4a017]'
                       : 'bg-[#7c8db5]/15 text-[#7c8db5]')
                    : 'bg-gray-100 text-[#9ca3af]'
                }`}>{tab.count}</span>
                {historyDetailTab === tab.id && (
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                    tab.id === 'FAIL' ? 'bg-status-fail' : tab.id === 'PASS' ? 'bg-status-pass'
                    : tab.id === 'SKIP' ? 'bg-[#d4a017]' : 'bg-[#7c8db5]'
                  }`} />
                )}
              </button>
            ))}
          </div>

          {/* 유효 판정율 — PASS + 결함검출 FAIL = 시스템이 유의미한 결론을 낸 비율.
              FAIL 중 PRODUCT_DEFECT_CANDIDATE 는 제품 결함을 잡은 '정상 FAIL'. */}
          {(() => {
            const totalCount = (exec.pass ?? 0) + (exec.fail ?? 0)
              + (exec.skipped ?? skipCases.length) + (exec.unverified ?? unverifiedCases.length);
            const validCount = (exec.pass ?? 0) + defectFailCount;
            const validRate = totalCount ? Math.round((validCount / totalCount) * 100) : 0;
            return (
              <div className="px-4 py-2 border-b border-[#f0f0f0] bg-gray-50/60 flex-shrink-0">
                <div className="flex items-center justify-between text-[10px] text-[#6b7280]">
                  <span>유효 판정율 (PASS + 결함 검출)</span>
                  <span className="font-bold text-[#1a1a2e]">{validRate}%</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px]">
                  <span className="text-status-fail">결함 검출 {defectFailCount}</span>
                  <span className="text-[#9ca3af]">·</span>
                  <span className="text-[#d4a017]">테스트·환경 {abnormalFailCount}</span>
                </div>
              </div>
            );
          })()}

          <div className="flex-1 overflow-y-auto py-2">
            {historyDetailTab === 'FAIL' && Object.entries(failsByTS).map(([tsId, errors]) => (
              <div key={tsId}>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-[#f0f0f0]">
                  <input type="checkbox"
                    checked={errors.every(e => retestCheckedIds.has(e.id))}
                    onChange={checked => {
                      const next = new Set(retestCheckedIds);
                      errors.forEach(e => checked.target.checked ? next.add(e.id) : next.delete(e.id));
                      setRetestCheckedIds(next);
                    }}
                    className="w-3.5 h-3.5 accent-[var(--status-fail)] flex-shrink-0"
                  />
                  <XCircle className="w-3.5 h-3.5 text-status-fail flex-shrink-0" />
                  <span className="text-xs font-semibold text-[#1a1a2e]">{tsId}</span>
                  {tsNm(tsId) && <span className="text-[10px] text-[#9ca3af] truncate">{tsNm(tsId)}</span>}
                  <span className="ml-auto text-xs text-status-fail">FAIL {errors.length}</span>
                </div>
                {errors.map(err => {
                  const isActive = (selectedFailTC ?? verdictFails[0]?.id) === err.id;
                  const isChecked = retestCheckedIds.has(err.id);
                  return (
                    <div
                      key={err.id}
                      onClick={() => setSelectedFailTC(err.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-b border-[#f0f0f0] cursor-pointer ${
                        isActive ? 'bg-gradient-to-r from-[#f78ca0]/10 to-[#fe9a8b]/10 border-l-2 border-l-[#f78ca0]' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input type="checkbox"
                        checked={isChecked}
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          const next = new Set(retestCheckedIds);
                          e.target.checked ? next.add(err.id) : next.delete(err.id);
                          setRetestCheckedIds(next);
                        }}
                        className="w-3.5 h-3.5 accent-[var(--status-fail)] flex-shrink-0"
                      />
                      <XCircle className="w-3.5 h-3.5 text-status-fail flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-medium text-[#1a1a2e] truncate">{err.testCase}</span>
                          <span className={`px-1 py-px rounded text-[9px] font-semibold flex-shrink-0 ${
                            isDefectDetection(err.category)
                              ? 'bg-status-fail/10 text-status-fail'
                              : 'bg-[#d4a017]/10 text-[#d4a017]'
                          }`}>{isDefectDetection(err.category) ? '결함 검출' : '테스트·환경'}</span>
                        </div>
                        <div className="text-[10px] text-[#9ca3af] truncate">{tcNm(err.scenario, err.testCase) || err.tcName}</div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setShowRetestNavModal(true); setRetestCheckedIds(new Set([err.id])); setRetestTsIds([err.scenario]); }}
                        title="재테스트 실행"
                        className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-[#9ca3af] hover:text-status-fail hover:bg-status-fail/10 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}

            {historyDetailTab === 'PASS' && Object.entries(passByTS).map(([tsId, passes]) => (
              <div key={tsId}>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-[#f0f0f0]">
                  <CheckCircle className="w-3.5 h-3.5 text-status-pass flex-shrink-0" />
                  <span className="text-xs font-semibold text-[#1a1a2e]">{tsId}</span>
                  {tsNm(tsId) && <span className="text-[10px] text-[#9ca3af] truncate">{tsNm(tsId)}</span>}
                  <span className="ml-auto text-xs text-status-pass">PASS {passes.length}</span>
                </div>
                {passes.map(p => {
                  const isActive = selectedFailTC === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedFailTC(p.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-b border-[#f0f0f0] cursor-pointer ${
                        isActive ? 'bg-gradient-to-r from-status-pass/10 to-status-pass/5 border-l-2 border-l-status-pass' : 'hover:bg-gray-50'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-status-pass flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#1a1a2e] truncate">{p.testCase}</div>
                        <div className="text-[10px] text-[#9ca3af] truncate">{tcNm(p.scenario, p.testCase) || p.tcName}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}


            {historyDetailTab === 'UNVERIFIED' && Object.entries(unverifiedByTS).map(([tsId, us]) => (
              <div key={tsId}>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-[#f0f0f0]">
                  <MinusCircle className="w-3.5 h-3.5 text-[#7c8db5] flex-shrink-0" />
                  <span className="text-xs font-semibold text-[#1a1a2e]">{tsId}</span>
                  {tsNm(tsId) && <span className="text-[10px] text-[#9ca3af] truncate">{tsNm(tsId)}</span>}
                  <span className="ml-auto text-xs text-[#7c8db5]">U {us.length}</span>
                </div>
                {us.map(p => {
                  const isActive = selectedFailTC === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedFailTC(p.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-b border-[#f0f0f0] cursor-pointer ${
                        isActive ? 'bg-gradient-to-r from-[#7c8db5]/10 to-[#7c8db5]/5 border-l-2 border-l-[#7c8db5]' : 'hover:bg-gray-50'
                      }`}
                    >
                      <MinusCircle className="w-3.5 h-3.5 text-[#7c8db5] flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#1a1a2e] truncate">{p.testCase}</div>
                        <div className="text-[10px] text-[#9ca3af] truncate">{tcNm(p.scenario, p.testCase) || '판정 보류 — 검증축 부재/입력결손'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {historyDetailTab === 'SKIP' && Object.entries(skipByTS).map(([tsId, skips]) => (
              <div key={tsId}>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-[#f0f0f0]">
                  <MinusCircle className="w-3.5 h-3.5 text-[#d4a017] flex-shrink-0" />
                  <span className="text-xs font-semibold text-[#1a1a2e]">{tsId}</span>
                  {tsNm(tsId) && <span className="text-[10px] text-[#9ca3af] truncate">{tsNm(tsId)}</span>}
                  <span className="ml-auto text-xs text-[#d4a017]">S {skips.length}</span>
                </div>
                {skips.map(p => {
                  const isActive = selectedFailTC === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedFailTC(p.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-b border-[#f0f0f0] cursor-pointer ${
                        isActive ? 'bg-gradient-to-r from-[#d4a017]/10 to-[#d4a017]/5 border-l-2 border-l-[#d4a017]' : 'hover:bg-gray-50'
                      }`}
                    >
                      <MinusCircle className="w-3.5 h-3.5 text-[#d4a017] flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#1a1a2e] truncate">{p.testCase}</div>
                        <div className="text-[10px] text-[#9ca3af] truncate">{tcNm(p.scenario, p.testCase) || '검증 미완 — 수동 검토'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {historyDetailTab === 'FAIL' && retestCheckedIds.size > 0 && (
            <div className="px-4 pt-4 pb-6 border-t border-[#f0f0f0] flex-shrink-0 space-y-2">
              <button
                onClick={() => {
                  setRetestTsIds([...new Set(
                    verdictFails.filter(e => retestCheckedIds.has(e.id)).map(e => e.scenario),
                  )]);
                  setShowRetestNavModal(true);
                }}
                className="w-full px-3 py-2 bg-[#3615CF] text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md hover:bg-[#3615CF]/90 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                재시나리오 그룹 생성 ({retestCheckedIds.size}건)
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleDownloadCsv('selected-fail')}
                  disabled={exportBusy !== null}
                  className="px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-xs font-medium text-[#6b7280] hover:text-[#1a1a2e] hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {exportBusy?.scope === 'selected-fail' && exportBusy.action === 'csv'
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} CSV
                </button>
                <button
                  onClick={() => handleDownloadPdf('selected-fail')}
                  disabled={exportBusy !== null}
                  className="px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-xs font-medium text-[#6b7280] hover:text-[#1a1a2e] hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {exportBusy?.scope === 'selected-fail' && exportBusy.action === 'pdf'
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PDF
                </button>
              </div>
              <button
                onClick={() => handleOpenSlackShare('selected-fail')}
                disabled={exportBusy !== null}
                className="w-full px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-xs font-medium text-[#6b7280] hover:text-[#1a1a2e] hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {exportBusy?.scope === 'selected-fail' && exportBusy.action === 'slack'
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Slack 공유 ({retestCheckedIds.size}건)
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-5">
          {historyDetailTab === 'FAIL' && activeError && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-status-fail" />
                <span className="font-semibold text-[#1a1a2e]">{activeError.scenario} › {activeError.testCase}</span>
                {tcNm(activeError.scenario, activeError.testCase) && (
                  <span className="text-sm text-[#6b7280] truncate">{tcNm(activeError.scenario, activeError.testCase)}</span>
                )}
              </div>
              <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">① 결함 분류</div>
                <span className="inline-block px-3 py-1 bg-red-50 text-red-700 text-sm rounded border border-red-200 font-medium">
                  {activeError.errorCode}
                </span>
              </div>
              <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">② 현재 상태 요약</div>
                <div className="text-sm text-[#6b7280]">{activeError.summary}</div>
              </div>
              {/* ③ 실행 스텝 — pass 처럼 스텝별 진행 + 실패 지점 하이라이트 (data 변경 없이 ui_result.steps 사용) */}
              <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">③ 실행 스텝 (실패 지점)</div>
                {activeUiResult?.steps?.length ? (
                  <table className="w-full text-xs">
                    <tbody>
                      {activeUiResult.steps.map((st: any) => {
                        const isFail = st.status === 'fail';
                        const isActive = gif.active === st.step_no;
                        return (
                          <tr key={st.step_no} className={`border-t border-[#f5f5f5] ${isActive ? 'bg-[#3615CF]/10' : isFail ? 'bg-red-50' : ''}`}>
                            <td className="py-1.5 w-8 text-[#9ca3af] align-top">{st.step_no}</td>
                            <td className="py-1.5 w-24 text-[#1a1a2e] font-medium align-top">{ACTION_LABEL[st.action] ?? st.action}</td>
                            <td className="py-1.5 text-[#6b7280] align-top truncate max-w-[140px]" title={amByStep.get(st.step_no)?.value ?? ''}>
                              {amByStep.get(st.step_no)?.value ?? <span className="text-[#d1d5db]">—</span>}
                            </td>
                            <td className="py-1.5 align-top">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                st.status === 'pass' ? 'bg-status-pass/15 text-status-pass'
                                : st.status === 'fail' ? 'bg-status-fail/15 text-status-fail'
                                : 'bg-gray-100 text-[#9ca3af]'
                              }`}>{st.status ?? '실행'}{isFail ? ' ← 실패' : ''}</span>
                              {isFail && st.error ? (
                                <div className="mt-1 text-[10px] text-status-fail whitespace-pre-wrap break-all">{st.error}</div>
                              ) : null}
                            </td>
                            <td className="py-1.5 w-10 text-right align-top">
                              <button type="button" onClick={() => gif.pick(st.step_no)}
                                title="이 스텝의 캡처 보기 (자동 재생 정지)"
                                className={`p-1 rounded hover:text-[#3615CF] hover:bg-[#3615CF]/10 transition-colors ${isActive ? 'text-[#3615CF]' : 'text-[#9ca3af]'}`}>
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-sm text-[#9ca3af]">실행된 스텝 기록이 없습니다.</div>
                )}
              </div>
              <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">④ 원인 분석 및 해결 방안</div>
                <div className="space-y-2">
                  {activeError.solutions.map((sol, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded border border-[#f0f0f0]">
                      <span className="w-5 h-5 rounded-full bg-status-fail text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[#1a1a2e]">{sol.cause}</div>
                        <div className="mt-2 rounded border border-[#e5e7eb] bg-white px-3 py-2">
                          <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-1">해결 방안</div>
                          <div className="text-sm text-[#6b7280]">{sol.solution}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {historyDetailTab === 'UNVERIFIED' && (
            activeUnverified ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MinusCircle className="w-5 h-5 text-[#7c8db5]" />
                  <span className="font-semibold text-[#1a1a2e]">{activeUnverified.scenario} › {activeUnverified.testCase}</span>
                  {tcNm(activeUnverified.scenario, activeUnverified.testCase) && (
                    <span className="text-sm text-[#6b7280] truncate">{tcNm(activeUnverified.scenario, activeUnverified.testCase)}</span>
                  )}
                  <span className="px-2 py-0.5 text-xs rounded font-medium bg-[#7c8db5]/15 text-[#7c8db5]">판정 보류</span>
                </div>
                <div className="bg-white rounded-lg border border-[#7c8db5]/40 p-4">
                  <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">판정 보류 사유</div>
                  <div className="text-sm text-[#6b7280]">
                    cross-check 가 pass/fail 을 단정할 실증이 부족한 케이스입니다 — API/DB 검증축 부재,
                    입력 결손 실행, 또는 정합성 분석 실패. 아래 실행 스텝과 API 호출을 참고해 수동 판정하세요.
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                  <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">실행된 스텝</div>
                  {activeUiResult?.steps?.length ? (
                    <table className="w-full text-xs">
                      <tbody>
                        {activeUiResult.steps.map((st: any) => {
                          const isActive = gif.active === st.step_no;
                          return (
                          <tr key={st.step_no} className={`border-t border-[#f5f5f5] ${isActive ? 'bg-[#3615CF]/10' : ''}`}>
                            <td className="py-1.5 w-8 text-[#9ca3af]">{st.step_no}</td>
                            <td className="py-1.5 w-24 text-[#1a1a2e] font-medium">{st.action}</td>
                            <td className="py-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                st.status === 'pass' ? 'bg-status-pass/15 text-status-pass'
                                : st.status === 'fail' ? 'bg-status-fail/15 text-status-fail'
                                : 'bg-gray-100 text-[#9ca3af]'
                              }`}>{st.status}</span>
                            </td>
                            <td className="py-1.5 w-10 text-right">
                              <button type="button" onClick={() => gif.pick(st.step_no)}
                                title="이 스텝의 캡처 보기 (자동 재생 정지)"
                                className={`p-1 rounded hover:text-[#3615CF] hover:bg-[#3615CF]/10 transition-colors ${isActive ? 'text-[#3615CF]' : 'text-[#9ca3af]'}`}>
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-sm text-[#9ca3af]">실행된 스텝이 없습니다.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-[#9ca3af]">
                좌측에서 판정 보류 TC 를 선택하세요.
              </div>
            )
          )}
          {historyDetailTab === 'SKIP' && (
            activeSkip ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MinusCircle className="w-5 h-5 text-[#d4a017]" />
                  <span className="font-semibold text-[#1a1a2e]">{activeSkip.scenario} › {activeSkip.testCase}</span>
                  {tcNm(activeSkip.scenario, activeSkip.testCase) && (
                    <span className="text-sm text-[#6b7280] truncate">{tcNm(activeSkip.scenario, activeSkip.testCase)}</span>
                  )}
                  <span className="px-2 py-0.5 text-xs rounded font-medium bg-[#d4a017]/15 text-[#d4a017]">검증 미완</span>
                </div>
                <div className="bg-white rounded-lg border border-[#d4a017]/40 p-4">
                  <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">검증 미완 사유</div>
                  <div className="text-sm text-[#6b7280] whitespace-pre-wrap">
                    {activeUiResult?.error || '자동화 불가 step 보유 — 실행된 step 만으로는 검증이 완결되지 않아 수동 검토가 필요합니다.'}
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                  <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">실행된 스텝</div>
                  {activeUiResult?.steps?.length ? (
                    <table className="w-full text-xs">
                      <tbody>
                        {activeUiResult.steps.map((st: any) => {
                          const isActive = gif.active === st.step_no;
                          return (
                          <tr key={st.step_no} className={`border-t border-[#f5f5f5] ${isActive ? 'bg-[#3615CF]/10' : ''}`}>
                            <td className="py-1.5 w-8 text-[#9ca3af]">{st.step_no}</td>
                            <td className="py-1.5 w-24 text-[#1a1a2e] font-medium">{st.action}</td>
                            <td className="py-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                st.status === 'pass' ? 'bg-status-pass/15 text-status-pass'
                                : st.status === 'fail' ? 'bg-status-fail/15 text-status-fail'
                                : 'bg-gray-100 text-[#9ca3af]'
                              }`}>{st.status}</span>
                            </td>
                            <td className="py-1.5 w-10 text-right">
                              <button type="button" onClick={() => gif.pick(st.step_no)}
                                title="이 스텝의 캡처 보기 (자동 재생 정지)"
                                className={`p-1 rounded hover:text-[#3615CF] hover:bg-[#3615CF]/10 transition-colors ${isActive ? 'text-[#3615CF]' : 'text-[#9ca3af]'}`}>
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-sm text-[#9ca3af]">실행된 스텝이 없습니다.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-[#9ca3af]">
                좌측에서 검증 미완 TC 를 선택하세요.
              </div>
            )
          )}
          {historyDetailTab === 'PASS' && (
            activePass ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-status-pass" />
                  <span className="font-semibold text-[#1a1a2e]">{activePass.scenario} › {activePass.testCase}</span>
                  {tcNm(activePass.scenario, activePass.testCase) && (
                    <span className="text-sm text-[#6b7280] truncate">{tcNm(activePass.scenario, activePass.testCase)}</span>
                  )}
                  <span className="px-2 py-0.5 text-xs rounded font-medium bg-green-100 text-status-pass">PASS</span>
                </div>

                {/* ① 테스트 스텝 — 어떤 동작이 어떤 API 를 호출하는지 (action_mapping) */}
                <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                  <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">① 테스트 스텝 (동작 → 호출 API)</div>
                  {activeActionMapping?.steps?.length ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] text-[#9ca3af] uppercase">
                          <th className="text-left font-semibold pb-1.5 w-8">#</th>
                          <th className="text-left font-semibold pb-1.5 w-16">동작</th>
                          <th className="text-left font-semibold pb-1.5">대상</th>
                          <th className="text-left font-semibold pb-1.5">값</th>
                          <th className="text-left font-semibold pb-1.5">호출 API</th>
                          <th className="text-right font-semibold pb-1.5 w-10">캡처</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeActionMapping.steps.map(s => {
                          const isActive = gif.active === s.step_no;
                          return (
                          <tr key={s.step_no} className={`border-t border-[#f5f5f5] ${isActive ? 'bg-[#3615CF]/10' : ''}`}>
                            <td className="py-1.5 text-[#9ca3af]">{s.step_no}</td>
                            <td className="py-1.5 text-[#1a1a2e] font-medium">{ACTION_LABEL[s.action] ?? s.action}</td>
                            <td className="py-1.5 text-[#6b7280] truncate max-w-[120px]">{(s as { selector?: string | null }).selector || s.target_name || s.target_kind || '—'}</td>
                            <td className="py-1.5 text-[#6b7280] truncate max-w-[120px]">{s.value ?? '—'}</td>
                            <td className="py-1.5">
                              {s.api_endpoint
                                ? <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#3615CF]/10 text-[#3615CF]">{s.api_endpoint}</span>
                                : <span className="text-[#d1d5db]">—</span>}
                            </td>
                            <td className="py-1.5 text-right">
                              <button
                                type="button"
                                onClick={() => gif.pick(s.step_no)}
                                title="이 스텝의 캡처 보기 (자동 재생 정지)"
                                className={`p-1 rounded hover:text-[#3615CF] hover:bg-[#3615CF]/10 transition-colors ${isActive ? 'text-[#3615CF]' : 'text-[#9ca3af]'}`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-sm text-[#9ca3af]">스텝 정보가 없습니다.</div>
                  )}
                </div>

                {/* ② 실제 API 호출 (api_result) */}
                <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                  <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">② 실제 API 호출</div>
                  {activeApiResult?.calls?.length ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] text-[#9ca3af] uppercase">
                          <th className="text-left font-semibold pb-1.5 w-14">METHOD</th>
                          <th className="text-left font-semibold pb-1.5">URL</th>
                          <th className="text-left font-semibold pb-1.5 w-14">상태</th>
                          <th className="text-right font-semibold pb-1.5 w-16">지연</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeApiResult.calls.map((c, i) => {
                          const ok = (c.status_code ?? 0) >= 200 && (c.status_code ?? 0) < 400;
                          return (
                            <tr key={i} className="border-t border-[#f5f5f5]">
                              <td className="py-1.5 font-mono text-[10px] text-[#1a1a2e]">{c.method}</td>
                              <td className="py-1.5 text-[#6b7280] font-mono text-[10px] truncate max-w-[200px]">{c.url}</td>
                              <td className={`py-1.5 font-semibold ${ok ? 'text-status-pass' : 'text-status-fail'}`}>{c.status_code ?? '—'}</td>
                              <td className="py-1.5 text-right text-[#9ca3af]">{c.latency_ms != null ? `${c.latency_ms}ms` : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-sm text-[#9ca3af]">기록된 API 호출이 없습니다.</div>
                  )}
                </div>

                {/* ③ 검증 결과 요약 */}
                <div className="bg-green-50 rounded-lg border border-green-200 p-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-status-pass flex-shrink-0" />
                  <span className="text-sm font-medium text-status-pass">
                    {isApiModeTc
                      ? `API 검증 통과 · 참고 화면 ${activeActionMapping?.steps?.length ?? 0} 스텝`
                      : `${(activeUiResult?.steps?.filter(s => s.status === 'pass').length ?? 0)}/${activeUiResult?.steps?.length ?? 0} 스텝 통과`}
                    {' · '}API 오류 {activeApiResult?.error_calls ?? 0}건 → 정상
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[#9ca3af]">
                <CheckCircle className="w-8 h-8 mb-2 opacity-25" />
                <div className="text-sm">좌측에서 PASS 항목을 선택하세요</div>
              </div>
            )
          )}
        </div>

        <div className="flex-1 basis-0 bg-white border-l border-[#f0f0f0] flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-[#f0f0f0]">
            <div className="flex items-center mb-2">
              <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">
                {isApiModeTc ? '참고 화면 (검증은 API)' : 'UI 캡처'}
                {gif.active != null ? <span className="ml-1 text-[#9ca3af] normal-case">· step {gif.active}</span> : null}
              </div>
              <button
                type="button"
                onClick={() => gif.setPlaying((p) => !p)}
                title={gif.playing ? '자동 재생 정지' : '자동 재생 (스텝 캡처 GIF)'}
                className="ml-auto flex items-center gap-1 text-[10px] text-[#9ca3af] hover:text-[#3615CF] transition-colors"
              >
                {gif.playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {gif.playing ? '재생 중' : '정지됨'}
              </button>
            </div>
            <div className="w-full h-[55vh] bg-gray-100 rounded border border-[#f0f0f0] flex items-center justify-center overflow-hidden">
              {isApiModeTc && screenshotSrc ? (
                <img src={screenshotSrc} alt="참고 화면 캡처" className="w-full h-full object-contain"
                     onError={(e) => {
                       const img = e.currentTarget as HTMLImageElement;
                       img.style.display = 'none';
                       const parent = img.parentElement;
                       if (parent && !parent.querySelector('[data-shot-fallback]')) {
                         const div = document.createElement('div');
                         div.setAttribute('data-shot-fallback', '1');
                         div.className = 'text-[10px] text-[#6b7280] text-center px-3 leading-relaxed';
                         div.textContent = 'API 직접 검증 — 이 run 에는 참고 화면 캡처가 없습니다 (신규 run 부터 저장). 아래 API 검증 내역이 판정 근거입니다.';
                         parent.appendChild(div);
                       }
                     }} />
              ) : isApiModeTc ? (
                <div className="text-center text-[#6b7280] px-3">
                  <div className="text-xs font-semibold text-[#3615CF] mb-1">API 직접 검증</div>
                  <div className="text-[10px] leading-relaxed">
                    이 TC 는 브라우저 없이 API 호출로 검증됩니다. 아래 API 검증 내역을 확인하세요.
                  </div>
                </div>
              ) : screenshotSrc ? (
                <img src={screenshotSrc} alt="검증 시점 캡처" className="w-full h-full object-contain"
                     onError={(e) => {
                       // 이미지를 숨기는 대신 placeholder 문구로 교체 (빈 영역 방지)
                       const img = e.currentTarget as HTMLImageElement;
                       img.style.display = 'none';
                       const parent = img.parentElement;
                       if (parent && !parent.querySelector('[data-shot-fallback]')) {
                         const div = document.createElement('div');
                         div.setAttribute('data-shot-fallback', '1');
                         div.className = 'text-xs text-[#9ca3af] text-center px-2';
                         div.textContent = '이 step 의 스크린샷이 저장되지 않았습니다';
                         parent.appendChild(div);
                       }
                     }} />
              ) : (
                <div className="text-center text-[#9ca3af]">
                  <Eye className="w-6 h-6 mx-auto mb-1 opacity-40" />
                  <div className="text-xs">스크린샷 없음</div>
                </div>
              )}
            </div>
            {isApiModeTc && (
              <div className="mt-2 rounded border border-[#f0f0f0] bg-white p-2 space-y-1.5">
                {((activeApiResult as any)?.calls ?? []).slice(0, 2).map((c: any, i: number) => (
                  <div key={i} className="text-[10px] font-mono">
                    <span className="font-semibold text-[#3615CF]">{c.method}</span>{' '}
                    <span className="text-[#6b7280] break-all">{String(c.url ?? '').replace(/^https?:\/\/[^/]+/, '')}</span>{' '}
                    <span className={`font-bold ${Number(c.status_code) >= 400 ? 'text-status-fail' : 'text-status-pass'}`}>
                      {c.status_code}
                    </span>
                  </div>
                ))}
                {((activeApiResult as any)?.observe_results ?? []).map((o: any, i: number) => (
                  <div key={`o${i}`} className={`text-[10px] ${o.ok ? 'text-status-pass' : o.unresolved ? 'text-[#9ca3af]' : 'text-status-fail'}`}>
                    {o.ok ? '✓' : o.unresolved ? '·' : '✗'} {o.reason}
                  </div>
                ))}
                {(activeUiResult as any)?.summary && (
                  <div className="text-[10px] text-[#6b7280] break-all">{(activeUiResult as any).summary}</div>
                )}
              </div>
            )}
          </div>
          <div className="p-4 flex-1">
            <div className="text-xs font-semibold text-[#6b7280] mb-2 uppercase tracking-wide">
              {historyDetailTab === 'PASS' ? 'Runtime 로그' : 'Runtime 에러 로그'}
            </div>
            <div className="bg-[#1e1e2e] rounded p-3 overflow-x-auto">
              {historyDetailTab === 'FAIL' && activeError && liveErrorLog.split('\n').map((line, i) => (
                <div key={i} className={`font-mono text-[10px] leading-5 ${
                  i === 0 ? 'text-status-fail font-semibold' : 'text-[#9ca3af]'
                }`}>{line}</div>
              ))}
              {historyDetailTab === 'PASS' && activePass && passRuntimeLog.split('\n').map((line, i) => (
                <div key={i} className="font-mono text-[10px] leading-5 text-status-pass">{line}</div>
              ))}
              {historyDetailTab === 'PASS' && !activePass && (
                <div className="text-[10px] text-[#6b7280]">항목을 선택하면 로그가 표시됩니다</div>
              )}
              {historyDetailTab === 'SKIP' && (
                <div className="font-mono text-[10px] leading-5 text-[#d4a017] whitespace-pre-wrap">
                  {activeSkip
                    ? ((activeUiResult as any)?.error || (activeUiResult as any)?.summary
                       || '자동화 불가 step 보유 — 수동 검토가 필요합니다.')
                    : '항목을 선택하면 사유가 표시됩니다'}
                </div>
              )}
              {historyDetailTab === 'UNVERIFIED' && (
                <div className="font-mono text-[10px] leading-5 text-[#7c8db5] whitespace-pre-wrap">
                  {activeUnverified
                    ? ((activeUiResult as any)?.summary || (activeUiResult as any)?.error
                       || '판정 보류 — 검증축 부재/입력 결손/분석 실패로 pass·fail 어느 쪽도 단정할 수 없습니다.')
                    : '항목을 선택하면 사유가 표시됩니다'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 스텝별 캡처 라이트박스 — 스텝 행 우측 버튼으로 열림.
          api-mode 는 참고 화면 (navigate 시점만 실제 화면, 동작 미수행). */}
      {stepShot && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-8"
          onClick={() => closeStepShot()}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0f0f0]">
              <span className="text-sm font-semibold text-[#1a1a2e]">{stepShot.label}</span>
              <button
                type="button"
                onClick={() => closeStepShot()}
                className="text-[#9ca3af] hover:text-[#1a1a2e] text-lg leading-none px-1"
              >×</button>
            </div>
            <div className="flex-1 min-h-[200px] bg-gray-50 flex items-center justify-center overflow-auto p-3">
              <img
                src={stepShot.src}
                alt={stepShot.label}
                className="max-w-full max-h-[70vh] object-contain rounded border border-[#e5e7eb]"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.style.display = 'none';
                  const parent = img.parentElement;
                  if (parent && !parent.querySelector('[data-shot-fallback]')) {
                    const div = document.createElement('div');
                    div.setAttribute('data-shot-fallback', '1');
                    div.className = 'text-sm text-[#9ca3af] text-center px-6 leading-relaxed';
                    div.textContent = '이 스텝의 캡처가 저장되어 있지 않습니다. (구 run 이거나, api-mode 의 동작 미수행 스텝은 신규 run 부터 해당 시점 참고 화면이 저장됩니다)';
                    parent.appendChild(div);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
