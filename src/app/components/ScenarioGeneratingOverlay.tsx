import React, { useEffect, useState } from 'react';

// ── 단계 정의 ─────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 'fr001', message: 'PRD/정책 문서를 읽는 중...', detail: 'RAG 기반 도메인 지식을 프롬프트에 주입하고 있어요', duration: 2200 },
  { id: 'fr000', message: '코드베이스를 스캔하는 중...', detail: 'AST 파싱 후 종속성 그래프를 구성하고 있어요', duration: 2000 },
  { id: 'fr003', message: '자연어 요구사항을 해석하는 중...', detail: 'FR 문서에서 시나리오 시드를 추출하고 있어요', duration: 2400 },
  { id: 'fr002', message: '시나리오를 생성하는 중...', detail: 'TC · TV · 테스트 데이터를 작성하고 있어요', duration: 2600 },
  { id: 'fr004', message: '실행 시퀀스로 변환하는 중...', detail: '구조화 데이터를 Step 시퀀스로 매핑하고 있어요', duration: 1800 },
  { id: 'fr005', message: 'Playwright 코드를 작성하는 중...', detail: 'UI 액션 × API 엔드포인트를 매핑하고 있어요', duration: 2200 },
  { id: 'done',  message: '시나리오 생성이 완료됐어요!', detail: '총 4개 시나리오, 12개 TC가 생성되었습니다', duration: 1200 },
];

// ── 로봇 SVG ──────────────────────────────────────────────────────────────────
function RobotCharacter({ blinking, talking }: { blinking: boolean; talking: boolean }) {
  return (
    <svg viewBox="0 0 90 120" className="w-full h-full" fill="none">
      {/* 안테나 */}
      <line x1="45" y1="4" x2="45" y2="18" stroke="#f78ca0" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="45" cy="3" r="4" fill="#f78ca0">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />
      </circle>
      {/* 머리 */}
      <rect x="14" y="18" width="62" height="48" rx="14" fill="white" stroke="#f78ca0" strokeWidth="2" />
      {/* 눈 왼쪽 */}
      <ellipse cx="32" cy="38" rx="7" ry={blinking ? 1 : 7} fill="#f78ca0">
        <animate attributeName="ry" values={blinking ? '7;1;7' : '7'} dur="0.15s" begin="0s" />
      </ellipse>
      <circle cx="32" cy="38" r="3" fill="white" opacity={blinking ? 0 : 1} />
      <circle cx="33.5" cy="36.5" r="1.5" fill="#1a1a2e" opacity={blinking ? 0 : 1} />
      {/* 눈 오른쪽 */}
      <ellipse cx="58" cy="38" rx="7" ry={blinking ? 1 : 7} fill="#f78ca0">
        <animate attributeName="ry" values={blinking ? '7;1;7' : '7'} dur="0.15s" begin="0s" />
      </ellipse>
      <circle cx="58" cy="38" r="3" fill="white" opacity={blinking ? 0 : 1} />
      <circle cx="59.5" cy="36.5" r="1.5" fill="#1a1a2e" opacity={blinking ? 0 : 1} />
      {/* 입 */}
      {talking ? (
        <rect x="33" y="52" width="24" height="8" rx="4" fill="#f78ca0" opacity="0.7">
          <animate attributeName="height" values="8;4;8" dur="0.4s" repeatCount="indefinite" />
          <animate attributeName="y" values="52;54;52" dur="0.4s" repeatCount="indefinite" />
        </rect>
      ) : (
        <path d="M 32 55 Q 45 64 58 55" stroke="#f78ca0" strokeWidth="2.5" strokeLinecap="round" />
      )}
      {/* 볼터치 */}
      <ellipse cx="22" cy="50" rx="6" ry="4" fill="#f78ca0" opacity="0.18" />
      <ellipse cx="68" cy="50" rx="6" ry="4" fill="#f78ca0" opacity="0.18" />
      {/* 목 */}
      <rect x="38" y="66" width="14" height="6" rx="3" fill="#f0f0f0" />
      {/* 몸통 */}
      <rect x="16" y="72" width="58" height="42" rx="12" fill="white" stroke="#f78ca0" strokeWidth="2" />
      {/* 가슴 패널 */}
      <rect x="26" y="82" width="38" height="22" rx="6" fill="#f78ca0" opacity="0.08" stroke="#f78ca0" strokeWidth="1" strokeDasharray="3 2" />
      {/* 패널 LED */}
      <circle cx="35" cy="91" r="3.5" fill="#f78ca0" opacity="0.7">
        <animate attributeName="opacity" values="0.7;0.2;0.7" dur="0.9s" repeatCount="indefinite" />
      </circle>
      <circle cx="45" cy="91" r="3.5" fill="#9AB17A" opacity="0.7">
        <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.1s" repeatCount="indefinite" />
      </circle>
      <circle cx="55" cy="91" r="3.5" fill="#60a5fa" opacity="0.7">
        <animate attributeName="opacity" values="0.7;0.2;0.7" dur="0.7s" repeatCount="indefinite" />
      </circle>
      {/* 팔 왼쪽 */}
      <rect x="2" y="74" width="14" height="32" rx="7" fill="white" stroke="#f78ca0" strokeWidth="2" />
      {/* 팔 오른쪽 */}
      <rect x="74" y="74" width="14" height="32" rx="7" fill="white" stroke="#f78ca0" strokeWidth="2" />
    </svg>
  );
}

// ── 말풍선 ────────────────────────────────────────────────────────────────────
function SpeechBubble({ message, detail }: { message: string; detail: string }) {
  return (
    <div className="relative">
      <div className="bg-white rounded-2xl rounded-bl-sm border-2 border-[#f78ca0]/30 px-5 py-3.5 shadow-xl shadow-[#f78ca0]/10 max-w-xs">
        <p className="text-sm font-semibold text-[#1a1a2e] leading-snug">{message}</p>
        <p className="text-[11px] text-[#9ca3af] mt-1 leading-relaxed">{detail}</p>
        {/* 입력 커서 */}
        <span className="inline-block w-0.5 h-3.5 bg-[#f78ca0] ml-0.5 align-middle animate-pulse" />
      </div>
      {/* 말풍선 꼬리 */}
      <div className="absolute -bottom-2 left-6 w-4 h-4 bg-white border-r-2 border-b-2 border-[#f78ca0]/30 rotate-45" />
    </div>
  );
}

// ── 아키텍처 노드 ─────────────────────────────────────────────────────────────
function ArchNode({
  id, title, sub, active, done, isTool = false,
}: {
  id: string; title: string; sub: string; active: boolean; done: boolean; isTool?: boolean;
}) {
  return (
    <div className={`relative transition-all duration-500 rounded-xl border-2 px-3 py-2.5 ${
      isTool ? 'bg-white/80' : 'bg-white'
    } ${
      active
        ? 'border-[#f78ca0] shadow-lg shadow-[#f78ca0]/30 scale-105'
        : done
          ? 'border-[#9AB17A]/60 shadow-sm'
          : 'border-white/60 shadow-sm opacity-60'
    }`}>
      {/* 활성 glow ring */}
      {active && (
        <span className="absolute -inset-1 rounded-xl border-2 border-[#f78ca0]/30 animate-ping" />
      )}
      {/* 완료 체크 */}
      {done && !active && (
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#9AB17A] rounded-full flex items-center justify-center shadow">
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      {/* 실행 중 스피너 */}
      {active && (
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#f78ca0] rounded-full flex items-center justify-center shadow animate-spin">
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 2v3M6 7v3M2 6h3M7 6h3" strokeLinecap="round" />
          </svg>
        </span>
      )}
      <div className={`text-[10px] font-bold leading-tight mb-0.5 ${active ? 'text-[#f78ca0]' : done ? 'text-[#9AB17A]' : 'text-[#6b7280]'}`}>
        {title.split('·')[0].trim()}
        <span className="text-[#1a1a2e] ml-1">{title.split('·').slice(1).join('·').trim()}</span>
      </div>
      <div className="text-[9px] text-[#9ca3af] leading-tight">{sub}</div>
    </div>
  );
}

// ── SVG 화살표 ────────────────────────────────────────────────────────────────
function Arrow({ from, to, color = '#f78ca0', dashed = false, animated = false }:
  { from: [number, number]; to: [number, number]; color?: string; dashed?: boolean; animated?: boolean }) {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len, uy = dy / len;
  const tipX = to[0] - ux * 6, tipY = to[1] - uy * 6;
  const perpX = -uy * 4, perpY = ux * 4;

  return (
    <g>
      <line x1={from[0]} y1={from[1]} x2={tipX} y2={tipY}
        stroke={color} strokeWidth={animated ? 2.5 : 1.5}
        strokeDasharray={dashed ? '5 4' : undefined}
        opacity={animated ? 1 : 0.5}>
        {animated && (
          <animate attributeName="stroke-dashoffset" values="20;0" dur="0.6s" repeatCount="indefinite" />
        )}
        {animated && <animate attributeName="stroke-dasharray" values="5 4" dur="0.6s" />}
      </line>
      <polygon
        points={`${to[0]},${to[1]} ${tipX + perpX},${tipY + perpY} ${tipX - perpX},${tipY - perpY}`}
        fill={color} opacity={animated ? 1 : 0.4} />
    </g>
  );
}

// ── 메인 오버레이 ─────────────────────────────────────────────────────────────
interface Props { onComplete?: () => void; }

export default function ScenarioGeneratingOverlay({ onComplete }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [blinking, setBlinking] = useState(false);

  // 단계 진행
  useEffect(() => {
    if (stepIdx >= STEPS.length) return;
    const t = setTimeout(() => setStepIdx(s => s + 1), STEPS[stepIdx].duration);
    return () => clearTimeout(t);
  }, [stepIdx]);

  // 완료 처리
  useEffect(() => {
    if (stepIdx === STEPS.length) {
      const t = setTimeout(() => onComplete?.(), 900);
      return () => clearTimeout(t);
    }
  }, [stepIdx, onComplete]);

  // 눈 깜빡임
  useEffect(() => {
    const blink = () => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 150);
    };
    const t = setInterval(blink, 3200 + Math.random() * 1500);
    return () => clearInterval(t);
  }, []);

  const current = STEPS[Math.min(stepIdx, STEPS.length - 1)];
  const activeId = current.id;
  const doneIds = new Set(STEPS.slice(0, stepIdx).map(s => s.id));
  const progress = Math.round((stepIdx / (STEPS.length - 1)) * 100);
  const isDone = stepIdx >= STEPS.length;

  const isActive = (id: string) => activeId === id && !isDone;
  const isDoneNode = (id: string) => doneIds.has(id);

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-none overflow-hidden">

      {/* ── 아키텍처 컨테이너 ── */}
      <div className="relative w-full max-w-3xl mx-auto px-6">
        {/* layer1 배경 */}
        <div className="relative rounded-3xl bg-[#e8f0e0]/70 border border-[#c8ddb8] p-6 pt-8 pb-5 shadow-xl">
          <span className="absolute top-3.5 left-5 text-[11px] font-bold text-[#5a7a40]">
            layer1.  컨텍스트 및 시나리오 준비
          </span>

          {/* 메인 에이전트 행 */}
          <div className="relative grid grid-cols-4 gap-4 mb-4">
            <ArchNode id="fr003" title="FR-003 · 자연어 요구사항 해석 Agent" sub="시나리오 × 테스트 데이터 생성"
              active={isActive('fr003')} done={isDoneNode('fr003')} />
            <ArchNode id="fr002" title="FR-002 · 시나리오 생성 Agent" sub="시나리오 × 테스트 데이터 생성"
              active={isActive('fr002')} done={isDoneNode('fr002')} />
            <ArchNode id="fr004" title="FR-004 · 시나리오-액션 매핑 Agent" sub="구조화 데이터 → Step 시퀀스로 변환"
              active={isActive('fr004')} done={isDoneNode('fr004')} />
            <ArchNode id="fr005" title="FR-005 · Playwright 코드 Agent" sub="UI 액션 × API 매핑으로 코드 작성"
              active={isActive('fr005')} done={isDoneNode('fr005')} />
          </div>

          {/* 서브 툴 행 (FR-000, FR-001 under FR-002) */}
          <div className="grid grid-cols-4 gap-4">
            <div className="col-start-2 flex flex-col gap-2">
              <ArchNode id="fr000" title="FR-000 · 코드베이스 스캔 Tool" sub="AST/IR 파싱 → 종속성 그래프"
                active={isActive('fr000')} done={isDoneNode('fr000')} isTool />
              <ArchNode id="fr001" title="FR-001 · 도메인 지식 Tool" sub="PRD/정책 RAG → Prompt 주입"
                active={isActive('fr001')} done={isDoneNode('fr001')} isTool />
            </div>
            <div className="col-start-4 col-end-5 flex items-start pt-1">
              <div className={`w-full rounded-lg border px-3 py-2 transition-all ${
                isDoneNode('fr005') ? 'border-[#9AB17A]/60 bg-white/70' : 'border-white/50 bg-white/40 opacity-50'
              }`}>
                <div className="text-[9px] font-semibold text-[#6b7280]">Trace ID 전파</div>
                <div className="text-[9px] text-[#9ca3af]">(FR-015)</div>
              </div>
            </div>
          </div>

          {/* SVG 연결 화살표 */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
            {/* FR-003 → FR-002 */}
            <Arrow from={[182, 48]} to={[266, 48]}
              color="#f78ca0" animated={isActive('fr003') || isActive('fr002')} />
            {/* FR-002 → FR-004 */}
            <Arrow from={[432, 48]} to={[516, 48]}
              color="#f78ca0" animated={isActive('fr002') || isActive('fr004')} />
            {/* FR-004 → FR-005 */}
            <Arrow from={[682, 48]} to={[766, 48]}
              color="#f87171" animated={isActive('fr004') || isActive('fr005')} />
            {/* FR-000 → FR-002 (up) */}
            <Arrow from={[349, 152]} to={[349, 72]}
              color="#9AB17A" animated={isActive('fr000')} dashed />
            {/* FR-001 → FR-002 (up) */}
            <Arrow from={[349, 212]} to={[349, 72]}
              color="#f9a84d" animated={isActive('fr001')} dashed />
          </svg>
        </div>

        {/* ── 외부 진입 트리거 선 (layer 위) ── */}
        <div className="flex justify-around px-16 mb-0">
          {['시나리오 관리봇', 'GitHub 훅', 'PRD 업데이트'].map((trigger, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] text-[#9ca3af] font-medium">{trigger}</span>
              <div className="w-px h-5 bg-[#f78ca0]/40" />
            </div>
          ))}
        </div>
      </div>

      {/* ── 로봇 + 말풍선 ── */}
      <div className="flex items-end gap-4 mt-6">
        {/* 말풍선 */}
        <div className="mb-3 transition-all duration-500">
          <SpeechBubble message={current.message} detail={current.detail} />
        </div>
        {/* 로봇 */}
        <div className={`w-20 h-[106px] transition-all duration-300 ${isDone ? 'scale-110' : ''}`}>
          <RobotCharacter blinking={blinking} talking={!isDone && stepIdx > 0} />
        </div>
      </div>

      {/* ── 진행 바 ── */}
      <div className="mt-5 w-full max-w-lg px-6">
        <div className="flex justify-between text-[10px] text-[#9ca3af] mb-1.5">
          <span className="font-medium text-[#6b7280]">{isDone ? '완료' : `${stepIdx} / ${STEPS.length - 1} 단계`}</span>
          <span>{isDone ? '100' : progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#f0f0f0] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] transition-all duration-700"
            style={{ width: `${isDone ? 100 : progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
