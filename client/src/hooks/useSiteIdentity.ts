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
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const shortcut = document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');
    const appleTouch = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    [favicon, shortcut, appleTouch].forEach((link) => {
      if (link) link.href = `${identity.faviconUrl}${identity.faviconUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(identity.faviconUrl)}`;
    });
  }, [identity.faviconUrl]);

  return identity;
}
