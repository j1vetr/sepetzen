import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback?: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
      theme?: 'light' | 'dark' | 'auto';
    },
  ) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
import { Link, useParams } from 'wouter';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import {
  ChevronRight,
  ChevronLeft,
  Heart,
  Truck,
  RotateCcw,
  Shield,
  X,
  Loader2,
  Package,
  Plus,
  Minus,
  Share2,
  Copy,
  Star,
  Send,
  Check,
  MessageCircle,
  Ruler,
  Wrench,
  Target,
  Gift,
} from 'lucide-react';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { ShippingCountdown } from '@/components/ShippingCountdown';
import { ProductCard } from '@/components/ProductCard';

import { getOriginalPrice } from '@/lib/discountPrice';
import { useProduct, useProducts, useCategories } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { useCartModal } from '@/hooks/useCartModal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useFavoriteIds, useToggleFavorite } from '@/hooks/useFavorites';
import {
  useProductReviews,
  useProductRating,
  useUserReview,
  useCreateReview,
} from '@/hooks/useReviews';

function StarRating({
  rating,
  size = 16,
  interactive = false,
  onChange,
}: {
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
          aria-label={`${star} yıldız`}
        >
          <Star
            style={{ width: size, height: size }}
            className={`${
              star <= (hover || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-black/15'
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Description HTML → Section Parser ──────────────────────────────────────

interface DescSection {
  emoji: string;
  title: string;
  type: 'specs' | 'material' | 'usage' | 'gift' | 'generic';
  items: string[];
  prose: string;
}

const SECTION_EMOJIS = ['📐', '🔩', '🎯', '🎁'] as const;
type SectionEmoji = (typeof SECTION_EMOJIS)[number];

function emojiToType(emoji: string, title: string): DescSection['type'] {
  if (emoji === '📐' || /teknik/i.test(title)) return 'specs';
  if (emoji === '🔩' || /materyal/i.test(title)) return 'material';
  if (emoji === '🎯' || /kullanım/i.test(title)) return 'usage';
  if (emoji === '🎁' || /hediye/i.test(title)) return 'gift';
  return 'generic';
}

function parseProductSections(html: string): DescSection[] {
  if (!html) return [];

  // ── Strategy A: h2/h3/h4 headings (future-proof) ──────────────────────────
  const headingRe = /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi;
  const hMatches = [...html.matchAll(headingRe)];
  if (hMatches.length > 0) {
    return hMatches.map((m, i) => {
      const end = m.index! + m[0].length;
      const nextStart = hMatches[i + 1]?.index ?? html.length;
      const bodyHtml = html.slice(end, nextStart);
      const text = m[1].replace(/<[^>]+>/g, '').trim();
      const emoji = SECTION_EMOJIS.find(e => text.includes(e)) ?? '';
      const title = text.replace(/^[^\p{L}\p{N}]+/u, '').trim() || text;
      const items = [...bodyHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
        .map(lm => lm[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);
      const prose = [...bodyHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
        .map(pm => pm[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(' ');
      return { emoji, title, type: emojiToType(emoji, title), items, prose };
    });
  }

  // ── Strategy B: emoji-span pattern (actual AI-generated descriptions) ──────
  // The AI descriptions use <span>📐</span><span>Title</span> inside a flex div.
  // We detect section starts by finding emoji-only spans, then collect until next.
  if (typeof window === 'undefined') return []; // SSR guard

  const doc = new DOMParser().parseFromString(html, 'text/html');

  const sectionHeaders: { emoji: SectionEmoji; title: string; container: Element }[] = [];

  doc.body.querySelectorAll('span').forEach(span => {
    const txt = span.textContent?.trim() ?? '';
    const emoji = SECTION_EMOJIS.find(e => txt === e);
    if (!emoji) return;
    const titleSpan = span.nextElementSibling;
    const title = titleSpan?.textContent?.trim() ?? '';
    // Walk up to find the section wrapper (typically 2 levels: flex-div → section-div)
    const flexDiv = span.parentElement;
    const container = flexDiv?.parentElement;
    if (container) sectionHeaders.push({ emoji, title, container });
  });

  if (sectionHeaders.length === 0) return [];

  return sectionHeaders.map(({ emoji, title, container }) => {
    const clone = container.cloneNode(true) as Element;
    // Remove the header flex div so we only get body content
    const flexDiv = clone.querySelector('[style*="display:flex"]');
    flexDiv?.remove();
    const items = [...clone.querySelectorAll('li')]
      .map(li => li.textContent?.trim() ?? '').filter(Boolean);
    const prose = [...clone.querySelectorAll('p')]
      .map(p => p.textContent?.trim() ?? '').filter(Boolean).join(' ');
    return { emoji, title, type: emojiToType(emoji, title), items, prose };
  });
}

function ProductDescriptionSections({ html }: { html: string }) {
  const sections = useMemo(() => parseProductSections(html), [html]);

  if (sections.length === 0) {
    return (
      <div
        className="text-sm text-black/60 leading-relaxed prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className="space-y-2.5 mt-1">
      {sections.map((section, i) => {
        if (section.type === 'specs') {
          return (
            <div key={i} className="border border-black/8 bg-stone-50/80 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#2D5A27]/[0.07] border-b border-black/6">
                <Ruler className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" strokeWidth={2} />
                <h4 className="text-[10.5px] font-semibold tracking-[0.18em] uppercase text-black/65">{section.title}</h4>
              </div>
              {section.items.length > 0 ? (
                <dl className="divide-y divide-black/[0.05]">
                  {section.items.map((item, j) => {
                    const colonIdx = item.indexOf(':');
                    const hasColon = colonIdx > 0 && colonIdx < 40;
                    const label = hasColon ? item.slice(0, colonIdx).trim() : null;
                    const value = hasColon ? item.slice(colonIdx + 1).trim() : item;
                    return (
                      <div key={j} className="flex items-start gap-2 px-4 py-[7px]">
                        {label && (
                          <dt className="text-[11px] text-black/40 min-w-[110px] shrink-0 leading-snug">{label}</dt>
                        )}
                        <dd className="text-[12px] text-black/80 font-medium leading-snug">{value}</dd>
                      </div>
                    );
                  })}
                </dl>
              ) : (
                <p className="px-4 py-3 text-[13px] text-black/65 leading-relaxed">{section.prose}</p>
              )}
            </div>
          );
        }

        if (section.type === 'material') {
          return (
            <div key={i} className="border border-black/8 bg-stone-50/80 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#2D5A27]/[0.07] border-b border-black/6">
                <Wrench className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" strokeWidth={2} />
                <h4 className="text-[10.5px] font-semibold tracking-[0.18em] uppercase text-black/65">{section.title}</h4>
              </div>
              <p className="px-4 py-3 text-[13px] text-black/65 leading-relaxed">
                {section.prose || section.items.join(' · ')}
              </p>
            </div>
          );
        }

        if (section.type === 'usage') {
          const chips = section.items.length > 0
            ? section.items
            : section.prose.split(/[,·]/).map(s => s.trim()).filter(Boolean);
          return (
            <div key={i} className="border border-black/8 bg-stone-50/80 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#2D5A27]/[0.07] border-b border-black/6">
                <Target className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" strokeWidth={2} />
                <h4 className="text-[10.5px] font-semibold tracking-[0.18em] uppercase text-black/65">{section.title}</h4>
              </div>
              <div className="px-4 py-3 flex flex-wrap gap-1.5">
                {chips.length > 0 ? chips.map((chip, j) => (
                  <span
                    key={j}
                    className="inline-flex items-center px-2.5 py-1 bg-[#2D5A27]/[0.07] text-[11px] text-[#2D5A27] font-semibold rounded-full border border-[#2D5A27]/20"
                  >
                    {chip}
                  </span>
                )) : (
                  <p className="text-[13px] text-black/65">{section.prose}</p>
                )}
              </div>
            </div>
          );
        }

        if (section.type === 'gift') {
          return (
            <div key={i} className="bg-[#2D5A27] overflow-hidden">
              <div className="flex items-start gap-3 px-4 py-4">
                <Gift className="w-5 h-5 text-white/70 shrink-0 mt-0.5" strokeWidth={1.75} />
                <div>
                  <h4 className="text-[10.5px] font-semibold tracking-[0.18em] uppercase text-white/60 mb-1">{section.title}</h4>
                  <p className="text-[13px] text-white/90 leading-relaxed">
                    {section.prose || section.items.join(' ')}
                  </p>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div key={i} className="border border-black/8 bg-stone-50/80 overflow-hidden">
            {section.title && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-black/[0.03] border-b border-black/6">
                <h4 className="text-[10.5px] font-semibold tracking-[0.18em] uppercase text-black/65">{section.title}</h4>
              </div>
            )}
            <p className="px-4 py-3 text-[13px] text-black/65 leading-relaxed">{section.prose || section.items.join(', ')}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ProductDetail() {
  const params = useParams<{ slug: string }>();
  const reduceMotion = useReducedMotion();

  const { data: product, isLoading } = useProduct(params.slug || '');
  const { data: allProducts = [] } = useProducts({});
  const { data: categories = [] } = useCategories();

  const { addToCart } = useCart();
  const { showModal } = useCartModal();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: reviews = [] } = useProductReviews(product?.id || '');
  const { data: ratingData } = useProductRating(product?.id || '');
  const { data: userReview } = useUserReview(product?.id || '');
  const createReviewMutation = useCreateReview();

  const { data: favoriteIds = [] } = useFavoriteIds();
  const { toggleFavorite, isLoading: isFavoriteLoading } = useToggleFavorite();
  const isLiked = product ? favoriteIds.includes(product.id) : false;

  // --- UI state ---
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);
  const [showMobileCta, setShowMobileCta] = useState(false);

  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [reviewGuestName, setReviewGuestName] = useState('');
  const [reviewGuestEmail, setReviewGuestEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const { data: captchaConfig } = useQuery({
    queryKey: ['/api/config/captcha'],
    queryFn: async () => {
      const res = await fetch('/api/config/captcha');
      if (!res.ok) return { provider: 'turnstile', siteKey: '' };
      return res.json() as Promise<{ provider: string; siteKey: string }>;
    },
    staleTime: 5 * 60 * 1000,
  });
  const turnstileSiteKey = captchaConfig?.siteKey || '';

  // Refs
  const ctaSentinelRef = useRef<HTMLDivElement | null>(null);
  const heroImageRef = useRef<HTMLDivElement | null>(null);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [lightboxEmblaRef, lightboxEmblaApi] = useEmblaCarousel({ loop: true });

  // Sync mobile carousel <-> selectedImage
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedImage(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (emblaApi && emblaApi.selectedScrollSnap() !== selectedImage) {
      emblaApi.scrollTo(selectedImage);
    }
  }, [selectedImage, emblaApi]);

  // Lightbox carousel sync
  const onLightboxSelect = useCallback(() => {
    if (!lightboxEmblaApi) return;
    setSelectedImage(lightboxEmblaApi.selectedScrollSnap());
  }, [lightboxEmblaApi]);

  useEffect(() => {
    if (!lightboxEmblaApi) return;
    lightboxEmblaApi.on('select', onLightboxSelect);
    return () => {
      lightboxEmblaApi.off('select', onLightboxSelect);
    };
  }, [lightboxEmblaApi, onLightboxSelect]);

  useEffect(() => {
    if (lightboxEmblaApi && lightboxOpen) {
      lightboxEmblaApi.scrollTo(selectedImage, true);
    }
  }, [lightboxOpen, selectedImage, lightboxEmblaApi]);

  // Lightbox keyboard — uses the rendered `images` array (which always has
  // at least the placeholder fallback) and no-ops navigation when there is
  // only a single image.
  const renderedImages =
    product?.images && product.images.length > 0
      ? product.images
      : product
        ? ['https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=800&fit=crop']
        : [];

  useEffect(() => {
    if (!lightboxOpen) return;
    const total = renderedImages.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxOpen(false);
        return;
      }
      if (total <= 1) return;
      if (e.key === 'ArrowLeft') setSelectedImage((p) => (p <= 0 ? total - 1 : p - 1));
      if (e.key === 'ArrowRight') setSelectedImage((p) => (p >= total - 1 ? 0 : p + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, renderedImages.length]);

  // Body scroll lock when lightbox open
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [lightboxOpen]);

  // Mobile sticky CTA visibility (sentinel placed below desktop CTA)
  useEffect(() => {
    const node = ctaSentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowMobileCta(!entry.isIntersecting),
      { rootMargin: '0px 0px -100px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [product?.id]);

  // Reset image index on product change
  useEffect(() => {
    setSelectedImage(0);
    setQuantity(1);
    setShowFullDesc(false);
  }, [product?.id]);

  const handleHeroMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroImageRef.current || reduceMotion) return;
    const rect = heroImageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  const handleAddToCart = async () => {
    if (!product) return;
    setIsAdding(true);
    try {
      // Her ölçü/varyant artık ayrı ürün. Yine de legacy varyantlı ürünler
      // için: ilk aktif varyant id'sini geçir; varyant yoksa undefined.
      const variant = product.variants?.find((v) => v.isActive);
      await addToCart(product.id, variant?.id, quantity);
      const mainImage =
        product.images && product.images.length > 0
          ? product.images[0]
          : 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=800&fit=crop';
      showModal({
        name: product.name,
        image: mainImage,
        price: parseFloat(product.basePrice || '0') * quantity,
        quantity,
      });
    } catch (err) {
      toast({ title: 'Hata', description: 'Sepete eklenemedi.', variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };

  const resetTurnstile = useCallback(() => {
    setCaptchaToken(null);
    const ts = window.turnstile;
    if (ts && turnstileWidgetIdRef.current) {
      try {
        ts.reset(turnstileWidgetIdRef.current);
      } catch (err) {
        console.warn('[Turnstile] reset failed:', err);
      }
    }
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (!user) {
      const trimmedName = reviewGuestName.trim();
      const trimmedEmail = reviewGuestEmail.trim();
      if (trimmedName.length < 2) {
        toast({ title: 'Eksik bilgi', description: 'Lütfen adınızı yazın.', variant: 'destructive' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        toast({ title: 'Eksik bilgi', description: 'Lütfen geçerli bir e-posta girin.', variant: 'destructive' });
        return;
      }
      if (turnstileSiteKey && !captchaToken) {
        toast({ title: 'Doğrulama gerekli', description: 'Lütfen güvenlik doğrulamasını tamamlayın.', variant: 'destructive' });
        return;
      }
    }

    try {
      await createReviewMutation.mutateAsync({
        productId: product.id,
        rating: reviewRating,
        title: reviewTitle || undefined,
        content: reviewContent || undefined,
        guestName: !user ? reviewGuestName.trim() : undefined,
        guestEmail: !user ? reviewGuestEmail.trim() : undefined,
        captchaToken: !user ? captchaToken || undefined : undefined,
      });
      toast({
        title: 'Yorumunuz alındı',
        description: 'Onay sonrası ürün sayfasında görünecektir.',
      });
      setReviewTitle('');
      setReviewContent('');
      setReviewRating(5);
      setReviewGuestName('');
      setReviewGuestEmail('');
      setReviewSubmitted(true);
      resetTurnstile();
    } catch (err: any) {
      toast({
        title: 'Hata',
        description: err?.message || 'Değerlendirme gönderilemedi.',
        variant: 'destructive',
      });
      resetTurnstile();
    }
  };

  // Turnstile widget'ını misafir formu görünür olduğunda başlat
  useEffect(() => {
    if (user || userReview || reviewSubmitted) return;
    if (!turnstileSiteKey) return;
    const node = turnstileContainerRef.current;
    if (!node) return;

    let cancelled = false;
    let pollId: number | undefined;

    const tryRender = () => {
      const ts = window.turnstile;
      if (cancelled) return;
      if (!ts || typeof ts.render !== 'function') {
        pollId = window.setTimeout(tryRender, 250);
        return;
      }
      if (turnstileWidgetIdRef.current) return;
      try {
        const id = ts.render(node, {
          sitekey: turnstileSiteKey,
          callback: (token: string) => setCaptchaToken(token),
          'expired-callback': () => setCaptchaToken(null),
          'error-callback': () => setCaptchaToken(null),
          theme: 'light',
        });
        turnstileWidgetIdRef.current = id;
      } catch (err) {
        console.warn('[Turnstile] render failed:', err);
      }
    };

    tryRender();

    return () => {
      cancelled = true;
      if (pollId) clearTimeout(pollId);
      const ts = window.turnstile;
      if (ts && turnstileWidgetIdRef.current) {
        try {
          ts.remove(turnstileWidgetIdRef.current);
        } catch (err) {
          console.warn('[Turnstile] remove failed:', err);
        }
        turnstileWidgetIdRef.current = null;
      }
    };
  }, [user, userReview, reviewSubmitted, turnstileSiteKey]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="pt-24 pb-20 px-6">
          <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="w-10 h-10 text-black/25 animate-spin" />
            <p className="mt-4 text-sm text-black/40">Ürün yükleniyor...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="pt-24 pb-20 px-6">
          <div className="max-w-7xl mx-auto text-center min-h-[60vh] flex flex-col items-center justify-center">
            <div className="w-24 h-24 border border-black/8 flex items-center justify-center mb-6">
              <Package className="w-12 h-12 text-black/20" />
            </div>
            <h1 className="font-display text-3xl mb-4 text-black">Ürün Bulunamadı</h1>
            <p className="text-black/40 mb-8">
              Aradığınız ürün mevcut değil veya kaldırılmış olabilir.
            </p>
            <Link href="/">
              <span className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-semibold hover:bg-polen-orange transition-colors text-xs tracking-[0.18em] uppercase">
                Ana Sayfaya Dön
              </span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const images = renderedImages;

  const price = parseFloat(product.basePrice || '0');
  const originalPrice = getOriginalPrice(price, product.discountBadge);
  const category = categories.find((c) => c.id === product.categoryId);

  const totalStock = product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) ?? 0;
  const isOutOfStock =
    !!product.variants && product.variants.length > 0 && totalStock === 0;

  // Benzer ürünler
  const sameCategory = allProducts.filter(
    (p) => p.id !== product.id && p.categoryId === product.categoryId,
  );
  const fillers = allProducts.filter(
    (p) => p.id !== product.id && p.categoryId !== product.categoryId,
  );
  const moreProducts = [...sameCategory, ...fillers].slice(0, 4);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `${product.name} - Sepetzen`;
  const socialLinks = [
    {
      name: 'WhatsApp',
      url: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
    },
    {
      name: 'X (Twitter)',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        shareText,
      )}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'Facebook',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
  ];
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Bağlantı kopyalandı' });
    } catch {
      toast({ title: 'Kopyalanamadı', variant: 'destructive' });
    }
    setShowShareMenu(false);
  };

  const fadeUp = reduceMotion
    ? { initial: false, animate: false }
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <SEO
        title={product.name}
        description={
          product.description?.replace(/<[^>]*>/g, '').slice(0, 160) ||
          `${product.name}. Sepetzen kamp, outdoor ve bıçak koleksiyonundan.`
        }
        image={images[0]}
        url={`/urun/${product.slug}`}
        type="product"
        product={{
          name: product.name,
          price,
          currency: 'TRY',
          availability: isOutOfStock ? 'OutOfStock' : 'InStock',
          sku: product.sku || undefined,
          brand: 'Sepetzen',
          category: category?.name,
          images,
        }}
        breadcrumbs={[
          { name: 'Ana Sayfa', url: '/' },
          ...(category ? [{ name: category.name, url: `/kategori/${category.slug}` }] : []),
          { name: product.name, url: `/urun/${product.slug}` },
        ]}
      />

      <Header />

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
            data-testid="lightbox"
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute top-5 right-5 w-11 h-11 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-20"
              aria-label="Kapat"
              data-testid="button-lightbox-close"
            >
              <X className="w-5 h-5" />
            </button>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage((p) => (p === 0 ? images.length - 1 : p - 1));
                  }}
                  className="hidden sm:flex absolute left-6 w-12 h-12 items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-20"
                  aria-label="Önceki görsel"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage((p) => (p === images.length - 1 ? 0 : p + 1));
                  }}
                  className="hidden sm:flex absolute right-6 w-12 h-12 items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-20"
                  aria-label="Sonraki görsel"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Desktop single image */}
            <div className="hidden sm:flex w-full h-full items-center justify-center">
              <motion.img
                key={selectedImage}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                src={images[selectedImage]}
                alt={product.name}
                className="max-w-[90vw] max-h-[90vh] object-contain select-none"
                onClick={(e) => e.stopPropagation()}
                draggable={false}
              />
            </div>

            {/* Mobile swipe */}
            <div
              className="sm:hidden w-full h-full flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full overflow-hidden" ref={lightboxEmblaRef}>
                <div className="flex">
                  {images.map((img, i) => (
                    <div
                      key={i}
                      className="flex-[0_0_100%] min-w-0 flex items-center justify-center px-4"
                    >
                      <img
                        src={img}
                        alt={product.name}
                        className="max-w-full max-h-[80vh] object-contain"
                        draggable={false}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {images.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(i);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      i === selectedImage ? 'bg-white w-6' : 'bg-white/30 w-1.5'
                    }`}
                    aria-label={`Görsel ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-20 lg:pt-12 pb-32 lg:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[11px] text-black/45 mb-8 font-mono tracking-[0.18em] uppercase">
            <Link href="/" className="hover:text-black transition-colors">
              Ana Sayfa
            </Link>
            {category && (
              <>
                <ChevronRight className="w-3 h-3 text-black/25" />
                <Link
                  href={`/kategori/${category.slug}`}
                  className="hover:text-black transition-colors"
                >
                  {category.name}
                </Link>
              </>
            )}
            <ChevronRight className="w-3 h-3 text-black/25" />
            <span className="text-black truncate max-w-[280px] normal-case font-sans tracking-normal text-xs">
              {product.name}
            </span>
          </nav>

          {/* Main two-column grid */}
          <div className="grid lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_480px] gap-8 lg:gap-16">
            {/* LEFT — Gallery */}
            <motion.div {...fadeUp} className="flex flex-col lg:flex-row gap-4 lg:gap-5">
              {/* Desktop thumbnail rail */}
              {images.length > 1 && (
                <div className="hidden lg:flex flex-col gap-3 w-20 shrink-0">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(i)}
                      className={`relative aspect-square overflow-hidden bg-stone-100 transition-all ${
                        i === selectedImage
                          ? 'ring-2 ring-[#2D5A27] opacity-100'
                          : 'opacity-45 hover:opacity-90'
                      }`}
                      data-testid={`button-thumbnail-${i}`}
                      aria-label={`Görsel ${i + 1}`}
                    >
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Hero image */}
              <div className="flex-1 min-w-0">
                {/* Desktop hero with hover-zoom */}
                <div className="hidden sm:block">
                  <div
                    ref={heroImageRef}
                    className="relative aspect-[4/5] bg-stone-100 overflow-hidden cursor-zoom-in group"
                    onMouseEnter={() => setIsZooming(true)}
                    onMouseLeave={() => setIsZooming(false)}
                    onMouseMove={handleHeroMove}
                    onClick={() => setLightboxOpen(true)}
                    data-testid="img-product-main"
                  >
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={selectedImage}
                        src={images[selectedImage]}
                        alt={product.name}
                        className="absolute inset-0 w-full h-full object-cover will-change-transform"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.2 }}
                        style={{
                          transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                          transform: isZooming && !reduceMotion ? 'scale(1.6)' : 'scale(1)',
                          transition: 'transform 0.45s cubic-bezier(0.22,1,0.36,1)',
                        }}
                        draggable={false}
                      />
                    </AnimatePresence>

                    {/* Badges */}
                    {product.discountBadge && (
                      <span className="absolute top-4 left-4 z-10 bg-black text-white text-[10px] font-bold tracking-[0.2em] px-3 py-1.5 uppercase">
                        {product.discountBadge}
                      </span>
                    )}
                    {product.isNew && !product.discountBadge && (
                      <span className="absolute top-4 left-4 z-10 bg-black text-white text-[10px] font-bold tracking-[0.2em] px-3 py-1.5 uppercase">
                        Yeni
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile carousel */}
                <div className="sm:hidden -mx-4">
                  <div
                    className="relative aspect-square bg-stone-100 overflow-hidden"
                    ref={emblaRef}
                  >
                    <div className="flex h-full">
                      {images.map((img, i) => (
                        <button
                          type="button"
                          key={i}
                          className="flex-[0_0_100%] min-w-0 h-full"
                          onClick={() => setLightboxOpen(true)}
                          aria-label={`Görsel ${i + 1} — büyüt`}
                        >
                          <img
                            src={img}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                        </button>
                      ))}
                    </div>

                    {product.discountBadge && (
                      <span className="absolute top-4 left-4 z-10 bg-black text-white text-[10px] font-bold tracking-[0.2em] px-3 py-1.5 uppercase">
                        {product.discountBadge}
                      </span>
                    )}
                    {product.isNew && !product.discountBadge && (
                      <span className="absolute top-4 left-4 z-10 bg-black text-white text-[10px] font-bold tracking-[0.2em] px-3 py-1.5 uppercase">
                        Yeni
                      </span>
                    )}
                  </div>

                  {/* Mobile dot indicator */}
                  {images.length > 1 && (
                    <div className="flex justify-center gap-1.5 mt-4">
                      {images.map((_, i) => (
                        <button
                          type="button"
                          key={i}
                          onClick={() => setSelectedImage(i)}
                          className={`h-1.5 rounded-full transition-all ${
                            i === selectedImage ? 'bg-[#2D5A27] w-6' : 'bg-black/20 w-1.5'
                          }`}
                          aria-label={`Görsel ${i + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* RIGHT — Sticky info column */}
            <motion.aside
              {...fadeUp}
              className="lg:sticky lg:top-28 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1"
            >
              {/* Category eyebrow */}
              {category && (
                <Link href={`/kategori/${category.slug}`}>
                  <span className="inline-block text-[10px] text-[#2D5A27] uppercase tracking-[0.3em] mb-4 hover:underline">
                    {category.name}
                  </span>
                </Link>
              )}

              {/* Title */}
              <h1
                className="font-display text-3xl sm:text-4xl tracking-wide text-black leading-[1.1] mb-3"
                data-testid="text-product-name"
              >
                {product.name}
              </h1>

              {/* Rating preview */}
              {ratingData && ratingData.count > 0 && (
                <div className="flex items-center gap-2 mb-5">
                  <StarRating rating={Math.round(ratingData.average)} size={14} />
                  <span className="text-xs text-black/45">
                    {ratingData.average.toFixed(1)} · {ratingData.count} değerlendirme
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-6 pb-6 border-b border-black/8">
                {originalPrice && (
                  <span
                    className="text-base text-black/35 line-through"
                    data-testid="text-original-price"
                  >
                    {originalPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                  </span>
                )}
                <span
                  className="font-display text-4xl text-[#2D5A27] tabular-nums"
                  data-testid="text-product-price"
                >
                  {price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                </span>
              </div>

              {/* Description sections */}
              {product.description && (
                <div className="mb-6">
                  <ProductDescriptionSections html={product.description} />
                </div>
              )}

              {/* Quantity + Add to cart */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-black/15">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-11 h-11 flex items-center justify-center hover:bg-black/5 transition-colors text-black"
                      aria-label="Azalt"
                      data-testid="button-decrease-quantity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span
                      className="w-10 text-center text-sm font-medium text-black tabular-nums"
                      data-testid="text-quantity"
                    >
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="w-11 h-11 flex items-center justify-center hover:bg-black/5 transition-colors text-black"
                      aria-label="Artır"
                      data-testid="button-increase-quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <ShippingCountdown />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isAdding || isOutOfStock}
                    className={`group flex-1 h-12 font-semibold text-xs uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2 ${
                      isOutOfStock
                        ? 'bg-black/8 text-black/35 cursor-not-allowed'
                        : 'bg-black hover:bg-[#2D5A27] text-white'
                    } disabled:cursor-not-allowed`}
                    data-testid="button-add-to-cart"
                  >
                    {isAdding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>{isOutOfStock ? 'Tükendi' : 'Sepete Ekle'}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      product && !isFavoriteLoading && toggleFavorite(product.id, isLiked)
                    }
                    disabled={isFavoriteLoading}
                    className={`w-12 h-12 border flex items-center justify-center transition-colors ${
                      isLiked
                        ? 'bg-[#2D5A27] border-[#2D5A27] text-white'
                        : 'border-black/15 hover:border-black text-black'
                    } ${isFavoriteLoading ? 'opacity-50' : ''}`}
                    aria-label="Favorilere ekle"
                    data-testid="button-like"
                  >
                    {isFavoriteLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    )}
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowShareMenu((v) => !v)}
                      className={`w-12 h-12 border flex items-center justify-center transition-colors ${
                        showShareMenu
                          ? 'bg-polen-orange border-polen-orange text-white'
                          : 'border-black/15 hover:border-black text-black'
                      }`}
                      aria-label="Paylaş"
                      data-testid="button-share"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {showShareMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          className="absolute bottom-full right-0 mb-2 bg-white border border-black/10 shadow-xl min-w-[180px] z-30"
                        >
                          {socialLinks.map((s) => (
                            <a
                              key={s.name}
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setShowShareMenu(false)}
                              className="block px-4 py-2.5 text-sm text-black hover:bg-black/5 hover:text-polen-orange transition-colors"
                            >
                              {s.name}
                            </a>
                          ))}
                          <button
                            type="button"
                            onClick={copyLink}
                            className="w-full text-left px-4 py-2.5 text-sm text-black hover:bg-black/5 hover:text-polen-orange transition-colors flex items-center gap-2 border-t border-black/8"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Bağlantıyı Kopyala
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* WhatsApp order link */}
              {!isOutOfStock && (
                <a
                  href={`https://wa.me/905366301138?text=${encodeURIComponent(`Merhaba, "${product.name}" ürününü sipariş vermek istiyorum. ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 w-full h-11 border border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/8 transition-colors text-[11px] font-semibold tracking-[0.18em] uppercase mb-4"
                  data-testid="link-whatsapp-order"
                >
                  <MessageCircle className="w-4 h-4" strokeWidth={2} />
                  WhatsApp ile Sipariş Ver
                </a>
              )}

              {/* Sentinel — when this leaves viewport, show mobile sticky CTA */}
              <div ref={ctaSentinelRef} aria-hidden="true" className="h-px" />

              {/* Trust strip */}
              <div className="grid grid-cols-3 gap-3 py-5 border-t border-b border-black/8 mb-6">
                {[
                  { icon: Truck, title: 'Ücretsiz Kargo', sub: '1.500 ₺ üzeri' },
                  { icon: RotateCcw, title: 'Kolay İade', sub: '14 gün içinde' },
                  { icon: Shield, title: 'Güvenli Ödeme', sub: 'SSL korumalı' },
                ].map((it) => (
                  <div key={it.title} className="text-center">
                    <div className="w-9 h-9 mx-auto mb-2 bg-[#2D5A27]/[0.07] border border-[#2D5A27]/15 flex items-center justify-center">
                      <it.icon className="w-4 h-4 text-[#2D5A27]" />
                    </div>
                    <p className="text-[11px] font-semibold text-black leading-tight">
                      {it.title}
                    </p>
                    <p className="text-[10px] text-black/40">{it.sub}</p>
                  </div>
                ))}
              </div>

              {/* SKU */}
              {product.sku && (
                <p
                  className="text-[11px] text-black/40 font-mono tracking-[0.12em] uppercase"
                  data-testid="text-sku"
                >
                  Stok Kodu: <span className="text-black/70">{product.sku}</span>
                </p>
              )}
            </motion.aside>
          </div>

          {/* Reviews */}
          <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: 30 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
            className="mt-20 lg:mt-28"
          >
            <div className="flex items-end justify-between mb-8 border-b border-black/8 pb-4">
              <h2 className="font-display text-2xl sm:text-3xl tracking-wide text-black">
                Değerlendirmeler
              </h2>
              {ratingData && ratingData.count > 0 && (
                <div className="flex items-center gap-2">
                  <StarRating rating={Math.round(ratingData.average)} size={16} />
                  <span className="text-sm text-black/50">
                    {ratingData.average.toFixed(1)} · {ratingData.count}
                  </span>
                </div>
              )}
            </div>

            {reviewSubmitted && !userReview && (
              <div className="bg-emerald-50 border border-emerald-200 p-6 mb-8 text-center" data-testid="text-review-pending">
                <Check className="w-6 h-6 mx-auto mb-2 text-emerald-700" />
                <p className="text-emerald-900 font-semibold">
                  Yorumunuz alındı.
                </p>
                <p className="text-emerald-800/80 text-sm mt-1">
                  Onay sonrası ürün sayfasında görünecektir. Teşekkür ederiz.
                </p>
              </div>
            )}

            {!userReview && !reviewSubmitted && (
              <div className="bg-stone-50 border border-black/8 p-6 mb-8">
                <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
                  <h3 className="font-semibold text-black">Değerlendirme Yaz</h3>
                  {!user && (
                    <p className="text-[11px] text-black/55">
                      Üye misin?{' '}
                      <Link href="/giris">
                        <span className="underline hover:text-polen-orange cursor-pointer">
                          Giriş yap
                        </span>
                      </Link>
                    </p>
                  )}
                </div>
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-xs text-black/45 mb-2 uppercase tracking-wider">
                      Puanınız
                    </label>
                    <StarRating
                      rating={reviewRating}
                      size={26}
                      interactive
                      onChange={setReviewRating}
                    />
                  </div>

                  {!user && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Adınız *"
                        value={reviewGuestName}
                        onChange={(e) => setReviewGuestName(e.target.value)}
                        maxLength={100}
                        className="w-full px-4 py-3 bg-white border border-black/12 text-black placeholder:text-black/30 focus:outline-none focus:border-black transition-colors"
                        data-testid="input-review-guest-name"
                      />
                      <input
                        type="email"
                        required
                        placeholder="E-posta *"
                        value={reviewGuestEmail}
                        onChange={(e) => setReviewGuestEmail(e.target.value)}
                        maxLength={200}
                        className="w-full px-4 py-3 bg-white border border-black/12 text-black placeholder:text-black/30 focus:outline-none focus:border-black transition-colors"
                        data-testid="input-review-guest-email"
                      />
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder="Başlık (isteğe bağlı)"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    maxLength={200}
                    className="w-full px-4 py-3 bg-white border border-black/12 text-black placeholder:text-black/30 focus:outline-none focus:border-black transition-colors"
                    data-testid="input-review-title"
                  />
                  <textarea
                    placeholder="Yorumunuz (isteğe bağlı)"
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    rows={3}
                    maxLength={4000}
                    className="w-full px-4 py-3 bg-white border border-black/12 text-black placeholder:text-black/30 focus:outline-none focus:border-black transition-colors resize-none"
                    data-testid="input-review-content"
                  />

                  {!user && turnstileSiteKey && (
                    <div ref={turnstileContainerRef} data-testid="turnstile-container" className="min-h-[65px]" />
                  )}

                  {!user && (
                    <p className="text-[11px] text-black/45 leading-relaxed">
                      E-postanız sadece yorum doğrulama için kullanılır, yayınlanmaz.
                      Yorumlar yayınlanmadan önce yönetici onayından geçer.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={createReviewMutation.isPending}
                    className="px-6 py-3 bg-black text-white font-semibold hover:bg-polen-orange transition-colors disabled:opacity-50 flex items-center gap-2 text-xs tracking-[0.18em] uppercase"
                    data-testid="button-submit-review"
                  >
                    {createReviewMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Gönder
                  </button>
                </form>
              </div>
            )}

            {userReview && (
              <div className="bg-stone-50 border border-black/8 p-6 mb-8">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <StarRating rating={userReview.rating} size={14} />
                  {userReview.isApproved ? (
                    <span className="text-xs text-emerald-700 font-medium uppercase tracking-wider">
                      <Check className="inline w-3 h-3 mr-0.5" />
                      Değerlendirmeniz
                    </span>
                  ) : userReview.rejectionReason ? (
                    <span className="text-xs text-red-700 font-medium uppercase tracking-wider px-2 py-0.5 bg-red-50 border border-red-200 rounded">
                      Onaylanmadı
                    </span>
                  ) : (
                    <span className="text-xs text-amber-700 font-medium uppercase tracking-wider px-2 py-0.5 bg-amber-50 border border-amber-200 rounded">
                      Onay Bekliyor
                    </span>
                  )}
                </div>
                {userReview.title && (
                  <h4 className="font-semibold text-black">{userReview.title}</h4>
                )}
                {userReview.content && (
                  <p className="text-black/55 mt-1 text-sm">{userReview.content}</p>
                )}
                {!userReview.isApproved && !userReview.rejectionReason && (
                  <p className="text-[12px] text-amber-700 mt-3 leading-snug">
                    Yorumunuz yönetici onayından sonra ürün sayfasında görünecek.
                  </p>
                )}
                {userReview.rejectionReason && (
                  <div className="mt-3 text-[12px] text-red-700 bg-red-50 border border-red-100 rounded p-2">
                    <strong>Reddetme nedeni:</strong> {userReview.rejectionReason}
                  </div>
                )}
              </div>
            )}

            {reviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews
                  .filter((r) => r.id !== userReview?.id)
                  .map((review) => {
                    const mask = (n?: string | null) =>
                      !n ? '***' : n.slice(0, 2) + '***';
                    return (
                      <div
                        key={review.id}
                        className="bg-stone-50 border border-black/8 p-5"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-9 h-9 bg-black/8 flex items-center justify-center text-sm font-bold text-black">
                            {review.user.firstName?.charAt(0)?.toUpperCase() || 'A'}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-black">
                              {mask(review.user.firstName)} {mask(review.user.lastName)}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <StarRating rating={review.rating} size={11} />
                              <span className="text-xs text-black/40">
                                {new Date(review.createdAt).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                          </div>
                        </div>
                        {review.title && (
                          <h4 className="font-semibold text-sm text-black">{review.title}</h4>
                        )}
                        {review.content && (
                          <p className="text-black/55 text-sm mt-2 leading-relaxed">
                            {review.content}
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              !userReview && (
                <div className="text-center py-12">
                  <Star className="w-10 h-10 mx-auto mb-3 text-black/15" />
                  <p className="text-black/45">
                    Henüz değerlendirme yok. İlk değerlendirmeyi siz yapın.
                  </p>
                </div>
              )
            )}
          </motion.section>

          {/* Related products */}
          {moreProducts.length > 0 && (
            <motion.section
              initial={reduceMotion ? false : { opacity: 0, y: 30 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.5 }}
              className="mt-20 lg:mt-28"
            >
              <div className="flex items-end justify-between mb-8 border-b border-black/8 pb-4">
                <h2 className="font-display text-2xl sm:text-3xl tracking-wide text-black">
                  Beğenebileceğiniz Ürünler
                </h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6">
                {moreProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </motion.section>
          )}
        </div>
      </main>

      <Footer />

      {/* Mobile sticky add-to-cart bar */}
      <AnimatePresence>
        {showMobileCta && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            className="lg:hidden fixed inset-x-0 z-[90] bg-white border-t border-black/10 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] px-4 py-3 flex items-center gap-3"
            style={{ bottom: 'var(--mobile-nav-total, 58px)' }}
            data-testid="mobile-sticky-cta"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-black/45 leading-tight">
                {product.name}
              </p>
              <p className="font-display text-lg text-black tabular-nums leading-tight">
                {price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isAdding || isOutOfStock}
              className={`h-11 px-5 font-semibold text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 ${
                isOutOfStock
                  ? 'bg-black/8 text-black/35 cursor-not-allowed'
                  : 'bg-[#2D5A27] text-white hover:bg-[#234a1e]'
              }`}
              data-testid="button-add-to-cart-mobile"
            >
              {isAdding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>{isOutOfStock ? 'Tükendi' : 'Sepete Ekle'}</span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
