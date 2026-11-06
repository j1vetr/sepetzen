import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { isAdminPath } from '@/lib/adminPath';
import { trackMeta } from '@/lib/metaPixel';

/** Sayfa geçişlerinde Meta PageView olayını gönderir (yönetim paneli hariç). */
export function MetaPixelTracker() {
  const [location] = useLocation();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (isAdminPath(location)) return;
    const key = location + window.location.search;
    if (last.current === key) return;
    last.current = key;
    void trackMeta('PageView');
  }, [location]);

  return null;
}
