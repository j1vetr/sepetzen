import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

type Status = 'pending' | 'completed' | 'rejected';

interface DeletionRequest {
  id: string;
  userId: string | null;
  email: string;
  fullName: string;
  note: string | null;
  status: Status;
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

const FILTERS: { id: Status | 'all'; label: string }[] = [
  { id: 'pending', label: 'Bekleyen' },
  { id: 'completed', label: 'Tamamlanan' },
  { id: 'rejected', label: 'Reddedilen' },
  { id: 'all', label: 'Tümü' },
];

const BADGE: Record<Status, { text: string; cls: string }> = {
  pending: { text: 'Bekliyor', cls: 'bg-amber-50 text-amber-700' },
  completed: { text: 'Tamamlandı', cls: 'bg-emerald-50 text-emerald-700' },
  rejected: { text: 'Reddedildi', cls: 'bg-red-50 text-red-700' },
};

function RequestCard({ request }: { request: DeletionRequest }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [adminNote, setAdminNote] = useState(request.adminNote ?? '');

  const mutation = useMutation({
    mutationFn: async (status: Status) => {
      await apiRequest('PATCH', `/api/admin/kvkk/requests/${request.id}`, { status, adminNote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/kvkk/requests'] });
      toast({ title: 'Talep güncellendi' });
    },
    onError: (err: Error) => toast({ title: 'Güncellenemedi', description: err.message, variant: 'destructive' }),
  });

  const badge = BADGE[request.status];

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3" data-testid={`card-kvkk-request-${request.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900">{request.fullName}</p>
          <p className="text-xs text-neutral-500">{request.email}</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">{new Date(request.createdAt).toLocaleString('tr-TR')}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${badge.cls}`}>{badge.text}</span>
      </div>

      {request.note && (
        <p className="text-[13px] text-neutral-700 bg-neutral-50 border border-neutral-100 rounded-lg p-3 whitespace-pre-line">
          {request.note}
        </p>
      )}

      <textarea
        value={adminNote}
        onChange={(e) => setAdminNote(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Müşteriye görünecek not"
        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900"
        data-testid={`input-kvkk-admin-note-${request.id}`}
      />

      <div className="flex flex-wrap gap-2">
        {request.status !== 'completed' && (
          <button
            onClick={() => mutation.mutate('completed')}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
            data-testid={`button-kvkk-complete-${request.id}`}
          >
            Tamamlandı olarak işaretle
          </button>
        )}
        {request.status !== 'rejected' && (
          <button
            onClick={() => mutation.mutate('rejected')}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
            data-testid={`button-kvkk-reject-${request.id}`}
          >
            Reddet
          </button>
        )}
        {request.status !== 'pending' && (
          <button
            onClick={() => mutation.mutate('pending')}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
          >
            Beklemeye al
          </button>
        )}
      </div>
    </div>
  );
}

export default function KvkkTab() {
  const [filter, setFilter] = useState<Status | 'all'>('pending');
  const { data, isLoading } = useQuery<DeletionRequest[]>({ queryKey: ['/api/admin/kvkk/requests'] });

  const rows = (data ?? []).filter((r) => filter === 'all' || r.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              filter === f.id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
            }`}
            data-testid={`filter-kvkk-${f.id}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-neutral-500 py-8 text-center">Talep bulunmuyor.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => <RequestCard key={r.id} request={r} />)}
        </div>
      )}
    </div>
  );
}
