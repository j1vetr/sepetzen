import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingBag, Search, X, User, LogOut, ChevronDown, ArrowUpRight, Phone, Mail } from 'lucide-react';
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

export function Header() {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileSubOpen, setMobileSubOpen] = useState<Record<string, boolean>>({});
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const { scrollY } = useScroll();

  // Brand bar yaklaşık 116px; eşiği biraz aşağı çekip kompakt logo'nun
  // brand bar viewport'tan çıktıktan sonra belirmesini sağlıyoruz.
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 110));

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

  const { data: menuTree = [] } = useQuery<MenuItemData[]>({
    queryKey: ['/api/menu'],
    queryFn: async () => {
      const res = await fetch('/api/menu');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  // Hide legacy categories (display_order >= 100); show only stone categories
  const visibleCategories = categoriesData
    .filter(c => (c.displayOrder ?? 0) < 100)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  // Menu_items tablosundan beslenen yapı (admin "Otomatik Gruplandır" ile oluşturulur).
  // Eğer hiç menu item yoksa, eski davranışa (visibleCategories) düşeriz.
  const menuRoots = [...menuTree]
    .filter(m => m.isActive && !m.parentId)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const useMenuTree = menuRoots.length > 0;

  const hrefForMenu = (item: MenuItemData): string => {
    if (item.type === 'category' && item.category) return `/kategori/${item.category.slug}`;
    if (item.type === 'link' && item.url) return item.url;
    return '#';
  };

  // Üst nav artık sadece menü ağacından besleniyor; "Mağaza" / "Hakkımızda" çıkarıldı.
  const navLinkCls = (active: boolean) =>
    `relative inline-flex items-center gap-1 whitespace-nowrap text-[9.5px] xl:text-[10px] font-medium tracking-[0.06em] xl:tracking-[0.10em] uppercase transition-colors nav-link-hover ${active ? 'text-black' : 'text-black/70 hover:text-black'}`;

  return (
    <>
      {/* ── Brand bar (desktop): E-Posta · Logo · Telefon
          Normal akışta durur; scroll edilince doğal olarak yukarı kayar. ── */}
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
            <span className="font-display text-[26px] tracking-widest" data-testid="img-logo">
              <span className="text-black">SEPET</span><span className="text-[#2D5A27]">ZEN</span>
            </span>
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
        className={`fixed lg:sticky top-0 left-0 right-0 z-40 bg-white border-b border-black/8 flex items-center lg:!h-auto transition-shadow duration-300 ${scrolled ? 'lg:shadow-[0_4px_18px_-8px_rgba(0,0,0,0.18)]' : ''}`}
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
              <span className="font-display text-[20px] tracking-widest" data-testid="img-logo-mobile-header">
                <span className="text-black">SEPET</span><span className="text-[#2D5A27]">ZEN</span>
              </span>
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

          {/* ── Desktop layout: sadece nav + ikonlar (logo üst brand bar'da) ── */}
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
                      <span className="font-display text-[18px] tracking-widest">
                        <span className="text-black">SEPET</span><span className="text-[#2D5A27]">ZEN</span>
                      </span>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Orta: Desktop nav — 8 ana grup, alt kategoriler dropdown'da */}
            <nav className="justify-self-center flex items-center gap-3 xl:gap-5 min-w-0">
              {useMenuTree ? (
                menuRoots.map((root) => {
                  const children = (root.children || []).filter(c => c.isActive);

                  // submenu → dropdown ile alt kategoriler
                  if (root.type === 'submenu') {
                    return (
                      <DropdownMenu key={root.id}>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={navLinkCls(false)}
                            data-testid={`button-nav-root-${root.id}`}
                          >
                            {root.title}
                            <ChevronDown className="w-2.5 h-2.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          sideOffset={18}
                          className="bg-white border-black/8 shadow-xl rounded-none p-2 min-w-[260px]"
                        >
                          {children.length === 0 ? (
                            <DropdownMenuItem disabled className="text-[11px] text-black/40 py-2 px-3">
                              Henüz alt kategori yok
                            </DropdownMenuItem>
                          ) : children.map(child => {
                            const href = hrefForMenu(child);
                            return (
                              <DropdownMenuItem
                                key={child.id}
                                onClick={() => navigate(href)}
                                className="text-[11px] tracking-[0.14em] uppercase text-black hover:bg-[hsl(var(--polen-cream))] hover:text-polen-orange cursor-pointer py-2 px-3 rounded-none transition-colors"
                                data-testid={`link-mega-${child.id}`}
                              >
                                {child.title}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  }

                  // root tek başına category/link → düz nav linki
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
                      {root.title}
                    </Link>
                  );
                })
              ) : (
                // Fallback: menü ağacı boşsa basit "Kategoriler" dropdown
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
                            className="text-[11px] tracking-[0.16em] uppercase text-black hover:bg-[hsl(var(--polen-cream))] hover:text-polen-orange cursor-pointer py-2.5 px-3 rounded-none transition-colors"
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

            {/* Right: Icons */}
            <div className="justify-self-end flex items-center gap-2 xl:gap-3 shrink-0">
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
                    <motion.button whileTap={{ scale: 0.9 }} className="p-3 text-black/65 hover:text-polen-orange transition-colors flex items-center gap-2" data-testid="button-account" aria-label="Hesabım">
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
                <div className="flex items-center gap-2 xl:gap-3 ml-2 pl-4 xl:pl-5 border-l border-black/10">
                  <Link href="/giris" data-testid="link-header-giris" aria-label="Giriş Yap">
                    <motion.span
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center whitespace-nowrap px-3 xl:px-4 py-2 text-[10.5px] xl:text-[11px] tracking-[0.14em] xl:tracking-[0.18em] uppercase font-medium text-black/70 hover:text-polen-orange transition-colors cursor-pointer"
                    >
                      Giriş Yap
                    </motion.span>
                  </Link>
                  <Link href="/kayit" data-testid="link-header-kayit">
                    <motion.span
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center whitespace-nowrap px-3.5 xl:px-5 py-2 text-[10.5px] xl:text-[11px] tracking-[0.14em] xl:tracking-[0.18em] uppercase font-bold text-white bg-polen-orange hover:bg-[hsl(var(--polen-orange-deep))] transition-colors cursor-pointer"
                    >
                      Kayıt Ol
                    </motion.span>
                  </Link>
                </div>
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
              {/* ── Hero panel: brand header ── */}
              <div className="relative h-[120px] shrink-0 overflow-hidden border-b border-black/8 bg-[#0f1a0e] flex items-center justify-center">
                {/* Close button — top-right */}
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

                {/* Centered logo wordmark */}
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="block"
                  data-testid="link-mobile-logo"
                >
                  <span className="font-display text-[28px] tracking-widest" data-testid="img-logo-mobile-drawer">
                    <span className="text-white">SEPET</span><span className="text-[#4a9a42]">ZEN</span>
                  </span>
                </Link>
              </div>

              {/* ── Editorial nav list ── */}
              <nav className="flex-1 overflow-y-auto bg-white pt-2">
                <motion.ul
                  variants={stagger.container}
                  initial="initial"
                  animate="animate"
                  exit="initial"
                  className="flex flex-col px-5"
                >
                  {/* Ana Sayfa — sabit ilk satır */}
                  <motion.li variants={stagger.item} className="border-t border-black/[0.08]">
                    <Link
                      href="/"
                      onClick={() => setMobileOpen(false)}
                      className="group relative flex items-baseline justify-between py-2.5"
                      data-testid="link-mobile-home"
                    >
                      <span className="flex items-baseline gap-3">
                        <span className="text-[9px] font-mono tracking-[0.18em] text-black/30 group-hover:text-polen-orange transition-colors">
                          01
                        </span>
                        <span className="font-display text-[17px] leading-none tracking-[0.01em] text-black group-hover:text-polen-orange transition-colors">
                          Ana Sayfa
                        </span>
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-black/25 rotate-45 group-hover:rotate-0 group-hover:text-polen-orange transition-all duration-300" />
                    </Link>
                  </motion.li>

                  {/* 8 ana grup — kompakt liste, alta inmemesi için sıkıştırılmış padding/font */}
                  {useMenuTree ? (
                    menuRoots.map((root, idx) => {
                      const children = (root.children || []).filter(c => c.isActive);
                      const isSubmenu = root.type === 'submenu';
                      const isOpen = !!mobileSubOpen[root.id];
                      const number = String(idx + 2).padStart(2, '0');

                      if (isSubmenu) {
                        return (
                          <motion.li key={root.id} variants={stagger.item} className="border-t border-black/[0.08]">
                            <button
                              onClick={() => setMobileSubOpen(s => ({ ...s, [root.id]: !s[root.id] }))}
                              className="group relative w-full flex items-baseline justify-between py-2.5"
                              data-testid={`button-mobile-group-${root.id}`}
                              aria-expanded={isOpen}
                            >
                              <span className="flex items-baseline gap-3">
                                <span className={`text-[9px] font-mono tracking-[0.18em] transition-colors ${isOpen ? 'text-polen-orange' : 'text-black/30 group-hover:text-polen-orange'}`}>
                                  {number}
                                </span>
                                <span className={`font-display text-[17px] leading-none tracking-[0.01em] transition-colors ${isOpen ? 'text-polen-orange' : 'text-black group-hover:text-polen-orange'}`}>
                                  {root.title}
                                </span>
                                <span className="text-[9px] text-black/35 self-center">({children.length})</span>
                              </span>
                              <motion.span
                                animate={{ rotate: isOpen ? 90 : 0 }}
                                transition={{ duration: 0.3 }}
                                className={`${isOpen ? 'text-polen-orange' : 'text-black/30'} transition-colors`}
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
                                  className="overflow-hidden pl-7 border-l border-polen-orange/30 ml-[3px] mb-2"
                                >
                                  {children.length === 0 ? (
                                    <li className="text-[10px] text-black/35 py-1.5">Henüz alt kategori yok</li>
                                  ) : children.map(child => {
                                    const href = hrefForMenu(child);
                                    return (
                                      <li key={child.id}>
                                        <Link
                                          href={href}
                                          onClick={() => setMobileOpen(false)}
                                          className="group flex items-baseline gap-2 py-1.5 text-black/70 hover:text-polen-orange transition-colors"
                                          data-testid={`link-mobile-mega-${child.id}`}
                                        >
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
                      // root tek başına category/link → düz satır
                      const href = hrefForMenu(root);
                      return (
                        <motion.li key={root.id} variants={stagger.item} className="border-t border-black/[0.08]">
                          <Link
                            href={href}
                            onClick={() => setMobileOpen(false)}
                            className="group relative flex items-baseline justify-between py-2.5"
                            data-testid={`link-mobile-root-${root.id}`}
                          >
                            <span className="flex items-baseline gap-3">
                              <span className="text-[9px] font-mono tracking-[0.18em] text-black/30 group-hover:text-polen-orange transition-colors">
                                {number}
                              </span>
                              <span className="font-display text-[17px] leading-none tracking-[0.01em] text-black group-hover:text-polen-orange transition-colors">
                                {root.title}
                              </span>
                            </span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-black/25 rotate-45 group-hover:rotate-0 group-hover:text-polen-orange transition-all duration-300" />
                          </Link>
                        </motion.li>
                      );
                    })
                  ) : (
                    // Fallback: menü ağacı boşsa eski kategori listesi
                    visibleCategories.map((c, idx) => (
                      <motion.li key={c.id} variants={stagger.item} className="border-t border-black/[0.08]">
                        <Link
                          href={`/kategori/${c.slug}`}
                          onClick={() => setMobileOpen(false)}
                          className="group relative flex items-baseline justify-between py-2.5"
                          data-testid={`link-mobile-cat-${c.slug}`}
                        >
                          <span className="flex items-baseline gap-3">
                            <span className="text-[9px] font-mono tracking-[0.18em] text-black/30 group-hover:text-polen-orange transition-colors">
                              {String(idx + 2).padStart(2, '0')}
                            </span>
                            <span className="font-display text-[17px] leading-none tracking-[0.01em] text-black group-hover:text-polen-orange transition-colors">
                              {c.name}
                            </span>
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-black/25 rotate-45 group-hover:rotate-0 group-hover:text-polen-orange transition-all duration-300" />
                        </Link>
                      </motion.li>
                    ))
                  )}

                  {user && (
                    <motion.li variants={stagger.item} className="border-t border-b border-black/[0.08]">
                      <Link
                        href="/hesabim"
                        onClick={() => setMobileOpen(false)}
                        className="group relative flex items-baseline justify-between py-2.5"
                        data-testid="link-mobile-hesabim"
                      >
                        <span className="flex items-baseline gap-3">
                          <span className="text-[9px] font-mono tracking-[0.18em] text-black/30 group-hover:text-polen-orange transition-colors">
                            ★
                          </span>
                          <span className="font-display text-[17px] leading-none tracking-[0.01em] text-black group-hover:text-polen-orange transition-colors">
                            Hesabım
                          </span>
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-black/25 rotate-45 group-hover:rotate-0 group-hover:text-polen-orange transition-all duration-300" />
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
                      className="flex items-center justify-center py-3.5 text-[11px] tracking-[0.18em] uppercase font-medium text-black/75 hover:text-polen-orange hover:bg-black/[0.03] transition-colors border-r border-black/8"
                      data-testid="link-mobile-giris"
                    >
                      Giriş Yap
                    </Link>
                    <Link
                      href="/kayit"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center py-3.5 text-[11px] tracking-[0.18em] uppercase font-bold text-white bg-polen-orange hover:bg-[hsl(var(--polen-orange-deep))] transition-colors"
                      data-testid="link-mobile-kayit"
                    >
                      Kayıt Ol
                    </Link>
                  </div>
                )}
                <Link
                  href="/sepet"
                  onClick={() => setMobileOpen(false)}
                  className="group relative bg-black hover:bg-polen-orange transition-colors duration-500 px-6 py-4 flex items-center justify-between text-white"
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
                      <span className="min-w-[24px] h-[24px] px-2 bg-polen-orange group-hover:bg-white text-white group-hover:text-polen-orange text-[11px] font-bold flex items-center justify-center rounded-full transition-colors">
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
