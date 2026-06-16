import type { UiResult, ApiResult } from '../../api/artifacts';
import type { Defect } from '../../api/defects';

/** action → 한국어 라벨 (봇 문장·근거용). */
const ACTION_KO: Record<string, string> = {
  navigate: '페이지 이동', fill: '입력', click: '클릭', dblclick: '더블클릭',
  check: '체크', uncheck: '체크 해제', select: '선택', press: '키 입력',
  hover: '호버', upload: '업로드',
  assert: '검증', assert_visible: '요소 표시 확인', assert_hidden: '요소 숨김 확인',
  assert_text: '텍스트 확인', assert_value: '값 확인', assert_count: '개수 확인',
  assert_url: 'URL 확인', wait_for_response: '응답 대기',
  wait_for_load_state: '로딩 대기', wait_for_url: 'URL 대기', reload: '새로고침',
};
const ko = (a: string) => ACTION_KO[a] ?? a;
/** action(영문) → 한국어 라벨. 결과 패널·스텝 테이블에서 공용. */
export const koAction = ko;

export interface VerdictSummary {
  headline: string;       // 봇 한 줄 요약 ("…했기에 pass입니다")
  detail?: string;        // 보조 (해결 가이드 등)
  evidence: string[];     // 근거 — 실행 스텝 + API 응답
}

/**
 * cross_check/root_cause/실행 스텝/API 응답을 봇 말투 요약으로 가공한다.
 * 실시간 LLM 호출 없이 기존 데이터만 템플릿 변환 (사용자 요청 "후자").
 */
export function buildVerdictSummary(args: {
  pass: boolean;
  ui: UiResult | null;
  api: ApiResult | null;
  defect: Defect | null;
}): VerdictSummary {
  const { pass, ui, api, defect } = args;
  const steps = ui?.steps ?? [];
  const acted = steps.filter(s =>
    ['navigate', 'fill', 'click', 'dblclick', 'check', 'select', 'press', 'upload'].includes(s.action));
  const assertStep = [...steps].reverse().find(s => s.action.startsWith('assert'));
  const apiWrites = (api?.calls ?? []).filter(c => /\/api\//.test(c.url) && c.method !== 'GET');
  const lastApi = apiWrites[apiWrites.length - 1] ?? null;
  const apiOk = lastApi != null && (lastApi.status_code ?? 0) >= 200 && (lastApi.status_code ?? 0) < 400;

  // 근거 bullet — 실행 스텝 + 핵심 API 호출
  const evidence: string[] = steps.map(s => {
    const head = `${s.step_no}. ${ko(s.action)} — ${s.status ?? '-'}`;
    return s.status === 'fail' && s.error ? `${head} (${s.error.split('\n')[0]})` : head;
  });
  if (lastApi) {
    const path = lastApi.url.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '');
    evidence.push(`API ${lastApi.method} ${path} → ${lastApi.status_code ?? '-'}`);
  }

  if (pass) {
    const actionsKo = [...new Set(acted.map(s => ko(s.action)))].join('·');
    const parts: string[] = [];
    if (actionsKo) parts.push(`${actionsKo}을(를) 수행`);
    if (assertStep) parts.push('기대 요소를 확인');
    if (apiOk) parts.push(`API 정상 응답(${lastApi!.status_code})`);
    const did = parts.length ? parts.join('하고 ') : '검증 단계를 통과';
    return { headline: `${did}했기에 pass입니다.`, evidence };
  }

  // FAIL — 우선순위: root_cause(AI 분석) > 실패 스텝 > API 에러
  if (defect?.root_cause_top1) {
    return {
      headline: `${defect.root_cause_top1.split('\n')[0]} — 그래서 아직 fail입니다.`,
      detail: defect.solution_guide ?? undefined,
      evidence,
    };
  }
  const failStep = steps.find(s => s.status === 'fail');
  if (failStep) {
    const err = failStep.error?.split('\n')[0] ?? '검증 실패';
    return {
      headline: `${failStep.step_no}번 "${ko(failStep.action)}" 단계에서 ${err} 로 멈춰 아직 fail입니다.`,
      evidence,
    };
  }
  if (lastApi && !apiOk) {
    return { headline: `API가 ${lastApi.status_code} 응답을 반환해 아직 fail입니다.`, evidence };
  }
  return { headline: '검증 기준을 충족하지 못해 아직 fail입니다.', evidence };
}
