import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Globe,
  Plus,
  RefreshCcw,
  RefreshCw,
  Trash2,
  Pencil,
  CheckCircle2,
  XCircle,
  Loader2,
  History,
  Tags,
  AlertTriangle,
  Zap,
  Link2,
  Sparkles,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import AdminModal from './_ui/AdminModal';
import {
  PageHeader,
  Card,
  EmptyState,
  LoadingState,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  IconButton,
  StatusBadge,
  FormField,
  TextInput,
  SelectInput,
  SearchInput,
  InlineAlert,
  SectionHeading,
} from './_ui/AdminUI';

type CredentialField = {
  key: string;
  label: string;
  type: 'text' | 'password';
  required: boolean;
  helpText?: string;
};

type AdapterMeta = {
  type: string;
  displayName: string;
  credentialFields: CredentialField[];
};

type Marketplace = {
  id: string;
  type: string;
  name: string;
  isActive: boolean;
  config: Record<string, unknown>;
  maskedCredentials: Record<string, string>;
  lastFullSyncAt: string | null;
  lastDeltaSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SyncRun = {
  id: string;
  marketplaceId: string;
  mode: 'delta' | 'full';
  status: 'running' | 'completed' | 'partial' | 'failed';
  trigger: 'manual' | 'cron';
  stats: Record<string, number>;
  errors: Array<{ context: string; message: string }>;
  startedAt: string;
  completedAt: string | null;
};

type SiteCategory = { id: string; name: string; slug: string };

type CategoryMapping = {
  id: string;
  marketplaceId: string;
  externalId: string;
  name: string;
  parentExternalId: string | null;
  siteCategoryId: string | null;
};

const RUN_STATUS_TONE: Record<
  SyncRun['status'],
  { label: string; tone: 'blue' | 'emerald' | 'amber' | 'red' }
> = {
  running: { label: 'Çalışıyor', tone: 'blue' },
  completed: { label: 'Başarılı', tone: 'emerald' },
  partial: { label: 'Kısmi', tone: 'amber' },
  failed: { label: 'Hata', tone: 'red' },
};

function formatDate(d: string | null): string {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return d;
  }
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return '…';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(ms) || ms < 0) return '-';
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}sn`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}dk ${s}sn` : `${m}dk`;
}

function relativeTime(d: string | null): string {
  if (!d) return 'hiç';
  const ms = Date.now() - new Date(d).getTime();
  if (Number.isNaN(ms)) return formatDate(d);
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec} sn önce`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day} gün önce`;
  return formatDate(d);
}

export default function MarketplacesTab({
  siteCategories,
}: {
  siteCategories: SiteCategory[];
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [historyForId, setHistoryForId] = useState<string | null>(null);
  const [mappingsForId, setMappingsForId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const adaptersQuery = useQuery<AdapterMeta[]>({
    queryKey: ['/api/admin/marketplaces/adapters'],
  });
  const marketplacesQuery = useQuery<Marketplace[]>({
    queryKey: ['/api/admin/marketplaces'],
    refetchInterval: 15_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/admin/marketplaces/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/admin/marketplaces'] });
      toast({ title: 'Pazaryeri silindi' });
      setDeletingId(null);
    },
    onError: (err: Error) =>
      toast({ title: 'Silme başarısız', description: err.message, variant: 'destructive' }),
  });

  const adapters = adaptersQuery.data ?? [];
  const marketplaces = marketplacesQuery.data ?? [];
  const editing = editingId ? marketplaces.find((m) => m.id === editingId) ?? null : null;
  const deleting = deletingId ? marketplaces.find((m) => m.id === deletingId) ?? null : null;

  return (
    <div className="space-y-5" data-testid="tab-marketplaces">
      <PageHeader
        title="Pazaryerleri"
        description="Trendyol gibi pazaryerlerinden katalog (kategori, ürün, görsel, stok, fiyat) tek yönde otomatik senkronlanır."
        actions={
          <>
            <SecondaryButton
              onClick={() =>
                qc.invalidateQueries({ queryKey: ['/api/admin/marketplaces'] })
              }
              disabled={marketplacesQuery.isFetching}
              data-testid="button-refresh-marketplaces"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${marketplacesQuery.isFetching ? 'animate-spin' : ''}`}
              />
              Yenile
            </SecondaryButton>
            <PrimaryButton
              onClick={() => setCreating(true)}
              data-testid="button-add-marketplace"
            >
              <Plus className="w-3.5 h-3.5" />
              Pazaryeri Ekle
            </PrimaryButton>
          </>
        }
      />

      {marketplacesQuery.isError && (
        <InlineAlert tone="error">
          Pazaryerleri yüklenemedi. Lütfen sayfayı yenileyin.
        </InlineAlert>
      )}

      {marketplaces.length > 0 && (
        <ProvidersHealthSummary
          marketplaces={marketplaces}
          onOpenHistory={(id) => setHistoryForId(id)}
          onEdit={(id) => setEditingId(id)}
        />
      )}

      {marketplacesQuery.isLoading ? (
        <Card className="p-6">
          <LoadingState />
        </Card>
      ) : marketplaces.length === 0 ? (
        <Card>
          <EmptyState
            icon={Globe}
            title="Henüz bir pazaryeri bağlanmamış"
            description="Trendyol satıcı bilgilerinizi ekleyerek katalogu otomatik çekmeye başlayın."
            action={
              <PrimaryButton
                onClick={() => setCreating(true)}
                data-testid="button-add-marketplace-empty"
              >
                <Plus className="w-3.5 h-3.5" />
                Pazaryeri Ekle
              </PrimaryButton>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {marketplaces.map((mp) => (
            <MarketplaceCard
              key={mp.id}
              mp={mp}
              onEdit={() => setEditingId(mp.id)}
              onDelete={() => setDeletingId(mp.id)}
              onHistory={() => setHistoryForId(mp.id)}
              onMappings={() => setMappingsForId(mp.id)}
            />
          ))}
        </div>
      )}

      {(creating || editing) && (
        <MarketplaceFormDialog
          adapters={adapters}
          existing={editing}
          open={creating || !!editing}
          onClose={() => {
            setCreating(false);
            setEditingId(null);
          }}
        />
      )}

      {historyForId && (
        <SyncHistoryDialog
          marketplaceId={historyForId}
          open={!!historyForId}
          onClose={() => setHistoryForId(null)}
        />
      )}

      {mappingsForId && (
        <CategoryMappingsDialog
          marketplaceId={mappingsForId}
          siteCategories={siteCategories}
          open={!!mappingsForId}
          onClose={() => setMappingsForId(null)}
        />
      )}

      <DeleteConfirmModal
        marketplace={deleting}
        open={!!deleting}
        onClose={() => setDeletingId(null)}
        onConfirm={(id) => deleteMutation.mutate(id)}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

// ============================================================================
// Providers Health Summary (page-level warning band)
// ============================================================================
type ProviderIssue = {
  marketplaceId: string;
  marketplaceName: string;
  severity: 'error' | 'warning';
  reason: string;
  detail?: string;
  action: 'history' | 'edit';
};

function ProvidersHealthSummary({
  marketplaces,
  onOpenHistory,
  onEdit,
}: {
  marketplaces: Marketplace[];
  onOpenHistory: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  // Fetch latest run for every marketplace in parallel; cache is shared
  // with each card's own `latestRunQuery` (same queryKey + queryFn).
  const runResults = useQueries({
    queries: marketplaces.map((mp) => ({
      queryKey: ['/api/admin/marketplaces', mp.id, 'sync-runs', 'latest'] as const,
      queryFn: async () => {
        const res = await apiRequest(
          'GET',
          `/api/admin/marketplaces/${mp.id}/sync-runs?limit=1`,
        );
        return (await res.json()) as SyncRun[];
      },
      refetchInterval: 5000,
    })),
  });

  const issues: ProviderIssue[] = [];
  marketplaces.forEach((mp, i) => {
    // 1) Active provider with no credentials saved → cannot sync
    if (mp.isActive && Object.keys(mp.maskedCredentials ?? {}).length === 0) {
      issues.push({
        marketplaceId: mp.id,
        marketplaceName: mp.name,
        severity: 'error',
        reason: 'Kimlik bilgisi eksik',
        detail: 'API anahtarları girilmeden senkron yapılamaz.',
        action: 'edit',
      });
      return;
    }
    const latest = (runResults[i]?.data ?? [])[0];
    if (!latest) return;
    if (latest.status === 'failed') {
      const firstErr = latest.errors?.[0];
      issues.push({
        marketplaceId: mp.id,
        marketplaceName: mp.name,
        severity: 'error',
        reason: 'Son senkron başarısız',
        detail: firstErr ? `${firstErr.context}: ${firstErr.message}` : undefined,
        action: 'history',
      });
    } else if (latest.status === 'partial' && (latest.errors?.length ?? 0) > 0) {
      const firstErr = latest.errors[0];
      issues.push({
        marketplaceId: mp.id,
        marketplaceName: mp.name,
        severity: 'warning',
        reason: `Son senkron kısmi (${latest.errors.length} hata)`,
        detail: firstErr ? `${firstErr.context}: ${firstErr.message}` : undefined,
        action: 'history',
      });
    }
  });

  if (issues.length === 0) return null;

  const hasError = issues.some((i) => i.severity === 'error');

  return (
    <InlineAlert tone={hasError ? 'error' : 'warning'}>
      <div data-testid="providers-health-summary">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-medium">
              {issues.length === 1
                ? '1 pazaryerinde dikkat gereken bir durum var'
                : `${issues.length} pazaryerinde dikkat gereken durumlar var`}
            </div>
            <ul className="mt-1.5 space-y-1">
              {issues.map((issue) => (
                <li
                  key={issue.marketplaceId}
                  className="text-[12px] flex items-start gap-1.5"
                  data-testid={`health-issue-${issue.marketplaceId}`}
                >
                  <span className="opacity-70 shrink-0">·</span>
                  <span className="min-w-0 flex-1">
                    <strong className="font-medium">{issue.marketplaceName}</strong>
                    <span className="opacity-80"> - {issue.reason}</span>
                    {issue.detail && (
                      <span className="block opacity-70 truncate text-[11px] mt-0.5">
                        {issue.detail}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      issue.action === 'edit'
                        ? onEdit(issue.marketplaceId)
                        : onOpenHistory(issue.marketplaceId)
                    }
                    className="text-[11px] underline underline-offset-2 hover:no-underline shrink-0"
                    data-testid={`button-resolve-${issue.marketplaceId}`}
                  >
                    {issue.action === 'edit' ? 'Düzenle' : 'Geçmiş'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </InlineAlert>
  );
}

// ============================================================================
// Marketplace Card
// ============================================================================
function MarketplaceCard({
  mp,
  onEdit,
  onDelete,
  onHistory,
  onMappings,
}: {
  mp: Marketplace;
  onEdit: () => void;
  onDelete: () => void;
  onHistory: () => void;
  onMappings: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const syncMutation = useMutation({
    mutationFn: async ({ id, mode }: { id: string; mode: 'delta' | 'full' }) => {
      await apiRequest('POST', `/api/admin/marketplaces/${id}/sync-now`, { mode });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['/api/admin/marketplaces'] });
      qc.invalidateQueries({
        queryKey: ['/api/admin/marketplaces', mp.id, 'sync-runs', 'latest'],
      });
      toast({ title: `Senkron başlatıldı (${vars.mode === 'full' ? 'tam' : 'delta'})` });
    },
    onError: (err: Error) =>
      toast({ title: 'Başlatılamadı', description: err.message, variant: 'destructive' }),
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', `/api/admin/marketplaces/${id}/test-connection`);
      return (await res.json()) as { ok: boolean; message: string };
    },
    onSuccess: (data) => {
      toast({
        title: data.ok ? 'Bağlantı başarılı' : 'Bağlantı başarısız',
        description: data.message,
        variant: data.ok ? 'default' : 'destructive',
      });
    },
    onError: (err: Error) =>
      toast({ title: 'Bağlantı hatası', description: err.message, variant: 'destructive' }),
  });

  // Kategori ağacı snapshot'ını "stale" olarak işaretle.
  // Bir sonraki tam senkron yeniden indirir; idle'ken sunucu üzerinde
  // ağır iş tetiklemiyoruz.
  const refreshCategoryCacheMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('POST', `/api/admin/marketplaces/${id}/refresh-category-cache`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/admin/marketplaces'] });
      toast({
        title: 'Kategori cache yenilendi',
        description: 'Bir sonraki tam senkron pazaryeri kategorilerini yeniden indirecek.',
      });
    },
    onError: (err: Error) =>
      toast({
        title: 'Yenilenemedi',
        description: err.message,
        variant: 'destructive',
      }),
  });

  // Latest run (running indicator + last result).
  // Çalışırken sıkı poll (1.5sn), aksi halde 5sn — ilerleme barı canlı hissetsin
  // ama bekleme/idle hâlinde sunucuyu yormasın.
  const latestRunQuery = useQuery<SyncRun[]>({
    queryKey: ['/api/admin/marketplaces', mp.id, 'sync-runs', 'latest'],
    queryFn: async () => {
      const res = await apiRequest(
        'GET',
        `/api/admin/marketplaces/${mp.id}/sync-runs?limit=1`,
      );
      return await res.json();
    },
    refetchInterval: (query) => {
      const latest = (query.state.data as SyncRun[] | undefined)?.[0];
      return latest?.status === 'running' ? 1500 : 5000;
    },
  });
  const latestRun = (latestRunQuery.data ?? [])[0];
  const isRunning = latestRun?.status === 'running';

  // Mappings — for unmatched count
  const mappingsQuery = useQuery<CategoryMapping[]>({
    queryKey: ['/api/admin/marketplaces', mp.id, 'category-mappings'],
    queryFn: async () => {
      const res = await apiRequest(
        'GET',
        `/api/admin/marketplaces/${mp.id}/category-mappings`,
      );
      return await res.json();
    },
    staleTime: 30_000,
  });
  const mappings = mappingsQuery.data ?? [];
  const unmatchedCount = mappings.filter((m) => !m.siteCategoryId).length;

  return (
    <Card
      className="p-5 flex flex-col gap-4"
      data-testid={`card-marketplace-${mp.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-9 h-9 rounded-md bg-neutral-50 border border-neutral-200 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="min-w-0">
              <h3
                className="text-[14px] font-semibold text-neutral-900 truncate"
                data-testid={`text-marketplace-name-${mp.id}`}
              >
                {mp.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-neutral-500 capitalize">{mp.type}</span>
                <span className="text-neutral-300 text-[11px]">·</span>
                {mp.isActive ? (
                  <StatusBadge tone="emerald">Aktif</StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">Pasif</StatusBadge>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <IconButton
            onClick={onEdit}
            aria-label="Düzenle"
            data-testid={`button-edit-marketplace-${mp.id}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton
            tone="danger"
            onClick={onDelete}
            aria-label="Sil"
            data-testid={`button-delete-marketplace-${mp.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </div>

      {/* Status row */}
      <div className="grid grid-cols-2 gap-2">
        <StatTile
          label="Son tam senkron"
          value={relativeTime(mp.lastFullSyncAt)}
          tone="neutral"
        />
        <StatTile
          label="Son hızlı senkron"
          value={relativeTime(mp.lastDeltaSyncAt)}
          tone="neutral"
        />
        <StatTile
          label="Eşleşmemiş kategori"
          value={
            mappingsQuery.isLoading
              ? '-'
              : unmatchedCount === 0
                ? 'Tümü eşli'
                : `${unmatchedCount}`
          }
          tone={unmatchedCount > 0 ? 'amber' : 'emerald'}
          testId={`text-unmatched-${mp.id}`}
        />
        <StatTile
          label="Son çalışma"
          value={
            latestRun
              ? isRunning
                ? `${RUN_STATUS_TONE[latestRun.status].label} (${latestRun.mode})`
                : `${RUN_STATUS_TONE[latestRun.status].label} · ${formatDuration(latestRun.startedAt, latestRun.completedAt)}`
              : 'Henüz çalışma yok'
          }
          tone={
            latestRun ? RUN_STATUS_TONE[latestRun.status].tone : 'neutral'
          }
          loading={isRunning}
          testId={
            latestRun
              ? isRunning
                ? `badge-running-${mp.id}`
                : `badge-last-run-${mp.id}`
              : undefined
          }
        />
      </div>

      {/* Live progress bar (running) — fades out shortly after completion */}
      <LiveProgressBar mp={mp} latestRun={latestRun} />

      {/* Hata özet paneli — gruplanmış (4xx/5xx/network/parse + imagesFailed).
          errorSummary varsa onu göster (yeni format), yoksa eski "ilk hatayı göster"
          davranışına düş. */}
      {latestRun &&
        !isRunning &&
        latestRun.errors &&
        latestRun.errors.length > 0 && (
          <ErrorSummaryPanel
            errors={latestRun.errors as Array<{ context: string; message: string }>}
            errorSummary={
              (latestRun as unknown as { errorSummary?: ErrorSummaryShape | null })
                .errorSummary ?? null
            }
            tone={latestRun.status === 'failed' ? 'error' : 'warning'}
            onView={onHistory}
            mpId={mp.id}
          />
        )}

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <PrimaryButton
          onClick={() => syncMutation.mutate({ id: mp.id, mode: 'full' })}
          disabled={syncMutation.isPending || isRunning}
          data-testid={`button-sync-now-full-${mp.id}`}
        >
          {syncMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCcw className="w-3.5 h-3.5" />
          )}
          Tam Senkron
        </PrimaryButton>
        <SecondaryButton
          onClick={() => syncMutation.mutate({ id: mp.id, mode: 'delta' })}
          disabled={syncMutation.isPending || isRunning}
          data-testid={`button-sync-now-delta-${mp.id}`}
        >
          <Zap className="w-3.5 h-3.5" />
          Hızlı (Stok/Fiyat)
        </SecondaryButton>
        <SecondaryButton
          onClick={() => testConnectionMutation.mutate(mp.id)}
          disabled={testConnectionMutation.isPending}
          data-testid={`button-test-connection-${mp.id}`}
        >
          {testConnectionMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Link2 className="w-3.5 h-3.5" />
          )}
          Bağlantıyı Test Et
        </SecondaryButton>
        <div className="flex-1" />
        <GhostButton onClick={onHistory} data-testid={`button-history-${mp.id}`}>
          <History className="w-3.5 h-3.5" />
          Geçmiş
        </GhostButton>
        <GhostButton onClick={onMappings} data-testid={`button-mappings-${mp.id}`}>
          <Tags className="w-3.5 h-3.5" />
          Kategori Eşleme
        </GhostButton>
        <GhostButton
          onClick={() => refreshCategoryCacheMutation.mutate(mp.id)}
          disabled={refreshCategoryCacheMutation.isPending || isRunning}
          data-testid={`button-refresh-category-cache-${mp.id}`}
        >
          {refreshCategoryCacheMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCcw className="w-3.5 h-3.5" />
          )}
          Kategori cache'ini yenile
        </GhostButton>
      </div>

      {/* Credentials footer */}
      {Object.keys(mp.maskedCredentials).length > 0 && (
        <div className="border-t border-neutral-100 pt-3 grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(mp.maskedCredentials).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-neutral-500 truncate">{k}</span>
              <span className="font-mono text-neutral-700 truncate">{v}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// Live Progress Bar — kart üzerinde çalışan run için ince yatay bar.
// - status === 'running' iken görünür.
// - Bitince (status değişince) 0.5sn sonra solar.
// - expectedTotal yoksa indeterminate animasyon, varsa determinate %.
// - "X / Y ürün · NN%" + (yeterli veri varsa) "Tahmini kalan: X dk"
// ============================================================================
function LiveProgressBar({
  mp,
  latestRun,
}: {
  mp: Marketplace;
  latestRun: SyncRun | undefined;
}) {
  const isRunning = latestRun?.status === 'running';
  // Solma için: çalışıyor → görünür; bittiğinde 500ms görünür kalsın, sonra gizle.
  const [visible, setVisible] = useState<boolean>(isRunning);
  // Son görünen run'ı tut ki fade-out sırasında bilgi kaybolmasın.
  const lastRunRef = useRef<SyncRun | undefined>(latestRun);
  useEffect(() => {
    if (isRunning) {
      lastRunRef.current = latestRun;
      setVisible(true);
      return;
    }
    if (!visible) return;
    // Bittiğinde son snapshot'ı dondur, kısa bir an sonra gizle.
    if (latestRun) lastRunRef.current = latestRun;
    const t = window.setTimeout(() => setVisible(false), 500);
    return () => window.clearTimeout(t);
  }, [isRunning, latestRun, visible]);

  if (!visible) return null;
  const run = lastRunRef.current ?? latestRun;
  if (!run) return null;

  const stats = (run.stats ?? {}) as Record<string, unknown>;
  const processed = Math.max(0, Number(stats.processedTotal ?? 0));
  const expected = Math.max(0, Number(stats.expectedTotal ?? 0));
  const determinate = expected > 0;
  // Canlı satır: hangi ürün, hangi sayfa, kaç retry. Sadece çalışıyorsa göster.
  const currentProductName =
    typeof stats.currentProductName === 'string' ? stats.currentProductName : null;
  const currentPage =
    typeof stats.currentPage === 'number' ? stats.currentPage : null;
  const retried = Math.max(0, Number(stats.retriedRequests ?? 0));
  const recovered = Math.max(0, Number(stats.recoveredRequests ?? 0));
  const pct = determinate
    ? Math.min(100, Math.round((processed / Math.max(1, expected)) * 100))
    : 0;

  // ETA: yalnız anlamlı veri varsa göster (>5sn geçmiş, en az 5 ürün işlenmiş,
  // determinate ve en az 1 ürün kalmış).
  let etaLabel: string | null = null;
  if (isRunning && determinate && processed >= 5 && processed < expected) {
    const elapsedMs = Date.now() - new Date(run.startedAt).getTime();
    if (elapsedMs > 5_000) {
      const perItemMs = elapsedMs / processed;
      const remainingMs = perItemMs * (expected - processed);
      const remainingSec = Math.round(remainingMs / 1000);
      if (remainingSec < 60) {
        etaLabel = `~${remainingSec} sn kaldı`;
      } else if (remainingSec < 60 * 60) {
        etaLabel = `~${Math.round(remainingSec / 60)} dk kaldı`;
      } else {
        const h = Math.floor(remainingSec / 3600);
        const m = Math.round((remainingSec % 3600) / 60);
        etaLabel = m ? `~${h}sa ${m}dk kaldı` : `~${h}sa kaldı`;
      }
    }
  }

  const modeLabel = run.mode === 'full' ? 'Tam senkron' : 'Hızlı senkron';
  const opacityClass = isRunning ? 'opacity-100' : 'opacity-0';

  return (
    <div
      className={`transition-opacity duration-500 ${opacityClass}`}
      data-testid={`progress-sync-${mp.id}`}
      aria-hidden={!isRunning}
    >
      <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Loader2 className="w-3 h-3 animate-spin text-blue-600 shrink-0" />
          <span className="font-medium text-neutral-700 truncate">
            {modeLabel}
          </span>
          {determinate && (
            <span
              className="text-neutral-500 shrink-0"
              data-testid={`text-progress-count-${mp.id}`}
            >
              · {processed.toLocaleString('tr-TR')} / {expected.toLocaleString('tr-TR')} ürün
            </span>
          )}
          {!determinate && processed > 0 && (
            <span className="text-neutral-500 shrink-0">
              · {processed.toLocaleString('tr-TR')} ürün
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 text-neutral-500">
          {etaLabel && (
            <span data-testid={`text-progress-eta-${mp.id}`}>{etaLabel}</span>
          )}
          {determinate && (
            <span
              className="font-mono tabular-nums text-neutral-700"
              data-testid={`text-progress-pct-${mp.id}`}
            >
              {pct}%
            </span>
          )}
        </div>
      </div>
      <div
        className="h-1.5 w-full rounded-full bg-neutral-200/80 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={determinate ? pct : undefined}
        aria-label={`${modeLabel} ilerlemesi`}
      >
        {determinate ? (
          <div
            className="h-full bg-blue-500 transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div className="h-full w-1/3 bg-blue-500 rounded-full animate-progress-indeterminate" />
        )}
      </div>
      {/* Detay satırı: şu anki ürün / sayfa / retry — sadece çalışıyorsa anlamlı */}
      {isRunning && (currentProductName || currentPage !== null || retried > 0) && (
        <div
          className="mt-1 flex items-center gap-2 text-[10.5px] text-neutral-500"
          data-testid={`text-progress-detail-${mp.id}`}
        >
          {currentProductName && (
            <span
              className="truncate min-w-0 flex-1"
              title={currentProductName}
              data-testid={`text-progress-product-${mp.id}`}
            >
              <span className="opacity-60">İşlenen:</span>{' '}
              <span className="text-neutral-700">{currentProductName}</span>
            </span>
          )}
          <span className="flex items-center gap-2 shrink-0 tabular-nums">
            {currentPage !== null && (
              <span data-testid={`text-progress-page-${mp.id}`}>
                Sayfa #{currentPage + 1}
              </span>
            )}
            {retried > 0 && (
              <span
                className="text-amber-600"
                title={`${recovered} başarılı yeniden deneme`}
                data-testid={`text-progress-retried-${mp.id}`}
              >
                ↻ {retried}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ErrorSummaryPanel — sync hatalarını gruplanmış göster (4xx/5xx/network/parse).
// errorSummary jsonb yoksa eski "ilk hatayı göster" davranışına yumuşak düşer.
// ============================================================================
type ErrorBucket = { count: number; samples: string[] };
type ErrorSummaryShape = {
  http4xx?: ErrorBucket;
  http5xx?: ErrorBucket;
  network?: ErrorBucket;
  parse?: ErrorBucket;
  other?: ErrorBucket;
  imagesFailed?: number;
};

const ERROR_BUCKET_META: Array<{
  key: keyof ErrorSummaryShape;
  label: string;
  className: string;
}> = [
  { key: 'http4xx', label: '4xx', className: 'bg-amber-100 text-amber-800' },
  { key: 'http5xx', label: '5xx', className: 'bg-red-100 text-red-800' },
  { key: 'network', label: 'Ağ', className: 'bg-orange-100 text-orange-800' },
  { key: 'parse', label: 'Parse', className: 'bg-purple-100 text-purple-800' },
  { key: 'other', label: 'Diğer', className: 'bg-neutral-200 text-neutral-700' },
];

function ErrorSummaryPanel({
  errors,
  errorSummary,
  tone,
  onView,
  mpId,
}: {
  errors: Array<{ context: string; message: string }>;
  errorSummary: ErrorSummaryShape | null;
  tone: 'error' | 'warning';
  onView: () => void;
  mpId: string;
}) {
  const totalErrors = errors.length;
  const imagesFailed =
    typeof errorSummary?.imagesFailed === 'number' ? errorSummary.imagesFailed : 0;
  // İçi dolu (count>0) bucket'ları seç. errorSummary yoksa boş kalır → fallback.
  const buckets = errorSummary
    ? ERROR_BUCKET_META.map((m) => ({
        ...m,
        bucket: (errorSummary[m.key] ?? null) as ErrorBucket | null,
      })).filter((x) => (x.bucket?.count ?? 0) > 0)
    : [];

  return (
    <InlineAlert tone={tone}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-medium">
            Son çalışmada {totalErrors} hata oluştu
            {imagesFailed > 0 && (
              <span className="ml-1.5 opacity-70">· {imagesFailed} görsel atlandı</span>
            )}
          </div>
          {buckets.length > 0 ? (
            <div
              className="mt-1.5 flex flex-wrap gap-1.5"
              data-testid={`error-summary-${mpId}`}
            >
              {buckets.map((b) => (
                <span
                  key={b.key}
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium ${b.className}`}
                  title={b.bucket?.samples?.join('\n') ?? ''}
                  data-testid={`error-bucket-${b.key}-${mpId}`}
                >
                  {b.label}
                  <span className="font-mono tabular-nums">{b.bucket?.count ?? 0}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-0.5 text-[11px] truncate opacity-80">
              <span className="opacity-70">{errors[0].context}:</span>{' '}
              {errors[0].message}
            </div>
          )}
          {/* En sık görülen örnek (ilk dolu bucket'tan ilk örnek) */}
          {buckets.length > 0 && buckets[0].bucket?.samples?.[0] && (
            <div className="mt-1 text-[11px] opacity-70 truncate">
              {buckets[0].bucket.samples[0]}
            </div>
          )}
          <button
            type="button"
            onClick={onView}
            className="mt-1 text-[11px] underline underline-offset-2 hover:no-underline"
            data-testid={`button-view-errors-${mpId}`}
          >
            Tümünü gör →
          </button>
        </div>
      </div>
    </InlineAlert>
  );
}

function StatTile({
  label,
  value,
  tone = 'neutral',
  loading,
  testId,
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'emerald' | 'amber' | 'red' | 'blue';
  loading?: boolean;
  testId?: string;
}) {
  const valueClass =
    tone === 'emerald'
      ? 'text-emerald-700'
      : tone === 'amber'
        ? 'text-amber-700'
        : tone === 'red'
          ? 'text-red-700'
          : tone === 'blue'
            ? 'text-blue-700'
            : 'text-neutral-900';
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50/40 px-3 py-2">
      <div className="text-[10.5px] uppercase tracking-wider text-neutral-500 font-medium">
        {label}
      </div>
      <div
        className={`text-[12.5px] font-semibold mt-0.5 flex items-center gap-1.5 ${valueClass}`}
        data-testid={testId}
      >
        {loading && <Loader2 className="w-3 h-3 animate-spin" />}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Marketplace Form Dialog
// ============================================================================
function MarketplaceFormDialog({
  adapters,
  existing,
  open,
  onClose,
}: {
  adapters: AdapterMeta[];
  existing: Marketplace | null;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [type, setType] = useState<string>(existing?.type ?? 'trendyol');
  const [name, setName] = useState<string>(existing?.name ?? 'Trendyol');
  const [isActive, setIsActive] = useState<boolean>(existing?.isActive ?? true);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const fields = adapters.find((a) => a.type === type)?.credentialFields ?? [];

  function updateCredential(key: string, value: string) {
    setCredentials((prev) => ({ ...prev, [key]: value }));
    setTestResult(null);
  }

  const testCredsMutation = useMutation({
    mutationFn: async () => {
      const filled = Object.fromEntries(
        Object.entries(credentials).filter(([, v]) => v && v.trim().length > 0),
      );
      if (existing) {
        const required = fields.filter((f) => f.required);
        const missing = required.filter((f) => !filled[f.key]);
        if (missing.length > 0) {
          const res = await apiRequest(
            'POST',
            `/api/admin/marketplaces/${existing.id}/test-connection`,
          );
          return (await res.json()) as { ok: boolean; message: string };
        }
      } else {
        const required = fields.filter((f) => f.required);
        for (const f of required) {
          if (!filled[f.key]) throw new Error(`${f.label} zorunlu`);
        }
      }
      const res = await apiRequest('POST', `/api/admin/marketplaces/test-credentials`, {
        type,
        credentials: filled,
        config: {},
      });
      return (await res.json()) as { ok: boolean; message: string };
    },
    onSuccess: (r) => {
      setTestResult(r);
      toast({
        title: r.ok ? 'Bağlantı başarılı' : 'Bağlantı başarısız',
        description: r.message,
        variant: r.ok ? 'default' : 'destructive',
      });
    },
    onError: (err: Error) => {
      setTestResult({ ok: false, message: err.message });
      toast({ title: 'Test başarısız', description: err.message, variant: 'destructive' });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { name, isActive };
      const filled = Object.fromEntries(
        Object.entries(credentials).filter(([, v]) => v && v.trim().length > 0),
      );
      if (Object.keys(filled).length > 0) payload.credentials = filled;
      if (existing) {
        await apiRequest('PUT', `/api/admin/marketplaces/${existing.id}`, payload);
      } else {
        const required = fields.filter((f) => f.required);
        for (const f of required) {
          if (!filled[f.key]) throw new Error(`${f.label} zorunlu`);
        }
        await apiRequest('POST', `/api/admin/marketplaces`, {
          type,
          name,
          isActive,
          credentials: filled,
          config: {},
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/admin/marketplaces'] });
      toast({ title: existing ? 'Güncellendi' : 'Eklendi' });
      onClose();
    },
    onError: (err: Error) =>
      toast({ title: 'Kaydedilemedi', description: err.message, variant: 'destructive' }),
  });

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      size="md"
      title={existing ? 'Pazaryerini Düzenle' : 'Pazaryeri Ekle'}
      description={
        existing
          ? 'Bilgileri güncelleyin. Boş bırakılan kredensiyaller mevcut değerini korur.'
          : 'Yeni bir pazaryeri bağlantısı ekleyin.'
      }
      footer={
        <>
          <GhostButton onClick={onClose} data-testid="button-marketplace-cancel">
            İptal
          </GhostButton>
          <PrimaryButton
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            data-testid="button-marketplace-save"
          >
            {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Kaydet
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Tip" required>
            <SelectInput
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={!!existing}
              data-testid="select-marketplace-type"
              className="w-full"
            >
              {adapters.map((a) => (
                <option key={a.type} value={a.type}>
                  {a.displayName}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <FormField label="Ad" required>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-marketplace-name"
            />
          </FormField>
        </div>

        <div className="flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50/40 px-3 py-2.5">
          <div>
            <div className="text-[12.5px] font-medium text-neutral-900">Aktif</div>
            <div className="text-[11px] text-neutral-500">
              Pasif pazaryerleri için zamanlanmış senkronlar çalışmaz.
            </div>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={setIsActive}
            data-testid="switch-marketplace-active"
          />
        </div>

        <div className="space-y-3 border-t border-neutral-100 pt-4">
          <SectionHeading title="Kimlik bilgileri" />
          {fields.length === 0 ? (
            <p className="text-[12px] text-neutral-500">
              Bu sağlayıcı için kredensiyal alanı yok.
            </p>
          ) : (
            <div className="space-y-3">
              {fields.map((f) => (
                <FormField key={f.key} label={f.label} required={f.required} hint={f.helpText}>
                  <TextInput
                    type={f.type === 'password' ? 'password' : 'text'}
                    value={credentials[f.key] ?? ''}
                    onChange={(e) => updateCredential(f.key, e.target.value)}
                    placeholder={
                      existing?.maskedCredentials?.[f.key]
                        ? `Mevcut: ${existing.maskedCredentials[f.key]}`
                        : ''
                    }
                    data-testid={`input-credential-${f.key}`}
                  />
                </FormField>
              ))}
            </div>
          )}
          {existing && (
            <p className="text-[11px] text-neutral-500">
              API anahtarları sunucuda AES-256 ile şifreli saklanır.
            </p>
          )}
        </div>

        <div className="border-t border-neutral-100 pt-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <SecondaryButton
              onClick={() => testCredsMutation.mutate()}
              disabled={testCredsMutation.isPending}
              data-testid="button-test-credentials"
            >
              {testCredsMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Bağlantıyı Test Et
            </SecondaryButton>
            {testResult && (
              <span
                className={`text-[12px] flex items-center gap-1.5 ${
                  testResult.ok ? 'text-emerald-700' : 'text-red-700'
                }`}
                data-testid={`text-test-result-${testResult.ok ? 'ok' : 'fail'}`}
              >
                {testResult.ok ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Başarılı - {testResult.message}
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    {testResult.message}
                  </>
                )}
              </span>
            )}
          </div>
          {!existing && !testResult?.ok && (
            <InlineAlert tone="warning">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  Kayıttan önce <strong>Bağlantıyı Test Et</strong> ile kredensiyalleri
                  doğrulamanız önerilir.
                </span>
              </div>
            </InlineAlert>
          )}
        </div>
      </div>
    </AdminModal>
  );
}

// ============================================================================
// Sync History Dialog
// ============================================================================
function SyncHistoryDialog({
  marketplaceId,
  open,
  onClose,
}: {
  marketplaceId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery<SyncRun[]>({
    queryKey: ['/api/admin/marketplaces', marketplaceId, 'sync-runs'],
    queryFn: async () => {
      const res = await apiRequest(
        'GET',
        `/api/admin/marketplaces/${marketplaceId}/sync-runs?limit=20`,
      );
      return await res.json();
    },
    refetchInterval: 5000,
    enabled: open,
  });

  const runs = data ?? [];

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      size="xl"
      title="Senkron Geçmişi"
      description="Son 20 senkron çalışması."
      footer={
        <GhostButton onClick={onClose} data-testid="button-history-close">
          Kapat
        </GhostButton>
      }
    >
      {isLoading ? (
        <LoadingState />
      ) : runs.length === 0 ? (
        <EmptyState
          icon={History}
          title="Henüz senkron çalışması yok"
          description="Tam veya hızlı bir senkron başlatarak ilk çalışmayı oluşturun."
        />
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-200 bg-neutral-50/50">
                <th className="px-3 py-2 font-medium">Başlangıç</th>
                <th className="px-3 py-2 font-medium">Süre</th>
                <th className="px-3 py-2 font-medium">Mod</th>
                <th className="px-3 py-2 font-medium">Tetik</th>
                <th className="px-3 py-2 font-medium">Durum</th>
                <th className="px-3 py-2 font-medium text-right">Eklenen</th>
                <th className="px-3 py-2 font-medium text-right">Güncel.</th>
                <th
                  className="px-3 py-2 font-medium text-right"
                  title="Soft-delete edilen"
                >
                  Gizlenen
                </th>
                <th
                  className="px-3 py-2 font-medium text-right"
                  title="Yeniden aktive edilen"
                >
                  Yen. Aktif
                </th>
                <th className="px-3 py-2 font-medium text-right">Hata</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const tone = RUN_STATUS_TONE[r.status];
                return (
                  <Fragment key={r.id}>
                    <tr className="border-b border-neutral-100">
                      <td className="px-3 py-2 text-neutral-700 whitespace-nowrap">
                        {formatDate(r.startedAt)}
                      </td>
                      <td
                        className="px-3 py-2 text-neutral-700 tabular-nums"
                        data-testid={`text-duration-${r.id}`}
                      >
                        {formatDuration(r.startedAt, r.completedAt)}
                      </td>
                      <td className="px-3 py-2 text-neutral-700 capitalize">{r.mode}</td>
                      <td className="px-3 py-2 text-neutral-500 capitalize">{r.trigger}</td>
                      <td className="px-3 py-2">
                        <span data-testid={`badge-status-${r.status}`}>
                          <StatusBadge tone={tone.tone}>{tone.label}</StatusBadge>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-neutral-700 text-right tabular-nums">
                        {r.stats?.productsAdded ?? 0}
                      </td>
                      <td className="px-3 py-2 text-neutral-700 text-right tabular-nums">
                        {r.stats?.productsUpdated ?? 0}
                      </td>
                      <td
                        className="px-3 py-2 text-amber-700 text-right tabular-nums"
                        data-testid={`text-deactivated-${r.id}`}
                      >
                        {r.stats?.productsDeactivated ?? 0}
                      </td>
                      <td
                        className="px-3 py-2 text-emerald-700 text-right tabular-nums"
                        data-testid={`text-reactivated-${r.id}`}
                      >
                        {r.stats?.productsReactivated ?? 0}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${
                          (r.errors?.length ?? 0) > 0 ? 'text-red-700' : 'text-neutral-400'
                        }`}
                      >
                        <div>{r.errors?.length ?? 0}</div>
                        {(() => {
                          const retried = Number(r.stats?.retriedRequests ?? 0);
                          const recovered = Number(r.stats?.recoveredRequests ?? 0);
                          if (retried <= 0 && recovered <= 0) return null;
                          return (
                            <div
                              className="text-[10px] text-neutral-500 mt-0.5"
                              title={`${retried} yeniden deneme · ${recovered} kurtarıldı`}
                              data-testid={`text-retries-${r.id}`}
                            >
                              ↻{retried}{recovered > 0 ? ` ✓${recovered}` : ''}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                    {(r.errors?.length ?? 0) > 0 && (
                      <tr className="border-b border-neutral-100 bg-red-50/30">
                        <td colSpan={10} className="px-3 py-2">
                          <details data-testid={`details-errors-${r.id}`}>
                            <summary className="cursor-pointer text-[11px] text-red-700 select-none flex items-center gap-1.5 hover:underline">
                              <AlertTriangle className="w-3 h-3" />
                              Hata özetlerini göster ({r.errors.length})
                            </summary>
                            <ul className="mt-2 space-y-1 text-[11px] text-red-800/90 font-mono">
                              {r.errors.slice(0, 5).map((e, i) => (
                                <li
                                  key={i}
                                  className="pl-2 border-l-2 border-red-300"
                                  data-testid={`text-error-${r.id}-${i}`}
                                >
                                  <span className="text-red-600/70">{e.context}:</span>{' '}
                                  {e.message}
                                </li>
                              ))}
                              {r.errors.length > 5 && (
                                <li className="text-red-600/70">
                                  …ve {r.errors.length - 5} daha
                                </li>
                              )}
                            </ul>
                          </details>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminModal>
  );
}

// ============================================================================
// Category Mappings Dialog
// ============================================================================
function CategoryMappingsDialog({
  marketplaceId,
  siteCategories,
  open,
  onClose,
}: {
  marketplaceId: string;
  siteCategories: SiteCategory[];
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [showOnlyUnmatched, setShowOnlyUnmatched] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string | null>>({});

  const { data, isLoading } = useQuery<CategoryMapping[]>({
    queryKey: ['/api/admin/marketplaces', marketplaceId, 'category-mappings'],
    queryFn: async () => {
      const res = await apiRequest(
        'GET',
        `/api/admin/marketplaces/${marketplaceId}/category-mappings`,
      );
      return await res.json();
    },
    enabled: open,
  });

  type SuggestionDto = {
    marketplaceCategoryId: string;
    siteCategoryId: string;
    score: number;
  };
  const suggestionsQuery = useQuery<SuggestionDto[]>({
    queryKey: ['/api/admin/marketplaces', marketplaceId, 'category-mappings', 'suggestions'],
    queryFn: async () => {
      const res = await apiRequest(
        'GET',
        `/api/admin/marketplaces/${marketplaceId}/category-mappings/suggestions`,
      );
      return await res.json();
    },
    enabled: open,
  });

  const allMappings = data ?? [];
  const suggestionsByMappingId = useMemo(() => {
    const map: Record<string, SuggestionDto> = {};
    for (const s of suggestionsQuery.data ?? []) {
      map[s.marketplaceCategoryId] = s;
    }
    return map;
  }, [suggestionsQuery.data]);
  const siteCategoryNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of siteCategories) m[c.id] = c.name;
    return m;
  }, [siteCategories]);

  const draftCount = Object.keys(drafts).length;

  function effectiveValue(m: CategoryMapping): string | null {
    return m.id in drafts ? drafts[m.id] : m.siteCategoryId;
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = allMappings.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q) && !m.externalId.toLowerCase().includes(q)) {
        return false;
      }
      if (showOnlyUnmatched && effectiveValue(m) !== null) return false;
      return true;
    });
    // Unmatched first
    list = [...list].sort((a, b) => {
      const aUn = effectiveValue(a) === null ? 0 : 1;
      const bUn = effectiveValue(b) === null ? 0 : 1;
      if (aUn !== bUn) return aUn - bUn;
      return a.name.localeCompare(b.name, 'tr');
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMappings, search, showOnlyUnmatched, drafts]);

  const totalUnmatched = allMappings.filter((m) => effectiveValue(m) === null).length;

  function changeDraft(m: CategoryMapping, value: string | null) {
    const original = m.siteCategoryId;
    setDrafts((prev) => {
      const next = { ...prev };
      if (value === original) {
        delete next[m.id];
      } else {
        next[m.id] = value;
      }
      return next;
    });
  }

  // Görselleştirme/uygulama için minimum güven eşiği. Backend her unmatched
  // satır için bir aday döner (skor 0 dahil); UI tarafında çok zayıf
  // adayları gizleyerek/bulk apply'dan çıkararak gürültüyü azaltırız.
  // Kullanıcı manuel olarak her zaman istediği eşlemeyi yapabilir.
  const SUGGESTION_DISPLAY_THRESHOLD = 0.25;
  const SUGGESTION_APPLY_THRESHOLD = 0.4;

  // Henüz eşlenmemiş, draft'ta da değiştirilmemiş ve önerisi güçlü olan
  // satırlar — bulk "Tüm önerileri uygula" akışına alınacaklar.
  const applicableSuggestions = useMemo(() => {
    return allMappings
      .map((m) => {
        const s = suggestionsByMappingId[m.id];
        if (!s) return null;
        if (s.score < SUGGESTION_APPLY_THRESHOLD) return null;
        if (effectiveValue(m) !== null) return null;
        return { mapping: m, suggestion: s };
      })
      .filter((x): x is { mapping: CategoryMapping; suggestion: SuggestionDto } => x !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMappings, suggestionsByMappingId, drafts]);

  function applyAllSuggestions() {
    if (applicableSuggestions.length === 0) return;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const { mapping, suggestion } of applicableSuggestions) {
        if (suggestion.siteCategoryId !== mapping.siteCategoryId) {
          next[mapping.id] = suggestion.siteCategoryId;
        }
      }
      return next;
    });
    toast({
      title: `${applicableSuggestions.length} öneri dolduruldu`,
      description: 'Kaydet ile değişiklikleri onaylayın.',
    });
  }

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(drafts);
      const succeededIds: string[] = [];
      const failedIds: string[] = [];
      for (const [id, siteCategoryId] of entries) {
        try {
          await apiRequest(
            'PUT',
            `/api/admin/marketplaces/${marketplaceId}/category-mappings/${id}`,
            { siteCategoryId },
          );
          succeededIds.push(id);
        } catch {
          failedIds.push(id);
        }
      }
      return { succeededIds, failedIds };
    },
    onSuccess: ({ succeededIds, failedIds }) => {
      qc.invalidateQueries({
        queryKey: ['/api/admin/marketplaces', marketplaceId, 'category-mappings'],
      });
      qc.invalidateQueries({
        queryKey: [
          '/api/admin/marketplaces',
          marketplaceId,
          'category-mappings',
          'suggestions',
        ],
      });
      // Keep failed entries in drafts so retry is one-click; clear successes only
      setDrafts((prev) => {
        const next = { ...prev };
        for (const id of succeededIds) delete next[id];
        return next;
      });
      if (failedIds.length === 0) {
        toast({ title: `${succeededIds.length} eşleme kaydedildi` });
      } else {
        toast({
          title: `${succeededIds.length} kaydedildi, ${failedIds.length} hata`,
          description:
            'Hatalı satırlar düzenleme modunda kaldı. Yeniden Kaydet ile tekrar deneyebilirsiniz.',
          variant: 'destructive',
        });
      }
    },
  });

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      size="lg"
      title="Kategori Eşleme"
      description="Pazaryeri kategorilerini site kategorilerinizle eşleştirin."
      closeOnOutsideClick={draftCount === 0}
      footer={
        <>
          {draftCount > 0 && (
            <span className="text-[12px] text-neutral-500 mr-auto">
              {draftCount} bekleyen değişiklik
            </span>
          )}
          {draftCount > 0 && (
            <GhostButton
              onClick={() => setDrafts({})}
              data-testid="button-discard-mappings"
            >
              Vazgeç
            </GhostButton>
          )}
          <GhostButton onClick={onClose} data-testid="button-mappings-close">
            Kapat
          </GhostButton>
          <PrimaryButton
            onClick={() => saveAllMutation.mutate()}
            disabled={draftCount === 0 || saveAllMutation.isPending}
            data-testid="button-save-mappings"
          >
            {saveAllMutation.isPending && (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            )}
            Kaydet{draftCount > 0 ? ` (${draftCount})` : ''}
          </PrimaryButton>
        </>
      }
    >
      {isLoading ? (
        <LoadingState />
      ) : allMappings.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Henüz kategori çekilmedi"
          description="Önce bir tam senkron çalıştırarak pazaryeri kategorilerini içeri aktarın."
        />
      ) : (
        <div className="space-y-3">
          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1 min-w-0">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Kategori adı veya ID ara…"
                data-testid="input-search-mappings"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowOnlyUnmatched((v) => !v)}
              className={`inline-flex items-center justify-center gap-1.5 h-9 px-3 text-[12px] font-medium rounded-md border transition-colors ${
                showOnlyUnmatched
                  ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                  : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
              data-testid="button-toggle-unmatched"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Sadece eşleşmemiş ({totalUnmatched})
            </button>
            <button
              type="button"
              onClick={applyAllSuggestions}
              disabled={
                suggestionsQuery.isLoading || applicableSuggestions.length === 0
              }
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 text-[12px] font-medium rounded-md border transition-colors bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-apply-all-suggestions"
              title={
                applicableSuggestions.length === 0
                  ? 'Doldurulacak öneri yok'
                  : `${applicableSuggestions.length} eşleşmemiş kategori için öneri var`
              }
            >
              <Sparkles className="w-3.5 h-3.5" />
              Tüm önerileri uygula
              {applicableSuggestions.length > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-violet-200 text-violet-900 text-[10px] font-semibold">
                  {applicableSuggestions.length}
                </span>
              )}
            </button>
          </div>

          {/* Header */}
          <div className="hidden sm:grid grid-cols-[1fr_280px] gap-3 px-3 pb-1 text-[10.5px] uppercase tracking-wider text-neutral-500 font-medium border-b border-neutral-100">
            <div>Pazaryeri Kategorisi</div>
            <div>Site Kategorisi</div>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-[12px] text-neutral-500">
              {search
                ? 'Aramaya uyan kategori yok.'
                : 'Filtrelere uyan kategori yok.'}
            </div>
          ) : (
            <div className="max-h-[55vh] overflow-y-auto -mx-1">
              <ul className="divide-y divide-neutral-100">
                {filtered.map((m) => {
                  const value = effectiveValue(m);
                  const unmatched = value === null;
                  const dirty = m.id in drafts;
                  const suggestion = suggestionsByMappingId[m.id];
                  const suggestionName = suggestion
                    ? siteCategoryNameById[suggestion.siteCategoryId]
                    : undefined;
                  // Çok düşük güveni (gürültü) gösterme; orta-zayıf güveni
                  // gri/muted stilde göster, yüksek güveni vurgulu göster.
                  const showSuggestion =
                    unmatched &&
                    suggestion &&
                    suggestionName !== undefined &&
                    suggestion.score >= SUGGESTION_DISPLAY_THRESHOLD;
                  const suggestionStrong =
                    suggestion && suggestion.score >= SUGGESTION_APPLY_THRESHOLD;
                  return (
                    <li
                      key={m.id}
                      className={`grid grid-cols-1 sm:grid-cols-[1fr_280px] gap-2 sm:gap-3 px-3 py-2.5 ${
                        dirty ? 'bg-amber-50/30' : ''
                      }`}
                      data-testid={`row-mapping-${m.id}`}
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        {unmatched && (
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                            aria-label="eşleşmemiş"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="text-[13px] text-neutral-900 truncate">{m.name}</div>
                          <div className="text-[11px] text-neutral-500 font-mono truncate">
                            id: {m.externalId}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <SelectInput
                          value={value ?? '__none'}
                          onChange={(e) =>
                            changeDraft(m, e.target.value === '__none' ? null : e.target.value)
                          }
                          data-testid={`select-mapping-${m.id}`}
                          className="w-full"
                        >
                          <option value="__none">- Eşleme yok -</option>
                          {siteCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </SelectInput>
                        {showSuggestion && (
                          <button
                            type="button"
                            onClick={() => changeDraft(m, suggestion!.siteCategoryId)}
                            className={`inline-flex items-center gap-1 self-start px-1.5 py-0.5 -mt-0.5 rounded text-[10.5px] font-medium transition-colors max-w-full ${
                              suggestionStrong
                                ? 'text-neutral-600 hover:text-violet-800 hover:bg-violet-50'
                                : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100'
                            }`}
                            title={
                              suggestionStrong
                                ? `Önerilen eşleme - uygulamak için tıkla (skor: ${suggestion!.score.toFixed(2)})`
                                : `Düşük güvenli öneri - manuel kontrol önerilir (skor: ${suggestion!.score.toFixed(2)})`
                            }
                            data-testid={`button-suggestion-${m.id}`}
                          >
                            <Sparkles
                              className={`w-3 h-3 shrink-0 ${suggestionStrong ? 'text-violet-500' : 'text-neutral-400'}`}
                            />
                            <span className="opacity-70 shrink-0">Önerilen:</span>
                            <span className="truncate">{suggestionName}</span>
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

    </AdminModal>
  );
}

// ============================================================================
// Delete Confirm Modal
// ============================================================================
function DeleteConfirmModal({
  marketplace,
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  marketplace: Marketplace | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (id: string) => void;
  isPending: boolean;
}) {
  if (!marketplace) {
    return (
      <AdminModal open={open} onClose={onClose} size="sm" title="">
        <div />
      </AdminModal>
    );
  }
  return (
    <AdminModal
      open={open}
      onClose={onClose}
      size="sm"
      title="Pazaryerini sil"
      description="Bu işlem geri alınamaz. Pazaryeri bağlantısı ve eşlemeleri silinecek."
      testId="modal-delete-marketplace"
      footer={
        <>
          <GhostButton onClick={onClose} data-testid="button-cancel-delete">
            Vazgeç
          </GhostButton>
          <PrimaryButton
            onClick={() => onConfirm(marketplace.id)}
            disabled={isPending}
            data-testid="button-confirm-delete"
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Sil
          </PrimaryButton>
        </>
      }
    >
      <InlineAlert tone="error">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div>
            <strong>{marketplace.name}</strong> adlı pazaryeri silinecek. Bu pazaryerinden
            çekilmiş ürünler ve kategori eşlemeleri etkilenecek.
          </div>
        </div>
      </InlineAlert>
    </AdminModal>
  );
}
