import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { useLocation, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Package, 
  MapPin, 
  Settings, 
  LogOut, 
  ChevronRight,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  X,
  Edit3,
  Save,
  Phone,
  Mail,
  Calendar,
  ShoppingBag,
  CreditCard,
  Loader2,
  Heart,
  Plus,
  Trash2,
  Home
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SEO } from '@/components/SEO';
import { formatTRDate, formatTRDateTime } from '@shared/dateFormat';
import { useFavorites } from '@/hooks/useFavorites';
import { ProductCard } from '@/components/ProductCard';
import { COUNTRIES } from '@/lib/countries';

type TabType = 'orders' | 'profile' | 'addresses' | 'favorites';

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
  subtotal: string;
  shippingCost: string;
  total: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingCarrier?: string;
  items?: OrderItem[];
}

interface OrderItem {
  id: string;
  productName: string;
  variantDetails: string;
  price: string;
  quantity: number;
  subtotal: string;
}

interface UserAddress {
  id: string;
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  pending: { label: 'Beklemede', color: 'text-black/55', icon: Clock, bg: 'bg-black/[0.04] border border-black/8' },
  processing: { label: 'İşleniyor', color: 'text-polen-orange', icon: Package, bg: 'bg-polen-orange/10 border border-polen-orange/30' },
  shipped: { label: 'Kargoda', color: 'text-polen-orange', icon: Truck, bg: 'bg-polen-orange/15 border border-polen-orange/40' },
  delivered: { label: 'Teslim Edildi', color: 'text-white', icon: CheckCircle2, bg: 'bg-black border border-black' },
  completed: { label: 'Tamamlandı', color: 'text-white', icon: CheckCircle2, bg: 'bg-black border border-black' },
  cancelled: { label: 'İptal Edildi', color: 'text-destructive', icon: XCircle, bg: 'bg-destructive/10 border border-destructive/30' },
};

export default function Profile() {
  const [location, navigate] = useLocation();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('orders');

  useEffect(() => {
    if (location === '/hesabim/siparislerim') {
      setActiveTab('orders');
    }
  }, [location]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders/my', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
    enabled: !!user,
  });

  const { data: favorites = [], isLoading: favoritesLoading } = useFavorites();

  const { data: orderDetail, isLoading: orderDetailLoading } = useQuery<Order>({
    queryKey: ['my-order', selectedOrder?.id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/my/${selectedOrder?.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch order');
      return res.json();
    },
    enabled: !!selectedOrder?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; phone: string }) => {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to update profile');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast({ title: 'Başarılı', description: 'Profil bilgileriniz güncellendi.' });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: 'Hata', description: 'Profil güncellenemedi.', variant: 'destructive' });
    },
  });

  const updateWhatsappOptInMutation = useMutation({
    mutationFn: async (whatsappOptIn: boolean) => {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappOptIn }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to update WhatsApp preference');
      return res.json();
    },
    onSuccess: (_data, whatsappOptIn) => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast({
        title: 'Tercih güncellendi',
        description: whatsappOptIn
          ? 'WhatsApp bildirimleri açıldı.'
          : 'WhatsApp bildirimleri kapatıldı.',
      });
    },
    onError: () => {
      toast({ title: 'Hata', description: 'Tercih güncellenemedi.', variant: 'destructive' });
    },
  });

  // Address management state
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    title: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    district: '',
    postalCode: '',
    country: 'Türkiye',
    isDefault: false,
  });

  const { data: addresses = [], isLoading: addressesLoading } = useQuery<UserAddress[]>({
    queryKey: ['user-addresses'],
    queryFn: async () => {
      const res = await fetch('/api/auth/addresses', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const createAddressMutation = useMutation({
    mutationFn: async (data: typeof addressForm) => {
      const res = await fetch('/api/auth/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to create address');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
      toast({ title: 'Başarılı', description: 'Adres eklendi.' });
      setShowAddressForm(false);
      resetAddressForm();
    },
    onError: () => {
      toast({ title: 'Hata', description: 'Adres eklenemedi.', variant: 'destructive' });
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof addressForm }) => {
      const res = await fetch(`/api/auth/addresses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to update address');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
      toast({ title: 'Başarılı', description: 'Adres güncellendi.' });
      setEditingAddress(null);
      setShowAddressForm(false);
      resetAddressForm();
    },
    onError: () => {
      toast({ title: 'Hata', description: 'Adres güncellenemedi.', variant: 'destructive' });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/auth/addresses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete address');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
      toast({ title: 'Başarılı', description: 'Adres silindi.' });
    },
    onError: () => {
      toast({ title: 'Hata', description: 'Adres silinemedi.', variant: 'destructive' });
    },
  });

  const resetAddressForm = () => {
    setAddressForm({
      title: '',
      firstName: '',
      lastName: '',
      phone: '',
      address: '',
      city: '',
      district: '',
      postalCode: '',
      country: 'Türkiye',
      isDefault: false,
    });
  };

  const handleEditAddress = (addr: UserAddress) => {
    setEditingAddress(addr);
    setAddressForm({
      title: addr.title,
      firstName: addr.firstName,
      lastName: addr.lastName,
      phone: addr.phone,
      address: addr.address,
      city: addr.city,
      district: addr.district,
      postalCode: addr.postalCode || '',
      country: addr.country || 'Türkiye',
      isDefault: addr.isDefault,
    });
    setShowAddressForm(true);
  };

  const handleSaveAddress = () => {
    if (editingAddress) {
      updateAddressMutation.mutate({ id: editingAddress.id, data: addressForm });
    } else {
      createAddressMutation.mutate(addressForm);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleEditProfile = () => {
    setProfileForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: (user as any)?.phone || '',
    });
    setIsEditing(true);
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileForm);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white">
        <SEO title="Hesabım" description="Sepetzen hesap bilgileriniz, siparişleriniz ve adresleriniz." url="/hesabim" noIndex />
        <Header />
        <main className="pt-20 lg:pt-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-black/30" />
        </main>
      </div>
    );
  }

  if (!user) {
    navigate('/giris');
    return null;
  }

  const tabs = [
    { id: 'orders' as TabType, label: 'Siparişlerim', icon: Package, count: orders.length },
    { id: 'favorites' as TabType, label: 'Favorilerim', icon: Heart, count: favorites.length },
    { id: 'profile' as TabType, label: 'Profil Bilgileri', icon: User },
    { id: 'addresses' as TabType, label: 'Adreslerim', icon: MapPin, count: addresses.length },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="pt-20 lg:pt-8 pb-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-4 mb-3">
                  <span className="text-[11px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums">01 / Üye Paneli</span>
                  <span className="h-px w-10 bg-polen-orange/40" />
                </div>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-[0.005em] text-black leading-[0.98]" data-testid="text-page-title">
                  HESABIM
                </h1>
                <p className="text-black/55 mt-3 text-sm">
                  Hoş geldin, <span className="text-black font-medium">{user.firstName || user.email.split('@')[0]}</span>
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-black/55 hover:text-black transition-colors"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Çıkış Yap</span>
              </button>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-1"
            >
              <div className="bg-white border border-black/8 rounded-none p-6 sticky top-28">
                <div className="flex flex-col items-center mb-7 pb-7 border-b border-black/8">
                  <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center text-white text-2xl font-bold mb-3">
                    {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="font-display text-base tracking-[0.04em] text-black">
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="text-[11px] tracking-[0.18em] uppercase text-black/45 mt-1">{user.email}</p>
                </div>

                <nav className="-mx-6">
                  {tabs.map((tab, idx) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`group w-full flex items-center justify-between gap-3 px-6 py-4 border-l-2 transition-all ${
                        activeTab === tab.id
                          ? 'border-polen-orange bg-polen-cream text-black'
                          : 'border-transparent text-black/55 hover:text-black hover:border-black/20 hover:bg-black/[0.02]'
                      }`}
                      data-testid={`tab-${tab.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-[10px] font-mono tracking-[0.32em] tabular-nums shrink-0 ${
                          activeTab === tab.id ? 'text-polen-orange' : 'text-black/30 group-hover:text-polen-orange/70'
                        }`}>
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <tab.icon className="w-4 h-4 shrink-0" />
                        <span className={`text-[13px] tracking-[0.04em] truncate ${activeTab === tab.id ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
                      </div>
                      {tab.count !== undefined && (
                        <span className={`text-[10px] font-mono tabular-nums tracking-wider px-2 py-0.5 ${
                          activeTab === tab.id ? 'bg-black text-white' : 'bg-black/[0.06] text-black/55'
                        }`}>
                          {String(tab.count).padStart(2, '0')}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-3"
            >
              <AnimatePresence mode="wait">
                {activeTab === 'orders' && (
                  <motion.div
                    key="orders"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-black">Siparişlerim</h2>
                      <p className="text-sm text-black/45">{orders.length} sipariş</p>
                    </div>

                    {ordersLoading ? (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-black/30" />
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="bg-white border border-black/8 rounded-2xl p-12 text-center">
                        <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-black/20" />
                        <h3 className="text-xl font-semibold text-black mb-2">Henüz siparişiniz yok</h3>
                        <p className="text-black/45 mb-6">Alışverişe başlayarak ilk siparişinizi oluşturun.</p>
                        <button
                          onClick={() => navigate('/')}
                          className="px-6 py-3 bg-black text-white rounded-none font-medium hover:bg-polen-orange transition-colors"
                          data-testid="button-start-shopping"
                        >
                          Alışverişe Başla
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {orders.map((order) => {
                          const status = statusConfig[order.status] || statusConfig.pending;
                          const StatusIcon = status.icon;
                          return (
                            <motion.div
                              key={order.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-white border border-black/8 rounded-2xl p-5 hover:border-black/12 transition-colors"
                              data-testid={`order-card-${order.id}`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="font-mono text-black font-semibold">
                                      #{order.orderNumber}
                                    </span>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                                      <StatusIcon className="w-3.5 h-3.5" />
                                      {status.label}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-4 text-sm text-black/45">
                                    <span className="flex items-center gap-1.5">
                                      <Calendar className="w-4 h-4" />
                                      {formatTRDate(order.createdAt)}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                      <CreditCard className="w-4 h-4" />
                                      {order.total}₺
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setSelectedOrder(order)}
                                  className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-sm font-medium text-black transition-colors"
                                  data-testid={`button-view-order-${order.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                  Detaylar
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'favorites' && (
                  <motion.div
                    key="favorites"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <h2 className="text-xl font-semibold text-black mb-6">Favorilerim</h2>
                    
                    {favoritesLoading ? (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-black/30" />
                      </div>
                    ) : favorites.length === 0 ? (
                      <div className="bg-white border border-black/8 rounded-2xl p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-100 flex items-center justify-center">
                          <Heart className="w-8 h-8 text-black/25" />
                        </div>
                        <h3 className="text-lg font-semibold text-black mb-2">Henüz favori ürününüz yok</h3>
                        <p className="text-black/45 mb-6">Beğendiğiniz ürünleri favorilere ekleyin, daha sonra kolayca bulun.</p>
                        <Link href="/">
                          <button className="px-6 py-3 bg-black text-white rounded-none font-medium hover:bg-polen-orange transition-colors">
                            Alışverişe Başla
                          </button>
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {favorites.map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'profile' && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-black">Profil Bilgileri</h2>
                      {!isEditing && (
                        <button
                          onClick={handleEditProfile}
                          className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-sm font-medium text-black transition-colors"
                          data-testid="button-edit-profile"
                        >
                          <Edit3 className="w-4 h-4" />
                          Düzenle
                        </button>
                      )}
                    </div>

                    <div className="bg-white border border-black/8 rounded-2xl p-6">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-black/55 mb-2">Ad</label>
                              <input
                                type="text"
                                value={profileForm.firstName}
                                onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                                className="w-full px-4 py-3 bg-stone-50 border border-black/12 rounded-none text-black placeholder:text-black/30 focus:outline-none focus:border-polen-orange transition-colors"
                                placeholder="Adınız"
                                data-testid="input-firstName"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-black/55 mb-2">Soyad</label>
                              <input
                                type="text"
                                value={profileForm.lastName}
                                onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                                className="w-full px-4 py-3 bg-stone-50 border border-black/12 rounded-none text-black placeholder:text-black/30 focus:outline-none focus:border-polen-orange transition-colors"
                                placeholder="Soyadınız"
                                data-testid="input-lastName"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-black/55 mb-2">Telefon</label>
                            <input
                              type="tel"
                              value={profileForm.phone}
                              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                              className="w-full px-4 py-3 bg-stone-50 border border-black/12 rounded-none text-black placeholder:text-black/30 focus:outline-none focus:border-polen-orange transition-colors"
                              placeholder="05XX XXX XX XX"
                              data-testid="input-phone"
                            />
                          </div>
                          <div className="flex gap-3 pt-4">
                            <button
                              onClick={() => setIsEditing(false)}
                              className="flex-1 px-4 py-3 border border-black/12 rounded-none text-black hover:bg-black/5 transition-colors"
                              data-testid="button-cancel-edit"
                            >
                              İptal
                            </button>
                            <button
                              onClick={handleSaveProfile}
                              disabled={updateProfileMutation.isPending}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-none font-medium hover:bg-polen-orange transition-colors disabled:opacity-50"
                              data-testid="button-save-profile"
                            >
                              {updateProfileMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              Kaydet
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="grid sm:grid-cols-2 gap-6">
                            <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-xl">
                              <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center">
                                <User className="w-6 h-6 text-black/55" />
                              </div>
                              <div>
                                <p className="text-xs text-black/45 uppercase tracking-wider">Ad Soyad</p>
                                <p className="text-black font-medium">
                                  {user.firstName} {user.lastName || '-'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-xl">
                              <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center">
                                <Mail className="w-6 h-6 text-black/55" />
                              </div>
                              <div>
                                <p className="text-xs text-black/45 uppercase tracking-wider">E-posta</p>
                                <p className="text-black font-medium">{user.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-xl">
                              <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center">
                                <Phone className="w-6 h-6 text-black/55" />
                              </div>
                              <div>
                                <p className="text-xs text-black/45 uppercase tracking-wider">Telefon</p>
                                <p className="text-black font-medium">{(user as any)?.phone || '-'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-xl">
                              <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-black/55" />
                              </div>
                              <div>
                                <p className="text-xs text-black/45 uppercase tracking-wider">Üyelik Tarihi</p>
                                <p className="text-black font-medium">
                                  {(user as any)?.createdAt 
                                    ? formatTRDate((user as any).createdAt)
                                    : '-'
                                  }
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="pt-6 mt-2 border-t border-black/8">
                            <h3 className="text-sm font-semibold text-black mb-3 tracking-[0.04em] uppercase">
                              İletişim Tercihleri
                            </h3>
                            <div className="flex items-start justify-between gap-4 p-4 bg-stone-50 rounded-xl">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center shrink-0">
                                  <Phone className="w-5 h-5 text-black/55" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-black font-medium" data-testid="text-whatsapp-pref-title">WhatsApp bildirimleri</p>
                                  <p className="text-xs text-black/55 mt-1">
                                    Sipariş alındı, hazırlanıyor, kargoya verildi ve teslim edildi
                                    bildirimlerini WhatsApp ile gönderelim mi? KVKK kapsamında
                                    istediğiniz zaman kapatabilirsiniz.
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={user?.whatsappOptIn !== false}
                                disabled={updateWhatsappOptInMutation.isPending}
                                onClick={() =>
                                  updateWhatsappOptInMutation.mutate(user?.whatsappOptIn === false)
                                }
                                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                                  user?.whatsappOptIn !== false ? 'bg-polen-orange' : 'bg-black/15'
                                }`}
                                data-testid="toggle-whatsapp-opt-in"
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                    user?.whatsappOptIn !== false ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'addresses' && (
                  <motion.div
                    key="addresses"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-black">Adreslerim</h2>
                      {!showAddressForm && (
                        <button
                          onClick={() => {
                            resetAddressForm();
                            setEditingAddress(null);
                            setShowAddressForm(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-none text-sm font-medium hover:bg-polen-orange transition-colors"
                          data-testid="button-add-address"
                        >
                          <Plus className="w-4 h-4" />
                          Yeni Adres
                        </button>
                      )}
                    </div>

                    {showAddressForm ? (
                      <div className="bg-white border border-black/8 rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-black mb-4">
                          {editingAddress ? 'Adresi Düzenle' : 'Yeni Adres Ekle'}
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-black/55 mb-2">Adres Başlığı *</label>
                            <input
                              type="text"
                              value={addressForm.title}
                              onChange={(e) => setAddressForm({ ...addressForm, title: e.target.value })}
                              className="w-full px-4 py-3 bg-stone-50 border border-black/12 rounded-none text-black placeholder:text-black/30 focus:outline-none focus:border-polen-orange transition-colors"
                              placeholder="Ev, İş, vb."
                              data-testid="input-address-title"
                            />
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-black/55 mb-2">Ad *</label>
                              <input
                                type="text"
                                value={addressForm.firstName}
                                onChange={(e) => setAddressForm({ ...addressForm, firstName: e.target.value })}
                                className="w-full px-4 py-3 bg-stone-50 border border-black/12 rounded-none text-black placeholder:text-black/30 focus:outline-none focus:border-polen-orange transition-colors"
                                placeholder="Adınız"
                                data-testid="input-address-firstName"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-black/55 mb-2">Soyad *</label>
                              <input
                                type="text"
                                value={addressForm.lastName}
                                onChange={(e) => setAddressForm({ ...addressForm, lastName: e.target.value })}
                                className="w-full px-4 py-3 bg-stone-50 border border-black/12 rounded-none text-black placeholder:text-black/30 focus:outline-none focus:border-polen-orange transition-colors"
                                placeholder="Soyadınız"
                                data-testid="input-address-lastName"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-black/55 mb-2">Telefon *</label>
                            <input
                              type="tel"
                              value={addressForm.phone}
                              onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                              className="w-full px-4 py-3 bg-stone-50 border border-black/12 rounded-none text-black placeholder:text-black/30 focus:outline-none focus:border-polen-orange transition-colors"
                              placeholder="05XX XXX XX XX"
                              data-testid="input-address-phone"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-black/55 mb-2">Adres *</label>
                            <input
                              type="text"
                              value={addressForm.address}
                              onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                              className="w-full px-4 py-3 bg-stone-50 border border-black/12 rounded-none text-black placeholder:text-black/30 focus:outline-none focus:border-polen-orange transition-colors"
                              placeholder="Sokak, Mahalle, Bina No, Daire No"
                              data-testid="input-address-address"
                            />
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-black/55 mb-2">İl *</label>
                              <input
                                type="text"
                                value={addressForm.city}
                                onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                                className="w-full px-4 py-3 bg-stone-50 border border-black/12 rounded-none text-black placeholder:text-black/30 focus:outline-none focus:border-polen-orange transition-colors"
                                placeholder="İstanbul"
                                data-testid="input-address-city"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-black/55 mb-2">İlçe *</label>
                              <input
                                type="text"
                                value={addressForm.district}
                                onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                                className="w-full px-4 py-3 bg-stone-50 border border-black/12 rounded-none text-black placeholder:text-black/30 focus:outline-none focus:border-polen-orange transition-colors"
                                placeholder="Kadıköy"
                                data-testid="input-address-district"
                              />
                            </div>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-black/55 mb-2">Posta Kodu</label>
                              <input
                                type="text"
                                value={addressForm.postalCode}
                                onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                                className="w-full px-4 py-3 bg-stone-50 border border-black/12 rounded-none text-black placeholder:text-black/30 focus:outline-none focus:border-polen-orange transition-colors"
                                placeholder="34000"
                                data-testid="input-address-postalCode"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-black/55 mb-2">Ülke *</label>
                              <select
                                value={addressForm.country}
                                onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                                className="w-full px-4 py-3 bg-stone-50 border border-black/12 rounded-none text-black placeholder:text-black/30 focus:outline-none focus:border-polen-orange transition-colors"
                                data-testid="select-address-country"
                              >
                                {COUNTRIES.map(country => (
                                  <option key={country} value={country} className="bg-white">
                                    {country}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="isDefault"
                              checked={addressForm.isDefault}
                              onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                              className="w-5 h-5 rounded border border-black/30 accent-polen-orange"
                              data-testid="checkbox-address-default"
                            />
                            <label htmlFor="isDefault" className="text-sm text-black/55">
                              Varsayılan adres olarak ayarla
                            </label>
                          </div>
                          <div className="flex gap-3 pt-4">
                            <button
                              onClick={() => {
                                setShowAddressForm(false);
                                setEditingAddress(null);
                                resetAddressForm();
                              }}
                              className="flex-1 px-4 py-3 border border-black/12 rounded-none text-black hover:bg-black/5 transition-colors"
                              data-testid="button-cancel-address"
                            >
                              İptal
                            </button>
                            <button
                              onClick={handleSaveAddress}
                              disabled={createAddressMutation.isPending || updateAddressMutation.isPending}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-none font-medium hover:bg-polen-orange transition-colors disabled:opacity-50"
                              data-testid="button-save-address"
                            >
                              {(createAddressMutation.isPending || updateAddressMutation.isPending) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              Kaydet
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : addressesLoading ? (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-black/30" />
                      </div>
                    ) : addresses.length === 0 ? (
                      <div className="bg-white border border-black/8 rounded-2xl p-12 text-center">
                        <MapPin className="w-16 h-16 mx-auto mb-4 text-black/20" />
                        <h3 className="text-xl font-semibold text-black mb-2">Henüz adresiniz yok</h3>
                        <p className="text-black/45 mb-6">
                          Siparişlerinizi hızlandırmak için adres ekleyin.
                        </p>
                        <button
                          onClick={() => {
                            resetAddressForm();
                            setShowAddressForm(true);
                          }}
                          className="px-6 py-3 bg-black text-white rounded-none font-medium hover:bg-polen-orange transition-colors"
                          data-testid="button-add-first-address"
                        >
                          İlk Adresimi Ekle
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {addresses.map((addr) => (
                          <div
                            key={addr.id}
                            className="bg-white border border-black/8 rounded-2xl p-5 hover:border-black/12 transition-colors"
                            data-testid={`address-card-${addr.id}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Home className="w-4 h-4 text-black/45" />
                                  <span className="font-semibold text-black">{addr.title}</span>
                                  {addr.isDefault && (
                                    <span className="text-[10px] bg-polen-orange/15 text-polen-orange font-semibold uppercase tracking-wider px-2 py-0.5 rounded-none">
                                      Varsayılan
                                    </span>
                                  )}
                                </div>
                                <p className="text-black/70">{addr.firstName} {addr.lastName}</p>
                                <p className="text-black/45">{addr.address}</p>
                                <p className="text-black/45">{addr.district}, {addr.city} {addr.postalCode}</p>
                                <p className="text-black/45 mt-1">{addr.phone}</p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditAddress(addr)}
                                  className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-black/55 hover:text-black"
                                  data-testid={`button-edit-address-${addr.id}`}
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Bu adresi silmek istediğinizden emin misiniz?')) {
                                      deleteAddressMutation.mutate(addr.id);
                                    }
                                  }}
                                  className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-black/55 hover:text-destructive"
                                  data-testid={`button-delete-address-${addr.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-black/8 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-black/8">
                <div>
                  <h3 className="text-xl font-semibold text-black">
                    Sipariş #{selectedOrder.orderNumber}
                  </h3>
                  <p className="text-sm text-black/45 mt-1">
                    {formatTRDateTime(selectedOrder.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                  data-testid="button-close-order-modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  {(() => {
                    const status = statusConfig[selectedOrder.status] || statusConfig.pending;
                    const StatusIcon = status.icon;
                    return (
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${status.bg} ${status.color}`}>
                        <StatusIcon className="w-4 h-4" />
                        {status.label}
                      </span>
                    );
                  })()}
                </div>

                {selectedOrder.status === 'shipped' && (
                  <div className="bg-stone-50 border border-black/10 rounded-none p-5">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Truck className="w-5 h-5 text-black/70" strokeWidth={2} />
                      <span className="text-black font-bold text-sm tracking-[0.2em] uppercase">Aras Kargo</span>
                    </div>
                    
                    <div className="text-center mb-3">
                      <p className="text-xs text-black/55 uppercase tracking-wider mb-1">Kargo Takip Numarası</p>
                      <p className="text-xl font-mono font-bold text-black tracking-widest">
                        {selectedOrder.trackingNumber || 'Bekleniyor...'}
                      </p>
                    </div>
                    
                    {selectedOrder.trackingNumber && (
                      <a
                        href={selectedOrder.trackingUrl || `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${selectedOrder.trackingNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-black hover:bg-polen-orange text-white rounded-none font-bold text-[11px] tracking-[0.18em] uppercase transition-colors"
                      >
                        <Truck className="w-4 h-4" />
                        ARAS KARGO'DA TAKİP ET
                      </a>
                    )}
                  </div>
                )}

                {selectedOrder.trackingNumber && selectedOrder.status !== 'shipped' && (
                  <div className="p-4 bg-stone-50 rounded-xl">
                    <p className="text-xs text-black/55 uppercase tracking-wider mb-1">Kargo Takip Numarası</p>
                    <p className="text-lg font-mono font-bold text-black">{selectedOrder.trackingNumber}</p>
                    {selectedOrder.shippingCarrier && (
                      <p className="text-sm text-black/45 mt-1">{selectedOrder.shippingCarrier}</p>
                    )}
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-black/55 mb-3 uppercase tracking-wider">Ürünler</h4>
                  {orderDetailLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-black/30" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orderDetail?.items?.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                          <div>
                            <p className="font-medium text-black">{item.productName}</p>
                            {item.variantDetails && (
                              <p className="text-sm text-black/45">{item.variantDetails}</p>
                            )}
                            <p className="text-sm text-black/55">Adet: {item.quantity}</p>
                          </div>
                          <p className="font-semibold text-black">{item.subtotal}₺</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-black/55 mb-3 uppercase tracking-wider">Teslimat Adresi</h4>
                  <div className="p-4 bg-stone-50 rounded-xl">
                    <p className="text-black">{selectedOrder.customerName}</p>
                    <p className="text-black/55">{selectedOrder.shippingAddress.address}</p>
                    <p className="text-black/55">
                      {selectedOrder.shippingAddress.district}, {selectedOrder.shippingAddress.city} {selectedOrder.shippingAddress.postalCode}
                    </p>
                    <p className="text-black/55 mt-2">{selectedOrder.customerPhone}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-black/55 mb-3 uppercase tracking-wider">Özet</h4>
                  <div className="p-4 bg-stone-50 rounded-xl space-y-2">
                    <div className="flex justify-between text-black/55">
                      <span>Ara Toplam</span>
                      <span>{selectedOrder.subtotal}₺</span>
                    </div>
                    <div className="flex justify-between text-black/55">
                      <span>Kargo</span>
                      <span>{parseFloat(selectedOrder.shippingCost) === 0 ? 'Ücretsiz' : `${selectedOrder.shippingCost}₺`}</span>
                    </div>
                    <div className="flex justify-between text-black font-bold text-lg pt-2 border-t border-black/12">
                      <span>Toplam</span>
                      <span>{selectedOrder.total}₺</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
