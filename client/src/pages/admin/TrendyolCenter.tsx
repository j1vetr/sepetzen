/**
 * Trendyol Merkezi - tüm Trendyol operasyonlarının tek sayfada, sekmeli görünümü.
 *   Genel Bakış: bağlantı/senkron sağlığı, stok-fiyat uyuşmazlık denetimi, hızlı aksiyonlar
 *   Ürünler:     ürün bağlantıları + gönderim sihirbazı (ProductLinksPanel)
 *   Siparişler:  mevcut sipariş sekmesi (paket statüsü + faturalama dahil)
 *   Sorular:     müşteri soruları ve cevaplama
 *   İadeler:     iade talepleri ve onaylama
 *   Kuyruk:      push kuyruğu (PushQueuePanel)
 *   Ayarlar:     pazaryeri bağlantı ayarları (mevcut MarketplacesTab)
 */
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageCircleQuestion,
  PackageOpen,
  RefreshCw,
  Send,
  Settings,
  ShoppingCart,
  Undo2,
  Wrench,
} from 'lucide-react';
import {
  EmptyState,
  LoadingState,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  StatusBadge,
  SelectInput,
  TextArea,
  InlineAlert,
} from './_ui/AdminUI';
import AdminModal from './_ui/AdminModal';
import { ProductLinksPanel, PushQueuePanel } from './MarketplacePushDialogs';
import MarketplaceOrdersTab from './MarketplaceOrdersTab';
import MarketplacesTab from './MarketplacesTab';

type SiteCategory = { id: string; name: string; slug: string };
type Marketplace = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  lastFullSyncAt?: string | null;
  lastDeltaSyncAt?: string | null;
};

type TabId = 'overview' | 'products' | 'orders' | 'questions' | 'claims' | 'queue' | 'settings';

const TABS: Array<{ id: TabId; label: string; icon: typeof Activity }> = [
  { id: 'overview', label: 'Genel Bakış', icon: Activity },
  { id: 'products', label: 'Ürünler', icon: Send },
  { id: 'orders', label: 'Siparişler', icon: ShoppingCart },
  { id: 'questions', label: 'Sorular', icon: MessageCircleQuestion },
  { id: 'claims', label: 'İadeler', icon: Undo2 },
  { id: 'queue', label: 'Kuyruk', icon: PackageOpen },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
];

function fmtDate(d: string | null | undefined): string {
  if (!d) return 'hiç';
  try {
    return new Date(d).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(d);
  }
}

function fmtPrice(n: number): string {
  return n.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' TL';
}

type Capabilities = {
  writes: boolean;
  orders: boolean;
  qna: boolean;
  claims: boolean;
  fulfillment: boolean;
  inventoryLookup: boolean;
};

export default function TrendyolCenter({ siteCategories }: { siteCategories: SiteCategory[] }) {
  const [tab, setTab] = useState<TabId>('overview');

  const mpQuery = useQuery<Marketplace[]>({
    queryKey: ['/api/admin/marketplaces'],
    refetchInterval: 30_000,
  });
  const marketplaces = (mpQuery.data ?? []).filter((m) => m.isActive);
  const [selectedMpId, setSelectedMpId] = useState<string | null>(null);
  const mpId = selectedMpId ?? marketplaces[0]?.id ?? null;

  const capsQuery = useQuery<Capabilities>({
    queryKey: ['/api/admin/marketplaces', mpId, 'capabilities'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/marketplaces/${mpId}/capabilities`);
      return await res.json();
    },
    enabled: !!mpId,
    staleTime: 5 * 60_000,
  });
  const caps = capsQuery.data;

  // Desteklenmeyen yetenek sekmelerini gizle (yetenek bilgisi gelmeden hepsi görünür)
  const visibleTabs = useMemo(
    () =>
      TABS.filter((t) => {
        if (!caps) return true;
        if (t.id === 'questions') return caps.qna;
        if (t.id === 'claims') return caps.claims;
        if (t.id === 'orders') return caps.orders;
        if (t.id === 'products' || t.id === 'queue') return caps.writes;
        return true;
      }),
    [caps],
  );

  // Seçili sekme gizlendiyse genel bakışa dön
  const effectiveTab = visibleTabs.some((t) => t.id === tab) ? tab : 'overview';

  if (mpQuery.isLoading) return <LoadingState />;

  // Hiç bağlantı yoksa doğrudan ayarlar (bağlantı kurma) ekranını göster
  if (marketplaces.length === 0) {
    return (
      <div className="space-y-4">
        <InlineAlert tone="neutral">
          Henüz aktif bir Trendyol bağlantısı yok. Aşağıdan bağlantı ekleyin; sonrasında bu
          sayfa senkron sağlığı, ürünler, siparişler, sorular ve iadelerle dolacak.
        </InlineAlert>
        <MarketplacesTab siteCategories={siteCategories} />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="trendyol-center">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-neutral-900 mr-auto">Trendyol Merkezi</h2>
        {marketplaces.length > 1 && (
          <SelectInput
            value={mpId ?? ''}
            onChange={(e) => setSelectedMpId(e.target.value)}
            className="w-44"
            data-testid="select-center-marketplace"
          >
            {marketplaces.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </SelectInput>
        )}
      </div>

      {/* Sekme çubuğu */}
      <div className="border-b border-neutral-200 -mx-1 px-1 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            const active = effectiveTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  active
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
                data-testid={`tab-trendyol-${t.id}`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {effectiveTab === 'overview' && mpId && (
        <OverviewPanel marketplaceId={mpId} onGoTab={setTab} />
      )}
      {effectiveTab === 'products' && mpId && <ProductLinksPanel marketplaceId={mpId} />}
      {effectiveTab === 'orders' && <MarketplaceOrdersTab marketplaceId={mpId} />}
      {effectiveTab === 'questions' && mpId && <QuestionsPanel marketplaceId={mpId} />}
      {effectiveTab === 'claims' && mpId && <ClaimsPanel marketplaceId={mpId} />}
      {effectiveTab === 'queue' && mpId && <PushQueuePanel marketplaceId={mpId} />}
      {effectiveTab === 'settings' && <MarketplacesTab siteCategories={siteCategories} />}
    </div>
  );
}

// ============================================================================
// GENEL BAKIŞ - sağlık denetimi + uyuşmazlıklar + hızlı aksiyonlar
// ============================================================================
type HealthMismatch = {
  linkId: string;
  productId: string;
  productName: string;
  barcode: string;
  expectedStock: number;
  remoteStock: number;
  expectedPrice: number;
  remotePrice: number;
  stockDiff: boolean;
  priceDiff: boolean;
};

type HealthResponse = {
  ok: boolean;
  error?: string;
  lastFullSyncAt: string | null;
  lastDeltaSyncAt: string | null;
  pushLinkCount: number;
  checked?: number;
  queueStats: { pending: number; sent: number; failed: number };
  mismatches?: HealthMismatch[];
  notFoundOnMarketplace?: string[];
};

function OverviewPanel({
  marketplaceId,
  onGoTab,
}: {
  marketplaceId: string;
  onGoTab: (t: TabId) => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const healthQuery = useQuery<HealthResponse>({
    queryKey: ['/api/admin/marketplaces', marketplaceId, 'health'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/marketplaces/${marketplaceId}/health`);
      return await res.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const fixMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      const res = await apiRequest('POST', `/api/admin/marketplaces/${marketplaceId}/health/fix`, {
        productIds,
      });
      return await res.json();
    },
    onSuccess: (data: { enqueued: number }) => {
      toast({
        title: `${data.enqueued} ürün için düzeltme gönderildi`,
        description: 'Doğru stok/fiyat değerleri Trendyol kuyruğuna eklendi ve işleniyor.',
      });
      setTimeout(
        () =>
          qc.invalidateQueries({ queryKey: ['/api/admin/marketplaces', marketplaceId, 'health'] }),
        5000,
      );
    },
    onError: (err: Error) =>
      toast({ title: 'Düzeltme gönderilemedi', description: err.message, variant: 'destructive' }),
  });

  const h = healthQuery.data;
  const mismatches = h?.mismatches ?? [];

  return (
    <div className="space-y-4" data-testid="panel-overview">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[12.5px] text-neutral-500 mr-auto">
          Sağlık denetimi, push yönündeki tüm ürünlerin Trendyol'daki gerçek stok/fiyatını
          barkodla sorgular ve beklenen değerlerle karşılaştırır.
        </p>
        <SecondaryButton
          onClick={() => healthQuery.refetch()}
          disabled={healthQuery.isFetching}
          data-testid="button-refresh-health"
        >
          {healthQuery.isFetching ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Denetimi Yenile
        </SecondaryButton>
      </div>

      {healthQuery.isLoading ? (
        <LoadingState label="Trendyol ile karşılaştırılıyor…" />
      ) : !h ? (
        <EmptyState title="Sağlık verisi alınamadı" description="Denetimi yenilemeyi deneyin." />
      ) : (
        <>
          {/* Özet kartlar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard
              label="Push ürün"
              value={h.pushLinkCount}
              onClick={() => onGoTab('products')}
            />
            <StatCard
              label="Denetlenen"
              value={h.checked ?? 0}
              tone={h.ok ? undefined : 'red'}
            />
            <StatCard
              label="Uyuşmazlık"
              value={mismatches.length}
              tone={mismatches.length > 0 ? 'red' : 'emerald'}
            />
            <StatCard
              label="Kuyrukta bekleyen"
              value={h.queueStats.pending}
              tone={h.queueStats.failed > 0 ? 'red' : undefined}
              sub={h.queueStats.failed > 0 ? `${h.queueStats.failed} hatalı` : undefined}
              onClick={() => onGoTab('queue')}
            />
          </div>

          <div className="text-[11.5px] text-neutral-500 flex flex-wrap gap-x-4">
            <span>Son tam senkron: {fmtDate(h.lastFullSyncAt)}</span>
            <span>Son delta senkron: {fmtDate(h.lastDeltaSyncAt)}</span>
          </div>

          {!h.ok && h.error && (
            <InlineAlert tone="error">
              Trendyol denetimi tamamlanamadı: {h.error}
            </InlineAlert>
          )}

          {h.ok && mismatches.length === 0 && (h.checked ?? 0) > 0 && (
            <div className="flex items-center gap-2 text-[13px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Tüm push ürünlerinin Trendyol'daki stok ve fiyatları sitedeki değerlerle birebir
              uyumlu.
            </div>
          )}

          {(h.notFoundOnMarketplace ?? []).length > 0 && (
            <InlineAlert tone="warning">
              {h.notFoundOnMarketplace!.length} barkod Trendyol onaylı ürünlerde bulunamadı
              (onay bekliyor veya reddedilmiş olabilir):{' '}
              {h.notFoundOnMarketplace!.slice(0, 5).join(', ')}
              {h.notFoundOnMarketplace!.length > 5 ? '…' : ''}
            </InlineAlert>
          )}

          {mismatches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-[13px] font-semibold text-neutral-900">
                  Uyuşmazlıklar ({mismatches.length})
                </span>
                <div className="flex-1" />
                <PrimaryButton
                  onClick={() =>
                    fixMutation.mutate(Array.from(new Set(mismatches.map((m) => m.productId))))
                  }
                  disabled={fixMutation.isPending}
                  data-testid="button-fix-all-mismatches"
                >
                  {fixMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wrench className="w-3.5 h-3.5" />
                  )}
                  Tümünü Düzelt
                </PrimaryButton>
              </div>
              <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-100 overflow-hidden">
                {mismatches.map((m) => (
                  <div
                    key={m.linkId}
                    className="p-3 flex flex-wrap items-center gap-2"
                    data-testid={`row-mismatch-${m.linkId}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-neutral-900 truncate">
                        {m.productName}
                      </div>
                      <div className="text-[11px] text-neutral-500">Barkod: {m.barcode}</div>
                    </div>
                    {m.stockDiff && (
                      <StatusBadge tone="red">
                        Stok: TY {m.remoteStock} ≠ site {m.expectedStock}
                      </StatusBadge>
                    )}
                    {m.priceDiff && (
                      <StatusBadge tone="red">
                        Fiyat: TY {fmtPrice(m.remotePrice)} ≠ {fmtPrice(m.expectedPrice)}
                      </StatusBadge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: 'red' | 'emerald';
  onClick?: () => void;
}) {
  const color =
    tone === 'red' ? 'text-red-600' : tone === 'emerald' ? 'text-emerald-600' : 'text-neutral-900';
  const inner = (
    <>
      <div className={`text-xl font-semibold ${color}`}>{value}</div>
      <div className="text-[11px] text-neutral-500">{label}</div>
      {sub && <div className="text-[10.5px] text-red-500 mt-0.5">{sub}</div>}
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="bg-white border border-neutral-200 rounded-lg px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors"
      >
        {inner}
      </button>
    );
  }
  return <div className="bg-white border border-neutral-200 rounded-lg px-3 py-2.5">{inner}</div>;
}

/** Basit sayfalama çubuğu - nextCursor varken ileri, 0'dan büyükken geri. */
function Pager({
  page,
  hasNext,
  onChange,
  loading,
}: {
  page: number;
  hasNext: boolean;
  onChange: (p: number) => void;
  loading?: boolean;
}) {
  if (page === 0 && !hasNext) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-1">
      <GhostButton onClick={() => onChange(page - 1)} disabled={page === 0 || loading}>
        ← Önceki
      </GhostButton>
      <span className="text-[11.5px] text-neutral-500">Sayfa {page + 1}</span>
      <GhostButton onClick={() => onChange(page + 1)} disabled={!hasNext || loading}>
        Sonraki →
      </GhostButton>
    </div>
  );
}

// ============================================================================
// SORULAR - müşteri soruları + cevaplama
// ============================================================================
type Question = {
  id: string;
  status: string;
  text: string;
  customerName: string | null;
  productName: string | null;
  productImageUrl: string | null;
  productWebUrl: string | null;
  askedAt: string | null;
  answeredAt: string | null;
  answerText: string | null;
};

type QuestionsResponse = { questions: Question[]; nextCursor: number | null; total?: number };

const QUESTION_STATUS: Array<{ value: string; label: string }> = [
  { value: 'WAITING_FOR_ANSWER', label: 'Cevap bekleyen' },
  { value: 'ANSWERED', label: 'Cevaplanan' },
  { value: 'WAITING_FOR_APPROVE', label: 'Onay bekleyen' },
  { value: 'REJECTED', label: 'Reddedilen' },
  { value: '', label: 'Tümü' },
];

const QUESTION_BADGE: Record<string, { label: string; tone: 'blue' | 'emerald' | 'amber' | 'red' | 'neutral' }> = {
  WAITING_FOR_ANSWER: { label: 'Cevap bekliyor', tone: 'amber' },
  ANSWERED: { label: 'Cevaplandı', tone: 'emerald' },
  WAITING_FOR_APPROVE: { label: 'Onay bekliyor', tone: 'blue' },
  REJECTED: { label: 'Reddedildi', tone: 'red' },
  REPORTED: { label: 'Raporlandı', tone: 'neutral' },
};

function QuestionsPanel({ marketplaceId }: { marketplaceId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatusRaw] = useState('WAITING_FOR_ANSWER');
  const [page, setPage] = useState(0);
  const setStatus = (s: string) => {
    setStatusRaw(s);
    setPage(0);
  };
  const [answering, setAnswering] = useState<Question | null>(null);
  const [answerText, setAnswerText] = useState('');

  const questionsQuery = useQuery<QuestionsResponse>({
    queryKey: ['/api/admin/marketplaces', marketplaceId, 'questions', status, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      params.set('page', String(page));
      const res = await apiRequest(
        'GET',
        `/api/admin/marketplaces/${marketplaceId}/questions?${params}`,
      );
      return await res.json();
    },
    refetchInterval: 120_000,
  });

  const answerMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      await apiRequest('POST', `/api/admin/marketplaces/${marketplaceId}/questions/${id}/answer`, {
        text,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Cevap gönderildi',
        description: 'Cevap Trendyol onayından geçtikten sonra yayınlanır.',
      });
      setAnswering(null);
      setAnswerText('');
      qc.invalidateQueries({ queryKey: ['/api/admin/marketplaces', marketplaceId, 'questions'] });
    },
    onError: (err: Error) =>
      toast({ title: 'Cevap gönderilemedi', description: err.message, variant: 'destructive' }),
  });

  const questions = questionsQuery.data?.questions ?? [];

  return (
    <div className="space-y-3" data-testid="panel-questions">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[12.5px] text-neutral-500 mr-auto">
          Son 14 günün müşteri soruları. Cevaplar 10-2000 karakter olmalı ve Trendyol
          onayından geçer.
        </p>
        <SelectInput
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-44"
          data-testid="select-question-status"
        >
          {QUESTION_STATUS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectInput>
        <GhostButton
          onClick={() => questionsQuery.refetch()}
          disabled={questionsQuery.isFetching}
          data-testid="button-refresh-questions"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${questionsQuery.isFetching ? 'animate-spin' : ''}`} />
        </GhostButton>
      </div>

      {questionsQuery.isLoading ? (
        <LoadingState />
      ) : questionsQuery.isError ? (
        <InlineAlert tone="error">
          Sorular alınamadı: {(questionsQuery.error as Error).message}
        </InlineAlert>
      ) : questions.length === 0 ? (
        <EmptyState
          icon={MessageCircleQuestion}
          title="Soru yok"
          description="Seçili durum ve son 14 gün için müşteri sorusu bulunamadı."
        />
      ) : (
        <div className="space-y-2">
          {questions.map((q) => {
            const badge = QUESTION_BADGE[q.status] ?? { label: q.status, tone: 'neutral' as const };
            return (
              <div
                key={q.id}
                className="bg-white border border-neutral-200 rounded-lg p-3 space-y-2"
                data-testid={`question-card-${q.id}`}
              >
                <div className="flex items-start gap-3">
                  {q.productImageUrl && (
                    <img
                      src={q.productImageUrl}
                      alt=""
                      className="w-10 h-10 rounded border border-neutral-200 object-cover shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-neutral-500 flex flex-wrap gap-x-2">
                      {q.productName && <span className="truncate">{q.productName}</span>}
                      <span>{fmtDate(q.askedAt)}</span>
                      {q.customerName && <span>{q.customerName}</span>}
                    </div>
                    <div className="text-[13px] text-neutral-900 mt-0.5">{q.text}</div>
                    {q.answerText && (
                      <div className="mt-1.5 text-[12px] text-neutral-600 bg-neutral-50 border border-neutral-100 rounded-md px-2.5 py-1.5">
                        <span className="font-medium text-neutral-500">Cevabınız: </span>
                        {q.answerText}
                      </div>
                    )}
                  </div>
                  <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                </div>
                {q.status === 'WAITING_FOR_ANSWER' && (
                  <div className="flex justify-end">
                    <SecondaryButton
                      onClick={() => {
                        setAnswering(q);
                        setAnswerText('');
                      }}
                      data-testid={`button-answer-${q.id}`}
                    >
                      Cevapla
                    </SecondaryButton>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pager
        page={page}
        hasNext={questionsQuery.data?.nextCursor != null}
        onChange={setPage}
        loading={questionsQuery.isFetching}
      />

      {answering && (
        <AdminModal
          open
          onClose={() => setAnswering(null)}
          title="Soruyu Cevapla"
          size="md"
          footer={
            <>
              <GhostButton onClick={() => setAnswering(null)}>Vazgeç</GhostButton>
              <PrimaryButton
                onClick={() => answerMutation.mutate({ id: answering.id, text: answerText.trim() })}
                disabled={
                  answerMutation.isPending ||
                  answerText.trim().length < 10 ||
                  answerText.trim().length > 2000
                }
                data-testid="button-submit-answer"
              >
                {answerMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Cevabı Gönder
              </PrimaryButton>
            </>
          }
        >
          <div className="space-y-3" data-testid="dialog-answer-question">
            <div className="text-[13px] text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-lg p-3">
              {answering.text}
            </div>
            <TextArea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows={5}
              placeholder="Cevabınızı yazın… (10-2000 karakter)"
              data-testid="input-answer-text"
            />
            <div
              className={`text-[11px] ${
                answerText.trim().length > 0 && answerText.trim().length < 10
                  ? 'text-red-500'
                  : 'text-neutral-400'
              }`}
            >
              {answerText.trim().length}/2000 karakter (en az 10)
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
}

// ============================================================================
// İADELER - iade talepleri + onay
// ============================================================================
type ClaimItem = {
  id: string;
  barcode: string | null;
  productName: string | null;
  productImageUrl: string | null;
  status: string;
  customerReason: string | null;
  customerNote: string | null;
};

type Claim = {
  id: string;
  orderNumber: string;
  claimDate: string | null;
  customerName: string | null;
  cargoProvider: string | null;
  cargoTracking: string | null;
  items: ClaimItem[];
};

type ClaimsResponse = { claims: Claim[]; nextCursor: number | null; total?: number };

const CLAIM_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tüm durumlar' },
  { value: 'WaitingInAction', label: 'Aksiyon bekleyen' },
  { value: 'Created', label: 'Oluşturuldu' },
  { value: 'Accepted', label: 'Onaylanan' },
  { value: 'Rejected', label: 'Reddedilen' },
  { value: 'Cancelled', label: 'İptal edilen' },
];

const CLAIM_BADGE: Record<string, { label: string; tone: 'blue' | 'emerald' | 'amber' | 'red' | 'neutral' }> = {
  Created: { label: 'Oluşturuldu', tone: 'blue' },
  WaitingInAction: { label: 'Aksiyon bekliyor', tone: 'amber' },
  Accepted: { label: 'Onaylandı', tone: 'emerald' },
  Rejected: { label: 'Reddedildi', tone: 'red' },
  Cancelled: { label: 'İptal', tone: 'neutral' },
  Unresolved: { label: 'Çözülmedi', tone: 'red' },
};

function ClaimsPanel({ marketplaceId }: { marketplaceId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatusRaw] = useState('WaitingInAction');
  const [page, setPage] = useState(0);
  const setStatus = (s: string) => {
    setStatusRaw(s);
    setPage(0);
  };
  const [approving, setApproving] = useState<Claim | null>(null);

  const claimsQuery = useQuery<ClaimsResponse>({
    queryKey: ['/api/admin/marketplaces', marketplaceId, 'claims', status, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      params.set('page', String(page));
      const res = await apiRequest(
        'GET',
        `/api/admin/marketplaces/${marketplaceId}/claims?${params}`,
      );
      return await res.json();
    },
    refetchInterval: 120_000,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ claimId, itemIds }: { claimId: string; itemIds: string[] }) => {
      await apiRequest('PUT', `/api/admin/marketplaces/${marketplaceId}/claims/${claimId}/approve`, {
        claimLineItemIds: itemIds,
      });
    },
    onSuccess: () => {
      toast({
        title: 'İade onaylandı',
        description: 'Müşterinin para iadesi Trendyol tarafından başlatılacak.',
      });
      setApproving(null);
      qc.invalidateQueries({ queryKey: ['/api/admin/marketplaces', marketplaceId, 'claims'] });
    },
    onError: (err: Error) =>
      toast({ title: 'Onaylanamadı', description: err.message, variant: 'destructive' }),
  });

  const claims = claimsQuery.data?.claims ?? [];

  return (
    <div className="space-y-3" data-testid="panel-claims">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[12.5px] text-neutral-500 mr-auto">
          Son 14 günün iade talepleri. Onayladığınız kalemler için Trendyol müşteriye para
          iadesini başlatır; itiraz işlemleri Trendyol satıcı panelinden yapılır.
        </p>
        <SelectInput
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-44"
          data-testid="select-claim-status"
        >
          {CLAIM_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectInput>
        <GhostButton
          onClick={() => claimsQuery.refetch()}
          disabled={claimsQuery.isFetching}
          data-testid="button-refresh-claims"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${claimsQuery.isFetching ? 'animate-spin' : ''}`} />
        </GhostButton>
      </div>

      {claimsQuery.isLoading ? (
        <LoadingState />
      ) : claimsQuery.isError ? (
        <InlineAlert tone="error">
          İadeler alınamadı: {(claimsQuery.error as Error).message}
        </InlineAlert>
      ) : claims.length === 0 ? (
        <EmptyState
          icon={Undo2}
          title="İade talebi yok"
          description="Seçili durum ve son 14 gün için iade talebi bulunamadı."
        />
      ) : (
        <div className="space-y-2">
          {claims.map((c) => {
            const actionable = c.items.filter(
              (i) => i.status === 'WaitingInAction' || i.status === 'Created',
            );
            return (
              <div
                key={c.id}
                className="bg-white border border-neutral-200 rounded-lg p-3 space-y-2"
                data-testid={`claim-card-${c.id}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold text-neutral-900">
                    #{c.orderNumber}
                  </span>
                  <span className="text-[11px] text-neutral-500">{fmtDate(c.claimDate)}</span>
                  {c.customerName && (
                    <span className="text-[11px] text-neutral-500">{c.customerName}</span>
                  )}
                  {c.cargoProvider && (
                    <span className="text-[11px] text-neutral-500">
                      {c.cargoProvider}
                      {c.cargoTracking ? ` (${c.cargoTracking})` : ''}
                    </span>
                  )}
                  <div className="flex-1" />
                  {actionable.length > 0 && (
                    <PrimaryButton
                      onClick={() => setApproving(c)}
                      data-testid={`button-approve-claim-${c.id}`}
                    >
                      İadeyi Onayla ({actionable.length})
                    </PrimaryButton>
                  )}
                </div>
                <div className="divide-y divide-neutral-50 border-t border-neutral-100">
                  {c.items.map((i) => {
                    const badge = CLAIM_BADGE[i.status] ?? {
                      label: i.status,
                      tone: 'neutral' as const,
                    };
                    return (
                      <div key={i.id} className="py-2 flex items-center gap-2">
                        {i.productImageUrl && (
                          <img
                            src={i.productImageUrl}
                            alt=""
                            className="w-8 h-8 rounded border border-neutral-200 object-cover shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] text-neutral-900 truncate">
                            {i.productName ?? i.barcode ?? '(ürün)'}
                          </div>
                          <div className="text-[11px] text-neutral-500 flex flex-wrap gap-x-2">
                            {i.customerReason && <span>Sebep: {i.customerReason}</span>}
                            {i.customerNote && <span>Not: {i.customerNote}</span>}
                          </div>
                        </div>
                        <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pager
        page={page}
        hasNext={claimsQuery.data?.nextCursor != null}
        onChange={setPage}
        loading={claimsQuery.isFetching}
      />

      {approving && (
        <AdminModal
          open
          onClose={() => setApproving(null)}
          title={`İadeyi Onayla - #${approving.orderNumber}`}
          size="sm"
          footer={
            <>
              <GhostButton onClick={() => setApproving(null)}>Vazgeç</GhostButton>
              <PrimaryButton
                onClick={() =>
                  approveMutation.mutate({
                    claimId: approving.id,
                    itemIds: approving.items
                      .filter((i) => i.status === 'WaitingInAction' || i.status === 'Created')
                      .map((i) => i.id),
                  })
                }
                disabled={approveMutation.isPending}
                data-testid="button-confirm-approve-claim"
              >
                {approveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Onayla
              </PrimaryButton>
            </>
          }
        >
          <div className="space-y-2" data-testid="dialog-approve-claim">
            <InlineAlert tone="warning">
              Onay geri alınamaz - Trendyol müşteriye para iadesini başlatır. Ürünü teslim
              alıp kontrol ettiyseniz onaylayın.
            </InlineAlert>
            <div className="text-[12.5px] text-neutral-700">
              {approving.items
                .filter((i) => i.status === 'WaitingInAction' || i.status === 'Created')
                .map((i) => i.productName ?? i.barcode ?? i.id)
                .join(', ')}
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
