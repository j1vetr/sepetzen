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
} from 'lucide-react';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

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

// ─── Star Rating ─────────────────────────────────────────────────────────────

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

// ─── Description Parser ───────────────────────────────────────────────────────

interface DescSection {
  emoji: string;
  title: string;
  type: 'specs' | 'material' | 'usage' | 'gift' | 'generic';
  items: string[];
  prose: string;
  bodyHtml: string;
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

  const headingRe = /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi;
  const hMatches = [...html.matchAll(headingRe)];
  if (hMatches.length > 0) {
    return hMatches.map((m, i) => {
      const end = m.index! + m[0].length;
      const nextStart = hMatches[i + 1]?.index ?? html.length;
      const bodyHtml = html.slice(end, nextStart);
      const text = m[1].replace(/<[^>]+>/g, '').trim();
      const emoji = SECTION_EMOJIS.find((e) => text.includes(e)) ?? '';
      const title = text.replace(/^[^\p{L}\p{N}]+/u, '').trim() || text;
      const items = [...bodyHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
        .map((lm) => lm[1].replace(/<[^>]+>/g, '').trim())
        .filter(Boolean);
      const prose = [...bodyHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
        .map((pm) => pm[1].replace(/<[^>]+>/g, '').trim())
        .filter(Boolean)
        .join(' ');
      return { emoji, title, type: emojiToType(emoji, title), items, prose, bodyHtml };
    });
  }

  if (typeof window === 'undefined') return [];

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const sectionHeaders: { emoji: SectionEmoji; title: string; container: Element }[] = [];

  doc.body.querySelectorAll('span').forEach((span) => {
    const txt = span.textContent?.trim() ?? '';
    const emoji = SECTION_EMOJIS.find((e) => txt === e);
    if (!emoji) return;
    const titleSpan = span.nextElementSibling;
    const title = titleSpan?.textContent?.trim() ?? '';
    const flexDiv = span.parentElement;
    const container = flexDiv?.parentElement;
    if (container) sectionHeaders.push({ emoji, title, container });
  });

  if (sectionHeaders.length === 0) return [];

  return sectionHeaders.map(({ emoji, title, container }) => {
    const clone = container.cloneNode(true) as Element;
    const flexDiv = clone.querySelector('[style*="display:flex"]');
    flexDiv?.remove();
    const items = [...clone.querySelectorAll('li')]
      .map((li) => li.textContent?.trim() ?? '')
      .filter(Boolean);
    const prose = [...clone.querySelectorAll('p')]
      .map((p) => p.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
    return { emoji, title, type: emojiToType(emoji, title), items, prose, bodyHtml: clone.innerHTML };
  });
}

// ─── Description Render ───────────────────────────────────────────────────────

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

  const specs = sections.find((s) => s.type === 'specs');
  const material = sections.find((s) => s.type === 'material');
  const usage = sections.find((s) => s.type === 'usage');
  const gift = sections.find((s) => s.type === 'gift');
  const generics = sections.filter((s) => s.type === 'generic');

  return (
    <div className="space-y-6">
      {/* Specs + Material side by side */}
      {(specs || material) && (
        <div className="grid md:grid-cols-2 gap-5">
          {/* Teknik Özellikler */}
          {specs && (
            <div>
              <h3 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-black/35 mb-4">
                {specs.title || 'Teknik Özellikler'}
              </h3>
              {specs.items.length > 0 ? (
                <dl className="space-y-0">
                  {specs.items.map((item, j) => {
                    const colonIdx = item.indexOf(':');
                    const hasColon = colonIdx > 0 && colonIdx < 60;
                    const label = hasColon ? item.slice(0, colonIdx).trim() : null;
                    const value = hasColon ? item.slice(colonIdx + 1).trim() : item;
                    return (
                      <div
                        key={j}
                        className="flex items-baseline justify-between py-2.5 border-b border-black/[0.06] gap-4"
                      >
                        <dt className="text-[12px] text-black/45 shrink-0">
                          {label ?? <span className="text-black/20">-</span>}
                        </dt>
                        <dd className="text-[13px] text-black/80 font-medium text-right">{value}</dd>
                      </div>
                    );
                  })}
                </dl>
              ) : (
                <p className="text-[13px] text-black/60 leading-relaxed">{specs.prose}</p>
              )}
            </div>
          )}

          {/* Materyal */}
          {material && (
            <div>
              <h3 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-black/35 mb-4">
                {material.title || 'Materyal'}
              </h3>
              <p className="text-[14px] text-black/65 leading-[1.75]">
                {material.prose || material.items.join(' · ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Kullanım Alanları */}
      {usage && (
        <div>
          <h3 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-black/35 mb-4">
            {usage.title || 'Kullanım Alanları'}
          </h3>
          {usage.items.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {usage.items.map((chip, j) => (
                <span
                  key={j}
                  className="px-3 py-1.5 border border-[#2D5A27]/20 text-[12px] text-[#2D5A27] font-medium"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-black/65 leading-[1.75]">{usage.prose}</p>
          )}
        </div>
      )}

      {/* Hediye */}
      {gift && (
        <div className="border-l-2 border-[#2D5A27] pl-5 py-1">
          <h3 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-[#2D5A27]/60 mb-2">
            {gift.title || 'Hediye'}
          </h3>
          <p className="text-[14px] text-black/70 leading-[1.75]">
            {gift.prose || gift.items.join(' ')}
          </p>
        </div>
      )}

      {/* Generic sections */}
      {generics.map((section, i) => (
        <div key={i}>
          {section.title && (
            <h3 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-black/35 mb-4">
              {section.title}
            </h3>
          )}
          <p className="text-[14px] text-black/65 leading-[1.75]">
            {section.prose || section.items.join(', ')}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Feature Highlights Strip ─────────────────────────────────────────────────

function ProductFeatureHighlights({ html }: { html: string }) {
  const sections = useMemo(() => parseProductSections(html), [html]);
  if (sections.length === 0) return null;
  const highlights = sections.slice(0, 4);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-b border-black/8">
      {highlights.map((sec, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 px-5 py-5 ${i < highlights.length - 1 ? 'border-r border-black/8' : ''}`}
        >
          <span className="text-xl leading-none shrink-0 mt-0.5">{sec.emoji || '✦'}</span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-black leading-tight mb-1">{sec.title}</p>
            <p className="text-[11.5px] text-black/45 leading-snug line-clamp-2">
              {sec.items[0] || (sec.prose ? sec.prose.split(/[.!]/)[0] : '') || ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Product Tabs ──────────────────────────────────────────────────────────────

function ProductTabs({ html }: { html: string }) {
  const [active, setActive] = useState<'desc' | 'specs' | 'usage' | 'delivery' | 'faq'>('desc');
  const sections = useMemo(() => parseProductSections(html), [html]);

  const specs = sections.find((s) => s.type === 'specs');
  const material = sections.find((s) => s.type === 'material');
  const usage = sections.find((s) => s.type === 'usage');
  const gift = sections.find((s) => s.type === 'gift');
  const generics = sections.filter((s) => s.type === 'generic');

  const TABS = [
    { id: 'desc', label: 'Ürün Açıklaması' },
    { id: 'specs', label: 'Teknik Özellikler' },
    { id: 'usage', label: 'Kullanım Alanları' },
    { id: 'delivery', label: 'Teslimat ve İade' },
    { id: 'faq', label: 'Sık Sorulan Sorular' },
  ] as const;

  return (
    <div className="mt-8 border-t border-black/8">
      {/* Tab bar */}
      <div className="flex border-b border-black/8 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`px-4 lg:px-6 py-3.5 text-[11px] font-semibold tracking-[0.16em] uppercase whitespace-nowrap border-b-2 -mb-px transition-colors ${
              active === tab.id
                ? 'border-[#2D5A27] text-[#2D5A27]'
                : 'border-transparent text-black/40 hover:text-black/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="py-8">
        {/* ── Ürün Açıklaması ── */}
        {active === 'desc' && (
          <div className="space-y-6 max-w-2xl">
            {material && (
              <div>
                <h3 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-black/35 mb-4">
                  {material.title}
                </h3>
                <p className="text-[14px] text-black/65 leading-[1.75]">
                  {material.prose || material.items.join(' · ')}
                </p>
              </div>
            )}
            {gift && (
              <div className="border-l-2 border-[#2D5A27] pl-5 py-1">
                <h3 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-[#2D5A27]/60 mb-2">
                  {gift.title}
                </h3>
                <p className="text-[14px] text-black/70 leading-[1.75]">
                  {gift.prose || gift.items.join(' ')}
                </p>
              </div>
            )}
            {generics.map((s, i) => (
              <div key={i}>
                {s.title && (
                  <h3 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-black/35 mb-4">
                    {s.title}
                  </h3>
                )}
                <p className="text-[14px] text-black/65 leading-[1.75]">
                  {s.prose || s.items.join(', ')}
                </p>
              </div>
            ))}
            {!material && !gift && generics.length === 0 && (
              <p className="text-[13px] text-black/35 italic">Bu ürün için açıklama eklenmemiştir.</p>
            )}
          </div>
        )}

        {/* ── Teknik Özellikler ── */}
        {active === 'specs' && (
          <div>
            {specs ? (
              specs.items.length > 0 ? (
                <dl className="max-w-lg">
                  {specs.items.map((item, j) => {
                    const ci = item.indexOf(':');
                    const hasColon = ci > 0 && ci < 60;
                    const label = hasColon ? item.slice(0, ci).trim() : null;
                    const value = hasColon ? item.slice(ci + 1).trim() : item;
                    return (
                      <div
                        key={j}
                        className="flex items-baseline justify-between py-2.5 border-b border-black/[0.06] gap-4"
                      >
                        <dt className="text-[12px] text-black/45 shrink-0">{label ?? '-'}</dt>
                        <dd className="text-[13px] text-black/80 font-medium text-right">{value}</dd>
                      </div>
                    );
                  })}
                </dl>
              ) : (
                <p className="text-[14px] text-black/60 leading-relaxed">{specs.prose}</p>
              )
            ) : (
              <p className="text-[13px] text-black/35 italic">Teknik özellik bilgisi bulunmamaktadır.</p>
            )}
          </div>
        )}

        {/* ── Kullanım Alanları ── */}
        {active === 'usage' && (
          <div>
            {usage ? (
              usage.items.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {usage.items.map((chip, j) => (
                    <span
                      key={j}
                      className="px-3 py-1.5 border border-[#2D5A27]/20 text-[12px] text-[#2D5A27] font-medium"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[14px] text-black/65 leading-[1.75]">{usage.prose}</p>
              )
            ) : (
              <p className="text-[13px] text-black/35 italic">Kullanım alanı bilgisi bulunmamaktadır.</p>
            )}
          </div>
        )}

        {/* ── Teslimat ve İade ── */}
        {active === 'delivery' && (
          <div className="space-y-8 max-w-2xl">
            <div>
              <h3 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-black/35 mb-4">
                Kargo & Teslimat
              </h3>
              <dl>
                {[
                  ['Kargo Süresi', '1–3 iş günü'],
                  ['Ücretsiz Kargo', '1.500 ₺ ve üzeri siparişlerde'],
                  ['Kargo Firması', 'MNG Kargo / Yurtiçi Kargo'],
                  ['Aynı Gün Kargo', 'Hafta içi 14:00\'a kadar verilen siparişler'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between py-2.5 border-b border-black/[0.06] gap-4">
                    <dt className="text-[12px] text-black/45 shrink-0">{k}</dt>
                    <dd className="text-[13px] text-black/80 font-medium text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <h3 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-black/35 mb-4">
                İade & İptal
              </h3>
              <dl>
                {[
                  ['İade Süresi', '14 gün içinde'],
                  ['İade Şartı', 'Açılmamış, kullanılmamış, orijinal ambalajında'],
                  ['İade Yöntemi', 'Banka havalesi veya kart iadesi'],
                  ['İptal', 'Kargoya verilmemiş siparişler iptal edilebilir'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between py-2.5 border-b border-black/[0.06] gap-4">
                    <dt className="text-[12px] text-black/45 shrink-0">{k}</dt>
                    <dd className="text-[13px] text-black/80 font-medium text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        {/* ── Sık Sorulan Sorular ── */}
        {active === 'faq' && (
          <div className="space-y-2 max-w-2xl">
            {(
              [
                ['Ürünün garantisi var mı?', 'Evet, tüm ürünlerimiz 2 yıl üretici garantisi kapsamındadır.'],
                ['Kargo ücreti ne kadar?', '1.500 ₺ ve üzeri siparişlerde kargo tamamen ücretsizdir. Altındaki siparişlerde kargo ücreti sepette hesaplanır.'],
                ['Havale/EFT ile ödeme yapabilir miyim?', 'Evet. Havale/EFT ile ödeme seçeneğinde sipariş toplamından %3 indirim uygulanır.'],
                ['Ürünü iade edebilir miyim?', 'Teslim tarihinden itibaren 14 gün içinde, kullanılmamış ve orijinal ambalajında iade edilebilir.'],
                ['Fatura kesilecek mi?', 'Evet, tüm siparişlerinize e-fatura kesilmektedir.'],
              ] as [string, string][]
            ).map(([q, a]) => (
              <details key={q} className="group border-b border-black/6 pb-0">
                <summary className="text-[13px] font-semibold text-black cursor-pointer list-none flex items-center justify-between gap-3 py-4">
                  {q}
                  <span className="text-black/30 group-open:rotate-180 transition-transform duration-200 shrink-0 text-xs">▾</span>
                </summary>
                <p className="text-[13px] text-black/55 leading-relaxed pb-4">{a}</p>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Blurb Extractor ──────────────────────────────────────────────────────────

function extractBlurb(html: string): string {
  if (!html) return '';
  // First try: look for a leading <p> before any section heading
  const firstPMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (firstPMatch) {
    const text = firstPMatch[1].replace(/<[^>]+>/g, '').trim();
    if (text.length > 20) return text;
  }
  // Second try: find a parsed section with prose text (not specs)
  const sections = parseProductSections(html);
  const blurbSection = sections.find((s) => s.prose && s.type !== 'specs');
  if (blurbSection?.prose) {
    const sentenceEnd = blurbSection.prose.search(/[.!?]/);
    if (sentenceEnd > 20) return blurbSection.prose.slice(0, sentenceEnd + 1).trim();
    return blurbSection.prose.slice(0, 160);
  }
  // Fallback: strip all HTML, find first sentence within 240 chars
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const match = text.slice(0, 240).match(/^(.*?[.!?])\s/);
  return match ? match[1] : text.slice(0, 160);
}

// ─── Carousel Options ─────────────────────────────────────────────────────────

const CAROUSEL_OPTIONS = {
  loop: true,
  dragFree: false,
  dragThreshold: 5,
  duration: 22,
} as const;

// ─── Main Component ───────────────────────────────────────────────────────────

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

  // UI state
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showMobileCta, setShowMobileCta] = useState(false);

  // Review form state
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

  const ctaSentinelRef = useRef<HTMLDivElement | null>(null);
  const heroImageRef = useRef<HTMLDivElement | null>(null);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel(CAROUSEL_OPTIONS);
  const [lightboxEmblaRef, lightboxEmblaApi] = useEmblaCarousel(CAROUSEL_OPTIONS);

  const isScrollingRef = useRef(false);
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    if (isScrollingRef.current) return;
    setSelectedImage(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onScrollStart = () => {
      isScrollingRef.current = true;
      if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    };
    const onScrollEnd = () => {
      scrollDebounceRef.current = setTimeout(() => {
        isScrollingRef.current = false;
        setSelectedImage(emblaApi.selectedScrollSnap());
      }, 60);
    };
    emblaApi.on('scroll', onScrollStart);
    emblaApi.on('settle', onScrollEnd);
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('scroll', onScrollStart);
      emblaApi.off('settle', onScrollEnd);
      emblaApi.off('select', onSelect);
      if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (emblaApi && emblaApi.selectedScrollSnap() !== selectedImage) {
      emblaApi.scrollTo(selectedImage);
    }
  }, [selectedImage, emblaApi]);

  const onLightboxSelect = useCallback(() => {
    if (!lightboxEmblaApi) return;
    setSelectedImage(lightboxEmblaApi.selectedScrollSnap());
  }, [lightboxEmblaApi]);

  useEffect(() => {
    if (!lightboxEmblaApi) return;
    lightboxEmblaApi.on('select', onLightboxSelect);
    return () => { lightboxEmblaApi.off('select', onLightboxSelect); };
  }, [lightboxEmblaApi, onLightboxSelect]);

  useEffect(() => {
    if (lightboxEmblaApi && lightboxOpen) {
      lightboxEmblaApi.scrollTo(selectedImage, true);
    }
  }, [lightboxOpen, selectedImage, lightboxEmblaApi]);

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
      if (e.key === 'Escape') { setLightboxOpen(false); return; }
      if (total <= 1) return;
      if (e.key === 'ArrowLeft') setSelectedImage((p) => (p <= 0 ? total - 1 : p - 1));
      if (e.key === 'ArrowRight') setSelectedImage((p) => (p >= total - 1 ? 0 : p + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, renderedImages.length]);

  useEffect(() => {
    document.body.style.overflow = lightboxOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [lightboxOpen]);

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

  useEffect(() => {
    setSelectedImage(0);
    setQuantity(1);
    setShowReviewForm(false);
  }, [product?.id]);

  const handleHeroMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroImageRef.current || reduceMotion) return;
    const rect = heroImageRef.current.getBoundingClientRect();
    setZoomPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleAddToCart = async () => {
    if (!product) return;
    setIsAdding(true);
    try {
      const variant = product.variants?.find((v) => v.isActive);
      await addToCart(product.id, variant?.id, quantity);
      const mainImage = product.images?.[0] ?? 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=800&fit=crop';
      showModal({ name: product.name, image: mainImage, price: parseFloat(product.basePrice || '0') * quantity, quantity });
    } catch {
      toast({ title: 'Hata', description: 'Sepete eklenemedi.', variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };

  const resetTurnstile = useCallback(() => {
    setCaptchaToken(null);
    const ts = window.turnstile;
    if (ts && turnstileWidgetIdRef.current) {
      try { ts.reset(turnstileWidgetIdRef.current); } catch { /* noop */ }
    }
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!user) {
      if (reviewGuestName.trim().length < 2) {
        toast({ title: 'Eksik bilgi', description: 'Lütfen adınızı yazın.', variant: 'destructive' }); return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reviewGuestEmail.trim())) {
        toast({ title: 'Eksik bilgi', description: 'Lütfen geçerli bir e-posta girin.', variant: 'destructive' }); return;
      }
      if (turnstileSiteKey && !captchaToken) {
        toast({ title: 'Doğrulama gerekli', description: 'Lütfen güvenlik doğrulamasını tamamlayın.', variant: 'destructive' }); return;
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
      toast({ title: 'Yorumunuz alındı', description: 'Onay sonrası ürün sayfasında görünecektir.' });
      setReviewTitle(''); setReviewContent(''); setReviewRating(5);
      setReviewGuestName(''); setReviewGuestEmail('');
      setReviewSubmitted(true); setShowReviewForm(false);
      resetTurnstile();
    } catch (err: any) {
      toast({ title: 'Hata', description: err?.message || 'Değerlendirme gönderilemedi.', variant: 'destructive' });
      resetTurnstile();
    }
  };

  useEffect(() => {
    if (user || userReview || reviewSubmitted || !showReviewForm) return;
    if (!turnstileSiteKey) return;
    const node = turnstileContainerRef.current;
    if (!node) return;
    let cancelled = false;
    let pollId: number | undefined;
    const tryRender = () => {
      const ts = window.turnstile;
      if (cancelled) return;
      if (!ts || typeof ts.render !== 'function') { pollId = window.setTimeout(tryRender, 250); return; }
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
      } catch { /* noop */ }
    };
    tryRender();
    return () => {
      cancelled = true;
      if (pollId) clearTimeout(pollId);
      const ts = window.turnstile;
      if (ts && turnstileWidgetIdRef.current) {
        try { ts.remove(turnstileWidgetIdRef.current); } catch { /* noop */ }
        turnstileWidgetIdRef.current = null;
      }
    };
  }, [user, userReview, reviewSubmitted, showReviewForm, turnstileSiteKey]);

  // ─── Loading / Not Found ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="pt-24 pb-20 px-6 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-black/20 animate-spin" />
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="pt-24 pb-20 px-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Package className="w-12 h-12 text-black/15 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mb-3">Ürün Bulunamadı</h1>
            <p className="text-black/40 mb-6 text-sm">Bu ürün mevcut değil ya da kaldırılmış.</p>
            <Link href="/">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-xs tracking-[0.18em] uppercase font-semibold hover:bg-[#2D5A27] transition-colors">
                Ana Sayfaya Dön
              </span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ─── Derived values ───────────────────────────────────────────────────────

  const images = renderedImages;
  const price = parseFloat(product.basePrice || '0');
  const originalPrice = getOriginalPrice(price, product.discountBadge);
  const category = categories.find((c) => c.id === product.categoryId);
  const totalStock = product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) ?? 0;
  const isOutOfStock = !!product.variants && product.variants.length > 0 && totalStock === 0;

  const sameCategory = allProducts.filter((p) => p.id !== product.id && p.categoryId === product.categoryId);
  const fillers = allProducts.filter((p) => p.id !== product.id && p.categoryId !== product.categoryId);
  const moreProducts = [...sameCategory, ...fillers].slice(0, 4);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `${product.name} - Sepetzen`;
  const socialLinks = [
    { name: 'WhatsApp', url: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}` },
    { name: 'X (Twitter)', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` },
    { name: 'Facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
  ];
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); toast({ title: 'Bağlantı kopyalandı' }); }
    catch { toast({ title: 'Kopyalanamadı', variant: 'destructive' }); }
    setShowShareMenu(false);
  };

  // Rating bar chart data
  const ratingBars = ratingData && ratingData.count > 0
    ? [5, 4, 3, 2, 1].map((star) => {
        const count = reviews.filter((r) => r.rating === star).length;
        return { star, count, pct: ratingData.count > 0 ? (count / ratingData.count) * 100 : 0 };
      })
    : [];

  // ─── Render ───────────────────────────────────────────────────────────────

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
          name: product.name, price, currency: 'TRY',
          availability: isOutOfStock ? 'OutOfStock' : 'InStock',
          sku: product.sku || undefined, brand: 'Sepetzen',
          category: category?.name, images,
        }}
        breadcrumbs={[
          { name: 'Ana Sayfa', url: '/' },
          ...(category ? [{ name: category.name, url: `/kategori/${category.slug}` }] : []),
          { name: product.name, url: `/urun/${product.slug}` },
        ]}
      />

      <Header />

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/96 backdrop-blur-sm flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
            data-testid="lightbox"
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-20"
              aria-label="Kapat"
              data-testid="button-lightbox-close"
            >
              <X className="w-4 h-4" />
            </button>

            {images.length > 1 && (
              <>
                <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedImage((p) => p === 0 ? images.length - 1 : p - 1); }} className="hidden sm:flex absolute left-5 w-11 h-11 items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white z-20" aria-label="Önceki">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedImage((p) => p === images.length - 1 ? 0 : p + 1); }} className="hidden sm:flex absolute right-5 w-11 h-11 items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white z-20" aria-label="Sonraki">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            <div className="hidden sm:flex w-full h-full items-center justify-center p-10">
              <motion.img
                key={selectedImage}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                src={images[selectedImage]}
                alt={product.name}
                className="max-w-[88vw] max-h-[88vh] object-contain select-none"
                onClick={(e) => e.stopPropagation()}
                draggable={false}
              />
            </div>

            <div className="sm:hidden w-full h-full flex items-center" onClick={(e) => e.stopPropagation()}>
              <div className="w-full overflow-hidden" ref={lightboxEmblaRef}>
                <div className="flex">
                  {images.map((img, i) => (
                    <div key={i} className="flex-[0_0_100%] min-w-0 flex items-center justify-center px-4">
                      <img src={img} alt={product.name} className="max-w-full max-h-[80vh] object-contain" draggable={false} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {images.length > 1 && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                {images.map((_, i) => (
                  <button key={i} type="button" onClick={(e) => { e.stopPropagation(); setSelectedImage(i); }}
                    className={`h-1.5 rounded-full transition-all ${i === selectedImage ? 'bg-white w-6' : 'bg-white/30 w-1.5'}`}
                    aria-label={`Görsel ${i + 1}`} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main ── */}
      <main className="pt-6 lg:pt-10 pb-24 lg:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[11px] text-black/38 mb-8 font-mono tracking-[0.15em] uppercase flex-wrap">
            <Link href="/" className="hover:text-black transition-colors">Ana Sayfa</Link>
            {category && (
              <>
                <ChevronRight className="w-3 h-3 text-black/20" />
                <Link href={`/kategori/${category.slug}`} className="hover:text-black transition-colors">{category.name}</Link>
              </>
            )}
            <ChevronRight className="w-3 h-3 text-black/20" />
            <span className="text-black/60 normal-case font-sans tracking-normal text-[12px] truncate max-w-[200px]">{product.name}</span>
          </nav>

          {/* ── Product grid: Gallery + Info ── */}
          <div className="grid lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px] gap-8 lg:gap-14 items-start">

            {/* LEFT — Sticky Gallery (only sticky when right column has enough content) */}
            <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4${product.description ? ' lg:sticky lg:top-24 lg:self-start' : ''}`}>

              {/* Thumbnail strip (desktop) */}
              {images.length > 1 && (
                <div className="hidden sm:flex flex-col gap-2 w-[68px] shrink-0">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(i)}
                      className={`relative aspect-square overflow-hidden bg-stone-100 transition-all duration-200 ${
                        i === selectedImage ? 'ring-1 ring-[#2D5A27] ring-offset-1' : 'opacity-50 hover:opacity-85'
                      }`}
                      data-testid={`button-thumbnail-${i}`}
                      aria-label={`Görsel ${i + 1}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}

              {/* Main image */}
              <div className="flex-1 min-w-0">
                {/* Desktop */}
                <div className="hidden sm:block">
                  <div
                    ref={heroImageRef}
                    className="relative aspect-[4/5] bg-stone-100 overflow-hidden cursor-zoom-in"
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
                        transition={{ duration: reduceMotion ? 0 : 0.18 }}
                        style={{
                          transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                          transform: isZooming && !reduceMotion ? 'scale(1.55)' : 'scale(1)',
                          transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1)',
                        }}
                        draggable={false}
                      />
                    </AnimatePresence>
                    {product.discountBadge && (
                      <span className="absolute top-4 left-4 z-10 bg-black text-white text-[10px] font-bold tracking-[0.2em] px-3 py-1.5 uppercase">{product.discountBadge}</span>
                    )}
                    {product.isNew && !product.discountBadge && (
                      <span className="absolute top-4 left-4 z-10 bg-black text-white text-[10px] font-bold tracking-[0.2em] px-3 py-1.5 uppercase">Yeni</span>
                    )}
                    <div className="absolute bottom-4 right-4 text-[10px] text-white/50 bg-black/25 px-2 py-1 backdrop-blur-sm font-mono">
                      {selectedImage + 1} / {images.length}
                    </div>
                  </div>
                </div>

                {/* Mobile carousel */}
                <div className="sm:hidden -mx-4">
                  <div className="relative aspect-square bg-stone-100 overflow-hidden" ref={emblaRef}>
                    <div className="flex h-full">
                      {images.map((img, i) => (
                        <button type="button" key={i} className="flex-[0_0_100%] min-w-0 h-full" onClick={() => setLightboxOpen(true)} aria-label={`Görsel ${i + 1} - büyüt`}>
                          <img src={img} alt={product.name} className="w-full h-full object-cover" draggable={false} />
                        </button>
                      ))}
                    </div>
                    {product.discountBadge && <span className="absolute top-4 left-4 z-10 bg-black text-white text-[10px] font-bold tracking-[0.2em] px-3 py-1.5 uppercase">{product.discountBadge}</span>}
                    {product.isNew && !product.discountBadge && <span className="absolute top-4 left-4 z-10 bg-black text-white text-[10px] font-bold tracking-[0.2em] px-3 py-1.5 uppercase">Yeni</span>}
                  </div>
                  {images.length > 1 && (
                    <div className="flex justify-center gap-1.5 mt-3">
                      {images.map((_, i) => (
                        <button key={i} type="button" onClick={() => setSelectedImage(i)}
                          className={`h-1.5 rounded-full transition-all ${i === selectedImage ? 'bg-[#2D5A27] w-5' : 'bg-black/18 w-1.5'}`}
                          aria-label={`Görsel ${i + 1}`} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT — Info card */}
            <div className="border border-black/8 p-5 lg:p-6">

              {/* Category */}
              {category && (
                <Link href={`/kategori/${category.slug}`}>
                  <span className="inline-block text-[10px] text-[#2D5A27] uppercase tracking-[0.3em] mb-4 hover:underline font-mono">
                    {category.name}
                  </span>
                </Link>
              )}

              {/* Product name */}
              <h1
                className="text-2xl sm:text-3xl font-bold text-black leading-[1.15] mb-3 tracking-[-0.01em]"
                data-testid="text-product-name"
              >
                {product.name}
              </h1>

              {/* Rating */}
              {ratingData && ratingData.count > 0 && (
                <div className="flex items-center gap-2.5 mb-5">
                  <StarRating rating={Math.round(ratingData.average)} size={13} />
                  <span className="text-[12px] text-black/45">
                    {ratingData.average.toFixed(1)} <span className="text-black/25">·</span> {ratingData.count} değerlendirme
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-3">
                {originalPrice && (
                  <span className="text-base text-black/30 line-through" data-testid="text-original-price">
                    {originalPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                  </span>
                )}
                <span
                  className="text-3xl sm:text-4xl font-bold text-[#2D5A27] tabular-nums tracking-[-0.02em]"
                  data-testid="text-product-price"
                >
                  {price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                </span>
              </div>

              {/* Blurb */}
              {product.description && (() => {
                const blurb = extractBlurb(product.description);
                return blurb ? (
                  <p className="text-[13px] text-black/50 leading-relaxed mb-5">{blurb}</p>
                ) : null;
              })()}

              <div className="border-t border-black/6 pt-5 space-y-3">
                {/* Stock status + Shipping countdown */}
                <div className="flex items-center gap-3 flex-wrap">
                  {isOutOfStock ? (
                    <span className="text-[12px] text-red-500 font-medium">Tükendi</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[12px] text-[#2D5A27] font-semibold">
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                      Stokta var
                    </span>
                  )}
                  <span className="text-black/15 text-xs">|</span>
                  <ShippingCountdown />
                </div>

                {/* Quantity + Add to cart */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-black/12 shrink-0">
                    <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-10 h-11 flex items-center justify-center text-black hover:bg-black/4 transition-colors"
                      aria-label="Azalt" data-testid="button-decrease-quantity">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-9 text-center text-sm font-semibold text-black tabular-nums" data-testid="text-quantity">{quantity}</span>
                    <button type="button" onClick={() => setQuantity((q) => q + 1)}
                      className="w-10 h-11 flex items-center justify-center text-black hover:bg-black/4 transition-colors"
                      aria-label="Artır" data-testid="button-increase-quantity">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isAdding || isOutOfStock}
                    className={`flex-1 h-11 font-semibold text-[11px] uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2 ${
                      isOutOfStock ? 'bg-black/8 text-black/30 cursor-not-allowed' : 'bg-[#2D5A27] hover:bg-[#234a1e] text-white'
                    }`}
                    data-testid="button-add-to-cart"
                  >
                    {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{isOutOfStock ? 'Tükendi' : 'Sepete Ekle'}</span>}
                  </button>
                </div>

                {/* WhatsApp */}
                {!isOutOfStock && (
                  <a
                    href={`https://wa.me/905366301138?text=${encodeURIComponent(`Merhaba, "${product.name}" ürününü sipariş vermek istiyorum. ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-10 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/6 transition-colors text-[11px] font-semibold tracking-[0.16em] uppercase"
                    data-testid="link-whatsapp-order"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    WhatsApp ile Sipariş Ver
                  </a>
                )}

                {/* Favorilere Ekle + Paylaş */}
                <div className="flex items-center gap-5 pt-1">
                  <button
                    type="button"
                    onClick={() => product && !isFavoriteLoading && toggleFavorite(product.id, isLiked)}
                    disabled={isFavoriteLoading}
                    className="flex items-center gap-1.5 text-[12px] text-black/50 hover:text-black transition-colors"
                    aria-label="Favorilere ekle" data-testid="button-like"
                  >
                    {isFavoriteLoading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-[#2D5A27] text-[#2D5A27]' : ''}`} />
                    }
                    <span>{isLiked ? 'Favorilerde' : 'Favorilere Ekle'}</span>
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowShareMenu((v) => !v)}
                      className="flex items-center gap-1.5 text-[12px] text-black/50 hover:text-black transition-colors"
                      aria-label="Paylaş" data-testid="button-share"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Paylaş</span>
                    </button>
                    <AnimatePresence>
                      {showShareMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          className="absolute bottom-full left-0 mb-2 bg-white border border-black/10 shadow-xl min-w-[170px] z-30"
                        >
                          {socialLinks.map((s) => (
                            <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                              onClick={() => setShowShareMenu(false)}
                              className="block px-4 py-2.5 text-[13px] text-black hover:bg-black/4 transition-colors">
                              {s.name}
                            </a>
                          ))}
                          <button type="button" onClick={copyLink}
                            className="w-full text-left px-4 py-2.5 text-[13px] text-black hover:bg-black/4 transition-colors flex items-center gap-2 border-t border-black/6">
                            <Copy className="w-3.5 h-3.5" />Bağlantıyı Kopyala
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Sentinel for mobile sticky bar */}
                <div ref={ctaSentinelRef} aria-hidden="true" className="h-px" />

                {/* Trust strip */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-black/6">
                  {[
                    { icon: Truck, title: 'Ücretsiz Kargo', sub: '1.500 ₺ üzeri' },
                    { icon: RotateCcw, title: 'Kolay İade', sub: '14 gün içinde' },
                    { icon: Shield, title: 'Güvenli Ödeme', sub: 'SSL korumalı' },
                  ].map((it) => (
                    <div key={it.title} className="text-center py-3">
                      <it.icon className="w-4 h-4 text-[#2D5A27] mx-auto mb-1.5" strokeWidth={1.75} />
                      <p className="text-[10.5px] font-semibold text-black leading-tight">{it.title}</p>
                      <p className="text-[9.5px] text-black/35 mt-0.5">{it.sub}</p>
                    </div>
                  ))}
                </div>

                {/* SKU */}
                {product.sku && (
                  <p className="text-[11px] text-black/35 font-mono tracking-[0.10em]" data-testid="text-sku">
                    Stok Kodu: <span className="text-black/55">{product.sku}</span>
                  </p>
                )}
              </div>

            </div>
          </div>

          {/* ── Feature highlights strip ── */}
          {product.description && <ProductFeatureHighlights html={product.description} />}

          {/* ── Description tabs ── */}
          <ProductTabs html={product.description || ''} />

          {/* ── Reviews ── */}
          <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.45 }}
            className="mt-16 lg:mt-20 pt-12 border-t border-black/6"
          >
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
              <h2 className="text-lg font-bold text-black tracking-[-0.01em]">
                Müşteri Değerlendirmeleri
                {ratingData && ratingData.count > 0 && (
                  <span className="ml-2 text-sm font-normal text-black/40">({ratingData.count})</span>
                )}
              </h2>
              {!userReview && !reviewSubmitted && (
                <button
                  type="button"
                  onClick={() => setShowReviewForm((v) => !v)}
                  className="text-[11px] uppercase tracking-[0.18em] font-semibold text-black border border-black/15 px-4 py-2 hover:bg-black hover:text-white transition-colors"
                  data-testid="button-toggle-review-form"
                >
                  {showReviewForm ? 'İptal' : 'Yorum Yaz'}
                </button>
              )}
            </div>

            {/* Rating summary */}
            {ratingData && ratingData.count > 0 && (
              <div className="flex items-start gap-8 mb-10 flex-wrap">
                <div className="text-center shrink-0">
                  <div className="text-5xl font-bold text-black tabular-nums">{ratingData.average.toFixed(1)}</div>
                  <StarRating rating={Math.round(ratingData.average)} size={14} />
                  <div className="text-[11px] text-black/40 mt-1">{ratingData.count} yorum</div>
                </div>
                <div className="flex-1 min-w-[180px] space-y-1.5">
                  {ratingBars.map(({ star, pct, count }) => (
                    <div key={star} className="flex items-center gap-2.5">
                      <span className="text-[11px] text-black/45 w-4 text-right">{star}</span>
                      <div className="flex-1 h-1.5 bg-black/8 rounded-full overflow-hidden">
                        <div className="h-full bg-[#2D5A27] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] text-black/35 w-4">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submitted confirmation */}
            {reviewSubmitted && !userReview && (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200/80 px-5 py-4 mb-8" data-testid="text-review-pending">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-[13px] font-semibold text-emerald-900">Yorumunuz alındı.</p>
                  <p className="text-[12px] text-emerald-700/80 mt-0.5">Onay sonrası ürün sayfasında görünecektir.</p>
                </div>
              </div>
            )}

            {/* Review form */}
            <AnimatePresence>
              {showReviewForm && !userReview && !reviewSubmitted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-stone-50 p-6 mb-8 border border-black/6">
                    <div className="flex items-baseline justify-between mb-5 gap-3 flex-wrap">
                      <h3 className="font-semibold text-black text-[15px]">Değerlendirme Yaz</h3>
                      {!user && (
                        <p className="text-[11px] text-black/45">
                          Üye misin?{' '}
                          <Link href="/giris"><span className="underline hover:text-[#2D5A27] cursor-pointer">Giriş yap</span></Link>
                        </p>
                      )}
                    </div>
                    <form onSubmit={handleSubmitReview} className="space-y-4">
                      <div>
                        <label className="block text-[11px] text-black/40 mb-2 uppercase tracking-wider">Puanınız</label>
                        <StarRating rating={reviewRating} size={24} interactive onChange={setReviewRating} />
                      </div>
                      {!user && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input type="text" required placeholder="Adınız *" value={reviewGuestName} onChange={(e) => setReviewGuestName(e.target.value)} maxLength={100}
                            className="w-full px-4 py-3 bg-white border border-black/10 text-black placeholder:text-black/28 focus:outline-none focus:border-black/30 transition-colors text-sm"
                            data-testid="input-review-guest-name" />
                          <input type="email" required placeholder="E-posta *" value={reviewGuestEmail} onChange={(e) => setReviewGuestEmail(e.target.value)} maxLength={200}
                            className="w-full px-4 py-3 bg-white border border-black/10 text-black placeholder:text-black/28 focus:outline-none focus:border-black/30 transition-colors text-sm"
                            data-testid="input-review-guest-email" />
                        </div>
                      )}
                      <input type="text" placeholder="Başlık (isteğe bağlı)" value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} maxLength={200}
                        className="w-full px-4 py-3 bg-white border border-black/10 text-black placeholder:text-black/28 focus:outline-none focus:border-black/30 transition-colors text-sm"
                        data-testid="input-review-title" />
                      <textarea placeholder="Yorumunuz (isteğe bağlı)" value={reviewContent} onChange={(e) => setReviewContent(e.target.value)} rows={4} maxLength={4000}
                        className="w-full px-4 py-3 bg-white border border-black/10 text-black placeholder:text-black/28 focus:outline-none focus:border-black/30 transition-colors resize-none text-sm"
                        data-testid="input-review-content" />
                      {!user && turnstileSiteKey && (
                        <div ref={turnstileContainerRef} data-testid="turnstile-container" className="min-h-[65px]" />
                      )}
                      {!user && (
                        <p className="text-[11px] text-black/38 leading-relaxed">
                          E-postanız sadece yorum doğrulama için kullanılır, yayınlanmaz. Yorumlar yönetici onayından geçer.
                        </p>
                      )}
                      <button type="submit" disabled={createReviewMutation.isPending}
                        className="px-6 py-2.5 bg-black text-white font-semibold hover:bg-[#2D5A27] transition-colors disabled:opacity-50 flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase"
                        data-testid="button-submit-review">
                        {createReviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Gönder
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* User's own review */}
            {userReview && (
              <div className="border border-[#2D5A27]/20 bg-[#2D5A27]/[0.03] p-5 mb-6">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <StarRating rating={userReview.rating} size={13} />
                  {userReview.isApproved ? (
                    <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1"><Check className="w-3 h-3" />Değerlendirmeniz</span>
                  ) : userReview.rejectionReason ? (
                    <span className="text-[11px] text-red-700 font-medium px-2 py-0.5 bg-red-50 border border-red-100">Onaylanmadı</span>
                  ) : (
                    <span className="text-[11px] text-amber-700 font-medium px-2 py-0.5 bg-amber-50 border border-amber-100">Onay Bekliyor</span>
                  )}
                </div>
                {userReview.title && <h4 className="font-semibold text-[14px] text-black">{userReview.title}</h4>}
                {userReview.content && <p className="text-black/55 mt-1 text-[13px] leading-relaxed">{userReview.content}</p>}
                {userReview.rejectionReason && (
                  <p className="text-[12px] text-red-700 mt-2"><strong>Reddetme nedeni:</strong> {userReview.rejectionReason}</p>
                )}
              </div>
            )}

            {/* Reviews grid */}
            {reviews.filter((r) => r.id !== userReview?.id).length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {reviews.filter((r) => r.id !== userReview?.id).map((review) => {
                  const mask = (n?: string | null) => !n ? '***' : n.slice(0, 2) + '***';
                  return (
                    <div key={review.id} className="border border-black/6 p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-stone-100 border border-black/6 flex items-center justify-center text-[13px] font-bold text-black/60 shrink-0">
                          {review.user.firstName?.charAt(0)?.toUpperCase() || 'A'}
                        </div>
                        <div>
                          <p className="font-medium text-[13px] text-black">
                            {mask(review.user.firstName)} {mask(review.user.lastName)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StarRating rating={review.rating} size={10} />
                            <span className="text-[11px] text-black/35">
                              {new Date(review.createdAt).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      {review.title && <h4 className="font-semibold text-[13px] text-black mb-1">{review.title}</h4>}
                      {review.content && <p className="text-black/55 text-[13px] leading-relaxed">{review.content}</p>}
                    </div>
                  );
                })}
              </div>
            ) : (
              !userReview && !reviewSubmitted && (
                <div className="text-center py-10 border border-dashed border-black/10">
                  <Star className="w-8 h-8 mx-auto mb-3 text-black/12" />
                  <p className="text-[13px] text-black/40">Henüz değerlendirme yok.</p>
                  <button type="button" onClick={() => setShowReviewForm(true)}
                    className="mt-4 text-[11px] text-[#2D5A27] font-semibold hover:underline tracking-[0.12em] uppercase">
                    İlk yorumu yap
                  </button>
                </div>
              )
            )}
          </motion.section>

          {/* ── Related products ── */}
          {moreProducts.length > 0 && (
            <motion.section
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45 }}
              className="mt-16 lg:mt-20 pt-12 border-t border-black/6"
            >
              <h2 className="text-lg font-bold text-black mb-8 tracking-[-0.01em]">Birlikte Alınabilir</h2>
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

      {/* ── Mobile sticky CTA ── */}
      <AnimatePresence>
        {showMobileCta && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22 }}
            className="lg:hidden fixed inset-x-0 z-[90] bg-white border-t border-black/8 shadow-[0_-6px_20px_rgba(0,0,0,0.07)] px-4 py-3 flex items-center gap-3"
            style={{ bottom: 'var(--mobile-nav-total, 58px)' }}
            data-testid="mobile-sticky-cta"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-black/38 leading-tight truncate">{product.name}</p>
              <p className="text-lg font-bold text-black tabular-nums leading-tight">
                {price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isAdding || isOutOfStock}
              className={`h-10 px-5 font-semibold text-[11px] uppercase tracking-[0.18em] flex items-center justify-center gap-2 ${
                isOutOfStock ? 'bg-black/8 text-black/30 cursor-not-allowed' : 'bg-[#2D5A27] text-white hover:bg-[#234a1e]'
              }`}
              data-testid="button-add-to-cart-mobile"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{isOutOfStock ? 'Tükendi' : 'Sepete Ekle'}</span>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
