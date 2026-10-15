import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatTRDate } from '@shared/dateFormat';

interface KvkkData {
  exportedAt: string;
  profile: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    district: string | null;
    postalCode: string | null;
    country: string | null;
    whatsappOptIn: boolean;
    createdAt: string;
  };
  addresses: unknown[];
  orders: Array<{ orderNumber: string; createdAt: string; total: string }>;
  favorites: unknown[];
  reviews: unknown[];
  returnRequests: unknown[];
}

interface DeletionRequest {
  id: string;
  status: 'pending' | 'completed' | 'rejected';
  note: string | null;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

const STATUS_LABEL: Record<DeletionRequest['status'], { text: string; cls: string }> = {
  pending: { text: 'Beklemede', cls: 'bg-amber-500/15 text-amber-300' },
  completed: { text: 'Tamamlandı', cls: 'bg-emerald-500/15 text-emerald-300' },
  rejected: { text: 'Reddedildi', cls: 'bg-red-500/15 text-red-300' },
};

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-white/6 last:border-0 text-sm">
      <span className="text-white/50">{label}</span>
      <span className="text-white text-right break-words min-w-0">{value || '-'}</span>
    </div>
  );
}

export default function KvkkPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);

  const dataQuery = useQuery<KvkkData>({ queryKey: ['/api/kvkk/data'] });
  const requestQuery = useQuery<{ request: DeletionRequest | null }>({ queryKey: ['/api/kvkk/deletion-request'] });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/kvkk/deletion-request', { note });
    },
    onSuccess: () => {
      setNote('');
      setConfirming(false);
      queryClient.invalidateQueries({ queryKey: ['/api/kvkk/deletion-request'] });
      toast({ title: 'Silme talebiniz alındı' });
    },
    onError: (err: Error) => {
      toast({ title: 'Talep oluşturulamadı', description: err.message, variant: 'destructive' });
    },
  });

  const data = dataQuery.data;
  const latest = requestQuery.data?.request ?? null;
  const hasPending = latest?.status === 'pending';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-white/70" />
        <h2 className="text-xl font-semibold text-white">KVKK ve Gizlilik</h2>
      </div>

      <div className="bg-[#141414] border border-white/8 rounded-2xl p-6" data-testid="card-kvkk-data">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-base font-semibold text-white">Kayıtlı Verilerim</h3>
          <a
            href="/api/kvkk/export"
            download
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-white/90 rounded-xl text-sm font-medium transition-colors"
            data-testid="button-kvkk-export"
          >
            <Download className="w-4 h-4" />
            Verilerimi İndir
          </a>
        </div>

        {dataQuery.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/50" /></div>
        ) : data ? (
          <>
            <Row label="Ad Soyad" value={`${data.profile.firstName ?? ''} ${data.profile.lastName ?? ''}`.trim()} />
            <Row label="E-posta" value={data.profile.email} />
            <Row label="Telefon" value={data.profile.phone} />
            <Row
              label="Adres"
              value={[data.profile.address, data.profile.district, data.profile.city, data.profile.country].filter(Boolean).join(', ')}
            />
            <Row label="WhatsApp bildirim izni" value={data.profile.whatsappOptIn ? 'Verildi' : 'Verilmedi'} />
            <Row label="Üyelik tarihi" value={formatTRDate(data.profile.createdAt)} />
            <Row label="Kayıtlı adres sayısı" value={String(data.addresses.length)} />
            <Row label="Sipariş sayısı" value={String(data.orders.length)} />
            <Row label="Favori ürün sayısı" value={String(data.favorites.length)} />
            <Row label="Yorum sayısı" value={String(data.reviews.length)} />
            <Row label="İade talebi sayısı" value={String(data.returnRequests.length)} />
          </>
        ) : (
          <p className="text-sm text-white/50">Veriler yüklenemedi.</p>
        )}
      </div>

      <div className="bg-[#141414] border border-white/8 rounded-2xl p-6" data-testid="card-kvkk-deletion">
        <h3 className="text-base font-semibold text-white mb-4">Verilerimin Silinmesini Talep Et</h3>

        {latest && (
          <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/8 text-sm space-y-1.5" data-testid="text-kvkk-latest-request">
            <div className="flex items-center gap-2">
              <span className="text-white/60">Son talebiniz</span>
              <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_LABEL[latest.status].cls}`}>
                {STATUS_LABEL[latest.status].text}
              </span>
              <span className="text-white/40 text-xs">{formatTRDate(latest.createdAt)}</span>
            </div>
            {latest.adminNote && <p className="text-white/70">{latest.adminNote}</p>}
          </div>
        )}

        {!hasPending && (
          <div className="space-y-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Eklemek istediğiniz not (isteğe bağlı)"
              className="w-full px-4 py-3 bg-white/5 border border-white/12 rounded-md text-white placeholder:text-white/30 focus:outline-none focus:border-white transition-colors text-sm"
              data-testid="input-kvkk-note"
            />
            {confirming ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  data-testid="button-kvkk-confirm-delete"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Evet, talebi gönder
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="px-4 py-2 bg-[#151515] hover:bg-white/8 rounded-xl text-sm font-medium text-white transition-colors"
                >
                  Vazgeç
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#151515] hover:bg-white/8 rounded-xl text-sm font-medium text-white transition-colors"
                data-testid="button-kvkk-request-delete"
              >
                <Trash2 className="w-4 h-4" />
                Silme Talebi Oluştur
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
