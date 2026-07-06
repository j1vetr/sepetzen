import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingBag, Search, X, User, LogOut, ChevronDown, ArrowUpRight, Phone, Mail, Scissors, PawPrint, Tent, Sword, Axe, Shovel, Wrench, FlameKindling, Backpack, LayoutGrid, Target, Drill, HardHat, Flashlight, Compass, Map, Mountain, Flower, Bird, Fish, Rabbit, TreeDeciduous, TreePine, UtensilsCrossed, Dog, Cat, Layers, Zap, Waves } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent, type Variants } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
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
  if (t.includes('çakı') || t.includes('caki')) return Sword;
  if (t.includes('bıçak') || t.includes('bicak')) return Axe;
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
  if (t.includes('katlanır') || t.includes('katlanir') || t.includes('çakı') || t.includes('caki')) return Sword;
  if (t.includes('elektrik')) return Zap;
  if (t.includes('mutfak')) return UtensilsCrossed;
  if (t.includes('av bıçak') || t.includes('av bicak')) return Target;
  if (t.includes('kamp bıçak') || t.includes('kamp bicak')) return Mountain;
  if (t.includes('bıçak') || t.includes('bicak')) return Axe;
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
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const { totalItems } = useCart();
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
    `relative inline-flex items-center gap-1.5 whitespace-nowrap text-[9.5px] xl:text-[10px] font-medium tracking-[0.06em] xl:tracking-[0.10em] uppercase transition-colors nav-link-hover ${
      scrolled
        ? (active ? 'text-white' : 'text-white/70 hover:text-white')
        : (active ? 'text-black' : 'text-black/70 hover:text-black')
    }`;

  const activeMegaRoot = megaMenuId ? menuRoots.find(r => r.id === megaMenuId) : null;
  const activeMegaChildren = activeMegaRoot ? (activeMegaRoot.children || []).filter(c => c.isActive) : [];

  const megaCategoryId = activeMegaRoot?.category?.id ?? null;
  const { data: megaFeaturedProducts = [] } = useQuery<any[]>({
    queryKey: ['/api/products', 'mega', megaCategoryId],
    queryFn: async () => {
      if (!megaCategoryId) return [];
      const res = await fetch(`/api/products?categoryId=${megaCategoryId}&sort=popular`);
      if (!res.ok) return [];
      const all = await res.json();
      return all.slice(0, 2);
    },
    enabled: !!megaCategoryId,
    staleTime: 120000,
  });

  return (
    <>
      {/* ── Announcement Bar ── */}
      <div
        className="bg-[#2D5A27] text-white text-center py-2 px-4 text-[11px] tracking-[0.04em] font-medium"
        data-testid="announcement-bar"
      >
        1500 TL ve Üzeri Ücretsiz Kargo! &nbsp;|&nbsp; İlk Siparişinize Sepette %10 İndirim! &nbsp;|&nbsp; Havale/EFT'de %3 İndirim
      </div>

      {/* ── Brand bar (desktop): E-Posta · Logo · Telefon ── */}
      <div className="hidden lg:block bg-white border-b border-black/[0.06]">
        <div className="max-w-[1400px] mx-auto px-8 py-4 grid grid-cols-3 items-center gap-6">
          {/* Sol: E-Posta */}
          <a
            href="mailto:sepetzen@gmail.com"
            data-testid="link-header-email"
            aria-label="E-posta gönder"
            className="justify-self-start group flex items-center gap-3"
          >
            <span className="w-11 h-11 rounded-full border border-black/10 group-hover:border-[#2D5A27] flex items-center justify-center shrink-0 transition-colors">
              <Mail className="w-[17px] h-[17px] text-black/70 group-hover:text-[#2D5A27] transition-colors" strokeWidth={1.75} />
            </span>
            <span className="flex flex-col leading-tight whitespace-nowrap">
              <span className="text-[9px] tracking-[0.22em] uppercase text-black/45 font-mono">E-Posta</span>
              <span className="text-[13px] font-semibold text-black tracking-wide group-hover:text-[#2D5A27] transition-colors" data-testid="text-header-email">sepetzen@gmail.com</span>
            </span>
          </a>

          {/* Orta: Logo */}
          <Link href="/" data-testid="link-logo" className="justify-self-center block">
            <img
              src="/uploads/branding/sepetzen-logo-dark.png"
              alt="Sepetzen – Kamp, Outdoor, Bıçak ve Bağ Bahçe"
              data-testid="img-logo"
              className="h-14 w-auto object-contain mx-auto"
            />
          </Link>

          {/* Sağ: Telefon */}
          <a
            href="tel:+905366301138"
            data-testid="link-header-phone"
            aria-label="Telefonla ara"
            className="justify-self-end group flex items-center gap-3"
          >
            <span className="w-11 h-11 rounded-full border border-black/10 group-hover:border-[#2D5A27] flex items-center justify-center shrink-0 transition-colors">
              <Phone className="w-[17px] h-[17px] text-black/70 group-hover:text-[#2D5A27] transition-colors" strokeWidth={1.75} />
            </span>
            <span className="flex flex-col leading-tight whitespace-nowrap">
              <span className="text-[9px] tracking-[0.22em] uppercase text-black/45 font-mono">Bize Ulaşın</span>
              <span className="text-[13px] font-semibold text-black tracking-wide group-hover:text-[#2D5A27] transition-colors" data-testid="text-header-phone">0536 630 11 38</span>
            </span>
          </a>
        </div>
      </div>

      {/* ── Main header (nav bar) — desktop'ta sticky, mobile'da fixed ── */}
      <motion.header
        initial={false}
        animate={{ height: scrolled ? 64 : 72 }}
        transition={{ duration: 0.35, ease: [0.33, 1, 0.68, 1] }}
        className={`fixed lg:sticky top-0 left-0 right-0 z-40 flex items-center lg:!h-auto overflow-visible transition-all duration-300 ${
          scrolled
            ? 'bg-white lg:bg-[#0f1a0e] border-b border-black/8 lg:border-white/10 lg:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.45)]'
            : 'bg-white border-b border-black/8'
        }`}
        style={{ willChange: 'height' }}
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
              <span className="block h-px w-5 bg-black transition-all group-hover:w-6" />
              <span className="block h-px w-4 bg-black transition-all group-hover:w-6" />
              <span className="block h-px w-6 bg-black" />
            </button>

            <Link href="/" data-testid="link-logo-mobile-header" className="justify-self-center block">
              <img
                src="/uploads/branding/sepetzen-logo-dark.png"
                alt="Sepetzen"
                data-testid="img-logo-mobile-header"
                className="h-10 w-auto object-contain"
              />
            </Link>

            <div className="justify-self-end flex items-center gap-0.5">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSearchOpen(true)}
                className="p-2.5 text-black/65 hover:text-[#2D5A27] transition-colors"
                data-testid="button-search-mobile"
                aria-label="Ara"
              >
                <Search className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </motion.button>
              <Link href="/sepet" data-testid="link-cart-mobile">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="p-2.5 text-black/65 hover:text-[#2D5A27] transition-colors relative"
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
                        className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-[#2D5A27] text-white text-[9px] font-bold flex items-center justify-center rounded-full leading-none"
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
          <div className="hidden lg:grid grid-cols-[1fr_auto_1fr] items-center gap-10 xl:gap-16">

            {/* Sol: scroll edildiğinde küçük logo görünür */}
            <div className="justify-self-start flex items-center min-w-0 h-[44px]">
              <AnimatePresence>
                {scrolled && (
                  <motion.div
                    key="scrolled-logo"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
                  >
                    <Link href="/" data-testid="link-logo-compact" className="block shrink-0">
                      <img
                        src="/uploads/branding/sepetzen-logo-white.png"
                        alt="Sepetzen"
                        className="h-10 w-auto object-contain"
                      />
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Orta: Desktop nav */}
            <nav className="justify-self-center flex items-center gap-3 xl:gap-5 min-w-0 relative">
              {useMenuTree ? (
                menuRoots.map((root) => {
                  const children = (root.children || []).filter(c => c.isActive);
                  const Icon = getMenuIcon(root.title);
                  const isActiveMega = megaMenuId === root.id;

                  if (root.type === 'submenu') {
                    return (
                      <div
                        key={root.id}
                        className="relative"
                        onMouseEnter={() => openMega(root.id)}
                        onMouseLeave={closeMega}
                      >
                        <button
                          className={`${navLinkCls(isActiveMega)} ${isActiveMega ? 'text-[#2D5A27]' : ''}`}
                          data-testid={`button-nav-root-${root.id}`}
                          aria-expanded={isActiveMega}
                          aria-haspopup="true"
                        >
                          <Icon className="w-3 h-3 shrink-0" strokeWidth={2} />
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
                  return (
                    <Link
                      key={root.id}
                      href={href}
                      className={navLinkCls(isActive)}
                      data-testid={`link-nav-root-${root.id}`}
                    >
                      <Icon className="w-3 h-3 shrink-0" strokeWidth={2} />
                      {root.title}
                    </Link>
                  );
                })
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
                    className="bg-white border-black/8 shadow-xl rounded-none p-5"
                    style={{ minWidth: visibleCategories.length > 6 ? 520 : 240 }}
                  >
                    {visibleCategories.length === 0 ? (
                      <DropdownMenuItem
                        onClick={() => navigate('/magaza')}
                        className="text-[11px] tracking-wider uppercase text-black hover:bg-black/5 cursor-pointer py-2.5"
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
                            className="text-[11px] tracking-[0.16em] uppercase text-black hover:bg-[hsl(var(--polen-cream))] hover:text-[#2D5A27] cursor-pointer py-2.5 px-3 rounded-none transition-colors"
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

              {/* ── MEGA MENU PANEL ── */}
              <AnimatePresence>
                {megaMenuId && activeMegaRoot && activeMegaRoot.type === 'submenu' && activeMegaChildren.length > 0 && (
                  <motion.div
                    key={megaMenuId}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute top-[calc(100%+8px)] left-1/2 w-screen max-w-[100vw] bg-white shadow-[0_40px_80px_-16px_rgba(0,0,0,0.24)] z-50 overflow-hidden"
                    style={{ left: '50%', transform: 'translateX(-50%)' }}
                    onMouseEnter={cancelClose}
                    onMouseLeave={closeMega}
                    data-testid={`mega-panel-${megaMenuId}`}
                  >
                    <div className="max-w-[1400px] mx-auto flex min-h-[260px]">

                      {/* ── LEFT: Dark green hero sidebar ── */}
                      <div className="w-60 xl:w-72 shrink-0 bg-[#1a3a15] px-7 py-8 flex flex-col justify-between relative overflow-hidden">
                        {/* Subtle dot texture */}
                        <div
                          className="absolute inset-0 opacity-[0.06] pointer-events-none"
                          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                        />
                        <div className="relative z-10 flex flex-col h-full">
                          {/* Icon badge */}
                          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-5 shrink-0">
                            {(() => { const Icon = getMenuIcon(activeMegaRoot.title); return <Icon className="w-5 h-5 text-white" strokeWidth={1.75} />; })()}
                          </div>
                          {/* Title */}
                          <h3 className="text-[22px] xl:text-[26px] font-black text-white leading-none tracking-tight mb-3">
                            {activeMegaRoot.title}
                          </h3>
                          {/* Description */}
                          <p className="text-white/55 text-[11.5px] leading-relaxed flex-1">
                            {getCategoryDesc(activeMegaRoot.title)}
                          </p>
                          {/* CTA */}
                          {activeMegaRoot.category && (
                            <Link
                              href={`/kategori/${activeMegaRoot.category.slug}`}
                              onClick={() => setMegaMenuId(null)}
                              className="mt-6 inline-flex items-center gap-2 text-[10.5px] tracking-[0.16em] uppercase font-bold text-[#1a3a15] bg-white hover:bg-white/90 transition-colors px-4 py-3 shrink-0 self-start"
                              data-testid={`link-mega-all-${megaMenuId}`}
                            >
                              Tümünü Keşfet <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* ── MIDDLE: Subcategory grid ── */}
                      <div className="flex-1 px-8 xl:px-10 py-8 border-r border-black/[0.06]">
                        <div className="text-[9px] tracking-[0.30em] uppercase text-black/30 font-mono mb-5">
                          Alt Kategoriler
                        </div>
                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-3 gap-y-1">
                          {activeMegaChildren.map((child) => {
                            const childHref = hrefForMenu(child);
                            const ChildIcon = getSubIcon(child.title);
                            return (
                              <Link
                                key={child.id}
                                href={childHref}
                                onClick={() => setMegaMenuId(null)}
                                className="group flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[#2D5A27]/[0.06] transition-all duration-150"
                                data-testid={`link-mega-${child.id}`}
                              >
                                <span className="w-8 h-8 rounded-lg bg-[#2D5A27]/[0.08] group-hover:bg-[#2D5A27]/[0.16] flex items-center justify-center shrink-0 transition-colors">
                                  <ChildIcon className="w-3.5 h-3.5 text-[#2D5A27]" strokeWidth={1.75} />
                                </span>
                                <span className="text-[12px] text-black/65 group-hover:text-black transition-colors font-medium leading-tight flex-1">
                                  {child.title}
                                </span>
                                <ArrowUpRight className="w-3 h-3 text-transparent group-hover:text-[#2D5A27]/50 transition-colors shrink-0" />
                              </Link>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── RIGHT: Featured products ── */}
                      {megaFeaturedProducts.length > 0 && (
                        <div className="w-52 xl:w-60 shrink-0 px-6 py-8">
                          <div className="text-[9px] tracking-[0.30em] uppercase text-black/30 font-mono mb-5">
                            Öne Çıkan
                          </div>
                          <div className="space-y-4">
                            {megaFeaturedProducts.map((product: any) => (
                              <Link
                                key={product.id}
                                href={`/urun/${product.slug}`}
                                onClick={() => setMegaMenuId(null)}
                                className="group flex gap-3 items-start"
                                data-testid={`link-mega-product-${product.id}`}
                              >
                                <div className="w-[56px] h-[56px] rounded-lg overflow-hidden shrink-0 bg-black/[0.04]">
                                  {product.images?.[0] ? (
                                    <img
                                      src={product.images[0]}
                                      alt={product.name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      {(() => { const Icon = getMenuIcon(activeMegaRoot.title); return <Icon className="w-5 h-5 text-black/20" />; })()}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11.5px] font-medium text-black/75 leading-snug line-clamp-2 group-hover:text-black transition-colors">
                                    {product.name}
                                  </p>
                                  <p className="text-[13px] font-bold text-[#2D5A27] mt-1">
                                    {Number(product.price).toLocaleString('tr-TR')} ₺
                                  </p>
                                </div>
                              </Link>
                            ))}
                          </div>
                          {activeMegaRoot.category && (
                            <Link
                              href={`/kategori/${activeMegaRoot.category.slug}`}
                              onClick={() => setMegaMenuId(null)}
                              className="mt-5 text-[9.5px] tracking-[0.18em] uppercase text-[#2D5A27] hover:text-[#2D5A27]/70 transition-colors font-semibold flex items-center gap-1"
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
            </nav>

            {/* Right: Icons */}
            <div className="justify-self-end flex items-center gap-2 xl:gap-3 shrink-0">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSearchOpen(true)}
                className={`p-3 transition-colors ${scrolled ? 'text-white/65 hover:text-white' : 'text-black/65 hover:text-[#2D5A27]'}`}
                data-testid="button-search"
                aria-label="Ara"
              >
                <Search className="w-[22px] h-[22px]" strokeWidth={1.75} />
              </motion.button>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.button whileTap={{ scale: 0.9 }} className={`p-3 transition-colors flex items-center gap-2 ${scrolled ? 'text-white/65 hover:text-white' : 'text-black/65 hover:text-[#2D5A27]'}`} data-testid="button-account" aria-label="Hesabım">
                      <User className="w-[18px] h-[18px]" strokeWidth={1.75} />
                      <span className="text-[11px] tracking-[0.18em] uppercase font-medium hidden xl:inline">Hesabım</span>
                    </motion.button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border-black/8 shadow-lg rounded-none min-w-[180px]">
                    <DropdownMenuItem disabled className="text-[10px] tracking-widest text-black/30 uppercase">{user.firstName || user.email}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/hesabim')} className="text-[11px] tracking-wider uppercase text-black hover:bg-black/5 cursor-pointer py-2.5">
                      <User className="w-4 h-4 mr-2" />Hesabım
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { logout(); navigate('/'); }} className="text-[11px] tracking-wider uppercase text-black hover:bg-black/5 cursor-pointer py-2.5">
                      <LogOut className="w-4 h-4 mr-2" />Çıkış Yap
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      className={`p-3 transition-colors flex items-center gap-1.5 ${scrolled ? 'text-white/65 hover:text-white' : 'text-black/65 hover:text-[#2D5A27]'}`}
                      data-testid="button-account-guest"
                      aria-label="Giriş Yap"
                    >
                      <User className="w-[22px] h-[22px]" strokeWidth={1.75} />
                    </motion.button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border-black/8 shadow-lg rounded-none min-w-[190px] p-1">
                    <DropdownMenuItem
                      onClick={() => navigate('/giris')}
                      className="text-[11px] tracking-[0.14em] uppercase text-black hover:bg-black/5 cursor-pointer py-3 px-4 gap-2.5"
                      data-testid="link-header-giris"
                    >
                      <User className="w-4 h-4 shrink-0 text-black/40" strokeWidth={1.75} />
                      Giriş Yap
                    </DropdownMenuItem>
                    <div className="px-2 pb-1">
                      <button
                        type="button"
                        onClick={() => navigate('/kayit')}
                        className="w-full mt-0.5 py-2.5 text-[11px] tracking-[0.14em] uppercase font-bold text-white bg-[#2D5A27] hover:bg-[#234a1e] transition-colors cursor-pointer text-center"
                        data-testid="link-header-kayit"
                      >
                        Kayıt Ol
                      </button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Link href="/sepet">
                <motion.button whileTap={{ scale: 0.9 }} className={`p-3 transition-colors relative ${scrolled ? 'text-white/65 hover:text-white' : 'text-black/65 hover:text-[#2D5A27]'}`} data-testid="button-cart" aria-label="Sepet">
                  <ShoppingBag className="w-[22px] h-[22px]" strokeWidth={1.75} />
                  <AnimatePresence>
                    {totalItems > 0 && (
                      <motion.span
                        key="badge"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-[#2D5A27] text-white text-[10px] font-bold flex items-center justify-center rounded-full leading-none"
                      >
                        {totalItems > 9 ? '9+' : totalItems}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

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
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-md"
              data-testid="overlay-mobile-menu"
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-[92%] max-w-[420px] bg-white flex flex-col overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.25)]"
              data-testid="drawer-mobile-menu"
            >
              {/* ── Hero panel: brand header ── */}
              <div className="relative h-[120px] shrink-0 overflow-hidden border-b border-black/8 bg-[#0f1a0e] flex items-center justify-center">
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

                <Link href="/" onClick={() => setMobileOpen(false)} data-testid="link-logo-mobile-drawer" className="block">
                  <img
                    src="/uploads/branding/sepetzen-logo-white.png"
                    alt="Sepetzen"
                    data-testid="img-logo-mobile-drawer"
                    className="h-16 w-auto object-contain"
                  />
                </Link>
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
                  {/* Ana Sayfa */}
                  <motion.li variants={stagger.item}>
                    <Link
                      href="/"
                      onClick={() => setMobileOpen(false)}
                      className="group relative flex items-center justify-between py-2.5"
                      data-testid="link-mobile-home"
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-[9px] font-mono tracking-[0.18em] text-black/30 group-hover:text-[#2D5A27] transition-colors">
                          01
                        </span>
                        <span className="font-display text-[17px] leading-none tracking-[0.01em] text-black group-hover:text-[#2D5A27] transition-colors">
                          Ana Sayfa
                        </span>
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-black/25 rotate-45 group-hover:rotate-0 group-hover:text-[#2D5A27] transition-all duration-300" />
                    </Link>
                  </motion.li>

                  {useMenuTree ? (
                    menuRoots.map((root, idx) => {
                      const children = (root.children || []).filter(c => c.isActive);
                      const isSubmenu = root.type === 'submenu';
                      const isOpen = !!mobileSubOpen[root.id];
                      const number = String(idx + 2).padStart(2, '0');
                      const Icon = getMenuIcon(root.title);

                      if (isSubmenu) {
                        return (
                          <motion.li key={root.id} variants={stagger.item} className="border-t border-black/[0.08]">
                            <button
                              onClick={() => setMobileSubOpen(s => ({ ...s, [root.id]: !s[root.id] }))}
                              className="group relative w-full flex items-center justify-between py-2.5"
                              data-testid={`button-mobile-group-${root.id}`}
                              aria-expanded={isOpen}
                            >
                              <span className="flex items-center gap-3">
                                <span className={`text-[9px] font-mono tracking-[0.18em] transition-colors ${isOpen ? 'text-[#2D5A27]' : 'text-black/30 group-hover:text-[#2D5A27]'}`}>
                                  {number}
                                </span>
                                <Icon className={`w-3.5 h-3.5 transition-colors ${isOpen ? 'text-[#2D5A27]' : 'text-black/40 group-hover:text-[#2D5A27]'}`} strokeWidth={2} />
                                <span className={`font-display text-[17px] leading-none tracking-[0.01em] transition-colors ${isOpen ? 'text-[#2D5A27]' : 'text-black group-hover:text-[#2D5A27]'}`}>
                                  {root.title}
                                </span>
                                <span className="text-[9px] text-black/35 self-center">({children.length})</span>
                              </span>
                              <motion.span
                                animate={{ rotate: isOpen ? 90 : 0 }}
                                transition={{ duration: 0.3 }}
                                className={`${isOpen ? 'text-[#2D5A27]' : 'text-black/30'} transition-colors`}
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
                                  className="overflow-hidden pl-7 border-l border-[#2D5A27]/30 ml-[3px] mb-2"
                                >
                                  {children.length === 0 ? (
                                    <li className="text-[10px] text-black/35 py-1.5">Henüz alt kategori yok</li>
                                  ) : children.map(child => {
                                    const href = hrefForMenu(child);
                                    const ChildIcon = getMenuIcon(child.title);
                                    return (
                                      <li key={child.id}>
                                        <Link
                                          href={href}
                                          onClick={() => setMobileOpen(false)}
                                          className="group flex items-center gap-2 py-1.5 text-black/70 hover:text-[#2D5A27] transition-colors"
                                          data-testid={`link-mobile-mega-${child.id}`}
                                        >
                                          <ChildIcon className="w-3 h-3 text-[#2D5A27]/60 group-hover:text-[#2D5A27] transition-colors" strokeWidth={2} />
                                          <span className="text-[11px] tracking-[0.12em] uppercase">
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
                        <motion.li key={root.id} variants={stagger.item} className="border-t border-black/[0.08]">
                          <Link
                            href={href}
                            onClick={() => setMobileOpen(false)}
                            className="group relative flex items-center justify-between py-2.5"
                            data-testid={`link-mobile-root-${root.id}`}
                          >
                            <span className="flex items-center gap-3">
                              <span className="text-[9px] font-mono tracking-[0.18em] text-black/30 group-hover:text-[#2D5A27] transition-colors">
                                {number}
                              </span>
                              <Icon className="w-3.5 h-3.5 text-black/40 group-hover:text-[#2D5A27] transition-colors" strokeWidth={2} />
                              <span className="font-display text-[17px] leading-none tracking-[0.01em] text-black group-hover:text-[#2D5A27] transition-colors">
                                {root.title}
                              </span>
                            </span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-black/25 rotate-45 group-hover:rotate-0 group-hover:text-[#2D5A27] transition-all duration-300" />
                          </Link>
                        </motion.li>
                      );
                    })
                  ) : (
                    visibleCategories.map((c, idx) => {
                      const Icon = getMenuIcon(c.name);
                      return (
                        <motion.li key={c.id} variants={stagger.item} className="border-t border-black/[0.08]">
                          <Link
                            href={`/kategori/${c.slug}`}
                            onClick={() => setMobileOpen(false)}
                            className="group relative flex items-center justify-between py-2.5"
                            data-testid={`link-mobile-cat-${c.slug}`}
                          >
                            <span className="flex items-center gap-3">
                              <span className="text-[9px] font-mono tracking-[0.18em] text-black/30 group-hover:text-[#2D5A27] transition-colors">
                                {String(idx + 2).padStart(2, '0')}
                              </span>
                              <Icon className="w-3.5 h-3.5 text-black/40 group-hover:text-[#2D5A27] transition-colors" strokeWidth={2} />
                              <span className="font-display text-[17px] leading-none tracking-[0.01em] text-black group-hover:text-[#2D5A27] transition-colors">
                                {c.name}
                              </span>
                            </span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-black/25 rotate-45 group-hover:rotate-0 group-hover:text-[#2D5A27] transition-all duration-300" />
                          </Link>
                        </motion.li>
                      );
                    })
                  )}

                  {user && (
                    <motion.li variants={stagger.item} className="border-t border-b border-black/[0.08]">
                      <Link
                        href="/hesabim"
                        onClick={() => setMobileOpen(false)}
                        className="group relative flex items-center justify-between py-2.5"
                        data-testid="link-mobile-hesabim"
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-[9px] font-mono tracking-[0.18em] text-black/30 group-hover:text-[#2D5A27] transition-colors">
                            ★
                          </span>
                          <span className="font-display text-[17px] leading-none tracking-[0.01em] text-black group-hover:text-[#2D5A27] transition-colors">
                            Hesabım
                          </span>
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-black/25 rotate-45 group-hover:rotate-0 group-hover:text-[#2D5A27] transition-all duration-300" />
                      </Link>
                    </motion.li>
                  )}
                </motion.ul>
              </nav>

              {/* ── Bottom: auth + cart CTA ── */}
              <div className="shrink-0">
                {!user && (
                  <div className="grid grid-cols-2 border-t border-black/8">
                    <Link
                      href="/giris"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center py-3.5 text-[11px] tracking-[0.18em] uppercase font-medium text-black/75 hover:text-[#2D5A27] hover:bg-black/[0.03] transition-colors border-r border-black/8"
                      data-testid="link-mobile-giris"
                    >
                      Giriş Yap
                    </Link>
                    <Link
                      href="/kayit"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center py-3.5 text-[11px] tracking-[0.18em] uppercase font-bold text-white bg-[#2D5A27] hover:bg-[#2D5A27]/90 transition-colors"
                      data-testid="link-mobile-kayit"
                    >
                      Kayıt Ol
                    </Link>
                  </div>
                )}
                <Link
                  href="/sepet"
                  onClick={() => setMobileOpen(false)}
                  className="group relative bg-black hover:bg-[#2D5A27] transition-colors duration-500 px-6 py-4 flex items-center justify-between text-white"
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
                      <span className="min-w-[24px] h-[24px] px-2 bg-[#2D5A27] group-hover:bg-white text-white group-hover:text-[#2D5A27] text-[11px] font-bold flex items-center justify-center rounded-full transition-colors">
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
