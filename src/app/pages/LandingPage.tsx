import { ArrowRight, Layers, RotateCcw, BarChart2, CheckSquare } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const FEATURES = [
  {
    icon: Layers,
    title: '시나리오 자동 생성',
    desc: 'URL 또는 문서만 등록하면 AI가 테스트 시나리오를 자동으로 작성합니다.',
  },
  {
    icon: RotateCcw,
    title: '멀티 에이전트 테스트',
    desc: 'UI · API · DB를 병렬로 검증하는 에이전트가 전체 테스트를 실행합니다.',
  },
  {
    icon: BarChart2,
    title: '실시간 결과 분석',
    desc: '테스트 결과를 즉시 수집하고 원인 분석 리포트를 자동 생성합니다.',
  },
  {
    icon: CheckSquare,
    title: 'RTM 자동 추적',
    desc: '요구사항과 테스트 케이스를 자동으로 연결하고 커버리지를 시각화합니다.',
  },
];

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">

      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-10 h-[72px] border-b border-[#f0f0f0] flex-shrink-0">
        <span className="text-[18px] font-extrabold text-[#3615CF] tracking-tight">QApilot</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onGetStarted}
            className="px-4 py-2 text-sm text-[#6b7280] hover:text-[#1a1a2e] transition-colors rounded-lg hover:bg-gray-50"
          >
            로그인
          </button>
          <button
            onClick={onGetStarted}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#3615CF] text-white text-sm font-semibold rounded-lg hover:bg-[#3615CF]/90 transition-colors"
          >
            무료 시작
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center text-center px-6 pt-20 pb-16">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#EAE8F9] rounded-full text-[#3615CF] text-xs font-semibold mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3615CF]" />
            AI 기반 QA 자동화 플랫폼
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1a1a2e] leading-tight mb-5 tracking-tight max-w-2xl">
            테스트, 이제<br />
            <span className="text-[#3615CF]">AI가 대신합니다</span>
          </h1>

          {/* Sub */}
          <p className="text-base text-[#6b7280] max-w-md mb-10 leading-relaxed">
            시나리오 생성부터 실행, 결과 분석, RTM 추적까지.<br />
            QApilot 하나로 QA 전 과정을 자동화하세요.
          </p>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <button
              onClick={onGetStarted}
              className="flex items-center gap-2 px-7 py-3 bg-[#3615CF] text-white font-semibold rounded-xl text-sm shadow-lg shadow-[#3615CF]/20 hover:bg-[#3615CF]/90 hover:shadow-[#3615CF]/30 transition-all"
            >
              무료로 시작하기
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onGetStarted}
              className="px-6 py-3 border border-[#e5e7eb] text-sm text-[#374151] rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              데모 보기
            </button>
          </div>

          {/* Divider */}
          <div className="w-full max-w-3xl h-px bg-[#f0f0f0] mt-16 mb-14" />

          {/* Feature cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex flex-col items-center text-center p-5 bg-[#f9f8ff] rounded-2xl  hover:border-[#C5C0EC] hover:shadow-sm transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-[#EAE8F9] flex items-center justify-center mb-3 flex-shrink-0">
                  <Icon className="w-4.5 h-4.5 text-[#3615CF]" strokeWidth={2} />
                </div>
                <div className="text-sm font-bold text-[#1a1a2e] mb-1.5 leading-snug">{title}</div>
                <div className="text-xs text-[#9ca3af] leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <p className="text-xs text-[#c4c9d4] mt-12">
            신용카드 없이 무료로 시작 · 언제든 취소 가능
          </p>
        </div>
      </div>
    </div>
  );
}
