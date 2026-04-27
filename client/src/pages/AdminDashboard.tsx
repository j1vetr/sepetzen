import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

import OrdersTab from './admin/OrdersTab';
import MarketplacesTab from './admin/MarketplacesTab';
import AdminLayout from './admin/_layout/AdminLayout';

import DashboardTab from './admin/DashboardTab';
import ProductsTab from './admin/ProductsTab';
import CategoriesTab from './admin/CategoriesTab';
import UsersTab from './admin/UsersTab';
import AnalyticsTab from './admin/AnalyticsTab';
import InventoryTab from './admin/InventoryTab';
import SettingsTab from './admin/SettingsTab';
import DatabaseTab from './admin/DatabaseTab';
import AIDescriptionsTab from './admin/AIDescriptionsTab';
import MenuTab from './admin/MenuTab';

import ProductModal from './admin/modals/ProductModal';
import CategoryModal from './admin/modals/CategoryModal';
import UserDetailModal from './admin/modals/UserDetailModal';
import BulkPriceModal from './admin/modals/BulkPriceModal';
import BulkBadgeModal from './admin/modals/BulkBadgeModal';
import BulkAIModal from './admin/modals/BulkAIModal';

import type { Product, ProductDraft, Category, User, TabType } from './admin/_shared/types';
import {
  VALID_TABS,
  SIDEBAR_CATEGORIES,
  ALL_SIDEBAR_ITEMS,
  getStatusLabel,
} from './admin/_shared/sidebarConfig';
import { useAdminDashboardData } from './admin/_shared/useAdminDashboardData';

export default function AdminDashboard() {
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    return tab && VALID_TABS.includes(tab as TabType) ? (tab as TabType) : 'dashboard';
  });
  const [searchQuery, setSearchQuery] = useState('');

  const [editingProduct, setEditingProduct] = useState<Product | ProductDraft | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [showBulkBadgeModal, setShowBulkBadgeModal] = useState(false);
  const [showBulkAIModal, setShowBulkAIModal] = useState(false);

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
    orders,
    ordersLoading,
    ordersError,
    refetchOrders,
    users,
    logoutMutation,
    deleteProductMutation,
    deleteCategoryMutation,
    deleteUserMutation,
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
    window.history.replaceState({}, '', url.toString());
  };

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
  const pageTitle = ALL_SIDEBAR_ITEMS.find((i) => i.id === activeTab)?.label ?? '';

  return (
    <>
      <AdminLayout
        adminUser={adminUser}
        sidebarCategories={SIDEBAR_CATEGORIES}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={() => logoutMutation.mutate()}
        pendingOrdersCount={pendingOrdersCount}
        pageTitle={pageTitle}
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
            setShowBulkAIModal={setShowBulkAIModal}
            deleteProductMutation={deleteProductMutation}
          />
        )}
        {activeTab === 'categories' && (
          <CategoriesTab
            categories={categories}
            setEditingCategory={setEditingCategory}
            setShowCategoryModal={setShowCategoryModal}
            deleteCategoryMutation={deleteCategoryMutation}
          />
        )}
        {activeTab === 'orders' && <OrdersTab />}
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
        {activeTab === 'ai-descriptions' && (
          <AIDescriptionsTab products={products} categories={categories} />
        )}
        {activeTab === 'menu' && <MenuTab categories={categories} />}
        {activeTab === 'marketplaces' && (
          <MarketplacesTab
            siteCategories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
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
        />
      )}
      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
          onSave={(category) => saveCategoryMutation.mutate(category)}
          isSaving={saveCategoryMutation.isPending}
        />
      )}
      {viewingUser && <UserDetailModal user={viewingUser} onClose={() => setViewingUser(null)} />}
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
        <BulkAIModal categories={categories} onClose={() => setShowBulkAIModal(false)} />
      )}
    </>
  );
}
