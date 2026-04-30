import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

export interface Review {
  id: string;
  productId: string;
  rating: number;
  title: string | null;
  content: string | null;
  createdAt: string;
  isGuest: boolean;
  // Sadece useUserReview (kullanıcının kendi yorumu) için döner;
  // public reviews endpoint'inde alan yer almaz.
  isApproved?: boolean;
  rejectionReason?: string | null;
  user: {
    firstName: string | null;
    lastName: string | null;
  };
}

export interface RatingData {
  average: number;
  count: number;
}

export interface AdminReview {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  userId: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string | null;
  guestName: string | null;
  guestEmail: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  isApproved: boolean;
  rejectionReason: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
}

export type AdminReviewStatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

export interface CreateReviewPayload {
  productId: string;
  rating: number;
  title?: string;
  content?: string;
  guestName?: string;
  guestEmail?: string;
  captchaToken?: string;
}

export function useProductReviews(productId: string) {
  return useQuery({
    queryKey: ['reviews', productId],
    queryFn: async () => {
      const response = await fetch(`/api/products/${productId}/reviews`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      return response.json() as Promise<Review[]>;
    },
    enabled: !!productId,
  });
}

export function useProductRating(productId: string) {
  return useQuery({
    queryKey: ['rating', productId],
    queryFn: async () => {
      const response = await fetch(`/api/products/${productId}/rating`);
      if (!response.ok) throw new Error('Failed to fetch rating');
      return response.json() as Promise<RatingData>;
    },
    enabled: !!productId,
  });
}

export function useUserReview(productId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-review', productId],
    queryFn: async () => {
      const response = await fetch(`/api/products/${productId}/my-review`);
      if (!response.ok) return null;
      return response.json() as Promise<Review | null>;
    },
    enabled: !!productId && !!user,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateReviewPayload) => {
      const response = await fetch(`/api/products/${data.productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: data.rating,
          title: data.title,
          content: data.content,
          guestName: data.guestName,
          guestEmail: data.guestEmail,
          captchaToken: data.captchaToken,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || 'Yorum gönderilemedi');
      }
      return body;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['rating', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['my-review', variables.productId] });
    },
  });
}

// ─── Admin hooks ───────────────────────────────────────────────────────────

export function useAdminReviews(status: AdminReviewStatusFilter = 'pending') {
  return useQuery({
    queryKey: ['admin', 'reviews', status],
    queryFn: async () => {
      const response = await fetch(`/api/admin/reviews?status=${status}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Yorumlar getirilemedi');
      return response.json() as Promise<AdminReview[]>;
    },
  });
}

export function usePendingReviewsCount(enabled: boolean = true) {
  return useQuery({
    queryKey: ['admin', 'reviews', 'pending-count'],
    queryFn: async () => {
      const response = await fetch('/api/admin/reviews/pending-count', {
        credentials: 'include',
      });
      if (!response.ok) return { count: 0 };
      return response.json() as Promise<{ count: number }>;
    },
    refetchInterval: 60_000,
    enabled,
  });
}

function invalidateAdminReviews(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
}

export function useApproveReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/reviews/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Yorum onaylanamadı');
      return body;
    },
    onSuccess: () => invalidateAdminReviews(queryClient),
  });
}

export function useRejectReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; reason: string }) => {
      const response = await fetch(`/api/admin/reviews/${data.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: data.reason }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Yorum reddedilemedi');
      return body;
    },
    onSuccess: () => invalidateAdminReviews(queryClient),
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Yorum silinemedi');
      return body;
    },
    onSuccess: () => invalidateAdminReviews(queryClient),
  });
}
