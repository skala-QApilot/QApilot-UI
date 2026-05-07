import React, { useEffect, useState } from 'react';

// ── 로봇 SVG (크기는 부모가 제어) ────────────────────────────────────────────
export function RobotSVG({ blinking = false, talking = false }: { blinking?: boolean; talking?: boolean }) {
  return (
    <svg viewBox="0 0 90 120" className="w-full h-full" fill="none">
      <line x1="45" y1="4" x2="45" y2="18" stroke="#f78ca0" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="45" cy="3" r="4" fill="#f78ca0">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />
      </circle>
      <rect x="14" y="18" width="62" height="48" rx="14" fill="white" stroke="#f78ca0" strokeWidth="2" />
      {/* 눈 왼쪽 */}
      <ellipse cx="32" cy="38" rx="7" ry={blinking ? 1 : 7} fill="#f78ca0" />
      <circle cx="32" cy="38" r="3" fill="white" opacity={blinking ? 0 : 1} />
      <circle cx="33.5" cy="36.5" r="1.5" fill="#1a1a2e" opacity={blinking ? 0 : 1} />
      {/* 눈 오른쪽 */}
      <ellipse cx="58" cy="38" rx="7" ry={blinking ? 1 : 7} fill="#f78ca0" />
      <circle cx="58" cy="38" r="3" fill="white" opacity={blinking ? 0 : 1} />
      <circle cx="59.5" cy="36.5" r="1.5" fill="#1a1a2e" opacity={blinking ? 0 : 1} />
      {/* 볼터치 */}
      <ellipse cx="22" cy="50" rx="6" ry="4" fill="#f78ca0" opacity="0.18" />
      <ellipse cx="68" cy="50" rx="6" ry="4" fill="#f78ca0" opacity="0.18" />
      {/* 입 */}
      {talking ? (
        <rect x="33" y="52" width="24" height="8" rx="4" fill="#f78ca0" opacity="0.7">
          <animate attributeName="height" values="8;3;8" dur="0.38s" repeatCount="indefinite" />
          <animate attributeName="y" values="52;54.5;52" dur="0.38s" repeatCount="indefinite" />
        </rect>
      ) : (
        <path d="M 32 55 Q 45 64 58 55" stroke="#f78ca0" strokeWidth="2.5" strokeLinecap="round" />
      )}
      {/* 목 */}
      <rect x="38" y="66" width="14" height="6" rx="3" fill="#f0f0f0" />
      {/* 몸통 */}
      <rect x="16" y="72" width="58" height="42" rx="12" fill="white" stroke="#f78ca0" strokeWidth="2" />
      <rect x="26" y="82" width="38" height="22" rx="6" fill="#f78ca0" opacity="0.07" stroke="#f78ca0" strokeWidth="1" strokeDasharray="3 2" />
      {/* LED */}
      <circle cx="35" cy="91" r="3.5" fill="#f78ca0" opacity="0.7">
        <animate attributeName="opacity" values="0.7;0.2;0.7" dur="0.9s" repeatCount="indefinite" />
      </circle>
      <circle cx="45" cy="91" r="3.5" fill="#9AB17A" opacity="0.7">
        <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.1s" repeatCount="indefinite" />
      </circle>
      <circle cx="55" cy="91" r="3.5" fill="#60a5fa" opacity="0.7">
        <animate attributeName="opacity" values="0.7;0.2;0.7" dur="0.7s" repeatCount="indefinite" />
      </circle>
      {/* 팔 */}
      <rect x="2" y="74" width="14" height="32" rx="7" fill="white" stroke="#f78ca0" strokeWidth="2" />
      <rect x="74" y="74" width="14" height="32" rx="7" fill="white" stroke="#f78ca0" strokeWidth="2" />
    </svg>
  );
}

// ── 말풍선 ────────────────────────────────────────────────────────────────────
export function SpeechBubble({ message, detail, size = 'md' }:
  { message: string; detail?: string; size?: 'sm' | 'md' }) {
  const isSm = size === 'sm';
  return (
    <div className="relative">
      <div className={`bg-white rounded-2xl rounded-bl-sm border-2 border-[#f78ca0]/25 shadow-lg shadow-[#f78ca0]/8 ${
        isSm ? 'px-3.5 py-2.5' : 'px-5 py-3.5'
      }`}>
        <p className={`font-semibold text-[#1a1a2e] leading-snug ${isSm ? 'text-[12px]' : 'text-sm'}`}>
          {message}
        </p>
        {detail && (
          <p className={`text-[#9ca3af] mt-1 leading-relaxed ${isSm ? 'text-[10px]' : 'text-[11px]'}`}>
            {detail}
          </p>
        )}
        <span className="inline-block w-0.5 h-3 bg-[#f78ca0] ml-0.5 align-middle animate-pulse" />
      </div>
      {/* 꼬리 */}
      <div className="absolute -bottom-2 left-5 w-4 h-4 bg-white border-r-2 border-b-2 border-[#f78ca0]/25 rotate-45" />
    </div>
  );
}

// ── 로봇 + 말풍선 통합 컴포넌트 ──────────────────────────────────────────────
interface RobotNarratorProps {
  message: string;
  detail?: string;
  talking?: boolean;
  size?: 'sm' | 'md';
}

export default function RobotNarrator({ message, detail, talking = true, size = 'md' }: RobotNarratorProps) {
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    const blink = () => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 140);
    };
    const t = setInterval(blink, 3000 + Math.random() * 1500);
    return () => clearInterval(t);
  }, []);

  const robotSize = size === 'sm' ? 'w-14 h-[74px]' : 'w-20 h-[106px]';

  return (
    <div className="flex items-end gap-3">
      <div className="flex-shrink-0 mb-1">
        <SpeechBubble message={message} detail={detail} size={size} />
      </div>
      <div className={`flex-shrink-0 ${robotSize}`}>
        <RobotSVG blinking={blinking} talking={talking} />
      </div>
    </div>
  );
}
