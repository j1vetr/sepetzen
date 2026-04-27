import { Fragment, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Globe,
  Plus,
  RefreshCcw,
  Trash2,
  Pencil,
  CheckCircle2,
  XCircle,
  Loader2,
  History,
  Tags,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type CredentialField = {
  key: string;
  label: string;
  type: "text" | "password";
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
  mode: "delta" | "full";
  status: "running" | "completed" | "partial" | "failed";
  trigger: "manual" | "cron";
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

function statusBadge(status: SyncRun["status"]) {
  const map: Record<SyncRun["status"], { label: string; cls: string }> = {
    running: { label: "Çalışıyor", cls: "bg-blue-500/20 text-blue-400" },
    completed: { label: "Başarılı", cls: "bg-emerald-500/20 text-emerald-400" },
    partial: { label: "Kısmi", cls: "bg-amber-500/20 text-amber-400" },
    failed: { label: "Hata", cls: "bg-red-500/20 text-red-400" },
  };
  const e = map[status] ?? { label: status, cls: "bg-zinc-500/20 text-zinc-400" };
  return (
    <Badge className={`${e.cls} border-0`} data-testid={`badge-status-${status}`}>
      {e.label}
    </Badge>
  );
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return d;
  }
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "…";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(ms) || ms < 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}sn`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}dk ${s}sn` : `${m}dk`;
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

  const adaptersQuery = useQuery<AdapterMeta[]>({
    queryKey: ["/api/admin/marketplaces/adapters"],
  });
  const marketplacesQuery = useQuery<Marketplace[]>({
    queryKey: ["/api/admin/marketplaces"],
    refetchInterval: 15_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/marketplaces/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/marketplaces"] });
      toast({ title: "Pazaryeri silindi" });
    },
    onError: (err: Error) =>
      toast({ title: "Silme başarısız", description: err.message, variant: "destructive" }),
  });

  const syncMutation = useMutation({
    mutationFn: async ({ id, mode }: { id: string; mode: "delta" | "full" }) => {
      await apiRequest("POST", `/api/admin/marketplaces/${id}/sync-now`, { mode });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/marketplaces"] });
      toast({ title: `Senkron başlatıldı (${vars.mode})` });
    },
    onError: (err: Error) =>
      toast({ title: "Başlatılamadı", description: err.message, variant: "destructive" }),
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/marketplaces/${id}/test-connection`);
      return (await res.json()) as { ok: boolean; message: string };
    },
    onSuccess: (data) => {
      toast({
        title: data.ok ? "Bağlantı başarılı" : "Bağlantı başarısız",
        description: data.message,
        variant: data.ok ? "default" : "destructive",
      });
    },
    onError: (err: Error) =>
      toast({ title: "Bağlantı hatası", description: err.message, variant: "destructive" }),
  });

  const adapters = adaptersQuery.data ?? [];
  const marketplaces = marketplacesQuery.data ?? [];
  const editing = editingId ? marketplaces.find((m) => m.id === editingId) ?? null : null;

  return (
    <div className="space-y-6" data-testid="tab-marketplaces">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Globe className="w-6 h-6 text-amber-500" />
            Pazaryerleri
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Trendyol gibi pazaryerlerinden katalog (kategori, ürün, görsel, stok, fiyat) tek
            yönde otomatik senkronlanır.
          </p>
        </div>
        <Button
          onClick={() => setCreating(true)}
          data-testid="button-add-marketplace"
          className="bg-amber-600 hover:bg-amber-700"
        >
          <Plus className="w-4 h-4 mr-2" /> Pazaryeri Ekle
        </Button>
      </div>

      {marketplacesQuery.isLoading ? (
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…
        </div>
      ) : marketplaces.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <Globe className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-300">Henüz bir pazaryeri bağlanmamış.</p>
          <p className="text-zinc-500 text-sm mt-1">
            Trendyol satıcı bilgilerinizi ekleyerek katalogu otomatik çekmeye başlayın.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {marketplaces.map((mp) => (
            <div
              key={mp.id}
              data-testid={`card-marketplace-${mp.id}`}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold" data-testid={`text-marketplace-name-${mp.id}`}>
                      {mp.name}
                    </h3>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-400 capitalize">
                      {mp.type}
                    </Badge>
                    {mp.isActive ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-0">Aktif</Badge>
                    ) : (
                      <Badge className="bg-zinc-700/40 text-zinc-400 border-0">Pasif</Badge>
                    )}
                    <CurrentRunBadge marketplaceId={mp.id} />
                  </div>
                  <div className="text-xs text-zinc-500 mt-2 space-y-0.5">
                    <div>Son tam senkron: {formatDate(mp.lastFullSyncAt)}</div>
                    <div>Son delta: {formatDate(mp.lastDeltaSyncAt)}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingId(mp.id)}
                    data-testid={`button-edit-marketplace-${mp.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => {
                      if (confirm(`${mp.name} silinsin mi?`)) deleteMutation.mutate(mp.id);
                    }}
                    data-testid={`button-delete-marketplace-${mp.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => testConnectionMutation.mutate(mp.id)}
                  disabled={testConnectionMutation.isPending}
                  data-testid={`button-test-connection-${mp.id}`}
                  variant="outline"
                  className="border-zinc-700"
                >
                  {testConnectionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                  )}
                  Bağlantıyı Test Et
                </Button>
                <Button
                  size="sm"
                  onClick={() => syncMutation.mutate({ id: mp.id, mode: "full" })}
                  disabled={syncMutation.isPending}
                  data-testid={`button-sync-now-full-${mp.id}`}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <RefreshCcw className="w-4 h-4 mr-1" /> Tam Senkron
                </Button>
                <Button
                  size="sm"
                  onClick={() => syncMutation.mutate({ id: mp.id, mode: "delta" })}
                  disabled={syncMutation.isPending}
                  data-testid={`button-sync-now-delta-${mp.id}`}
                  variant="outline"
                  className="border-zinc-700"
                >
                  <RefreshCcw className="w-4 h-4 mr-1" /> Hızlı (Stok/Fiyat)
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setHistoryForId(mp.id)}
                  data-testid={`button-history-${mp.id}`}
                >
                  <History className="w-4 h-4 mr-1" /> Geçmiş
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setMappingsForId(mp.id)}
                  data-testid={`button-mappings-${mp.id}`}
                >
                  <Tags className="w-4 h-4 mr-1" /> Kategori Eşleme
                </Button>
              </div>

              <div className="text-xs text-zinc-500 space-y-1 border-t border-zinc-800 pt-3">
                {Object.entries(mp.maskedCredentials).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-zinc-400">{k}</span>
                    <span className="font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </div>
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
    </div>
  );
}

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
  const [type, setType] = useState<string>(existing?.type ?? "trendyol");
  const [name, setName] = useState<string>(existing?.name ?? "Trendyol");
  const [isActive, setIsActive] = useState<boolean>(existing?.isActive ?? true);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const fields = adapters.find((a) => a.type === type)?.credentialFields ?? [];

  // Kredensiyal değiştiğinde önceki test sonucu artık geçerli değildir
  function updateCredential(key: string, value: string) {
    setCredentials((prev) => ({ ...prev, [key]: value }));
    setTestResult(null);
  }

  const testCredsMutation = useMutation({
    mutationFn: async () => {
      const filled = Object.fromEntries(
        Object.entries(credentials).filter(([, v]) => v && v.trim().length > 0),
      );
      // Düzenleme modunda boş alanları doldurmak için mevcut kayıt üzerinden test et
      if (existing) {
        const required = fields.filter((f) => f.required);
        const missing = required.filter((f) => !filled[f.key]);
        if (missing.length > 0) {
          // Mevcut kaydın kredensiyalleri server'da çözülerek test ediliyor
          const res = await apiRequest(
            "POST",
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
      const res = await apiRequest("POST", `/api/admin/marketplaces/test-credentials`, {
        type,
        credentials: filled,
        config: {},
      });
      return (await res.json()) as { ok: boolean; message: string };
    },
    onSuccess: (r) => {
      setTestResult(r);
      toast({
        title: r.ok ? "Bağlantı başarılı" : "Bağlantı başarısız",
        description: r.message,
        variant: r.ok ? "default" : "destructive",
      });
    },
    onError: (err: Error) => {
      setTestResult({ ok: false, message: err.message });
      toast({ title: "Test başarısız", description: err.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { name, isActive };
      // Yalnız doldurulmuş alanları gönder — boş bırakılan placeholder'lar mevcut değeri korur
      const filled = Object.fromEntries(
        Object.entries(credentials).filter(([, v]) => v && v.trim().length > 0),
      );
      if (Object.keys(filled).length > 0) payload.credentials = filled;
      if (existing) {
        await apiRequest("PUT", `/api/admin/marketplaces/${existing.id}`, payload);
      } else {
        const required = fields.filter((f) => f.required);
        for (const f of required) {
          if (!filled[f.key]) throw new Error(`${f.label} zorunlu`);
        }
        await apiRequest("POST", `/api/admin/marketplaces`, {
          type,
          name,
          isActive,
          credentials: filled,
          config: {},
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/marketplaces"] });
      toast({ title: existing ? "Güncellendi" : "Eklendi" });
      onClose();
    },
    onError: (err: Error) =>
      toast({ title: "Kaydedilemedi", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>{existing ? "Pazaryerini Düzenle" : "Pazaryeri Ekle"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tip</Label>
            <Select value={type} onValueChange={setType} disabled={!!existing}>
              <SelectTrigger data-testid="select-marketplace-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {adapters.map((a) => (
                  <SelectItem key={a.type} value={a.type}>
                    {a.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ad</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-marketplace-name"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Aktif</Label>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              data-testid="switch-marketplace-active"
            />
          </div>

          <div className="space-y-3 border-t border-zinc-800 pt-4">
            {fields.map((f) => (
              <div key={f.key}>
                <Label>
                  {f.label}
                  {f.required ? <span className="text-red-400 ml-1">*</span> : null}
                </Label>
                <Input
                  type={f.type === "password" ? "password" : "text"}
                  value={credentials[f.key] ?? ""}
                  onChange={(e) => updateCredential(f.key, e.target.value)}
                  placeholder={
                    existing?.maskedCredentials?.[f.key]
                      ? `Mevcut: ${existing.maskedCredentials[f.key]}`
                      : ""
                  }
                  data-testid={`input-credential-${f.key}`}
                />
                {f.helpText && (
                  <p className="text-xs text-zinc-500 mt-1">{f.helpText}</p>
                )}
              </div>
            ))}
            {existing && (
              <p className="text-xs text-zinc-500">
                Boş bırakılan alanlar mevcut değerini korur. API anahtarları sunucuda AES-256 ile
                şifreli saklanır.
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-col items-stretch gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => testCredsMutation.mutate()}
              disabled={testCredsMutation.isPending}
              data-testid="button-test-credentials"
              className="border-zinc-700"
            >
              {testCredsMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1" />
              )}
              Bağlantıyı Test Et
            </Button>
            {testResult && (
              <span
                className={`text-sm flex items-center gap-1 ${
                  testResult.ok ? "text-emerald-400" : "text-red-400"
                }`}
                data-testid={`text-test-result-${testResult.ok ? "ok" : "fail"}`}
              >
                {testResult.ok ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Başarılı — {testResult.message}
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    {testResult.message}
                  </>
                )}
              </span>
            )}
          </div>
          {!existing && !testResult?.ok && (
            <p className="text-xs text-amber-300">
              İpucu: Kayıttan önce <strong>Bağlantıyı Test Et</strong> ile kredensiyalleri doğrulayın.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <Button variant="ghost" onClick={onClose} data-testid="button-marketplace-cancel">
              İptal
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              data-testid="button-marketplace-save"
              className="bg-amber-600 hover:bg-amber-700"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              Kaydet
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
    queryKey: ["/api/admin/marketplaces", marketplaceId, "sync-runs"],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/admin/marketplaces/${marketplaceId}/sync-runs?limit=20`,
      );
      return await res.json();
    },
    refetchInterval: 5000,
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Senkron Geçmişi (son 20)</DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center gap-2 text-zinc-400 py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="py-2">Başlangıç</th>
                  <th>Bitiş</th>
                  <th>Süre</th>
                  <th>Mod</th>
                  <th>Tetik</th>
                  <th>Durum</th>
                  <th>Eklenen</th>
                  <th>Güncel.</th>
                  <th title="Soft-delete edilen">Gizlenen</th>
                  <th title="Yeniden aktive edilen">Yeniden Aktif</th>
                  <th>Hata</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((r) => (
                <Fragment key={r.id}>
                  <tr className="border-b border-zinc-800/50">
                    <td className="py-2 text-zinc-300">{formatDate(r.startedAt)}</td>
                    <td className="text-zinc-400">{formatDate(r.completedAt)}</td>
                    <td className="text-zinc-400" data-testid={`text-duration-${r.id}`}>
                      {formatDuration(r.startedAt, r.completedAt)}
                    </td>
                    <td className="text-zinc-400">{r.mode}</td>
                    <td className="text-zinc-400">{r.trigger}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td className="text-zinc-300">{r.stats?.productsAdded ?? 0}</td>
                    <td className="text-zinc-300">{r.stats?.productsUpdated ?? 0}</td>
                    <td className="text-amber-300" data-testid={`text-deactivated-${r.id}`}>
                      {r.stats?.productsDeactivated ?? 0}
                    </td>
                    <td className="text-emerald-300" data-testid={`text-reactivated-${r.id}`}>
                      {r.stats?.productsReactivated ?? 0}
                    </td>
                    <td className="text-red-400">{r.errors?.length ?? 0}</td>
                  </tr>
                  {(r.errors?.length ?? 0) > 0 && (
                    <tr key={`${r.id}-errs`} className="border-b border-zinc-800/50">
                      <td colSpan={11} className="py-2 px-2 bg-red-500/5">
                        <details data-testid={`details-errors-${r.id}`}>
                          <summary className="cursor-pointer text-xs text-red-300 select-none">
                            Hata özetlerini göster ({r.errors.length})
                          </summary>
                          <ul className="mt-2 space-y-1 text-xs text-red-200/90 font-mono">
                            {r.errors.slice(0, 5).map((e, i) => (
                              <li
                                key={i}
                                className="pl-2 border-l border-red-500/40"
                                data-testid={`text-error-${r.id}-${i}`}
                              >
                                <span className="text-red-300/70">{e.context}:</span> {e.message}
                              </li>
                            ))}
                            {r.errors.length > 5 && (
                              <li className="text-red-300/60">
                                …ve {r.errors.length - 5} daha
                              </li>
                            )}
                          </ul>
                        </details>
                      </td>
                    </tr>
                  )}
                </Fragment>
                ))}
                {(data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-6 text-center text-zinc-500">
                      Henüz senkron çalışması yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  const { data, isLoading } = useQuery<CategoryMapping[]>({
    queryKey: ["/api/admin/marketplaces", marketplaceId, "category-mappings"],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/admin/marketplaces/${marketplaceId}/category-mappings`,
      );
      return await res.json();
    },
    enabled: open,
  });

  const setMapping = useMutation({
    mutationFn: async ({ id, siteCategoryId }: { id: string; siteCategoryId: string | null }) => {
      await apiRequest(
        "PUT",
        `/api/admin/marketplaces/${marketplaceId}/category-mappings/${id}`,
        { siteCategoryId },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["/api/admin/marketplaces", marketplaceId, "category-mappings"],
      });
      toast({ title: "Eşleme güncellendi" });
    },
    onError: (err: Error) =>
      toast({ title: "Güncellenemedi", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Kategori Eşleme</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center gap-2 text-zinc-400 py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…
          </div>
        ) : (data ?? []).length === 0 ? (
          <p className="text-center text-zinc-500 py-6">
            Henüz pazaryerinden kategori çekilmedi. Önce bir tam senkron çalıştırın.
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {(data ?? []).map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 border-b border-zinc-800/50 py-2"
              >
                <div className="flex-1">
                  <div className="text-sm">{m.name}</div>
                  <div className="text-xs text-zinc-500">id: {m.externalId}</div>
                </div>
                <Select
                  value={m.siteCategoryId ?? "__none"}
                  onValueChange={(v) =>
                    setMapping.mutate({ id: m.id, siteCategoryId: v === "__none" ? null : v })
                  }
                >
                  <SelectTrigger className="w-64" data-testid={`select-mapping-${m.id}`}>
                    <SelectValue placeholder="Eşleştir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Eşleme yok —</SelectItem>
                    {siteCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CurrentRunBadge({ marketplaceId }: { marketplaceId: string }) {
  const { data } = useQuery<SyncRun[]>({
    queryKey: ["/api/admin/marketplaces", marketplaceId, "sync-runs", "latest"],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/admin/marketplaces/${marketplaceId}/sync-runs?limit=1`,
      );
      return await res.json();
    },
    refetchInterval: 5000,
  });
  const last = (data ?? [])[0];
  if (!last) return null;
  if (last.status === "running") {
    return (
      <Badge
        className="bg-blue-500/20 text-blue-300 border-0 gap-1"
        data-testid={`badge-running-${marketplaceId}`}
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        Çalışıyor ({last.mode})
      </Badge>
    );
  }
  const dur = formatDuration(last.startedAt, last.completedAt);
  const cls =
    last.status === "completed"
      ? "bg-emerald-500/15 text-emerald-300"
      : last.status === "partial"
        ? "bg-amber-500/15 text-amber-300"
        : "bg-red-500/15 text-red-300";
  return (
    <Badge
      className={`${cls} border-0`}
      title={`Son: ${formatDate(last.completedAt)} • ${dur}`}
      data-testid={`badge-last-run-${marketplaceId}`}
    >
      Son: {last.status === "completed" ? "Başarılı" : last.status === "partial" ? "Kısmi" : "Hata"} ·{" "}
      {dur}
    </Badge>
  );
}
