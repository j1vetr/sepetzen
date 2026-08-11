import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { X, Cookie } from 'lucide-react';

const STORAGE_KEY = 'sepetzen-cookie-consent';

// Basit çerez onay bildirimi. İlk ziyarette alt kısımda görünür.
// Kabul veya kapatma tercihi localStorage ile hatırlanır ve tekrar gösterilmez.
export function CookieConsent() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);
  // Sepet, ödeme ve ürün sayfalarındaki sabit alt aksiyon çubuklarının üstünde
  // durması için ölçülen ek mesafe (bildirim satın alma butonlarını kapatmasın)
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
      // Alt çubuklar da --mobile-nav-total tabanına sabitlenir. Görünür olan
      // en yüksek çubuğun yüksekliği kadar yukarı kayarız.
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

  // Admin paneli storefront temasından ayrı, bildirim orada gösterilmez
  if (location.startsWith('/toov-admin')) return null;
  if (!visible) return null;

  const remember = (value: 'accepted' | 'dismissed') => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // localStorage kullanılamıyorsa bildirim yalnızca bu oturumda kapanır
    }
    setVisible(false);
  };

  return (
    <div
      ref={wrapperRef}
      className="fixed inset-x-0 z-[120] px-3 pb-3 sm:px-4 sm:pb-4 pointer-events-none"
      style={{ bottom: `calc(var(--mobile-nav-total, 0px) + ${extraOffset}px)` }}
      role="region"
      aria-label="Çerez bildirimi"
      data-testid="banner-cookie-consent"
    >
      <div className="pointer-events-auto max-w-3xl mx-auto bg-[#141414] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Cookie className="w-4 h-4 text-white/50 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="flex-1 text-[12px] sm:text-[13px] leading-relaxed text-white/65">
            Alışveriş deneyiminizi iyileştirmek ve site performansını ölçmek için çerezler kullanıyoruz.
            Ayrıntılı bilgi için{' '}
            <Link href="/sayfa/cerez-politikasi">
              <span className="underline text-white/85 hover:text-white cursor-pointer" data-testid="link-cookie-policy">
                Çerez Politikası
              </span>
            </Link>{' '}
            sayfamıza göz atabilirsiniz.
          </p>
          <button
            type="button"
            onClick={() => remember('dismissed')}
            className="shrink-0 w-7 h-7 -mt-1 -mr-1 flex items-center justify-center text-white/40 hover:text-white transition-colors"
            aria-label="Bildirimi kapat"
            data-testid="button-dismiss-cookies"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => remember('accepted')}
            className="px-5 py-2 bg-white text-black font-semibold text-[11px] uppercase tracking-[0.18em] hover:bg-white/85 transition-colors"
            data-testid="button-accept-cookies"
          >
            Kabul Et
          </button>
        </div>
      </div>
    </div>
  );
}
