import { CheckCircle, Clock, Loader2, XCircle } from 'lucide-react';

export function StatusIcon({ status, size = 'w-4 h-4' }: { status: string; size?: string }) {
  if (status === 'completed') return <CheckCircle className={`${size} text-[#9AB17A]`} />;
  if (status === 'failed') return <XCircle className={`${size} text-[#FF9A86]`} />;
  if (status === 'running') return <Loader2 className={`${size} text-[#f78ca0] animate-spin`} />;
  return <Clock className={`${size} text-[#BFC6C4]`} />;
}
