import { useState } from 'react';
import { X } from 'lucide-react';
import { useSiteIdentity } from '@/hooks/useSiteIdentity';

export function TopBanner() {
  const identity = useSiteIdentity();
  const [dismissed, setDismissed] = useState(false);

  const banner = identity.topBanner;
  if (!banner?.enabled || !banner.imageUrl || dismissed) return null;

  const isVideo = /\.(mp4|webm|mov)$/i.test(banner.imageUrl);
  const isGif   = /\.gif$/i.test(banner.imageUrl);

  const inner = isVideo ? (
    <video
      src={banner.imageUrl}
      autoPlay
      muted
      loop
      playsInline
      className="w-full max-h-[180px] object-cover"
    />
  ) : (
    <img
      src={banner.imageUrl}
      alt="Duyuru banner"
      className="w-full max-h-[180px] object-cover"
      loading={isGif ? 'eager' : 'lazy'}
    />
  );

  return (
    <div className="relative w-full overflow-hidden bg-black" data-testid="top-banner">
      {banner.linkUrl ? (
        <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="block">
          {inner}
        </a>
      ) : (
        inner
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Banneri kapat"
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-colors"
        data-testid="button-close-top-banner"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
