import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingBag, Search, X, User, LogOut, ChevronDown, ArrowUpRight } from 'lucide-react';
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
import polenLogo from '@assets/Polen-Sticker-1.pdf_1777239312980.png';
import marbleHero from '@assets/generated_images/polen-hero-1.png';

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

export function Header() {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileCatOpen, setMobileCatOpen] = useState(false);
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 48));

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const { data: categoriesData = [] } = useQuery<CategoryData[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  // Hide legacy fitness categories (display_order >= 100); show only stone categories
  const visibleCategories = categoriesData
    .filter(c => (c.displayOrder ?? 0) < 100)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  // Static nav links (always visible)
  const staticLinks = [
    { href: '/magaza', label: 'Mağaza', testId: 'link-nav-magaza' },
    { href: '/hakkimizda', label: 'Hakkımızda', testId: 'link-nav-hakkimizda' },
  ];

  const navLinkCls = (active: boolean) =>
    `relative inline-flex items-center gap-1 text-[11px] font-medium tracking-[0.18em] uppercase transition-colors nav-link-hover ${active ? 'text-black' : 'text-black/70 hover:text-black'}`;

  return (
    <>
      {/* ── Announcement bar ── */}
      <div className="hidden lg:flex bg-[hsl(var(--polen-stone))] h-9 items-center justify-center gap-0">
        <div className="flex items-center gap-8 px-10">
          <div className="flex items-center gap-2.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-polen-orange shrink-0">
              <path d="M12 2 4 7v10l8 5 8-5V7l-8-5z"/><path d="M4 7l8 5 8-5"/><path d="M12 12v10"/>
            </svg>
            <span className="text-[10px] tracking-[0.28em] uppercase text-white/75 font-medium">Türkiye Geneli Kargo</span>
          </div>
          <span className="w-px h-3 bg-white/15" />
          <div className="flex items-center gap-2.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-polen-orange shrink-0">
              <circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/>
            </svg>
            <span className="text-[10px] tracking-[0.28em] uppercase text-white/75 font-medium">Ücretsiz Numune Talebi</span>
          </div>
        </div>
      </div>

      {/* ── Main header ── */}
      <motion.header
        initial={false}
        animate={{ height: scrolled ? 64 : 72 }}
        transition={{ duration: 0.35, ease: [0.33, 1, 0.68, 1] }}
        className="fixed lg:static top-0 left-0 right-0 z-40 bg-white border-b border-black/8 flex items-center lg:!h-auto"
        style={{ willChange: 'height' }}
      >
        <div className="w-full max-w-[1400px] mx-auto px-4 lg:px-8 lg:py-3">
          {/* ── Mobile layout: hamburger / centered logo / icons ── */}
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
              <motion.img
                src={polenLogo}
                alt="Polen Stone — Doğal Taş & Mermer"
                animate={{ height: scrolled ? 40 : 48 }}
                transition={{ duration: 0.35, ease: [0.33, 1, 0.68, 1] }}
                className="w-auto object-contain"
                data-testid="img-logo-mobile-header"
                style={{ willChange: 'height' }}
              />
            </Link>

            <div className="justify-self-end flex items-center gap-0.5">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSearchOpen(true)}
                className="p-2.5 text-black/65 hover:text-polen-orange transition-colors"
                data-testid="button-search-mobile"
                aria-label="Ara"
              >
                <Search className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </motion.button>
              <Link href="/sepet" data-testid="link-cart-mobile">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="p-2.5 text-black/65 hover:text-polen-orange transition-colors relative"
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
                        className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-polen-orange text-white text-[9px] font-bold flex items-center justify-center rounded-full leading-none"
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
          <div className="hidden lg:flex items-center justify-between gap-6">

            {/* Left: Logo */}
            <div className="flex items-center gap-4 min-w-0">
              <Link href="/" data-testid="link-logo" className="shrink-0 block">
                <motion.img
                  src={polenLogo}
                  alt="Polen Stone — Doğal Taş & Mermer"
                  whileHover={{ opacity: 0.85 }}
                  transition={{ duration: 0.2 }}
                  animate={{ height: scrolled ? 60 : 88 }}
                  className="w-auto object-contain"
                  data-testid="img-logo"
                  style={{ willChange: 'height' }}
                />
              </Link>
            </div>

            {/* Center: Desktop nav */}
            <nav className="hidden lg:flex items-center gap-8">
              {/* Categories mega-dropdown */}
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
                  className="bg-white border-black/8 shadow-xl rounded-none p-3"
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
                      {visibleCategories.map((c) => {
                        const href = `/kategori/${c.slug}`;
                        return (
                          <DropdownMenuItem
                            key={c.id}
                            onClick={() => navigate(href)}
                            className="text-[11px] tracking-[0.16em] uppercase text-black hover:bg-[hsl(var(--polen-cream))] hover:text-polen-orange cursor-pointer py-2.5 px-3 rounded-none transition-colors"
                            data-testid={`link-cat-${c.slug}`}
                          >
                            {c.name}
                          </DropdownMenuItem>
                        );
                      })}
                      <div
                        className="border-t border-black/10 mt-2 pt-2"
                        style={{ gridColumn: visibleCategories.length > 6 ? '1 / -1' : 'auto' }}
                      >
                        <DropdownMenuItem
                          onClick={() => navigate('/magaza')}
                          className="text-[11px] tracking-[0.16em] uppercase text-polen-orange font-semibold hover:bg-[hsl(var(--polen-cream))] cursor-pointer py-2.5 px-3 rounded-none"
                          data-testid="link-cat-tum-urunler"
                        >
                          Tüm Ürünler →
                        </DropdownMenuItem>
                      </div>
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {staticLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={navLinkCls(location === link.href)}
                  data-testid={link.testId}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right: Icons */}
            <div className="flex items-center gap-1 shrink-0">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSearchOpen(true)}
                className="p-3 text-black/65 hover:text-polen-orange transition-colors"
                data-testid="button-search"
                aria-label="Ara"
              >
                <Search className="w-[22px] h-[22px]" strokeWidth={1.75} />
              </motion.button>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.button whileTap={{ scale: 0.9 }} className="p-3 text-black/65 hover:text-polen-orange transition-colors" data-testid="button-account" aria-label="Hesabım">
                      <User className="w-[22px] h-[22px]" strokeWidth={1.75} />
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
                <Link href="/giris">
                  <motion.button whileTap={{ scale: 0.9 }} className="p-3 text-black/65 hover:text-polen-orange transition-colors" data-testid="button-account" aria-label="Giriş Yap">
                    <User className="w-[22px] h-[22px]" strokeWidth={1.75} />
                  </motion.button>
                </Link>
              )}

              <Link href="/sepet">
                <motion.button whileTap={{ scale: 0.9 }} className="p-3 text-black/65 hover:text-polen-orange transition-colors relative" data-testid="button-cart" aria-label="Sepet">
                  <ShoppingBag className="w-[22px] h-[22px]" strokeWidth={1.75} />
                  <AnimatePresence>
                    {totalItems > 0 && (
                      <motion.span
                        key="badge"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-polen-orange text-white text-[10px] font-bold flex items-center justify-center rounded-full leading-none"
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
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-md"
              data-testid="overlay-mobile-menu"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-[92%] max-w-[420px] bg-white flex flex-col overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.25)]"
              data-testid="drawer-mobile-menu"
            >
              {/* ── Hero panel: marble bg with brand identity ── */}
              <div className="relative h-[210px] shrink-0 overflow-hidden">
                <img
                  src={marbleHero}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  aria-hidden="true"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/55 to-black/85" />

                {/* Top utility row */}
                <div className="relative z-10 flex items-start justify-between px-6 pt-5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[9px] font-mono tracking-[0.32em] uppercase text-white/60">
                      Menü ‘26
                    </span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={() => setMobileOpen(false)}
                    className="group relative -mr-2 -mt-1 p-2 text-white/85 hover:text-white transition-colors"
                    data-testid="button-close-menu"
                    aria-label="Menüyü Kapat"
                  >
                    <span className="absolute inset-0 m-auto w-9 h-9 rounded-full border border-white/25 group-hover:border-white/60 transition-colors" />
                    <X className="relative w-4 h-4" strokeWidth={1.75} />
                  </motion.button>
                </div>

                {/* Logo + tagline block */}
                <div className="absolute z-10 left-6 right-6 bottom-5 flex items-end gap-4">
                  <Link
                    href="/"
                    onClick={() => setMobileOpen(false)}
                    className="block shrink-0"
                    data-testid="link-mobile-logo"
                  >
                    <img
                      src={polenLogo}
                      alt="Polen Stone"
                      className="h-[88px] w-[88px] object-contain drop-shadow-[0_4px_18px_rgba(0,0,0,0.35)]"
                      data-testid="img-logo-mobile-drawer"
                    />
                  </Link>
                  <div className="flex flex-col pb-1.5">
                    <span className="font-display text-white text-[22px] leading-[1] tracking-[0.04em]">
                      Polen Stone
                    </span>
                    <span className="text-white/60 text-[9px] tracking-[0.34em] uppercase mt-2">
                      Doğal Taş & Mermer
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Editorial nav list ── */}
              <nav className="flex-1 overflow-y-auto bg-white">
                {/* Section caption */}
                <div className="flex items-center justify-between px-6 pt-7 pb-3">
                  <span className="text-[9px] font-mono tracking-[0.32em] uppercase text-black/35">
                    İçerik
                  </span>
                  <span className="text-[9px] font-mono tracking-[0.32em] uppercase text-black/25">
                    05 bağlantı
                  </span>
                </div>

                <motion.ul
                  variants={stagger.container}
                  initial="initial"
                  animate="animate"
                  exit="initial"
                  className="flex flex-col px-6"
                >
                  {[
                    { href: '/', label: 'Ana Sayfa', testId: 'link-mobile-home' },
                    { href: '/magaza', label: 'Mağaza', testId: 'link-mobile-magaza' },
                  ].map((link, idx) => (
                    <motion.li key={link.href} variants={stagger.item} className="border-t border-black/[0.08]">
                      <Link
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className="group relative flex items-baseline justify-between py-4"
                        data-testid={link.testId}
                      >
                        <span className="flex items-baseline gap-5">
                          <span className="text-[10px] font-mono tracking-[0.18em] text-black/30 group-hover:text-polen-orange transition-colors">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="font-display text-[24px] leading-none tracking-[0.01em] text-black group-hover:text-polen-orange transition-colors">
                            {link.label}
                          </span>
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-black/25 rotate-45 group-hover:rotate-0 group-hover:text-polen-orange transition-all duration-300" />
                      </Link>
                    </motion.li>
                  ))}

                  {/* Categories — accordion */}
                  <motion.li variants={stagger.item} className="border-t border-black/[0.08]">
                    <button
                      onClick={() => setMobileCatOpen(v => !v)}
                      className="group relative w-full flex items-baseline justify-between py-4"
                      data-testid="button-mobile-kategoriler"
                      aria-expanded={mobileCatOpen}
                    >
                      <span className="flex items-baseline gap-5">
                        <span className={`text-[10px] font-mono tracking-[0.18em] transition-colors ${mobileCatOpen ? 'text-polen-orange' : 'text-black/30 group-hover:text-polen-orange'}`}>
                          03
                        </span>
                        <span className={`font-display text-[24px] leading-none tracking-[0.01em] transition-colors ${mobileCatOpen ? 'text-polen-orange' : 'text-black group-hover:text-polen-orange'}`}>
                          Kategoriler
                        </span>
                      </span>
                      <motion.span
                        animate={{ rotate: mobileCatOpen ? 90 : 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className={`${mobileCatOpen ? 'text-polen-orange' : 'text-black/30'} transition-colors`}
                      >
                        <span className="block w-3.5 h-3.5 relative">
                          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-current" />
                          <motion.span
                            animate={{ scaleY: mobileCatOpen ? 0 : 1 }}
                            transition={{ duration: 0.25 }}
                            className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-current"
                          />
                        </span>
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {mobileCatOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <ul className="pb-4 pl-9 border-l border-polen-orange/30 ml-[3px] mb-2">
                            {(visibleCategories.length === 0
                              ? [{ id: 'all-fb', slug: '', name: 'Tüm Ürünler →', href: '/magaza', testId: 'link-mobile-cat-tum-urunler' }]
                              : [
                                  ...visibleCategories.map(c => ({ id: c.id, slug: c.slug, name: c.name, href: `/kategori/${c.slug}`, testId: `link-mobile-cat-${c.slug}` })),
                                  { id: 'all', slug: '', name: 'Tüm Ürünler →', href: '/magaza', testId: 'link-mobile-cat-tum-urunler' },
                                ]
                            ).map((c, idx, arr) => (
                              <li key={c.id}>
                                <Link
                                  href={c.href}
                                  onClick={() => setMobileOpen(false)}
                                  className={`group flex items-baseline gap-3 py-2.5 transition-colors ${idx === arr.length - 1 && arr.length > 1 ? 'text-polen-orange font-semibold' : 'text-black/65 hover:text-polen-orange'}`}
                                  data-testid={c.testId}
                                >
                                  <span className="text-[8px] font-mono tracking-[0.16em] text-black/30 mt-0.5">
                                    {String(idx + 1).padStart(2, '0')}
                                  </span>
                                  <span className="text-[13px] tracking-[0.14em] uppercase">
                                    {c.name}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>

                  <motion.li variants={stagger.item} className="border-t border-black/[0.08]">
                    <Link
                      href="/hakkimizda"
                      onClick={() => setMobileOpen(false)}
                      className="group relative flex items-baseline justify-between py-4"
                      data-testid="link-mobile-hakkimizda"
                    >
                      <span className="flex items-baseline gap-5">
                        <span className="text-[10px] font-mono tracking-[0.18em] text-black/30 group-hover:text-polen-orange transition-colors">
                          04
                        </span>
                        <span className="font-display text-[24px] leading-none tracking-[0.01em] text-black group-hover:text-polen-orange transition-colors">
                          Hakkımızda
                        </span>
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-black/25 rotate-45 group-hover:rotate-0 group-hover:text-polen-orange transition-all duration-300" />
                    </Link>
                  </motion.li>

                  <motion.li variants={stagger.item} className="border-t border-b border-black/[0.08]">
                    {user ? (
                      <Link
                        href="/hesabim"
                        onClick={() => setMobileOpen(false)}
                        className="group relative flex items-baseline justify-between py-4"
                        data-testid="link-mobile-hesabim"
                      >
                        <span className="flex items-baseline gap-5">
                          <span className="text-[10px] font-mono tracking-[0.18em] text-black/30 group-hover:text-polen-orange transition-colors">
                            05
                          </span>
                          <span className="font-display text-[24px] leading-none tracking-[0.01em] text-black group-hover:text-polen-orange transition-colors">
                            Hesabım
                          </span>
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-black/25 rotate-45 group-hover:rotate-0 group-hover:text-polen-orange transition-all duration-300" />
                      </Link>
                    ) : (
                      <Link
                        href="/giris"
                        onClick={() => setMobileOpen(false)}
                        className="group relative flex items-baseline justify-between py-4"
                        data-testid="link-mobile-giris"
                      >
                        <span className="flex items-baseline gap-5">
                          <span className="text-[10px] font-mono tracking-[0.18em] text-black/30 group-hover:text-polen-orange transition-colors">
                            05
                          </span>
                          <span className="font-display text-[24px] leading-none tracking-[0.01em] text-black group-hover:text-polen-orange transition-colors">
                            Giriş Yap
                          </span>
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-black/25 rotate-45 group-hover:rotate-0 group-hover:text-polen-orange transition-all duration-300" />
                      </Link>
                    )}
                  </motion.li>
                </motion.ul>

                {/* Promo footnote only */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.5 }}
                  className="mx-6 mt-8 mb-6 pt-5 border-t border-black/[0.08] flex items-center gap-2.5"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-polen-orange shrink-0">
                    <circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/>
                  </svg>
                  <span className="text-[10px] tracking-[0.22em] uppercase text-black/60 font-medium">
                    Ücretsiz Numune Talebi · Türkiye Geneli Kargo
                  </span>
                </motion.div>
              </nav>

              {/* ── Bottom: editorial cart CTA ── */}
              <Link
                href="/sepet"
                onClick={() => setMobileOpen(false)}
                className="group relative shrink-0 bg-black hover:bg-polen-orange transition-colors duration-500 px-6 py-5 flex items-center justify-between text-white"
                data-testid="link-mobile-sepet"
              >
                <span className="flex items-center gap-4">
                  <span className="text-[9px] font-mono tracking-[0.32em] uppercase text-white/45 group-hover:text-white/70 transition-colors">
                    06
                  </span>
                  <span className="font-display text-[18px] tracking-[0.04em]">
                    Sepeti Görüntüle
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  {totalItems > 0 && (
                    <span className="min-w-[26px] h-[26px] px-2 bg-polen-orange group-hover:bg-white text-white group-hover:text-polen-orange text-[11px] font-bold flex items-center justify-center rounded-full transition-colors">
                      {totalItems}
                    </span>
                  )}
                  <ArrowUpRight className="w-4 h-4 transition-transform duration-500 group-hover:rotate-45" strokeWidth={1.75} />
                </span>
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
