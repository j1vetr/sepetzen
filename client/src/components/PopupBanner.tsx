import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSiteIdentity } from '@/hooks/useSiteIdentity';

const STORAGE_KEY = 'sepetzen_popup_dismissed';

export function PopupBanner() {
  const identity = useSiteIdentity();
  const [visible, setVisible] = useState(false);

  const popup = identity.popupBanner;

  useEffect(() => {
    if (!popup?.enabled || !popup.imageUrl) return;
    if (popup.showOnce && localStorage.getItem(STORAGE_KEY) === 'true') return;

    const timer = setTimeout(() => setVisible(true), (popup.showAfterSeconds ?? 3) * 1000);
    return () => clearTimeout(timer);
  }, [popup]);

  if (!visible || !popup?.enabled || !popup.imageUrl) return null;

  function dismiss() {
    setVisible(false);
    if (popup?.showOnce) localStorage.setItem(STORAGE_KEY, 'true');
  }

  const isVideo = /\.(mp4|webm|mov)$/i.test(popup.imageUrl);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={dismiss}
      data-testid="popup-banner-overlay"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

      {/* Card */}
      <div
        className="relative z-10 max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="popup-banner-card"
      >
        {/* Close */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Kapat"
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-colors"
          data-testid="button-close-popup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image / Video */}
        {popup.linkUrl ? (
          <a href={popup.linkUrl} target="_blank" rel="noopener noreferrer">
            {isVideo ? (
              <video src={popup.imageUrl} autoPlay muted loop playsInline className="w-full" />
            ) : (
              <img src={popup.imageUrl} alt={popup.title || 'Duyuru'} className="w-full" />
            )}
          </a>
        ) : isVideo ? (
          <video src={popup.imageUrl} autoPlay muted loop playsInline className="w-full" />
        ) : (
          <img src={popup.imageUrl} alt={popup.title || 'Duyuru'} className="w-full" />
        )}

        {/* Text content (if any) */}
        {(popup.title || popup.body) && (
          <div className="bg-[#111] px-5 py-4">
            {popup.title && (
              <p className="text-white font-semibold text-base mb-1">{popup.title}</p>
            )}
            {popup.body && (
              <p className="text-white/70 text-sm leading-relaxed">{popup.body}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
