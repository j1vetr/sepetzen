import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { Link } from 'wouter';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  MotionConfig,
} from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ArrowRight, Plus } from 'lucide-react';
import { useProducts, type Product } from '@/hooks/useProducts';
import { getOriginalPrice } from '@/lib/discountPrice';
import heroPosterImage from '@assets/generated_images/polen-hero-dark-1.png';

const HERO_VIDEO_DESKTOP = '/videos/polen-hero.mp4';
const HERO_VIDEO_MOBILE = '/videos/polen-hero-mobile.mp4';

interface MenuItemData {
  id: string;
  title: string;
  type: 'category' | 'link' | 'submenu';
  categoryId: string | null;
  url: string | null;
  parentId: string | null;
  displayOrder: number;
  isActive: boolean;
  category?: { id: string; name: string; slug: string } | null;
  children?: MenuItemData[];
}

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

function getRootCategoryIds(root: MenuItemData): string[] {
  const ids: string[] = [];
  if (root.type === 'category' && root.category) ids.push(root.category.id);
  (root.children || []).forEach((c) => {
    if (c.type === 'category' && c.category) ids.push(c.category.id);
  });
  return ids;
}

function getRootHref(root: MenuItemData): string {
  if (root.type === 'category' && root.category) return `/kategori/${root.category.slug}`;
  if (root.type === 'link' && root.url) return root.url;
  // submenu: pick first child category
  const firstChild = (root.children || []).find((c) => c.type === 'category' && c.category);
  if (firstChild?.category) return `/kategori/${firstChild.category.slug}`;
  return '/magaza';
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
      className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-black flex items-center justify-center"
      aria-label="Polen Stone tanıtım"
    >
      <img
        src={heroPosterImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-80"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/80" />
      <div className="relative z-10 text-center px-5">
        <h1
          className="font-display text-white leading-[0.86] uppercase"
          style={{
            fontSize: 'clamp(72px, 18vw, 320px)',
            letterSpacing: '-0.04em',
            fontWeight: 700,
          }}
          data-testid="text-hero-title"
        >
          <span className="block">POLEN</span>
          <span className="block text-polen-orange" style={{ marginTop: '-0.18em' }}>
            STONE
          </span>
        </h1>
        <p className="mt-5 lg:mt-7 max-w-[520px] mx-auto text-[12px] lg:text-[13px] tracking-[0.18em] uppercase text-white/65 font-mono">
          Mermer · Granit · Traverten · Oniks
        </p>
      </div>
    </section>
  );
}

function HeroVideoLazy() {
  const [show, setShow] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  useEffect(() => {
    // Pick the right asset up-front so we never download both the 3.7MB desktop
    // file and the 900KB mobile file. On mobile we shorten the defer so the
    // hero warms up under ~3s after first paint.
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

  // Skip per-frame parallax transforms on touch devices — they cause
  // composited reflow during native momentum scroll on iOS Safari and Android
  // Chrome and produce visible jank in the hero.
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

  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} GMT+3`,
      );
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-black text-white"
      data-testid="scene-hero"
    >
      {/* Background video — lazy: poster shows immediately, source attaches after first paint */}
      <motion.div className="absolute inset-0 z-0" style={{ y: videoY }}>
        <img
          src={heroPosterImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <HeroVideoLazy />
        {/* Gradient veils */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/30" />
      </motion.div>

      {/* Top eyebrow row */}
      <div className="absolute top-0 left-0 right-0 z-20 px-5 lg:px-10 pt-24 lg:pt-12 flex items-center justify-between text-white/65 text-[10px] font-mono tracking-[0.28em] uppercase">
        <motion.span
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          ◢ Anadolu — Doğal Taş Atölyesi
        </motion.span>
        <motion.span
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="hidden md:inline"
        >
          {time || '—'}
        </motion.span>
      </div>

      {/* Centered wordmark */}
      <motion.div
        className="absolute inset-0 z-10 flex items-center justify-center px-5"
        style={{ y: titleY, opacity: titleOpacity }}
      >
        <div className="text-center">
          <h1
            className="font-display text-white leading-[0.86] uppercase"
            style={{
              fontSize: 'clamp(72px, 18vw, 320px)',
              letterSpacing: '-0.04em',
              fontWeight: 700,
            }}
            data-testid="text-hero-title"
          >
            <span className="block">
              <RevealWord text="POLEN" delay={0.2} />
            </span>
            <span
              className="block text-polen-orange"
              style={{ marginTop: '-0.18em' }}
            >
              <RevealWord text="STONE" delay={0.4} />
            </span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 lg:mt-7 max-w-[520px] mx-auto text-[12px] lg:text-[13px] tracking-[0.18em] uppercase text-white/65 font-mono"
          >
            Mermer · Granit · Traverten · Oniks
          </motion.p>
        </div>
      </motion.div>

      {/* Bottom row: stats + scroll cue */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-5 lg:px-10 pb-8 lg:pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6"
        >
          {/* Left: stats */}
          <div className="grid grid-cols-3 gap-6 lg:gap-12 text-white max-w-[640px]">
            {[
              { n: '08', l: 'Koleksiyon' },
              { n: '81', l: 'İl Teslimat' },
              { n: '∞', l: 'Damar Deseni' },
            ].map((s) => (
              <div key={s.l}>
                <div className="font-display text-3xl lg:text-5xl leading-none">{s.n}</div>
                <div className="mt-2 text-[10px] tracking-[0.22em] uppercase text-white/55 font-mono">
                  {s.l}
                </div>
              </div>
            ))}
          </div>

          {/* Right: scroll cue */}
          <div className="hidden lg:flex items-center gap-3 text-white/55 text-[10px] tracking-[0.28em] uppercase font-mono">
            <motion.span
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-block w-px h-10 bg-white/40"
            />
            <span>Aşağı Kaydır</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// SCENE 02 — PRODUCT MARQUEE STRIP (post-hero connector)

function ProductMarqueeScene({ products }: { products: Product[] }) {
  const items = useMemo(() => {
    if (!products?.length) return [];
    // Only show products with a real image so the marquee never renders broken tiles.
    return products.filter((p) => !!(p.images && p.images.length > 0)).slice(0, 16);
  }, [products]);
  if (items.length === 0) return null;
  const doubled = [...items, ...items];

  return (
    <section
      className="relative bg-black text-white py-14 lg:py-20 overflow-hidden border-y border-white/8"
      data-testid="scene-product-marquee"
    >
      {/* Eyebrow */}
      <div className="absolute top-5 lg:top-7 left-0 right-0 px-5 lg:px-10 flex items-center justify-between text-[10px] font-mono tracking-[0.28em] uppercase text-white/45 z-10">
        <span>— 02 / Akış</span>
        <Link
          href="/magaza"
          data-testid="link-marquee-shop"
          aria-label="Tüm ürünleri gör"
          className="hover:text-polen-orange transition-colors"
        >
          Tüm Ürünler ↗
        </Link>
      </div>

      <div className="relative mt-6">
        <div className="flex gap-6 lg:gap-8 animate-marquee-hero">
          {doubled.map((p, i) => (
            <Link
              key={`${p.id}-${i}`}
              href={`/urun/${p.slug}`}
              data-testid={`link-marquee-product-${p.id}-${i}`}
              data-cursor="hover"
              data-cursor-label={p.name}
              aria-label={`${p.name} ürün sayfası`}
              className="group shrink-0 w-[260px] lg:w-[320px]"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900">
                <img
                  src={p.images?.[0] || ''}
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-5 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/55">
                      Ürün
                    </div>
                    <div className="text-sm lg:text-base font-medium text-white truncate">
                      {p.name}
                    </div>
                  </div>
                  <div className="text-sm lg:text-base font-semibold text-polen-orange whitespace-nowrap">
                    {formatPrice(p.basePrice)} ₺
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// SCENE 03 — PINNED HORIZONTAL SHOWCASE

function PinnedShowcaseScene({ products }: { products: Product[] }) {
  const mounted = useMounted();
  const items = useMemo(() => {
    if (!products?.length) return [];
    const featured = products.filter((p) => p.isFeatured && p.images?.length);
    const news = products.filter((p) => p.isNew && !p.isFeatured && p.images?.length);
    const rest = products.filter((p) => !p.isFeatured && !p.isNew && p.images?.length);
    return [...featured, ...news, ...rest].slice(0, 7);
  }, [products]);
  if (!mounted || items.length === 0) return null;
  return <PinnedShowcaseSceneInner items={items} />;
}

function PinnedShowcaseSceneInner({ items }: { items: Product[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // total horizontal travel calibrated to item count
  const travel = useMemo(() => {
    if (items.length <= 3) return 0;
    return -(items.length - 2) * 36;
  }, [items.length]);
  const x = useTransform(scrollYProgress, [0, 1], ['0vw', `${travel}vw`]);

  const counter = useTransform(scrollYProgress, (v) =>
    Math.min(items.length, Math.max(1, Math.ceil(v * items.length))),
  );
  const [counterDisplay, setCounterDisplay] = useState(1);
  useMotionValueEvent(counter, 'change', (v) => setCounterDisplay(Math.round(v)));

  // Detect mobile so we can skip the pinned scroll mechanism and use snap-x scroll instead
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  // Mobile fallback: native snap-x scroll, no pinning
  if (isMobile) {
    return (
      <section
        className="relative bg-[#0c0a09] text-white py-16"
        data-testid="scene-pinned-showcase"
        aria-label="Ürün vitrini"
      >
        <div className="px-5 mb-6 flex items-center justify-between text-[10px] font-mono tracking-[0.28em] uppercase text-white/55">
          <span>— 03 / Vitrin</span>
          <span className="flex items-center gap-3">
            <span aria-hidden="true" className="text-white/40">
              ← Kaydır →
            </span>
            <Link
              href="/magaza"
              className="hover:text-polen-orange transition-colors"
              data-testid="link-pinned-all"
              aria-label="Tüm ürünleri gör"
            >
              Tümü ↗
            </Link>
          </span>
        </div>
        <div
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide pl-5 pr-5"
          style={{
            scrollPaddingLeft: '20px',
            WebkitOverflowScrolling: 'touch',
            // Prevent horizontal swipes from triggering iOS browser back/forward
            // gestures and keep vertical page scroll free of accidental hijacks.
            overscrollBehaviorX: 'contain',
            touchAction: 'pan-x pan-y',
          }}
          data-testid="scroller-pinned-mobile"
        >
          {items.map((p, idx) => (
            <Link
              key={p.id}
              href={`/urun/${p.slug}`}
              data-testid={`link-pinned-product-${p.id}`}
              aria-label={`${p.name} ürün sayfası`}
              className="group relative shrink-0 snap-start"
              style={{ width: '78vw' }}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900">
                <img
                  src={p.images?.[0] || ''}
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute top-4 left-4 text-[10px] font-mono tracking-[0.28em] text-white/65">
                  {String(idx + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
                </div>
                {p.discountBadge && (
                  <div className="absolute top-4 right-4 bg-polen-orange text-white text-[10px] font-bold tracking-[0.2em] px-2.5 py-1 uppercase">
                    {p.discountBadge}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="text-[10px] font-mono tracking-[0.28em] uppercase text-white/55 mb-2">
                    Doğal Taş
                  </div>
                  <h3 className="font-display text-xl leading-[1.05] mb-2">{p.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-polen-orange">
                      {formatPrice(p.basePrice)} ₺
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.22em] uppercase font-medium text-white/85">
                      İncele
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  // Section height: 240vh for 3 items, +50vh per extra
  const sectionVh = 240 + Math.max(0, items.length - 3) * 50;

  return (
    <section
      ref={containerRef}
      className="relative bg-[#0c0a09] text-white"
      style={{ height: `${sectionVh}vh` }}
      data-testid="scene-pinned-showcase"
      aria-label="Ürün vitrini"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center">
        <div className="absolute top-0 left-0 right-0 px-5 lg:px-10 pt-8 lg:pt-10 flex items-center justify-between text-[10px] font-mono tracking-[0.28em] uppercase text-white/55 z-20">
          <span>— 03 / Vitrin</span>
          <Link
            href="/magaza"
            className="hover:text-polen-orange transition-colors"
            data-testid="link-pinned-all"
            aria-label="Tüm ürünleri gör"
          >
            Tümü ↗
          </Link>
        </div>

        <motion.div
          style={{ x }}
          className="flex items-center gap-8 lg:gap-12 pl-[8vw] pr-[40vw] will-change-transform"
        >
          {items.map((p, idx) => (
            <Link
              key={p.id}
              href={`/urun/${p.slug}`}
              data-testid={`link-pinned-product-${p.id}`}
              data-cursor="hover"
              data-cursor-label="Görüntüle"
              aria-label={`${p.name} ürün sayfası`}
              className="group relative shrink-0"
              style={{ width: 'min(540px, 38vw)' }}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900">
                <img
                  src={p.images?.[0] || ''}
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute top-5 left-5 text-[10px] font-mono tracking-[0.28em] text-white/65">
                  {String(idx + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
                </div>
                {p.discountBadge && (
                  <div className="absolute top-5 right-5 bg-polen-orange text-white text-[10px] font-bold tracking-[0.2em] px-2.5 py-1 uppercase">
                    {p.discountBadge}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
                  <div className="text-[10px] font-mono tracking-[0.28em] uppercase text-white/55 mb-2">
                    Doğal Taş
                  </div>
                  <h3 className="font-display text-2xl lg:text-3xl leading-[1.05] mb-3">
                    {p.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-base lg:text-lg font-semibold text-polen-orange">
                      {formatPrice(p.basePrice)} ₺
                    </span>
                    <span className="inline-flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase font-medium text-white/85 group-hover:text-polen-orange transition-colors">
                      İncele
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </motion.div>

        <div className="absolute bottom-8 lg:bottom-12 left-5 lg:left-10 right-5 lg:right-10 flex items-center gap-6 z-20">
          <div className="text-[11px] font-mono tracking-[0.28em] uppercase text-white/65">
            <span className="text-white">{String(counterDisplay).padStart(2, '0')}</span>
            <span className="text-white/30"> / {String(items.length).padStart(2, '0')}</span>
          </div>
          <div className="flex-1 h-px bg-white/10 relative overflow-hidden">
            <motion.div
              className="absolute left-0 top-0 h-full bg-polen-orange origin-left"
              style={{ scaleX: scrollYProgress }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// SCENE 04 — BENTO PRODUCT MOSAIC

const BENTO_LAYOUT = [
  'col-span-2 row-span-2 aspect-square', // 0  big square
  'col-span-1 row-span-1 aspect-[4/5]',  // 1
  'col-span-1 row-span-1 aspect-[4/5]',  // 2
  'col-span-1 row-span-2 aspect-[1/2]',  // 3 tall
  'col-span-1 row-span-1 aspect-[4/5]',  // 4
  'col-span-2 row-span-1 aspect-[16/9]', // 5 wide
  'col-span-1 row-span-1 aspect-[4/5]',  // 6
  'col-span-1 row-span-1 aspect-[4/5]',  // 7
  'col-span-1 row-span-1 aspect-[4/5]',  // 8
];

function BentoMosaicScene({ products }: { products: Product[] }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.1 });

  const items = useMemo(() => {
    if (!products?.length) return [];
    // Stable selection: prefer featured, then by name hash for variety
    const pool = products.filter((p) => p.images?.length);
    const featured = pool.filter((p) => p.isFeatured);
    const others = pool.filter((p) => !p.isFeatured);
    const merged = [...featured, ...others];
    // Use 9 unique products
    const seen = new Set<string>();
    const out: Product[] = [];
    for (const p of merged) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
      if (out.length >= 9) break;
    }
    return out;
  }, [products]);

  if (items.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="relative bg-[hsl(var(--polen-cream))] text-black py-20 lg:py-28 px-5 lg:px-10"
      data-testid="scene-bento"
    >
      {/* Eyebrow row */}
      <div className="max-w-[1500px] mx-auto flex items-center justify-between mb-10 lg:mb-14 text-[10px] font-mono tracking-[0.28em] uppercase text-black/50">
        <span>— 04 / Seçmece</span>
        <Link
          href="/magaza"
          data-testid="link-bento-all"
          aria-label="Tüm koleksiyonu gör"
          className="text-black/70 hover:text-polen-orange transition-colors"
        >
          Tüm Koleksiyon ↗
        </Link>
      </div>

      <div className="max-w-[1500px] mx-auto grid grid-cols-2 lg:grid-cols-4 auto-rows-[180px] lg:auto-rows-[220px] gap-3 lg:gap-4">
        {items.map((p, i) => {
          const cls = BENTO_LAYOUT[i] || 'col-span-1 row-span-1 aspect-[4/5]';
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.9,
                delay: 0.05 * i,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={cls}
            >
              <BentoCard product={p} />
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function BentoCard({ product }: { product: Product }) {
  const [hovered, setHovered] = useState(false);
  const price = parseFloat(product.basePrice || '0');
  const original = getOriginalPrice(price, product.discountBadge);
  const primary = product.images?.[0] || '';
  const secondary = product.images?.[1] || product.images?.[0] || '';
  const hasSwap = !!(product.images && product.images.length > 1);

  return (
    <Link
      href={`/urun/${product.slug}`}
      data-testid={`card-bento-${product.id}`}
      data-cursor="hover"
      data-cursor-label="Görüntüle"
      aria-label={`${product.name} ürün sayfası`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className="relative block w-full h-full overflow-hidden bg-stone-200 group"
    >
      {/* Image swap stack: primary fades out, secondary fades in on hover */}
      <motion.img
        src={primary}
        alt={product.name}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
        animate={{
          scale: hovered ? 1.06 : 1,
          opacity: hovered && hasSwap ? 0 : 1,
        }}
        transition={{
          scale: { duration: 1.1, ease: [0.16, 1, 0.3, 1] },
          opacity: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
        }}
      />
      {hasSwap && (
        <motion.img
          src={secondary}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{
            opacity: hovered ? 1 : 0,
            scale: hovered ? 1 : 1.06,
          }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
      )}

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

      {/* Top-right plus */}
      <motion.div
        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-md"
        animate={{ rotate: hovered ? 90 : 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <Plus className="w-4 h-4" strokeWidth={1.75} />
      </motion.div>

      {/* Discount badge */}
      {product.discountBadge && (
        <div className="absolute top-3 left-3 bg-black text-white text-[10px] font-bold tracking-wider px-2 py-1 uppercase">
          {product.discountBadge}
        </div>
      )}

      {/* Caption — name slides up from below on hover, price stays */}
      <div className="absolute bottom-0 left-0 right-0 p-3 lg:p-4 text-white overflow-hidden">
        <div className="text-[9px] font-mono tracking-[0.22em] uppercase text-white/65 mb-1">
          Ürün
        </div>
        <motion.div
          className="text-sm lg:text-base font-medium leading-snug line-clamp-2 mb-1"
          initial={{ y: 28, opacity: 0 }}
          animate={{
            y: hovered ? 0 : 28,
            opacity: hovered ? 1 : 0,
          }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          {product.name}
        </motion.div>
        <div className="flex items-baseline gap-2">
          {original && (
            <span className="text-xs text-white/45 line-through">
              {formatPrice(original)} ₺
            </span>
          )}
          <span className="text-sm font-semibold text-polen-orange">
            {formatPrice(price)} ₺
          </span>
        </div>
      </div>
    </Link>
  );
}

// SCENE 05 — IMAGE-DRIVEN CATEGORY BENTO

const CATEGORY_BENTO_LAYOUT = [
  'col-span-2 row-span-2', // 0
  'col-span-1 row-span-1', // 1
  'col-span-1 row-span-1', // 2
  'col-span-1 row-span-2', // 3 tall
  'col-span-2 row-span-1', // 4 wide
  'col-span-1 row-span-1', // 5
  'col-span-1 row-span-1', // 6
  'col-span-2 row-span-1', // 7 wide
];

function CategoryBentoScene({
  menuRoots,
  products,
}: {
  menuRoots: MenuItemData[];
  products: Product[];
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.05 });

  const items = useMemo(() => {
    return menuRoots.slice(0, 8).map((root) => {
      const ids = getRootCategoryIds(root);
      const pool = products.filter(
        (p) => p.categoryId && ids.includes(p.categoryId) && p.images?.length,
      );
      let image: string | null = null;
      if (pool.length > 0) {
        const idx = hashStr(root.id) % pool.length;
        image = pool[idx].images[0];
      }
      const subTitles = (root.children || [])
        .filter((c) => c.isActive && c.type === 'category' && c.category)
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
        .slice(0, 4)
        .map((c) => c.title);
      return {
        root,
        image,
        href: getRootHref(root),
        count: pool.length,
        subTitles,
      };
    });
  }, [menuRoots, products]);

  if (items.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="relative bg-black text-white py-20 lg:py-28 px-5 lg:px-10"
      data-testid="scene-category-bento"
    >
      <div className="max-w-[1500px] mx-auto flex items-center justify-between mb-10 lg:mb-14 text-[10px] font-mono tracking-[0.28em] uppercase text-white/55">
        <span>— 05 / Koleksiyon</span>
        <Link
          href="/magaza"
          data-testid="link-category-bento-all"
          aria-label="Mağazaya git"
          className="text-white/85 hover:text-polen-orange transition-colors"
        >
          Mağaza ↗
        </Link>
      </div>

      <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-4 auto-rows-[260px] lg:auto-rows-[200px] gap-2 lg:gap-3">
        {items.map((it, i) => {
          const cls = CATEGORY_BENTO_LAYOUT[i] || 'col-span-1 row-span-1';
          return (
            <motion.div
              key={it.root.id}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.9,
                delay: 0.06 * i,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={cls}
            >
              <CategoryCard
                title={it.root.title}
                image={it.image}
                href={it.href}
                count={it.count}
                index={i}
                subTitles={it.subTitles}
              />
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function CategoryCard({
  title,
  image,
  href,
  count,
  index,
  subTitles,
}: {
  title: string;
  image: string | null;
  href: string;
  count: number;
  index: number;
  subTitles: string[];
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={href}
      data-testid={`card-category-${title.toLowerCase().replace(/\s+/g, '-')}`}
      data-cursor="hover"
      data-cursor-label={title}
      aria-label={`${title} koleksiyonunu gör`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className="relative block w-full h-full overflow-hidden bg-zinc-900 group"
    >
      {image ? (
        <motion.img
          src={image}
          alt={title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
          animate={{ scale: hovered ? 1.08 : 1 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
      )}
      {/* Veil */}
      <motion.div
        className="absolute inset-0 bg-black"
        animate={{ opacity: hovered ? 0.3 : 0.55 }}
        transition={{ duration: 0.5 }}
      />
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

      {/* Top tag */}
      <div className="absolute top-3 left-3 lg:top-4 lg:left-4 text-[9px] font-mono tracking-[0.28em] uppercase text-white/65">
        {String(index + 1).padStart(2, '0')}
        {count > 0 && (
          <span className="text-white/40"> · {count} ürün</span>
        )}
      </div>

      {/* Subcategory chips — reveal on hover */}
      {subTitles.length > 0 && (
        <div
          aria-hidden="true"
          className="absolute top-12 left-3 right-3 lg:top-14 lg:left-4 lg:right-4 flex flex-wrap gap-1.5"
        >
          {subTitles.map((t, ci) => (
            <motion.span
              key={t}
              initial={{ opacity: 0, y: -6 }}
              animate={{
                opacity: hovered ? 1 : 0,
                y: hovered ? 0 : -6,
              }}
              transition={{
                duration: 0.4,
                delay: hovered ? 0.05 + ci * 0.05 : 0,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="inline-block text-[9px] lg:text-[10px] font-mono tracking-[0.18em] uppercase text-white/85 bg-white/10 border border-white/20 backdrop-blur-sm px-2 py-1"
              data-testid={`chip-subcat-${title.toLowerCase().replace(/\s+/g, '-')}-${ci}`}
            >
              {t}
            </motion.span>
          ))}
        </div>
      )}

      {/* Bottom title */}
      <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-6 flex items-end justify-between gap-3">
        <h3 className="font-display text-xl lg:text-3xl leading-[1.05] uppercase text-white">
          {title}
        </h3>
        <motion.div
          animate={{ x: hovered ? 4 : 0, y: hovered ? -4 : 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="shrink-0 w-9 h-9 lg:w-11 lg:h-11 rounded-full border border-white/40 flex items-center justify-center group-hover:border-polen-orange group-hover:bg-polen-orange transition-colors"
        >
          <ArrowUpRight className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
        </motion.div>
      </div>
    </Link>
  );
}

// SCENE 06 — STATEMENT MARQUEE STRIP

function StatementMarqueeScene() {
  const items = [
    'POLEN STONE',
    '◆',
    'ANADOLU\'DAN MEKÂNINIZA',
    '✦',
    'TÜRKİYE GENELİ KARGO',
    '◆',
    '81 İL TESLİMAT',
    '✦',
    'GÜVENLİ ÖDEME',
    '◆',
    'MERMER · GRANİT · TRAVERTEN · ONİKS',
    '✦',
  ];
  const doubled = [...items, ...items, ...items];

  const stats = [
    { n: '500+', l: 'Tamamlanan Proje' },
    { n: '10+', l: 'Yıllık Tecrübe' },
    { n: '%100', l: 'Türk Mermeri' },
    { n: '81', l: 'İl Teslimat' },
  ];

  const statsRef = useRef<HTMLDivElement>(null);
  const inView = useInView(statsRef, { once: true, amount: 0.4 });

  return (
    <section
      className="relative bg-[hsl(var(--polen-stone))] text-white overflow-hidden border-y border-white/10"
      data-testid="scene-statement-marquee"
      aria-label="Marka bilgi şeridi"
    >
      {/* Marquee row */}
      <div className="py-10 lg:py-14 overflow-hidden">
        <div className="flex items-center gap-12 lg:gap-16 animate-marquee-slow whitespace-nowrap">
          {doubled.map((t, i) => (
            <span
              key={i}
              className={`font-display uppercase ${
                t.length === 1
                  ? 'text-polen-orange text-2xl lg:text-3xl'
                  : 'text-3xl lg:text-5xl tracking-[0.02em]'
              }`}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <div
        ref={statsRef}
        className="border-t border-white/10 px-5 lg:px-10 py-10 lg:py-14"
        data-testid="strip-stats"
      >
        <div className="max-w-[1500px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-6 lg:gap-x-12">
          {stats.map((s, i) => (
            <motion.div
              key={s.l}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-start"
              data-testid={`stat-${i}`}
            >
              <div
                className="font-display text-white leading-[0.95]"
                style={{ fontSize: 'clamp(40px, 6vw, 88px)', letterSpacing: '-0.02em' }}
              >
                {s.n}
              </div>
              <div className="mt-3 text-[10px] lg:text-[11px] tracking-[0.24em] uppercase text-white/55 font-mono">
                {s.l}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// SCENE 07 — FINAL CTA (footer-preceding)

function FinalCtaScene() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  return (
    <section
      ref={ref}
      className="relative bg-[hsl(var(--polen-cream))] text-black py-32 lg:py-48 px-5 lg:px-10 overflow-hidden"
      data-testid="scene-final-cta"
    >
      <div className="max-w-[1400px] mx-auto">
        <div className="text-[10px] font-mono tracking-[0.28em] uppercase text-black/45 mb-8">
          — 06 / Davet
        </div>
        <h2
          className="font-display uppercase text-black leading-[0.92]"
          style={{
            fontSize: 'clamp(40px, 8.5vw, 152px)',
            letterSpacing: '-0.03em',
          }}
        >
          <motion.span
            initial={{ opacity: 0, y: 60 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="block"
          >
            Mekânınıza
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 60 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="block"
          >
            doğanın ihtişamını
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 60 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="block text-polen-orange"
          >
            taşıyalım.
          </motion.span>
        </h2>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.4 }}
          className="mt-12 lg:mt-16 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8"
        >
          <p className="max-w-[560px] text-base lg:text-lg text-black/65 leading-relaxed">
            Anadolu'nun zengin doğal taş mirasını mekânınıza taşıyoruz.
            Mermer, granit, traverten ve oniks koleksiyonumuzu keşfedin.
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
              <span className="inline-flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-black text-white group-hover:bg-polen-orange transition-colors">
                <ArrowUpRight className="w-6 h-6 lg:w-7 lg:h-7" />
              </span>
              <span className="text-sm lg:text-base font-medium tracking-[0.18em] uppercase text-black group-hover:text-polen-orange transition-colors">
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
              <span className="text-sm lg:text-base font-medium tracking-[0.18em] uppercase text-black group-hover:text-polen-orange transition-colors">
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
  const { data: menuTree = [] } = useQuery<MenuItemData[]>({
    queryKey: ['/api/menu'],
    queryFn: async () => {
      const res = await fetch('/api/menu');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });

  const menuRoots = useMemo(() => {
    return [...menuTree]
      .filter((m) => m.isActive && !m.parentId)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [menuTree]);

  return (
    <>
      <SEO
        title="Polen Stone — Doğal Taş & Mermer"
        description="Polen Stone — Premium doğal taş ve mermer markası. Mermer, granit, traverten ve oniks koleksiyonu ile mekânlarınıza doğanın ihtişamını taşıyın."
      />
      <Header />
      <MotionConfig reducedMotion="user">
        <main className="bg-black">
          <HeroScene />
          <ProductMarqueeScene products={products} />
          <PinnedShowcaseScene products={products} />
          <BentoMosaicScene products={products} />
          <CategoryBentoScene menuRoots={menuRoots} products={products} />
          <StatementMarqueeScene />
          <FinalCtaScene />
        </main>
      </MotionConfig>
      <Footer />
    </>
  );
}
