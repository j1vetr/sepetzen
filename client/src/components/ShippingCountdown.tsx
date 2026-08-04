import { useState, useEffect } from 'react';
import { Truck, Clock } from 'lucide-react';

interface ShippingInfo {
  hours: number;
  minutes: number;
  seconds: number;
  label: string;
  isSameDay: boolean;
}

function calculateShippingInfo(): ShippingInfo {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const cutoffHour = 16;

  let targetDate: Date;
  let label: string;
  let isSameDay: boolean;

  const isWeekday = day >= 1 && day <= 5;
  const isBeforeCutoff = hour < cutoffHour;

  if (isWeekday && isBeforeCutoff) {
    targetDate = new Date(now);
    targetDate.setHours(cutoffHour, 0, 0, 0);
    label = 'aynı gün kargoda';
    isSameDay = true;
  } else if (day >= 1 && day <= 4 && !isBeforeCutoff) {
    targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(cutoffHour, 0, 0, 0);
    label = 'yarın kargoda';
    isSameDay = false;
  } else {
    targetDate = new Date(now);
    if (day === 5 && !isBeforeCutoff) {
      targetDate.setDate(targetDate.getDate() + 3);
    } else if (day === 6) {
      targetDate.setDate(targetDate.getDate() + 2);
    } else if (day === 0) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    targetDate.setHours(cutoffHour, 0, 0, 0);
    label = 'Pazartesi kargoda';
    isSameDay = false;
  }

  const diff = targetDate.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds, label, isSameDay };
}

export function ShippingCountdown() {
  const [info, setInfo] = useState<ShippingInfo | null>(null);

  useEffect(() => {
    const update = () => setInfo(calculateShippingInfo());
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (!info) return null;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-shrink-0 w-7 h-7 bg-white/8 border border-white/10 flex items-center justify-center">
        <Truck className="w-3.5 h-3.5 text-white/50" />
      </div>
      <p className="text-xs text-white/65 leading-tight min-w-0">
        <span className="text-white font-bold tabular-nums">
          {pad(info.hours)}:{pad(info.minutes)}:{pad(info.seconds)}
        </span>{' '}
        içinde sipariş ver,{' '}<span className="font-semibold text-white">{info.label}</span>!
      </p>
    </div>
  );
}

export function ShippingCountdownBanner() {
  const [info, setInfo] = useState<ShippingInfo | null>(null);

  useEffect(() => {
    const update = () => setInfo(calculateShippingInfo());
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (!info) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${info.isSameDay ? 'bg-black' : 'bg-black'} text-white py-2.5 text-center`}>
      <p className="text-xs sm:text-sm font-medium tracking-wide">
        <span className="inline-flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span className="font-bold text-base sm:text-lg tabular-nums">{pad(info.hours)}:{pad(info.minutes)}:{pad(info.seconds)}</span>
          {' '}içinde sipariş ver, {info.label}!
        </span>
      </p>
    </div>
  );
}
