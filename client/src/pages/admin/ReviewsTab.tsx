import { useState } from 'react';
import { Star, Check, X, Trash2, Loader2, MessageSquare, ExternalLink } from 'lucide-react';
import {
  useAdminReviews,
  useApproveReview,
  useRejectReview,
  useDeleteReview,
  type AdminReview,
  type AdminReviewStatusFilter,
} from '@/hooks/useReviews';
import { useToast } from '@/hooks/use-toast';

const STATUS_TABS: { id: AdminReviewStatusFilter; label: string }[] = [
  { id: 'pending', label: 'Bekleyen' },
  { id: 'approved', label: 'Onaylı' },
  { id: 'rejected', label: 'Reddedilen' },
  { id: 'all', label: 'Tümü' },
];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-3.5 h-3.5 ${
            n <= rating ? 'fill-polen-orange text-polen-orange' : 'text-neutral-300'
          }`}
        />
      ))}
    </div>
  );
}

function authorOf(r: AdminReview): { name: string; email: string | null; isGuest: boolean } {
  if (r.userId) {
    const name = `${r.userFirstName || ''} ${r.userLastName || ''}`.trim() || 'Üye';
    return { name, email: r.userEmail, isGuest: false };
  }
  return { name: r.guestName || 'Misafir', email: r.guestEmail, isGuest: true };
}

function ReviewCard({ review }: { review: AdminReview }) {
  const { toast } = useToast();
  const approveMutation = useApproveReview();
  const rejectMutation = useRejectReview();
  const deleteMutation = useDeleteReview();

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const author = authorOf(review);

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(review.id);
      toast({ title: 'Yorum onaylandı', description: 'Ürün sayfasında yayında.' });
    } catch (e: any) {
      toast({ title: 'Hata', description: e.message, variant: 'destructive' });
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast({
        title: 'Neden gerekli',
        description: 'Lütfen reddetme nedenini belirtin.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await rejectMutation.mutateAsync({ id: review.id, reason: rejectReason.trim() });
      toast({ title: 'Yorum reddedildi' });
      setShowRejectForm(false);
      setRejectReason('');
    } catch (e: any) {
      toast({ title: 'Hata', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bu yorumu kalıcı olarak silmek istediğinize emin misiniz?')) return;
    try {
      await deleteMutation.mutateAsync(review.id);
      toast({ title: 'Yorum silindi' });
    } catch (e: any) {
      toast({ title: 'Hata', description: e.message, variant: 'destructive' });
    }
  };

  const status: 'pending' | 'approved' | 'rejected' = review.rejectionReason
    ? 'rejected'
    : review.isApproved
      ? 'approved'
      : 'pending';

  const statusBadge =
    status === 'pending' ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 uppercase tracking-wider">
        Bekliyor
      </span>
    ) : status === 'approved' ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-800 uppercase tracking-wider">
        Onaylı
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 uppercase tracking-wider">
        Reddedildi
      </span>
    );

  return (
    <div
      className="bg-white border border-neutral-200 rounded-lg p-4 md:p-5 flex flex-col gap-3"
      data-testid={`card-review-${review.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {review.productImage ? (
            <img
              src={review.productImage}
              alt={review.productName}
              className="w-12 h-12 rounded object-cover border border-neutral-200 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded bg-neutral-100 border border-neutral-200 shrink-0" />
          )}
          <div className="min-w-0">
            <a
              href={`/urun/${review.productSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-semibold text-neutral-900 hover:text-polen-orange flex items-center gap-1 truncate"
              data-testid={`link-product-${review.productSlug}`}
            >
              <span className="truncate">{review.productName}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
            <p className="text-[11px] text-neutral-500">
              {new Date(review.createdAt).toLocaleString('tr-TR')}
            </p>
          </div>
        </div>
        {statusBadge}
      </div>

      <div className="border-t border-neutral-100 pt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]">
        <Stars rating={review.rating} />
        <span className="text-neutral-700 font-medium">
          {author.name}
          {author.isGuest && (
            <span className="ml-1.5 inline-flex items-center px-1.5 py-0 rounded text-[9px] font-semibold bg-neutral-200 text-neutral-700 uppercase tracking-wider">
              Misafir
            </span>
          )}
        </span>
        {author.email && <span className="text-neutral-500">{author.email}</span>}
      </div>

      {(review.title || review.content) && (
        <div className="bg-neutral-50 border border-neutral-100 rounded p-3">
          {review.title && (
            <p className="text-[13px] font-semibold text-neutral-900 mb-1">{review.title}</p>
          )}
          {review.content && (
            <p className="text-[12.5px] text-neutral-700 leading-relaxed whitespace-pre-line">
              {review.content}
            </p>
          )}
        </div>
      )}

      {review.rejectionReason && (
        <div className="bg-red-50 border border-red-100 rounded p-3 text-[12px]">
          <p className="font-semibold text-red-800 mb-1">Reddetme nedeni:</p>
          <p className="text-red-700">{review.rejectionReason}</p>
        </div>
      )}

      {showRejectForm && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 space-y-2">
          <label className="block text-[11px] font-semibold text-amber-900 uppercase tracking-wider">
            Reddetme nedeni
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={2}
            placeholder="Örn: Reklam içeriği, küfür, ürünle ilgisiz..."
            className="w-full px-3 py-2 text-[13px] bg-white border border-neutral-300 rounded focus:outline-none focus:border-amber-600"
            data-testid={`input-reject-reason-${review.id}`}
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              className="px-3 py-1.5 bg-red-600 text-white text-[12px] font-semibold rounded hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1.5"
              data-testid={`button-confirm-reject-${review.id}`}
            >
              {rejectMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              Reddet
            </button>
            <button
              onClick={() => {
                setShowRejectForm(false);
                setRejectReason('');
              }}
              className="px-3 py-1.5 bg-neutral-200 text-neutral-700 text-[12px] font-semibold rounded hover:bg-neutral-300"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {status !== 'approved' && (
          <button
            onClick={handleApprove}
            disabled={approveMutation.isPending}
            className="px-3 py-1.5 bg-neutral-600 text-white text-[12px] font-semibold rounded hover:bg-neutral-700 disabled:opacity-50 inline-flex items-center gap-1.5"
            data-testid={`button-approve-${review.id}`}
          >
            {approveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Onayla
          </button>
        )}
        {(status === 'pending' || status === 'approved') && !showRejectForm && (
          <button
            onClick={() => setShowRejectForm(true)}
            className="px-3 py-1.5 bg-white border border-neutral-300 text-neutral-700 text-[12px] font-semibold rounded hover:bg-neutral-50 inline-flex items-center gap-1.5"
            data-testid={`button-show-reject-${review.id}`}
          >
            <X className="w-3.5 h-3.5" />
            Reddet
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="ml-auto px-3 py-1.5 bg-white border border-red-200 text-red-700 text-[12px] font-semibold rounded hover:bg-red-50 disabled:opacity-50 inline-flex items-center gap-1.5"
          data-testid={`button-delete-${review.id}`}
        >
          {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Sil
        </button>
      </div>
    </div>
  );
}

export default function ReviewsTab() {
  const [filter, setFilter] = useState<AdminReviewStatusFilter>('pending');
  const { data: reviews = [], isLoading, error } = useAdminReviews(filter);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-polen-orange" />
            Müşteri Yorumları
          </h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">
            Yorumları onaylayın, reddedin veya silin. Onay sonrası yorumlar ürün sayfasında görünür.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-neutral-200 pb-px">
        {STATUS_TABS.map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-2 text-[12.5px] font-medium rounded-t-md transition-colors -mb-px border-b-2 ${
                isActive
                  ? 'border-polen-orange text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
              data-testid={`tab-reviews-${tab.id}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-neutral-500 text-[13px]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Yükleniyor...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-[13px] text-red-700">
          Yorumlar getirilemedi. Lütfen sayfayı yenileyin.
        </div>
      )}

      {!isLoading && !error && reviews.length === 0 && (
        <div className="text-center py-16 text-neutral-500">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
          <p className="text-[13px]">Bu kategoride yorum yok.</p>
        </div>
      )}

      {!isLoading && !error && reviews.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="list-admin-reviews">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
