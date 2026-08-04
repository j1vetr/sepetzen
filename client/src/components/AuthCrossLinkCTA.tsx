import { Link } from 'wouter';
import { ArrowUpRight } from 'lucide-react';

interface AuthCrossLinkCTAProps {
  href: string;
  index: string;
  eyebrow: string;
  headline: string;
  ctaLabel: string;
  testId: string;
  containerClassName?: string;
}

export function AuthCrossLinkCTA({
  href,
  index,
  eyebrow,
  headline,
  ctaLabel,
  testId,
  containerClassName = 'px-6 lg:px-16 py-7',
}: AuthCrossLinkCTAProps) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="group block border-t-2 border-white bg-[#1A1A1A]/40 hover:bg-[#1A1A1A] transition-colors"
    >
      <div className={`flex items-center justify-between gap-6 ${containerClassName}`}>
        <div className="min-w-0">
          <span className="block text-[10px] font-mono tracking-[0.32em] uppercase text-white tabular-nums mb-1.5">
            {index} / {eyebrow}
          </span>
          <p className="font-display text-lg sm:text-2xl tracking-[0.01em] text-white leading-tight break-words">
            {headline}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline text-[11px] tracking-[0.18em] uppercase font-medium text-white/65 group-hover:text-white transition-colors">
            {ctaLabel}
          </span>
          <span className="inline-flex items-center justify-center w-10 h-10 border-2 border-white/20 group-hover:border-white group-hover:bg-white transition-all">
            <ArrowUpRight
              className="w-4 h-4 text-white group-hover:text-black transition-all duration-300 group-hover:rotate-[-45deg]"
              strokeWidth={2}
            />
          </span>
        </div>
      </div>
    </Link>
  );
}
