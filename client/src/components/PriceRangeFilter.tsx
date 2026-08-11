import { useEffect, useState } from 'react';
import { Slider } from '@/components/ui/slider';

interface PriceRangeFilterProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(Math.max(n, lo), hi);
}

/**
 * Fiyat aralığı filtresi: slider + min/maks sayı girişleri (iki yönlü senkron).
 * Girişler yazarken serbesttir; blur/Enter'da doğrulanır ve slider ile eşitlenir.
 */
export function PriceRangeFilter({
  value,
  onChange,
  min = 0,
  max = 10000,
  step = 100,
  className = '',
}: PriceRangeFilterProps) {
  const [minDraft, setMinDraft] = useState(String(value[0]));
  const [maxDraft, setMaxDraft] = useState(String(value[1]));

  // Slider veya dış kaynak değeri değiştirdiğinde taslakları eşitle
  useEffect(() => {
    setMinDraft(String(value[0]));
    setMaxDraft(String(value[1]));
  }, [value[0], value[1]]);

  const commitMin = () => {
    const parsed = Number.parseInt(minDraft.replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(parsed)) {
      setMinDraft(String(value[0]));
      return;
    }
    const next = clamp(parsed, min, value[1]);
    setMinDraft(String(next));
    if (next !== value[0]) onChange([next, value[1]]);
  };

  const commitMax = () => {
    const parsed = Number.parseInt(maxDraft.replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(parsed)) {
      setMaxDraft(String(value[1]));
      return;
    }
    const next = clamp(parsed, value[0], max);
    setMaxDraft(String(next));
    if (next !== value[1]) onChange([value[0], next]);
  };

  const onKeyDown = (commit: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commit();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className={className}>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v as [number, number])}
        className="mb-4"
        data-testid="slider-price-range"
      />
      <div className="flex items-center justify-between gap-2">
        <label className="flex-1 border border-white/12 focus-within:border-white/40 transition-colors rounded-sm px-2.5 py-1.5 block cursor-text">
          <span className="text-[9px] uppercase tracking-widest text-white/40 leading-none mb-0.5 block text-center">Min</span>
          <span className="flex items-center justify-center gap-1">
            <input
              type="text"
              inputMode="numeric"
              value={minDraft}
              onChange={(e) => setMinDraft(e.target.value)}
              onBlur={commitMin}
              onKeyDown={onKeyDown(commitMin)}
              className="w-full bg-transparent text-[12px] font-semibold text-white tabular-nums text-center outline-none"
              aria-label="Minimum fiyat"
              data-testid="input-price-min"
            />
            <span className="text-[11px] text-white/40 shrink-0">₺</span>
          </span>
        </label>
        <span className="text-white/30 text-sm">-</span>
        <label className="flex-1 border border-white/12 focus-within:border-white/40 transition-colors rounded-sm px-2.5 py-1.5 block cursor-text">
          <span className="text-[9px] uppercase tracking-widest text-white/40 leading-none mb-0.5 block text-center">Maks</span>
          <span className="flex items-center justify-center gap-1">
            <input
              type="text"
              inputMode="numeric"
              value={maxDraft}
              onChange={(e) => setMaxDraft(e.target.value)}
              onBlur={commitMax}
              onKeyDown={onKeyDown(commitMax)}
              className="w-full bg-transparent text-[12px] font-semibold text-white tabular-nums text-center outline-none"
              aria-label="Maksimum fiyat"
              data-testid="input-price-max"
            />
            <span className="text-[11px] text-white/40 shrink-0">₺</span>
          </span>
        </label>
      </div>
    </div>
  );
}
