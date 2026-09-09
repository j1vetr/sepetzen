import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { ProductCard } from '@/components/ProductCard';
import { Link } from 'wouter';
import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { ArrowUpRight, Truck, ShieldCheck, Star, ChevronLeft, ChevronRight, Instagram } from 'lucide-react';
import { useProducts, type Product } from '@/hooks/useProducts';
import { useQuery } from '@tanstack/react-query';
import { FreeShippingBadge } from '@/components/FreeShippingBadge';
import { useFreeShippingThreshold } from '@/hooks/useShippingSettings';
import { bindShippingThresholdText } from '@shared/shipping';
import { isFreeShippingPromotion } from '@/lib/promotionBadge';
import {
  DEFAULT_HOMEPAGE_CONTENT,
  resolveHomepageContent,
  type HomepageContent,
  type HeroSlide,
  type TrustItem,
  type PartnerStrip,
  type ShowcaseItem,
} from '@shared/homepage';

// ─── HOMEPAGE CONTENT (admin-managed, falls back to defaults) ────────────────

function useHomepageContent(): HomepageContent {
  const { data } = useQuery<HomepageContent>({
    queryKey: ['/api/homepage-content'],
    queryFn: async () => {
      const res = await fetch('/api/homepage-content');
      if (!res.ok) throw new Error('Failed to fetch homepage content');
      return resolveHomepageContent(await res.json());
    },
    staleTime: 60_000,
  });
  return data ?? DEFAULT_HOMEPAGE_CONTENT;
}

// ─── HERO SLIDER ─────────────────────────────────────────────────────────────

const EMPTY_HERO_MARQUEE: import('@shared/homepage').ShowcaseMarquee = { isActive: false, items: [] };

function HeroSlider({ products, slides, heroMarquee = EMPTY_HERO_MARQUEE }: { products: Product[]; slides: HeroSlide[]; heroMarquee?: import('@shared/homepage').ShowcaseMarquee }) {
  // Yapılandırılmış ürün/kategori varsa onları çek
  const activeItems = heroMarquee.isActive ? heroMarquee.items.filter(i => i.isActive !== false) : [];
  const { data: configuredProducts } = useQuery<Product[]>({
    queryKey: ['hero-marquee-products', activeItems.map(i => `${i.type}:${i.id}`).join(',')],
    enabled: activeItems.length > 0,
    queryFn: async () => {
      const encoded = encodeURIComponent(JSON.stringify(activeItems.map(i => ({ type: i.type, id: i.id }))));
      const res = await fetch(`/api/showcase-products?items=${encoded}`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  const marqueeProducts = activeItems.length > 0 && configuredProducts?.length
    ? configuredProducts
    : products;
  const HERO_SLIDES = slides.length ? slides : DEFAULT_HOMEPAGE_CONTENT.heroSlides;
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(1);
  const slideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const go = (next: number, direction = 1) => { setDir(direction); setActive(next); };
  const prev = () => go((active - 1 + HERO_SLIDES.length) % HERO_SLIDES.length, -1);
  const next = () => go((active + 1) % HERO_SLIDES.length, 1);

  // Slide auto-advance
  useEffect(() => {
    slideTimer.current = setTimeout(() => go((active + 1) % HERO_SLIDES.length, 1), 6000);
    return () => clearTimeout(slideTimer.current);
  }, [active]);

  const slide = HERO_SLIDES[active];

  return (
    <section
      className="relative w-full overflow-hidden bg-[#000000] hero-section flex flex-col"
      data-testid="scene-hero"
    >
      {/* Full-bleed background */}
      <AnimatePresence initial={false} custom={dir}>
        <motion.div
          key={active}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: [0.33, 1, 0.68, 1] }}
          className="absolute inset-0"
          style={{ backgroundColor: slide.bg }}
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="absolute inset-0 w-full h-full object-cover opacity-55"
            style={{ objectPosition: 'center 25%' }}
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
          {/* Left-heavy vignette so right panel is darker */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25" />
        </motion.div>
      </AnimatePresence>

      {/* Centered layout */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col px-4 lg:px-12">

        {/* İçerik — üst sınır ile alt kontroller arasında tam orta */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-4xl flex flex-col items-center text-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center"
              >
                <span className="inline-block text-[10px] tracking-[0.30em] uppercase text-[#FAFAFA] font-mono mb-4">
                  {slide.eyebrow}
                </span>
                <h1
                  className="font-black text-white leading-[0.93] mb-5"
                  style={{ fontSize: 'clamp(48px, 8vw, 120px)', letterSpacing: '-0.03em' }}
                >
                  {slide.title}
                </h1>
                <p className="text-white/60 text-[15px] lg:text-[17px] leading-relaxed max-w-[520px] mb-9">
                  {slide.desc}
                </p>
                <div className="flex items-center justify-center gap-5 flex-wrap">
                  <Link href={slide.href}>
                    <motion.span
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="btn-glass inline-flex items-center gap-3 px-8 py-3.5 text-[11px] tracking-[0.22em] uppercase font-bold cursor-pointer"
                      data-testid="link-hero-cta"
                    >
                      {slide.cta} <ArrowUpRight className="w-4 h-4" />
                    </motion.span>
                  </Link>
                  <Link href="/magaza">
                    <span className="text-[11px] tracking-[0.20em] uppercase text-white/45 hover:text-white transition-colors cursor-pointer font-medium">
                      Tüm Ürünler
                    </span>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Slayt kontrolleri — alta yapışık */}
        <div className="pb-5 lg:pb-6 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i, i > active ? 1 : -1)}
                className="relative h-[2px] rounded-full overflow-hidden transition-all duration-300"
                style={{ width: i === active ? 40 : 16, backgroundColor: i === active ? '#FAFAFA' : 'rgba(255,255,255,0.22)' }}
                data-testid={`button-hero-slide-${i}`}
                aria-label={`Slayt ${i + 1}`}
              />
            ))}
          </div>
          <span className="text-[10px] font-mono text-white/30 tracking-[0.22em]">
            {String(active + 1).padStart(2, '0')} / {String(HERO_SLIDES.length).padStart(2, '0')}
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={prev} className="w-9 h-9 rounded-full border border-white/18 flex items-center justify-center text-white/55 hover:text-white hover:border-white/45 transition-colors" aria-label="Önceki" data-testid="button-hero-prev">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={next} className="w-9 h-9 rounded-full border border-white/18 flex items-center justify-center text-white/55 hover:text-white hover:border-white/45 transition-colors" aria-label="Sonraki" data-testid="button-hero-next">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Desktop hero marquee — masaüstünde, hero altında */}
      <DesktopHeroMarquee products={marqueeProducts} />

      {/* Mobile marquee — hero içinde, altta */}
      <MobileMarquee products={marqueeProducts} />
    </section>
  );
}

// ─── FEATURED PRODUCTS ────────────────────────────────────────────────────────

function FeaturedProducts({ products }: { products: Product[] }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });
  const items = useMemo(() => {
    const featured = products.filter(p => p.isFeatured && p.images?.length);
    const rest = products.filter(p => !p.isFeatured && p.images?.length);
    return [...featured, ...rest].slice(0, 8);
  }, [products]);

  if (!items.length) return null;

  // Promo görseli için video olmayan ilk medya tercih edilir; ürünün tek
  // medyası video ise banner videonun ilk karesini gösterir.
  const promoVideoRe = /\.(mp4|webm|mov)(\?.*)?$/i;
  const promoMedia =
    items[0]?.images?.find((u) => !promoVideoRe.test(u)) ||
    items[0]?.images?.[0] ||
    '/uploads/products/header_ithal-caki-1.png';
  const promoIsVideo = promoVideoRe.test(promoMedia);

  return (
    <section
      ref={ref}
      className="bg-[#0A0A0A] py-16 lg:py-24 px-5 lg:px-10"
      data-testid="scene-featured"
    >
      <div className="max-w-[1320px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr] gap-5 lg:gap-7 items-stretch">

          {/* ── Sol: Promo banner ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden bg-zinc-900 min-h-[320px] lg:min-h-0"
            data-testid="promo-banner"
          >
            {promoIsVideo ? (
              <video
                src={promoMedia}
                muted
                autoPlay
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-55"
              />
            ) : (
              <img
                src={promoMedia}
                alt="Premium Bıçak Koleksiyonu"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover opacity-55"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />
            <div className="relative z-10 flex flex-col justify-end h-full p-7 lg:p-9">
              <p className="text-[10px] font-mono tracking-[0.30em] uppercase text-white/55 mb-3">Yeni Sezon</p>
              <h3
                className="font-black text-white leading-[1.02] mb-3"
                style={{ fontSize: 'clamp(26px, 3vw, 38px)', letterSpacing: '-0.02em' }}
              >
                Premium Bıçak Koleksiyonu
              </h3>
              <p className="text-[13px] text-white/60 leading-relaxed mb-6">En kaliteli malzemeler, üstün işçilik</p>
              <Link href="/magaza">
                <span className="inline-flex items-center gap-2.5 bg-white text-black hover:bg-white/90 transition-colors px-6 py-3.5 text-[10.5px] tracking-[0.20em] uppercase font-bold cursor-pointer" data-testid="link-promo-cta">
                  Alışverişe Başla <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </div>
          </motion.div>

          {/* ── Sağ: Çok Satan Ürünler ── */}
          <div className="min-w-0">
            <div className="flex items-end justify-between mb-6 lg:mb-8">
              <h2
                className="font-black text-white leading-none"
                style={{ fontSize: 'clamp(22px, 3vw, 32px)', letterSpacing: '-0.02em' }}
              >
                Çok Satan Ürünler
              </h2>
              <Link
                href="/magaza"
                data-testid="link-featured-all"
                className="inline-flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase font-semibold text-white/40 hover:text-white transition-colors"
              >
                Tümünü Gör <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
              {items.slice(0, 4).map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.05 }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ProductCard product={p} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

const CATS = [
  {
    name: 'Çakılar',
    slug: 'cakilar',
    desc: 'Kamp & Av Çakıları',
    image: '/uploads/products/header_ithal-caki-1.png',
    accent: '#FAFAFA',
  },
  {
    name: 'Bıçaklar',
    slug: 'bicaklar',
    desc: 'Av & Mutfak Bıçakları',
    image: '/uploads/products/header_av-cakisi.png',
    accent: '#FAFAFA',
  },
  {
    name: 'Kamp & Outdoor',
    slug: 'kamp-outdoor-ekipmanlari',
    desc: 'Doğa Ekipmanları',
    image: '/uploads/products/header_kamp-bicagi.png',
    accent: '#FAFAFA',
  },
  {
    name: 'Bağ & Bahçe',
    slug: 'bag-bahce-aletleri',
    desc: 'Tarım & Bahçe Aletleri',
    image: '/uploads/products/header_bag-bahce.png',
    accent: '#FAFAFA',
  },
  {
    name: 'Mangal & Izgara',
    slug: 'mangal-izgara-ahsap',
    desc: 'BBQ & Ahşap Ürünler',
    image: '/uploads/products/header_izgara.png',
    accent: '#FAFAFA',
  },
  {
    name: 'Nalbur & Hırdavat',
    slug: 'nalbur-hirdavat',
    desc: 'El Aletleri & Donanım',
    image: '/uploads/products/header_mangal-aksesuar.png',
    accent: '#FAFAFA',
  },
];

interface HomeCategory {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  image?: string | null;
  parentId?: string | null;
}

function PopularCategories({ products }: { products: Product[] }) {
  const { data: cats = [] } = useQuery<HomeCategory[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });

  // Vitrin kartlarında yalnızca ana kategoriler gösterilir; alt kategori
  // ürünleri ana kategorinin sayısına dahildir.
  const visible = cats
    .filter(c => (c.displayOrder ?? 0) < 100 && !c.parentId)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .slice(0, 7);

  const fallbackImage = (slug: string) =>
    CATS.find(c => c.slug === slug)?.image ?? null;

  const countFor = (id: string) => {
    const ids = [id, ...cats.filter(c => c.parentId === id).map(c => c.id)];
    return products.filter(p =>
      ids.some(cid => (p as any).categoryIds?.includes(cid) || p.categoryId === cid),
    ).length;
  };

  if (!visible.length) return null;

  return (
    <section className="bg-[#0A0A0A] py-14 lg:py-20 px-5 lg:px-10" data-testid="scene-popular-categories">
      <div className="max-w-[1320px] mx-auto">
        <div className="flex items-end justify-between mb-8 lg:mb-10">
          <h2
            className="font-black text-white leading-none"
            style={{ fontSize: 'clamp(22px, 3vw, 32px)', letterSpacing: '-0.02em' }}
          >
            Popüler Kategoriler
          </h2>
          <Link
            href="/magaza"
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase font-semibold text-white/40 hover:text-white transition-colors"
            data-testid="link-popular-cats-all"
          >
            Tüm Kategoriler <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {visible.map((cat, i) => {
            const img = cat.image || fallbackImage(cat.slug);
            const count = countFor(cat.id);
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  href={`/kategori/${cat.slug}`}
                  data-testid={`link-popcat-${cat.slug}`}
                  className="group flex flex-col items-center text-center bg-[#111111] hover:bg-[#161616] border border-white/[0.07] hover:border-white/20 transition-colors px-3 pt-5 pb-4 h-full"
                >
                  <div className="w-full aspect-square max-w-[110px] mb-3 overflow-hidden flex items-center justify-center">
                    {img ? (
                      <img
                        src={img}
                        alt={cat.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/[0.05]" />
                    )}
                  </div>
                  <p className="text-[12.5px] font-semibold text-white leading-tight mb-1 line-clamp-2">{cat.name}</p>
                  {count > 0 && (
                    <p className="text-[10.5px] text-white/40">{count} ürün</p>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── NEW ARRIVALS ─────────────────────────────────────────────────────────────

function NewArrivals({ products }: { products: Product[] }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });
  const freeShippingThreshold = useFreeShippingThreshold();
  const items = useMemo(() => {
    return products.filter(p => (p.isNew || p.discountBadge) && p.images?.length).slice(0, 4);
  }, [products]);

  if (!items.length) return null;

  return (
    <section
      ref={ref}
      className="bg-[#0F0F0F] py-16 lg:py-24 px-5 lg:px-10"
      data-testid="scene-new-arrivals"
    >
      <div className="max-w-[1320px] mx-auto">
        <div className="flex items-end justify-between mb-10 lg:mb-14">
          <div>
            <p className="text-[10px] font-mono tracking-[0.30em] uppercase text-[#FAFAFA] mb-2">Yeni</p>
            <h2
              className="font-black text-white leading-none"
              style={{ fontSize: 'clamp(28px, 4vw, 52px)', letterSpacing: '-0.03em' }}
            >
              Yeni Gelenler
            </h2>
          </div>
          <Link
            href="/magaza?isNew=1"
            className="hidden sm:inline-flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase font-semibold text-white/35 hover:text-[#FAFAFA] transition-colors"
          >
            Hepsini Gör <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
          {items.map((p, i) => {
            const price = parseFloat(String(p.basePrice || '0')) || 0;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.05 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  href={`/urun/${p.slug}`}
                  data-testid={`link-new-${p.id}`}
                  className="group block"
                >
                  {/* Image */}
                  <div className="relative aspect-[3/4] overflow-hidden bg-zinc-900 mb-3">
                    {p.images?.[0] && /\.(mp4|webm|mov)(\?.*)?$/i.test(p.images[0]) ? (
                      <video
                        src={p.images[0]}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        muted
                        preload="metadata"
                        loop
                        playsInline
                        onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
                        onMouseLeave={(e) => {
                          const v = e.currentTarget as HTMLVideoElement;
                          v.pause();
                          v.currentTime = 0;
                        }}
                      />
                    ) : (
                    <img
                      src={p.images?.[0] || ''}
                      alt={p.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    )}
                    {/* Badges — sol üstte dikey yığın */}
                    <div className="absolute top-2.5 left-2.5 z-10 flex flex-col items-start gap-1.5">
                      {!isFreeShippingPromotion(p.discountBadge) && p.discountBadge && (
                        <div className="bg-[#141414] text-white text-[9px] font-bold tracking-[0.16em] uppercase px-2 py-1">
                          {p.discountBadge}
                        </div>
                      )}
                      {p.isNew && (
                        <div className="storefront-new-badge storefront-new-badge--compact">
                          Yeni
                        </div>
                      )}
                      <FreeShippingBadge
                        size="compact"
                        productPrice={price}
                        threshold={freeShippingThreshold}
                      />
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300 flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[10px] tracking-[0.22em] uppercase font-bold text-white border border-white px-4 py-2">
                        İncele
                      </span>
                    </div>
                  </div>
                  {/* Info */}
                  <div>
                    <p className="text-[11px] tracking-[0.06em] text-white/50 font-mono mb-0.5">Sepetzen</p>
                    <p className="text-[13px] lg:text-[14px] font-semibold text-white leading-snug line-clamp-2 mb-1.5 group-hover:text-[#FAFAFA] transition-colors">
                      {p.name}
                    </p>
                    <p className="text-[15px] font-bold text-[#FAFAFA]">
                      {price.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── VIDEO SECTION ────────────────────────────────────────────────────────────

function LazyVideo({ src, className }: { src: string; className: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.preload = 'metadata';
          el.load();
          el.play().catch(() => {});
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      preload="none"
      className={className}
    />
  );
}

function VideoSection({ content }: { content: HomepageContent }) {
  const videos = (content.videoCards.length ? content.videoCards : DEFAULT_HOMEPAGE_CONTENT.videoCards)
    .filter(v => v.isActive !== false && v.src);
  const header = content.videoSection;

  if (!videos.length) return null;

  return (
    <section className="bg-[#000000] py-16 lg:py-24 px-5 lg:px-10" data-testid="scene-videos">
      <div className="max-w-[1320px] mx-auto">
        {/* Başlık */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
          className="mb-10 lg:mb-14 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <p className="text-[10px] font-mono tracking-[0.30em] uppercase text-[#FAFAFA] mb-2">
              {header.eyebrow}
            </p>
            <h2
              className="font-black text-white leading-none"
              style={{ fontSize: 'clamp(28px, 4vw, 52px)', letterSpacing: '-0.03em' }}
            >
              {header.title}
            </h2>
            <p className="text-[13px] text-white/45 mt-4 max-w-md leading-relaxed">
              {header.desc}
            </p>
          </div>
          <Link
            href="/magaza"
            className="inline-flex items-center gap-2 shrink-0 text-[11px] tracking-[0.22em] uppercase font-semibold text-white border border-white/20 hover:border-[#FAFAFA] hover:text-[#FAFAFA] transition-colors px-5 py-3"
          >
            Ürünleri İncele <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>

        {/* Video kartları */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7">
          {videos.map((v, i) => (
            <motion.div
              key={v.src}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.33, 1, 0.68, 1] }}
              className="group relative overflow-hidden"
              data-testid={`video-card-${i}`}>
              <div className="relative aspect-video overflow-hidden bg-zinc-950">
                <LazyVideo
                  src={v.src}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
                {/* Overlay — siyah katman + alt degrade */}
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                {/* Alt metin */}
                <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
                  <h3
                    className="font-black text-white leading-tight drop-shadow-lg"
                    style={{ fontSize: 'clamp(18px, 2.5vw, 26px)', letterSpacing: '-0.02em' }}
                  >
                    {v.title}
                  </h3>
                  <p className="text-[12px] text-white/70 mt-2 leading-relaxed drop-shadow">
                    {v.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── TRUST STRIP ─────────────────────────────────────────────────────────────

const TRUST_ICONS = { truck: Truck, shield: ShieldCheck, star: Star } as const;

function TrustStrip({ items: rawItems }: { items: TrustItem[] }) {
  const freeShippingThreshold = useFreeShippingThreshold();
  const items = (rawItems.length ? rawItems : DEFAULT_HOMEPAGE_CONTENT.trustItems)
    .filter(i => i.isActive !== false)
    .map(i => ({
      ...i,
      // Kargo metinlerindeki tutar admin'deki eşik ayarına bağlıdır
      title: bindShippingThresholdText(i.title, freeShippingThreshold),
      desc: bindShippingThresholdText(i.desc, freeShippingThreshold),
      iconComp: TRUST_ICONS[i.icon] ?? Star,
    }));

  if (!items.length) return null;

  return (
    <section className="bg-[#0F0F0F] border-t border-white/[0.07]" data-testid="scene-trust">
      <div className="max-w-[1100px] mx-auto px-5 lg:px-10">
        <div className="grid grid-cols-1 sm:grid-cols-3">
          {items.map((item, i) => {
            const Icon = item.iconComp;
            return (
              <motion.div
                key={`${item.title}-${i}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.08, ease: [0.33, 1, 0.68, 1] }}
                className={[
                  'flex items-center gap-4 py-7 lg:py-10',
                  i < items.length - 1 ? 'border-b sm:border-b-0 sm:border-r border-white/[0.07]' : '',
                  i > 0 ? 'sm:pl-8 lg:pl-12' : '',
                  i < items.length - 1 ? 'sm:pr-8 lg:pr-12' : '',
                ].join(' ')}
              >
                <div className="w-11 h-11 rounded-sm bg-[#141414]/20 border border-[#141414]/30 flex items-center justify-center shrink-0">
                  <Icon className="w-[19px] h-[19px] text-[#FAFAFA]" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white/90 leading-snug tracking-[0.01em]">
                    {item.title}
                  </p>
                  <p className="text-[11.5px] text-white/42 mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── PARTNERS STRIP (kayan marka / bayi şeridi) ───────────────────────────────

function PartnersStrip({ strip }: { strip: PartnerStrip }) {
  const activeItems = strip.items.filter(i => i.isActive !== false);
  if (!strip.isActive || activeItems.length === 0) return null;

  // Döngüyü pürüzsüz yapmak için listeyi 4 kez çoğalt
  const repeated = [...activeItems, ...activeItems, ...activeItems, ...activeItems];
  const durationSec = Math.max(20, activeItems.length * 5);

  return (
    <section className="bg-[#080808] border-t border-white/[0.06]" data-testid="scene-partners">
      {/* Başlık */}
      <div className="max-w-[1400px] mx-auto px-5 lg:px-10 pt-10 pb-6 text-center">
        <p className="text-[10px] tracking-[0.22em] uppercase text-white/30 font-medium">
          {strip.title}
        </p>
      </div>

      {/* Kayan şerit */}
      <div className="relative overflow-hidden pb-10">
        {/* Sol fade */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[#080808] to-transparent" />
        {/* Sağ fade */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#080808] to-transparent" />

        <div
          className="flex items-center gap-12 w-max"
          style={{
            animation: `partnersMarquee ${durationSec}s linear infinite`,
          }}
        >
          {repeated.map((item, idx) => {
            const inner = (
              <div className="flex items-center gap-3 shrink-0 opacity-50 hover:opacity-100 transition-opacity duration-300 select-none">
                {item.logoUrl ? (
                  <img
                    src={item.logoUrl}
                    alt={item.name}
                    className="h-8 max-w-[120px] object-contain grayscale brightness-150"
                    loading="lazy"
                    draggable={false}
                  />
                ) : (
                  <span className="text-[13px] font-semibold tracking-widest uppercase text-white/70">
                    {item.name}
                  </span>
                )}
              </div>
            );

            return item.href ? (
              <a
                key={idx}
                href={item.href}
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="focus:outline-none"
                tabIndex={idx < activeItems.length ? 0 : -1}
                aria-hidden={idx >= activeItems.length}
              >
                {inner}
              </a>
            ) : (
              <div key={idx} aria-hidden={idx >= activeItems.length}>
                {inner}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes partnersMarquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}

// ─── DESKTOP HERO MARQUEE (masaüstü — hero altı kayan ürün şeridi) ────────────

function DesktopHeroMarquee({ products }: { products: Product[] }) {
  const freeShippingThreshold = useFreeShippingThreshold();
  // Her seferinde aynı sırayı üret — shuffle sadece mount'ta çalışır
  const items = useMemo(() => {
    const withImages = products.filter(p => p.images?.length);
    // Sabit seed için index bazlı bir karıştırma; Math.random kullanmıyoruz
    // çünkü her render'da farklı sıra oluşunca hidrasyon uyumsuzluğu çıkabilir
    return withImages.slice(0, 20);
  }, [products]);

  if (!items.length) return null;

  // 3× kopyala — 2× yetmeyebilir geniş ekranlarda, 3× her zaman yeterli
  const tripled = [...items, ...items, ...items];

  return (
    <div
      className="hidden lg:block overflow-hidden py-4 mb-2"
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        maskImage: 'linear-gradient(to right, transparent, black 60px, black calc(100% - 60px), transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 60px, black calc(100% - 60px), transparent)',
      }}
      data-testid="scene-desktop-hero-marquee"
    >
      <div className="marquee-loop gap-3 px-4">
        {tripled.map((p, i) => {
          const price = parseFloat(String(p.basePrice || '0')) || 0;
          const isVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
          // Video olmayan ilk görseli bul; yoksa video'dan preload=metadata ile ilk kare göster
          const thumbSrc = p.images?.find(img => !isVideoUrl(img)) ?? p.images?.[0];
          const thumbIsVideo = thumbSrc ? isVideoUrl(thumbSrc) : false;
          return (
            <Link
              key={`desk-${p.id}-${i}`}
              href={`/urun/${p.slug}`}
              className="group shrink-0 w-[148px] flex flex-col overflow-hidden"
              data-testid={`link-desktop-marquee-${p.id}`}
            >
              {/* Görsel — video ürünlerde static kare kullanılır */}
              <div className="relative w-[148px] h-[188px] overflow-hidden bg-black/30 shrink-0">
                {thumbSrc ? (
                  thumbIsVideo ? (
                    <video
                      src={thumbSrc}
                      muted
                      preload="metadata"
                      loop
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={thumbSrc}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="absolute inset-0 bg-white/5" />
                )}
                {p.isNew && (
                  <span className="absolute top-1.5 left-1.5 text-[7px] tracking-[0.18em] uppercase text-white bg-[#141414]/90 px-1.5 py-0.5 font-bold">
                    Yeni
                  </span>
                )}
              </div>
              {/* Bilgi */}
              <div className="px-2.5 py-2 flex-1 bg-black/40">
                <p
                  className="text-[10.5px] font-medium text-white/75 group-hover:text-white transition-colors leading-snug truncate mb-1"
                  title={p.name}
                >
                  {p.name}
                </p>
                <p className="text-[12.5px] font-bold text-white leading-none">
                  {price.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── MOBILE MARQUEE ───────────────────────────────────────────────────────────

function MobileMarquee({ products }: { products: Product[] }) {
  const items = useMemo(() => {
    const shuffled = [...products].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 12);
  }, [products]);

  if (!items.length) return null;

  const doubled = [...items, ...items];

  return (
    <section
      className="block lg:hidden bg-[#000000] overflow-hidden py-4 border-t border-white/[0.06]"
      data-testid="scene-mobile-marquee"
    >
      <div className="marquee-track gap-3 px-3">
        {doubled.map((p, i) => {
          const price = parseFloat(String(p.basePrice || '0')) || 0;
          const isVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
          const thumbSrc = p.images?.find(img => !isVideoUrl(img)) ?? p.images?.[0];
          const thumbIsVideo = thumbSrc ? isVideoUrl(thumbSrc) : false;
          return (
            <Link
              key={`${p.id}-${i}`}
              href={`/urun/${p.slug}`}
              className="group shrink-0 w-32 flex flex-col bg-white/[0.06] border border-white/[0.08] overflow-hidden hover:border-[#FAFAFA]/50 transition-colors"
              data-testid={`link-marquee-product-${p.id}`}
            >
              <div className="relative w-32 h-40 overflow-hidden bg-black/20 shrink-0">
                {thumbSrc ? (
                  thumbIsVideo ? (
                    <video
                      src={thumbSrc}
                      className="absolute inset-0 w-full h-full object-cover"
                      muted
                      preload="metadata"
                      loop
                      playsInline
                    />
                  ) : (
                    <img
                      src={thumbSrc}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )
                ) : (
                  <div className="absolute inset-0 bg-white/5" />
                )}
              </div>
              <div className="p-2.5 flex-1">
                <p className="text-[10.5px] font-medium text-white/75 leading-snug line-clamp-2 mb-1.5">
                  {p.name}
                </p>
                <p className="text-[12px] font-bold text-[#FAFAFA]">
                  {price.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─── SHOWCASE MARQUEE ─────────────────────────────────────────────────────────

function ShowcaseMarquee({ items }: { items: ShowcaseItem[] }) {
  const activeItems = useMemo(() => items.filter(i => i.isActive !== false), [items]);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['showcase-products', activeItems],
    queryFn: async () => {
      if (!activeItems.length) return [];
      const encoded = encodeURIComponent(JSON.stringify(activeItems));
      const res = await fetch(`/api/showcase-products?items=${encoded}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeItems.length > 0,
    staleTime: 120_000,
  });

  if (!products.length) return null;

  // 3× kopyala — geniş ekranlarda sonsuz döngü için yeterli
  const tripled = [...products, ...products, ...products];

  return (
    <section
      className="overflow-hidden py-5 border-y border-white/[0.06]"
      style={{
        background: 'rgba(0,0,0,0.6)',
        maskImage: 'linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)',
      }}
      data-testid="scene-showcase-marquee"
    >
      <div className="marquee-loop gap-3 px-4">
        {tripled.map((p, i) => {
          const isVideo = /\.(mp4|webm|mov)(\?.*)?$/i.test(p.images?.[0] || '');
          const isYT = /youtube\.com|youtu\.be/.test(p.images?.[0] || '');
          return (
            <Link
              key={`showcase-${p.id}-${i}`}
              href={`/urun/${p.slug}`}
              className="group shrink-0 block"
              data-testid={`link-showcase-${p.id}`}
            >
              <div className="relative w-44 h-56 overflow-hidden rounded-sm bg-zinc-900">
                {p.images?.[0] && !isYT ? (
                  isVideo ? (
                    <video
                      src={p.images[0]}
                      muted autoPlay loop playsInline preload="metadata"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )
                ) : (
                  <div className="absolute inset-0 bg-white/5" />
                )}
                {/* İnce kenarlık efekti */}
                <div className="absolute inset-0 border border-white/[0.08] rounded-sm pointer-events-none group-hover:border-white/20 transition-colors duration-300" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const { data: products = [] } = useProducts({});
  const content = useHomepageContent();

  const activeSlides = content.heroSlides.filter(s => s.isActive !== false);

  const sections: Record<string, React.ReactNode> = {
    videos: <VideoSection key="videos" content={content} />,
    featured: <FeaturedProducts key="featured" products={products} />,
    categories: <PopularCategories key="categories" products={products} />,
    newArrivals: <NewArrivals key="newArrivals" products={products} />,
    trust: <TrustStrip key="trust" items={content.trustItems} />,
    partners: <PartnersStrip key="partners" strip={content.partnerStrip} />,
    showcaseMarquee: content.showcaseMarquee.isActive
      ? <ShowcaseMarquee key="showcaseMarquee" items={content.showcaseMarquee.items} />
      : null,
  };

  return (
    <>
      <SEO
        title="Sepetzen – Kamp, Outdoor, Bıçak ve Bağ & Bahçe"
        description="Sepetzen, av bıçakları, kamp çakıları, outdoor ekipmanları ve bağ & bahçe ürünleri sunan Türk outdoor markasıdır. Dalaman'dan Türkiye geneline hızlı teslimat."
        url="/"
      />
      <Header />
      <main>
        <HeroSlider products={products} slides={activeSlides} heroMarquee={content.heroMarquee} />
        {content.sectionOrder
          .filter(s => s.isActive !== false)
          .map(s => sections[s.id] ?? null)}
      </main>
      <Footer />
    </>
  );
}
