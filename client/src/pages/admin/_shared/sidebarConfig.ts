import {
  Home,
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
  'marketplaces',
  'coupons',
  'reviews',
  'wholesale',
];

export const SIDEBAR_CATEGORIES: SidebarCategory[] = [
  {
    title: 'Genel',
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { id: 'analytics', icon: BarChart3, label: 'Analitik' },
    ],
  },
  {
    title: 'Ürün Yönetimi',
    items: [
      { id: 'products', icon: Package, label: 'Ürünler' },
      { id: 'categories', icon: Grid3x3, label: 'Kategoriler' },
      { id: 'inventory', icon: Warehouse, label: 'Stok Yönetimi' },
    ],
  },
  {
    title: 'Satış & Siparişler',
    items: [
      { id: 'orders', icon: ShoppingCart, label: 'Siparişler' },
      { id: 'wholesale', icon: HandCoins, label: 'Toptan Satış' },
    ],
  },
  {
    title: 'Pazarlama',
    items: [{ id: 'coupons', icon: Ticket, label: 'Kuponlar' }],
  },
  {
    title: 'Müşteriler',
    items: [
      { id: 'users', icon: Users, label: 'Kullanıcılar' },
      { id: 'reviews', icon: MessageSquare, label: 'Yorumlar' },
    ],
  },
  {
    title: 'Entegrasyonlar',
    items: [{ id: 'marketplaces', icon: Globe, label: 'Pazaryerleri' }],
  },
  {
    title: 'Sistem',
    items: [
      { id: 'homepage', icon: Home, label: 'Ana Sayfa' },
      { id: 'menu', icon: MenuIcon, label: 'Menü Yönetimi' },
      { id: 'settings', icon: Settings, label: 'Ayarlar' },
      { id: 'database', icon: Database, label: 'Veritabanı' },
    ],
  },
];

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
