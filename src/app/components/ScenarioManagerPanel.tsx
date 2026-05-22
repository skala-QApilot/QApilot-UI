import { ChevronRight, Send } from 'lucide-react';

interface ScenarioManagerPanelProps {
  aiPanelOpen: boolean;
  setAiPanelOpen: (open: boolean) => void;
  aiMessages: Array<{ role: 'user' | 'assistant'; text: string }>;
  aiInput: string;
  setAiInput: (input: string) => void;
  aiContextPrefill: string;
  sendAiMessage: (text: string) => void;
}

export function ScenarioManagerPanel({
  aiPanelOpen,
  setAiPanelOpen,
  aiMessages,
  aiInput,
  setAiInput,
  aiContextPrefill,
  sendAiMessage,
}: ScenarioManagerPanelProps) {
  if (!aiPanelOpen) {
    return (
      <button
        onClick={() => setAiPanelOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 w-10 h-32 bg-[#3615CF] text-white rounded-l-lg shadow-lg flex items-center justify-center z-40 hover:w-12 transition-all"
        style={{ writingMode: 'vertical-rl' }}
      >
        <span className="text-sm font-semibold">시나리오 관리봇</span>
      </button>
    );
  }

  return (
    <div className="w-80 h-full bg-white border-l border-[#f0f0f0] flex flex-col shadow-lg flex-shrink-0">
      <div className="p-4 flex justify-between items-center bg-[#EAE8F9]">
        <div className="font-semibold text-[#1a1a2e]">시나리오 관리봇</div>
        <button onClick={() => setAiPanelOpen(false)} className="p-1 hover:bg-white/50 rounded">
          <ChevronRight className="w-5 h-5 text-[#6b7280]" />
        </button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {aiMessages.map((msg, idx) => (
          <div key={idx}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-[#EAE8F9] text-[#3615CF]'
                  : 'bg-gray-100 text-[#1a1a2e]'
              }`}>{msg.text}</div>
            </div>
            {msg.role === 'assistant' && idx > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {['시나리오에 추가', '기존 시나리오 수정 반영', '다시 생성'].map(label => (
                  <button key={label} className="px-2 py-1 text-xs bg-white border border-[#f0f0f0] rounded hover:bg-gray-50">
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-[#f0f0f0] bg-gray-50">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {['시나리오 생성', '엣지 케이스 추가', 'TC 세분화', '시나리오에 반영'].map(chip => (
            <button key={chip} onClick={() => sendAiMessage(chip)}
              className="px-2.5 py-1 text-xs bg-white border border-[#f0f0f0] rounded-full hover:bg-gray-50 transition-colors">
              {chip}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text" value={aiInput} onChange={e => setAiInput(e.target.value)}
            placeholder="예) 사용자가 이메일로 로그인하는 시나리오를 만들어줘"
            className="flex-1 p-2 border border-[#f0f0f0] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#3615CF]/20"
            onKeyDown={e => { if (e.key === 'Enter' && aiInput.trim()) sendAiMessage(aiInput); }}
          />
          <button onClick={() => { if (aiInput.trim()) sendAiMessage(aiInput); }}
            className="p-2 bg-[#3615CF] text-white rounded hover:shadow-md transition-shadow">
            <Send className="w-4 h-4" />
          </button>
        </div>
        {aiContextPrefill && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            컨텍스트: {aiContextPrefill}
          </div>
        )}
      </div>
    </div>
  );
}
