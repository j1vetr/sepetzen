import { adminUrl } from '@/lib/adminPath';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

import OrdersTab from './admin/OrdersTab';
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
import KvkkTab from './admin/KvkkTab';
import WalletTab from './admin/WalletTab';
import BatchInvoiceTab from './admin/BatchInvoiceTab';
import LiveStreamTab from './admin/LiveStreamTab';
import BrandsTab from './admin/BrandsTab';

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
    return tab && VALID_TABS.includes(tab as TabType) ? (tab as TabType) : 'dashboard';
  });

  const [searchQuery, setSearchQuery] = useState('');
  // Arama çubuğu navigasyonu için sekmesine özel initial state'ler
  const [ordersInitialSearch, setOrdersInitialSearch] = useState('');
  const [ordersInitialFilter, setOrdersInitialFilter] = useState<'all' | 'overdue'>('all');
  const [blogInitialSelectedId, setBlogInitialSelectedId] = useState('');
  const [pagesInitialSelectedId, setPagesInitialSelectedId] = useState('');

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [showBulkBadgeModal, setShowBulkBadgeModal] = useState(false);
  const [bulkPreselectedIds, setBulkPreselectedIds] = useState<string[] | undefined>(undefined);

  const data = useAdminDashboardData({
    activeTab,
    searchQuery,
    onLoggedOut: () => setLocation(adminUrl('/login')),
    // Ürün ekleme/düzenleme artık tam sayfa editörde (/toov-admin/products/...)
    onProductSaved: () => {},
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
    allVariantsLoading,
    allVariantsError,
    categories,
    categoriesLoading,
    categoriesError,
    brands,
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
    if (!userLoading && !adminUser) setLocation(adminUrl('/login'));
  }, [adminUser, userLoading, setLocation]);

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    window.history.pushState({ tab: tabId }, '', url.toString());
    if (tabId === 'orders') setOrdersInitialFilter('all');
  };

  const handleOverdueOrders = () => {
    handleTabChange('orders');
    setOrdersInitialSearch('');
    setOrdersInitialFilter('overdue');
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
      if (tab && VALID_TABS.includes(tab as TabType)) {
        setActiveTab(tab as TabType);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const {
    data: pendingReviewsData,
    isLoading: pendingReviewsLoading,
    isError: pendingReviewsError,
  } = usePendingReviewsCount(!!adminUser);

  const {
    data: pendingReturnsData,
    isLoading: pendingReturnsLoading,
    isError: pendingReturnsError,
  } = useQuery<{ count: number }>({
    queryKey: ['/api/admin/returns/pending-count'],
    enabled: !!adminUser,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const pendingReturnsCount = pendingReturnsData?.count ?? 0;

  if (userLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-[13px] text-neutral-500">Yükleniyor...</div>
      </div>
    );
  }
  if (!adminUser) return null;

  const pendingOrdersCount = stats?.pendingOrders ?? 0;
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
        pendingReturnsCount={pendingReturnsCount}
        pageTitle={pageTitle}
        pageDescription={TAB_DESCRIPTIONS[activeTab]}
      >
        {activeTab === 'dashboard' && (
          <DashboardTab
            stats={stats}
            orders={orders}
            products={products}
            allVariants={allVariants}
            getStatusLabel={getStatusLabel}
            onNavigate={handleTabChange}
            onOverdueOrders={handleOverdueOrders}
            pendingReviewsCount={pendingReviewsCount}
            pendingReturnsCount={pendingReturnsCount}
            statsLoading={statsLoading}
            ordersLoading={ordersLoading}
            productsLoading={productsLoading}
            allVariantsLoading={allVariantsLoading}
            allVariantsError={allVariantsError}
            pendingReviewsLoading={pendingReviewsLoading}
            pendingReviewsError={pendingReviewsError}
            pendingReturnsLoading={pendingReturnsLoading}
            pendingReturnsError={pendingReturnsError}
            statsError={statsError}
            ordersError={ordersError}
            productsError={productsError}
          />
        )}
        {activeTab === 'products' && (
          <ProductsTab
            products={products}
            categories={categories}
            brands={brands}
            allVariants={allVariants}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setShowBulkBadgeModal={setShowBulkBadgeModal}
            setShowBulkPriceModal={setShowBulkPriceModal}
            setBulkPreselectedIds={setBulkPreselectedIds}
            deleteProductMutation={deleteProductMutation}
            productsLoading={productsLoading}
            productsError={productsError}
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
        {activeTab === 'orders' && (
          <OrdersTab initialSearch={ordersInitialSearch} initialFilter={ordersInitialFilter} />
        )}
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
        {activeTab === 'brands' && <BrandsTab />}
        {activeTab === 'coupons' && <CouponsTab />}
        {activeTab === 'reviews' && <ReviewsTab />}
        {activeTab === 'kvkk' && <KvkkTab />}
        {activeTab === 'wallet' && <WalletTab />}
        {activeTab === 'batchinvoice' && <BatchInvoiceTab />}
        {activeTab === 'livestream' && <LiveStreamTab />}
      </AdminLayout>

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
