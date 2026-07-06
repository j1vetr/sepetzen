import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
  noIndex?: boolean;
  product?: {
    name: string;
    price: number;
    currency?: string;
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
    sku?: string;
    brand?: string;
    category?: string;
    images?: string[];
  };
  breadcrumbs?: Array<{ name: string; url: string }>;
}

const DEFAULT_TITLE = 'Sepetzen | Kamp, Outdoor, Bıçak ve Bağ & Bahçe';
const DEFAULT_DESCRIPTION = 'Sepetzen, av bıçakları, kamp çakıları, outdoor ekipmanları ve bağ & bahçe ürünleri sunan Türk outdoor markasıdır. Dalaman\'dan Türkiye geneline hızlı teslimat.';
const SITE_NAME = 'Sepetzen';
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

export function SEO({ 
  title, 
  description = DEFAULT_DESCRIPTION, 
  image,
  url,
  type = 'website',
  noIndex = false,
  product,
  breadcrumbs
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const fullUrl = url ? `${BASE_URL}${url}` : (typeof window !== 'undefined' ? window.location.href : '');
  const imageUrl = image ? (image.startsWith('http') ? image : `${BASE_URL}${image}`) : `${BASE_URL}/og-image.png`;

  useEffect(() => {
    document.title = fullTitle;
    
    const updateMetaTag = (selector: string, content: string, attr = 'content') => {
      let element = document.querySelector(selector);
      if (element) {
        element.setAttribute(attr, content);
      }
    };

    updateMetaTag('meta[name="description"]', description);
    updateMetaTag('meta[name="robots"]', noIndex ? 'noindex, nofollow' : 'index, follow');

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('data-managed', 'seo');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', fullUrl);

    updateMetaTag('meta[property="og:title"]', fullTitle);
    updateMetaTag('meta[property="og:description"]', description);
    updateMetaTag('meta[property="og:url"]', fullUrl);
    updateMetaTag('meta[property="og:type"]', type);
    updateMetaTag('meta[property="og:image"]', imageUrl);
    updateMetaTag('meta[name="twitter:title"]', fullTitle);
    updateMetaTag('meta[name="twitter:description"]', description);
    updateMetaTag('meta[name="twitter:image"]', imageUrl);

    const existingSchema = document.querySelector('script[data-schema="seo"]');
    if (existingSchema) {
      existingSchema.remove();
    }

    const schemas: any[] = [];

    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Sepetzen',
      url: BASE_URL,
      logo: `${BASE_URL}/logo.png`,
      sameAs: [
        'https://instagram.com/sepetzen',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'sepetzen@gmail.com',
        contactType: 'customer service'
      }
    });

    if (product) {
      const normalizeImageUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return `${BASE_URL}${url.startsWith('/') ? url : '/' + url}`;
      };
      
      const productImages = product.images 
        ? product.images.map(normalizeImageUrl) 
        : [imageUrl];
      
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: description,
        image: productImages,
        sku: product.sku,
        brand: {
          '@type': 'Brand',
          name: product.brand || 'Sepetzen'
        },
        category: product.category,
        offers: {
          '@type': 'Offer',
          url: fullUrl,
          priceCurrency: product.currency || 'TRY',
          price: product.price,
          availability: `https://schema.org/${product.availability || 'InStock'}`,
          seller: {
            '@type': 'Organization',
            name: 'Sepetzen'
          }
        }
      });
    }

    if (breadcrumbs && breadcrumbs.length > 0) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: `${BASE_URL}${item.url}`
        }))
      });
    }

    if (type === 'website' && !product) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Sepetzen',
        url: BASE_URL,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${BASE_URL}/arama?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      });
    }

    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.setAttribute('data-schema', 'seo');
    schemaScript.textContent = JSON.stringify(schemas.length === 1 ? schemas[0] : schemas);
    document.head.appendChild(schemaScript);

    return () => {
      const script = document.querySelector('script[data-schema="seo"]');
      if (script) script.remove();
      const managedCanonical = document.querySelector('link[rel="canonical"][data-managed="seo"]');
      if (managedCanonical) managedCanonical.remove();
    };
  }, [fullTitle, description, fullUrl, type, imageUrl, noIndex, product, breadcrumbs]);

  return null;
}
