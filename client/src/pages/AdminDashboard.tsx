import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

import OrdersTab from './admin/OrdersTab';
import TrendyolCenter from './admin/TrendyolCenter';
import AdminLayout from './admin/_layout/AdminLayout';

import DashboardTab from './admin/DashboardTab';
import ProductsTab from './admin/ProductsTab';
import CategoriesTab from './admin/CategoriesTab';
import UsersTab from './admin/UsersTab';
import AnalyticsTab from './admin/AnalyticsTab';
import InventoryTab from './admin/InventoryTab';
import SettingsTab from './admin/SettingsTab';
import DatabaseTab from './admin/DatabaseTab';
import MenuTab from './admin/MenuTab';
import HomepageTab from './admin/HomepageTab';
import FooterTab from './admin/FooterTab';
import PagesTab from './admin/PagesTab';
import BlogTab from './admin/BlogTab';
import CouponsTab from './admin/CouponsTab';
import ReviewsTab from './admin/ReviewsTab';
import WholesaleTab from './admin/WholesaleTab';

import ProductModal from './admin/modals/ProductModal';
import CategoryModal from './admin/modals/CategoryModal';
import UserDetailModal from './admin/modals/UserDetailModal';
import BulkPriceModal from './admin/modals/BulkPriceModal';
import BulkBadgeModal from './admin/modals/BulkBadgeModal';

import type { Product, ProductDraft, Category, User, TabType } from './admin/_shared/types';
import {
  VALID_TABS,
  SIDEBAR_CATEGORIES,
  ALL_SIDEBAR_ITEMS,
  TAB_DESCRIPTIONS,
  getStatusLabel,
} from './admin/_shared/sidebarConfig';
import { useQuery } from '@tanstack/react-query';
import { useAdminDashboardData } from './admin/_shared/useAdminDashboardData';
import { usePendingReviewsCount } from '@/hooks/useReviews';

export default function AdminDashboard() {
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    // Eski "Trendyol Siparişleri" bağlantıları artık Trendyol Merkezi'ne yönlenir
    if (tab === 'marketplaceOrders') return 'marketplaces';
    return tab && VALID_TABS.includes(tab as TabType) ? (tab as TabType) : 'dashboard';
  });

  // Ürünler sayfasından tek tıkla gelen ürün ID'si — Trendyol sihirbazını otomatik açar
  const [trendyolInitialProductId, setTrendyolInitialProductId] = useState<string | undefined>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('typroduct') ?? undefined;
  });
  const [searchQuery, setSearchQuery] = useState('');
  // Arama çubuğu navigasyonu için sekmesine özel initial state'ler
  const [ordersInitialSearch, setOrdersInitialSearch] = useState('');
  const [blogInitialSelectedId, setBlogInitialSelectedId] = useState('');
  const [pagesInitialSelectedId, setPagesInitialSelectedId] = useState('');

  const [editingProduct, setEditingProduct] = useState<Product | ProductDraft | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [showBulkBadgeModal, setShowBulkBadgeModal] = useState(false);
  const [bulkPreselectedIds, setBulkPreselectedIds] = useState<string[] | undefined>(undefined);

  const data = useAdminDashboardData({
    searchQuery,
    onLoggedOut: () => setLocation('/toov-admin/login'),
    onProductSaved: () => {
      setShowProductModal(false);
      setEditingProduct(null);
    },
    onCategorySaved: () => {
      setShowCategoryModal(false);
      setEditingCategory(null);
    },
  });

  const {
    queryClient,
    adminUser,
    userLoading,
    stats,
    statsLoading,
    statsError,
    products,
    productsLoading,
    productsError,
    allVariants,
    categories,
    categoriesLoading,
    categoriesError,
    orders,
    ordersLoading,
    ordersError,
    refetchOrders,
    users,
    logoutMutation,
    deleteProductMutation,
    deleteCategoryMutation,
    deleteUserMutation,
    saveUserMutation,
    saveProductMutation,
    saveCategoryMutation,
  } = data;

  useEffect(() => {
    if (activeTab === 'orders' && adminUser) refetchOrders();
  }, [activeTab, adminUser, refetchOrders]);

  useEffect(() => {
    if (!userLoading && !adminUser) setLocation('/toov-admin/login');
  }, [adminUser, userLoading, setLocation]);

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    // typroduct parametresini temizle — sekme değişiminde sihirbaz otomatik açılmasın
    url.searchParams.delete('typroduct');
    window.history.pushState({ tab: tabId }, '', url.toString());
    if (tabId !== 'marketplaces') setTrendyolInitialProductId(undefined);
  };

  const handleTrendyolAction = (productId: string) => {
    setTrendyolInitialProductId(productId);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'marketplaces');
    url.searchParams.set('typroduct', productId);
    window.history.pushState({ tab: 'marketplaces' }, '', url.toString());
    setActiveTab('marketplaces');
  };

  // Arama çubuğundan gelen navigasyon - her sekme türü için özel hedef davranışı
  const handleSearchNavigate = (
    tabId: TabType,
    options?: { searchQuery?: string; selectedId?: string },
  ) => {
    handleTabChange(tabId);
    const q = options?.searchQuery;
    const id = options?.selectedId;
    if (tabId === 'products' || tabId === 'users') {
      // ProductsTab ve UsersTab zaten searchQuery prop'u kullanıyor
      if (q !== undefined) setSearchQuery(q);
    } else if (tabId === 'orders') {
      if (q !== undefined) setOrdersInitialSearch(q);
    } else if (tabId === 'categories' && id) {
      // Kategori id'siyle doğrudan düzenleme modalı aç
      const cat = categories.find((c) => c.id === id);
      if (cat) {
        setEditingCategory(cat);
        setShowCategoryModal(true);
      }
    } else if (tabId === 'blog' && id) {
      setBlogInitialSelectedId(id);
    } else if (tabId === 'pages' && id) {
      setPagesInitialSelectedId(id);
    }
  };

  // Tarayıcı geri/ileri tuşlarını sekme değişimiyle senkron tut
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      // Eski "Trendyol Siparişleri" bağlantıları artık Trendyol Merkezi'ne yönlenir
      if (tab === 'marketplaceOrders') {
        setActiveTab('marketplaces');
      } else if (tab && VALID_TABS.includes(tab as TabType)) {
        setActiveTab(tab as TabType);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const { data: pendingReviewsData } = usePendingReviewsCount(!!adminUser);

  const { data: pendingMpData } = useQuery<{ count: number }>({
    queryKey: ['/api/admin/marketplace-orders/pending-count'],
    enabled: !!adminUser,
    refetchInterval: 5 * 60_000,
    staleTime: 2 * 60_000,
  });
  const pendingMarketplaceOrdersCount = pendingMpData?.count ?? 0;

  if (userLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-[13px] text-neutral-500">Yükleniyor...</div>
      </div>
    );
  }
  if (!adminUser) return null;

  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'pending' || o.status === 'confirmed',
  ).length;
  const pendingReviewsCount = pendingReviewsData?.count ?? 0;
  const pageTitle = ALL_SIDEBAR_ITEMS.find((i) => i.id === activeTab)?.label ?? '';

  return (
    <>
      <AdminLayout
        adminUser={adminUser}
        sidebarCategories={SIDEBAR_CATEGORIES}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onNavigate={handleSearchNavigate}
        onLogout={() => logoutMutation.mutate()}
        pendingOrdersCount={pendingOrdersCount}
        pendingReviewsCount={pendingReviewsCount}
        pendingMarketplaceOrdersCount={pendingMarketplaceOrdersCount}
        pageTitle={pageTitle}
        pageDescription={TAB_DESCRIPTIONS[activeTab]}
      >
        {activeTab === 'dashboard' && (
          <DashboardTab
            stats={stats}
            orders={orders}
            products={products}
            getStatusLabel={getStatusLabel}
            onNavigate={handleTabChange}
            statsLoading={statsLoading}
            ordersLoading={ordersLoading}
            productsLoading={productsLoading}
            statsError={statsError}
            ordersError={ordersError}
            productsError={productsError}
          />
        )}
        {activeTab === 'products' && (
          <ProductsTab
            products={products}
            categories={categories}
            allVariants={allVariants}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setEditingProduct={setEditingProduct}
            setShowProductModal={setShowProductModal}
            setShowBulkBadgeModal={setShowBulkBadgeModal}
            setShowBulkPriceModal={setShowBulkPriceModal}
            setBulkPreselectedIds={setBulkPreselectedIds}
            deleteProductMutation={deleteProductMutation}
            productsLoading={productsLoading}
            productsError={productsError}
            onTrendyolAction={handleTrendyolAction}
          />
        )}
        {activeTab === 'categories' && (
          <CategoriesTab
            categories={categories}
            setEditingCategory={setEditingCategory}
            setShowCategoryModal={setShowCategoryModal}
            deleteCategoryMutation={deleteCategoryMutation}
            categoriesLoading={categoriesLoading}
            categoriesError={categoriesError}
          />
        )}
        {activeTab === 'orders' && <OrdersTab initialSearch={ordersInitialSearch} />}
        {activeTab === 'users' && (
          <UsersTab
            users={users}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setViewingUser={setViewingUser}
            deleteUserMutation={deleteUserMutation}
          />
        )}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'inventory' && <InventoryTab />}
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'database' && <DatabaseTab />}
        {activeTab === 'menu' && <MenuTab categories={categories} />}
        {activeTab === 'homepage' && <HomepageTab />}
        {activeTab === 'footer' && <FooterTab />}
        {activeTab === 'pages' && <PagesTab initialSelectedId={pagesInitialSelectedId} />}
        {activeTab === 'blog' && <BlogTab initialSelectedId={blogInitialSelectedId} />}
        {activeTab === 'marketplaces' && (
          <TrendyolCenter
            siteCategories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
            initialProductId={trendyolInitialProductId}
          />
        )}
        {activeTab === 'coupons' && <CouponsTab />}
        {activeTab === 'reviews' && <ReviewsTab />}
        {activeTab === 'wholesale' && (
          <WholesaleTab
            products={products}
            categories={categories}
            allVariants={allVariants}
            productsLoading={productsLoading}
          />
        )}
      </AdminLayout>

      {showProductModal && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
          onSave={(product) => saveProductMutation.mutate(product)}
          isSaving={saveProductMutation.isPending}
          saveError={saveProductMutation.error ? (saveProductMutation.error as Error).message : null}
        />
      )}
      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          categories={categories}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
          onSave={(category) => saveCategoryMutation.mutate(category)}
          isSaving={saveCategoryMutation.isPending}
          saveError={saveCategoryMutation.error instanceof Error ? saveCategoryMutation.error.message : null}
        />
      )}
      {viewingUser && (
        <UserDetailModal
          user={viewingUser}
          onClose={() => setViewingUser(null)}
          onSave={(user) => saveUserMutation.mutate(user, { onSuccess: () => setViewingUser(null) })}
          isSaving={saveUserMutation.isPending}
          saveError={saveUserMutation.error instanceof Error ? saveUserMutation.error.message : null}
        />
      )}
      {showBulkPriceModal && (
        <BulkPriceModal
          categories={categories}
          products={products}
          preselectedProductIds={bulkPreselectedIds}
          onClose={() => {
            setShowBulkPriceModal(false);
            setBulkPreselectedIds(undefined);
          }}
          onSuccess={() => {
            setShowBulkPriceModal(false);
            setBulkPreselectedIds(undefined);
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
          }}
        />
      )}
      {showBulkBadgeModal && (
        <BulkBadgeModal
          products={products}
          categories={categories}
          preselectedProductIds={bulkPreselectedIds}
          onClose={() => {
            setShowBulkBadgeModal(false);
            setBulkPreselectedIds(undefined);
          }}
          onSuccess={() => {
            setShowBulkBadgeModal(false);
            setBulkPreselectedIds(undefined);
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
          }}
        />
      )}
    </>
  );
}
