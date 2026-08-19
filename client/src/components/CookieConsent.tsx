import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { X, Cookie } from 'lucide-react';

const STORAGE_KEY = 'sepetzen-cookie-consent';

export function CookieConsent() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);
  const [extraOffset, setExtraOffset] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    const measure = () => {
      let extra = 0;
      document.querySelectorAll<HTMLElement>('[style*="mobile-nav-total"]').forEach((el) => {
        if (el === wrapperRef.current) return;
        if (el.offsetHeight === 0) return;
        const cs = window.getComputedStyle(el);
        if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') return;
        extra = Math.max(extra, el.offsetHeight);
      });
      setExtraOffset(extra);
    };
    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    const observer = new MutationObserver(scheduleMeasure);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', scheduleMeasure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      cancelAnimationFrame(frame);
    };
  }, [visible]);

  if (location.startsWith('/toov-admin')) return null;
  if (!visible) return null;

  const remember = (value: 'accepted' | 'dismissed') => {
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ }
    setVisible(false);
  };

  return (
    <div
      ref={wrapperRef}
      className="fixed left-3 sm:left-4 z-[120] pointer-events-none"
      style={{ bottom: `calc(var(--mobile-nav-total, 0px) + ${extraOffset}px + 12px)` }}
      role="region"
      aria-label="Çerez bildirimi"
      data-testid="banner-cookie-consent"
    >
      <div
        className="pointer-events-auto w-[260px] sm:w-[300px] rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
        style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
          <div className="flex items-center gap-2">
            <Cookie className="w-3.5 h-3.5 text-white/50 shrink-0" aria-hidden="true" />
            <span className="text-[11px] font-semibold tracking-[0.10em] uppercase text-white/55">
              Çerez Bildirimi
            </span>
          </div>
          <button
            type="button"
            onClick={() => remember('dismissed')}
            className="w-6 h-6 flex items-center justify-center text-white/35 hover:text-white transition-colors"
            aria-label="Bildirimi kapat"
            data-testid="button-dismiss-cookies"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <p className="px-4 pb-3 text-[11px] leading-relaxed text-white/50">
          Deneyiminizi iyileştirmek için çerezler kullanıyoruz.{' '}
          <Link href="/sayfa/cerez-politikasi">
            <span className="text-white/70 underline underline-offset-2 hover:text-white cursor-pointer transition-colors" data-testid="link-cookie-policy">
              Detay
            </span>
          </Link>
        </p>

        {/* Action */}
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => remember('accepted')}
            className="w-full py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white font-semibold text-[11px] uppercase tracking-[0.16em] transition-colors"
            data-testid="button-accept-cookies"
          >
            Kabul Et
          </button>
        </div>
      </div>
    </div>
  );
}
