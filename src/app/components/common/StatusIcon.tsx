import { CheckCircle, Clock, Loader2, XCircle } from 'lucide-react';

export function StatusIcon({ status, size = 'w-4 h-4' }: { status: string; size?: string }) {
  if (status === 'completed' || status === 'passed') return <CheckCircle className={`${size} text-status-pass`} />;
  if (status === 'failed') return <XCircle className={`${size} text-status-fail`} />;
  if (status === 'running') return <Loader2 className={`${size} text-primary-blue animate-spin`} />;
  return <Clock className={`${size} text-[#BFC6C4]`} />;
}
