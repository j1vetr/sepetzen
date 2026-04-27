import { useState, useEffect, useMemo } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import OrdersPanel from './AdminOrdersPanel';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Grid3x3, 
  Users, 
  LogOut,
  Plus,
  Edit,
  Trash2,
  Search,
  Eye,
  X,
  TrendingUp,
  DollarSign,
  Clock,
  ChevronLeft,
  ChevronRight,
  Upload,
  ImageIcon,
  Loader2,
  GripVertical,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  BarChart3,
  Warehouse,
  Tag,
  Mail,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  FileText,
  MessageSquare,
  Calendar,
  Settings,
  Send,
  Server,
  Database,
  RotateCcw,
  Download,
  ChevronDown,
  ChevronUp,
  Check,
  Phone,
  MapPin,
  Sparkles,
  Wand2,
  Copy,
  Menu,
  Globe,
  UserPlus,
  TrendingDown,
  ShoppingBag,
  BadgePercent,
  Star,
  Award
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sku?: string;
  basePrice: string;
  categoryId: string;
  categoryIds?: string[];
  images: string[];
  availableSizes: string[];
  availableColors: { name: string; hex: string }[];
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  displayOrder: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    address: string;
    city: string;
    district: string;
    postalCode: string;
  };
  total: string;
  status: string;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  createdAt: string;
}

interface Stats {
  totalProducts: number;
  totalCategories: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  pendingOrders: number;
}

interface ProductVariant {
  id: string;
  productId: string;
  size: string;
  color: string;
  price: string;
  stock: number;
}

type TabType = 'dashboard' | 'products' | 'categories' | 'orders' | 'users' | 'analytics' | 'inventory' | 'settings' | 'database' | 'ai-descriptions' | 'menu';

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['dashboard', 'products', 'categories', 'orders', 'users', 'analytics', 'inventory', 'settings', 'database', 'ai-descriptions', 'menu'].includes(tab)) {
      return tab as TabType;
    }
    return 'dashboard';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [showBulkBadgeModal, setShowBulkBadgeModal] = useState(false);
  const [showBulkAIModal, setShowBulkAIModal] = useState(false);
  const [bulkAIStyle, setBulkAIStyle] = useState('natural');
  const [bulkAICategory, setBulkAICategory] = useState('');
  const [bulkAIOnlyEmpty, setBulkAIOnlyEmpty] = useState(true);
  const [bulkAIOverwrite, setBulkAIOverwrite] = useState(false);
  const [bulkAIProgress, setBulkAIProgress] = useState<{running: boolean; done: boolean; message: string; results?: any[]}>({running: false, done: false, message: ''});
  const queryClient = useQueryClient();

  const { data: adminUser, isLoading: userLoading } = useQuery({
    queryKey: ['admin', 'me'],
    queryFn: async () => {
      const response = await fetch('/api/admin/me');
      if (!response.ok) throw new Error('Not authenticated');
      return response.json();
    },
    retry: false,
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/stats', { credentials: 'include' });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!adminUser,
    refetchInterval: 30000,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['admin', 'products'],
    queryFn: async () => {
      const response = await fetch('/api/admin/products');
      return response.json();
    },
    enabled: !!adminUser,
  });

  const { data: allVariants = [] } = useQuery<any[]>({
    queryKey: ['admin-inventory'],
    queryFn: async () => {
      const res = await fetch('/api/admin/inventory', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch inventory');
      return res.json();
    },
    enabled: !!adminUser,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      return response.json();
    },
    enabled: !!adminUser,
  });

  const { data: orders = [], refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ['admin', 'orders'],
    queryFn: async () => {
      const response = await fetch('/api/admin/orders');
      return response.json();
    },
    enabled: !!adminUser,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (activeTab === 'orders' && adminUser) {
      refetchOrders();
    }
  }, [activeTab, adminUser, refetchOrders]);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['admin', 'users', searchQuery],
    queryFn: async () => {
      const url = searchQuery ? `/api/admin/users?search=${encodeURIComponent(searchQuery)}` : '/api/admin/users';
      const response = await fetch(url);
      return response.json();
    },
    enabled: !!adminUser,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/logout', { method: 'POST' });
      return response.json();
    },
    onSuccess: () => setLocation('/toov-admin/login'),
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });

  const saveProductMutation = useMutation({
    mutationFn: async (product: Partial<Product>) => {
      const method = product.id ? 'PATCH' : 'POST';
      const url = product.id ? `/api/admin/products/${product.id}` : '/api/admin/products';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      setShowProductModal(false);
      setEditingProduct(null);
    },
  });

  const saveCategoryMutation = useMutation({
    mutationFn: async (category: Partial<Category>) => {
      const method = category.id ? 'PATCH' : 'POST';
      const url = category.id ? `/api/admin/categories/${category.id}` : '/api/admin/categories';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      setShowCategoryModal(false);
      setEditingCategory(null);
    },
  });

  useEffect(() => {
    if (!userLoading && !adminUser) {
      setLocation('/toov-admin/login');
    }
  }, [adminUser, userLoading, setLocation]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-lg text-white">Yükleniyor...</div>
      </div>
    );
  }

  if (!adminUser) return null;

  const sidebarCategories = [
    {
      title: 'Genel',
      items: [
        { id: 'dashboard' as TabType, icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'analytics' as TabType, icon: BarChart3, label: 'Analitik' },
      ]
    },
    {
      title: 'Ürün Yönetimi',
      items: [
        { id: 'products' as TabType, icon: Package, label: 'Ürünler' },
        { id: 'categories' as TabType, icon: Grid3x3, label: 'Kategoriler' },
        { id: 'inventory' as TabType, icon: Warehouse, label: 'Stok Yönetimi' },
      ]
    },
    {
      title: 'Satış & Siparişler',
      items: [
        { id: 'orders' as TabType, icon: ShoppingCart, label: 'Siparişler' },
      ]
    },
    {
      title: 'Müşteriler',
      items: [
        { id: 'users' as TabType, icon: Users, label: 'Kullanıcılar' },
      ]
    },
    {
      title: 'AI Araçları',
      items: [
        { id: 'ai-descriptions' as TabType, icon: Wand2, label: 'AI Açıklamalar' },
      ]
    },
    {
      title: 'Sistem',
      items: [
        { id: 'menu' as TabType, icon: Menu, label: 'Menü Yönetimi' },
        { id: 'settings' as TabType, icon: Settings, label: 'Ayarlar' },
        { id: 'database' as TabType, icon: Database, label: 'Veritabanı' },
      ]
    },
  ];
  
  const allSidebarItems = sidebarCategories.flatMap(cat => cat.items);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/20 text-emerald-400';
      case 'processing': return 'bg-blue-500/20 text-blue-400';
      case 'shipped': return 'bg-purple-500/20 text-purple-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Tamamlandı';
      case 'processing': return 'İşleniyor';
      case 'shipped': return 'Kargoda';
      case 'cancelled': return 'İptal';
      default: return 'Beklemede';
    }
  };

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile, shown as overlay when mobileMenuOpen */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:w-64
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 md:p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl md:text-2xl tracking-[0.06em] text-white mb-1" data-testid="text-admin-brand">
              POLEN <span className="text-polen-orange">STONE</span>
            </h1>
            <p className="text-xs text-zinc-500">Admin Panel</p>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 hover:bg-zinc-800 rounded-lg md:hidden"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
        
        <nav className="flex-1 p-3 overflow-y-auto">
          {sidebarCategories.map((category, catIndex) => (
            <div key={category.title} className={catIndex > 0 ? 'mt-4' : ''}>
              <p className="px-3 py-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                {category.title}
              </p>
              {category.items.map((item) => {
                const pendingBadge = item.id === 'orders' ? orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length : 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-colors ${
                      activeTab === item.id
                        ? 'bg-white text-black'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                    data-testid={`tab-${item.id}`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                    {pendingBadge > 0 && (
                      <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold leading-none ${
                        activeTab === item.id
                          ? 'bg-orange-500 text-white'
                          : 'bg-orange-500 text-white animate-pulse'
                      }`}>
                        {pendingBadge > 99 ? '99+' : pendingBadge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold">
              {adminUser.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{adminUser.username}</p>
              <p className="text-xs text-zinc-500">Yönetici</p>
            </div>
          </div>
          <button
            onClick={() => logoutMutation.mutate()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto w-full">
        {/* Mobile Header */}
        <header className="bg-zinc-900/50 border-b border-zinc-800 px-4 py-4 md:px-8 md:py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 hover:bg-zinc-800 rounded-lg md:hidden"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
            <h2 className="text-lg md:text-2xl font-semibold text-white">
              {allSidebarItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg transition-colors"
            data-testid="button-view-site"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Siteyi Görüntüle</span>
          </a>
        </header>

        <div className="p-4 md:p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Package className="w-8 h-8 text-blue-400" />
                    <span className="text-xs text-zinc-500">Toplam</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats?.totalProducts || 0}</p>
                  <p className="text-sm text-zinc-400 mt-1">Ürün</p>
                </div>
                
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <ShoppingCart className="w-8 h-8 text-emerald-400" />
                    <span className="text-xs text-zinc-500">Toplam</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats?.totalOrders || 0}</p>
                  <p className="text-sm text-zinc-400 mt-1">Sipariş</p>
                </div>
                
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="w-8 h-8 text-purple-400" />
                    <span className="text-xs text-zinc-500">Toplam</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats?.totalUsers || 0}</p>
                  <p className="text-sm text-zinc-400 mt-1">Kullanıcı</p>
                </div>
                
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <DollarSign className="w-8 h-8 text-yellow-400" />
                    <span className="text-xs text-zinc-500">Toplam</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{(stats?.totalRevenue || 0).toLocaleString('tr-TR')}₺</p>
                  <p className="text-sm text-zinc-400 mt-1">Gelir</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">Son Siparişler</h3>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="text-sm text-zinc-400 hover:text-white flex items-center gap-1"
                    >
                      Tümü <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                        <div>
                          <p className="font-medium text-white">{order.orderNumber}</p>
                          <p className="text-sm text-zinc-400">{order.customerName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-white">{order.total}₺</p>
                          <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {orders.length === 0 && (
                      <p className="text-center text-zinc-500 py-8">Henüz sipariş yok</p>
                    )}
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">Hızlı İstatistikler</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-yellow-400" />
                        <span className="text-zinc-300">Bekleyen Siparişler</span>
                      </div>
                      <span className="text-2xl font-bold text-white">{stats?.pendingOrders || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Grid3x3 className="w-5 h-5 text-blue-400" />
                        <span className="text-zinc-300">Kategoriler</span>
                      </div>
                      <span className="text-2xl font-bold text-white">{stats?.totalCategories || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        <span className="text-zinc-300">Aktif Ürünler</span>
                      </div>
                      <span className="text-2xl font-bold text-white">{products.filter(p => p.isActive).length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Ürün ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 w-64"
                    data-testid="input-search-products"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/admin/inventory/fix-variants', {
                          method: 'POST',
                          credentials: 'include',
                        });
                        const data = await res.json();
                        if (data.success) {
                          alert(data.message);
                          queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
                        } else {
                          alert('Hata: ' + (data.error || 'Bilinmeyen hata'));
                        }
                      } catch (error) {
                        alert('Senkronizasyon başarısız');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-500 transition-colors"
                    data-testid="button-sync-all-variants"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Bedenleri Senkronize Et
                  </button>
                  <button
                    onClick={() => setShowBulkBadgeModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-medium hover:from-orange-500 hover:to-red-500 transition-colors"
                    data-testid="button-bulk-badge"
                  >
                    <Tag className="w-4 h-4" />
                    Toplu Etiket
                  </button>
                  <button
                    onClick={() => setShowBulkPriceModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg font-medium hover:bg-zinc-700 transition-colors border border-zinc-700"
                    data-testid="button-bulk-price"
                  >
                    <Edit className="w-4 h-4" />
                    Toplu Düzen
                  </button>
                  <button
                    onClick={() => setShowBulkAIModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-colors"
                    data-testid="button-bulk-ai"
                  >
                    <Sparkles className="w-4 h-4" />
                    Toplu AI Açıklama
                  </button>
                  <button
                    onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
                    data-testid="button-add-product"
                  >
                    <Plus className="w-4 h-4" />
                    Yeni Ürün
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-zinc-800/50">
                    <tr>
                      <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Ürün</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Kategori</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Fiyat</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Durum</th>
                      <th className="text-right px-6 py-4 text-sm font-medium text-zinc-400">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="border-t border-zinc-800 hover:bg-zinc-800/30" data-testid={`row-product-${product.id}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {product.images?.[0] && (
                              <img src={product.images[0]} alt={product.name} className="w-12 h-12 object-cover rounded-lg" />
                            )}
                            <div>
                              <p className="font-medium text-white">{product.name}</p>
                              <div className="flex items-center gap-2 text-sm text-zinc-500">
                                {product.sku && <span className="text-purple-400 font-mono">{product.sku}</span>}
                                <span>{product.slug}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-400">
                          <div className="flex flex-wrap gap-1">
                            {(product.categoryIds && product.categoryIds.length > 0
                              ? product.categoryIds.map(catId => categories.find(c => c.id === catId)?.name).filter(Boolean)
                              : [categories.find(c => c.id === product.categoryId)?.name]
                            ).filter(Boolean).map((name, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-zinc-800 rounded text-xs">{name}</span>
                            ))}
                            {!product.categoryId && (!product.categoryIds || product.categoryIds.length === 0) && '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-white font-medium">{product.basePrice}₺</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {(() => {
                              const productVariants = allVariants.filter((v: any) => v.productId === product.id);
                              const totalStock = productVariants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
                              if (totalStock === 0 && productVariants.length > 0) {
                                return <span className="px-2 py-1 rounded text-xs bg-orange-500/20 text-orange-400">Stokta Yok</span>;
                              } else if (!product.isActive) {
                                return <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">Pasif</span>;
                              } else {
                                return <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400">Aktif</span>;
                              }
                            })()}
                            {product.isFeatured && (
                              <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">Öne Çıkan</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => { setEditingProduct(product); setShowProductModal(true); }}
                              className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white"
                              title="Düzenle"
                              data-testid={`button-edit-product-${product.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                const duplicatedProduct = {
                                  ...product,
                                  id: undefined,
                                  name: `${product.name} (Kopya)`,
                                  slug: '',
                                  sku: product.sku ? `${product.sku}-KOPYA` : undefined,
                                };
                                setEditingProduct(duplicatedProduct as any);
                                setShowProductModal(true);
                              }}
                              className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white"
                              title="Kopyala"
                              data-testid={`button-copy-product-${product.id}`}
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) deleteProductMutation.mutate(product.id); }}
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-zinc-400 hover:text-red-400"
                              title="Sil"
                              data-testid={`button-delete-product-${product.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                          Ürün bulunamadı
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div>
              <div className="flex justify-end mb-6">
                <button
                  onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
                  data-testid="button-add-category"
                >
                  <Plus className="w-4 h-4" />
                  Yeni Kategori
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((category) => (
                  <div key={category.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden group" data-testid={`card-category-${category.id}`}>
                    {category.image && (
                      <div className="aspect-video relative overflow-hidden">
                        <img src={category.image} alt={category.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="font-semibold text-lg text-white mb-2">{category.name}</h3>
                      <p className="text-sm text-zinc-500 mb-4">Slug: {category.slug}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditingCategory(category); setShowCategoryModal(true); }}
                          className="flex-1 py-2 text-sm text-center bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-white"
                          data-testid={`button-edit-category-${category.id}`}
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => { if (confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) deleteCategoryMutation.mutate(category.id); }}
                          className="p-2 bg-zinc-800 hover:bg-red-500/20 rounded-lg transition-colors text-zinc-400 hover:text-red-400"
                          data-testid={`button-delete-category-${category.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <div className="col-span-full text-center text-zinc-500 py-12">
                    Henüz kategori eklenmemiş
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <OrdersPanel />
          )}

          {activeTab === 'users' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Kullanıcı ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 w-64"
                    data-testid="input-search-users"
                  />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-zinc-800/50">
                    <tr>
                      <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Kullanıcı</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">E-posta</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Telefon</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Kayıt Tarihi</th>
                      <th className="text-right px-6 py-4 text-sm font-medium text-zinc-400">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-t border-zinc-800 hover:bg-zinc-800/30" data-testid={`row-user-${user.id}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold">
                              {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-white">
                              {user.firstName} {user.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-400">{user.email}</td>
                        <td className="px-6 py-4 text-zinc-400">{user.phone || '-'}</td>
                        <td className="px-6 py-4 text-sm text-zinc-400">
                          {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setViewingUser(user)}
                              className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white"
                              data-testid={`button-view-user-${user.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { if (confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) deleteUserMutation.mutate(user.id); }}
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-zinc-400 hover:text-red-400"
                              data-testid={`button-delete-user-${user.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                          Kullanıcı bulunamadı
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <AnalyticsPanel />
          )}

          {activeTab === 'inventory' && (
            <InventoryPanel />
          )}
          
          {activeTab === 'settings' && (
            <SettingsPanel />
          )}
          
          {activeTab === 'database' && (
            <DatabasePanel />
          )}
          
          {activeTab === 'ai-descriptions' && (
            <AIDescriptionsPanel products={products} categories={categories} />
          )}
          
          {activeTab === 'menu' && (
            <MenuManagementPanel categories={categories} />
          )}
        </div>
      </main>

      {showProductModal && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
          onSave={(product) => saveProductMutation.mutate(product)}
          isSaving={saveProductMutation.isPending}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => { setShowCategoryModal(false); setEditingCategory(null); }}
          onSave={(category) => saveCategoryMutation.mutate(category)}
          isSaving={saveCategoryMutation.isPending}
        />
      )}

      {viewingOrder && (
        <OrderDetailModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
        />
      )}

      {viewingUser && (
        <UserDetailModal
          user={viewingUser}
          onClose={() => setViewingUser(null)}
        />
      )}

      {showBulkPriceModal && (
        <BulkPriceModal
          categories={categories}
          products={products}
          onClose={() => setShowBulkPriceModal(false)}
          onSuccess={() => {
            setShowBulkPriceModal(false);
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
          }}
        />
      )}

      {showBulkBadgeModal && (
        <BulkBadgeModal
          products={products}
          categories={categories}
          onClose={() => setShowBulkBadgeModal(false)}
          onSuccess={() => {
            setShowBulkBadgeModal(false);
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
          }}
        />
      )}

      {showBulkAIModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Toplu AI Açıklama
              </h3>
              <button 
                onClick={() => {
                  if (!bulkAIProgress.running) {
                    setShowBulkAIModal(false);
                    setBulkAIProgress({running: false, done: false, message: ''});
                  }
                }} 
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
                disabled={bulkAIProgress.running}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!bulkAIProgress.running && !bulkAIProgress.done ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Açıklama Stili</label>
                  <select
                    value={bulkAIStyle}
                    onChange={(e) => setBulkAIStyle(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                    data-testid="select-bulk-ai-style"
                  >
                    <option value="professional">Profesyonel - Kurumsal ve güvenilir ton</option>
                    <option value="energetic">Enerjik - Dinamik ve motive edici</option>
                    <option value="minimal">Minimal - Kısa ve öz</option>
                    <option value="luxury">Lüks - Premium ve sofistike</option>
                    <option value="natural">Doğal - Anadolu mirası ve el işçiliği vurgusu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Kategori Filtresi (Opsiyonel)</label>
                  <select
                    value={bulkAICategory}
                    onChange={(e) => setBulkAICategory(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                    data-testid="select-bulk-ai-category"
                  >
                    <option value="">Tüm Kategoriler</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 bg-zinc-800/50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-zinc-400 mb-3">Hangi ürünlere uygulansın?</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="bulkAIMode"
                        checked={bulkAIOnlyEmpty && !bulkAIOverwrite}
                        onChange={() => { setBulkAIOnlyEmpty(true); setBulkAIOverwrite(false); }}
                        className="w-5 h-5 bg-zinc-700 border-zinc-600 text-purple-600 focus:ring-purple-500"
                        data-testid="radio-bulk-ai-empty-only"
                      />
                      <span className="text-zinc-300">Sadece açıklaması boş ürünler</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="bulkAIMode"
                        checked={bulkAIOverwrite}
                        onChange={() => { setBulkAIOnlyEmpty(false); setBulkAIOverwrite(true); }}
                        className="w-5 h-5 bg-zinc-700 border-zinc-600 text-purple-600 focus:ring-purple-500"
                        data-testid="radio-bulk-ai-overwrite"
                      />
                      <span className="text-zinc-300">Tüm ürünler (mevcut açıklamalar silinir)</span>
                    </label>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <p className="text-amber-400 text-sm">
                    ⚠️ Bu işlem, seçilen filtrelere göre tüm ürünlerin açıklamalarını AI ile oluşturacak. 
                    Her ürün için yaklaşık 2-3 saniye sürer.
                  </p>
                </div>

                <button
                  onClick={async () => {
                    setBulkAIProgress({running: true, done: false, message: 'Başlatılıyor...'});
                    try {
                      const res = await fetch('/api/admin/products/bulk-ai-description', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                          style: bulkAIStyle,
                          categoryId: bulkAICategory || undefined,
                          onlyEmpty: bulkAIOnlyEmpty,
                          overwrite: bulkAIOverwrite,
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        setBulkAIProgress({running: false, done: true, message: data.error || 'Hata oluştu'});
                      } else {
                        setBulkAIProgress({running: false, done: true, message: data.message, results: data.results});
                        queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
                      }
                    } catch (error) {
                      setBulkAIProgress({running: false, done: true, message: 'Bağlantı hatası'});
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-colors"
                  data-testid="button-start-bulk-ai"
                >
                  <Sparkles className="w-5 h-5" />
                  Toplu Açıklama Oluştur
                </button>
              </div>
            ) : bulkAIProgress.running ? (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
                <p className="text-zinc-300">{bulkAIProgress.message}</p>
                <p className="text-zinc-500 text-sm mt-2">Bu işlem biraz zaman alabilir...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${bulkAIProgress.results ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  <p className={bulkAIProgress.results ? 'text-green-400' : 'text-red-400'}>
                    {bulkAIProgress.message}
                  </p>
                </div>
                
                {bulkAIProgress.results && (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {bulkAIProgress.results.map((r: any, idx: number) => (
                      <div key={idx} className={`flex items-center justify-between p-2 rounded ${r.success ? 'bg-zinc-800' : 'bg-red-900/20'}`}>
                        <span className="text-sm text-zinc-300 truncate flex-1">{r.productName}</span>
                        {r.success ? (
                          <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        ) : (
                          <span className="text-xs text-red-400 flex-shrink-0">{r.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowBulkAIModal(false);
                    setBulkAIProgress({running: false, done: false, message: ''});
                  }}
                  className="w-full px-4 py-3 bg-zinc-800 text-white rounded-lg font-medium hover:bg-zinc-700 transition-colors"
                  data-testid="button-close-bulk-ai"
                >
                  Kapat
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BulkPriceModal({ 
  categories,
  products,
  onClose, 
  onSuccess 
}: { 
  categories: Category[];
  products: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [filterMode, setFilterMode] = useState<'all' | 'category' | 'select'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name_asc' | 'price_asc' | 'price_desc'>('newest');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [priceAction, setPriceAction] = useState<'set' | 'increase' | 'decrease' | 'percent_increase' | 'percent_decrease'>('percent_decrease');
  const [priceValue, setPriceValue] = useState('');
  const [autoBadge, setAutoBadge] = useState(true);
  const [customBadgeText, setCustomBadgeText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; updated?: number } | null>(null);

  const numericValue = parseFloat(priceValue) || 0;
  const isPercent = priceAction.includes('percent');
  const isDecrease = priceAction.includes('decrease');

  // Auto-badge text: computed from action+value, overridable
  const autoBadgeTextComputed = useMemo(() => {
    if (priceAction === 'percent_decrease' && numericValue > 0) {
      return `%${Number.isInteger(numericValue) ? numericValue : numericValue.toFixed(1)}`;
    }
    return '';
  }, [priceAction, numericValue]);

  const badgeTextToSend = customBadgeText.trim() || autoBadgeTextComputed;

  // Show auto-badge toggle only for percent_decrease (makes semantic sense)
  const canAutoBadge = priceAction === 'percent_decrease';

  // Products visible in the list (for 'select' mode)
  const listProducts = useMemo(() => {
    let list = [...products];
    if (filterCategory) list = list.filter(p => p.categoryId === filterCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    // Sort
    list.sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'oldest':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'name_asc':
          return a.name.localeCompare(b.name, 'tr');
        case 'price_asc':
          return parseFloat(a.basePrice) - parseFloat(b.basePrice);
        case 'price_desc':
          return parseFloat(b.basePrice) - parseFloat(a.basePrice);
        default:
          return 0;
      }
    });
    return list;
  }, [products, filterCategory, searchQuery, sortOrder]);

  // Products that will actually be updated
  const affectedProducts = useMemo(() => {
    if (filterMode === 'select') return products.filter(p => selectedProductIds.includes(p.id));
    if (filterMode === 'category') return filterCategory ? products.filter(p => p.categoryId === filterCategory) : [];
    return products;
  }, [filterMode, filterCategory, selectedProductIds, products]);

  const calcNewPrice = (currentPriceStr: string): number => {
    const current = parseFloat(currentPriceStr);
    if (isNaN(current)) return 0;
    let newPrice: number;
    switch (priceAction) {
      case 'set': newPrice = numericValue; break;
      case 'increase': newPrice = current + numericValue; break;
      case 'decrease': newPrice = Math.max(0, current - numericValue); break;
      case 'percent_increase': newPrice = current * (1 + numericValue / 100); break;
      case 'percent_decrease': newPrice = current * (1 - numericValue / 100); break;
      default: newPrice = current;
    }
    return Math.round(newPrice * 100) / 100;
  };

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllVisible = () => {
    const visibleIds = listProducts.map(p => p.id);
    setSelectedProductIds(prev => {
      const existing = new Set(prev);
      visibleIds.forEach(id => existing.add(id));
      return Array.from(existing);
    });
  };

  const clearVisible = () => {
    const visibleIds = new Set(listProducts.map(p => p.id));
    setSelectedProductIds(prev => prev.filter(id => !visibleIds.has(id)));
  };

  const previewSamples = useMemo(() => {
    if (!priceValue || numericValue <= 0 || affectedProducts.length === 0) return [];
    return affectedProducts.slice(0, 5).map(p => ({
      name: p.name,
      before: parseFloat(p.basePrice),
      after: calcNewPrice(p.basePrice),
    }));
  }, [affectedProducts, priceAction, priceValue]);

  const handleSubmit = async () => {
    if (!priceValue || numericValue <= 0 || affectedProducts.length === 0) return;
    setIsLoading(true);
    setResult(null);
    try {
      const body: any = { action: priceAction, value: numericValue };
      if (filterMode === 'select') {
        body.productIds = selectedProductIds;
      } else if (filterMode === 'category' && filterCategory) {
        body.categoryId = filterCategory;
      }
      // filterMode === 'all' → no filter, backend applies to all
      if (canAutoBadge && autoBadge && badgeTextToSend) {
        body.autoBadge = true;
        body.badgeText = badgeTextToSend;
      }

      const res = await fetch('/api/admin/products/bulk-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, message: data.error || 'Hata oluştu' });
      } else {
        const badgeInfo = (canAutoBadge && autoBadge && badgeTextToSend) ? ` · "${badgeTextToSend}" etiketi eklendi` : '';
        setResult({ success: true, message: `${data.updated} ürün güncellendi${badgeInfo}`, updated: data.updated });
        setTimeout(() => onSuccess(), 1500);
      }
    } catch {
      setResult({ success: false, message: 'Bağlantı hatası' });
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = !isLoading && !!priceValue && numericValue > 0 && affectedProducts.length > 0 &&
    (filterMode !== 'category' || !!filterCategory) &&
    (filterMode !== 'select' || selectedProductIds.length > 0);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-semibold text-white">Toplu Fiyat Düzenleme</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Ürün seçin ve fiyat işlemi uygulayın</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Step 1: Scope */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              1 — Kapsam Seçin
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['all', 'Tüm Ürünler', `${products.length} ürün`],
                ['category', 'Kategoriye Göre', 'Kategori seç'],
                ['select', 'Tek Tek Seç', 'Manuel seçim'],
              ] as [typeof filterMode, string, string][]).map(([mode, label, sub]) => (
                <button
                  key={mode}
                  onClick={() => { setFilterMode(mode); setSelectedProductIds([]); setFilterCategory(''); setSearchQuery(''); }}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    filterMode === mode
                      ? 'border-white/30 bg-white/8 text-white'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                  }`}
                  data-testid={`button-filter-mode-${mode}`}
                >
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{mode === 'all' ? sub : sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Category filter (for 'category' mode) */}
          {filterMode === 'category' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Kategori</label>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500"
                data-testid="select-bulk-price-category"
              >
                <option value="">— Kategori Seçin —</option>
                {categories.map(cat => {
                  const count = products.filter(p => p.categoryId === cat.id).length;
                  return <option key={cat.id} value={cat.id}>{cat.name} ({count} ürün)</option>;
                })}
              </select>
            </div>
          )}

          {/* Product selection list (for 'select' mode) */}
          {filterMode === 'select' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Ürün Seçin
                  {selectedProductIds.length > 0 && (
                    <span className="ml-2 text-white bg-white/10 px-1.5 py-0.5 rounded text-[10px] normal-case">
                      {selectedProductIds.length} seçili
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <button onClick={selectAllVisible} className="text-[10px] text-zinc-400 hover:text-white transition-colors">
                    Tümünü Seç
                  </button>
                  <span className="text-zinc-700">|</span>
                  <button onClick={clearVisible} className="text-[10px] text-zinc-400 hover:text-white transition-colors">
                    Temizle
                  </button>
                </div>
              </div>

              {/* Filters row */}
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Ürün ara..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                  data-testid="input-product-search"
                />
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 max-w-[150px]"
                  data-testid="select-filter-category"
                >
                  <option value="">Tüm Kategoriler</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as typeof sortOrder)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 max-w-[145px]"
                  data-testid="select-sort-order"
                >
                  <option value="newest">↓ En Yeni</option>
                  <option value="oldest">↑ En Eski</option>
                  <option value="name_asc">A → Z</option>
                  <option value="price_asc">Fiyat ↑</option>
                  <option value="price_desc">Fiyat ↓</option>
                </select>
              </div>

              {/* Scrollable product list */}
              <div className="border border-zinc-700 rounded-lg overflow-hidden">
                <div className="max-h-52 overflow-y-auto divide-y divide-zinc-700/50">
                  {listProducts.length === 0 ? (
                    <div className="py-6 text-center text-xs text-zinc-500">Ürün bulunamadı</div>
                  ) : listProducts.map((p) => {
                    const checked = selectedProductIds.includes(p.id);
                    const catName = categories.find(c => c.id === p.categoryId)?.name || '';
                    const price = parseFloat(p.basePrice);
                    const addedDate = p.createdAt ? new Date(p.createdAt) : null;
                    const isRecentlyAdded = addedDate && (Date.now() - addedDate.getTime()) < 7 * 24 * 60 * 60 * 1000;
                    const dateLabel = addedDate ? addedDate.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-white/5' : 'hover:bg-zinc-800/60'}`}
                        data-testid={`label-product-${p.id}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProduct(p.id)}
                          className="w-3.5 h-3.5 accent-white shrink-0"
                          data-testid={`checkbox-product-${p.id}`}
                        />
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="w-9 h-12 object-cover bg-zinc-700 rounded shrink-0" />
                        ) : (
                          <div className="w-9 h-12 bg-zinc-700 rounded shrink-0 flex items-center justify-center text-zinc-500 text-[9px]">IMG</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs text-white truncate font-medium">{p.name}</p>
                            {isRecentlyAdded && (
                              <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded font-bold shrink-0">YENİ</span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{catName}{dateLabel ? ` · ${dateLabel}` : ''}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-semibold text-white">{price.toLocaleString('tr-TR')} ₺</p>
                          {p.discountBadge && (
                            <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 rounded">{p.discountBadge}</span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Action + Value */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              2 — Fiyat İşlemi
            </label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={priceAction}
                onChange={e => { setPriceAction(e.target.value as any); setPriceValue(''); }}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500"
                data-testid="select-price-action"
              >
                <option value="percent_decrease">% İndirim uygula</option>
                <option value="percent_increase">% Zam uygula</option>
                <option value="set">Sabit fiyat belirle</option>
                <option value="increase">TL artır</option>
                <option value="decrease">TL azalt</option>
              </select>
              <div className="relative">
                <input
                  type="number"
                  value={priceValue}
                  onChange={e => setPriceValue(e.target.value)}
                  placeholder={isPercent ? '20' : priceAction === 'set' ? '999' : '50'}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-3 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500"
                  min="0"
                  max={isPercent ? '100' : undefined}
                  step={isPercent ? '1' : '0.01'}
                  data-testid="input-price-value"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs pointer-events-none">
                  {isPercent ? '%' : '₺'}
                </span>
              </div>
            </div>
          </div>

          {/* Auto-badge option — only for percent_decrease */}
          {canAutoBadge && (
            <div className={`rounded-lg border transition-colors ${autoBadge ? 'border-white/20 bg-white/4' : 'border-zinc-700 bg-zinc-800/40'}`}>
              <label className="flex items-center gap-3 px-3 py-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoBadge}
                  onChange={e => { setAutoBadge(e.target.checked); setCustomBadgeText(''); }}
                  className="w-4 h-4 accent-white shrink-0"
                  data-testid="checkbox-auto-badge"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium">Otomatik indirim etiketi ekle</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Seçilen ürünlere uygulanan indirim oranını etiket olarak bassın</p>
                </div>
                {autoBadge && badgeTextToSend && (
                  <div className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shrink-0 rotate-[-2deg]">
                    {badgeTextToSend}
                  </div>
                )}
              </label>
              {autoBadge && (
                <div className="px-3 pb-3 flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 shrink-0">Etiket metni:</span>
                  <input
                    type="text"
                    value={customBadgeText}
                    onChange={e => setCustomBadgeText(e.target.value)}
                    placeholder={autoBadgeTextComputed || '%20'}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-zinc-500 placeholder-zinc-600"
                    data-testid="input-badge-custom-text"
                  />
                  {customBadgeText && (
                    <button onClick={() => setCustomBadgeText('')} className="text-[10px] text-zinc-500 hover:text-white shrink-0">
                      Sıfırla
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Preview table */}
          {previewSamples.length > 0 && (
            <div className="bg-zinc-800/60 rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-zinc-700/50 flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Önizleme
                </p>
                <span className="text-[10px] text-zinc-500">{affectedProducts.length} ürün etkilenecek</span>
              </div>
              <div className="divide-y divide-zinc-700/40">
                {previewSamples.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5">
                    <p className="text-xs text-zinc-300 truncate flex-1 mr-3">{s.name}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-zinc-500 line-through">{s.before.toLocaleString('tr-TR')} ₺</span>
                      <span className="text-[10px] text-zinc-600">→</span>
                      <span className={`text-xs font-semibold ${isDecrease ? 'text-emerald-400' : priceAction.includes('increase') ? 'text-blue-400' : 'text-white'}`}>
                        {s.after.toLocaleString('tr-TR')} ₺
                      </span>
                      {s.before > 0 && s.before !== s.after && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDecrease ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-400'}`}>
                          {isDecrease ? '-' : '+'}{Math.abs(((s.after - s.before) / s.before) * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {affectedProducts.length > 5 && (
                  <div className="px-3 py-2 text-center">
                    <span className="text-xs text-zinc-600">+{affectedProducts.length - 5} ürün daha</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Roundtrip warning */}
          {isPercent && priceValue && numericValue > 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <span className="text-amber-500 text-xs mt-0.5">⚠</span>
              <p className="text-xs text-amber-500/80">
                %{numericValue} {isDecrease ? 'indirim' : 'zam'} sonrası geri almak için{' '}
                {isDecrease
                  ? `%${(numericValue / (100 - numericValue) * 100).toFixed(2)} zam`
                  : `%${(numericValue / (100 + numericValue) * 100).toFixed(2)} indirim`} gerekir.
              </p>
            </div>
          )}

          {result && (
            <div className={`p-3 rounded-lg text-sm ${
              result.success ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              {result.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-800 flex items-center justify-between shrink-0">
          <p className="text-xs text-zinc-600">
            {affectedProducts.length > 0 ? `${affectedProducts.length} ürün etkilenecek` : '—'}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors">
              İptal
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-4 py-2 text-sm bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-40 flex items-center gap-2"
              data-testid="button-apply-bulk-price"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Uygulanıyor...</>
              ) : (
                `${affectedProducts.length > 0 ? affectedProducts.length : ''} Ürüne Uygula`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkBadgeModal({
  products,
  categories,
  onClose,
  onSuccess,
}: {
  products: any[];
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [badgeText, setBadgeText] = useState('%20');
  const [filterMode, setFilterMode] = useState<'all' | 'category' | 'select'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const filteredProducts = filterMode === 'category' && selectedCategoryId
    ? products.filter(p => p.categoryId === selectedCategoryId || p.categoryIds?.includes(selectedCategoryId))
    : products;

  const targetIds = filterMode === 'select'
    ? selectedProductIds
    : filterMode === 'category'
      ? (selectedCategoryId ? filteredProducts.map(p => p.id) : [])
      : products.map(p => p.id);

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleApply = async () => {
    if (targetIds.length === 0) return;
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/products/bulk-badge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productIds: targetIds, badge: badgeText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, message: data.error || 'Hata oluştu' });
      } else {
        setResult({ success: true, message: `${data.updated} ürüne etiket eklendi` });
        setTimeout(() => onSuccess(), 1500);
      }
    } catch {
      setResult({ success: false, message: 'Bağlantı hatası' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (targetIds.length === 0) return;
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/products/bulk-badge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productIds: targetIds, badge: '' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, message: data.error || 'Hata oluştu' });
      } else {
        setResult({ success: true, message: `${data.updated} üründen etiket kaldırıldı` });
        setTimeout(() => onSuccess(), 1500);
      }
    } catch {
      setResult({ success: false, message: 'Bağlantı hatası' });
    } finally {
      setIsLoading(false);
    }
  };

  const presets = ['%10', '%15', '%20', '%25', '%30', '%40', '%50', 'KAMPANYA', 'SON FIRSAT', 'YENİ SEZON'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-orange-400" />
            Toplu Etiket Yönetimi
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Etiket Metni</label>
            <input
              type="text"
              value={badgeText}
              onChange={(e) => setBadgeText(e.target.value)}
              placeholder="%20"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
              data-testid="input-badge-text"
            />
            <div className="flex flex-wrap gap-2 mt-3">
              {presets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setBadgeText(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    badgeText === preset
                      ? 'bg-orange-500 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
                  }`}
                  data-testid={`button-preset-${preset}`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Önizleme</label>
            <div className="bg-zinc-800 rounded-lg p-4 flex items-center justify-center">
              <div className="relative w-32 h-40 bg-zinc-700 rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-xs">Ürün</div>
                {badgeText && (
                  <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-lg transform -rotate-2">
                    {badgeText}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Uygulama Kapsamı</label>
            <div className="flex gap-2">
              {[
                { key: 'all' as const, label: 'Tüm Ürünler' },
                { key: 'category' as const, label: 'Kategoriye Göre' },
                { key: 'select' as const, label: 'Seçim Yap' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setFilterMode(opt.key)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1 ${
                    filterMode === opt.key
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
                  }`}
                  data-testid={`button-filter-${opt.key}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {filterMode === 'category' && (
            <div>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                data-testid="select-badge-category"
              >
                <option value="">Kategori seçin...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}

          {filterMode === 'select' && (
            <div className="max-h-48 overflow-y-auto space-y-1 bg-zinc-800 border border-zinc-700 rounded-lg p-2">
              {products.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    selectedProductIds.includes(p.id) ? 'bg-orange-500/10' : 'hover:bg-zinc-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                    className="rounded border-zinc-600 text-orange-500 focus:ring-orange-500"
                  />
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {p.images?.[0] && (
                      <img src={p.images[0]} alt="" className="w-8 h-8 rounded object-cover" />
                    )}
                    <span className="text-sm text-white truncate">{p.name}</span>
                    {p.discountBadge && (
                      <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold shrink-0">{p.discountBadge}</span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="text-sm text-zinc-500">
            {targetIds.length} ürün seçildi
          </div>

          {result && (
            <div className={`p-3 rounded-lg text-sm ${
              result.success
                ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                : 'bg-red-500/20 border border-red-500/50 text-red-400'
            }`}>
              {result.message}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-800 flex justify-between">
          <button
            onClick={handleRemove}
            disabled={isLoading || targetIds.length === 0}
            className="px-4 py-2 bg-zinc-800 text-red-400 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50 border border-zinc-700 text-sm font-medium"
            data-testid="button-remove-badge"
          >
            Etiketleri Kaldır
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleApply}
              disabled={isLoading || targetIds.length === 0 || !badgeText}
              className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-500 hover:to-red-500 transition-colors disabled:opacity-50 font-medium"
              data-testid="button-apply-badge"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Etiketi Uygula'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];

const COLOR_OPTIONS = [
  { name: 'Siyah', hex: '#000000' },
  { name: 'Beyaz', hex: '#FFFFFF' },
  { name: 'Gri', hex: '#6B7280' },
  { name: 'Lacivert', hex: '#1E3A5F' },
  { name: 'Kırmızı', hex: '#EF4444' },
  { name: 'Mavi', hex: '#3B82F6' },
  { name: 'Yeşil', hex: '#22C55E' },
  { name: 'Sarı', hex: '#EAB308' },
  { name: 'Turuncu', hex: '#F97316' },
  { name: 'Mor', hex: '#A855F7' },
  { name: 'Pembe', hex: '#EC4899' },
  { name: 'Kahverengi', hex: '#92400E' },
  { name: 'Bej', hex: '#D4C4A8' },
  { name: 'Bordo', hex: '#7C2D12' },
  { name: 'Antrasit', hex: '#374151' },
  { name: 'Haki', hex: '#6B8E23' },
];

function ProductModal({ 
  product, 
  categories, 
  onClose, 
  onSave, 
  isSaving 
}: { 
  product: Product | null; 
  categories: Category[];
  onClose: () => void; 
  onSave: (product: Partial<Product>) => void;
  isSaving: boolean;
}) {
  const generateSlug = (name: string) => {
    const turkishMap: { [key: string]: string } = {
      'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
      'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
    };
    return name
      .split('')
      .map(char => turkishMap[char] || char)
      .join('')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const [formData, setFormData] = useState({
    name: product?.name || '',
    slug: product?.slug || '',
    description: product?.description || '',
    sku: product?.sku || '',
    basePrice: product?.basePrice || '',
    categoryId: product?.categoryId || '',
    categoryIds: product?.categoryIds || (product?.categoryId ? [product.categoryId] : []) as string[],
    images: product?.images || [] as string[],
    availableSizes: product?.availableSizes || [],
    availableColors: product?.availableColors || [],
    isActive: product?.isActive ?? true,
    isFeatured: product?.isFeatured ?? false,
    isNew: product?.isNew ?? false,
    initialStock: '',
  });
  
  const regenerateSlug = () => {
    setFormData(prev => ({ ...prev, slug: generateSlug(prev.name) }));
  };

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  // AI Description Generation
  const [aiStyle, setAiStyle] = useState<string>('professional');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  
  const aiStyles = [
    { id: 'professional', name: 'Profesyonel', description: 'Kurumsal ve güvenilir ton' },
    { id: 'energetic', name: 'Enerjik', description: 'Dinamik ve motive edici' },
    { id: 'minimal', name: 'Minimal', description: 'Kısa ve öz' },
    { id: 'luxury', name: 'Lüks', description: 'Premium ve sofistike' },
    { id: 'natural', name: 'Doğal', description: 'Anadolu mirası ve el işçiliği vurgusu' },
  ];
  
  const generateAIDescription = async () => {
    if (!product?.id) {
      alert('Önce ürünü kaydedin, ardından AI açıklaması oluşturabilirsiniz.');
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/generate-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ style: aiStyle }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'AI açıklaması oluşturulamadı');
      }
      
      const data = await res.json();
      setAiPreview(data.description);
    } catch (error) {
      console.error('AI generation error:', error);
      alert(error instanceof Error ? error.message : 'AI açıklaması oluşturulamadı');
    } finally {
      setIsGeneratingAI(false);
    }
  };
  
  const applyAIDescription = () => {
    if (aiPreview) {
      setFormData({ ...formData, description: aiPreview });
      setAiPreview(null);
      setShowAiPanel(false);
    }
  };
  
  const [previewSize, setPreviewSize] = useState<string | null>(formData.availableSizes[0] || null);
  const [previewColor, setPreviewColor] = useState<{name: string; hex: string} | null>(formData.availableColors[0] || null);
  const [previewImage, setPreviewImage] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const toggleSize = (size: string) => {
    setFormData(prev => {
      const isRemoving = prev.availableSizes.includes(size);
      const newSizes = isRemoving
        ? prev.availableSizes.filter(s => s !== size)
        : [...prev.availableSizes, size];
      
      if (isRemoving && previewSize === size) {
        setPreviewSize(newSizes[0] || null);
      } else if (!isRemoving && newSizes.length === 1) {
        setPreviewSize(size);
      }
      
      return { ...prev, availableSizes: newSizes };
    });
  };

  const toggleColor = (color: { name: string; hex: string }) => {
    setFormData(prev => {
      const isRemoving = prev.availableColors.some(c => c.name === color.name);
      const newColors = isRemoving
        ? prev.availableColors.filter(c => c.name !== color.name)
        : [...prev.availableColors, color];
      
      if (isRemoving && previewColor?.name === color.name) {
        setPreviewColor(newColors[0] || null);
      } else if (!isRemoving && newColors.length === 1) {
        setPreviewColor(color);
      }
      
      return { ...prev, availableColors: newColors };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    setPendingFiles(prev => [...prev, ...files]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    
    let uploadedUrls: string[] = [];
    
    if (pendingFiles.length > 0) {
      setIsUploading(true);
      try {
        const formDataUpload = new FormData();
        pendingFiles.forEach(file => formDataUpload.append('images', file));
        
        const response = await fetch('/api/admin/upload/products', {
          method: 'POST',
          body: formDataUpload,
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          uploadedUrls = data.urls;
          setPendingFiles([]);
        } else {
          setUploadError('Resim yüklenemedi. Lütfen tekrar deneyin.');
          setIsUploading(false);
          return;
        }
      } catch (error) {
        console.error('Upload failed:', error);
        setUploadError('Resim yüklenemedi. Lütfen tekrar deneyin.');
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }
    
    onSave({
      ...product,
      ...formData,
      slug: formData.slug || generateSlug(formData.name),
      images: [...formData.images, ...uploadedUrls],
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h3 className="text-xl font-semibold text-white">
            {product ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
          </h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showPreview ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
              data-testid="button-toggle-preview"
            >
              <Eye className="w-4 h-4" />
              Önizleme
            </button>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className={`flex ${showPreview ? 'flex-row' : 'flex-col'}`}>
        <form onSubmit={handleSubmit} className={`p-6 space-y-4 ${showPreview ? 'w-1/2 border-r border-zinc-800' : 'w-full'}`}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Ürün Adı</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-500"
                required
                data-testid="input-product-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Stok Kodu (SKU)</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-500"
                placeholder="Örn: HNK-001"
                data-testid="input-product-sku"
              />
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-400">URL Slug</label>
              <button
                type="button"
                onClick={regenerateSlug}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-medium rounded-lg transition-all"
                data-testid="button-regenerate-slug"
              >
                <RefreshCw className="w-3 h-3" />
                İsimden Oluştur
              </button>
            </div>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-500"
              placeholder="urun-adi-slug"
              data-testid="input-product-slug"
            />
            <p className="text-xs text-zinc-500 mt-1">Site URL'sinde görünecek: polenstone.com.tr/urun/{formData.slug || 'slug'}</p>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-400">Açıklama</label>
              {product?.id && (
                <button
                  type="button"
                  onClick={() => setShowAiPanel(!showAiPanel)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-medium rounded-lg transition-all"
                  data-testid="button-ai-description"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI ile Oluştur
                </button>
              )}
            </div>
            
            {showAiPanel && (
              <div className="mb-3 p-4 bg-zinc-800/50 border border-purple-500/30 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
                  <Wand2 className="w-4 h-4" />
                  AI Açıklama Oluşturucu
                </div>
                
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Yazım Stili</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {aiStyles.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setAiStyle(style.id)}
                        className={`px-2 py-1.5 text-xs rounded-lg transition-all ${
                          aiStyle === style.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                        }`}
                        title={style.description}
                        data-testid={`button-ai-style-${style.id}`}
                      >
                        {style.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={generateAIDescription}
                  disabled={isGeneratingAI}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all"
                  data-testid="button-ai-generate"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Açıklama Oluştur
                    </>
                  )}
                </button>
                
                {aiPreview && (
                  <div className="space-y-2">
                    <div className="text-xs text-zinc-500">Önizleme:</div>
                    <div 
                      className="p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 max-h-40 overflow-y-auto prose prose-sm prose-invert"
                      dangerouslySetInnerHTML={{ __html: aiPreview }}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={applyAIDescription}
                        className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg transition-colors"
                        data-testid="button-ai-apply"
                      >
                        <Check className="w-3.5 h-3.5 inline mr-1" />
                        Uygula
                      </button>
                      <button
                        type="button"
                        onClick={generateAIDescription}
                        disabled={isGeneratingAI}
                        className="flex-1 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-medium rounded-lg transition-colors"
                        data-testid="button-ai-regenerate"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 inline mr-1 ${isGeneratingAI ? 'animate-spin' : ''}`} />
                        Yeniden Oluştur
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAiPreview(null); setShowAiPanel(false); }}
                        className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-medium rounded-lg transition-colors"
                        data-testid="button-ai-cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={5}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-500 font-mono text-sm"
              placeholder="Ürün açıklaması (HTML destekler)..."
              data-testid="input-product-description"
            />
            {formData.description && formData.description.includes('<') && (
              <div className="mt-2">
                <div className="text-xs text-zinc-500 mb-1">Önizleme:</div>
                <div 
                  className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-300 prose prose-sm prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: formData.description }}
                />
              </div>
            )}
          </div>
          
          <div className={`grid ${!product ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Fiyat (₺)</label>
              <input
                type="text"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-500"
                required
                data-testid="input-product-price"
              />
            </div>
            {!product && (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Başlangıç Stoğu</label>
                <input
                  type="number"
                  value={formData.initialStock}
                  onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                  placeholder="Tüm varyasyonlar için"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-500"
                  min="0"
                  data-testid="input-product-stock"
                />
                <p className="text-xs text-zinc-500 mt-1">Tüm beden/renk kombinasyonlarına uygulanır</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Kategoriler</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      const newIds = formData.categoryIds.includes(cat.id)
                        ? formData.categoryIds.filter(id => id !== cat.id)
                        : [...formData.categoryIds, cat.id];
                      setFormData({
                        ...formData,
                        categoryIds: newIds,
                        categoryId: newIds[0] || ''
                      });
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.categoryIds.includes(cat.id)
                        ? 'bg-white text-black'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                    data-testid={`button-category-${cat.id}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              {formData.categoryIds.length === 0 && (
                <p className="text-xs text-red-400 mt-1">En az bir kategori seçin</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Bedenler</label>
            <div className="flex flex-wrap gap-2">
              {ALL_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.availableSizes.includes(size)
                      ? 'bg-white text-black'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                  data-testid={`button-size-${size}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Renkler</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => toggleColor(color)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    formData.availableColors.some(c => c.name === color.name)
                      ? 'bg-zinc-700 ring-2 ring-white'
                      : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                  data-testid={`button-color-${color.name}`}
                >
                  <span 
                    className="w-4 h-4 rounded-full border border-zinc-600" 
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-zinc-300">{color.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Ürün Resimleri</label>
            
            {uploadError && (
              <div className="mb-3 p-3 bg-red-900/30 border border-red-600 rounded-lg text-red-400 text-sm">
                {uploadError}
              </div>
            )}
            
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver ? 'border-white bg-zinc-800' : 'border-zinc-700 hover:border-zinc-500'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="image-upload"
                data-testid="input-product-images"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-zinc-500" />
                <p className="text-sm text-zinc-400">
                  Resimleri sürükleyip bırakın veya <span className="text-white underline">seçin</span>
                </p>
                <p className="text-xs text-zinc-500 mt-1">PNG, JPG, WEBP (max 10MB)</p>
              </label>
            </div>

            {(formData.images.length > 0 || pendingFiles.length > 0) && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {formData.images.map((image, index) => (
                  <div key={`existing-${index}`} className="relative group aspect-square">
                    <img
                      src={image}
                      alt={`Ürün ${index + 1}`}
                      className={`w-full h-full object-cover rounded-lg cursor-pointer transition-all ${
                        index === 0 ? 'ring-2 ring-white' : 'hover:ring-2 hover:ring-zinc-500'
                      }`}
                      onClick={() => {
                        if (index !== 0) {
                          const newImages = [...formData.images];
                          const [selected] = newImages.splice(index, 1);
                          newImages.unshift(selected);
                          setFormData({ ...formData, images: newImages });
                        }
                      }}
                      title={index === 0 ? 'Ana fotoğraf' : 'Ana fotoğraf olarak ayarla'}
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {index === 0 ? (
                      <span className="absolute bottom-1 left-1 text-[10px] bg-white text-black px-1.5 py-0.5 rounded font-medium">
                        Ana
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const newImages = [...formData.images];
                          const [selected] = newImages.splice(index, 1);
                          newImages.unshift(selected);
                          setFormData({ ...formData, images: newImages });
                        }}
                        className="absolute bottom-1 left-1 text-[10px] bg-zinc-700 text-white px-1.5 py-0.5 rounded font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-600"
                      >
                        Ana Yap
                      </button>
                    )}
                  </div>
                ))}
                {pendingFiles.map((file, index) => (
                  <div key={`pending-${index}`} className="relative group aspect-square">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Yeni ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg ring-2 ring-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => removePendingFile(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <span className="absolute bottom-1 left-1 text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded font-medium">
                      Yeni
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-6">
            {/* Active/Inactive Toggle Switch */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-400">Ürün Durumu:</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  formData.isActive ? 'bg-emerald-500' : 'bg-zinc-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow ${
                    formData.isActive ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${formData.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                {formData.isActive ? 'Aktif' : 'Pasif'}
              </span>
            </div>
            
            <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="w-4 h-4 rounded bg-zinc-700 border-zinc-600"
              />
              Öne Çıkan
            </label>
            <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isNew}
                onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                className="w-4 h-4 rounded bg-zinc-700 border-zinc-600"
              />
              Yeni
            </label>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center gap-2"
              data-testid="button-save-product"
            >
              {(isSaving || isUploading) && <Loader2 className="w-4 h-4 animate-spin" />}
              {isUploading ? 'Yükleniyor...' : isSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
        
        {showPreview && (
          <div className="w-1/2 p-6 bg-zinc-950/50 max-h-[calc(90vh-80px)] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-950/80 backdrop-blur-sm py-2 mb-4 -mt-2 z-10">
              <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Müşteri Görünümü Önizlemesi
              </h4>
            </div>
            
            <div className="space-y-6">
              {(formData.images.length > 0 || pendingFiles.length > 0) && (
                <div className="space-y-3">
                  <div className="aspect-[4/5] bg-zinc-800 rounded-xl overflow-hidden">
                    {formData.images[previewImage] ? (
                      <img 
                        src={formData.images[previewImage]} 
                        alt="Önizleme" 
                        className="w-full h-full object-cover"
                      />
                    ) : pendingFiles[0] ? (
                      <img 
                        src={URL.createObjectURL(pendingFiles[0])} 
                        alt="Yeni" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <Package className="w-16 h-16" />
                      </div>
                    )}
                  </div>
                  {formData.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {formData.images.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPreviewImage(idx)}
                          className={`w-16 h-20 rounded-lg overflow-hidden shrink-0 transition-all ${
                            previewImage === idx ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                  {formData.sku || 'SKU'}
                </p>
                <h3 className="text-xl font-bold text-white">
                  {formData.name || 'Ürün Adı'}
                </h3>
                <p className="text-2xl font-bold text-white mt-2">
                  {formData.basePrice ? `${parseFloat(formData.basePrice).toLocaleString('tr-TR')} ₺` : '0 ₺'}
                </p>
              </div>
              
              {formData.availableColors.length > 0 && (
                <div>
                  <p className="text-sm text-zinc-400 mb-2">
                    Renk: <span className="text-white">{previewColor?.name || formData.availableColors[0]?.name}</span>
                  </p>
                  <div className="flex gap-2">
                    {formData.availableColors.map((color) => {
                      const isSelected = previewColor?.name === color.name || (!previewColor && color.name === formData.availableColors[0]?.name);
                      const isLight = color.hex === '#FFFFFF' || color.hex === '#D4C4A8';
                      return (
                        <button
                          key={color.name}
                          type="button"
                          onClick={() => setPreviewColor(color)}
                          className={`w-8 h-8 rounded-full transition-all ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : ''} ${isLight ? 'border border-zinc-600' : ''}`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              
              {formData.availableSizes.length > 0 && (
                <div>
                  <p className="text-sm text-zinc-400 mb-2">
                    Beden: <span className="text-white">{previewSize || formData.availableSizes[0]}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {formData.availableSizes.map((size) => {
                      const isSelected = previewSize === size || (!previewSize && size === formData.availableSizes[0]);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setPreviewSize(size)}
                          className={`min-w-[48px] h-10 px-3 rounded-lg text-sm font-medium transition-all ${
                            isSelected 
                              ? 'bg-white text-black' 
                              : 'bg-zinc-800 text-white hover:bg-zinc-700'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {formData.description && (
                <div>
                  <p className="text-sm text-zinc-400 mb-2">Açıklama</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {formData.description}
                  </p>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  className="flex-1 h-12 bg-white text-black rounded-xl font-bold text-sm"
                  disabled
                >
                  SEPETE EKLE
                </button>
              </div>
              
              <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                <p className="text-xs text-zinc-500">
                  Bu önizleme, müşterilerin ürün sayfasında göreceği görünümü yansıtır. 
                  Kaydet'e tıkladığınızda seçtiğiniz bedenler ve renkler ürün sayfasında görünecektir.
                </p>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function CategoryModal({ 
  category, 
  onClose, 
  onSave, 
  isSaving 
}: { 
  category: Category | null; 
  onClose: () => void; 
  onSave: (category: Partial<Category>) => void;
  isSaving: boolean;
}) {
  const generateSlug = (name: string) => {
    const turkishMap: { [key: string]: string } = {
      'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
      'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
    };
    return name
      .split('')
      .map(char => turkishMap[char] || char)
      .join('')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const [formData, setFormData] = useState({
    name: category?.name || '',
    image: category?.image || '',
    displayOrder: category?.displayOrder || 0,
  });
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(category?.image || null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('Dosya boyutu 10MB\'dan küçük olmalı');
        return;
      }
      setPendingFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadError(null);
    }
  };

  const removeImage = () => {
    setPendingFile(null);
    setPreviewUrl(null);
    setFormData({ ...formData, image: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let imageUrl = formData.image;
    
    if (pendingFile) {
      setIsUploading(true);
      try {
        const uploadFormData = new FormData();
        uploadFormData.append('images', pendingFile);
        
        const response = await fetch('/api/admin/upload/categories', {
          method: 'POST',
          body: uploadFormData,
          credentials: 'include',
        });
        
        if (!response.ok) throw new Error('Yükleme başarısız');
        
        const data = await response.json();
        imageUrl = data.urls[0];
      } catch (error) {
        setUploadError('Görsel yüklenirken hata oluştu');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }
    
    onSave({
      ...category,
      ...formData,
      image: imageUrl,
      slug: category?.slug || generateSlug(formData.name),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h3 className="text-xl font-semibold text-white">
            {category ? 'Kategori Düzenle' : 'Yeni Kategori Ekle'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Kategori Adı</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-500"
              required
              data-testid="input-category-name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Kategori Görseli</label>
            
            {uploadError && (
              <div className="mb-3 p-3 bg-red-900/50 border border-red-800 rounded-lg text-red-300 text-sm">
                {uploadError}
              </div>
            )}
            
            {previewUrl ? (
              <div className="relative group">
                <img
                  src={previewUrl}
                  alt="Kategori görseli"
                  className="w-full h-40 object-cover rounded-lg border border-zinc-700"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="category-image-upload"
                  />
                  <label 
                    htmlFor="category-image-upload" 
                    className="text-sm text-zinc-400 hover:text-white cursor-pointer underline"
                  >
                    Değiştir
                  </label>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center hover:border-zinc-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="category-image-upload"
                  data-testid="input-category-image"
                />
                <label htmlFor="category-image-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-zinc-500" />
                  <p className="text-sm text-zinc-400">
                    Görsel yüklemek için <span className="text-white underline">tıklayın</span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">PNG, JPG, WEBP (max 10MB)</p>
                </label>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Sıralama</label>
            <input
              type="number"
              value={formData.displayOrder}
              onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-500"
              data-testid="input-category-order"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
              data-testid="button-save-category"
            >
              {isUploading ? 'Yükleniyor...' : isSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OrderDetailModal({ order, onClose, onRefresh }: { order: Order; onClose: () => void; onRefresh?: () => void }) {
  const [status, setStatus] = useState(order.status);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    // Fetch order details including items
    fetch(`/api/admin/orders/${order.id}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.items) setOrderItems(data.items);
        if (data.trackingNumber) setTrackingNumber(data.trackingNumber);
        if (data.trackingUrl) setTrackingUrl(data.trackingUrl);
      });
    
    // Fetch order notes
    fetch(`/api/admin/orders/${order.id}/notes`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setNotes(data));
  }, [order.id]);

  const handleStatusUpdate = async () => {
    setIsUpdating(true);
    try {
      const payload: any = { status };
      
      // Include tracking number when changing to shipped
      if (status === 'shipped' && trackingNumber) {
        payload.trackingNumber = trackingNumber;
      }
      
      await fetch(`/api/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      onRefresh?.();
      onClose();
    } catch (error) {
      console.error('Status update failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTrackingUpdate = async () => {
    setIsUpdating(true);
    try {
      await fetch(`/api/admin/orders/${order.id}/tracking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          trackingNumber, 
          trackingUrl: trackingUrl || `https://www.dhl.com/tr-tr/home/takip.html?tracking-id=${trackingNumber}`,
          shippingCarrier: 'DHL E-Commerce'
        }),
        credentials: 'include',
      });
      
      // Update status to shipped if tracking is added
      if (status !== 'shipped' && status !== 'delivered') {
        await fetch(`/api/admin/orders/${order.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'shipped' }),
          credentials: 'include',
        });
        setStatus('shipped');
      }
      onRefresh?.();
    } catch (error) {
      console.error('Tracking update failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    setIsUpdating(true);
    try {
      await fetch(`/api/admin/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
        credentials: 'include',
      });
      setStatus('cancelled');
      setShowCancelConfirm(false);
      onRefresh?.();
    } catch (error) {
      console.error('Cancel order failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
        credentials: 'include',
      });
      const note = await res.json();
      setNotes([note, ...notes]);
      setNewNote('');
    } catch (error) {
      console.error('Add note failed:', error);
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Beklemede', color: 'bg-yellow-500' },
    { value: 'processing', label: 'Hazırlanıyor', color: 'bg-blue-500' },
    { value: 'shipped', label: 'Kargoya Verildi', color: 'bg-purple-500' },
    { value: 'delivered', label: 'Teslim Edildi', color: 'bg-green-500' },
    { value: 'cancelled', label: 'İptal Edildi', color: 'bg-red-500' },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div>
            <h3 className="text-xl font-semibold text-white">Sipariş Detayı</h3>
            <p className="text-sm text-zinc-400 font-mono">{order.orderNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-zinc-500 mb-1">Müşteri</p>
              <p className="text-white font-medium">{order.customerName}</p>
              <p className="text-zinc-400 text-sm">{order.customerEmail}</p>
              <p className="text-zinc-400 text-sm">{order.customerPhone}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500 mb-1">Teslimat Adresi</p>
              <p className="text-zinc-300 text-sm">{order.shippingAddress?.address}</p>
              <p className="text-zinc-400 text-sm">{order.shippingAddress?.district}, {order.shippingAddress?.city}</p>
              <p className="text-zinc-400 text-sm">{order.shippingAddress?.postalCode}</p>
            </div>
          </div>

          {/* Order Items */}
          {orderItems.length > 0 && (
            <div>
              <p className="text-sm text-zinc-500 mb-2">Sipariş Kalemleri</p>
              <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
                {orderItems.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="text-white">{item.productName}</p>
                      {item.variantDetails && <p className="text-zinc-400 text-xs">{item.variantDetails}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-white">{item.quantity} x {item.price}₺</p>
                      <p className="text-zinc-400 text-xs">{item.subtotal}₺</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 pt-3 border-t border-zinc-700">
                <span className="text-zinc-400">Toplam</span>
                <span className="text-xl font-bold text-white">{order.total}₺</span>
              </div>
            </div>
          )}

          {/* Status Management */}
          <div className="bg-zinc-800/50 rounded-lg p-4">
            <p className="text-sm text-zinc-500 mb-3">Sipariş Durumu</p>
            <div className="flex gap-3 items-center">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={status === 'cancelled'}
                className="flex-1 px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none"
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={handleStatusUpdate}
                disabled={isUpdating || status === order.status || status === 'cancelled'}
                className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50"
              >
                Güncelle
              </button>
            </div>
          </div>

          {/* DHL Tracking */}
          <div className="bg-zinc-800/50 rounded-lg p-4">
            <p className="text-sm text-zinc-500 mb-3">DHL E-Commerce Kargo</p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Takip Numarası"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none"
              />
              <input
                type="text"
                placeholder="Takip URL (opsiyonel - otomatik oluşturulur)"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none"
              />
              <button
                onClick={handleTrackingUpdate}
                disabled={isUpdating || !trackingNumber}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                Kargoya Ver
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-sm text-zinc-500 mb-2">Notlar</p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Not ekle..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none"
              />
              <button
                onClick={handleAddNote}
                className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
              >
                Ekle
              </button>
            </div>
            {notes.length > 0 && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {notes.map((note: any) => (
                  <div key={note.id} className="bg-zinc-800 rounded-lg p-2 text-sm">
                    <p className="text-white">{note.content}</p>
                    <p className="text-zinc-500 text-xs mt-1">
                      {new Date(note.createdAt).toLocaleString('tr-TR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cancel Order */}
          {status !== 'cancelled' && status !== 'delivered' && (
            <div className="pt-4 border-t border-zinc-800">
              {!showCancelConfirm ? (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg hover:bg-red-600/30"
                >
                  Siparişi İptal Et
                </button>
              ) : (
                <div className="space-y-3 bg-red-900/20 p-4 rounded-lg border border-red-600/30">
                  <p className="text-red-400 text-sm">Siparişi iptal etmek istediğinize emin misiniz? Stok otomatik olarak iade edilecektir.</p>
                  <input
                    type="text"
                    placeholder="İptal sebebi (opsiyonel)"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
                    >
                      Vazgeç
                    </button>
                    <button
                      onClick={handleCancelOrder}
                      disabled={isUpdating}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      İptal Et
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserDetailModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [stats, setStats] = useState<{
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: string | null;
    products: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/users/${user.id}/stats`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [user.id]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h3 className="text-xl font-semibold text-white">Kullanıcı Detayı</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center text-white text-2xl font-bold">
              {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xl font-semibold text-white">{user.firstName} {user.lastName}</p>
              <p className="text-zinc-400">{user.email}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-zinc-500">Telefon</p>
              <p className="text-white">{user.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500">Kayıt Tarihi</p>
              <p className="text-white">{new Date(user.createdAt).toLocaleDateString('tr-TR')}</p>
            </div>
          </div>

          {/* Order Stats */}
          {isLoading ? (
            <div className="text-center py-4 text-zinc-400">Yükleniyor...</div>
          ) : stats && (
            <div className="pt-4 border-t border-zinc-800 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">{stats.totalOrders}</p>
                  <p className="text-xs text-zinc-400">Toplam Sipariş</p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-400">{stats.totalSpent.toFixed(2)}₺</p>
                  <p className="text-xs text-zinc-400">Toplam Harcama</p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-sm font-medium text-white">
                    {stats.lastOrderDate ? new Date(stats.lastOrderDate).toLocaleDateString('tr-TR') : '-'}
                  </p>
                  <p className="text-xs text-zinc-400">Son Sipariş</p>
                </div>
              </div>

              {stats.products.length > 0 && (
                <div>
                  <p className="text-sm text-zinc-500 mb-2">Satın Alınan Ürünler</p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {stats.products.map((product, index) => (
                      <span key={index} className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-full">
                        {product}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalyticsPanel() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  const fmt = (n: number) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  const fmtPrice = (n: number) => '₺' + new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const { data: kpi, isLoading: kpiLoading } = useQuery({
    queryKey: ['admin-analytics-kpi'],
    queryFn: async () => {
      const res = await fetch('/api/admin/analytics/kpi', { credentials: 'include' });
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['admin-sales', period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/sales?period=${period}`, { credentials: 'include' });
      return res.json();
    },
  });

  const { data: bestSellers, isLoading: bestSellersLoading } = useQuery({
    queryKey: ['admin-best-sellers'],
    queryFn: async () => {
      const res = await fetch('/api/admin/analytics/best-sellers?limit=8', { credentials: 'include' });
      return res.json();
    },
  });

  const { data: statusBreakdown } = useQuery({
    queryKey: ['admin-status-breakdown'],
    queryFn: async () => {
      const res = await fetch('/api/admin/analytics/status-breakdown', { credentials: 'include' });
      return res.json();
    },
  });

  const { data: countryBreakdown } = useQuery({
    queryKey: ['admin-country-breakdown'],
    queryFn: async () => {
      const res = await fetch('/api/admin/analytics/country-breakdown', { credentials: 'include' });
      return res.json();
    },
  });

  const STATUS_META: Record<string, { label: string; color: string }> = {
    confirmed:  { label: 'Yeni Sipariş',  color: '#f97316' },
    pending:    { label: 'Beklemede',     color: '#f59e0b' },
    processing: { label: 'İşleniyor',    color: '#3b82f6' },
    shipped:    { label: 'Kargoda',      color: '#a855f7' },
    completed:  { label: 'Tamamlandı',   color: '#10b981' },
    cancelled:  { label: 'İptal',        color: '#ef4444' },
  };

  const totalOrders = (statusBreakdown || []).reduce((s: number, r: any) => s + r.count, 0);
  const maxBestRevenue = bestSellers?.length > 0 ? Math.max(...bestSellers.map((b: any) => b.revenue)) : 1;
  const maxSalesRev = salesData?.revenue?.length > 0 ? Math.max(...salesData.revenue, 1) : 1;
  const chartHeight = 180;

  const KpiCard = ({ icon: Icon, iconClass, label, value, sub, change, loading }: {
    icon: any; iconClass: string; label: string; value: string; sub?: string; change?: number; loading?: boolean;
  }) => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${change >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      {loading ? (
        <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      )}
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign} iconClass="bg-emerald-500/10 text-emerald-400"
          label="Bu ay gelir" sub={kpi ? `Geçen ay: ${fmtPrice(kpi.lastMonth?.revenue || 0)}` : undefined}
          value={kpi ? fmtPrice(kpi.thisMonth?.revenue || 0) : '—'}
          change={kpi?.changes?.revenue}
          loading={kpiLoading}
        />
        <KpiCard
          icon={ShoppingBag} iconClass="bg-blue-500/10 text-blue-400"
          label="Bu ay sipariş" sub={kpi ? `Geçen ay: ${kpi.lastMonth?.orders || 0} sipariş` : undefined}
          value={kpi ? fmt(kpi.thisMonth?.orders || 0) : '—'}
          change={kpi?.changes?.orders}
          loading={kpiLoading}
        />
        <KpiCard
          icon={TrendingUp} iconClass="bg-purple-500/10 text-purple-400"
          label="Ortalama sepet" sub={kpi ? `Geçen ay: ${fmtPrice(kpi.lastMonth?.avgOrder || 0)}` : undefined}
          value={kpi ? fmtPrice(kpi.thisMonth?.avgOrder || 0) : '—'}
          change={kpi?.changes?.avgOrder}
          loading={kpiLoading}
        />
        <KpiCard
          icon={UserPlus} iconClass="bg-orange-500/10 text-orange-400"
          label="Yeni müşteri" sub={kpi ? `İptal oranı: %${(kpi.thisMonth?.cancelRate || 0).toFixed(1)}` : undefined}
          value={kpi ? fmt(kpi.thisMonth?.newCustomers || 0) : '—'}
          loading={kpiLoading}
        />
      </div>

      {/* Sales Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-white">Satış Grafiği</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Gelir ve sipariş dağılımı</p>
          </div>
          <div className="flex bg-zinc-800 rounded-lg p-0.5 gap-0.5">
            {(['day', 'week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${period === p ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'}`}
              >
                {p === 'day' ? '24 Saat' : p === 'week' ? 'Hafta' : p === 'month' ? '30 Gün' : 'Yıl'}
              </button>
            ))}
          </div>
        </div>

        {salesLoading ? (
          <div className="flex items-center justify-center" style={{ height: chartHeight + 40 }}>
            <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
          </div>
        ) : salesData?.labels?.length > 0 ? (
          <div>
            <div className="relative" style={{ height: chartHeight }}>
              {[0, 25, 50, 75, 100].map(pct => (
                <div key={pct} className="absolute w-full border-t border-zinc-800/60" style={{ bottom: `${pct}%` }}>
                  {pct > 0 && (
                    <span className="absolute right-0 -translate-y-1/2 text-[10px] text-zinc-600 pr-1 select-none">
                      {fmtPrice((maxSalesRev * pct) / 100)}
                    </span>
                  )}
                </div>
              ))}
              <div className="absolute inset-0 flex items-end gap-1 pr-14">
                {salesData.revenue.map((rev: number, i: number) => {
                  const h = maxSalesRev > 0 ? Math.max((rev / maxSalesRev) * 100, rev > 0 ? 2 : 0) : 0;
                  const isLast = i === salesData.revenue.length - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end group relative" style={{ height: '100%' }}>
                      <div
                        className={`w-full rounded-t-md transition-all duration-300 cursor-default ${isLast ? 'bg-white' : 'bg-zinc-700 group-hover:bg-zinc-500'}`}
                        style={{ height: `${h}%`, minHeight: rev > 0 ? '4px' : '0' }}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl z-20 pointer-events-none whitespace-nowrap">
                          <span className="text-white text-xs font-semibold">{fmtPrice(rev)}</span>
                          <span className="text-zinc-400 text-[10px]">{salesData.orders?.[i] || 0} sipariş</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-1 mt-2 pr-14">
              {salesData.labels.map((label: string, i: number) => (
                <div key={i} className="flex-1 text-center">
                  <span className="text-[9px] text-zinc-600 block truncate">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-zinc-800">
              <div>
                <p className="text-xs text-zinc-500">Toplam Gelir</p>
                <p className="text-sm font-semibold text-white">{fmtPrice(salesData.revenue.reduce((a: number, b: number) => a + b, 0))}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Toplam Sipariş</p>
                <p className="text-sm font-semibold text-white">{fmt(salesData.orders?.reduce((a: number, b: number) => a + b, 0) || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Ort. Sipariş Değeri</p>
                <p className="text-sm font-semibold text-white">
                  {(salesData.orders?.reduce((a: number, b: number) => a + b, 0) || 0) > 0
                    ? fmtPrice(salesData.revenue.reduce((a: number, b: number) => a + b, 0) / salesData.orders.reduce((a: number, b: number) => a + b, 0))
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center text-zinc-500 text-sm" style={{ height: chartHeight }}>
            Bu dönem için veri bulunamadı
          </div>
        )}
      </div>

      {/* Best sellers + Status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Best sellers */}
        <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <div>
              <h3 className="text-sm font-semibold text-white">En Çok Satan Ürünler</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Tüm zamanlar, satış adedine göre</p>
            </div>
            <Award className="w-4 h-4 text-yellow-500" />
          </div>
          <div className="divide-y divide-zinc-800/60">
            {bestSellersLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-600" /></div>
            ) : bestSellers?.filter((b: any) => b.totalSold > 0).length > 0 ? (
              bestSellers.filter((b: any) => b.totalSold > 0).map((item: any, index: number) => {
                const barPct = maxBestRevenue > 0 ? (item.revenue / maxBestRevenue) * 100 : 0;
                const rankColors = ['text-yellow-400', 'text-zinc-300', 'text-amber-600'];
                return (
                  <div key={item.product.id} className="flex items-center gap-3 px-6 py-3 hover:bg-zinc-800/40 transition-colors">
                    <span className={`w-5 text-xs font-bold text-center flex-shrink-0 ${rankColors[index] || 'text-zinc-600'}`}>
                      {index + 1}
                    </span>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                      {item.product.images?.[0]
                        ? <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-zinc-600" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.product.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-zinc-800 rounded-full h-1">
                          <div className="bg-white h-1 rounded-full transition-all" style={{ width: `${barPct}%` }} />
                        </div>
                        <span className="text-[10px] text-zinc-500 whitespace-nowrap">{item.totalSold} adet</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-white">{fmtPrice(item.revenue)}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-zinc-500 text-sm">Henüz satış verisi yok</div>
            )}
          </div>
        </div>

        {/* Status breakdown */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <div>
              <h3 className="text-sm font-semibold text-white">Sipariş Dağılımı</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Duruma göre tüm zamanlar</p>
            </div>
            <BarChart3 className="w-4 h-4 text-zinc-500" />
          </div>

          {statusBreakdown?.length > 0 && (
            <div className="flex justify-center py-6">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {(() => {
                    let offset = 0;
                    return (statusBreakdown || []).map((r: any) => {
                      const pct = totalOrders > 0 ? (r.count / totalOrders) * 100 : 0;
                      const color = STATUS_META[r.status]?.color || '#71717a';
                      const el = (
                        <circle
                          key={r.status}
                          cx="50" cy="50" r="15.9"
                          fill="none"
                          stroke={color}
                          strokeWidth="31.8"
                          strokeDasharray={`${pct} ${100 - pct}`}
                          strokeDashoffset={-offset}
                        />
                      );
                      offset += pct;
                      return el;
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-xl font-bold text-white">{totalOrders}</p>
                  <p className="text-[10px] text-zinc-500">sipariş</p>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 pb-4 space-y-2.5">
            {(statusBreakdown || []).map((r: any) => {
              const meta = STATUS_META[r.status] || { label: r.status, color: '#71717a' };
              const pct = totalOrders > 0 ? (r.count / totalOrders) * 100 : 0;
              return (
                <div key={r.status} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
                  <span className="text-xs text-zinc-400 flex-1">{meta.label}</span>
                  <span className="text-xs font-semibold text-white">{r.count}</span>
                  <span className="text-[10px] text-zinc-600 w-8 text-right">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Country breakdown */}
      {countryBreakdown?.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <div>
              <h3 className="text-sm font-semibold text-white">Ülke Bazında Gelir</h3>
              <p className="text-xs text-zinc-500 mt-0.5">İptal edilen siparişler hariç</p>
            </div>
            <Globe className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-6 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Ülke</th>
                  <th className="text-right px-6 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Sipariş</th>
                  <th className="text-right px-6 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Gelir</th>
                  <th className="text-right px-6 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {countryBreakdown.map((row: any) => {
                  const totalRevenue = countryBreakdown.reduce((s: number, r: any) => s + r.revenue, 0);
                  const share = totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0;
                  return (
                    <tr key={row.country} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <Globe className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                          <span className="text-sm text-white">{row.country}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right text-sm text-zinc-300">{row.count}</td>
                      <td className="px-6 py-3 text-right text-sm font-semibold text-white">{fmtPrice(row.revenue)}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-zinc-800 rounded-full h-1">
                            <div className="bg-zinc-400 h-1 rounded-full" style={{ width: `${share}%` }} />
                          </div>
                          <span className="text-xs text-zinc-500 w-8 text-right">{share.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


function InventoryPanel() {
  const queryClient = useQueryClient();
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [selectedVariants, setSelectedVariants] = useState<{ id: string; stock: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { data: allVariants = [], isLoading: variantsLoading } = useQuery({
    queryKey: ['admin-inventory'],
    queryFn: async () => {
      const res = await fetch('/api/admin/inventory', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch inventory');
      return res.json();
    },
  });

  const { data: lowStockVariants = [], isLoading: lowStockLoading } = useQuery({
    queryKey: ['admin-low-stock', lowStockThreshold],
    queryFn: async () => {
      const res = await fetch(`/api/admin/inventory/low-stock?threshold=${lowStockThreshold}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch low stock');
      return res.json();
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: { variantId: string; stock: number; reason?: string }[]) => {
      const res = await fetch('/api/admin/inventory/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error('Failed to update stock');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-low-stock'] });
      setSelectedVariants([]);
    },
  });

  const handleStockChange = (variantId: string, newStock: number) => {
    setSelectedVariants(prev => {
      const existing = prev.find(v => v.id === variantId);
      if (existing) {
        return prev.map(v => v.id === variantId ? { ...v, stock: newStock } : v);
      }
      return [...prev, { id: variantId, stock: newStock }];
    });
  };

  const applyBulkUpdate = () => {
    if (selectedVariants.length === 0) return;
    bulkUpdateMutation.mutate(selectedVariants.map(v => ({
      variantId: v.id,
      stock: v.stock,
      reason: 'Admin panel toplu güncelleme',
    })));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <Warehouse className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-sm text-zinc-400">Toplam Varyant</p>
              <p className="text-2xl font-bold text-white">{allVariants.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-sm text-zinc-400">Düşük Stok</p>
              <p className="text-2xl font-bold text-yellow-400">{lowStockVariants.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-sm text-zinc-400">Toplam Stok</p>
              <p className="text-2xl font-bold text-white">
                {allVariants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {lowStockVariants.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-400">Düşük Stok Uyarısı</h3>
              <p className="text-sm text-zinc-400 mt-1">
                {lowStockVariants.length} varyantın stoğu {lowStockThreshold} adetten az.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {lowStockVariants.slice(0, 5).map((v: any) => (
                  <span key={v.id} className="px-3 py-1 bg-zinc-800 rounded-lg text-sm text-white">
                    {v.product?.name} - {v.size} ({v.stock} adet)
                  </span>
                ))}
                {lowStockVariants.length > 5 && (
                  <span className="px-3 py-1 bg-zinc-700 rounded-lg text-sm text-zinc-400">
                    +{lowStockVariants.length - 5} daha
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-3 md:mb-0">Stok Yönetimi</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/admin/inventory/fix-variants', {
                    method: 'POST',
                    credentials: 'include',
                  });
                  const data = await res.json();
                  if (data.success) {
                    alert(data.message);
                    queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
                  } else {
                    alert('Hata: ' + (data.error || 'Bilinmeyen hata'));
                  }
                } catch (error) {
                  alert('Varyant kontrolü başarısız');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
              data-testid="button-fix-variants"
            >
              <Search className="w-4 h-4" />
              Eksik Varyantları Kontrol Et
            </button>
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
                queryClient.invalidateQueries({ queryKey: ['admin-low-stock'] });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors border border-zinc-700"
              data-testid="button-refresh-inventory"
            >
              <RefreshCw className="w-4 h-4" />
              Yenile
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Ürün ara..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 w-64"
                data-testid="input-inventory-search"
              />
            </div>
            {selectedVariants.length > 0 && (
              <button
                onClick={applyBulkUpdate}
                disabled={bulkUpdateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {bulkUpdateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {selectedVariants.length} Değişikliği Kaydet
              </button>
            )}
          </div>
        </div>

        {variantsLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : (() => {
          const filteredVariants = allVariants.filter((v: any) =>
            v.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.size?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.color?.toLowerCase().includes(searchQuery.toLowerCase())
          );
          const totalPages = Math.ceil(filteredVariants.length / itemsPerPage);
          const paginatedVariants = filteredVariants.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
          );

          return filteredVariants.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Ürün</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Beden</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Renk</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Fiyat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {paginatedVariants.map((v: any) => {
                      const pendingChange = selectedVariants.find(sv => sv.id === v.id);
                      const currentStock = pendingChange?.stock ?? v.stock;
                      return (
                        <tr key={v.id} className={pendingChange ? 'bg-blue-500/5' : ''}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800">
                                {v.product?.images?.[0] && (
                                  <img src={v.product.images[0]} alt="" className="w-full h-full object-cover" />
                                )}
                              </div>
                              <span className="text-sm text-white">{v.product?.name || 'Bilinmeyen'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-400">{v.size || '-'}</td>
                          <td className="px-6 py-4 text-sm text-zinc-400">{v.color || '-'}</td>
                          <td className="px-6 py-4 text-sm text-white">{v.product?.basePrice || v.price} TL</td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              value={currentStock}
                              onChange={(e) => handleStockChange(v.id, parseInt(e.target.value) || 0)}
                              className={`w-20 px-2 py-1 rounded-lg text-sm ${
                                currentStock <= lowStockThreshold
                                  ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                                  : 'bg-zinc-800 border-zinc-700 text-white'
                              } border`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
                  <p className="text-sm text-zinc-400">
                    {filteredVariants.length} sonuçtan {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredVariants.length)} arası gösteriliyor
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Önceki
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 text-sm rounded-lg ${
                              currentPage === pageNum
                                ? 'bg-white text-black'
                                : 'bg-zinc-800 text-white hover:bg-zinc-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-zinc-500">
              {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz ürün varyantı yok'}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function DatabasePanel() {
  const queryClient = useQueryClient();
  const [confirmCode, setConfirmCode] = useState('');
  const [clearingTable, setClearingTable] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearAllCode, setClearAllCode] = useState('');

  const { data: dbStats, isLoading, refetch } = useQuery<{
    orders: number;
    cartItems: number;
    pendingPayments: number;
    reviews: number;
    couponUsage: number;
  }>({
    queryKey: ['/api/admin/database/stats'],
  });

  const tables = [
    { id: 'orders', name: 'Siparişler', description: 'Tüm siparişler ve sipariş kalemleri', count: dbStats?.orders || 0, icon: ShoppingCart },
    { id: 'cart_items', name: 'Sepet Öğeleri', description: 'Tüm kullanıcıların sepetlerindeki ürünler', count: dbStats?.cartItems || 0, icon: Package },
    { id: 'pending_payments', name: 'Bekleyen Ödemeler', description: 'PayTR ödeme kayıtları', count: dbStats?.pendingPayments || 0, icon: Clock },
    { id: 'reviews', name: 'Yorumlar', description: 'Ürün değerlendirmeleri', count: dbStats?.reviews || 0, icon: MessageSquare },
    { id: 'coupon_usage', name: 'Kupon Kullanımları', description: 'Kupon kullanım geçmişi ve sayaçları', count: dbStats?.couponUsage || 0, icon: Tag },
  ];

  const handleClearTable = async (tableId: string) => {
    if (confirmCode !== 'SIFIRLA') {
      setMessage({ type: 'error', text: "Onay kodu hatalı. 'SIFIRLA' yazmalısınız." });
      return;
    }

    setClearingTable(tableId);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/database/clear/${tableId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmCode }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Hata oluştu');
      }

      setMessage({ type: 'success', text: `${data.deletedCount} kayıt silindi.` });
      setConfirmCode('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Silme işlemi başarısız' });
    } finally {
      setClearingTable(null);
    }
  };

  const handleClearAllSales = async () => {
    if (clearAllCode !== 'TUM_SATISLARI_SIL') {
      setMessage({ type: 'error', text: "Onay kodu hatalı. 'TUM_SATISLARI_SIL' yazmalısınız." });
      return;
    }

    setClearingTable('all');
    setMessage(null);

    try {
      const res = await fetch('/api/admin/database/clear-all-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmCode: clearAllCode }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Hata oluştu');
      }

      setMessage({ type: 'success', text: 'Tüm satış verileri silindi.' });
      setClearAllCode('');
      setShowClearAllModal(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Silme işlemi başarısız' });
    } finally {
      setClearingTable(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Veritabanı Yönetimi</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Sipariş, sepet ve ciro verilerini sıfırlayın. Kullanıcılar, ürünler ve stoklar korunur.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          Dikkat
        </h3>
        <p className="text-sm text-zinc-400 mb-4">
          Bu işlemler geri alınamaz. Silinen veriler kalıcı olarak kaybolur. İşlem yapmadan önce onay kodu girmeniz gerekir.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs text-zinc-500 mb-1">Onay Kodu</label>
            <input
              type="text"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
              placeholder="SIFIRLA yazın"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {tables.map((table) => (
          <div key={table.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center">
                <table.icon className="w-6 h-6 text-zinc-400" />
              </div>
              <div>
                <h4 className="font-medium text-white">{table.name}</h4>
                <p className="text-sm text-zinc-400">{table.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-2xl font-bold text-white">{table.count.toLocaleString('tr-TR')}</span>
                <p className="text-xs text-zinc-500">kayıt</p>
              </div>
              <button
                onClick={() => handleClearTable(table.id)}
                disabled={clearingTable !== null || table.count === 0}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {clearingTable === table.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Sıfırla
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Tüm Satış Verilerini Sil
            </h3>
            <p className="text-sm text-zinc-400 mt-1">
              Siparişler, sepetler, bekleyen ödemeler ve kupon kullanımları tek seferde silinir.
            </p>
          </div>
          <button
            onClick={() => setShowClearAllModal(true)}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Tümünü Sil
          </button>
        </div>
      </div>

      {/* Clear All Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                Tüm Satış Verilerini Sil
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-400">
                Bu işlem aşağıdaki verileri kalıcı olarak silecek:
              </p>
              <ul className="text-sm text-zinc-400 list-disc list-inside space-y-1">
                <li>Tüm siparişler ve sipariş kalemleri</li>
                <li>Tüm sepet öğeleri</li>
                <li>Tüm bekleyen ödemeler</li>
                <li>Tüm kupon kullanım kayıtları</li>
              </ul>
              <div className="pt-4">
                <label className="block text-sm text-zinc-400 mb-2">
                  Onaylamak için <span className="text-red-400 font-mono">TUM_SATISLARI_SIL</span> yazın:
                </label>
                <input
                  type="text"
                  value={clearAllCode}
                  onChange={(e) => setClearAllCode(e.target.value.toUpperCase())}
                  placeholder="TUM_SATISLARI_SIL"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 font-mono"
                />
              </div>
            </div>
            <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowClearAllModal(false);
                  setClearAllCode('');
                }}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleClearAllSales}
                disabled={clearingTable !== null || clearAllCode !== 'TUM_SATISLARI_SIL'}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {clearingTable === 'all' && <Loader2 className="w-4 h-4 animate-spin" />}
                Tümünü Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsPanel() {
  const [settings, setSettings] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_secure: 'false',
    admin_email: '',
    site_url: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: savedSettings, isLoading } = useQuery<{
    smtp_host?: string;
    smtp_port?: string;
    smtp_user?: string;
    smtp_pass?: string;
    smtp_secure?: string;
    admin_email?: string;
    site_url?: string;
  }>({
    queryKey: ['/api/admin/settings'],
  });

  useEffect(() => {
    if (savedSettings) {
      setSettings(prev => ({
        ...prev,
        ...savedSettings,
      }));
      if (savedSettings.admin_email) {
        setTestEmail(savedSettings.admin_email);
      }
    }
  }, [savedSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        credentials: 'include',
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Ayarlar kaydedildi!' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Ayarlar kaydedilemedi' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Bir hata oluştu' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) return;
    setIsTesting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Test e-postası gönderildi!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Test e-postası gönderilemedi' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Bir hata oluştu' });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Ayarlar</h2>
        <p className="text-zinc-400">E-posta ve sistem ayarlarını yönetin</p>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-zinc-800 rounded-lg">
            <Server className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">SMTP Ayarları</h3>
            <p className="text-sm text-zinc-400">E-posta gönderimi için SMTP sunucu yapılandırması</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">SMTP Sunucu</label>
            <input
              type="text"
              value={settings.smtp_host}
              onChange={(e) => setSettings(s => ({ ...s, smtp_host: e.target.value }))}
              placeholder="mail.example.com"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-white transition-colors"
              data-testid="input-smtp-host"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Port</label>
            <input
              type="text"
              value={settings.smtp_port}
              onChange={(e) => setSettings(s => ({ ...s, smtp_port: e.target.value }))}
              placeholder="587"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-white transition-colors"
              data-testid="input-smtp-port"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Kullanıcı Adı (E-posta)</label>
            <input
              type="text"
              value={settings.smtp_user}
              onChange={(e) => setSettings(s => ({ ...s, smtp_user: e.target.value }))}
              placeholder="no-reply@example.com"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-white transition-colors"
              data-testid="input-smtp-user"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Şifre</label>
            <input
              type="password"
              value={settings.smtp_pass}
              onChange={(e) => setSettings(s => ({ ...s, smtp_pass: e.target.value }))}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-white transition-colors"
              data-testid="input-smtp-pass"
            />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.smtp_secure === 'true'}
                onChange={(e) => setSettings(s => ({ ...s, smtp_secure: e.target.checked ? 'true' : 'false' }))}
                className="w-5 h-5 rounded bg-zinc-800 border-zinc-700"
              />
              <span className="text-sm text-white">SSL/TLS Kullan (Port 465 için)</span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-zinc-800 rounded-lg">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Bildirim Ayarları</h3>
            <p className="text-sm text-zinc-400">Sipariş bildirimleri için admin e-posta adresi</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Admin E-posta</label>
            <input
              type="email"
              value={settings.admin_email}
              onChange={(e) => setSettings(s => ({ ...s, admin_email: e.target.value }))}
              placeholder="admin@example.com"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-white transition-colors"
              data-testid="input-admin-email"
            />
            <p className="text-xs text-zinc-500 mt-1">Yeni sipariş bildirimleri bu adrese gönderilir</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Site URL</label>
            <input
              type="text"
              value={settings.site_url}
              onChange={(e) => setSettings(s => ({ ...s, site_url: e.target.value }))}
              placeholder="https://polenstone.com.tr"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-white transition-colors"
              data-testid="input-site-url"
            />
            <p className="text-xs text-zinc-500 mt-1">E-postalardaki bağlantılar için kullanılır</p>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-zinc-800 rounded-lg">
            <Send className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Test E-postası</h3>
            <p className="text-sm text-zinc-400">SMTP ayarlarınızı test edin</p>
          </div>
        </div>

        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@example.com"
            className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-white transition-colors"
            data-testid="input-test-email"
          />
          <button
            onClick={handleTestEmail}
            disabled={isTesting || !testEmail}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
            data-testid="button-send-test"
          >
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Test Gönder
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 font-medium"
          data-testid="button-save-settings"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Ayarları Kaydet
        </button>
      </div>
    </div>
  );
}

function AIDescriptionsPanel({ products, categories }: { products: Product[], categories: Category[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [descriptionMode, setDescriptionMode] = useState<'empty' | 'overwrite'>('empty');
  const [selectedStyle, setSelectedStyle] = useState<string>('energetic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [results, setResults] = useState<Array<{ name: string; success: boolean; message: string }>>([]);
  const queryClient = useQueryClient();

  const styles = [
    { value: 'professional', label: 'Profesyonel' },
    { value: 'energetic', label: 'Enerjik' },
    { value: 'minimal', label: 'Minimal' },
    { value: 'luxury', label: 'Lüks' },
    { value: 'natural', label: 'Doğal' },
  ];

  const filteredProducts = products.filter(p => {
    const categoryMatch = selectedCategory === 'all' || 
      p.categoryId === selectedCategory || 
      (p.categoryIds && p.categoryIds.includes(selectedCategory));
    if (descriptionMode === 'empty') {
      return categoryMatch && (!p.description || p.description.trim() === '');
    }
    return categoryMatch;
  });

  const generateDescriptions = async () => {
    if (filteredProducts.length === 0) return;
    
    setIsGenerating(true);
    setProgress({ current: 0, total: filteredProducts.length, success: 0, failed: 0 });
    setResults([]);
    
    let successCount = 0;
    let failedCount = 0;
    const newResults: Array<{ name: string; success: boolean; message: string }> = [];

    for (let i = 0; i < filteredProducts.length; i++) {
      const product = filteredProducts[i];
      setProgress(prev => ({ ...prev, current: i + 1 }));
      
      try {
        const response = await fetch(`/api/admin/products/${product.id}/generate-description`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ style: selectedStyle }),
        });
        
        if (response.ok) {
          successCount++;
          newResults.push({ name: product.name, success: true, message: 'Açıklama oluşturuldu' });
        } else {
          failedCount++;
          newResults.push({ name: product.name, success: false, message: 'Hata oluştu' });
        }
      } catch (error) {
        failedCount++;
        newResults.push({ name: product.name, success: false, message: 'Bağlantı hatası' });
      }
      
      setProgress(prev => ({ ...prev, success: successCount, failed: failedCount }));
      setResults([...newResults]);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsGenerating(false);
    queryClient.invalidateQueries({ queryKey: ['/api/products'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-amber-500" />
            AI Ürün Açıklamaları
          </h2>
          <p className="text-zinc-400 mt-1">Yapay zeka ile toplu ürün açıklaması oluşturun</p>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Kategori</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
              disabled={isGenerating}
            >
              <option value="all">Tüm Kategoriler</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Açıklama Modu</label>
            <div className="flex gap-2">
              <label className={`flex-1 p-3 rounded-lg border cursor-pointer transition-colors ${
                descriptionMode === 'empty' 
                  ? 'bg-amber-600/20 border-amber-600 text-amber-400' 
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}>
                <input
                  type="radio"
                  name="mode"
                  value="empty"
                  checked={descriptionMode === 'empty'}
                  onChange={() => setDescriptionMode('empty')}
                  className="sr-only"
                  disabled={isGenerating}
                />
                <span className="text-sm">Sadece Boşlar</span>
              </label>
              <label className={`flex-1 p-3 rounded-lg border cursor-pointer transition-colors ${
                descriptionMode === 'overwrite' 
                  ? 'bg-amber-600/20 border-amber-600 text-amber-400' 
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}>
                <input
                  type="radio"
                  name="mode"
                  value="overwrite"
                  checked={descriptionMode === 'overwrite'}
                  onChange={() => setDescriptionMode('overwrite')}
                  className="sr-only"
                  disabled={isGenerating}
                />
                <span className="text-sm">Üzerine Yaz</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Yazım Stili</label>
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
              disabled={isGenerating}
            >
              {styles.map(style => (
                <option key={style.value} value={style.value}>{style.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-zinc-400">
            {filteredProducts.length} ürün seçildi
          </p>
          <button
            onClick={generateDescriptions}
            disabled={isGenerating || filteredProducts.length === 0}
            className="px-6 py-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                İşleniyor... ({progress.current}/{progress.total})
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Açıklamaları Oluştur
              </>
            )}
          </button>
        </div>

        {isGenerating && (
          <div className="mt-6">
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-emerald-400">{progress.success} başarılı</span>
              <span className="text-red-400">{progress.failed} başarısız</span>
            </div>
          </div>
        )}

        {results.length > 0 && !isGenerating && (
          <div className="mt-6 max-h-64 overflow-y-auto space-y-2">
            {results.map((result, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-lg flex items-center gap-3 ${
                  result.success ? 'bg-emerald-500/10' : 'bg-red-500/10'
                }`}
              >
                {result.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                )}
                <span className="text-white text-sm truncate">{result.name}</span>
                <span className={`text-xs ml-auto ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface MenuManagementPanelProps {
  categories: Category[];
}

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
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

function MenuManagementPanel({ categories }: MenuManagementPanelProps) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'category' as 'category' | 'link' | 'submenu',
    categoryId: '',
    url: '',
    parentId: '',
    isActive: true,
    openInNewTab: false,
  });

  const { data: menuItems = [], isLoading } = useQuery<MenuItemData[]>({
    queryKey: ['admin', 'menu-items'],
    queryFn: async () => {
      const res = await fetch('/api/admin/menu-items', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch menu items');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/admin/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          categoryId: data.categoryId || null,
          url: data.url || null,
          parentId: data.parentId || null,
          displayOrder: menuItems.length,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create menu item');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu-items'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const res = await fetch(`/api/admin/menu-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          categoryId: data.categoryId || null,
          url: data.url || null,
          parentId: data.parentId || null,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update menu item');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu-items'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/menu-items/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete menu item');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu-items'] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (items: { id: string; displayOrder: number }[]) => {
      const res = await fetch('/api/admin/menu-items/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error('Failed to reorder menu items');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu-items'] });
    },
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({
      title: '',
      type: 'category',
      categoryId: '',
      url: '',
      parentId: '',
      isActive: true,
      openInNewTab: false,
    });
  };

  const openEditModal = (item: MenuItemData) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      type: item.type,
      categoryId: item.categoryId || '',
      url: item.url || '',
      parentId: item.parentId || '',
      isActive: item.isActive,
      openInNewTab: item.openInNewTab,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const rootItems = menuItems.filter(item => !item.parentId);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= rootItems.length) return;

    const reorderedItems = [...rootItems];
    [reorderedItems[index], reorderedItems[newIndex]] = [reorderedItems[newIndex], reorderedItems[index]];

    const updates = reorderedItems.map((item, idx) => ({
      id: item.id,
      displayOrder: idx,
    }));

    reorderMutation.mutate(updates);
  };

  const rootItems = menuItems.filter(item => !item.parentId);
  const submenuParents = menuItems.filter(item => item.type === 'submenu' && !item.parentId);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'category': return 'Kategori';
      case 'link': return 'Link';
      case 'submenu': return 'Alt Menü';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Menü Yönetimi</h2>
          <p className="text-zinc-400 text-sm mt-1">Sitenin ana navigasyon menüsünü düzenleyin</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
          data-testid="button-add-menu-item"
        >
          <Plus className="w-5 h-5" />
          Yeni Öğe Ekle
        </button>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        {rootItems.length === 0 ? (
          <div className="text-center py-12">
            <Menu className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">Henüz menü öğesi eklenmemiş</p>
            <p className="text-zinc-500 text-sm mt-1">Yeni öğe ekleyerek menünüzü oluşturmaya başlayın</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {rootItems.map((item, index) => {
              const children = menuItems.filter(child => child.parentId === item.id);
              return (
                <div key={item.id}>
                  <div className="flex items-center gap-4 p-4 hover:bg-zinc-800/50">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveItem(index, 'up')}
                        disabled={index === 0 || reorderMutation.isPending}
                        className="p-1 hover:bg-zinc-700 rounded disabled:opacity-30"
                        data-testid={`button-move-up-${item.id}`}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveItem(index, 'down')}
                        disabled={index === rootItems.length - 1 || reorderMutation.isPending}
                        className="p-1 hover:bg-zinc-700 rounded disabled:opacity-30"
                        data-testid={`button-move-down-${item.id}`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{item.title}</span>
                        {!item.isActive && (
                          <span className="px-2 py-0.5 bg-zinc-700 text-zinc-400 text-xs rounded">Pasif</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500">
                        <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs">{getTypeLabel(item.type)}</span>
                        {item.type === 'category' && item.category && (
                          <span>→ {item.category.name}</span>
                        )}
                        {item.type === 'link' && item.url && (
                          <span className="truncate">→ {item.url}</span>
                        )}
                        {item.type === 'submenu' && (
                          <span>({children.length} alt öğe)</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-2 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
                        data-testid={`button-edit-menu-${item.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Bu menü öğesini silmek istediğinize emin misiniz?')) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-2 hover:bg-red-900/50 rounded text-zinc-400 hover:text-red-400"
                        data-testid={`button-delete-menu-${item.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {children.length > 0 && (
                    <div className="ml-12 border-l border-zinc-700">
                      {children.map((child) => (
                        <div key={child.id} className="flex items-center gap-4 p-4 pl-6 hover:bg-zinc-800/30">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-300">{child.title}</span>
                              {!child.isActive && (
                                <span className="px-2 py-0.5 bg-zinc-700 text-zinc-400 text-xs rounded">Pasif</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500">
                              <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs">{getTypeLabel(child.type)}</span>
                              {child.type === 'category' && child.category && (
                                <span>→ {child.category.name}</span>
                              )}
                              {child.type === 'link' && child.url && (
                                <span className="truncate">→ {child.url}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(child)}
                              className="p-2 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
                              data-testid={`button-edit-submenu-${child.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Bu alt menü öğesini silmek istediğinize emin misiniz?')) {
                                  deleteMutation.mutate(child.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              className="p-2 hover:bg-red-900/50 rounded text-zinc-400 hover:text-red-400"
                              data-testid={`button-delete-submenu-${child.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h3 className="text-xl font-bold text-white">
                {editingItem ? 'Menü Öğesini Düzenle' : 'Yeni Menü Öğesi'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Başlık</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-white focus:ring-1 focus:ring-white"
                  placeholder="Menüde görünecek başlık"
                  data-testid="input-menu-title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Tür</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['category', 'link', 'submenu'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, type, categoryId: '', url: '' })}
                      className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                        formData.type === type
                          ? 'bg-white text-black'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                      data-testid={`button-type-${type}`}
                    >
                      {getTypeLabel(type)}
                    </button>
                  ))}
                </div>
              </div>

              {formData.type === 'category' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Kategori</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-white focus:ring-1 focus:ring-white"
                    data-testid="select-menu-category"
                  >
                    <option value="">Kategori seçin</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.type === 'link' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">URL</label>
                  <input
                    type="text"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-white focus:ring-1 focus:ring-white"
                    placeholder="https://example.com veya /sayfa"
                    data-testid="input-menu-url"
                  />
                </div>
              )}

              {formData.type === 'submenu' && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-400">
                    Alt Menü türü bir dropdown oluşturur. Bu öğeyi oluşturduktan sonra, diğer öğeleri bu alt menünün altına ekleyebilirsiniz.
                  </p>
                </div>
              )}

              {formData.type !== 'submenu' && submenuParents.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Üst Menü (Opsiyonel)</label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-white focus:ring-1 focus:ring-white"
                    data-testid="select-parent-menu"
                  >
                    <option value="">Ana menüde göster</option>
                    {submenuParents.filter(p => p.id !== editingItem?.id).map((parent) => (
                      <option key={parent.id} value={parent.id}>{parent.title}</option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500 mt-1">Bir alt menünün altında göstermek için seçin</p>
                </div>
              )}

              {formData.type !== 'submenu' && submenuParents.length === 0 && (
                <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                  <p className="text-sm text-zinc-400">
                    Alt menü öğesi eklemek için önce "Alt Menü" türünde bir öğe oluşturun.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 bg-zinc-700 border-zinc-600 rounded text-white focus:ring-white"
                    data-testid="checkbox-menu-active"
                  />
                  <span className="text-zinc-300">Aktif</span>
                </label>

                {formData.type === 'link' && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.openInNewTab}
                      onChange={(e) => setFormData({ ...formData, openInNewTab: e.target.checked })}
                      className="w-5 h-5 bg-zinc-700 border-zinc-600 rounded text-white focus:ring-white"
                      data-testid="checkbox-new-tab"
                    />
                    <span className="text-zinc-300">Yeni sekmede aç</span>
                  </label>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-800">
              <button
                onClick={closeModal}
                className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  createMutation.isPending || 
                  updateMutation.isPending || 
                  !formData.title ||
                  (formData.type === 'category' && !formData.categoryId) ||
                  (formData.type === 'link' && !formData.url)
                }
                className="px-6 py-2.5 bg-white text-black rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
                data-testid="button-save-menu-item"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {editingItem ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
