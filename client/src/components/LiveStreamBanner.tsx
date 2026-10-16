import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { useLiveStream } from '@/hooks/useLiveStream';

/** Yayın açıkken ana sayfada gösterilen geniş CANLI YAYIN şeridi. */
export function LiveStreamBanner() {
  const { data } = useLiveStream();
  if (!data?.isActive) return null;
  return (
    <Link
      href="/canli"
      className="block bg-red-600 hover:bg-red-500 transition-colors text-white"
      data-testid="banner-live-stream"
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] shrink-0">Canlı yayında</span>
          <span className="hidden sm:inline text-white/60">|</span>
          <span className="text-[13px] font-medium truncate">{data.title}</span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.12em] shrink-0">
          Ürünleri gör <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  );
}
