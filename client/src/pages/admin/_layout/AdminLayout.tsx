import { useState, type ReactNode, type ComponentType } from 'react';
import { ExternalLink, LogOut, Menu, X } from 'lucide-react';
import type { TabType } from '../_shared/types';
import toovLogo from '@assets/toov-logo.png';

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
  onLogout: () => void;
  pendingOrdersCount: number;
  pendingReviewsCount?: number;
  pageTitle: string;
  children: ReactNode;
}

export default function AdminLayout({
  adminUser,
  sidebarCategories,
  activeTab,
  onTabChange,
  onLogout,
  pendingOrdersCount,
  pendingReviewsCount = 0,
  pageTitle,
  children,
}: AdminLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleTabClick = (id: TabType) => {
    onTabChange(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex font-sans">
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
        <div className="px-5 h-14 border-b border-neutral-200 flex items-center justify-between shrink-0">
          <img
            src={toovLogo}
            alt="TOOV"
            className="h-5 w-auto object-contain select-none"
            draggable={false}
            data-testid="text-admin-brand"
          />
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 hover:bg-neutral-100 rounded-md md:hidden"
            aria-label="Menüyü kapat"
          >
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          {sidebarCategories.map((category, catIndex) => (
            <div key={category.title} className={catIndex > 0 ? 'mt-4' : ''}>
              <p className="px-2 py-1.5 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.08em]">
                {category.title}
              </p>
              {category.items.map((item) => {
                const isActive = activeTab === item.id;
                let badgeCount = 0;
                if (item.id === 'orders') badgeCount = pendingOrdersCount;
                else if (item.id === 'reviews') badgeCount = pendingReviewsCount;
                const showBadge = badgeCount > 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    data-testid={`tab-${item.id}`}
                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md mb-0.5 text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-neutral-900 text-white'
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
          ))}
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
        <header className="h-14 bg-white border-b border-neutral-200 px-4 md:px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 hover:bg-neutral-100 rounded-md md:hidden"
              aria-label="Menüyü aç"
            >
              <Menu className="w-5 h-5 text-neutral-700" />
            </button>
            <h2 className="text-[14px] font-semibold text-neutral-900 truncate">
              {pageTitle}
            </h2>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
            data-testid="button-view-site"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Siteyi Görüntüle</span>
          </a>
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
