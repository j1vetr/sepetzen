import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { ProductCard } from '@/components/ProductCard';
import { Link } from 'wouter';
import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { ArrowUpRight, Truck, ShieldCheck, Star, ChevronLeft, ChevronRight, Instagram } from 'lucide-react';
import { useProducts, type Product } from '@/hooks/useProducts';

// ─── HERO SLIDER ─────────────────────────────────────────────────────────────

const HERO_SLIDES = [
  {
    image: '/uploads/products/header_av-cakisi.png',
    eyebrow: 'Av & Outdoor',
    title: 'Av Bıçakları',
    desc: 'El yapımı, yüksek karbonlu çelik - her avcının yanında.',
    href: '/kategori/bicaklar',
    cta: 'Koleksiyonu Gör',
    bg: '#0d1a0c',
  },
  {
    image: '/uploads/products/header_kamp-bicagi.png',
    eyebrow: 'Kamp & Doğa',
    title: 'Kamp Çakıları',
    desc: 'Kompakt, dayanıklı ve çok fonksiyonlu - doğanın ortasında güvende.',
    href: '/kategori/cakilar',
    cta: 'Modelleri İncele',
    bg: '#0a1010',
  },
  {
    image: '/uploads/products/header_bag-bahce.png',
    eyebrow: 'Bağ & Bahçe',
    title: 'Bahçe Aletleri',
    desc: 'Profesyonel budama, kazıma ve bakım aletleri koleksiyonu.',
    href: '/kategori/bag-bahce-aletleri',
    cta: 'Ürünlere Bak',
    bg: '#0c140b',
  },
];

function HeroSlider({ products }: { products: Product[] }) {
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(1);
  const [cardsKey, setCardsKey] = useState(0);
  const [pickedProducts, setPickedProducts] = useState<Product[]>([]);
  const slideTimer = useRef<ReturnType<typeof setTimeout>>();
  const cardTimer = useRef<ReturnType<typeof setInterval>>();

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

  return (
    <section
      className="relative w-full overflow-hidden bg-[#0c0a09] hero-section flex flex-col"
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
          />
          {/* Left-heavy vignette so right panel is darker */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25" />
        </motion.div>
      </AnimatePresence>

      {/* Split layout */}
      <div className="relative z-10 flex-1 min-h-0 max-w-[1400px] mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-0">

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
              <span className="inline-block text-[10px] tracking-[0.30em] uppercase text-[#4a9a42] font-mono mb-4">
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
                    className="inline-flex items-center gap-3 px-7 py-3.5 bg-[#2D5A27] text-white text-[11px] tracking-[0.22em] uppercase font-bold hover:bg-[#4a9a42] transition-colors cursor-pointer"
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
                  style={{ width: i === active ? 40 : 16, backgroundColor: i === active ? '#4a9a42' : 'rgba(255,255,255,0.22)' }}
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

        {/* ── RIGHT: Random product cards (desktop only) — dikey portrait, tam yükseklik ── */}
        <div className="hidden lg:flex flex-col pl-5 xl:pl-8 pt-[72px] pb-10">
          {/* Label */}
          <div className="flex items-center justify-between mb-2 shrink-0">
            <span className="text-[9px] font-mono tracking-[0.26em] uppercase text-white/30">Öne Çıkan</span>
            <span className="text-[9px] font-mono text-white/20">↻ 7s</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={cardsKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-2.5 flex-1 min-h-0"
            >
              {pickedProducts.length > 0 ? pickedProducts.map((p) => {
                const price = parseFloat(String(p.basePrice || '0')) || 0;
                return (
                  <Link key={p.id} href={`/urun/${p.slug}`} className="flex flex-1 min-h-0" data-testid={`link-hero-product-${p.id}`}>
                    <div className="group flex flex-col w-full bg-white/[0.07] hover:bg-white/[0.11] border border-white/[0.09] hover:border-white/[0.22] backdrop-blur-sm transition-all duration-300 cursor-pointer overflow-hidden">
                      {/* Image — fills remaining height */}
                      <div className="relative overflow-hidden bg-black/25 flex-1 min-h-0">
                        {p.images?.[0] ? (
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-white/5" />
                        )}
                        {/* Gradient overlay at bottom */}
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                        {/* Badge */}
                        {(p.isNew || p.discountBadge) && (
                          <span className="absolute top-2 left-2 text-[7.5px] tracking-[0.18em] uppercase text-white bg-[#2D5A27] px-2 py-0.5 font-bold">
                            {p.isNew ? 'Yeni' : p.discountBadge}
                          </span>
                        )}
                      </div>
                      {/* Info — fixed height at bottom */}
                      <div className="p-3 shrink-0 bg-black/30">
                        <p className="text-[11.5px] font-medium text-white/85 group-hover:text-white transition-colors leading-snug line-clamp-2 mb-1.5">
                          {p.name}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-[14px] font-bold text-[#4a9a42]">
                            {price.toLocaleString('tr-TR')} ₺
                          </p>
                          <span className="text-[9px] tracking-[0.15em] uppercase text-white/40 group-hover:text-[#4a9a42] transition-colors font-medium flex items-center gap-1">
                            Görüntüle <ArrowUpRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              }) : (
                // Skeleton while loading - portrait format, tam yükseklik
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex-1 min-h-0 flex flex-col bg-white/[0.04] border border-white/[0.06] overflow-hidden animate-pulse">
                    <div className="flex-1 bg-white/10" />
                    <div className="p-3 bg-black/20 shrink-0 space-y-2">
                      <div className="h-2.5 bg-white/10 rounded w-full" />
                      <div className="h-2.5 bg-white/10 rounded w-3/4" />
                      <div className="h-3.5 bg-white/15 rounded w-1/2 mt-1" />
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          </AnimatePresence>

          {/* View all link */}
          <Link href="/magaza" className="mt-2.5 shrink-0 text-[10px] tracking-[0.20em] uppercase text-white/30 hover:text-[#4a9a42] transition-colors flex items-center gap-1.5 font-mono">
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

  return (
    <section
      ref={ref}
      className="bg-[#f5f3ef] py-16 lg:py-24 px-5 lg:px-10"
      data-testid="scene-featured"
    >
      <div className="max-w-[1320px] mx-auto">
        {/* Heading */}
        <div className="flex items-end justify-between mb-10 lg:mb-14">
          <div>
            <p className="text-[10px] font-mono tracking-[0.30em] uppercase text-black/40 mb-2">Seçtiklerimiz</p>
            <h2
              className="font-black text-black leading-none"
              style={{ fontSize: 'clamp(28px, 4vw, 52px)', letterSpacing: '-0.03em' }}
            >
              Öne Çıkan Ürünler
            </h2>
          </div>
          <Link
            href="/magaza"
            data-testid="link-featured-all"
            className="hidden sm:inline-flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase font-semibold text-black/50 hover:text-[#2D5A27] transition-colors"
          >
            Tümünü Gör <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {items.map((p, i) => (
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

        <div className="mt-10 text-center sm:hidden">
          <Link href="/magaza" className="inline-flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase font-semibold text-[#2D5A27]">
            Tüm Ürünlere Bak <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
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
    accent: '#4a9a42',
  },
  {
    name: 'Bıçaklar',
    slug: 'bicaklar',
    desc: 'Av & Mutfak Bıçakları',
    image: '/uploads/products/header_av-cakisi.png',
    accent: '#4a9a42',
  },
  {
    name: 'Kamp & Outdoor',
    slug: 'kamp-outdoor-ekipmanlari',
    desc: 'Doğa Ekipmanları',
    image: '/uploads/products/header_kamp-bicagi.png',
    accent: '#34d399',
  },
  {
    name: 'Bağ & Bahçe',
    slug: 'bag-bahce-aletleri',
    desc: 'Tarım & Bahçe Aletleri',
    image: '/uploads/products/header_bag-bahce.png',
    accent: '#84cc16',
  },
  {
    name: 'Mangal & Izgara',
    slug: 'mangal-izgara-ahsap',
    desc: 'BBQ & Ahşap Ürünler',
    image: '/uploads/products/header_izgara.png',
    accent: '#f59e0b',
  },
  {
    name: 'Nalbur & Hırdavat',
    slug: 'nalbur-hirdavat',
    desc: 'El Aletleri & Donanım',
    image: '/uploads/products/header_mangal-aksesuar.png',
    accent: '#9ca3af',
  },
];

function CategoriesSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section
      ref={ref}
      className="bg-[#0c0a09] py-16 lg:py-24 px-5 lg:px-10"
      data-testid="scene-categories"
    >
      <div className="max-w-[1320px] mx-auto">
        <div className="flex items-end justify-between mb-10 lg:mb-14">
          <div>
            <p className="text-[10px] font-mono tracking-[0.30em] uppercase text-white/35 mb-2">Koleksiyon</p>
            <h2
              className="font-black text-white leading-none"
              style={{ fontSize: 'clamp(28px, 4vw, 52px)', letterSpacing: '-0.03em' }}
            >
              Kategoriler
            </h2>
          </div>
          <Link
            href="/magaza"
            className="hidden sm:inline-flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase font-semibold text-white/35 hover:text-white transition-colors"
          >
            Tümü <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Grid: 3+3 on desktop, 2 cols mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {CATS.map((cat, i) => (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.05 }}
              transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className={i === 0 ? 'lg:col-span-2 lg:row-span-2' : ''}
            >
              <Link
                href={`/kategori/${cat.slug}`}
                data-testid={`link-cat-${cat.slug}`}
                className="group relative flex overflow-hidden bg-zinc-900 block"
                style={{
                  height: i === 0 ? undefined : undefined,
                  aspectRatio: i === 0 ? '16/10' : '4/3',
                }}
              >
                {/* Image */}
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-65 group-hover:opacity-80"
                />
                {/* Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Content */}
                <div className="relative z-10 mt-auto p-4 lg:p-6 w-full">
                  <p className="text-[9px] lg:text-[10px] tracking-[0.24em] uppercase font-mono mb-1.5"
                    style={{ color: cat.accent }}>
                    {cat.desc}
                  </p>
                  <h3 className={`font-black text-white leading-none tracking-tight ${i === 0 ? 'text-[22px] lg:text-[32px]' : 'text-[16px] lg:text-[20px]'}`}>
                    {cat.name}
                  </h3>
                  <span className="mt-2 lg:mt-3 inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-white/40 group-hover:text-white/80 transition-colors">
                    Keşfet <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── NEW ARRIVALS ─────────────────────────────────────────────────────────────

function NewArrivals({ products }: { products: Product[] }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });
  const items = useMemo(() => {
    return products.filter(p => (p.isNew || p.discountBadge) && p.images?.length).slice(0, 4);
  }, [products]);

  if (!items.length) return null;

  return (
    <section
      ref={ref}
      className="bg-[#0f1a0d] py-16 lg:py-24 px-5 lg:px-10"
      data-testid="scene-new-arrivals"
    >
      <div className="max-w-[1320px] mx-auto">
        <div className="flex items-end justify-between mb-10 lg:mb-14">
          <div>
            <p className="text-[10px] font-mono tracking-[0.30em] uppercase text-[#4a9a42] mb-2">Yeni</p>
            <h2
              className="font-black text-white leading-none"
              style={{ fontSize: 'clamp(28px, 4vw, 52px)', letterSpacing: '-0.03em' }}
            >
              Yeni Gelenler
            </h2>
          </div>
          <Link
            href="/magaza?isNew=1"
            className="hidden sm:inline-flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase font-semibold text-white/35 hover:text-[#4a9a42] transition-colors"
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
                    {p.discountBadge && (
                      <div className="absolute top-2.5 left-2.5 bg-[#2D5A27] text-white text-[9px] font-bold tracking-[0.16em] uppercase px-2 py-1">
                        {p.discountBadge}
                      </div>
                    )}
                    {p.isNew && !p.discountBadge && (
                      <div className="absolute top-2.5 left-2.5 bg-white text-black text-[9px] font-bold tracking-[0.16em] uppercase px-2 py-1">
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
                    <p className="text-[13px] lg:text-[14px] font-semibold text-white leading-snug line-clamp-2 mb-1.5 group-hover:text-[#4a9a42] transition-colors">
                      {p.name}
                    </p>
                    <p className="text-[15px] font-bold text-[#4a9a42]">
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

// ─── TRUST STRIP ─────────────────────────────────────────────────────────────

function TrustStrip() {
  const items = [
    {
      icon: Truck,
      title: '1.500 ₺ Üzeri Ücretsiz Kargo',
      desc: 'Türkiye genelinde hızlı ve güvenli teslimat.',
    },
    {
      icon: ShieldCheck,
      title: 'Güvenli Ödeme',
      desc: 'SSL korumalı, 3D Secure destekli ödeme altyapısı.',
    },
    {
      icon: Star,
      title: 'Orijinal ve Kaliteli Ürünler',
      desc: 'Türk zanaatkâr işçiliğiyle özenle üretilmiş.',
    },
  ];
  return (
    <section className="bg-[#0f1a0e] border-t border-white/[0.07]" data-testid="scene-trust">
      <div className="max-w-[1100px] mx-auto px-5 lg:px-10">
        <div className="grid grid-cols-1 sm:grid-cols-3">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={[
                  'flex items-center gap-4 py-7 lg:py-10',
                  i < items.length - 1 ? 'border-b sm:border-b-0 sm:border-r border-white/[0.07]' : '',
                  i > 0 ? 'sm:pl-8 lg:pl-12' : '',
                  i < items.length - 1 ? 'sm:pr-8 lg:pr-12' : '',
                ].join(' ')}
              >
                <div className="w-11 h-11 rounded-sm bg-[#2D5A27]/20 border border-[#2D5A27]/30 flex items-center justify-center shrink-0">
                  <Icon className="w-[19px] h-[19px] text-[#4a9a42]" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white/90 leading-snug tracking-[0.01em]">
                    {item.title}
                  </p>
                  <p className="text-[11.5px] text-white/42 mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
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
      className="block lg:hidden bg-[#0c0a09] overflow-hidden py-4 border-t border-white/[0.06]"
      data-testid="scene-mobile-marquee"
    >
      <div className="marquee-track gap-3 px-3">
        {doubled.map((p, i) => {
          const price = parseFloat(String(p.basePrice || '0')) || 0;
          return (
            <Link
              key={`${p.id}-${i}`}
              href={`/urun/${p.slug}`}
              className="group shrink-0 w-32 flex flex-col bg-white/[0.06] border border-white/[0.08] overflow-hidden hover:border-[#4a9a42]/50 transition-colors"
              data-testid={`link-marquee-product-${p.id}`}
            >
              <div className="relative w-32 h-40 overflow-hidden bg-black/20 shrink-0">
                {p.images?.[0] ? (
                  <img
                    src={p.images[0]}
                    alt={p.name}
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
                <p className="text-[12px] font-bold text-[#4a9a42]">
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

  return (
    <>
      <SEO
        title="Sepetzen – Kamp, Outdoor, Bıçak ve Bağ & Bahçe"
        description="Sepetzen, av bıçakları, kamp çakıları, outdoor ekipmanları ve bağ & bahçe ürünleri sunan Türk outdoor markasıdır. Dalaman'dan Türkiye geneline hızlı teslimat."
        url="/"
      />
      <Header />
      <main>
        <HeroSlider products={products} />
        <FeaturedProducts products={products} />
        <CategoriesSection />
        <NewArrivals products={products} />
        <TrustStrip />
      </main>
      <Footer />
    </>
  );
}
