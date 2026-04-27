import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { SEO } from '@/components/SEO';
import { ArrowRight, Truck, RotateCcw, Shield, Zap } from 'lucide-react';
import { Link } from 'wouter';
import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import heroPosterImage from '@assets/generated_images/polen-hero-dark-1.png';
import categoryMermer from '@assets/generated_images/polen-category-mermer.png';
import { useProducts, useCategories } from '@/hooks/useProducts';
import { getOriginalPrice } from '@/lib/discountPrice';

const defaultCategoryImages: Record<string, string> = {
  'mermer': categoryMermer,
  'granit': categoryMermer,
  'traverten': categoryMermer,
  'oniks': categoryMermer,
  'bazalt': categoryMermer,
};

const HERO_VIDEO_DESKTOP = '/videos/polen-hero.mp4';
const HERO_VIDEO_MOBILE = '/videos/polen-hero-mobile.mp4';

const tickerWords = Array(12).fill(
  ['MERMER', 'GRANİT', 'POLEN STONE', 'TRAVERTEN', 'DOĞAL TAŞ']
).flat();

const features = [
  { icon: Truck, label: 'Türkiye Geneli Kargo', sub: 'Özenli paketleme' },
  { icon: RotateCcw, label: 'Hızlı Teslimat', sub: '81 ile özel sevkiyat' },
  { icon: Shield, label: 'Güvenli Ödeme', sub: 'SSL korumalı' },
  { icon: Zap, label: 'Uzman Danışmanlık', sub: 'Mekânınıza özel öneri' },
];

/* ── Editorial Product Card (for featured grid) ── */
interface FeaturedProduct {
  id: string; name: string; slug: string; basePrice: string;
  images: string[]; discountBadge?: string | null; isNew?: boolean;
}

function EditorialCard({ product, size = 'md' }: { product: FeaturedProduct; size?: 'lg' | 'md' | 'sm' }) {
  const [hovered, setHovered] = useState(false);
  const price = parseFloat(product.basePrice || '0');
  const originalPrice = getOriginalPrice(price, product.discountBadge);
  const img = product.images?.[0] || '';
  const heightClass = size === 'lg' ? 'h-[420px] lg:h-[560px]' : size === 'md' ? 'h-[280px] lg:h-[275px]' : 'h-[220px]';

  return (
    <Link href={`/urun/${product.slug}`} data-testid={`link-featured-${product.id}`}>
      <div
        className={`relative overflow-hidden bg-stone-100 cursor-pointer ${heightClass}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Image */}
        <motion.img
          src={img}
          alt={product.name}
          className="w-full h-full object-cover"
          animate={{ scale: hovered ? 1.06 : 1 }}
          transition={{ duration: 0.75, ease: [0.33, 1, 0.68, 1] }}
          loading="lazy"
        />

        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

        {/* Badges */}
        {product.discountBadge && (
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-white text-black text-[9px] font-bold tracking-widest px-2 py-1 uppercase">
              {product.discountBadge}
            </span>
          </div>
        )}
        {product.isNew && !product.discountBadge && (
          <span className="absolute top-3 left-3 z-10 bg-white text-black text-[9px] font-bold tracking-widest px-2 py-1 uppercase">
            Yeni
          </span>
        )}

        {/* Info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-5">
          <p className="font-display text-white leading-tight tracking-wide" style={{ fontSize: size === 'lg' ? 'clamp(1.4rem,3vw,2rem)' : '1.15rem' }}>
            {product.name.toUpperCase()}
          </p>
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-2">
              {originalPrice && (
                <span className="text-white/40 text-xs line-through">
                  {originalPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                </span>
              )}
              <span className="text-white text-sm font-semibold">
                {price.toLocaleString('tr-TR')} ₺
              </span>
            </div>
            <motion.div
              animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 6 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-1.5 text-white text-[10px] tracking-[0.15em] uppercase font-medium"
            >
              İncele <ArrowRight className="w-3 h-3" />
            </motion.div>
          </div>
        </div>

        {/* Inner border on hover */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-3 border border-white/30 pointer-events-none"
        />
      </div>
    </Link>
  );
}

/* ── FeaturedHeroCard: fills CSS-grid cell, h-full, large style ── */
function FeaturedHeroCard({ product }: { product: FeaturedProduct }) {
  const [hovered, setHovered] = useState(false);
  const price = parseFloat(product.basePrice || '0');
  const originalPrice = getOriginalPrice(price, product.discountBadge);
  const img = product.images?.[0] || '';

  return (
    <Link href={`/urun/${product.slug}`} data-testid={`link-hero-featured-${product.id}`} className="block h-full">
      <div
        className="relative overflow-hidden bg-stone-100 cursor-pointer h-full"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <motion.img
          src={img} alt={product.name}
          className="w-full h-full object-cover"
          animate={{ scale: hovered ? 1.05 : 1 }}
          transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        {product.discountBadge && (
          <span className="absolute top-4 left-4 z-10 bg-white text-black text-[9px] font-bold tracking-widest px-2 py-1 uppercase">
            {product.discountBadge}
          </span>
        )}
        {product.isNew && !product.discountBadge && (
          <span className="absolute top-4 left-4 z-10 bg-white text-black text-[9px] font-bold tracking-widest px-2 py-1 uppercase">Yeni</span>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
          <p className="font-display text-white leading-tight tracking-wide" style={{ fontSize: 'clamp(1.6rem, 2.8vw, 2.4rem)' }}>
            {product.name.toUpperCase()}
          </p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              {originalPrice && (
                <span className="text-white/40 text-xs line-through">
                  {originalPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                </span>
              )}
              <span className="text-white text-sm font-semibold">{price.toLocaleString('tr-TR')} ₺</span>
            </div>
            <motion.div
              animate={{ opacity: hovered ? 1 : 0, x: hovered ? 0 : -6 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-1.5 text-white text-[10px] tracking-[0.15em] uppercase font-medium"
            >
              İncele <ArrowRight className="w-3 h-3" />
            </motion.div>
          </div>
        </div>
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-3 border border-white/30 pointer-events-none"
        />
      </div>
    </Link>
  );
}

/* ── FeaturedSmallCard: fills CSS-grid cell, h-full, medium style ── */
function FeaturedSmallCard({ product, delay = 0 }: { product: FeaturedProduct; delay?: number }) {
  const [hovered, setHovered] = useState(false);
  const price = parseFloat(product.basePrice || '0');
  const originalPrice = getOriginalPrice(price, product.discountBadge);
  const img = product.images?.[0] || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay }}
      className="h-full"
    >
      <Link href={`/urun/${product.slug}`} data-testid={`link-small-featured-${product.id}`} className="block h-full">
        <div
          className="relative overflow-hidden bg-stone-100 cursor-pointer h-full"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <motion.img
            src={img} alt={product.name}
            className="w-full h-full object-cover"
            animate={{ scale: hovered ? 1.06 : 1 }}
            transition={{ duration: 0.75, ease: [0.33, 1, 0.68, 1] }}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          {product.discountBadge && (
            <span className="absolute top-3 left-3 z-10 bg-white text-black text-[9px] font-bold tracking-widest px-2 py-1 uppercase">
              {product.discountBadge}
            </span>
          )}
          {product.isNew && !product.discountBadge && (
            <span className="absolute top-3 left-3 z-10 bg-white text-black text-[9px] font-bold tracking-widest px-2 py-1 uppercase">Yeni</span>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="font-display text-white text-lg leading-tight tracking-wide">{product.name.toUpperCase()}</p>
            <div className="flex items-center justify-between mt-1.5">
              <div className="flex items-center gap-2">
                {originalPrice && (
                  <span className="text-white/40 text-[11px] line-through">
                    {originalPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                  </span>
                )}
                <span className="text-white text-xs font-semibold">{price.toLocaleString('tr-TR')} ₺</span>
              </div>
              <motion.div
                animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 4 }}
                transition={{ duration: 0.22 }}
                className="text-white text-[9px] tracking-[0.15em] uppercase font-medium flex items-center gap-1"
              >
                İncele <ArrowRight className="w-2.5 h-2.5" />
              </motion.div>
            </div>
          </div>
          <motion.div
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-2 border border-white/25 pointer-events-none"
          />
        </div>
      </Link>
    </motion.div>
  );
}

type Product = { id: string; name: string; slug: string; basePrice: string; images?: string[]; discountBadge?: string | null };

function ManifestoProductSlider({ products }: { products: Product[] }) {
  const [index, setIndex] = useState(0);
  const [shuffled, setShuffled] = useState<Product[]>([]);

  useEffect(() => {
    if (products.length === 0) return;
    const arr = [...products].sort(() => Math.random() - 0.5);
    setShuffled(arr);
  }, [products]);

  useEffect(() => {
    if (shuffled.length < 2) return;
    const timer = setInterval(() => {
      setIndex(prev => (prev + 2) % shuffled.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [shuffled]);

  if (shuffled.length < 2) return <div className="flex-1" />;

  const pair = [shuffled[index % shuffled.length], shuffled[(index + 1) % shuffled.length]];

  return (
    <div className="flex-1 flex gap-3 lg:gap-4">
      <AnimatePresence mode="popLayout">
        {pair.map((p) => {
          const img = p.images?.[0];
          const price = parseFloat(p.basePrice);
          return (
            <motion.div
              key={`${p.id}-${index}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 min-w-0"
            >
              <Link href={`/urun/${p.slug}`} data-testid={`link-manifesto-slider-${p.id}`}>
                <div className="relative w-full overflow-hidden bg-white/4 border border-white/8 hover:border-white/22 transition-colors duration-300" style={{ aspectRatio: '3/4' }}>
                  {img ? (
                    <img src={img} alt={p.name} className="w-full h-full object-cover object-top opacity-80 hover:opacity-100 transition-opacity duration-400" />
                  ) : (
                    <div className="w-full h-full bg-white/5" />
                  )}
                  {p.discountBadge && (
                    <div className="absolute top-2.5 left-2.5 bg-white text-black text-[8px] font-black px-1.5 py-0.5 tracking-widest">
                      {p.discountBadge}
                    </div>
                  )}
                </div>
                <div className="pt-3">
                  <p className="font-display text-white/80 text-sm tracking-wide leading-tight line-clamp-1">{p.name.toUpperCase()}</p>
                  <p className="text-white/35 text-[11px] mt-1 font-medium">{price.toLocaleString('tr-TR')} ₺</p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const productsSectionRef = useRef<HTMLDivElement>(null);
  const productsInView = useInView(productsSectionRef, { once: true, margin: '-100px' });

  const { scrollY } = useScroll();
  const heroImgY = useTransform(scrollY, [0, 700], [0, -60]);

  const { data: apiCategories = [] } = useCategories();
  const { data: allProducts = [] } = useProducts({});

  const categories = apiCategories.map(cat => ({
    ...cat,
    image: cat.image || defaultCategoryImages[cat.slug] || '',
  }));

  const featuredProducts = allProducts.slice(0, 13);

  const toTimestamp = (value: Date | string | number | null | undefined): number => {
    if (!value) return 0;
    if (value instanceof Date) return value.getTime();
    const parsed = typeof value === 'number' ? value : Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const newArrivals = allProducts
    .filter(p => p.isNew)
    .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
    .slice(0, 12);

  const discountedProducts = allProducts.filter(p => p.discountBadge).slice(0, 8);
  const featuredHighlights = allProducts
    .filter(p => p.isFeatured)
    .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
    .slice(0, 8);
  const hasDiscounts = discountedProducts.length >= 4;
  const highlightProducts = hasDiscounts ? discountedProducts : featuredHighlights;
  const highlightLabel = hasDiscounts ? 'İNDİRİMDEKİLER' : 'ÖNE ÇIKANLAR';
  const highlightEyebrow = hasDiscounts ? 'Kampanya' : 'Seçki';

  const [reducedMotion, setReducedMotion] = useState(false);
  const [heroVideoSrc, setHeroVideoSrc] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateRM = () => setReducedMotion(mq.matches);
    updateRM();
    mq.addEventListener?.('change', updateRM);

    // Choose video source based on viewport + Save-Data; fall back to poster on slow networks
    const conn = (navigator as any).connection;
    const saveData = conn?.saveData === true;
    const slow = conn?.effectiveType && /^(slow-2g|2g|3g)$/.test(conn.effectiveType);
    if (saveData || slow) {
      setHeroVideoSrc(null);
    } else {
      setHeroVideoSrc(window.matchMedia('(max-width: 767px)').matches ? HERO_VIDEO_MOBILE : HERO_VIDEO_DESKTOP);
    }
    return () => mq.removeEventListener?.('change', updateRM);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <SEO
        title="Ana Sayfa"
        description="Polen Stone — Premium doğal taş ve mermer markası. Mermer, granit, traverten ve oniks koleksiyonu."
        url="/"
      />
      <Header />

      {/* ════════════════════════════════════════════
          HERO — editorial cinematic, refined
      ════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative overflow-hidden bg-black text-white h-[100svh] lg:h-[calc(100svh-150px)] min-h-[460px] max-h-[940px]"
        data-testid="section-hero"
      >
        {/* ── Cinematic background video (with poster fallback) ── */}
        <motion.div className="absolute inset-0" style={{ y: heroImgY }}>
          {reducedMotion || !heroVideoSrc ? (
            <img
              src={heroPosterImage}
              alt="Polen Stone — Doğal taş ve mermer"
              className="absolute inset-0 w-full h-full object-cover object-center"
              data-testid="img-hero-poster"
            />
          ) : (
            <video
              key={heroVideoSrc}
              src={heroVideoSrc}
              poster={heroPosterImage}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover object-center"
              data-testid="video-hero"
            />
          )}
        </motion.div>

        {/* ── Cinematic overlays — refined for video legibility ── */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/30 to-black/45" />
        <div className="absolute inset-0 hidden lg:block" style={{ background: 'radial-gradient(ellipse at 28% 50%, transparent 0%, rgba(0,0,0,0.6) 78%)' }} />
        {/* Subtle film grain (SVG noise) */}
        <div
          className="absolute inset-0 mix-blend-overlay opacity-[0.18] pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.7 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* ── Main content: centered both axes; mobile clears fixed header ── */}
        <div
          className="absolute inset-0 z-10 flex items-center justify-center pt-[88px] pb-[200px] lg:pt-[clamp(28px,5vh,60px)] lg:pb-[clamp(220px,26vh,260px)]"
        >
          <div className="w-full max-w-[1280px] mx-auto px-6 sm:px-10 lg:px-16">
            <div className="text-left lg:text-center max-w-[680px] lg:max-w-none mx-auto lg:mx-0">
              {/* Tiny eyebrow rule */}
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="flex lg:justify-center items-center gap-3 mb-5 sm:mb-7"
              >
                <span className="w-8 h-px bg-polen-orange" />
                <span className="text-white/60 text-[10px] sm:text-[11px] tracking-[0.32em] uppercase font-medium">
                  Polen Stone
                </span>
                <span className="w-8 h-px bg-polen-orange hidden lg:inline-block" />
              </motion.div>

              {/* Headline — stacked on mobile, single line centered on desktop */}
              <h1
                className="font-display tracking-[0.005em] text-white text-[3rem] xs:text-[3.4rem] sm:text-[4.2rem] md:text-[5.2rem] lg:text-[4.5rem] xl:text-[5.6rem] 2xl:text-[6.5rem]"
                style={{ lineHeight: 1.02 }}
                aria-label="Doğanın İhtişamı"
              >
                <motion.span
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
                  className="block lg:inline-block lg:align-baseline"
                >
                  Doğanın
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.95, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="block mt-1 sm:mt-2 lg:mt-0 lg:inline-block lg:align-baseline lg:ml-[0.32em]"
                  style={{
                    color: 'transparent',
                    WebkitTextStroke: '1.2px hsl(var(--polen-orange))',
                  }}
                >
                  İhtişamı.
                </motion.span>
              </h1>

              {/* Description — short, refined */}
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.55 }}
                className="mt-5 sm:mt-7 lg:mt-8 max-w-[460px] lg:max-w-[600px] lg:mx-auto text-white/65 text-[13px] sm:text-[14px] font-body leading-[1.7]"
              >
                Anadolu'nun ocaklarından mimarın masasına. Mermer, granit ve
                traverten koleksiyonumuzla mekânlarınıza bin yıllık taş mirasını
                taşıyoruz.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.7 }}
                className="mt-6 sm:mt-8 lg:mt-9 flex flex-wrap items-center gap-x-6 gap-y-4 lg:justify-center"
              >
                <Link href="/magaza" data-testid="button-hero-shop">
                  <motion.span
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.97 }}
                    className="group inline-flex items-center gap-4 bg-polen-orange text-white text-[11px] tracking-[0.22em] uppercase font-semibold px-7 py-[15px] sm:px-9 sm:py-[17px] cursor-pointer hover:bg-[hsl(var(--polen-orange-deep))] transition-colors"
                  >
                    Koleksiyonu Keşfet
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1.5" />
                  </motion.span>
                </Link>
                <Link href="/magaza">
                  <span className="text-[11px] tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors font-medium border-b border-white/25 hover:border-white pb-1.5">
                    Tüm Ürünler
                  </span>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>

        {/* ── Bottom: integrated product marquee inside hero ── */}
        {allProducts.length > 0 && (
          <div
            className="absolute bottom-4 sm:bottom-6 lg:bottom-8 left-0 right-0 z-20 bg-black/60 backdrop-blur-md border-y border-white/10"
            data-testid="section-hero-marquee"
          >
            <div className="relative h-[150px] sm:h-[170px] overflow-hidden">
              {/* Edge fades */}
              <div className="absolute inset-y-0 left-0 w-20 sm:w-28 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.9), transparent)' }} />
              <div className="absolute inset-y-0 right-0 w-20 sm:w-28 z-10 pointer-events-none" style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.9), transparent)' }} />

              <div className="flex animate-marquee-slow h-full items-center" style={{ width: 'max-content' }}>
                {[...allProducts, ...allProducts, ...allProducts].map((p, i) => {
                  const img = p.images?.[0];
                  const price = parseFloat(p.basePrice);
                  return (
                    <Link
                      key={`${p.id}-${i}`}
                      href={`/urun/${p.slug}`}
                      className="group flex-shrink-0 mx-3 sm:mx-4 flex flex-col items-center gap-1.5 cursor-pointer"
                      data-testid={`link-hero-scroll-${p.id}-${i}`}
                      aria-label={p.name}
                    >
                      <div className="relative w-[88px] h-[110px] sm:w-[96px] sm:h-[120px] overflow-hidden bg-white/5 border border-white/10 group-hover:border-polen-orange/60 transition-colors duration-400">
                        {img ? (
                          <img
                            src={img}
                            alt={p.name}
                            className="w-full h-full object-cover object-top opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-white/5" />
                        )}
                        {p.discountBadge && (
                          <div className="absolute top-1 left-1 bg-white text-black text-[7px] font-bold tracking-wider px-1 py-px uppercase">
                            {p.discountBadge}
                          </div>
                        )}
                      </div>
                      <p
                        className="max-w-[100px] sm:max-w-[110px] text-[9px] sm:text-[10px] text-white/70 group-hover:text-white transition-colors font-medium tracking-wide truncate text-center uppercase"
                        title={p.name}
                      >
                        {p.name}
                      </p>
                      {!isNaN(price) && price > 0 && (
                        <p className="text-[10px] sm:text-[11px] text-polen-orange group-hover:text-white transition-colors font-semibold tabular-nums">
                          {price.toLocaleString('tr-TR')} ₺
                        </p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════
          FEATURED PRODUCTS — editorial layout
      ════════════════════════════════════════════ */}
      {featuredProducts.length > 0 && (
        <section className="px-4 pt-5 pb-0 lg:px-10 xl:px-14" data-testid="section-featured">
          <div className="max-w-[1440px] mx-auto">

            {/* Section header */}
            <div className="flex items-center justify-between py-5 lg:py-8 border-b border-black/8 mb-0">
              <div className="flex items-center gap-4">
                <span className="text-[9px] tracking-[0.35em] uppercase text-polen-orange font-medium tabular-nums">01</span>
                <h2 className="font-display text-2xl lg:text-4xl tracking-wide text-black">SEÇKİN KOLEKSİYON</h2>
              </div>
              <Link href="/magaza" className="group flex items-center gap-2 text-[10px] tracking-[0.18em] uppercase text-black/35 hover:text-black transition-colors font-medium">
                <span>Tümünü Gör</span>
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* ── DESKTOP: CSS Grid layout ── */}
            <div ref={productsSectionRef} className="hidden lg:block">
              {/* Primary grid: 1 tall hero + up to 4 cards in a 2×2 grid */}
              <div
                className="grid"
                style={{
                  gridTemplateColumns: '1.65fr 1fr 1fr',
                  gridTemplateRows: '280px 280px',
                }}
              >
                {/* Hero card — spans 2 rows */}
                {featuredProducts[0] && (
                  <div style={{ gridRow: 'span 2', gridColumn: '1' }}>
                    <FeaturedHeroCard product={featuredProducts[0]} />
                  </div>
                )}
                {/* Remaining 4 cards auto-fill the 2×2 right area */}
                {featuredProducts.slice(1, 5).map((product, i) => (
                  <FeaturedSmallCard key={product.id} product={product} delay={i * 0.06} />
                ))}
              </div>

              {/* Secondary row: remaining products filling evenly */}
              {featuredProducts.length > 5 && (() => {
                const secondaryProducts = featuredProducts.slice(5);
                const cols = secondaryProducts.length;
                return (
                  <div
                    className="grid border-t border-black/5"
                    style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
                  >
                    {secondaryProducts.map((product, i) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 0.55, delay: i * 0.06 }}
                        data-testid={`product-row2-${product.id}`}
                        className={i > 0 ? 'border-l border-black/5' : ''}
                      >
                        <ProductCard product={product} />
                      </motion.div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* ── MOBILE: full-width hero + 2-col grid ── */}
            <div className="lg:hidden">
              {featuredProducts[0] && (
                <FeaturedHeroCard product={featuredProducts[0]} />
              )}
              <div
                className="grid grid-cols-2"
                style={{ gridAutoRows: '220px' }}
              >
                {featuredProducts.slice(1, 7).map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.06 }}
                    className={`${i % 2 === 1 ? 'border-l border-white/0' : ''}`}
                  >
                    <EditorialCard product={product} size="sm" />
                  </motion.div>
                ))}
              </div>
            </div>

          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════
          02 — YENİ GELENLER (horizontal editorial scroll)
      ════════════════════════════════════════════ */}
      {newArrivals.length > 0 && (
        <section className="bg-polen-cream/40 border-t border-black/8 mt-8 lg:mt-12 py-12 lg:py-20" data-testid="section-new-arrivals">
          <div className="max-w-[1440px] mx-auto px-4 lg:px-10 xl:px-14">
            <div className="flex items-end justify-between mb-6 lg:mb-10">
              <div>
                <span className="block text-[9px] tracking-[0.35em] uppercase text-polen-orange font-medium tabular-nums mb-2">02 / Yeni</span>
                <h2 className="font-display text-3xl lg:text-5xl tracking-wide text-black leading-[0.95]">
                  YENİ GELENLER
                </h2>
                <p className="text-black/45 text-sm mt-3 max-w-md">
                  Son eklenen ocak çıkışlı bloklar, taze koleksiyonlar.
                </p>
              </div>
              <Link href="/magaza" className="hidden lg:flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-black/45 hover:text-polen-orange transition-colors font-medium">
                Tümünü Gör <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="relative -mx-4 lg:-mx-10 xl:-mx-14">
              <div className="flex gap-3 lg:gap-4 overflow-x-auto pb-4 px-4 lg:px-10 xl:px-14 scrollbar-hide snap-x snap-mandatory">
                {newArrivals.map((p, i) => {
                  const img = p.images?.[0] || '';
                  const price = parseFloat(p.basePrice || '0');
                  const originalPrice = getOriginalPrice(price, p.discountBadge);
                  return (
                    <Link
                      key={p.id}
                      href={`/urun/${p.slug}`}
                      data-testid={`link-new-arrival-${p.id}`}
                      className="snap-start shrink-0 w-[64vw] sm:w-[44vw] md:w-[32vw] lg:w-[260px] group"
                    >
                      <div className="relative h-[340px] lg:h-[340px] overflow-hidden bg-stone-100">
                        <motion.img
                          src={img}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          whileHover={{ scale: 1.05 }}
                          transition={{ duration: 0.65, ease: [0.33, 1, 0.68, 1] }}
                          loading="lazy"
                        />
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                          <span className="text-[8px] font-mono tracking-[0.28em] uppercase text-white/90 bg-black/55 backdrop-blur px-2 py-1">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          {p.discountBadge && (
                            <span className="bg-polen-orange text-white text-[9px] font-bold tracking-widest px-2 py-1 uppercase">
                              {p.discountBadge}
                            </span>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      </div>
                      <div className="pt-3 pr-2">
                        <p className="font-display text-sm lg:text-base text-black tracking-wide line-clamp-1 group-hover:text-polen-orange transition-colors">
                          {p.name.toUpperCase()}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {originalPrice && (
                            <span className="text-black/35 text-[11px] line-through">
                              {originalPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                            </span>
                          )}
                          <span className="text-black text-xs font-semibold">
                            {price.toLocaleString('tr-TR')} ₺
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════
          03 — HIGHLIGHT GRID (İndirimde / Koleksiyondan)
      ════════════════════════════════════════════ */}
      {highlightProducts.length > 0 && (
        <section className="bg-white border-t border-black/8 py-12 lg:py-20 px-4 lg:px-10 xl:px-14" data-testid="section-highlights">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex items-end justify-between mb-6 lg:mb-10">
              <div>
                <span className="block text-[9px] tracking-[0.35em] uppercase text-polen-orange font-medium tabular-nums mb-2">
                  03 / {highlightEyebrow}
                </span>
                <h2 className="font-display text-2xl lg:text-4xl tracking-wide text-black">
                  {highlightLabel}
                </h2>
              </div>
              <Link href="/magaza" className="hidden lg:flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-black/45 hover:text-polen-orange transition-colors font-medium">
                Tümünü Gör <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {highlightProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: (i % 4) * 0.06 }}
                  data-testid={`product-highlight-${product.id}`}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════
          TICKER STRIP
      ════════════════════════════════════════════ */}
      <div className="bg-[hsl(var(--polen-stone))] overflow-hidden h-10 flex items-center mt-5 lg:mt-8">
        <div className="flex animate-marquee-fast whitespace-nowrap">
          {tickerWords.map((word, i) => (
            <span key={i} className="inline-flex items-center gap-5 text-[10px] tracking-[0.4em] uppercase font-medium px-6 text-white">
              <span className={i % 3 === 1 ? 'text-polen-orange' : 'text-white'}>{word}</span>
              <span className="inline-block w-4 h-px bg-white/30" />
            </span>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          CATEGORIES — editorial grid
      ════════════════════════════════════════════ */}
      <section className="bg-white py-12 lg:py-20 px-4 lg:px-10 xl:px-14" data-testid="section-categories">
        <div className="max-w-[1440px] mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-5 lg:mb-8 border-b border-black/8 pb-5 lg:pb-8">
            <div className="flex items-center gap-4">
              <span className="text-[9px] tracking-[0.35em] uppercase text-polen-orange font-medium tabular-nums">04</span>
              <h2 className="font-display text-2xl lg:text-4xl tracking-wide text-black">TAŞ KATEGORİLERİ</h2>
            </div>
            <Link href="/magaza" className="group hidden lg:flex items-center gap-2 text-[10px] tracking-[0.18em] uppercase text-black/35 hover:text-black transition-colors font-medium">
              Tümünü Gör <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Desktop editorial grid: 1 tall + 2×2 */}
          {categories.length >= 4 ? (
            <div className="hidden lg:flex gap-3 xl:gap-4" style={{ height: '520px' }}>
              {/* Big left card */}
              <Link href={`/kategori/${categories[0].slug}`} className="flex-[1.4] relative overflow-hidden group bg-stone-100 block" data-testid={`link-cat-${categories[0].id}`}>
                <motion.img src={categories[0].image} alt={categories[0].name} className="w-full h-full object-cover" whileHover={{ scale: 1.05 }} transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-3 border border-white/0 group-hover:border-white/28 transition-all duration-500 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <span className="text-[9px] tracking-[0.3em] uppercase text-white/45 font-medium">Keşfet</span>
                  <h3 className="font-display text-3xl xl:text-4xl text-white tracking-wide mt-1 group-hover:-translate-y-1 transition-transform duration-500">{categories[0].name.toUpperCase()}</h3>
                </div>
              </Link>
              {/* Right 2×2 */}
              <div className="flex-[2] grid grid-cols-2 grid-rows-2 gap-3 xl:gap-4">
                {categories.slice(1, 5).map(cat => (
                  <Link key={cat.id} href={`/kategori/${cat.slug}`} className="relative overflow-hidden group bg-stone-100 block" data-testid={`link-cat-${cat.id}`}>
                    <motion.img src={cat.image} alt={cat.name} className="w-full h-full object-cover" whileHover={{ scale: 1.06 }} transition={{ duration: 0.7, ease: [0.33, 1, 0.68, 1] }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                    <div className="absolute inset-2 border border-white/0 group-hover:border-white/25 transition-all duration-500 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 xl:p-5">
                      <h3 className="font-display text-xl xl:text-2xl text-white tracking-wide group-hover:-translate-y-0.5 transition-transform duration-500">{cat.name.toUpperCase()}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex gap-3 xl:gap-4" style={{ height: '480px' }}>
              {categories.map(cat => (
                <Link key={cat.id} href={`/kategori/${cat.slug}`} className="flex-1 relative overflow-hidden group bg-stone-100 block" data-testid={`link-cat-${cat.id}`}>
                  <motion.img src={cat.image} alt={cat.name} className="w-full h-full object-cover" whileHover={{ scale: 1.05 }} transition={{ duration: 0.7 }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="font-display text-2xl text-white tracking-wide">{cat.name.toUpperCase()}</h3>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Mobile: horizontal scroll */}
          <div className="lg:hidden flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory -mx-4 px-4">
            {categories.map((cat, i) => (
              <div key={cat.id} className="snap-start shrink-0 w-[72vw] max-w-[320px]">
                <Link href={`/kategori/${cat.slug}`} data-testid={`link-cat-mobile-${cat.id}`}>
                  <div className="relative h-[240px] overflow-hidden bg-stone-100">
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="font-display text-2xl text-white tracking-wide">{cat.name.toUpperCase()}</h3>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════
          MANIFESTO — black statement + product slider
      ════════════════════════════════════════════ */}
      <section className="bg-black overflow-hidden" data-testid="section-manifesto">
        {/* Top: text + stats */}
        <div className="py-16 lg:py-24 px-4 lg:px-10 xl:px-14">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-20">
              {/* Left: auto-rotating 2-product slider */}
              <ManifestoProductSlider products={allProducts} />

              {/* Right: stats + cta */}
              <div className="flex-[0_0_auto] lg:w-72">
                <motion.p
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                  className="text-white/45 text-sm font-body leading-relaxed mb-8"
                >
                  Anadolu'nun zengin doğal taş mirasını, modern mekânlara taşıyoruz.
                  Her bir blok, milyonlarca yılın izini ve eşsiz bir hikâyeyi barındırır.
                </motion.p>
                <div className="grid grid-cols-2 gap-px bg-white/8 mb-8">
                  {[['500+', 'Proje'], ['10+', 'Yıl Deneyim'], ['%100', 'Türk Mermeri'], ['81', 'İl Teslimat']].map(([n, l], i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.07 }}
                      className="bg-black px-4 py-5"
                    >
                      <p className="font-display text-white text-3xl leading-none mb-1">{n}</p>
                      <p className="text-[9px] tracking-[0.18em] uppercase text-white/30 font-medium">{l}</p>
                    </motion.div>
                  ))}
                </div>
                <Link href="/magaza" data-testid="button-manifesto-cta">
                  <motion.span
                    whileHover={{ x: 4 }}
                    className="group inline-flex items-center gap-3 border border-white/20 text-white text-[10px] tracking-[0.22em] uppercase font-semibold px-7 py-4 hover:bg-white hover:text-black transition-all duration-300 cursor-pointer"
                  >
                    Koleksiyonu Keşfet
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1.5" />
                  </motion.span>
                </Link>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* ════════════════════════════════════════════
          FEATURES — minimal 4-col
      ════════════════════════════════════════════ */}
      <section className="border-t border-black/8" data-testid="section-features">
        <div className="max-w-[1440px] mx-auto grid grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className={`flex items-start gap-4 px-5 py-8 lg:px-8 lg:py-12
                ${i > 0 ? 'border-l border-black/8' : ''}
                ${i === 2 ? 'border-t border-black/8 lg:border-t-0' : ''}
                ${i === 3 ? 'border-t border-black/8 lg:border-t-0' : ''}
              `}
              data-testid={`feature-${i}`}
            >
              <div className="w-8 h-8 lg:w-9 lg:h-9 border border-black/10 flex items-center justify-center shrink-0">
                <f.icon className="w-3.5 h-3.5 text-black/40" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-black mb-1 leading-tight">{f.label}</h3>
                <p className="text-xs text-black/38">{f.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
