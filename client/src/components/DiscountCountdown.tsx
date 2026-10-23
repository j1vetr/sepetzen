import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { parseDiscountEnd } from '@/lib/discountBadgeActive';

const pad = (n: number) => String(n).padStart(2, '0');

/** İndirim bitiş zamanına kalan süreyi canlı gösterir. Bitiş yoksa veya geçtiyse hiçbir şey çizmez. */
export function DiscountCountdown({ endDate, className = '', testId }: { endDate?: string | null; className?: string; testId?: string }) {
  const end = parseDiscountEnd(endDate);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (end === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [end]);

  if (end === null || end <= now) return null;
  const total = Math.floor((end - now) / 1000);
  const days = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return (
    <span
      className={`storefront-new-badge discount-countdown normal-case tabular-nums gap-1.5 ${className}`}
      data-testid={testId}
      title="İndirimin bitmesine kalan süre"
    >
      <Clock className="w-3 h-3" />
      {days > 0 ? `${days}g ` : ''}{pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}
