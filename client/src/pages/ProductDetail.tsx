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
  ChevronDown,
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
  Ruler,
  Layers,
  Target,
  Gift,
  Info,
  type LucideIcon,
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
import { FreeShippingBadge } from '@/components/FreeShippingBadge';
import { isFreeShippingPromotion } from '@/lib/promotionBadge';
import { useFreeShippingThreshold } from '@/hooks/useShippingSettings';

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
              star <= (hover || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-white/15'
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

/** Legacy DB descriptions carry inline green styles — remap to monochrome palette */
function neutralizeLegacyColors(html: string): string {
  return html
    .replace(/#2D5A27/gi, '#D4D4D4')
    .replace(/#4A9A42/gi, '#FAFAFA')
    .replace(/#1B3D17/gi, '#D4D4D4');
}

/** Admin içerikleri farklı editörlerden geldiği için görsel kontrolü burada
 * ele alıyoruz. Satır içi stiller ürün sayfasının tasarımını ezemez; içerik
 * yapısı (başlık, paragraf, liste, vurgu) korunur. */
function normalizeDescriptionHtml(rawHtml: string): string {
  const html = neutralizeLegacyColors(rawHtml || '');
  if (!html || typeof window === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, iframe, object, embed, form').forEach((node) => node.remove());
  doc.querySelectorAll<HTMLElement>('*').forEach((node) => {
    node.removeAttribute('style');
    node.removeAttribute('color');
    node.removeAttribute('bgcolor');
    node.removeAttribute('class');
    node.removeAttribute('id');
    Array.from(node.attributes).forEach((attribute) => {
      if (attribute.name.toLowerCase().startsWith('on')) node.removeAttribute(attribute.name);
    });
  });
  const isSafeUrl = (value: string) => {
    const url = value.trim().toLowerCase().replace(/[\s\u0000-\u001f]+/g, '');
    if (url.startsWith('javascript:') || url.startsWith('data:') || url.startsWith('vbscript:')) return false;
    return true;
  };
  doc.querySelectorAll('a').forEach((anchor) => {
    const href = anchor.getAttribute('href');
    if (href && !isSafeUrl(href)) anchor.removeAttribute('href');
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noreferrer');
  });
  doc.querySelectorAll('img, source, video, audio').forEach((media) => {
    const src = media.getAttribute('src');
    if (src && !isSafeUrl(src)) media.remove();
    media.removeAttribute('srcset');
  });
  return doc.body.innerHTML;
}

function parseProductSections(rawHtml: string): DescSection[] {
  const html = normalizeDescriptionHtml(rawHtml || '');
  if (!html) return [];

  const headingRe = /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi;
  const hMatches = Array.from(html.matchAll(headingRe));
  if (hMatches.length > 0) {
    return hMatches.map((m, i) => {
      const end = m.index! + m[0].length;
      const nextStart = hMatches[i + 1]?.index ?? html.length;
      const bodyHtml = html.slice(end, nextStart);
      const text = m[1].replace(/<[^>]+>/g, '').trim();
      const emoji = SECTION_EMOJIS.find((e) => text.includes(e)) ?? '';
      const title = text.replace(new RegExp('^[^\\p{L}\\p{N}]+', 'u'), '').trim() || text;
      const items = Array.from(bodyHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
        .map((lm) => lm[1].replace(/<[^>]+>/g, '').trim())
        .filter(Boolean);
      const prose = Array.from(bodyHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
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
    const items = Array.from(clone.querySelectorAll('li'))
      .map((li) => li.textContent?.trim() ?? '')
      .filter(Boolean);
    const prose = Array.from(clone.querySelectorAll('p'))
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
        className="product-rich-copy text-sm text-white/70 leading-relaxed max-w-2xl"
        dangerouslySetInnerHTML={{ __html: normalizeDescriptionHtml(html) }}
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
              <h3 className="text-[12px] font-semibold text-white/50 mb-4">
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
                        className="flex items-baseline gap-6 py-2.5 border-b border-white/8"
                      >
                        {label && (
                          <dt className="text-[12px] text-white/50 w-36 shrink-0">{label}</dt>
                        )}
                        <dd className="text-[13px] text-white font-medium">{value}</dd>
                      </div>
                    );
                  })}
                </dl>
              ) : (
                <p className="text-[13px] text-white/70 leading-relaxed">{specs.prose}</p>
              )}
            </div>
          )}

          {/* Materyal */}
          {material && (
            <div>
              <h3 className="text-[12px] font-semibold text-white/50 mb-4">
                {material.title || 'Materyal'}
              </h3>
              <p className="text-[14px] text-white/70 leading-[1.75]">
                {material.prose || material.items.join(' · ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Kullanım Alanları */}
      {usage && (
        <div>
          <h3 className="text-[12px] font-semibold text-white/50 mb-4">
            {usage.title || 'Kullanım Alanları'}
          </h3>
          {usage.items.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {usage.items.map((chip, j) => (
                <span
                  key={j}
                  className="px-3 py-1.5 border border-white/20 text-[12px] text-white/70 font-medium"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-white/70 leading-[1.75]">{usage.prose}</p>
          )}
        </div>
      )}

      {/* Hediye */}
      {gift && (
          <div className="border-l-2 border-white/40 pl-5 py-1">
          <h3 className="text-[12px] font-semibold text-white/80 mb-2">
            {gift.title || 'Hediye'}
          </h3>
          <p className="text-[14px] text-white/70 leading-[1.75]">
            {gift.prose || gift.items.join(' ')}
          </p>
        </div>
      )}

      {/* Generic sections */}
      {generics.map((section, i) => (
        <div key={i}>
          {section.title && (
            <h3 className="text-[12px] font-semibold text-white/50 mb-4">
              {section.title}
            </h3>
          )}
          <p className="text-[14px] text-white/70 leading-[1.75]">
            {section.prose || section.items.join(', ')}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Section type → Lucide icon ───────────────────────────────────────────────

function sectionIcon(type: DescSection['type']): LucideIcon {
  if (type === 'specs') return Ruler;
  if (type === 'material') return Layers;
  if (type === 'usage') return Target;
  if (type === 'gift') return Gift;
  return Info;
}

// ─── Feature Highlights Strip ─────────────────────────────────────────────────

function ProductFeatureHighlights({ html }: { html: string }) {
  const reduceMotion = useReducedMotion();
  const sections = useMemo(() => parseProductSections(html), [html]);
  if (sections.length === 0) return null;
  const highlights = sections.slice(0, 4);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-b border-white/8">
      {highlights.map((sec, i) => {
        const Icon = sectionIcon(sec.type);
        return (
          <motion.div
            key={i}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.4, delay: i * 0.07, ease: [0.33, 1, 0.68, 1] }}
            className={`flex items-start gap-3 px-5 py-5 ${i < highlights.length - 1 ? 'border-r border-white/8' : ''}`}
          >
            <span className="shrink-0 mt-0.5 w-[18px] h-[18px] text-white/80">
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-white leading-tight mb-1">{sec.title}</p>
              <p className="text-[11.5px] text-white/50 leading-snug line-clamp-2">
                {sec.items[0] || (sec.prose ? sec.prose.split(/[.!]/)[0] : '') || ''}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Product Tabs ──────────────────────────────────────────────────────────────

const SPEC_ROWS: [key: string, label: string][] = [
  ['urunCinsi', 'Ürün Cinsi'],
  ['tamUzunluk', 'Tam Uzunluk'],
  ['namluUzunlugu', 'Namlu Uzunluğu'],
  ['etKalinligi', 'Et Kalınlığı'],
  ['agirlik', 'Ağırlık'],
  ['celikCinsi', 'Çelik Cinsi'],
  ['sapCinsi', 'Sap Cinsi'],
];

const INSTALLMENT_COUNTS = [1, 2, 3, 6, 9];

function ProductTabs({
  html,
  specs,
  price,
}: {
  html: string;
  specs?: Record<string, string | undefined> | null;
  price: number;
}) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState<'desc' | 'installments' | 'delivery' | 'faq'>('desc');
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const specRows = SPEC_ROWS
    .map(([key, label]) => [label, (specs?.[key] || '').trim()] as [string, string])
    .filter(([, value]) => value.length > 0);

  const TABS = [
    { id: 'desc', label: 'Ürün Açıklaması' },
    { id: 'installments', label: 'Taksit Seçenekleri' },
    { id: 'delivery', label: 'Teslimat ve İade' },
    { id: 'faq', label: 'Sık Sorulan Sorular' },
  ] as const;

  return (
    <div className="mt-8 border-t border-white/8">
      {/* Tab bar */}
      <div className="flex border-b border-white/8 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`relative px-4 lg:px-6 py-3.5 text-[11px] font-semibold tracking-[0.16em] uppercase whitespace-nowrap -mb-px transition-colors ${
              active === tab.id ? 'text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {tab.label}
            {active === tab.id && (
                 <motion.span
                layoutId="product-tab-underline"
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 38 }}
                 className="absolute left-0 right-0 bottom-0 h-[2px] bg-white"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="py-8">
        <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.33, 1, 0.68, 1] }}
        >
        {/* ── Ürün Açıklaması ── */}
         {active === 'desc' && (
           <div className="max-w-3xl space-y-8">
             {specRows.length > 0 && (
               <div>
                 <h3 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/50 mb-3">
                   Teknik Özellikler
                 </h3>
                 <dl className="divide-y divide-white/8 border-t border-b border-white/8 max-w-xl" data-testid="table-product-specs">
                   {specRows.map(([label, value]) => (
                     <div key={label} className="flex items-baseline gap-6 py-2.5">
                       <dt className="text-[12px] text-white/45 w-36 shrink-0">{label}</dt>
                       <dd className="text-[13px] text-white font-medium">{value}</dd>
                     </div>
                   ))}
                 </dl>
               </div>
             )}
              <div>
                <motion.div
                  initial={false}
                  animate={{ height: descriptionExpanded ? 'auto' : 260 }}
                  transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.33, 1, 0.68, 1] }}
                  className={`relative overflow-hidden ${descriptionExpanded ? '' : 'after:absolute after:inset-x-0 after:bottom-0 after:h-20 after:bg-gradient-to-t after:from-[#0A0A0A] after:to-transparent'}`}
                >
                  <div
                    className="product-rich-copy"
                    dangerouslySetInnerHTML={{ __html: normalizeDescriptionHtml(html) }}
                  />
                </motion.div>
                <button
                  type="button"
                  onClick={() => setDescriptionExpanded((value) => !value)}
                  className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60 transition-colors hover:text-white"
                  aria-expanded={descriptionExpanded}
                  data-testid="button-toggle-description"
                >
                  {descriptionExpanded ? 'Daha Az Göster' : 'Tüm Açıklamayı Göster'}
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${descriptionExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
           </div>
         )}

        {/* ── Taksit Seçenekleri ── */}
        {active === 'installments' && (
          <div className="max-w-xl">
            <dl className="divide-y divide-white/8 border-t border-b border-white/8" data-testid="table-installments">
              {INSTALLMENT_COUNTS.map((n) => (
                <div key={n} className="flex items-baseline justify-between gap-6 py-2.5">
                  <dt className="text-[12px] text-white/45">
                    {n === 1 ? 'Tek Çekim' : `${n} Taksit`}
                  </dt>
                  <dd className="text-[13px] text-white font-medium tabular-nums">
                    {n === 1
                      ? `${price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`
                      : `${n} × ${(price / n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[11.5px] text-white/40 leading-relaxed">
              Taksit seçenekleri kredi kartıyla ödemelerde geçerlidir. Bankanıza göre taksit
              sayısı ve tutarlar değişiklik gösterebilir; güncel tutarlar ödeme adımında görüntülenir.
              Havale/EFT ile ödemelerde %3 indirim uygulanır.
            </p>
          </div>
        )}

        {/* ── Teslimat ve İade ── */}
        {active === 'delivery' && (
          <div className="space-y-8 max-w-2xl">
            <div>
              <h3 className="text-[12px] font-semibold text-white/50 mb-4">
                Kargo & Teslimat
              </h3>
              <dl className="divide-y divide-white/8">
                {[
                  ['Kargo Süresi', '1–3 iş günü'],
                  ['Ücretsiz Kargo', '1.500 ₺ ve üzeri siparişlerde'],
                  ['Kargo Firması', 'MNG Kargo / Yurtiçi Kargo'],
                  ['Aynı Gün Kargo', 'Hafta içi 14:00\'a kadar verilen siparişler'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline gap-6 py-2.5">
                    <dt className="text-[12px] text-white/45 w-36 shrink-0">{k}</dt>
                    <dd className="text-[13px] text-white/80 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <h3 className="text-[12px] font-semibold text-white/50 mb-4">
                İade & İptal
              </h3>
              <dl className="divide-y divide-white/8">
                {[
                  ['İade Süresi', '14 gün içinde'],
                  ['İade Şartı', 'Açılmamış, kullanılmamış, orijinal ambalajında'],
                  ['İade Yöntemi', 'Banka havalesi veya kart iadesi'],
                  ['İptal', 'Kargoya verilmemiş siparişler iptal edilebilir'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline gap-6 py-2.5">
                    <dt className="text-[12px] text-white/45 w-36 shrink-0">{k}</dt>
                    <dd className="text-[13px] text-white/80 font-medium">{v}</dd>
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
              <details key={q} className="group border-b border-white/6 pb-0">
                <summary className="text-[13px] font-semibold text-white cursor-pointer list-none flex items-center justify-between gap-3 py-4">
                  {q}
                  <span className="text-white/30 group-open:rotate-180 transition-transform duration-200 shrink-0 text-xs">▾</span>
                </summary>
                <p className="text-[13px] text-white/55 leading-relaxed pb-4">{a}</p>
              </details>
            ))}
          </div>
        )}
        </motion.div>
        </AnimatePresence>
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

const DESKTOP_THUMBNAIL_PAGE_SIZE = 5;

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
  const freeShippingThreshold = useFreeShippingThreshold();
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
  const [desktopThumbnailStart, setDesktopThumbnailStart] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const justAddedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (justAddedTimerRef.current) clearTimeout(justAddedTimerRef.current); }, []);
  useEffect(() => {
    setJustAdded(false);
    if (justAddedTimerRef.current) clearTimeout(justAddedTimerRef.current);
  }, [params.slug]);
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
    setDesktopThumbnailStart(0);
    setQuantity(1);
    setShowReviewForm(false);
  }, [product?.id]);

  useEffect(() => {
    const selectedPageStart = Math.floor(selectedImage / DESKTOP_THUMBNAIL_PAGE_SIZE) * DESKTOP_THUMBNAIL_PAGE_SIZE;
    setDesktopThumbnailStart((current) => current === selectedPageStart ? current : selectedPageStart);
  }, [selectedImage]);

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
      setJustAdded(true);
      if (justAddedTimerRef.current) clearTimeout(justAddedTimerRef.current);
      justAddedTimerRef.current = setTimeout(() => setJustAdded(false), 1500);
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
      <div className="min-h-screen bg-[#0A0A0A]">
        <Header />
        <main className="pt-24 pb-20 px-6 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <Header />
        <main className="pt-24 pb-20 px-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Package className="w-12 h-12 text-white/15 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mb-3">Ürün Bulunamadı</h1>
            <p className="text-white/40 mb-6 text-sm">Bu ürün mevcut değil ya da kaldırılmış.</p>
            <Link href="/">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black text-xs tracking-[0.18em] uppercase font-semibold hover:bg-white/85 transition-colors">
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
  const desktopThumbnailImages = images.slice(
    desktopThumbnailStart,
    desktopThumbnailStart + DESKTOP_THUMBNAIL_PAGE_SIZE,
  );
  const hasMoreDesktopThumbnails = images.length > DESKTOP_THUMBNAIL_PAGE_SIZE;
  const price = parseFloat(product.basePrice || '0');
  const originalPrice = getOriginalPrice(price, product.discountBadge);
  const visibleDiscountBadge = !isFreeShippingPromotion(product.discountBadge)
    ? product.discountBadge
    : null;
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
    <div className="min-h-screen bg-[#0A0A0A] overflow-x-hidden">
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
            className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
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
                className="max-w-[90vw] max-h-[90vh] object-contain select-none"
                onClick={(e) => e.stopPropagation()}
                draggable={false}
              />
            </div>

            <div className="sm:hidden w-full h-full flex items-center" onClick={(e) => e.stopPropagation()}>
              <div className="w-full overflow-hidden" ref={lightboxEmblaRef}>
                <div className="flex">
                  {images.map((img, i) => (
                    <div key={i} className="flex-[0_0_100%] min-w-0 flex items-center justify-center px-4">
                      <img src={img} alt={product.name} loading="lazy" decoding="async" className="max-w-full max-h-[80vh] object-contain" draggable={false} />
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
      <main className="pt-6 lg:pt-6 pb-24 lg:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[11px] text-white/38 mb-8 lg:mb-5 font-mono tracking-[0.15em] uppercase flex-wrap">
            <Link href="/" className="hover:text-white transition-colors">Ana Sayfa</Link>
            {category && (
              <>
                <ChevronRight className="w-3 h-3 text-white/20" />
                <Link href={`/kategori/${category.slug}`} className="hover:text-white transition-colors">{category.name}</Link>
              </>
            )}
            <ChevronRight className="w-3 h-3 text-white/20" />
            <span className="text-white/60 normal-case font-sans tracking-normal text-[12px] truncate max-w-[200px]">{product.name}</span>
          </nav>

          {/* ── Product grid: Gallery + Info ── */}
          <div className="grid lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px] gap-8 lg:gap-8 xl:gap-10 items-start">

            {/* LEFT — Sticky Gallery (only sticky when right column has enough content) */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
              className={`flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-3${product.description ? ' lg:sticky lg:top-24 lg:self-start' : ''}`}>

              {/* Thumbnail strip (desktop) */}
              {images.length > 1 && (
                <div className="hidden sm:flex flex-col gap-2 w-[68px] h-[372px] lg:w-14 lg:h-[440px] xl:w-16 xl:h-[480px] shrink-0">
                  <div className={`grid min-h-0 flex-1 gap-2 ${hasMoreDesktopThumbnails ? 'grid-rows-5' : ''}`}>
                    {desktopThumbnailImages.map((img, offset) => {
                      const imageIndex = desktopThumbnailStart + offset;
                      return (
                        <motion.button
                          key={imageIndex}
                          type="button"
                          onClick={() => setSelectedImage(imageIndex)}
                          whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                          className={`relative min-h-0 w-full overflow-hidden rounded-md bg-zinc-900 border-2 transition-opacity duration-200 ${
                            imageIndex === selectedImage ? 'border-white' : 'border-transparent opacity-50 hover:opacity-85'
                          }`}
                          data-testid={`button-thumbnail-${imageIndex}`}
                          aria-label={`Görsel ${imageIndex + 1}`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </motion.button>
                      );
                    })}
                  </div>
                  {hasMoreDesktopThumbnails && (
                    <button
                      type="button"
                      onClick={() => setDesktopThumbnailStart((current) => {
                        const next = current + DESKTOP_THUMBNAIL_PAGE_SIZE;
                        return next >= images.length ? 0 : next;
                      })}
                      className="flex h-9 shrink-0 items-center justify-center rounded-md border border-white/12 bg-white/[0.04] text-white/80 transition-colors hover:border-white/35 hover:bg-white/10 hover:text-white"
                      aria-label="Sonraki ürün görsellerini göster"
                      title="Sonraki görseller"
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}

              {/* Main image */}
              <div className="flex-1 min-w-0">
                {/* Desktop */}
                <div className="hidden sm:block">
                  <div className="product-gallery-orbit rounded-xl">
                    <div
                      ref={heroImageRef}
                      className="relative aspect-[3/4] lg:aspect-auto lg:h-[440px] xl:h-[480px] rounded-[11px] bg-zinc-900 overflow-hidden cursor-zoom-in border border-white/15"
                      onMouseEnter={() => setIsZooming(true)}
                      onMouseLeave={() => setIsZooming(false)}
                      onMouseMove={handleHeroMove}
                      onClick={() => setLightboxOpen(true)}
                      data-testid="img-product-main"
                    >
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={selectedImage}
                          className="absolute inset-0"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.33, 1, 0.68, 1] }}
                        >
                          <img
                            src={images[selectedImage]}
                            alt={product.name}
                            className="absolute inset-0 w-full h-full object-cover will-change-transform"
                            style={{
                              transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                              transform: isZooming && !reduceMotion ? 'scale(2)' : 'scale(1)',
                              transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1)',
                            }}
                            draggable={false}
                          />
                        </motion.div>
                      </AnimatePresence>
                      {visibleDiscountBadge && (
                        <span className="absolute top-4 left-4 lg:top-3 lg:left-3 z-10 bg-red-500 text-black text-[10px] font-extrabold tracking-[0.16em] px-3 py-1.5 uppercase">{visibleDiscountBadge}</span>
                      )}
                      {product.isNew && !visibleDiscountBadge && (
                        <span className="storefront-new-badge absolute top-4 left-4 lg:top-3 lg:left-3 z-10">Yeni</span>
                      )}
                      <FreeShippingBadge
                        className="absolute bottom-4 left-4 lg:bottom-3 lg:left-3 z-10"
                        productPrice={price}
                        threshold={freeShippingThreshold}
                      />
                      <div className="absolute bottom-4 right-4 lg:bottom-3 lg:right-3 text-[10px] text-white/50 bg-black/25 px-2 py-1 backdrop-blur-sm font-mono">
                        {selectedImage + 1} / {images.length}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile gallery — full-bleed main image + thumbnail strip + dots */}
                <div className="sm:hidden">
                  {/* ── Main swipe carousel ── */}
                  <div
                    className="relative overflow-hidden bg-zinc-900"
                    style={{ aspectRatio: '3/4' }}
                    ref={emblaRef}
                  >
                    <div className="flex h-full">
                      {images.map((img, i) => (
                        <button
                          type="button"
                          key={i}
                          className="flex-[0_0_100%] min-w-0 h-full"
                          onClick={() => setLightboxOpen(true)}
                          aria-label={`Görsel ${i + 1} - büyüt`}
                        >
                          <img
                            src={img}
                            alt={product.name}
                            loading={i === 0 ? 'eager' : 'lazy'}
                            fetchPriority={i === 0 ? 'high' : 'auto'}
                            decoding="async"
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                        </button>
                      ))}
                    </div>

                    {/* Badges */}
                    {visibleDiscountBadge && (
                      <span className="absolute top-4 left-4 z-10 bg-red-500 text-black text-[10px] font-extrabold tracking-[0.16em] px-3 py-1.5 uppercase">
                        {visibleDiscountBadge}
                      </span>
                    )}
                    {product.isNew && !visibleDiscountBadge && (
                      <span className="storefront-new-badge absolute top-4 left-4 z-10">Yeni</span>
                    )}
                    <FreeShippingBadge
                      className="absolute bottom-4 left-4 z-10"
                      productPrice={price}
                      threshold={freeShippingThreshold}
                    />

                    {/* Slide counter */}
                    {images.length > 1 && (
                      <span className="absolute bottom-4 right-4 z-10 text-[10px] font-mono text-white/50 bg-black/30 backdrop-blur-sm px-2 py-0.5">
                        {selectedImage + 1} / {images.length}
                      </span>
                    )}
                  </div>

                  {/* ── Thumbnail strip + dots ── */}
                  {images.length > 1 && (
                    <div className="mt-4 space-y-3 px-4">
                      {/* Thumbnails */}
                      <div className="flex justify-center gap-2 overflow-x-auto py-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
                        {images.map((img, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedImage(i)}
                            aria-label={`Görsel ${i + 1}`}
                            className={`relative shrink-0 overflow-hidden rounded-lg border-2 bg-zinc-900 transition-all duration-200 ${
                              i === selectedImage
                                ? 'border-white opacity-100 scale-[1.06]'
                                : 'border-transparent opacity-45 hover:opacity-70'
                            }`}
                            style={{ width: 58, height: 72 }}
                          >
                            <img
                              src={img}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>

                      {/* Dot indicators — always visible */}
                      <div className="flex justify-center gap-1.5 pb-1">
                        {images.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedImage(i)}
                            aria-label={`Görsel ${i + 1}`}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              i === selectedImage ? 'bg-white w-5' : 'bg-white/30 w-1.5'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* RIGHT — Info card */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.12, ease: [0.33, 1, 0.68, 1] }}
              className="border border-white/8 p-5 lg:p-4 xl:p-5">

               {/* Sepetzen maker mark — the product has a maker, not a generic marketplace */}
                <div className="mb-7 flex items-center gap-4 border-b border-white/8 pb-5 lg:mb-3 lg:gap-3 lg:pb-3">
                  <div className="flex h-12 w-12 lg:h-9 lg:w-9 shrink-0 items-center justify-center bg-[#1A1A1A] border border-white/10 p-2">
                   <img
                     src="/uploads/branding/sepetzen-logo-white.png"
                     alt="Sepetzen"
                     className="max-h-full max-w-full object-contain"
                   />
                 </div>
                 <div>
                    <p className="font-display text-[17px] lg:text-[15px] tracking-[0.12em] text-white">SEPETZEN</p>
                    <p className="mt-0.5 text-[10px] lg:text-[9px] uppercase tracking-[0.14em] text-white/45">Outdoor Gear · Dalaman / Muğla</p>
                 </div>
               </div>

               {/* Category + Brand */}
               <div className="flex items-center justify-between gap-4 pb-3 mb-4 lg:pb-2 lg:mb-2 border-b border-white/8">
                {category ? (
                  <Link href={`/kategori/${category.slug}`}>
                    <span className="inline-block text-[10px] text-white uppercase tracking-[0.3em] hover:underline font-mono">
                      {category.name}
                    </span>
                  </Link>
                ) : <span />}
                <span className="text-[11px] text-white/45 shrink-0" data-testid="text-product-brand">
                  Marka: <span className="text-white font-semibold">{product.brand || 'Sepetzen'}</span>
                </span>
              </div>

              {/* Product name */}
               <h1
                  className="font-display text-3xl sm:text-4xl lg:text-[32px] xl:text-4xl font-bold text-white leading-[1.05] tracking-[0.015em]"
                data-testid="text-product-name"
              >
                {product.name}
              </h1>

              {/* Rating */}
              {ratingData && ratingData.count > 0 && (
                 <div className="flex items-center gap-2.5 mt-3 lg:mt-2">
                  <StarRating rating={Math.round(ratingData.average)} size={13} />
                  <span className="text-[12px] text-white/45">
                    {ratingData.average.toFixed(1)} <span className="text-white/25">·</span> {ratingData.count} değerlendirme
                  </span>
                </div>
              )}

              {/* Price */}
                <div className="flex items-baseline gap-3 mt-4 pt-4 mb-3 lg:mt-3 lg:pt-3 lg:mb-2 border-t border-white/8">
                {originalPrice && (
                  <span className="text-base text-white/30 line-through" data-testid="text-original-price">
                    {originalPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                  </span>
                )}
                <span
                    className="font-display text-4xl sm:text-5xl lg:text-[42px] xl:text-5xl font-bold text-white tabular-nums tracking-[0.02em]"
                  data-testid="text-product-price"
                >
                  {price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                </span>
              </div>

              {/* Blurb */}
              {product.description && (() => {
                const blurb = extractBlurb(product.description);
                return blurb ? (
                  <p className="text-[13px] text-white/50 leading-relaxed mb-5 lg:mb-3 lg:line-clamp-2">{blurb}</p>
                ) : null;
              })()}

                <div className="border-t border-white/8 pt-5 space-y-3 lg:pt-3 lg:space-y-2">
                {/* Stock status + Shipping countdown */}
                <div className="flex items-center gap-3 flex-wrap">
                  {isOutOfStock ? (
                    <span className="text-[12px] text-red-500 font-medium">Tükendi</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[12px] text-white font-semibold">
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                      Stokta var
                    </span>
                  )}
                  <span className="text-white/15 text-xs">|</span>
                  <ShippingCountdown />
                </div>

                {/* Quantity + Add to cart */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-white/12 shrink-0">
                    <motion.button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      whileTap={reduceMotion ? undefined : { scale: 0.88 }}
                      className="w-10 h-11 lg:w-9 lg:h-10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors"
                      aria-label="Azalt" data-testid="button-decrease-quantity">
                      <Minus className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.span
                      key={quantity}
                      initial={reduceMotion ? false : { scale: 1.25 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                      className="w-9 text-center text-sm font-semibold text-white tabular-nums inline-block"
                      data-testid="text-quantity"
                    >{quantity}</motion.span>
                    <motion.button type="button" onClick={() => setQuantity((q) => q + 1)}
                      whileTap={reduceMotion ? undefined : { scale: 0.88 }}
                      className="w-10 h-11 lg:w-9 lg:h-10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors"
                      aria-label="Artır" data-testid="button-increase-quantity">
                      <Plus className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>

                  <motion.button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isAdding || isOutOfStock}
                    whileTap={reduceMotion || isOutOfStock ? undefined : { scale: 0.97 }}
                      className={`flex-1 h-12 lg:h-10 font-semibold text-[11px] uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2 ${
                       isOutOfStock ? 'bg-[#1A1A1A] text-white/30 cursor-not-allowed' : 'bg-white text-black hover:bg-white/90'
                    }`}
                    data-testid="button-add-to-cart"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {isAdding ? (
                        <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </motion.span>
                      ) : justAdded ? (
                        <motion.span
                          key="added"
                          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                          className="flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" strokeWidth={2.5} />
                          Eklendi
                        </motion.span>
                      ) : (
                        <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          {isOutOfStock ? 'Tükendi' : 'Sepete Ekle'}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>

                {/* WhatsApp */}
                {!isOutOfStock && (
                  <a
                    href={`https://wa.me/905366301138?text=${encodeURIComponent(`Merhaba, "${product.name}" ürününü sipariş vermek istiyorum. ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-10 lg:h-9 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/6 transition-colors text-[11px] font-semibold tracking-[0.16em] uppercase"
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
                    className="flex items-center gap-1.5 text-[12px] text-white/50 hover:text-white transition-colors"
                    aria-label="Favorilere ekle" data-testid="button-like"
                  >
                    {isFavoriteLoading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : (
                        <motion.span
                          key={isLiked ? 'liked' : 'not-liked'}
                          initial={reduceMotion ? false : { scale: 0.5 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                          className="inline-flex"
                        >
                          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-[#141414] text-white' : ''}`} />
                        </motion.span>
                      )
                    }
                    <span>{isLiked ? 'Favorilerde' : 'Favorilere Ekle'}</span>
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowShareMenu((v) => !v)}
                      className="flex items-center gap-1.5 text-[12px] text-white/50 hover:text-white transition-colors"
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
                          className="absolute bottom-full left-0 mb-2 bg-[#141414] border border-white/10 shadow-xl min-w-[170px] z-30"
                        >
                          {socialLinks.map((s) => (
                            <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                              onClick={() => setShowShareMenu(false)}
                              className="block px-4 py-2.5 text-[13px] text-white hover:bg-white hover:text-black transition-colors">
                              {s.name}
                            </a>
                          ))}
                          <button type="button" onClick={copyLink}
                            className="w-full text-left px-4 py-2.5 text-[13px] text-white hover:bg-white hover:text-black transition-colors flex items-center gap-2 border-t border-white/6">
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
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/6">
                  {[
                    { icon: Truck, title: 'Ücretsiz Kargo', sub: '1.500 ₺ üzeri' },
                    { icon: RotateCcw, title: 'Kolay İade', sub: '14 gün içinde' },
                    { icon: Shield, title: 'Güvenli Ödeme', sub: 'SSL korumalı' },
                  ].map((it) => (
                    <div key={it.title} className="text-center py-3">
                      <it.icon className="w-4 h-4 text-white mx-auto mb-1.5" strokeWidth={1.75} />
                      <p className="text-[10.5px] font-semibold text-white leading-tight">{it.title}</p>
                      <p className="text-[9.5px] text-white/35 mt-0.5">{it.sub}</p>
                    </div>
                  ))}
                </div>

                {/* SKU */}
                {product.sku && (
                  <p className="text-[11px] text-white/35 font-mono tracking-[0.10em]" data-testid="text-sku">
                    Stok Kodu: <span className="text-white/55">{product.sku}</span>
                  </p>
                )}
              </div>

            </motion.div>
          </div>

          {/* ── Description tabs ── */}
          <ProductTabs html={product.description || ''} specs={product.specs} price={price} />

          {/* ── Reviews ── */}
          <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.45 }}
            className="mt-16 lg:mt-20 pt-12 border-t border-white/6"
          >
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
              <h2 className="text-lg font-bold text-white tracking-[-0.01em]">
                Müşteri Değerlendirmeleri
                {ratingData && ratingData.count > 0 && (
                  <span className="ml-2 text-sm font-normal text-white/40">({ratingData.count})</span>
                )}
              </h2>
              {!userReview && !reviewSubmitted && (
                <button
                  type="button"
                  onClick={() => setShowReviewForm((v) => !v)}
                  className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white border border-white/15 px-4 py-2 hover:bg-white hover:text-black transition-colors"
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
                  <div className="text-5xl font-bold text-white tabular-nums">{ratingData.average.toFixed(1)}</div>
                  <StarRating rating={Math.round(ratingData.average)} size={14} />
                  <div className="text-[11px] text-white/40 mt-1">{ratingData.count} yorum</div>
                </div>
                <div className="flex-1 min-w-[180px] space-y-1.5">
                  {ratingBars.map(({ star, pct, count }) => (
                    <div key={star} className="flex items-center gap-2.5">
                      <span className="text-[11px] text-white/45 w-4 text-right">{star}</span>
                      <div className="flex-1 h-1.5 bg-[#141414]/8 rounded-full overflow-hidden">
                        <div className="h-full bg-[#141414] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] text-white/35 w-4">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submitted confirmation */}
            {reviewSubmitted && !userReview && (
              <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-200/80 px-5 py-4 mb-8" data-testid="text-review-pending">
                <Check className="w-4 h-4 text-neutral-600 shrink-0" />
                <div>
                  <p className="text-[13px] font-semibold text-neutral-900">Yorumunuz alındı.</p>
                  <p className="text-[12px] text-neutral-700/80 mt-0.5">Onay sonrası ürün sayfasında görünecektir.</p>
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
                  <div className="bg-[#141414] p-6 mb-8 border border-white/6">
                    <div className="flex items-baseline justify-between mb-5 gap-3 flex-wrap">
                      <h3 className="font-semibold text-white text-[15px]">Değerlendirme Yaz</h3>
                        {user ? (
                          <p className="text-[11px] text-white/45">
                            {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email} olarak yorum yapıyorsunuz.
                          </p>
                        ) : (
                        <p className="text-[11px] text-white/45">
                          Üye misin?{' '}
                          <Link href="/giris"><span className="underline hover:text-white cursor-pointer">Giriş yap</span></Link>
                        </p>
                      )}
                    </div>
                    <form onSubmit={handleSubmitReview} className="space-y-4">
                      <div>
                        <label className="block text-[11px] text-white/40 mb-2 uppercase tracking-wider">Puanınız</label>
                        <StarRating rating={reviewRating} size={24} interactive onChange={setReviewRating} />
                      </div>
                      {!user && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input type="text" required placeholder="Adınız *" value={reviewGuestName} onChange={(e) => setReviewGuestName(e.target.value)} maxLength={100}
                            className="w-full px-4 py-3 bg-[#141414] border border-white/10 text-white placeholder:text-white/28 focus:outline-none focus:border-white/30 transition-colors text-sm"
                            data-testid="input-review-guest-name" />
                          <input type="email" required placeholder="E-posta *" value={reviewGuestEmail} onChange={(e) => setReviewGuestEmail(e.target.value)} maxLength={200}
                            className="w-full px-4 py-3 bg-[#141414] border border-white/10 text-white placeholder:text-white/28 focus:outline-none focus:border-white/30 transition-colors text-sm"
                            data-testid="input-review-guest-email" />
                        </div>
                      )}
                      <input type="text" placeholder="Başlık (isteğe bağlı)" value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} maxLength={200}
                        className="w-full px-4 py-3 bg-[#141414] border border-white/10 text-white placeholder:text-white/28 focus:outline-none focus:border-white/30 transition-colors text-sm"
                        data-testid="input-review-title" />
                      <textarea placeholder="Yorumunuz (isteğe bağlı)" value={reviewContent} onChange={(e) => setReviewContent(e.target.value)} rows={4} maxLength={4000}
                        className="w-full px-4 py-3 bg-[#141414] border border-white/10 text-white placeholder:text-white/28 focus:outline-none focus:border-white/30 transition-colors resize-none text-sm"
                        data-testid="input-review-content" />
                      {!user && turnstileSiteKey && (
                        <div ref={turnstileContainerRef} data-testid="turnstile-container" className="min-h-[65px]" />
                      )}
                      {!user && (
                        <p className="text-[11px] text-white/38 leading-relaxed">
                          E-postanız sadece yorum doğrulama için kullanılır, yayınlanmaz. Yorumlar yönetici onayından geçer.
                        </p>
                      )}
                      <button type="submit" disabled={createReviewMutation.isPending}
                        className="px-6 py-2.5 bg-white text-black font-semibold hover:bg-white/85 transition-colors disabled:opacity-50 flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase"
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
              <div className="border border-white/20/20 bg-[#141414]/[0.03] p-5 mb-6">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <StarRating rating={userReview.rating} size={13} />
                  {userReview.isApproved ? (
                    <span className="text-[11px] text-neutral-700 font-medium flex items-center gap-1"><Check className="w-3 h-3" />Değerlendirmeniz</span>
                  ) : userReview.rejectionReason ? (
                    <span className="text-[11px] text-red-700 font-medium px-2 py-0.5 bg-red-50 border border-red-100">Onaylanmadı</span>
                  ) : (
                    <span className="text-[11px] text-amber-700 font-medium px-2 py-0.5 bg-amber-50 border border-amber-100">Onay Bekliyor</span>
                  )}
                </div>
                {userReview.title && <h4 className="font-semibold text-[14px] text-white">{userReview.title}</h4>}
                {userReview.content && <p className="text-white/55 mt-1 text-[13px] leading-relaxed">{userReview.content}</p>}
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
                    <div key={review.id} className="border border-white/6 p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-[#151515] border border-white/6 flex items-center justify-center text-[13px] font-bold text-white/60 shrink-0">
                          {review.user.firstName?.charAt(0)?.toUpperCase() || 'A'}
                        </div>
                        <div>
                          <p className="font-medium text-[13px] text-white">
                            {mask(review.user.firstName)} {mask(review.user.lastName)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StarRating rating={review.rating} size={10} />
                            <span className="text-[11px] text-white/35">
                              {new Date(review.createdAt).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      {review.title && <h4 className="font-semibold text-[13px] text-white mb-1">{review.title}</h4>}
                      {review.content && <p className="text-white/55 text-[13px] leading-relaxed">{review.content}</p>}
                    </div>
                  );
                })}
              </div>
            ) : (
              !userReview && !reviewSubmitted && (
                <div className="text-center py-10 border border-dashed border-white/10">
                  <Star className="w-8 h-8 mx-auto mb-3 text-white/12" />
                  <p className="text-[13px] text-white/40">Henüz değerlendirme yok.</p>
                  <button type="button" onClick={() => setShowReviewForm(true)}
                    className="mt-4 text-[11px] text-white font-semibold hover:underline tracking-[0.12em] uppercase">
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
              className="mt-16 lg:mt-20 pt-12 border-t border-white/6"
            >
              <h2 className="text-lg font-bold text-white mb-8 tracking-[-0.01em]">Birlikte Alınabilir</h2>
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
            className="lg:hidden fixed inset-x-0 z-[90] surface-glass-dark border-t shadow-[0_-6px_20px_rgba(0,0,0,0.35)] px-4 py-3 flex items-center gap-3"
            style={{ bottom: 'var(--mobile-nav-total, 58px)' }}
            data-testid="mobile-sticky-cta"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/45 leading-tight truncate">{product.name}</p>
              <p className="text-lg font-bold text-white tabular-nums leading-tight">
                {price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </p>
            </div>
            <motion.button
              type="button"
              onClick={handleAddToCart}
              disabled={isAdding || isOutOfStock}
              whileTap={reduceMotion || isOutOfStock ? undefined : { scale: 0.96 }}
              className={`h-10 px-5 font-semibold text-[11px] uppercase tracking-[0.18em] flex items-center justify-center gap-2 rounded-lg ${
                isOutOfStock ? 'bg-[#141414]/10 text-white/35 cursor-not-allowed border border-white/10' : 'btn-glass'
              }`}
              data-testid="button-add-to-cart-mobile"
            >
              {isAdding
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : justAdded
                  ? <span className="flex items-center gap-2"><Check className="w-4 h-4" strokeWidth={2.5} />Eklendi</span>
                  : <span>{isOutOfStock ? 'Tükendi' : 'Sepete Ekle'}</span>}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
