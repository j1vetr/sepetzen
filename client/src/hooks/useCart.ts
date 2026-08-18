import { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface CartItem {
  id: string;
  sessionId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  personalizationText?: string | null;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    basePrice: string;
    images: string[];
    personalization?: {
      enabled: boolean;
      fee?: string;
      label?: string;
      maxChars?: number;
    } | null;
  };
  variant?: {
    id: string;
    size: string | null;
    color: string | null;
    price: string;
  };
}

interface CartContextType {
  items: CartItem[];
  isLoading: boolean;
  addToCart: (productId: string, variantId?: string, quantity?: number, personalizationText?: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  updatePersonalizationText: (itemId: string, text: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  subtotal: number;
}

export const CartContext = createContext<CartContextType | null>(null);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export function useCartProvider() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery<CartItem[]>({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await fetch('/api/cart', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const addMutation = useMutation({
    mutationFn: async ({ productId, variantId, quantity = 1, personalizationText }: { productId: string; variantId?: string; quantity?: number; personalizationText?: string }) => {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId, quantity, personalizationText }),
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Sepete eklenemedi');
      }
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ itemId, quantity, personalizationText }: { itemId: string; quantity: number; personalizationText?: string }) => {
      const body: Record<string, unknown> = { quantity };
      if (personalizationText !== undefined) body.personalizationText = personalizationText;
      const res = await fetch(`/api/cart/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Güncelleme başarısız');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/cart/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Silme başarısız');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/cart', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Sepet temizlenemedi');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  
  const subtotal = items.reduce((sum, item) => {
    // Varyant fiyatı varsa satır fiyatı odur; sepet sayfasıyla tutarlı.
    // Kişiselleştirme yazısı olan satırlara ürünün ek ücreti eklenir
    // (sunucu ödeme anında aynı hesabı kendisi de yapar).
    const price = item.variant?.price || item.product?.basePrice || '0';
    const persFee = item.personalizationText && item.product?.personalization?.enabled
      ? parseFloat(item.product.personalization.fee || '0') || 0
      : 0;
    return sum + (parseFloat(price) + persFee) * item.quantity;
  }, 0);

  return {
    items,
    isLoading,
    addToCart: async (productId: string, variantId?: string, quantity = 1, personalizationText?: string) => {
      await addMutation.mutateAsync({ productId, variantId, quantity, personalizationText });
      await queryClient.refetchQueries({ queryKey: ['cart'] });
    },
    updateQuantity: async (itemId: string, quantity: number) => {
      await updateMutation.mutateAsync({ itemId, quantity });
    },
    updatePersonalizationText: async (itemId: string, text: string) => {
      // Fetch current quantity to keep it unchanged while updating personalization
      const currentItem = items.find(i => i.id === itemId);
      const quantity = currentItem?.quantity ?? 1;
      await updateMutation.mutateAsync({ itemId, quantity, personalizationText: text });
    },
    removeItem: async (itemId: string) => {
      await removeMutation.mutateAsync(itemId);
    },
    clearCart: async () => {
      await clearMutation.mutateAsync();
    },
    totalItems,
    subtotal,
  };
}
