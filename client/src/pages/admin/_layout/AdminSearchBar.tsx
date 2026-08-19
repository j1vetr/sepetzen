import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Package,
  ShoppingCart,
  Users,
  Grid3x3,
  Newspaper,
  FileText,
  MessageSquare,
  LayoutDashboard,
  BarChart3,
  Warehouse,
  Globe,
  Home,
  Menu as MenuIcon,
  PanelBottom,
  Settings,
  Database,
  Ticket,
  HandCoins,
  Tag,
  X,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { TabType } from '../_shared/types';
import { ALL_SIDEBAR_ITEMS } from '../_shared/sidebarConfig';

interface SearchResult {
  type: 'product' | 'order' | 'user' | 'category' | 'blog' | 'page' | 'tab';
  id: string;
  label: string;
  sublabel?: string;
  tab: TabType;
  searchQuery?: string; // query to set in destination tab's search box
}

interface ApiSearchResponse {
  products: { id: string; label: string; sublabel?: string }[];
  orders: { id: string; label: string; sublabel?: string }[];
  users: { id: string; label: string; sublabel?: string }[];
  categories: { id: string; label: string }[];
  blog: { id: string; label: string }[];
  pages: { id: string; label: string }[];
}

interface NavOptions {
  searchQuery?: string;
  selectedId?: string;
}

interface AdminSearchBarProps {
  onNavigate: (tab: TabType, options?: NavOptions) => void;
}

const TAB_ICONS: Record<TabType, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  analytics: BarChart3,
  products: Package,
  categories: Grid3x3,
  brands: Tag,
  inventory: Warehouse,
  orders: ShoppingCart,
  wholesale: HandCoins,
  marketplaces: Globe,
  users: Users,
  reviews: MessageSquare,
  coupons: Ticket,
  homepage: Home,
  menu: MenuIcon,
  footer: PanelBottom,
  pages: FileText,
  blog: Newspaper,
  settings: Settings,
  database: Database,
};

const GROUP_LABELS: Record<string, string> = {
  tab: 'Panel Bölümleri',
  product: 'Ürünler',
  order: 'Siparişler',
  user: 'Kullanıcılar',
  category: 'Kategoriler',
  blog: 'Blog Yazıları',
  page: 'Sayfalar',
};

const GROUP_ORDER = ['tab', 'product', 'order', 'user', 'category', 'blog', 'page'] as const;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Client-side tab search from sidebar config */
function searchTabs(q: string): SearchResult[] {
  const lower = q.toLowerCase();
  return ALL_SIDEBAR_ITEMS
    .filter((item) => item.label.toLowerCase().includes(lower))
    .slice(0, 5)
    .map((item) => ({
      type: 'tab' as const,
      id: item.id,
      label: item.label,
      tab: item.id,
    }));
}

export default function AdminSearchBar({ onNavigate }: AdminSearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 250);

  const { data: apiData } = useQuery<ApiSearchResponse>({
    queryKey: ['/api/admin/search', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.trim().length < 2) return { products: [], orders: [], users: [], categories: [], blog: [], pages: [] };
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(debouncedQuery.trim())}`, { credentials: 'include' });
      if (!res.ok) return { products: [], orders: [], users: [], categories: [], blog: [], pages: [] };
      return res.json();
    },
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 10_000,
  });

  // Build flat ordered results list
  const results = useCallback((): SearchResult[] => {
    const q = debouncedQuery.trim();
    if (!q) return [];

    const tabResults = searchTabs(q);

    const apiResults: SearchResult[] = q.length >= 2 && apiData
      ? [
          ...(apiData.products || []).map(p => ({
            type: 'product' as const,
            id: p.id,
            label: p.label,
            sublabel: p.sublabel,
            tab: 'products' as TabType,
            searchQuery: p.label,
          })),
          ...(apiData.orders || []).map(o => ({
            type: 'order' as const,
            id: o.id,
            label: o.label,
            sublabel: o.sublabel,
            tab: 'orders' as TabType,
            searchQuery: o.label,
          })),
          ...(apiData.users || []).map(u => ({
            type: 'user' as const,
            id: u.id,
            label: u.label,
            sublabel: u.sublabel,
            tab: 'users' as TabType,
            searchQuery: u.label,
          })),
          ...(apiData.categories || []).map(c => ({
            type: 'category' as const,
            id: c.id,
            label: c.label,
            tab: 'categories' as TabType,
          })),
          ...(apiData.blog || []).map(b => ({
            type: 'blog' as const,
            id: b.id,
            label: b.label,
            tab: 'blog' as TabType,
          })),
          ...(apiData.pages || []).map(p => ({
            type: 'page' as const,
            id: p.id,
            label: p.label,
            tab: 'pages' as TabType,
          })),
        ]
      : [];

    return [...tabResults, ...apiResults];
  }, [debouncedQuery, apiData])();

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery, apiData]);

  const openSearch = useCallback(() => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  const selectResult = useCallback((result: SearchResult) => {
    if (result.searchQuery) {
      onNavigate(result.tab, { searchQuery: result.searchQuery });
    } else if (result.type !== 'tab') {
      // blog, page, category - navigate by id
      onNavigate(result.tab, { selectedId: result.id });
    } else {
      onNavigate(result.tab);
    }
    closeSearch();
  }, [onNavigate, closeSearch]);


  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeSearch();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, closeSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeSearch();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[selectedIndex];
      if (r) selectResult(r);
    }
  };

  // Group results by type for display
  const grouped = GROUP_ORDER.reduce<Record<string, SearchResult[]>>((acc, type) => {
    const group = results.filter((r) => r.type === type);
    if (group.length > 0) acc[type] = group;
    return acc;
  }, {});

  // Flat index lookup (for selectedIndex highlight)
  const flatResults = GROUP_ORDER.flatMap((type) => grouped[type] || []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger - geniş arama alanı */}
      <button
        onClick={openSearch}
        data-testid="button-admin-search"
        className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-neutral-400 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors border border-neutral-200 hover:border-neutral-300"
      >
        <Search className="w-4 h-4 shrink-0 text-neutral-400" />
        <span className="flex-1 text-left">Ürün, sipariş, kullanıcı, sekme ara…</span>
      </button>

      {/* Overlay + modal */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={closeSearch} />
          <div
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4"
            data-testid="admin-search-modal"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
              {/* Input row */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100">
                <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ürün, sipariş, kullanıcı, sekme ara…"
                  className="flex-1 bg-transparent text-[14px] text-neutral-900 placeholder:text-neutral-400 outline-none"
                  data-testid="input-admin-search"
                  autoComplete="off"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-0.5 hover:bg-neutral-100 rounded"
                    tabIndex={-1}
                  >
                    <X className="w-3.5 h-3.5 text-neutral-400" />
                  </button>
                )}
                <kbd
                  className="hidden sm:inline-flex items-center px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[10px] font-mono text-neutral-400"
                  onClick={closeSearch}
                  style={{ cursor: 'pointer' }}
                >
                  Esc
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-[60vh] overflow-y-auto">
                {query.trim().length === 0 && (
                  <div className="px-4 py-8 text-center text-[13px] text-neutral-400">
                    Aramak istediğiniz şeyi yazın
                  </div>
                )}

                {query.trim().length >= 1 && results.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-[13px] text-neutral-500">
                      "<span className="font-medium text-neutral-900">{query}</span>" için sonuç bulunamadı
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-1">Farklı kelimeler veya kısaltmalar deneyin</p>
                  </div>
                )}

                {results.length > 0 && (
                  <div className="py-1">
                    {GROUP_ORDER.map((type) => {
                      const group = grouped[type];
                      if (!group?.length) return null;
                      return (
                        <div key={type}>
                          <div className="px-4 py-1.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                            {GROUP_LABELS[type]}
                          </div>
                          {group.map((result) => {
                            const flatIndex = flatResults.indexOf(result);
                            const isSelected = flatIndex === selectedIndex;
                            const Icon = result.type === 'tab'
                              ? (TAB_ICONS[result.tab] || LayoutDashboard)
                              : result.type === 'product'
                              ? Package
                              : result.type === 'order'
                              ? ShoppingCart
                              : result.type === 'user'
                              ? Users
                              : result.type === 'category'
                              ? Grid3x3
                              : result.type === 'blog'
                              ? Newspaper
                              : FileText;
                            return (
                              <button
                                key={`${result.type}-${result.id}`}
                                onClick={() => selectResult(result)}
                                onMouseEnter={() => setSelectedIndex(flatIndex)}
                                data-testid={`search-result-${result.type}-${result.id}`}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                                  isSelected
                                    ? 'bg-neutral-900 text-white'
                                    : 'text-neutral-700 hover:bg-neutral-50'
                                }`}
                              >
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                    isSelected ? 'bg-white/20' : 'bg-neutral-100'
                                  }`}
                                >
                                  <Icon
                                    className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-neutral-500'}`}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className={`text-[13px] font-medium truncate ${isSelected ? 'text-white' : 'text-neutral-900'}`}>
                                    {result.label}
                                  </div>
                                  {result.sublabel && (
                                    <div className={`text-[11px] truncate ${isSelected ? 'text-white/70' : 'text-neutral-400'}`}>
                                      {result.sublabel}
                                    </div>
                                  )}
                                </div>
                                {isSelected && (
                                  <span className="shrink-0 text-[10px] text-white/60">Enter</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer hint */}
                <div className="px-4 py-2 border-t border-neutral-100 flex items-center gap-3 text-[10px] text-neutral-400">
                  <span>↑↓ gezin</span>
                  <span>↵ seç</span>
                  <span>Esc kapat</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
