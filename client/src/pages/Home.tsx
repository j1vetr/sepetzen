import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { ProductCard } from '@/components/ProductCard';
import { Link } from 'wouter';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useReducedMotion,
  MotionConfig,
} from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useProducts, type Product } from '@/hooks/useProducts';
import heroPosterImage from '@assets/generated_images/polen-hero-dark-1.png';

const HERO_VIDEO_DESKTOP = '/videos/polen-hero.mp4';
const HERO_VIDEO_MOBILE = '/videos/polen-hero-mobile.mp4';

// UTILITIES

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return Math.abs(h);
}

function formatPrice(p: string | number) {
  const n = typeof p === 'string' ? parseFloat(p || '0') : p;
  return n.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
}

// REVEAL WORD — text reveal animation

function RevealWord({
  text,
  delay = 0,
  className = '',
}: {
  text: string;
  delay?: number;
  className?: string;
}) {
  return (
    <span className={`inline-block overflow-hidden align-bottom ${className}`}>
      <motion.span
        initial={{ y: '110%' }}
        animate={{ y: '0%' }}
        transition={{ duration: 1.05, delay, ease: [0.16, 1, 0.3, 1] }}
        className="inline-block"
      >
        {text}
      </motion.span>
    </span>
  );
}

// Gate that defers children until after first paint so framer-motion's useScroll can safely attach to DOM refs.
function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => {
    setM(true);
  }, []);
  return m;
}

// SCENE 01 — HERO (cinematic)

function HeroScene() {
  const mounted = useMounted();
  const prefersReduced = useReducedMotion();
  if (!mounted || prefersReduced) return <HeroSceneStatic />;
  return <HeroSceneInner />;
}

function HeroSceneStatic() {
  return (
    <section
      className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-black lg:h-[calc(100svh-200px)] lg:min-h-[560px]"
      aria-label="Sepetzen tanıtım"
    >
      <img
        src={heroPosterImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      <HeroOverlayContent />
    </section>
  );
}

function HeroVideoLazy() {
  const [show, setShow] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    setIsMobile(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', onChange);
    const id = window.setTimeout(() => setShow(true), mql.matches ? 450 : 900);
    return () => {
      window.clearTimeout(id);
      mql.removeEventListener('change', onChange);
    };
  }, []);
  if (!show || isMobile === null) return null;
  const src = isMobile ? HERO_VIDEO_MOBILE : HERO_VIDEO_DESKTOP;
  return (
    <video
      key={src}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      poster={heroPosterImage}
      className="absolute inset-0 w-full h-full object-cover"
      aria-hidden="true"
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

function HeroSceneInner() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(pointer: coarse), (max-width: 1023px)');
    const update = () => setIsTouch(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  const videoY = useTransform(scrollYProgress, [0, 1], ['0%', isTouch ? '0%' : '20%']);
  const titleY = useTransform(scrollYProgress, [0, 1], ['0%', isTouch ? '0%' : '-30%']);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.7], [1, isTouch ? 1 : 0]);

  return (
    <section
      ref={heroRef}
      className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-black text-white lg:h-[calc(100svh-200px)] lg:min-h-[560px]"
      data-testid="scene-hero"
    >
      <motion.div className="absolute inset-0 z-0" style={{ y: videoY }}>
        <img
          src={heroPosterImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <HeroVideoLazy />
        {/* %50 sabit siyah örtü — başlığın okunabilirliği için */}
        <div className="absolute inset-0 bg-black/50" />
        {/* CTA bölgesinde ekstra kontrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </motion.div>

      <motion.div
        className="absolute inset-0 z-10"
        style={{ y: titleY, opacity: titleOpacity }}
      >
        <HeroOverlayContent animated />
      </motion.div>
    </section>
  );
}

// HERO ÜZERİNDE BAŞLIK & CTA — masaüstü ve mobil için ayrı içerikler
function HeroOverlayContent({ animated = false }: { animated?: boolean }) {
  const Wrap: any = animated ? motion.div : 'div';
  const wrapProps = animated
    ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: 0.4, duration: 1.0, ease: [0.16, 1, 0.3, 1] },
      }
    : {};

  return (
    <div className="relative h-full w-full">
      {/* ── MOBİL — kısa ve vurucu ── */}
      <div className="lg:hidden h-full w-full flex flex-col items-center justify-center text-center px-6">
        <Wrap {...wrapProps}>
          <h1
            className="font-display text-white uppercase leading-[1.0]"
            style={{ fontSize: 'clamp(48px, 13vw, 72px)', letterSpacing: '-0.02em', fontWeight: 700 }}
            data-testid="text-hero-title-mobile"
          >
            <span className="block">SEPET<span className="text-[#4a9a42]">ZEN</span></span>
            <span className="block text-[#4a9a42] mt-2" style={{ fontSize: 'clamp(14px, 3.5vw, 20px)', letterSpacing: '0.25em', fontWeight: 400 }}>OUTDOOR GEAR</span>
          </h1>
          <p className="mt-5 text-[11px] tracking-[0.22em] uppercase text-white/75 font-mono">
            Kamp · Outdoor · Bıçak · Bağ & Bahçe
          </p>
          <Link
            href="/magaza"
            data-testid="link-hero-cta-mobile"
            className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-[#2D5A27] text-white text-[11px] tracking-[0.22em] uppercase font-semibold hover:bg-[#2D5A27]/90 transition-colors"
          >
            Ürünleri Keşfet
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </Wrap>
      </div>

      {/* ── MASAÜSTÜ — başlık tek satır, içerik tam ortada ── */}
      <div className="hidden lg:flex h-full w-full items-center justify-center">
        <div className="w-full max-w-[1500px] mx-auto px-10 py-16 xl:py-20 text-center">
          <Wrap {...wrapProps} className="flex flex-col items-center">
            <h1
              className="font-display text-white uppercase"
              style={{
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                fontWeight: 700,
              }}
              data-testid="text-hero-title"
            >
              <span style={{ fontSize: 'clamp(56px, 6.2vw, 112px)', display: 'block' }}>
                SEPET<span className="text-[#4a9a42]">ZEN</span>
              </span>
              <span
                className="text-[#4a9a42]"
                style={{ fontSize: 'clamp(14px, 1.5vw, 26px)', letterSpacing: '0.35em', fontWeight: 400, display: 'block', marginTop: '10px' }}
              >
                OUTDOOR GEAR
              </span>
            </h1>

            <span aria-hidden className="block w-16 h-px bg-[#2D5A27] mt-8 mb-6" />

            <p className="max-w-[640px] text-[14px] xl:text-[15px] leading-relaxed text-white/80">
              Av bıçakları, kamp çakıları, outdoor ekipmanları ve bağ & bahçe ürünleri. Dalaman'dan Türkiye'nin dört bir yanına güvenli teslimat.
            </p>

            <Link
              href="/magaza"
              data-testid="link-hero-cta"
              className="inline-flex items-center gap-3 mt-10 px-8 py-4 bg-[#2D5A27] text-white text-[12px] tracking-[0.24em] uppercase font-semibold hover:bg-[#2D5A27]/90 transition-colors"
            >
              Ürünleri Keşfet
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </Wrap>
        </div>
      </div>
    </div>
  );
}

// SCENE 02 — AUTO-SLIDE SHOWCASE (yatay otomatik kayan vitrin)

function PinnedShowcaseScene({ products }: { products: Product[] }) {
  const items = useMemo(() => {
    if (!products?.length) return [];
    const featured = products.filter((p) => p.isFeatured && p.images?.length);
    const news = products.filter((p) => p.isNew && !p.isFeatured && p.images?.length);
    const rest = products.filter((p) => !p.isFeatured && !p.isNew && p.images?.length);
    return [...featured, ...news, ...rest].slice(0, 16);
  }, [products]);

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <section
      className="relative bg-[#0c0a09] text-white py-14 lg:py-20 overflow-hidden border-y border-white/10"
      data-testid="scene-showcase"
      aria-label="Vitrin — öne çıkan ürünler"
    >
      <div className="px-5 lg:px-10 mb-8 lg:mb-10 flex items-center justify-between text-[10px] font-mono tracking-[0.28em] uppercase text-white/55">
        <span>— 02 / Vitrin</span>
        <Link
          href="/magaza"
          data-testid="link-showcase-all"
          className="hover:text-[#4a9a42] transition-colors inline-flex items-center gap-2"
          aria-label="Tüm ürünleri gör"
        >
          Tümü <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="relative">
        {/* Sağ ve sol fade mask: kartların sert kesilmesi yerine zarifçe sönmesi için */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 lg:w-24 bg-gradient-to-r from-[#0c0a09] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 lg:w-24 bg-gradient-to-l from-[#0c0a09] to-transparent" />
        <div className="flex animate-marquee-hero">
          {[0, 1].map((groupIdx) => (
            <div
              key={groupIdx}
              className="flex gap-5 lg:gap-8 pr-5 lg:pr-8 shrink-0"
              aria-hidden={groupIdx === 1 ? true : undefined}
            >
              {items.map((p, i) => (
                <Link
                  key={`${groupIdx}-${p.id}-${i}`}
                  href={`/urun/${p.slug}`}
                  data-testid={`link-showcase-product-${p.id}-${groupIdx}-${i}`}
                  aria-label={`${p.name} ürün sayfası`}
                  className="group shrink-0 w-[260px] lg:w-[340px]"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900">
                    <img
                      src={p.images?.[0] || ''}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
                    {p.discountBadge && (
                      <div className="absolute top-3 right-3 bg-[#2D5A27] text-white text-[10px] font-bold tracking-[0.2em] px-2 py-1 uppercase">
                        {p.discountBadge}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-5 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/55 mb-1">
                          Sepetzen
                        </div>
                        <div className="text-sm lg:text-base font-medium text-white truncate">
                          {p.name}
                        </div>
                      </div>
                      <div className="text-sm lg:text-base font-semibold text-[#4a9a42] whitespace-nowrap">
                        {formatPrice(p.basePrice)} ₺
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// SCENE 03 — PRODUCTS GRID (sade ürün listesi)

function ProductGridScene({ products }: { products: Product[] }) {
  const items = useMemo(() => {
    if (!products?.length) return [];
    const pool = products.filter((p) => p.images?.length);
    const seed = 1729;
    const shuffled = [...pool]
      .map((p, i) => ({ p, key: hashStr(`${p.id}:${seed}:${i}`) }))
      .sort((a, b) => a.key - b.key)
      .map((x) => x.p);
    return shuffled.slice(0, 12);
  }, [products]);

  if (items.length === 0) return null;

  return (
    <section
      className="relative bg-[hsl(var(--polen-cream))] text-black py-16 lg:py-24 px-5 lg:px-10"
      data-testid="scene-product-grid"
      aria-label="Ürünler"
    >
      <div className="max-w-[1320px] mx-auto flex items-end justify-between mb-8 lg:mb-12 gap-6">
        <div>
          <div className="text-[10px] font-mono tracking-[0.28em] uppercase text-black/45 mb-3">
            — 03 / Ürünler
          </div>
          <h2
            className="font-display uppercase text-black leading-[0.95]"
            style={{
              fontSize: 'clamp(28px, 4vw, 56px)',
              letterSpacing: '-0.02em',
            }}
          >
            Sepetzen Koleksiyonu
          </h2>
        </div>
        <Link
          href="/magaza"
          data-testid="link-grid-all"
          className="shrink-0 inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.24em] uppercase text-black/70 hover:text-[#4a9a42] transition-colors"
          aria-label="Tüm ürünleri gör"
        >
          Tümünü Gör <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="max-w-[1320px] mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

// SCENE 04 — STATEMENT MARQUEE STRIP

function StatementMarqueeScene() {
  const items = [
    'SEPETZEN',
    '◆',
    'EL YAPIMI BIÇAKLAR',
    '✦',
    'OUTDOOR EKİPMANLARI',
    '◆',
    'KAMP ÇAKILARI',
    '✦',
    'BAHÇE ALETLERİ',
    '◆',
    'DOĞAL MALZEME',
    '✦',
    'TÜRK USTALIGI',
    '◆',
  ];
  const doubled = [...items, ...items, ...items];

  return (
    <section
      className="relative bg-[#2D5A27] text-white overflow-hidden border-y border-white/10"
      data-testid="scene-statement-marquee"
      aria-label="Marka bilgi şeridi"
    >
      <div className="py-6 lg:py-9 overflow-hidden">
        <div
          className="flex items-center gap-7 lg:gap-12 animate-marquee whitespace-nowrap"
          style={{ animationDuration: '14s' }}
        >
          {doubled.map((t, i) => (
            <span
              key={i}
              className={`font-display uppercase ${
                t.length === 1
                  ? 'text-[#4a9a42] text-base lg:text-xl'
                  : 'text-base lg:text-2xl tracking-[0.04em]'
              }`}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// SCENE 05 — FINAL CTA (footer-preceding)

function FinalCtaScene() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  return (
    <section
      ref={ref}
      className="relative bg-[hsl(var(--polen-cream))] text-black py-24 lg:py-36 px-5 lg:px-10 overflow-hidden"
      data-testid="scene-final-cta"
    >
      <div className="max-w-[1320px] mx-auto">
        <div className="text-[10px] font-mono tracking-[0.28em] uppercase text-black/45 mb-8">
          — 04 / Davet
        </div>
        <h2
          className="font-display uppercase text-black leading-[0.92]"
          style={{
            fontSize: 'clamp(40px, 6vw, 110px)',
            letterSpacing: '-0.03em',
          }}
        >
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="block"
          >
            Doğanın ruhunu
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="block"
          >
            kapınıza
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="block text-[#4a9a42]"
          >
            getiriyoruz.
          </motion.span>
        </h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 lg:mt-16 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8"
        >
          <p className="max-w-[560px] text-base lg:text-lg text-black/65 leading-relaxed">
            Av bıçakları, kamp çakıları ve outdoor ekipmanlarını kapınıza getiriyoruz.
            Dalaman'dan Türkiye'nin dört bir yanına hızlı ve güvenli teslimat.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-8">
            <Link
              href="/magaza"
              data-testid="link-final-cta-shop"
              data-cursor="cta"
              data-cursor-label="Keşfet"
              aria-label="Tüm koleksiyonu keşfet"
              className="group inline-flex items-center gap-4"
            >
              <span className="inline-flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-black text-white group-hover:bg-[#2D5A27] transition-colors">
                <ArrowUpRight className="w-6 h-6 lg:w-7 lg:h-7" />
              </span>
              <span className="text-sm lg:text-base font-medium tracking-[0.18em] uppercase text-black group-hover:text-[#4a9a42] transition-colors">
                Koleksiyonu Keşfet
              </span>
            </Link>
            <a
              href="https://wa.me/905000000000"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-final-cta-whatsapp"
              data-cursor="cta"
              data-cursor-label="WhatsApp"
              aria-label="WhatsApp üzerinden iletişime geç"
              className="group inline-flex items-center gap-4"
            >
              <span className="inline-flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 rounded-full border border-black/25 text-black group-hover:bg-black group-hover:text-white transition-colors">
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6 lg:w-7 lg:h-7 fill-current"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M19.05 4.91A10 10 0 0 0 12 2a10 10 0 0 0-8.66 14.95L2 22l5.21-1.34A10 10 0 0 0 22 12a9.93 9.93 0 0 0-2.95-7.09Zm-7.05 15A8.07 8.07 0 0 1 7.9 18.7l-.28-.17-3.09.79.83-3-.18-.3a8 8 0 1 1 6.82 3.86Zm4.41-5.96c-.24-.12-1.42-.7-1.64-.78s-.38-.12-.54.12-.62.78-.76.94-.28.18-.52.06a6.6 6.6 0 0 1-1.95-1.2 7.32 7.32 0 0 1-1.35-1.68c-.14-.24 0-.37.1-.49s.24-.28.36-.42a1.65 1.65 0 0 0 .24-.4.44.44 0 0 0 0-.42c-.06-.12-.54-1.3-.74-1.78s-.39-.4-.54-.41h-.46a.89.89 0 0 0-.64.3 2.7 2.7 0 0 0-.84 2c0 1.18.86 2.32.98 2.48s1.69 2.59 4.1 3.63a13.8 13.8 0 0 0 1.37.51 3.31 3.31 0 0 0 1.51.1 2.48 2.48 0 0 0 1.62-1.14 2 2 0 0 0 .14-1.14c-.06-.12-.22-.18-.46-.3Z" />
                </svg>
              </span>
              <span className="text-sm lg:text-base font-medium tracking-[0.18em] uppercase text-black group-hover:text-[#4a9a42] transition-colors">
                WhatsApp
              </span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// MAIN — Home page

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
      <MotionConfig reducedMotion="user">
        <main className="bg-black">
          <HeroScene />
          <PinnedShowcaseScene products={products} />
          <ProductGridScene products={products} />
          <StatementMarqueeScene />
          <FinalCtaScene />
        </main>
      </MotionConfig>
      <Footer />
    </>
  );
}
