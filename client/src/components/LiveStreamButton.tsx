import { Link } from 'wouter';
import { useLiveStream } from '@/hooks/useLiveStream';

/** Yayın açıkken başlıkta görünen kırmızı, yanıp sönen CANLI YAYIN düğmesi. */
export function LiveStreamButton({ compact = false, testId = 'link-live-stream' }: { compact?: boolean; testId?: string }) {
  const { data } = useLiveStream();
  if (!data?.isActive) return null;
  return (
    <Link
      href="/canli"
      data-testid={testId}
      aria-label="Canlı yayın"
      className={`inline-flex items-center gap-2 rounded-full bg-red-600 text-white font-bold uppercase tracking-[0.12em] shadow-[0_0_0_0_rgba(220,38,38,0.6)] animate-live-pulse hover:bg-red-500 transition-colors ${
        compact ? 'h-8 px-3 text-[10px]' : 'h-10 px-4 text-[11px]'
      }`}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      {compact ? 'Canlı' : 'Canlı Yayın'}
    </Link>
  );
}
