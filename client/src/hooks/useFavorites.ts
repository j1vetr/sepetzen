import { trackMeta } from '@/lib/metaPixel';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { type Product } from '@/hooks/useProducts';

export function useFavorites() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const response = await fetch('/api/favorites');
      if (!response.ok) {
        if (response.status === 401) return [];
        throw new Error('Failed to fetch favorites');
      }
      return response.json() as Promise<Product[]>;
    },
    enabled: !!user,
  });
}

export function useFavoriteIds() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['favoriteIds'],
    queryFn: async () => {
      const response = await fetch('/api/favorites/ids');
      if (!response.ok) return [];
      return response.json() as Promise<string[]>;
    },
    enabled: !!user,
  });
}

export function useIsFavorite(productId: string) {
  const { data: favoriteIds = [] } = useFavoriteIds();
  return favoriteIds.includes(productId);
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const addMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await fetch(`/api/favorites/${productId}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to add favorite');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['favoriteIds'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await fetch(`/api/favorites/${productId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove favorite');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['favoriteIds'] });
    },
  });

  const toggleFavorite = async (productId: string, isFavorite: boolean) => {
    if (!user) {
      window.location.href = '/giris';
      return;
    }
    
    if (isFavorite) {
      await removeMutation.mutateAsync(productId);
    } else {
      await addMutation.mutateAsync(productId);
      void trackMeta('AddToWishlist', { contents: [{ productId }] });
    }
  };

  return {
    toggleFavorite,
    isLoading: addMutation.isPending || removeMutation.isPending,
  };
}
