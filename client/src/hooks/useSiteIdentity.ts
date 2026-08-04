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
  return data ?? DEFAULT_SITE_IDENTITY;
}
