import { MutableRefObject } from 'react';
import { ChevronDown, History, Plus, Send, X } from 'lucide-react';

interface ScenarioChatbarProps {
  chatbarClosedRef: MutableRefObject<boolean>;
  chatbarActive: boolean;
  setChatbarActive: (active: boolean) => void;
  chatPanelExpanded: boolean;
  setChatPanelExpanded: (expanded: boolean) => void;
  chatHistoryPanelOpen: boolean;
  setChatHistoryPanelOpen: (open: boolean) => void;
  quickChipsOpen: boolean;
  setQuickChipsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  chatContextTag: string | null;
  setChatContextTag: (tag: string | null) => void;
  aiMessages: Array<{ role: 'user' | 'assistant'; text: string }>;
  aiInput: string;
  setAiInput: (input: string) => void;
  setInlineDiffId: (id: string | null) => void;
  setHighlightedBotRow: (id: string | null) => void;
  sendAiMessage: (text: string) => void;
}

export function ScenarioChatbar({
  chatbarClosedRef,
  chatbarActive,
  setChatbarActive,
  chatPanelExpanded,
  setChatPanelExpanded,
  chatHistoryPanelOpen,
  setChatHistoryPanelOpen,
  quickChipsOpen,
  setQuickChipsOpen,
  chatContextTag,
  setChatContextTag,
  aiMessages,
  aiInput,
  setAiInput,
  setInlineDiffId,
  setHighlightedBotRow,
  sendAiMessage,
}: ScenarioChatbarProps) {
  return (
    <>
      {/* Hover-trigger zone at the bottom of the content area */}
      <div
        className="fixed bottom-0 z-30 pointer-events-auto"
        style={{ left: '3.5rem', right: 0, height: '4.5rem' }}
        onMouseEnter={() => { if (!chatbarClosedRef.current) setChatbarActive(true); }}
      />

      {/* Color-blur backdrop */}
      <div
        className="fixed bottom-0 z-30 pointer-events-none transition-opacity duration-300"
        style={{
          left: '3.5rem', right: 0, height: '5rem',
          opacity: chatbarActive ? 1 : 0,
          background: 'linear-gradient(to top, rgba(249,250,251,0.88) 0%, rgba(249,250,251,0.46) 42%, rgba(249,250,251,0.14) 72%, rgba(249,250,251,0) 100%)',
          backdropFilter: chatbarActive ? 'blur(6px)' : 'none',
          WebkitBackdropFilter: chatbarActive ? 'blur(6px)' : 'none',
          maskImage: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.78) 45%, rgba(0,0,0,0.24) 78%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.78) 45%, rgba(0,0,0,0.24) 78%, transparent 100%)',
        }}
      />

      {/* Chat history panel */}
      {chatbarActive && chatHistoryPanelOpen && (
        <div
          className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-[#f0f0f0] overflow-hidden flex flex-col"
          style={{ bottom: '5.2rem', left: 'calc(3.5rem + 4.5rem)', width: '280px', maxHeight: '300px' }}
        >
          <div className="px-4 py-3 border-b border-[#f0f0f0] flex items-center justify-between flex-shrink-0">
            <span className="text-sm font-semibold text-[#1a1a2e]">대화 히스토리</span>
            <button onClick={() => setChatHistoryPanelOpen(false)} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-3.5 h-3.5 text-[#9ca3af]" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {[
              { date: '2026-04-27 10:23', summary: 'TS2 TC1 수정 — 검색 자동완성 조건 추가' },
              { date: '2026-04-26 16:42', summary: 'TS1 TC2 엣지 케이스 추가' },
              { date: '2026-04-25 09:15', summary: 'TS3 전체 시나리오 재생성 요청' },
            ].map((h, i) => (
              <button key={i}
                onClick={() => { setChatHistoryPanelOpen(false); setChatPanelExpanded(true); }}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-[#f0f0f0] transition-colors">
                <div className="text-xs font-medium text-[#1a1a2e] mb-0.5 truncate">{h.summary}</div>
                <div className="text-[10px] text-[#9ca3af]">{h.date}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat conversation panel */}
      {chatbarActive && chatPanelExpanded && (
        <div
          className="fixed z-50 flex justify-center"
          style={{ bottom: '5.2rem', left: '3.5rem', right: 0 }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-[#f0f0f0] overflow-hidden flex flex-col w-full"
            style={{
              maxWidth: '672px',
              maxHeight: '300px',
              animation: 'slideUpFade 0.22s ease-out',
              marginLeft: '4.5rem',
              marginRight: '2.5rem',
            }}
          >
            <style>{`@keyframes slideUpFade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            <div className="px-4 py-3 border-b border-[#f0f0f0] flex items-center justify-between flex-shrink-0 bg-[#EAE8F9]/40">
              <span className="text-sm font-semibold text-[#1a1a2e]">시나리오 관리봇</span>
              <button onClick={() => setChatPanelExpanded(false)} className="p-1 hover:bg-gray-100 rounded">
                <ChevronDown className="w-4 h-4 text-[#9ca3af]" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {aiMessages.map((msg, idx) => (
                <div key={idx}>
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#EAE8F9] text-[#3615CF]'
                        : 'bg-gray-100 text-[#1a1a2e]'
                    }`}>{msg.text}</div>
                  </div>
                  {msg.role === 'assistant' && idx > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {['시나리오에 추가', '기존 시나리오 수정 반영', '다시 생성'].map(label => (
                        <button key={label}
                          onClick={() => {
                            setInlineDiffId('TS1_TC2');
                            setHighlightedBotRow('tc-TS1_TC2');
                            setTimeout(() => setHighlightedBotRow(null), 2000);
                          }}
                          className="px-2.5 py-1 text-xs bg-white border border-[#f0f0f0] rounded-full hover:bg-gray-50 hover:border-[#3615CF]/30 transition-colors">
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chatbar pill */}
      <div
        className="fixed z-50 flex justify-center transition-all duration-300"
        style={{
          left: '3.5rem', right: 0, bottom: '1rem',
          opacity: chatbarActive ? 1 : 0,
          transform: chatbarActive ? 'translateY(0)' : 'translateY(1rem)',
          pointerEvents: chatbarActive ? 'auto' : 'none',
        }}
      >
        <div className="flex items-center gap-2 w-full max-w-2xl px-4">

          {/* Quick chips toggle */}
          <div className="relative flex-shrink-0">
            {chatbarActive && quickChipsOpen && (
              <div className="absolute z-50 flex flex-col gap-1.5 right-full bottom-0 mr-3">
                {['엣지 케이스 추가', 'TC 세분화', '시나리오 생성', '오류 분석'].map(chip => (
                  <button key={chip}
                    onClick={() => { setAiInput(chip); setQuickChipsOpen(false); setChatPanelExpanded(true); }}
                    className="w-max min-w-[132px] px-4 py-2.5 bg-white rounded-full shadow-lg border border-[#f0f0f0] text-[13px] font-semibold text-[#1a1a2e] whitespace-nowrap hover:shadow-xl hover:border-[#3615CF]/30 text-left transition-all">
                    {chip}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => { setQuickChipsOpen((p: boolean) => !p); setChatHistoryPanelOpen(false); }}
              className={`w-10 h-10 rounded-full shadow-lg border flex items-center justify-center transition-all hover:shadow-xl ${
                quickChipsOpen
                  ? 'bg-[#3615CF] text-white border-transparent'
                  : 'bg-white border-[#f0f0f0] text-[#6b7280] hover:border-[#3615CF]/30'
              }`}>
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Pill bar */}
          <div className="flex-1 flex items-center bg-white rounded-full shadow-xl border border-[#f0f0f0] px-4 py-2.5 gap-3 hover:shadow-2xl transition-shadow">

            {/* History toggle */}
            <button
              onClick={() => { setChatHistoryPanelOpen((p: boolean) => !p); setQuickChipsOpen(false); }}
              className={`flex-shrink-0 transition-colors p-0.5 rounded-full ${chatHistoryPanelOpen ? 'text-[#3615CF]' : 'text-[#9ca3af] hover:text-[#6b7280]'}`}
              title="대화 히스토리">
              <History className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-[#f0f0f0] flex-shrink-0" />

            {/* Context tag */}
            {chatContextTag && (
              <div className="flex items-center gap-1 px-2.5 py-0.5 bg-[#EAE8F9] text-[#3615CF] rounded-full text-xs flex-shrink-0 max-w-[200px] border border-[#3615CF]/20">
                <span className="truncate font-medium">{chatContextTag}</span>
                <button onClick={() => setChatContextTag(null)} className="flex-shrink-0 ml-0.5 opacity-60 hover:opacity-100">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Text input */}
            <input
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onFocus={() => { setChatPanelExpanded(true); setChatHistoryPanelOpen(false); }}
              placeholder={chatContextTag ? '수정 내용을 입력하세요...' : 'TC/TV에 대해 질문하거나 수정 요청하기...'}
              className="flex-1 bg-transparent focus:outline-none text-sm placeholder-[#c4c9d4] min-w-0"
              onKeyDown={e => {
                if (e.key === 'Enter' && aiInput.trim()) {
                  sendAiMessage(aiInput);
                  setChatPanelExpanded(true);
                  if (chatContextTag?.includes('TC2')) {
                    setTimeout(() => {
                      setInlineDiffId('TS1_TC2');
                      setHighlightedBotRow('tc-TS1_TC2');
                      setTimeout(() => setHighlightedBotRow(null), 2000);
                    }, 700);
                  }
                }
              }}
            />

            {/* Send button */}
            <button
              onClick={() => { if (aiInput.trim()) { sendAiMessage(aiInput); setChatPanelExpanded(true); } }}
              className={`p-1.5 rounded-full flex-shrink-0 transition-all ${
                aiInput.trim()
                  ? 'bg-[#3615CF] text-white shadow-sm hover:shadow-md'
                  : 'bg-gray-100 text-[#c4c9d4]'
              }`}>
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Close chatbar */}
          <button
            onClick={() => {
              chatbarClosedRef.current = true;
              setChatbarActive(false);
              setChatPanelExpanded(false);
              setQuickChipsOpen(false);
              setChatHistoryPanelOpen(false);
              setChatContextTag(null);
              setTimeout(() => { chatbarClosedRef.current = false; }, 700);
            }}
            className="w-9 h-9 rounded-full bg-white shadow-md border border-[#f0f0f0] flex items-center justify-center flex-shrink-0 text-[#9ca3af] hover:text-[#6b7280] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
