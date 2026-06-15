import { CheckCircle, Clock, HelpCircle, Loader2, MinusCircle, XCircle } from 'lucide-react';

export function StatusIcon({ status, size = 'w-4 h-4' }: { status: string; size?: string }) {
  if (status === 'completed' || status === 'passed') return <CheckCircle className={`${size} text-status-pass`} />;
  if (status === 'failed') return <XCircle className={`${size} text-status-fail`} />;
  if (status === 'running') return <Loader2 className={`${size} text-primary-blue animate-spin`} />;
  // skipped = 검증 미완 (자동화 불가), unverified = 판정 보류 — 대기(Clock)와 구분
  if (status === 'skipped') return <MinusCircle className={`${size} text-[#d4a017]`} />;
  if (status === 'unverified') return <HelpCircle className={`${size} text-[#7c8db5]`} />;
  return <Clock className={`${size} text-[#BFC6C4]`} />;
}
