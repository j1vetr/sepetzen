import {
  Home,
  FileText,
  LayoutDashboard,
  BarChart3,
  Package,
  Grid3x3,
  Warehouse,
  ShoppingCart,
  Users,
  Globe,
  Menu as MenuIcon,
  Settings,
  Database,
  Ticket,
  MessageSquare,
  HandCoins,
  Newspaper,
} from 'lucide-react';
import type { SidebarCategory } from '../_layout/AdminLayout';
import type { TabType } from './types';

export const VALID_TABS: TabType[] = [
  'dashboard',
  'products',
  'categories',
  'orders',
  'users',
  'analytics',
  'inventory',
  'settings',
  'database',
  'menu',
  'homepage',
  'pages',
  'blog',
  'marketplaces',
  'marketplaceOrders',
  'coupons',
  'reviews',
  'wholesale',
];

export const SIDEBAR_CATEGORIES: SidebarCategory[] = [
  {
    title: 'Genel Bakış',
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Genel Bakış' },
      { id: 'analytics', icon: BarChart3, label: 'Raporlar' },
    ],
  },
  {
    title: 'Ürünler ve Kategoriler',
    items: [
      { id: 'products', icon: Package, label: 'Ürünler' },
      { id: 'categories', icon: Grid3x3, label: 'Kategoriler' },
      { id: 'inventory', icon: Warehouse, label: 'Stok' },
    ],
  },
  {
    title: 'Siparişler',
    items: [
      { id: 'orders', icon: ShoppingCart, label: 'Site Siparişleri' },
      { id: 'wholesale', icon: HandCoins, label: 'Toptan Satış' },
    ],
  },
  {
    title: 'Trendyol',
    items: [
      { id: 'marketplaces', icon: Globe, label: 'Trendyol Bağlantısı' },
      { id: 'marketplaceOrders', icon: ShoppingCart, label: 'Trendyol Siparişleri' },
    ],
  },
  {
    title: 'Müşteriler',
    items: [
      { id: 'users', icon: Users, label: 'Kullanıcılar' },
      { id: 'reviews', icon: MessageSquare, label: 'Yorumlar' },
    ],
  },
  {
    title: 'Pazarlama',
    items: [{ id: 'coupons', icon: Ticket, label: 'Kuponlar' }],
  },
  {
    title: 'Site İçeriği',
    items: [
      { id: 'homepage', icon: Home, label: 'Ana Sayfa' },
      { id: 'menu', icon: MenuIcon, label: 'Menü' },
      { id: 'pages', icon: FileText, label: 'Yasal Sayfalar' },
      { id: 'blog', icon: Newspaper, label: 'Blog' },
    ],
  },
  {
    title: 'Ayarlar',
    items: [
      { id: 'settings', icon: Settings, label: 'Ayarlar' },
      { id: 'database', icon: Database, label: 'Veritabanı' },
    ],
  },
];

/** Her sekmenin üstünde gösterilen tek cümlelik sade açıklama. */
export const TAB_DESCRIPTIONS: Record<TabType, string> = {
  dashboard: 'Mağazanızın genel durumu, son siparişler ve hızlı erişim.',
  analytics: 'Satış ve ziyaret verilerinizin özeti.',
  products: 'Ürünlerinizi ekleyin, düzenleyin ve fiyatlarını yönetin.',
  categories: 'Ürünlerinizi gruplandıran kategorileri düzenleyin.',
  inventory: 'Ürün stoklarını tek ekrandan görüp güncelleyin.',
  orders: 'Sitenizden gelen siparişleri görüntüleyin ve yönetin.',
  wholesale: 'Toptan satış müşterileri ve özel fiyatlar.',
  marketplaces: 'Trendyol hesabınızı bağlayın, ürünleri senkronlayın ve gönderin.',
  marketplaceOrders: 'Trendyol siparişlerinizi ve stok düşümlerini takip edin.',
  users: 'Kayıtlı müşterilerinizi görüntüleyin.',
  reviews: 'Müşteri yorumlarını onaylayın veya kaldırın.',
  coupons: 'İndirim kuponları oluşturun ve takip edin.',
  homepage: 'Ana sayfanızın bölümlerini düzenleyin.',
  pages: 'Yasal ve bilgilendirme sayfalarınızın içeriklerini düzenleyin.',
  blog: 'Blog yazılarınızı oluşturun, düzenleyin ve yayınlayın.',
  menu: 'Sitenizin üst menüsünü düzenleyin.',
  settings: 'Mağaza bilgileri ve genel ayarlar.',
  database: 'Teknik veri araçları. Gerekmedikçe kullanmanıza gerek yok.',
};

export const ALL_SIDEBAR_ITEMS = SIDEBAR_CATEGORIES.flatMap((c) => c.items);

export function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'processing':
      return 'bg-blue-500/20 text-blue-400';
    case 'shipped':
      return 'bg-purple-500/20 text-purple-400';
    case 'cancelled':
      return 'bg-red-500/20 text-red-400';
    default:
      return 'bg-yellow-500/20 text-yellow-400';
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case 'completed':
      return 'Tamamlandı';
    case 'processing':
      return 'İşleniyor';
    case 'shipped':
      return 'Kargoda';
    case 'cancelled':
      return 'İptal';
    default:
      return 'Beklemede';
  }
}
