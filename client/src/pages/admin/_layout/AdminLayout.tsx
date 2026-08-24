import { useEffect, useMemo, useState, type ReactNode, type ComponentType } from 'react';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import type { TabType } from '../_shared/types';
import AdminSearchBar from './AdminSearchBar';

export type SidebarItem = {
  id: TabType;
  icon: ComponentType<{ className?: string }>;
  label: string;
};

export type SidebarCategory = {
  title: string;
  items: SidebarItem[];
};

interface AdminLayoutProps {
  adminUser: { username?: string };
  sidebarCategories: SidebarCategory[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onNavigate: (tab: TabType, options?: { searchQuery?: string; selectedId?: string }) => void;
  onMarketplaceNavigate: (tab: 'orders' | 'claims') => void;
  onLogout: () => void;
  pendingOrdersCount: number;
  pendingReviewsCount?: number;
  pendingMarketplaceOrdersCount?: number;
  pendingReturnsCount?: number;
  pageTitle: string;
  pageDescription?: string;
  children: ReactNode;
}

export default function AdminLayout({
  adminUser,
  sidebarCategories,
  activeTab,
  onTabChange,
  onNavigate,
  onMarketplaceNavigate,
  onLogout,
  pendingOrdersCount,
  pendingReviewsCount = 0,
  pendingMarketplaceOrdersCount = 0,
  pendingReturnsCount = 0,
  pageTitle,
  pageDescription,
  children,
}: AdminLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    () => Object.fromEntries(sidebarCategories.map((category) => [category.title, true])),
  );

  const handleTabClick = (id: TabType) => {
    onTabChange(id);
    setMobileMenuOpen(false);
  };

  const activeCategoryTitle = useMemo(
    () =>
      sidebarCategories.find((category) =>
        category.items.some((item) => item.id === activeTab),
      )?.title ?? 'Komuta Merkezi',
    [activeTab, sidebarCategories],
  );

  const notifications = [
    { id: 'orders', label: 'Yeni ve bekleyen siparişler', count: pendingOrdersCount, tab: 'orders' as TabType },
    { id: 'reviews', label: 'Onay bekleyen yorumlar', count: pendingReviewsCount, tab: 'reviews' as TabType },
    { id: 'marketplaces', label: 'Satış kanalı siparişleri', count: pendingMarketplaceOrdersCount, marketplaceTab: 'orders' as const },
    { id: 'returns', label: 'Bekleyen iade talepleri', count: pendingReturnsCount, marketplaceTab: 'claims' as const },
  ].filter((notification) => notification.count > 0);
  const notificationTotal = notifications.reduce((sum, notification) => sum + notification.count, 0);

  useEffect(() => {
    setExpandedCategories((current) => ({
      ...current,
      [activeCategoryTitle]: true,
    }));
  }, [activeCategoryTitle]);

  // h-screen + overflow-hidden: sayfa kaydırması yalnızca içerik alanında;
  // sidebar ve üst bar sabit kalır
  return (
    <div className="admin-font admin-shell overflow-hidden bg-white text-neutral-900 flex">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-neutral-200 flex flex-col
          transform transition-transform duration-200 ease-out
          md:relative md:translate-x-0 md:w-60
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="relative px-5 h-16 border-b border-neutral-200 flex items-center justify-center shrink-0">
          <a href="/toov-admin" data-testid="link-admin-logo" className="block">
            <img
              src="/uploads/branding/sepetzen-logo-dark.png"
              alt="Sepetzen"
              className="h-10 w-auto object-contain select-none"
              draggable={false}
              data-testid="text-admin-brand"
            />
          </a>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-neutral-100 rounded-md md:hidden"
            aria-label="Menüyü kapat"
          >
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        <nav className="admin-sidebar-scroll flex-1 px-3 py-3 overflow-y-auto">
          {sidebarCategories.map((category, catIndex) => {
            const isCategoryActive = activeCategoryTitle === category.title;
            const isExpanded = expandedCategories[category.title] ?? true;
            return (
              <div key={category.title} className={catIndex > 0 ? 'mt-3' : ''}>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedCategories((current) => ({
                      ...current,
                      [category.title]: !isExpanded,
                    }))
                  }
                  className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                    isCategoryActive
                      ? 'text-neutral-700'
                      : 'text-neutral-400 hover:text-neutral-700'
                  }`}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <span>{category.title}</span>
                </button>
                {isExpanded &&
                  category.items.map((item) => {
                    const isActive = activeTab === item.id;
                    let badgeCount = 0;
                    if (item.id === 'orders') badgeCount = pendingOrdersCount;
                    else if (item.id === 'reviews') badgeCount = pendingReviewsCount;
                    else if (item.id === 'marketplaces') badgeCount = pendingMarketplaceOrdersCount;
                    const showBadge = badgeCount > 0;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleTabClick(item.id)}
                        data-testid={`tab-${item.id}`}
                        aria-current={isActive ? 'page' : undefined}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 text-[13px] font-medium transition-colors ${
                          isActive
                            ? 'bg-neutral-900 text-white shadow-sm'
                            : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                        }`}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {showBadge && (
                          <span
                            className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold leading-none ${
                              isActive
                                ? 'bg-white text-neutral-900'
                                : 'bg-neutral-900 text-white'
                            }`}
                            data-testid={`badge-${item.id}-count`}
                          >
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-neutral-200 shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center text-[11px] font-semibold">
              {adminUser.username?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-neutral-900 truncate">
                {adminUser.username}
              </p>
              <p className="text-[11px] text-neutral-500">Yönetici</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-[12px] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
            data-testid="button-logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="min-h-16 bg-white border-b border-neutral-200 px-4 md:px-6 py-2.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 hover:bg-neutral-100 rounded-md md:hidden"
              aria-label="Menüyü aç"
            >
              <Menu className="w-5 h-5 text-neutral-700" />
            </button>
            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-neutral-400 truncate">
                <span>Admin</span>
                <ChevronRight className="w-3 h-3 shrink-0" />
                <span>{activeCategoryTitle}</span>
                <ChevronRight className="w-3 h-3 shrink-0" />
                <span className="text-neutral-600">{pageTitle}</span>
              </div>
              <h2 className="text-[15px] font-semibold text-neutral-900 truncate">
                {pageTitle}
              </h2>
              {pageDescription && (
                <p className="text-[11px] text-neutral-500 truncate hidden md:block">
                  {pageDescription}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-none min-w-0 justify-end">
            <div className="w-9 sm:flex-1 sm:min-w-0 sm:max-w-xl">
              <AdminSearchBar onNavigate={onNavigate} />
            </div>
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setOpenNotifications((open) => !open);
                  setOpenUserMenu(false);
                }}
                className={`relative inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg border text-[12px] font-medium transition-colors ${
                  openNotifications
                    ? 'border-neutral-300 bg-neutral-100 text-neutral-900'
                    : 'border-transparent text-neutral-600 hover:border-neutral-200 hover:bg-neutral-50'
                }`}
                aria-label={notificationTotal ? `${notificationTotal} bekleyen iş` : 'Bildirimler'}
                aria-expanded={openNotifications}
              >
                <Bell className="w-4 h-4" />
                <span className="hidden lg:inline">Bekleyen işler</span>
                {notificationTotal > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-neutral-900 text-white text-[10px] font-semibold">
                    {notificationTotal > 99 ? '99+' : notificationTotal}
                  </span>
                )}
              </button>
              {openNotifications && (
                <div className="absolute right-0 top-11 z-30 w-72 rounded-xl border border-neutral-200 bg-white p-2 shadow-xl">
                  <div className="px-2.5 py-2">
                    <p className="text-[13px] font-semibold text-neutral-900">Bekleyen işler</p>
                    <p className="mt-0.5 text-[11px] text-neutral-500">Müdahale gerektiren son durumlar</p>
                  </div>
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => {
                          if ('marketplaceTab' in notification && notification.marketplaceTab) {
                            onMarketplaceNavigate(notification.marketplaceTab);
                          } else {
                            onTabChange(notification.tab);
                          }
                          setOpenNotifications(false);
                        }}
                        className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-neutral-50 transition-colors"
                      >
                        <span className="flex-1 text-[12px] text-neutral-700">{notification.label}</span>
                        <span className="text-[12px] font-semibold tabular-nums text-neutral-900">
                          {notification.count > 99 ? '99+' : notification.count}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-2.5 py-5 text-center text-[12px] text-neutral-500">
                      Şu an bekleyen iş yok
                    </p>
                  )}
                </div>
              )}
            </div>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors shrink-0"
              data-testid="button-view-site"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Siteyi Görüntüle</span>
            </a>
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setOpenUserMenu((open) => !open);
                  setOpenNotifications(false);
                }}
                className="inline-flex items-center gap-1.5 h-9 px-1.5 sm:px-2 rounded-lg text-neutral-700 hover:bg-neutral-100 transition-colors"
                aria-label="Yönetici menüsü"
                aria-expanded={openUserMenu}
              >
                <span className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[11px] font-semibold">
                  {adminUser.username?.charAt(0).toUpperCase()}
                </span>
                <span className="hidden lg:block max-w-28 truncate text-[12px] font-medium">
                  {adminUser.username}
                </span>
                <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-neutral-400" />
              </button>
              {openUserMenu && (
                <div className="absolute right-0 top-11 z-30 w-52 rounded-xl border border-neutral-200 bg-white p-2 shadow-xl">
                  <div className="px-2.5 py-2 border-b border-neutral-100">
                    <p className="text-[12px] font-semibold text-neutral-900 truncate">{adminUser.username}</p>
                    <p className="mt-0.5 text-[11px] text-neutral-500">Yönetici hesabı</p>
                  </div>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="mt-1 w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Çıkış Yap
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-neutral-50">
          <div className="admin-content min-h-full p-4 md:p-8 text-neutral-900">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
