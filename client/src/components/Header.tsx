import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingBag, Search, X, User, LogOut, ChevronDown, ArrowUpRight, Scissors, PawPrint, Tent, Shovel, Wrench, FlameKindling, Backpack, LayoutGrid, Target, Drill, HardHat, Flashlight, Compass, Map, Mountain, Flower, Bird, Fish, Rabbit, TreeDeciduous, TreePine, UtensilsCrossed, Dog, Cat, Layers, Zap, Waves, PackageSearch, CircleHelp } from 'lucide-react';

const PocketKnifeIcon = ({ className, strokeWidth = 1.75 }: { className?: string; strokeWidth?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 2v1c0 1 2 1 2 2S3 6 3 7s2 1 2 2-2 1-2 2 2 1 2 2v1" />
    <path d="M18.2 4a2.8 2.8 0 0 1 0 5.6" />
    <path d="M6 13h12" />
    <path d="M6 13v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6" />
    <path d="M6 7h3" />
  </svg>
);

const KnifeIcon = ({ className, strokeWidth = 1.75 }: { className?: string; strokeWidth?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 4L8.5 15.5" />
    <path d="M8.5 15.5L5 19a2.83 2.83 0 0 1-4 0v0a2.83 2.83 0 0 1 0-4L4 12" />
    <path d="M4 12L8.5 7.5l3-3 4 2.5" />
  </svg>
);
import { motion, AnimatePresence, useScroll, useMotionValueEvent, type Variants } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useSiteIdentity } from '@/hooks/useSiteIdentity';
import { SearchOverlay } from '@/components/SearchOverlay';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MenuItemData {
  id: string;
  title: string;
  description?: string | null;
  type: 'category' | 'link' | 'submenu';
  categoryId: string | null;
  url: string | null;
  parentId: string | null;
  displayOrder: number;
  isActive: boolean;
  openInNewTab: boolean;
  category?: { id: string; name: string; slug: string } | null;
  children?: MenuItemData[];
}

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  image?: string | null;
}

const stagger: { container: Variants; item: Variants } = {
  container: { animate: { transition: { staggerChildren: 0.05 } } },
  item: {
    initial: { y: 60, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
    exit: { y: -40, opacity: 0, transition: { duration: 0.3, ease: [0.4, 0, 1, 1] as [number, number, number, number] } },
  },
};

function getMenuIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes('çakı') || t.includes('caki')) return PocketKnifeIcon;
  if (t.includes('bıçak') || t.includes('bicak')) return KnifeIcon;
  if (t.includes('bahçe') || t.includes('bahce') || t.includes('bağ') || t.includes('bag')) return Shovel;
  if (t.includes('pet') || t.includes('çiftlik') || t.includes('ciftlik')) return PawPrint;
  if (t.includes('nalbur') || t.includes('hırdavat') || t.includes('hirdavat')) return Wrench;
  if (t.includes('mangal') || t.includes('izgara') || t.includes('ahşap') || t.includes('ahsap')) return FlameKindling;
  if (t.includes('kamp') || t.includes('outdoor')) return Backpack;
  if (t.includes('tüm') || t.includes('tum')) return LayoutGrid;
  return Layers;
}

function getSubIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes('kamp çakı') || t.includes('kamp caki')) return Tent;
  if (t.includes('av çakı') || t.includes('av caki')) return Target;
  if (t.includes('katlanır') || t.includes('katlanir') || t.includes('çakı') || t.includes('caki')) return PocketKnifeIcon;
  if (t.includes('elektrik')) return Zap;
  if (t.includes('mutfak')) return UtensilsCrossed;
  if (t.includes('av bıçak') || t.includes('av bicak')) return Target;
  if (t.includes('kamp bıçak') || t.includes('kamp bicak')) return Mountain;
  if (t.includes('bıçak') || t.includes('bicak')) return KnifeIcon;
  if (t.includes('budama') || t.includes('makas')) return Scissors;
  if (t.includes('kürek') || t.includes('kurek')) return Shovel;
  if (t.includes('çapa') || t.includes('capa') || t.includes('kazma')) return Layers;
  if (t.includes('sulama')) return Waves;
  if (t.includes('çiçek') || t.includes('cicek') || t.includes('fide')) return Flower;
  if (t.includes('bahçe') || t.includes('bağ') || t.includes('bag') || t.includes('bag')) return TreeDeciduous;
  if (t.includes('çadır') || t.includes('cadir')) return Tent;
  if (t.includes('sırt') || t.includes('sirt') || t.includes('çanta') || t.includes('canta')) return Backpack;
  if (t.includes('fener') || t.includes('ışık') || t.includes('isik')) return Flashlight;
  if (t.includes('pusula')) return Compass;
  if (t.includes('harita')) return Map;
  if (t.includes('dağ') || t.includes('dag')) return Mountain;
  if (t.includes('matkap') || t.includes('drill')) return Drill;
  if (t.includes('inşaat') || t.includes('insaat')) return HardHat;
  if (t.includes('vida') || t.includes('civata') || t.includes('somun')) return Wrench;
  if (t.includes('mangal')) return FlameKindling;
  if (t.includes('ızgara') || t.includes('izgara')) return UtensilsCrossed;
  if (t.includes('ahşap') || t.includes('ahsap') || t.includes('tahta')) return TreePine;
  if (t.includes('kedi')) return Cat;
  if (t.includes('köpek') || t.includes('kopek')) return Dog;
  if (t.includes('kuş') || t.includes('kus')) return Bird;
  if (t.includes('balık') || t.includes('balik')) return Fish;
  if (t.includes('tavşan') || t.includes('tavsan') || t.includes('tavuk')) return Rabbit;
  return getMenuIcon(title);
}

function getCategoryDesc(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('çakı') || t.includes('caki')) return 'El yapımı ve fabrika kamp çakıları, av ve outdoor modelleri';
  if (t.includes('bıçak') || t.includes('bicak')) return 'Avcılık, kamp ve mutfak bıçakları, Türk zanaatkâr işçiliği';
  if (t.includes('bahçe') || t.includes('bağ') || t.includes('bag')) return 'Budama makasları, kürekler ve profesyonel bahçe ekipmanları';
  if (t.includes('pet') || t.includes('çiftlik') || t.includes('ciftlik')) return 'Evcil hayvan malzemeleri ve çiftlik bakım ürünleri';
  if (t.includes('nalbur') || t.includes('hırdavat') || t.includes('hirdavat')) return 'El aletleri, vida, somun, civata ve hırdavat ürünleri';
  if (t.includes('mangal') || t.includes('izgara') || t.includes('ahşap') || t.includes('ahsap')) return 'Mangal setleri, ızgara ekipmanları ve ahşap el işleri';
  if (t.includes('kamp') || t.includes('outdoor')) return 'Kamp çadırları, sırt çantaları ve doğa ekipmanları';
  return 'Sepetzen kalitesinde seçilmiş ürün koleksiyonu';
}


export function Header() {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileSubOpen, setMobileSubOpen] = useState<Record<string, boolean>>({});
  const [megaMenuId, setMegaMenuId] = useState<string | null>(null);
  const [sidebarProductIdx, setSidebarProductIdx] = useState(0);
  const [allCatsExpanded, setAllCatsExpanded] = useState(false);
  const [sidebarProductKey, setSidebarProductKey] = useState(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const allCatsCloseTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [allCatsOpen, setAllCatsOpen] = useState(false);
  const { totalItems, subtotal } = useCart();
  const siteIdentity = useSiteIdentity();
  const { user, logout } = useAuth();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 110));

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const openMega = (id: string) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setMegaMenuId(id);
  };

  const closeMega = () => {
    closeTimerRef.current = setTimeout(() => setMegaMenuId(null), 140);
  };

  const cancelClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  const openAllCats = () => {
    if (allCatsCloseTimerRef.current) clearTimeout(allCatsCloseTimerRef.current);
    setAllCatsOpen(true);
  };

  const closeAllCats = () => {
    if (allCatsCloseTimerRef.current) clearTimeout(allCatsCloseTimerRef.current);
    allCatsCloseTimerRef.current = setTimeout(() => {
      setAllCatsOpen(false);
      setAllCatsExpanded(false);
    }, 160);
  };

  const cancelAllCatsClose = () => {
    if (allCatsCloseTimerRef.current) clearTimeout(allCatsCloseTimerRef.current);
  };

  const { data: categoriesData = [] } = useQuery<CategoryData[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: menuTree = [] } = useQuery<MenuItemData[]>({
    queryKey: ['/api/menu'],
    queryFn: async () => {
      const res = await fetch('/api/menu');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  const visibleCategories = categoriesData
    .filter(c => (c.displayOrder ?? 0) < 100)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  // "Tüm Kategoriler" açılır menüsü: ilk açılışta en fazla 8 kategori, "Tümünü Gör" ile tamamı
  const ALL_CATS_PREVIEW = 8;
  const hasMoreAllCats = !allCatsExpanded && visibleCategories.length > ALL_CATS_PREVIEW;
  const shownAllCats = hasMoreAllCats ? visibleCategories.slice(0, ALL_CATS_PREVIEW) : visibleCategories;

  const menuRoots = [...menuTree]
    .filter(m => m.isActive && !m.parentId)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const useMenuTree = menuRoots.length > 0;

  const hrefForMenu = (item: MenuItemData): string => {
    if (item.type === 'category' && item.category) return `/kategori/${item.category.slug}`;
    if (item.type === 'link' && item.url) return item.url;
    return '#';
  };

  const navLinkCls = (active: boolean) =>
    `relative h-full inline-flex items-center gap-1.5 whitespace-nowrap text-[10.5px] 2xl:text-[11.5px] font-medium tracking-[0.05em] 2xl:tracking-[0.08em] uppercase transition-colors nav-link-hover ${
      active ? 'text-white' : 'text-white/70 hover:text-white'
    }`;

  const activeMegaRoot = megaMenuId ? menuRoots.find(r => r.id === megaMenuId) : null;
  const activeMegaChildren = activeMegaRoot ? (activeMegaRoot.children || []).filter(c => c.isActive) : [];

  const megaCategoryId = activeMegaRoot?.category?.id ?? null;
  const { data: megaFeaturedProducts = [] } = useQuery<any[]>({
    queryKey: ['/api/products', 'mega', megaCategoryId],
    queryFn: async () => {
      if (!megaCategoryId) return [];
      const res = await fetch(`/api/products?categoryId=${megaCategoryId}&sort=popular&limit=6`);
      if (!res.ok) return [];
      const all = await res.json();
      return all.slice(0, 6);
    },
    enabled: !!megaCategoryId,
    staleTime: 120000,
  });

  useEffect(() => {
    if (megaFeaturedProducts.length <= 1) return;
    const timer = setInterval(() => {
      setSidebarProductIdx(i => (i + 1) % megaFeaturedProducts.length);
      setSidebarProductKey(k => k + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, [megaFeaturedProducts.length]);

  useEffect(() => {
    setSidebarProductIdx(0);
    setSidebarProductKey(k => k + 1);
  }, [megaMenuId]);

  const sidebarProduct = megaFeaturedProducts[sidebarProductIdx] ?? null;
  const rightProducts = megaFeaturedProducts.slice(0, 2);

  return (
    <>
      {/* ── Top utility strip (desktop) ── */}
      <div className="hidden lg:block bg-black text-white border-b border-white/8" data-testid="utility-strip">
        <div className="max-w-[1400px] mx-auto px-8 h-10 flex items-center justify-between">
          <div
            className="flex-1 min-w-0 overflow-hidden mr-8"
            style={{ maskImage: 'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)' }}
            data-testid="utility-marquee"
          >
            <div className="marquee-track motion-reduce:animate-none text-[11px] tracking-[0.04em] font-medium" style={{ animationDuration: '28s' }}>
              {[0, 1].map((copy) => (
                <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
                  {siteIdentity.announcements.map((msg) => (
                    <span key={msg} className="flex items-center whitespace-nowrap">
                      <span className="px-5 text-white/70">{msg}</span>
                      <span className="text-white/30">✦</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/siparis-takip" className="flex items-center gap-1.5 text-[10.5px] font-medium text-white/60 hover:text-white transition-colors whitespace-nowrap" data-testid="link-utility-order-tracking">
              <PackageSearch className="w-[13px] h-[13px]" strokeWidth={1.75} /> Sipariş Takibi
            </Link>
            <Link href="/sayfa/iletisim" className="flex items-center gap-1.5 text-[10.5px] font-medium text-white/60 hover:text-white transition-colors whitespace-nowrap" data-testid="link-utility-help">
              <CircleHelp className="w-[13px] h-[13px]" strokeWidth={1.75} /> Yardım & Destek
            </Link>
          </div>
        </div>
      </div>

      {/* ── Announcement Bar (mobile) ── */}
      <div
        className="lg:hidden bg-gradient-to-r from-black via-zinc-950 to-black text-white py-2 text-[11px] tracking-[0.04em] font-medium overflow-hidden"
        data-testid="announcement-bar"
      >
        <div className="marquee-track motion-reduce:animate-none" style={{ animationDuration: '28s' }} aria-hidden={false}>
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
              {siteIdentity.announcements.map((msg) => (
                <span key={msg} className="flex items-center whitespace-nowrap">
                  <span className="px-5">{msg}</span>
                  <span className="text-white/30">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Brand bar (desktop): Logo · Arama · Hesap/Sepet ── */}
      <div className="hidden lg:block bg-[#0A0A0A] border-b border-white/8">
        <div className="max-w-[1400px] mx-auto px-8 py-4 grid grid-cols-[auto_1fr_auto] items-center gap-8">
          {/* Sol: Logo */}
          <a href="/" data-testid="link-logo" className="justify-self-start block">
            <img
              src={siteIdentity.logoUrl}
              alt="Sepetzen – Kamp, Outdoor, Bıçak ve Bağ Bahçe"
              data-testid="img-logo"
              className="h-20 w-auto object-contain"
            />
          </a>

          {/* Orta: Arama */}
          <div className="justify-self-center w-full max-w-[560px]">
            <button
              onClick={() => setSearchOpen(true)}
              className="group flex items-center justify-between gap-3 w-full rounded-[15px] bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 hover:border-white/25 transition-colors px-5 py-3 cursor-text"
              data-testid="button-search"
              aria-label="Ara"
            >
              <span className="text-[12px] text-white/40 group-hover:text-white/60 transition-colors truncate">Ürün, kategori veya marka ara...</span>
              <Search className="w-[16px] h-[16px] text-white/45 group-hover:text-white transition-colors shrink-0" strokeWidth={1.75} />
            </button>
          </div>

          {/* Sağ: Hesabım + Sepetim */}
          <div className="justify-self-end flex items-center gap-5">
            {user ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button className="group flex items-center gap-3 text-left" data-testid="button-account" aria-label="Hesabım">
                    <span className="w-10 h-10 rounded-full border border-white/12 group-hover:border-white/35 flex items-center justify-center shrink-0 transition-colors">
                      <User className="w-[16px] h-[16px] text-white/70 group-hover:text-white transition-colors" strokeWidth={1.75} />
                    </span>
                    <span className="flex flex-col leading-tight whitespace-nowrap">
                      <span className="text-[12px] font-semibold text-white">Hesabım</span>
                      <span className="text-[10.5px] text-white/45 group-hover:text-white/70 transition-colors">{user.firstName || 'Profilim'}</span>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="surface-glass-dark bg-black/85 text-white border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] rounded-md min-w-[180px] z-[9999]">
                  <DropdownMenuItem disabled className="text-[10px] tracking-widest text-white/30 uppercase">{user.firstName || user.email}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/hesabim')} className="text-[11px] tracking-wider uppercase text-white/75 hover:bg-white/5 hover:text-white cursor-pointer py-2.5">
                    <User className="w-4 h-4 mr-2" />Hesabım
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { logout(); navigate('/'); }} className="text-[11px] tracking-wider uppercase text-white/75 hover:bg-white/5 hover:text-white cursor-pointer py-2.5">
                    <LogOut className="w-4 h-4 mr-2" />Çıkış Yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/giris" className="group flex items-center gap-3" data-testid="button-account-guest" aria-label="Giriş Yap">
                <span className="w-10 h-10 rounded-full border border-white/12 group-hover:border-white/35 flex items-center justify-center shrink-0 transition-colors">
                  <User className="w-[16px] h-[16px] text-white/70 group-hover:text-white transition-colors" strokeWidth={1.75} />
                </span>
                <span className="flex flex-col leading-tight whitespace-nowrap">
                  <span className="text-[12px] font-semibold text-white">Hesabım</span>
                  <span className="text-[10.5px] text-white/45 group-hover:text-white/70 transition-colors">Giriş Yap</span>
                </span>
              </Link>
            )}

            <Link href="/sepet" className="group flex items-center gap-3" data-testid="button-cart" aria-label="Sepet">
              <span className="relative w-10 h-10 rounded-full border border-white/12 group-hover:border-white/35 flex items-center justify-center shrink-0 transition-colors">
                <ShoppingBag className="w-[16px] h-[16px] text-white/70 group-hover:text-white transition-colors" strokeWidth={1.75} />
                <AnimatePresence>
                  {totalItems > 0 && (
                    <motion.span
                      key="badge-brand"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-white text-black text-[9.5px] font-bold flex items-center justify-center rounded-full leading-none"
                    >
                      {totalItems > 9 ? '9+' : totalItems}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <span className="flex flex-col leading-tight whitespace-nowrap">
                <span className="text-[12px] font-semibold text-white">Sepetim</span>
                <span className="text-[10.5px] text-white/45 group-hover:text-white/70 transition-colors" data-testid="text-cart-summary">
                  {totalItems} ürün · {subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                </span>
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main header (nav bar) — desktop'ta sticky, mobile'da fixed ── */}
      <header
        className={`sticky top-0 left-0 right-0 z-[100] flex items-center h-16 lg:h-auto overflow-visible transition-all duration-300 ${
          scrolled
            ? megaMenuId
              // Mega panel açıkken header'dan backdrop-filter kaldırılır: ata elemandaki
              // backdrop-filter, altındaki panelin kendi blur'unu bozar (backdrop root).
              ? 'bg-[#050505]/95 border-b border-white/10 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.45)]'
              : 'surface-glass-dark border-b border-white/10 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.45)]'
            : 'bg-[#0A0A0A] border-b border-white/8'
        }`}
      >
        <div className="w-full max-w-[1400px] mx-auto px-4 lg:px-8 lg:py-3">
          {/* ── Mobile layout ── */}
          <div className="grid lg:hidden grid-cols-[1fr_auto_1fr] items-center gap-2">
            <button
              data-testid="button-mobile-menu"
              onClick={() => setMobileOpen(true)}
              className="justify-self-start flex flex-col gap-[5px] p-2 -ml-2 group"
              aria-label="Menü"
            >
              <span className="block h-px w-5 bg-white transition-all group-hover:w-6" />
              <span className="block h-px w-4 bg-white transition-all group-hover:w-6" />
              <span className="block h-px w-6 bg-white" />
            </button>

            <a href="/" data-testid="link-logo-mobile-header" className="justify-self-center block">
              <img
                src={siteIdentity.logoUrl}
                alt="Sepetzen"
                data-testid="img-logo-mobile-header"
                className="h-14 w-auto object-contain"
              />
            </a>

            <div className="justify-self-end flex items-center gap-0.5">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSearchOpen(true)}
                className="p-2.5 text-white/65 hover:text-white transition-colors"
                data-testid="button-search-mobile"
                aria-label="Ara"
              >
                <Search className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </motion.button>
              <Link href="/sepet" data-testid="link-cart-mobile">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="p-2.5 text-white/65 hover:text-white transition-colors relative"
                  aria-label="Sepet"
                >
                  <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.75} />
                  <AnimatePresence>
                    {totalItems > 0 && (
                      <motion.span
                        key="badge-mobile"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-white text-black text-[9px] font-bold flex items-center justify-center rounded-full leading-none"
                      >
                        {totalItems > 9 ? '9+' : totalItems}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </Link>
            </div>
          </div>

          {/* ── Desktop layout ── */}
          <div className="hidden lg:grid grid-cols-[auto_1fr_auto] items-center gap-4 2xl:gap-8">

            {/* Sol: Tüm Kategoriler + (scroll edilince kompakt logo) */}
            <div className="justify-self-start flex items-center gap-4 min-w-0 h-[44px]">
              <AnimatePresence>
                {scrolled && (
                  <motion.div
                    key="scrolled-logo"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
                    className="shrink-0"
                  >
                    <a
                      href="/"
                      data-testid="link-logo-compact"
                      className="block"
                    >
                      <img
                        src={siteIdentity.logoUrl}
                        alt="Sepetzen"
                        className="h-12 w-auto object-contain"
                      />
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>

              {!scrolled && (
              <DropdownMenu
                modal={false}
                open={allCatsOpen}
                onOpenChange={(open) => {
                  setAllCatsOpen(open);
                  if (!open) setAllCatsExpanded(false);
                }}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    className="all-cats-gold flex items-center gap-2 px-3 2xl:px-4 py-2.5 text-[10px] tracking-[0.10em] 2xl:tracking-[0.14em] uppercase font-bold whitespace-nowrap"
                    data-testid="button-all-categories"
                    onMouseEnter={openAllCats}
                    onMouseLeave={closeAllCats}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" strokeWidth={1.75} />
                    Tüm Kategoriler
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={12}
                  className="surface-glass-dark bg-black/85 text-white border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] rounded-md p-3 z-[9999]"
                  style={{ minWidth: shownAllCats.length > 6 ? 480 : 240 }}
                   onMouseEnter={cancelAllCatsClose}
                   onMouseLeave={closeAllCats}
                >
                  {visibleCategories.length === 0 ? (
                    <DropdownMenuItem
                      onClick={() => navigate('/magaza')}
                      className="text-[11px] tracking-wider uppercase text-white/75 hover:bg-white/5 cursor-pointer py-2.5"
                    >
                      Tüm Ürünler
                    </DropdownMenuItem>
                  ) : (
                    <>
                    <div
                      className="grid gap-x-6"
                      style={{ gridTemplateColumns: shownAllCats.length > 6 ? 'repeat(2, minmax(0, 1fr))' : '1fr' }}
                    >
                      {shownAllCats.map((c, i) => {
                        const cols = shownAllCats.length > 6 ? 2 : 1;
                        const isLastRow = i >= shownAllCats.length - cols;
                        return (
                          <DropdownMenuItem
                            key={c.id}
                            onClick={() => navigate(`/kategori/${c.slug}`)}
                            className={`text-[11px] tracking-[0.12em] uppercase text-white/75 hover:bg-white/5 hover:text-white cursor-pointer py-3 px-3 rounded-none transition-colors ${isLastRow ? '' : 'border-b border-white/[0.07]'}`}
                            data-testid={`link-allcat-${c.slug}`}
                          >
                            {c.name}
                          </DropdownMenuItem>
                        );
                      })}
                    </div>
                    {hasMoreAllCats && (
                      <DropdownMenuItem
                        onSelect={(e) => { e.preventDefault(); setAllCatsExpanded(true); }}
                        className="mt-2 text-[10.5px] tracking-[0.14em] uppercase font-bold text-white bg-white/[0.06] hover:bg-white/[0.12] cursor-pointer py-3 px-3 justify-center rounded-md transition-colors"
                        data-testid="button-allcat-show-all"
                      >
                        Tümünü Gör ({visibleCategories.length})
                        <ChevronDown className="w-3 h-3 ml-1.5 text-white/60" />
                      </DropdownMenuItem>
                    )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              )}
            </div>

            {/* Orta: Desktop nav */}
            <nav className="justify-self-center self-center h-[44px] flex items-center justify-center gap-2 2xl:gap-4 min-w-0 max-w-full overflow-hidden">
              {useMenuTree ? (
                <>
                {menuRoots.slice(0, 7).map((root) => {
                  const children = (root.children || []).filter(c => c.isActive);
                  const isActiveMega = megaMenuId === root.id;

                  if (root.type === 'submenu') {
                    return (
                      <div
                        key={root.id}
                        className="relative h-full flex items-center"
                        onMouseEnter={() => openMega(root.id)}
                        onMouseLeave={closeMega}
                      >
                        <button
                          className={navLinkCls(isActiveMega)}
                          data-testid={`button-nav-root-${root.id}`}
                          aria-expanded={isActiveMega}
                          aria-haspopup="true"
                        >
                                                    {root.title}
                          <motion.span
                            animate={{ rotate: isActiveMega ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="inline-flex"
                          >
                            <ChevronDown className="w-2.5 h-2.5" />
                          </motion.span>
                        </button>
                      </div>
                    );
                  }

                  const href = hrefForMenu(root);
                  const isActive =
                    (root.type === 'category' && root.category && location === `/kategori/${root.category.slug}`) ||
                    (root.type === 'link' && root.url && location === root.url) || false;
                  const isAllProducts = root.title.trim().toLocaleLowerCase('tr') === 'tüm ürünler';
                  return (
                    <Link
                      key={root.id}
                      href={href}
                      className={`${navLinkCls(isActive)} ${isAllProducts ? '!text-[#f4c96d] hover:!text-[#f4c96d]' : ''}`}
                      data-testid={`link-nav-root-${root.id}`}
                    >
                                            {root.title}
                    </Link>
                  );
                })}
                {menuRoots.length > 7 && (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button className={navLinkCls(false)} data-testid="button-nav-more">
                        Daha Fazla
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      sideOffset={12}
                      className="surface-glass-dark bg-black/85 text-white border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] rounded-md p-2 min-w-[220px] z-[9999]"
                    >
                      {menuRoots.slice(7).map((root) => {
                        const children = (root.children || []).filter(c => c.isActive);
                        if (root.type === 'submenu' && children.length > 0) {
                          return (
                            <div key={root.id} className="mb-1 last:mb-0">
                              <div className="px-3 pt-2 pb-1 text-[9px] tracking-[0.2em] uppercase text-white/35 font-bold">{root.title}</div>
                              {children.map((child) => (
                                <DropdownMenuItem
                                  key={child.id}
                                  onClick={() => navigate(hrefForMenu(child))}
                                  className="text-[11px] tracking-[0.10em] uppercase text-white/75 hover:bg-white/5 hover:text-white cursor-pointer py-2 px-3 rounded-md transition-colors"
                                  data-testid={`link-nav-more-${child.id}`}
                                >
                                  {child.title}
                                </DropdownMenuItem>
                              ))}
                            </div>
                          );
                        }
                        return (
                          <DropdownMenuItem
                            key={root.id}
                            onClick={() => navigate(hrefForMenu(root))}
                            className="text-[11px] tracking-[0.10em] uppercase text-white/75 hover:bg-white/5 hover:text-white cursor-pointer py-2 px-3 rounded-md transition-colors"
                            data-testid={`link-nav-more-${root.id}`}
                          >
                            {root.title}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                </>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={navLinkCls(location.startsWith('/kategori/'))}
                      data-testid="button-nav-kategoriler"
                    >
                      Kategoriler
                      <ChevronDown className="w-2.5 h-2.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    sideOffset={20}
                    className="surface-glass-dark bg-black/85 text-white border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] rounded-md p-5"
                    style={{ minWidth: visibleCategories.length > 6 ? 520 : 240 }}
                  >
                    {visibleCategories.length === 0 ? (
                      <DropdownMenuItem
                        onClick={() => navigate('/magaza')}
                        className="text-[11px] tracking-wider uppercase text-white/75 hover:bg-white/5 cursor-pointer py-2.5"
                      >
                        Tüm Ürünler
                      </DropdownMenuItem>
                    ) : (
                      <div
                        className="grid gap-x-2 gap-y-0.5"
                        style={{ gridTemplateColumns: visibleCategories.length > 6 ? 'repeat(2, minmax(0, 1fr))' : '1fr' }}
                      >
                        {visibleCategories.map((c) => (
                          <DropdownMenuItem
                            key={c.id}
                            onClick={() => navigate(`/kategori/${c.slug}`)}
                            className="text-[11px] tracking-[0.16em] uppercase text-white/75 hover:bg-white/5 hover:text-white cursor-pointer py-2.5 px-3 rounded-md transition-colors"
                            data-testid={`link-cat-${c.slug}`}
                          >
                            {c.name}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

            </nav>

            {/* Right: scrolled durumunda kompakt arama + hızlı ikonlar */}
            <div className="justify-self-end flex items-center gap-2 xl:gap-3 shrink-0 min-h-[44px]">
              <AnimatePresence>
                {scrolled && (
                  <motion.div
                    key="scrolled-icons"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
                    className="flex items-center gap-1"
                  >
                    <button
                      onClick={() => setSearchOpen(true)}
                      className="p-2.5 inline-flex transition-colors text-white/65 hover:text-white active:scale-90"
                      data-testid="button-search-compact"
                      aria-label="Ara"
                    >
                      <Search className="w-[18px] h-[18px]" strokeWidth={1.75} />
                    </button>
                    <Link
                      href={user ? '/hesabim' : '/giris'}
                      className="p-2.5 inline-flex transition-colors text-white/65 hover:text-white active:scale-90"
                      data-testid="button-account-compact"
                      aria-label="Hesabım"
                    >
                      <User className="w-[18px] h-[18px]" strokeWidth={1.75} />
                    </Link>
                    <Link
                      href="/sepet"
                      className="p-2.5 inline-flex transition-colors relative text-white/65 hover:text-white active:scale-90"
                      data-testid="button-cart-compact"
                      aria-label="Sepet"
                    >
                      <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.75} />
                      {totalItems > 0 && (
                        <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 bg-white text-black text-[9px] font-bold flex items-center justify-center rounded-full leading-none">
                          {totalItems > 9 ? '9+' : totalItems}
                        </span>
                      )}
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      {/* ── MEGA MENU PANEL ── (header'a göre absolute, tam genişlik) */}
      <AnimatePresence>
        {megaMenuId && activeMegaRoot && activeMegaRoot.type === 'submenu' && activeMegaChildren.length > 0 && (
          <motion.div
            key={megaMenuId}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="mega-menu-panel absolute top-full left-0 right-0 surface-glass-dark border-b border-white/10 shadow-[0_40px_80px_-16px_rgba(0,0,0,0.55)] z-[110] overflow-hidden"
            style={{
              backgroundColor: 'rgba(9, 9, 9, 0.92)',
              backdropFilter: 'blur(22px) saturate(1.35)',
              WebkitBackdropFilter: 'blur(22px) saturate(1.35)',
            }}
            onMouseEnter={cancelClose}
            onMouseLeave={closeMega}
            data-testid={`mega-panel-${megaMenuId}`}
          >
            <div className="max-w-[1400px] mx-auto flex min-h-[340px]">

              {/* ── LEFT: Dark green hero sidebar ── */}
              <div className="w-64 xl:w-[288px] shrink-0 bg-white/[0.05] flex flex-col relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-[0.06] pointer-events-none"
                  style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                />
                <div className="relative z-10 flex flex-col h-full">
                  {/* Top: title + desc */}
                  <div className="px-7 pt-8 pb-5">
                    <h3 className="text-[24px] xl:text-[28px] font-black text-white leading-none tracking-tight mb-2.5">
                      {activeMegaRoot.title}
                    </h3>
                    <p className="text-white/50 text-[11.5px] leading-relaxed">
                      {activeMegaRoot.description?.trim() || getCategoryDesc(activeMegaRoot.title)}
                    </p>
                  </div>

                  {/* Middle: Rotating product card */}
                  {sidebarProduct && (
                    <div className="px-5 flex-1">
                      <div className="text-[8.5px] tracking-[0.28em] uppercase text-white/30 font-mono mb-3 px-1">Öne Çıkan Ürün</div>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={sidebarProductKey}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <Link
                            href={`/urun/${sidebarProduct.slug}`}
                            onClick={() => setMegaMenuId(null)}
                            className="group block"
                            data-testid={`link-mega-sidebar-product-${sidebarProduct.id}`}
                          >
                            <div className="relative overflow-hidden bg-white/[0.07] rounded-lg border border-white/[0.1] group-hover:border-white/20 transition-colors">
                              {sidebarProduct.images?.[0] ? (
                                <div className="aspect-[4/3] overflow-hidden">
                                  <img
                                    src={sidebarProduct.images[0]}
                                    alt={sidebarProduct.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                </div>
                              ) : (
                                <div className="aspect-[4/3] flex items-center justify-center">
                                  {(() => { const Icon = getMenuIcon(activeMegaRoot.title); return <Icon className="w-8 h-8 text-white/20" />; })()}
                                </div>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <p className="text-[11.5px] font-semibold text-white leading-snug line-clamp-2">{sidebarProduct.name}</p>
                                <p className="text-[13px] font-bold text-[#FAFAFA] mt-1">{Number(sidebarProduct.price || sidebarProduct.basePrice).toLocaleString('tr-TR')} ₺</p>
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Bottom: CTA */}
                  {activeMegaRoot.category && (
                    <div className="px-7 py-5 mt-auto">
                      <Link
                        href={`/kategori/${activeMegaRoot.category.slug}`}
                        onClick={() => setMegaMenuId(null)}
                        className="inline-flex items-center gap-2 text-[10.5px] tracking-[0.16em] uppercase font-bold text-[#1F1F1F] bg-white hover:bg-white/90 transition-colors px-4 py-3"
                        data-testid={`link-mega-all-${megaMenuId}`}
                      >
                        Tümünü Keşfet <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* ── MIDDLE: Subcategory grid ── */}
              <div className="flex-1 px-8 xl:px-10 py-8 border-r border-white/8">
                <div className="text-[9px] tracking-[0.30em] uppercase text-white/30 font-mono mb-5">Alt Kategoriler</div>
                <div className={`grid gap-x-3 gap-y-0.5 ${activeMegaChildren.length <= 4 ? 'grid-cols-1' : activeMegaChildren.length <= 8 ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-3'}`}>
                  {activeMegaChildren.map((child) => {
                    const childHref = hrefForMenu(child);
                    return (
                      <Link
                        key={child.id}
                        href={childHref}
                        onClick={() => setMegaMenuId(null)}
                        className="group flex items-center gap-3 px-3 py-3.5 rounded-lg hover:bg-white/5 transition-all duration-150"
                        data-testid={`link-mega-${child.id}`}
                      >
                        <span className="text-[13px] text-white/65 group-hover:text-white transition-colors font-medium leading-tight flex-1">
                          {child.title}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-transparent group-hover:text-white/50 transition-colors shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* ── RIGHT: Featured products ── */}
              {rightProducts.length > 0 && (
                <div className="w-52 xl:w-60 shrink-0 px-6 py-8">
                  <div className="text-[9px] tracking-[0.30em] uppercase text-white/30 font-mono mb-5">Öne Çıkan</div>
                  <div className="space-y-4">
                    {rightProducts.map((product: any) => (
                      <Link
                        key={product.id}
                        href={`/urun/${product.slug}`}
                        onClick={() => setMegaMenuId(null)}
                        className="group flex gap-3 items-start"
                        data-testid={`link-mega-product-${product.id}`}
                      >
                          <div className="w-[60px] h-[60px] rounded-lg overflow-hidden shrink-0 bg-[#151515]">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {(() => { const Icon = getMenuIcon(activeMegaRoot.title); return <Icon className="w-5 h-5 text-white/20" />; })()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium text-white/75 leading-snug line-clamp-2 group-hover:text-white transition-colors">{product.name}</p>
                          <p className="text-[13.5px] font-bold text-white mt-1">{Number(product.price || product.basePrice).toLocaleString('tr-TR')} ₺</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {activeMegaRoot.category && (
                    <Link
                      href={`/kategori/${activeMegaRoot.category.slug}`}
                      onClick={() => setMegaMenuId(null)}
                      className="mt-5 text-[9.5px] tracking-[0.18em] uppercase text-white/75 hover:text-white transition-colors font-semibold flex items-center gap-1"
                    >
                      Tüm ürünleri gör <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </header>

      {/* ── Mobile editorial menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[200] bg-black/35 backdrop-blur-sm"
              data-testid="overlay-mobile-menu"
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="mobile-drawer-glass fixed inset-y-0 left-0 z-[210] w-[92%] max-w-[420px] surface-glass-dark flex flex-col overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.55)]"
              data-testid="drawer-mobile-menu"
            >
              {/* ── Hero panel: brand header ── */}
              <div className="relative h-[120px] shrink-0 overflow-hidden border-b border-white/10 bg-black/20 flex items-center justify-center">
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setMobileOpen(false)}
                  className="group absolute top-3 right-3 z-10 p-1.5 text-white/70 hover:text-white transition-colors"
                  data-testid="button-close-menu"
                  aria-label="Menüyü Kapat"
                >
                  <span className="absolute inset-0 m-auto w-8 h-8 rounded-full border border-white/15 group-hover:border-white/45 transition-colors" />
                  <X className="relative w-3.5 h-3.5" strokeWidth={1.75} />
                </motion.button>

                <a href="/" data-testid="link-logo-mobile-drawer" className="block">
                  <img
                    src={siteIdentity.logoUrl}
                    alt="Sepetzen"
                    data-testid="img-logo-mobile-drawer"
                    className="h-16 w-auto object-contain"
                  />
                </a>
              </div>

              {/* ── Scrollable nav ── */}
              <nav className="flex-1 overflow-y-auto overscroll-contain px-6 py-2">
                <motion.ul
                  variants={stagger.container}
                  initial="initial"
                  animate="animate"
                  exit="initial"
                  className="space-y-0"
                >
                  {/* Eyebrow */}
                  <motion.li variants={stagger.item} aria-hidden="true">
                    <div className="flex items-center gap-3 pt-3 pb-2">
                      <span className="text-[9px] font-mono tracking-[0.34em] uppercase text-white/35">Menü</span>
                      <span className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
                    </div>
                  </motion.li>

                  {/* Ana Sayfa */}
                  <motion.li variants={stagger.item}>
                    <Link
                      href="/"
                      onClick={() => setMobileOpen(false)}
                      className="group relative flex items-center justify-between py-3.5"
                      data-testid="link-mobile-home"
                    >
                      <span className="font-display text-[19px] leading-none tracking-[0.02em] text-white transition-transform duration-300 group-active:translate-x-1">
                        Ana Sayfa
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-white/30 rotate-45 group-hover:rotate-0 group-hover:text-white transition-all duration-300" />
                    </Link>
                  </motion.li>

                  {useMenuTree ? (
                    menuRoots.map((root) => {
                      const children = (root.children || []).filter(c => c.isActive);
                      const isSubmenu = root.type === 'submenu';
                      const isOpen = !!mobileSubOpen[root.id];

                      if (isSubmenu) {
                        return (
                          <motion.li key={root.id} variants={stagger.item} className="border-t border-white/[0.07]">
                            <button
                              onClick={() => setMobileSubOpen(s => ({ ...s, [root.id]: !s[root.id] }))}
                              className="group relative w-full flex items-center justify-between py-3.5"
                              data-testid={`button-mobile-group-${root.id}`}
                              aria-expanded={isOpen}
                            >
                              <span className="flex items-center gap-2.5">
                                <span className={`font-display text-[19px] leading-none tracking-[0.02em] transition-colors ${isOpen ? 'text-white' : 'text-white group-hover:text-white/80'}`}>
                                  {root.title}
                                </span>
                                {children.length > 0 && (
                                  <span className="min-w-[20px] h-[20px] px-1 inline-flex items-center justify-center rounded-full border border-white/15 text-[9px] font-mono text-white/50">
                                    {children.length}
                                  </span>
                                )}
                              </span>
                              <motion.span
                                animate={{ rotate: isOpen ? 90 : 0 }}
                                transition={{ duration: 0.3 }}
                                className={`${isOpen ? 'text-white' : 'text-white/35'} transition-colors`}
                              >
                                <span className="block w-3 h-3 relative">
                                  <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-current" />
                                  <motion.span
                                    animate={{ scaleY: isOpen ? 0 : 1 }}
                                    transition={{ duration: 0.22 }}
                                    className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-current"
                                  />
                                </span>
                              </motion.span>
                            </button>
                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.ul
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                                  className="overflow-hidden pl-5 border-l border-white/15 ml-[2px] mb-3"
                                >
                                  {children.length === 0 ? (
                                    <li className="text-[10px] text-white/40 py-1.5">Henüz alt kategori yok</li>
                                  ) : children.map(child => {
                                    const href = hrefForMenu(child);
                                    return (
                                      <li key={child.id}>
                                        <Link
                                          href={href}
                                          onClick={() => setMobileOpen(false)}
                                          className="group flex items-center gap-2.5 py-2 text-white/60 hover:text-white transition-colors"
                                          data-testid={`link-mobile-mega-${child.id}`}
                                        >
                                          <span className="w-1 h-1 rounded-full bg-white/25 group-hover:bg-white transition-colors" />
                                          <span className="text-[11.5px] tracking-[0.14em] uppercase">
                                            {child.title}
                                          </span>
                                        </Link>
                                      </li>
                                    );
                                  })}
                                </motion.ul>
                              )}
                            </AnimatePresence>
                          </motion.li>
                        );
                      }

                      const href = hrefForMenu(root);
                      return (
                        <motion.li key={root.id} variants={stagger.item} className="border-t border-white/[0.07]">
                          <Link
                            href={href}
                            onClick={() => setMobileOpen(false)}
                            className="group relative flex items-center justify-between py-3.5"
                            data-testid={`link-mobile-root-${root.id}`}
                          >
                            <span className="font-display text-[19px] leading-none tracking-[0.02em] text-white transition-transform duration-300 group-active:translate-x-1">
                              {root.title}
                            </span>
                            <ArrowUpRight className="w-4 h-4 text-white/30 rotate-45 group-hover:rotate-0 group-hover:text-white transition-all duration-300" />
                          </Link>
                        </motion.li>
                      );
                    })
                  ) : (
                    visibleCategories.map((c) => {
                      return (
                        <motion.li key={c.id} variants={stagger.item} className="border-t border-white/[0.07]">
                          <Link
                            href={`/kategori/${c.slug}`}
                            onClick={() => setMobileOpen(false)}
                            className="group relative flex items-center justify-between py-3.5"
                            data-testid={`link-mobile-cat-${c.slug}`}
                          >
                            <span className="font-display text-[19px] leading-none tracking-[0.02em] text-white transition-transform duration-300 group-active:translate-x-1">
                              {c.name}
                            </span>
                            <ArrowUpRight className="w-4 h-4 text-white/30 rotate-45 group-hover:rotate-0 group-hover:text-white transition-all duration-300" />
                          </Link>
                        </motion.li>
                      );
                    })
                  )}

                  {user && (
                    <motion.li variants={stagger.item} className="border-t border-b border-white/[0.07]">
                      <Link
                        href="/hesabim"
                        onClick={() => setMobileOpen(false)}
                        className="group relative flex items-center justify-between py-3.5"
                        data-testid="link-mobile-hesabim"
                      >
                        <span className="flex items-center gap-3">
                          <User className="w-4 h-4 text-white/45 group-hover:text-white transition-colors" strokeWidth={1.75} />
                          <span className="font-display text-[19px] leading-none tracking-[0.02em] text-white group-hover:text-white/80 transition-colors">
                            Hesabım
                          </span>
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-white/30 rotate-45 group-hover:rotate-0 group-hover:text-white transition-all duration-300" />
                      </Link>
                    </motion.li>
                  )}
                </motion.ul>
              </nav>

              {/* ── Bottom: auth + cart CTA ── */}
              <div className="mobile-drawer-footer shrink-0">
                {!user && (
                  <div className="grid grid-cols-2 border-t border-white/10">
                    <Link
                      href="/giris"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center py-3.5 text-[11px] tracking-[0.18em] uppercase font-medium text-white/75 hover:text-white hover:bg-white/[0.05] transition-colors border-r border-white/10"
                      data-testid="link-mobile-giris"
                    >
                      Giriş Yap
                    </Link>
                    <Link
                      href="/kayit"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center py-3.5 text-[11px] tracking-[0.18em] uppercase font-bold text-black bg-white hover:bg-white/90 transition-colors"
                      data-testid="link-mobile-kayit"
                    >
                      Kayıt Ol
                    </Link>
                  </div>
                )}
                <Link
                  href="/sepet"
                  onClick={() => setMobileOpen(false)}
                  className="group relative bg-black/25 hover:bg-white/[0.08] transition-colors duration-500 px-6 py-4 flex items-center justify-between text-white"
                  data-testid="link-mobile-sepet"
                >
                  <span className="flex items-center gap-3">
                    <ShoppingBag className="w-4 h-4" strokeWidth={1.75} />
                    <span className="font-display text-[16px] tracking-[0.04em]">
                      Sepeti Görüntüle
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    {totalItems > 0 && (
                      <span className="min-w-[24px] h-[24px] px-2 bg-[#141414] group-hover:bg-white text-white group-hover:text-[#141414] text-[11px] font-bold flex items-center justify-center rounded-full transition-colors">
                        {totalItems}
                      </span>
                    )}
                    <ArrowUpRight className="w-4 h-4 transition-transform duration-500 group-hover:rotate-45" strokeWidth={1.75} />
                  </span>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
