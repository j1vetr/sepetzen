import { Link, useLocation } from 'wouter';
import { Home, ShoppingBag, ShoppingCart, User, Heart, Search, Phone, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/hooks/useCart';
import { useSiteIdentity } from '@/hooks/useSiteIdentity';
import type { MobileNavItem } from '@shared/siteIdentity';

const ICONS: Record<MobileNavItem['icon'], React.ElementType> = {
  home: Home,
  store: ShoppingBag,
  cart: ShoppingCart,
  user: User,
  heart: Heart,
  search: Search,
  phone: Phone,
  grid: LayoutGrid,
};

function matchLocation(href: string, loc: string): boolean {
  switch (href) {
    case '/':
      return loc === '/';
    case '/magaza':
      return loc.startsWith('/magaza') || loc.startsWith('/kategori') || loc.startsWith('/urun');
    case '/sepet':
      return loc === '/sepet';
    case '/hesabim':
      return loc.startsWith('/hesabim') || loc.startsWith('/giris') || loc.startsWith('/kayit');
    default:
      return loc === href || loc.startsWith(href + '/');
  }
}

export function MobileBottomNav() {
  const [location] = useLocation();
  const { totalItems } = useCart();
  const { mobileNavItems } = useSiteIdentity();

  const tabs = mobileNavItems.map((item) => ({
    ...item,
    testId: `bottom-nav-${item.href === '/' ? 'home' : item.href.replace(/^\//, '').split('/')[0]}`,
  }));

  if (location.startsWith('/toov-admin')) return null;

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 surface-glass-dark border-t border-white/10"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.45)',
        height: 'calc(var(--mobile-nav-bar-h, 58px) + env(safe-area-inset-bottom, 0px))',
      }}
      data-testid="mobile-bottom-nav"
    >
      <div
        className="grid"
        style={{
          height: 'var(--mobile-nav-bar-h, 58px)',
          gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
        }}
      >
        {tabs.map((tab) => {
          const isActive = matchLocation(tab.href, location);
          const Icon = ICONS[tab.icon] ?? Home;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              data-testid={tab.testId}
              className="flex flex-col items-center justify-center gap-[4px] relative select-none tap-highlight-transparent"
            >
              <motion.div
                whileTap={{ scale: 0.82 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="relative flex flex-col items-center gap-[4px]"
              >
                {/* Icon + badge wrapper */}
                <span className="relative">
                  <Icon
                    className="w-[22px] h-[22px] transition-colors duration-200"
                    style={{ color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.45)' }}
                    strokeWidth={isActive ? 2.2 : 1.75}
                  />

                  {/* Cart badge */}
                  {tab.href === '/sepet' && (
                    <AnimatePresence>
                      {totalItems > 0 && (
                        <motion.span
                          key="cart-badge"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                          className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-[3px] bg-white text-black text-[9px] font-bold flex items-center justify-center rounded-full leading-none"
                          data-testid="bottom-nav-cart-badge"
                        >
                          {totalItems > 9 ? '9+' : totalItems}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  )}
                </span>

                {/* Label */}
                <span
                  className="text-[10px] font-medium tracking-[0.06em] transition-colors duration-200 leading-none"
                  style={{ color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.40)' }}
                >
                  {tab.label}
                </span>

                {/* Active indicator dot */}
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-dot"
                    className="absolute -top-[14px] left-1/2 -translate-x-1/2 w-[18px] h-[2px] rounded-full bg-white"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
