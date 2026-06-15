import { useEffect, useState } from 'react';
import { Send, X, Loader2, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import type { ServiceMember } from '../../api/members';
import { ApiError } from '../../api/client';
import { sendSlackNotification, type SlackNotifyResult } from '../../api/slack';
import { csvBlobFromRows, pdfBlobFromRows, type SlackShareContext } from '../pages/TestResultPage';

interface SlackSendModalProps {
  open: boolean;
  context: SlackShareContext | null;
  serviceUuid: string | null;
  runId: string | null;
  onClose: () => void;
}

type ShareFormat = 'csv' | 'pdf';

/** 서비스 멤버 목록 — 멤버 조회 API 연동 전까지 임시로 사용하는 mock 데이터. */
const MOCK_SERVICE_MEMBERS: ServiceMember[] = [
  { user_id: 'mock-1', name: '김도원', email: 'dawon.kim@skala.com', role: 'OWNER' },
  { user_id: 'mock-2', name: '이서연', email: 'seoyeon.lee@skala.com', role: 'MEMBER' },
  { user_id: 'mock-3', name: '박준호', email: 'junho.park@skala.com', role: 'MEMBER' },
  { user_id: 'mock-4', name: '최민지', email: 'minji.choi@skala.com', role: 'MEMBER' },
];

/** 결과 CSV/PDF 를 Slack DM으로 공유 — 서비스 멤버 + 직접 입력 이메일 모두 수신자로 선택 가능. */
export function SlackSendModal({ open, context, serviceUuid, runId, onClose }: SlackSendModalProps) {
  const [format, setFormat] = useState<ShareFormat>('csv');
  const [members] = useState<ServiceMember[]>(MOCK_SERVICE_MEMBERS);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [manualEmails, setManualEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SlackNotifyResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !context) return;
    setFormat('csv');
    setSelectedMemberIds(new Set());
    setManualEmails([]);
    setEmailInput('');
    setMessage(`[QAPilot] ${context.title} 결과를 공유드립니다. 첨부 파일을 확인해 주세요.`);
    setSending(false);
    setResults(null);
    setError(null);
  }, [open, context]);

  if (!open || !context) return null;

  const addRecipientEmail = (email: string) => {
    setManualEmails(prev => prev.includes(email) ? prev : [...prev, email]);
  };

  const addManualEmail = () => {
    const email = emailInput.trim();
    if (!email) return;
    addRecipientEmail(email);
    setEmailInput('');
  };

  const removeManualEmail = (email: string) => {
    setManualEmails(prev => prev.filter(e => e !== email));
  };

  const toggleMember = (userId: string) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const memberEmails = members
    .filter(m => selectedMemberIds.has(m.user_id) && m.email)
    .map(m => m.email as string);
  const recipientEmails = [...new Set([...memberEmails, ...manualEmails])];

  const handleSend = async () => {
    if (!serviceUuid || !runId) return;
    if (recipientEmails.length === 0) {
      setError('받는 사람을 한 명 이상 선택하거나 입력하세요.');
      return;
    }
    setError(null);
    setSending(true);
    setResults(null);
    try {
      const blob = format === 'csv'
        ? csvBlobFromRows(context.rows)
        : await pdfBlobFromRows(context.title, context.rows, context.meta, context.details);
      const filename = `${context.filenameBase}.${format}`;
      const formData = new FormData();
      formData.append('file', blob, filename);
      recipientEmails.forEach(email => formData.append('recipients', email));
      if (message.trim()) formData.append('message', message.trim());
      const result = await sendSlackNotification(serviceUuid, runId, formData);
      setResults(result);
    } catch (err) {
      console.error('Slack 공유 실패', err);
      setError(err instanceof ApiError ? err.message : 'Slack 전송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#f0f0f0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-[#3615CF]" />
            <span className="font-semibold text-[#1a1a2e]">Slack DM으로 공유</span>
          </div>
          <button onClick={onClose} className="text-[#9ca3af] hover:text-[#1a1a2e]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="text-sm text-[#6b7280]">{context.title}</div>

          <div>
            <div className="text-xs font-semibold text-[#1a1a2e] mb-2">파일 형식</div>
            <div className="flex gap-2">
              {(['csv', 'pdf'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    format === f
                      ? 'bg-[#3615CF] text-white border-[#3615CF]'
                      : 'bg-white text-[#6b7280] border-[#e5e7eb] hover:bg-gray-50'
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-[#1a1a2e] mb-2">서비스 멤버</div>
            <div className="border border-[#e5e7eb] rounded-lg max-h-40 overflow-y-auto">
              {members.length === 0 ? (
                <div className="px-3 py-3 text-xs text-[#9ca3af]">멤버가 없습니다.</div>
              ) : (
                members.map(m => (
                  <label
                    key={m.user_id}
                    className={`flex items-center gap-2 px-3 py-2 border-b border-[#f0f0f0] last:border-b-0 ${
                      m.email ? 'cursor-pointer hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.has(m.user_id)}
                      onChange={() => toggleMember(m.user_id)}
                      disabled={!m.email}
                      className="w-3.5 h-3.5 accent-[#3615CF]"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[#1a1a2e] truncate">{m.name ?? m.email ?? m.user_id}</div>
                      {m.email && <div className="text-[10px] text-[#9ca3af] truncate">{m.email}</div>}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {context.scope === 'selected-fail' && context.recommendedAssignees.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#1a1a2e] mb-2">추천 담당자 (Git 이력 기준)</div>
              <div className="border border-[#e5e7eb] rounded-lg max-h-32 overflow-y-auto">
                {context.recommendedAssignees.map(({ assignee, tcLabels }) => {
                  const isEmail = assignee.includes('@');
                  const alreadyAdded = recipientEmails.includes(assignee);
                  return (
                    <div key={assignee} className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#f0f0f0] last:border-b-0">
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#1a1a2e] truncate">{assignee}</div>
                        <div className="text-[10px] text-[#9ca3af] truncate">{tcLabels.join(', ')}</div>
                      </div>
                      {isEmail ? (
                        alreadyAdded ? (
                          <span className="text-[10px] text-[#9ca3af] shrink-0">추가됨</span>
                        ) : (
                          <button
                            onClick={() => addRecipientEmail(assignee)}
                            className="shrink-0 px-2 py-1 bg-white border border-[#e5e7eb] rounded-lg text-[11px] text-[#6b7280] hover:bg-gray-50"
                          >
                            추가
                          </button>
                        )
                      ) : (
                        <span className="text-[10px] text-[#9ca3af] shrink-0">이메일 정보 없음</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-semibold text-[#1a1a2e] mb-2">이메일 직접 추가</div>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addManualEmail(); } }}
                placeholder="example@skala.com"
                className="flex-1 px-3 py-1.5 border border-[#e5e7eb] rounded-lg text-xs focus:outline-none focus:border-[#3615CF]"
              />
              <button
                onClick={addManualEmail}
                className="px-3 py-1.5 bg-white border border-[#e5e7eb] rounded-lg text-xs text-[#6b7280] hover:bg-gray-50"
              >
                추가
              </button>
            </div>
            {manualEmails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {manualEmails.map(email => (
                  <span key={email} className="inline-flex items-center gap-1 px-2 py-1 bg-[#3615CF]/10 text-[#3615CF] rounded text-[11px]">
                    {email}
                    <button onClick={() => removeManualEmail(email)} className="hover:text-[#1a1a2e]">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-semibold text-[#1a1a2e] mb-2">메시지 (선택)</div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={2}
              placeholder="DM에 함께 전송할 메시지를 입력하세요"
              className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-xs focus:outline-none focus:border-[#3615CF] resize-none"
            />
          </div>

          {error && <div className="text-xs text-status-fail">{error}</div>}

          {results && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-[#1a1a2e]">전송 결과</div>
              {results.map(r => (
                <div key={r.email} className="flex items-center gap-2 text-xs">
                  {r.status === 'sent' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-status-pass" />
                  ) : r.status === 'not_found' ? (
                    <HelpCircle className="w-3.5 h-3.5 text-[#d4a017]" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-status-fail" />
                  )}
                  <span className="text-[#6b7280]">{r.email}</span>
                  <span className="ml-auto text-[#9ca3af]">
                    {r.status === 'sent' ? '전송됨' : r.status === 'not_found' ? 'Slack 미가입' : '전송 실패'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#f0f0f0] flex items-center gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-white border border-[#e5e7eb] rounded-lg text-sm hover:bg-gray-50">
            닫기
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 px-4 py-2 bg-[#3615CF] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:shadow-md transition-shadow disabled:opacity-60"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
