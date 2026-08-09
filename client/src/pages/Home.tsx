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
import { isFreeShippingPromotion } from '@/lib/promotionBadge';
import {
  DEFAULT_HOMEPAGE_CONTENT,
  resolveHomepageContent,
  type HomepageContent,
  type HeroSlide,
  type TrustItem,
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

function HeroSlider({ products, slides }: { products: Product[]; slides: HeroSlide[] }) {
  const HERO_SLIDES = slides.length ? slides : DEFAULT_HOMEPAGE_CONTENT.heroSlides;
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(1);
  const [cardsKey, setCardsKey] = useState(0);
  const [pickedProducts, setPickedProducts] = useState<Product[]>([]);
  const slideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cardTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const go = (next: number, direction = 1) => { setDir(direction); setActive(next); };
  const prev = () => go((active - 1 + HERO_SLIDES.length) % HERO_SLIDES.length, -1);
  const next = () => go((active + 1) % HERO_SLIDES.length, 1);

  // Slide auto-advance
  useEffect(() => {
    slideTimer.current = setTimeout(() => go((active + 1) % HERO_SLIDES.length, 1), 6000);
    return () => clearTimeout(slideTimer.current);
  }, [active]);

  // Pick random products whenever products load or cardsKey changes
  useEffect(() => {
    if (!products.length) return;
    const shuffled = [...products].sort(() => Math.random() - 0.5);
    setPickedProducts(shuffled.slice(0, 2));
  }, [products, cardsKey]);

  // Rotate product cards every 7s
  useEffect(() => {
    cardTimer.current = setInterval(() => setCardsKey(k => k + 1), 7000);
    return () => clearInterval(cardTimer.current);
  }, []);

  const slide = HERO_SLIDES[active];
  const freeShippingThreshold = useFreeShippingThreshold();

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

      {/* Split layout */}
      <div className="relative z-10 flex-1 min-h-0 max-w-[1680px] mx-auto pl-3 lg:pl-8 pr-4 lg:pr-8 grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_480px] gap-0">

        {/* ── LEFT: Slide content ── */}
        <div className="flex flex-col justify-center pb-20 lg:pb-24 pt-8 lg:pt-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="inline-block text-[10px] tracking-[0.30em] uppercase text-[#FAFAFA] font-mono mb-4">
                {slide.eyebrow}
              </span>
              <h1
                className="font-black text-white leading-[0.93] mb-5"
                style={{ fontSize: 'clamp(48px, 7vw, 108px)', letterSpacing: '-0.03em' }}
              >
                {slide.title}
              </h1>
              <p className="text-white/60 text-[15px] lg:text-[16px] leading-relaxed max-w-[420px] mb-9">
                {slide.desc}
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <Link href={slide.href}>
                  <motion.span
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="btn-glass inline-flex items-center gap-3 px-7 py-3.5 text-[11px] tracking-[0.22em] uppercase font-bold cursor-pointer"
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

          {/* Slide controls */}
          <div className="mt-12 lg:mt-16 flex items-center gap-6">
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
            <div className="flex items-center gap-1.5 ml-auto">
              <button onClick={prev} className="w-9 h-9 rounded-full border border-white/18 flex items-center justify-center text-white/55 hover:text-white hover:border-white/45 transition-colors" aria-label="Önceki" data-testid="button-hero-prev">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={next} className="w-9 h-9 rounded-full border border-white/18 flex items-center justify-center text-white/55 hover:text-white hover:border-white/45 transition-colors" aria-label="Sonraki" data-testid="button-hero-next">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Random product cards (desktop only) ── */}
        <div className="hidden lg:flex flex-col pl-5 xl:pl-8 justify-center pb-12 pt-4">
          {/* Divider */}
          <div className="border-t border-white/[0.12] mb-4 shrink-0" />

          <AnimatePresence mode="wait">
            <motion.div
              key={cardsKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-row gap-2.5 h-[240px]"
            >
              {pickedProducts.length > 0 ? pickedProducts.map((p) => {
                const price = parseFloat(String(p.basePrice || '0')) || 0;
                return (
                  <Link key={p.id} href={`/urun/${p.slug}`} className="flex flex-col flex-1 min-w-0" data-testid={`link-hero-product-${p.id}`}>
                    <div className="group flex flex-col w-full h-full bg-white/[0.07] hover:bg-white/[0.11] border border-white/[0.09] hover:border-white/[0.22] backdrop-blur-sm transition-all duration-300 cursor-pointer overflow-hidden">
                      {/* Image — fills remaining height */}
                      <div className="relative overflow-hidden bg-black/25 flex-1 min-h-0">
                        {p.images?.[0] ? (
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-white/5" />
                        )}
                        {/* Gradient overlay at bottom */}
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                        <FreeShippingBadge
                          className="absolute top-2 left-2 z-10"
                          size="compact"
                          productPrice={price}
                          threshold={freeShippingThreshold}
                        />
                        {(p.isNew || (p.discountBadge && !isFreeShippingPromotion(p.discountBadge))) && (
                          <span className="absolute top-2 right-2 text-[7.5px] tracking-[0.18em] uppercase text-white bg-[#141414] px-2 py-0.5 font-bold">
                            {p.isNew ? 'Yeni' : p.discountBadge}
                          </span>
                        )}
                      </div>
                      {/* Info — fixed height at bottom */}
                      <div className="p-2.5 shrink-0 bg-black/30">
                        <p className="text-[10.5px] font-medium text-white/85 group-hover:text-white transition-colors leading-snug line-clamp-2 mb-1.5">
                          {p.name}
                        </p>
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[13px] font-bold text-[#FAFAFA] leading-none">
                            {price.toLocaleString('tr-TR')} ₺
                          </p>
                          <ArrowUpRight className="w-3 h-3 text-white/30 group-hover:text-[#FAFAFA] transition-colors shrink-0" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              }) : (
                // Skeleton while loading
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex-1 min-w-0 flex flex-col bg-white/[0.04] border border-white/[0.06] overflow-hidden animate-pulse">
                    <div className="flex-1 bg-white/10" />
                    <div className="p-2.5 bg-black/20 shrink-0 space-y-1.5">
                      <div className="h-2.5 bg-white/10 rounded w-full" />
                      <div className="h-2.5 bg-white/10 rounded w-3/4" />
                      <div className="h-3 bg-white/15 rounded w-1/2 mt-1" />
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          </AnimatePresence>

          {/* View all link */}
          <Link href="/magaza" className="mt-2.5 shrink-0 text-[10px] tracking-[0.20em] uppercase text-white/30 hover:text-[#FAFAFA] transition-colors flex items-center gap-1.5 font-mono">
            Tüm Ürünleri Gör <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

      </div>

      {/* Mobile marquee — hero içinde, altta */}
      <MobileMarquee products={products} />
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

  const promoImage = items[0]?.images?.[0] || '/uploads/products/header_ithal-caki-1.png';

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
            <img
              src={promoImage}
              alt="Premium Bıçak Koleksiyonu"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover opacity-55"
            />
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

  const visible = cats
    .filter(c => (c.displayOrder ?? 0) < 100)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .slice(0, 7);

  const fallbackImage = (slug: string) =>
    CATS.find(c => c.slug === slug)?.image ?? null;

  const countFor = (id: string) =>
    products.filter(p => (p as any).categoryIds?.includes(id) || p.categoryId === id).length;

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
                    <img
                      src={p.images?.[0] || ''}
                      alt={p.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    {/* Badge */}
                    <FreeShippingBadge
                      className="absolute bottom-2.5 left-2.5 z-10"
                      size="compact"
                      productPrice={price}
                      threshold={freeShippingThreshold}
                    />
                    {!isFreeShippingPromotion(p.discountBadge) && p.discountBadge && (
                      <div className="absolute top-2.5 left-2.5 bg-[#141414] text-white text-[9px] font-bold tracking-[0.16em] uppercase px-2 py-1">
                        {p.discountBadge}
                      </div>
                    )}
                    {p.isNew && !p.discountBadge && (
                      <div className="storefront-new-badge storefront-new-badge--compact absolute top-2.5 left-2.5">
                        Yeni
                      </div>
                    )}
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
  const items = (rawItems.length ? rawItems : DEFAULT_HOMEPAGE_CONTENT.trustItems)
    .filter(i => i.isActive !== false)
    .map(i => ({ ...i, iconComp: TRUST_ICONS[i.icon] ?? Star }));

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
          return (
            <Link
              key={`${p.id}-${i}`}
              href={`/urun/${p.slug}`}
              className="group shrink-0 w-32 flex flex-col bg-white/[0.06] border border-white/[0.08] overflow-hidden hover:border-[#FAFAFA]/50 transition-colors"
              data-testid={`link-marquee-product-${p.id}`}
            >
              <div className="relative w-32 h-40 overflow-hidden bg-black/20 shrink-0">
                {p.images?.[0] ? (
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
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
        <HeroSlider products={products} slides={activeSlides} />
        {content.sectionOrder
          .filter(s => s.isActive !== false)
          .map(s => sections[s.id] ?? null)}
      </main>
      <Footer />
    </>
  );
}
