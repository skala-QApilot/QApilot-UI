import { useState, useRef } from 'react';

export function useChatbotState() {
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    { role: 'assistant', text: '테스트할 기능을 자연어로 설명해 주세요. 시나리오와 테스트 케이스를 자동으로 생성/수정해 드립니다.' },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiContextPrefill, setAiContextPrefill] = useState('');

  const chatbarClosedRef = useRef(false);
  const [chatbarActive, setChatbarActive] = useState(false);
  const [chatPanelExpanded, setChatPanelExpanded] = useState(false);
  const [chatHistoryPanelOpen, setChatHistoryPanelOpen] = useState(false);
  const [quickChipsOpen, setQuickChipsOpen] = useState(false);
  const [chatContextTag, setChatContextTag] = useState<string | null>(null);
  const [inlineDiffId, setInlineDiffId] = useState<string | null>(null);
  const [highlightedBotRow, setHighlightedBotRow] = useState<string | null>(null);

  return {
    aiPanelOpen, setAiPanelOpen,
    aiMessages, setAiMessages,
    aiInput, setAiInput,
    aiContextPrefill, setAiContextPrefill,
    chatbarClosedRef,
    chatbarActive, setChatbarActive,
    chatPanelExpanded, setChatPanelExpanded,
    chatHistoryPanelOpen, setChatHistoryPanelOpen,
    quickChipsOpen, setQuickChipsOpen,
    chatContextTag, setChatContextTag,
    inlineDiffId, setInlineDiffId,
    highlightedBotRow, setHighlightedBotRow,
  };
}
