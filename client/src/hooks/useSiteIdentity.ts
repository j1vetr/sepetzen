import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_SITE_IDENTITY, type SiteIdentity } from '@shared/siteIdentity';

/**
 * Public site identity (announcements, contact info, footer & mobile nav content).
 * Falls back to the built-in defaults while loading or on error, so the UI
 * always renders complete content.
 */
export function useSiteIdentity(): SiteIdentity {
  const { data } = useQuery<SiteIdentity>({
    queryKey: ['/api/site-identity'],
    staleTime: 5 * 60 * 1000,
  });
  const identity = data ?? DEFAULT_SITE_IDENTITY;

  useEffect(() => {
    if (!identity.faviconUrl) return;
    const href = `${identity.faviconUrl}${identity.faviconUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(identity.faviconUrl)}`;

    const ensureLink = (rel: string, type?: string): HTMLLinkElement => {
      let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        if (type) link.type = type;
        document.head.appendChild(link);
      }
      return link;
    };

    ensureLink('icon', 'image/png').href = href;
    ensureLink('shortcut icon', 'image/png').href = href;
    ensureLink('apple-touch-icon').href = href;
  }, [identity.faviconUrl]);

  return identity;
}
