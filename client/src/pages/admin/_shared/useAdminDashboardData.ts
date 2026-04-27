import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Product, Category, Order, User, Stats, ProductVariant } from './types';

interface UseAdminDashboardDataOptions {
  searchQuery: string;
  onLoggedOut: () => void;
  onProductSaved: () => void;
  onCategorySaved: () => void;
}

export function useAdminDashboardData({
  searchQuery,
  onLoggedOut,
  onProductSaved,
  onCategorySaved,
}: UseAdminDashboardDataOptions) {
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

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery<Stats>({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/stats', { credentials: 'include' });
      if (!response.ok) throw new Error('Stats request failed');
      return response.json();
    },
    enabled: !!adminUser,
    refetchInterval: 30000,
  });

  const { data: products = [], isLoading: productsLoading, isError: productsError } = useQuery<Product[]>({
    queryKey: ['admin', 'products'],
    queryFn: async () => {
      const r = await fetch('/api/admin/products');
      if (!r.ok) throw new Error('Products request failed');
      return r.json();
    },
    enabled: !!adminUser,
  });

  const { data: allVariants = [] } = useQuery<ProductVariant[]>({
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
    queryFn: async () => (await fetch('/api/categories')).json(),
    enabled: !!adminUser,
  });

  const {
    data: orders = [],
    refetch: refetchOrders,
    isLoading: ordersLoading,
    isError: ordersError,
  } = useQuery<Order[]>({
    queryKey: ['admin', 'orders'],
    queryFn: async () => {
      const r = await fetch('/api/admin/orders');
      if (!r.ok) throw new Error('Orders request failed');
      return r.json();
    },
    enabled: !!adminUser,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['admin', 'users', searchQuery],
    queryFn: async () => {
      const url = searchQuery
        ? `/api/admin/users?search=${encodeURIComponent(searchQuery)}`
        : '/api/admin/users';
      return (await fetch(url)).json();
    },
    enabled: !!adminUser,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => (await fetch('/api/admin/logout', { method: 'POST' })).json(),
    onSuccess: onLoggedOut,
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) =>
      (await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) =>
      (await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) =>
      (await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const saveProductMutation = useMutation({
    mutationFn: async (product: Partial<Product>) => {
      const method = product.id ? 'PATCH' : 'POST';
      const url = product.id ? `/api/admin/products/${product.id}` : '/api/admin/products';
      return (
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(product),
        })
      ).json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      onProductSaved();
    },
  });

  const saveCategoryMutation = useMutation({
    mutationFn: async (category: Partial<Category>) => {
      const method = category.id ? 'PATCH' : 'POST';
      const url = category.id ? `/api/admin/categories/${category.id}` : '/api/admin/categories';
      return (
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(category),
        })
      ).json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      onCategorySaved();
    },
  });

  return {
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
  };
}
