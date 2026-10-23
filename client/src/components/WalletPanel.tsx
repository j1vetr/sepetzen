import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, CreditCard, Landmark, Loader2, Copy, Check, ArrowDownLeft, ArrowUpRight, Clock, X, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatTRDateTime } from '@shared/dateFormat';

export interface WalletTx {
  id: string;
  type: string;
  status: string;
  amount: string;
  balanceAfter: string | null;
  reference: string | null;
  note: string | null;
  createdAt: string;
}

interface WalletData {
  enabled: boolean;
  balance: number;
  minTopup: number;
  maxTopup: number;
  bank: { enabled: boolean; bankName: string; accountHolder: string; iban: string };
  transactions: WalletTx[];
}

interface PayMethods {
  iyzico: boolean;
  paytr: boolean;
}

export const formatTL = (n: number) =>
  `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;

const TYPE_LABELS: Record<string, string> = {
  topup_card: 'Kart ile yükleme',
  topup_bank: 'Havale/EFT ile yükleme',
  order_payment: 'Sipariş ödemesi',
  order_refund: 'Sipariş iadesi',
  admin_adjust: 'Bakiye düzeltmesi',
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Onay bekliyor', cls: 'bg-yellow-500/15 text-yellow-300' },
  completed: { label: 'Tamamlandı', cls: 'bg-emerald-500/15 text-emerald-300' },
  rejected: { label: 'Reddedildi', cls: 'bg-red-500/15 text-red-300' },
  failed: { label: 'Başarısız', cls: 'bg-red-500/15 text-red-300' },
};

const QUICK_AMOUNTS = [100, 250, 500, 1000];

export default function WalletPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'card' | 'bank'>('card');
  const [copied, setCopied] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [bankResult, setBankResult] = useState<{ reference: string; amount: number } | null>(null);

  const { data, isLoading } = useQuery<WalletData>({
    queryKey: ['wallet', 'main'],
    queryFn: async () => {
      const res = await fetch('/api/wallet', { credentials: 'include' });
      if (!res.ok) throw new Error('Bakiye bilgisi alınamadı');
      return res.json();
    },
    refetchOnMount: 'always',
  });

  const { data: payMethods } = useQuery<PayMethods>({
    queryKey: ['payment-methods'],
    queryFn: async () => (await fetch('/api/payment/methods')).json(),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
    queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  };

  // Ödeme penceresi açıkken bakiye güncellemesini yakala
  useEffect(() => {
    if (!paymentUrl) return;
    const t = setInterval(() => queryClient.invalidateQueries({ queryKey: ['wallet'] }), 4000);
    return () => clearInterval(t);
  }, [paymentUrl, queryClient]);

  const cardAvailable = !!(payMethods?.iyzico || payMethods?.paytr);
  const bankAvailable = !!data?.bank.enabled;
  const effectiveMethod: 'card' | 'bank' =
    method === 'card' && !cardAvailable && bankAvailable ? 'bank' : method === 'bank' && !bankAvailable ? 'card' : method;

  const cardMutation = useMutation({
    mutationFn: async (value: number) => {
      const res = await fetch('/api/wallet/topup/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount: value, provider: payMethods?.iyzico ? 'iyzico' : 'paytr' }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Ödeme başlatılamadı');
      return body as { provider: 'iyzico' | 'paytr'; paymentPageUrl?: string; iframeUrl?: string };
    },
    onSuccess: (body) => {
      const url = body.paymentPageUrl || body.iframeUrl;
      if (!url) {
        toast({ title: 'Hata', description: 'Ödeme sayfası açılamadı', variant: 'destructive' });
        return;
      }
      // Ödeme sağlayıcının sayfası site içinde pencere olarak açılır
      setPaymentUrl(url);
    },
    onError: (e: Error) => toast({ title: 'Hata', description: e.message, variant: 'destructive' }),
  });

  const bankMutation = useMutation({
    mutationFn: async (value: number) => {
      const res = await fetch('/api/wallet/topup/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount: value }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Talep oluşturulamadı');
      return body as { reference: string; amount: number };
    },
    onSuccess: (body) => {
      setBankResult({ reference: body.reference, amount: body.amount });
      setAmount('');
      refresh();
    },
    onError: (e: Error) => toast({ title: 'Hata', description: e.message, variant: 'destructive' }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (reference: string) => {
      const res = await fetch(`/api/wallet/topup/${encodeURIComponent(reference)}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'İptal edilemedi');
    },
    onSuccess: () => {
      setBankResult(null);
      refresh();
    },
    onError: (e: Error) => toast({ title: 'Hata', description: e.message, variant: 'destructive' }),
  });

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
    } catch {}
  };

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-white/30" />
      </div>
    );
  }

  const parsed = Number(amount.replace(',', '.'));
  const amountValid = Number.isFinite(parsed) && parsed >= data.minTopup && parsed <= data.maxTopup;
  const busy = cardMutation.isPending || bankMutation.isPending;
  const pendingBank = data.transactions.filter((t) => t.type === 'topup_bank' && t.status === 'pending');

  const submit = () => {
    if (!amountValid) {
      toast({
        title: 'Geçersiz tutar',
        description: `${formatTL(data.minTopup)} ile ${formatTL(data.maxTopup)} arasında bir tutar girin`,
        variant: 'destructive',
      });
      return;
    }
    if (effectiveMethod === 'card') cardMutation.mutate(parsed);
    else bankMutation.mutate(parsed);
  };

  return (
    <div className="space-y-6" data-testid="wallet-panel">
      {paymentUrl && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3" data-testid="wallet-payment-modal">
          <div className="w-full max-w-[560px] max-h-full flex flex-col bg-[#111111] border border-white/15 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="flex items-center gap-2 text-[12px] text-white/70"><Lock className="w-3.5 h-3.5" />Güvenli ödeme</span>
              <button
                type="button"
                onClick={() => { setPaymentUrl(null); refresh(); }}
                className="text-white/60 hover:text-white"
                aria-label="Kapat"
                data-testid="button-close-payment"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-white overflow-y-auto flex-1">
              <iframe
                src={paymentUrl}
                title="Güvenli Ödeme"
                className="w-full block"
                style={{ height: '75vh', minHeight: 480, border: 0 }}
                allow="payment *"
                data-testid="wallet-payment-iframe"
              />
            </div>
          </div>
        </div>
      )}
      <div className="border border-white/15 bg-[#111111] rounded-xl p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono tracking-[0.28em] uppercase text-white/50">Mevcut bakiye</p>
          <p className="font-display text-4xl text-white mt-2 tabular-nums" data-testid="text-wallet-panel-balance">
            {formatTL(data.balance)}
          </p>
        </div>
        <Wallet className="w-10 h-10 text-white/25 shrink-0" strokeWidth={1.25} />
      </div>

      {!data.enabled ? (
        <div className="border border-white/10 rounded-xl p-5 text-sm text-white/60">Bakiye yükleme şu anda kapalı.</div>
      ) : (
        <div id="wallet-topup" className="scroll-mt-28 border border-white/10 bg-[#0F0F0F] rounded-xl p-5 space-y-5">
          <h3 className="font-display text-xl tracking-wide text-white">BAKİYE YÜKLE</h3>

          <div>
            <label className="text-[12px] text-white/55 block mb-2">Yüklenecek tutar (₺)</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder={`${data.minTopup} - ${data.maxTopup}`}
              className="w-full h-12 px-4 bg-[#141414] border border-white/15 rounded-lg text-white text-lg tabular-nums focus:outline-none focus:border-white/50"
              data-testid="input-wallet-amount"
            />
            <div className="flex flex-wrap gap-2 mt-3">
              {QUICK_AMOUNTS.filter((q) => q >= data.minTopup && q <= data.maxTopup).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className="px-3 py-1.5 text-[12px] border border-white/15 rounded-md text-white/70 hover:text-white hover:border-white/40 transition-colors"
                  data-testid={`button-wallet-quick-${q}`}
                >
                  {q.toLocaleString('tr-TR')} ₺
                </button>
              ))}
            </div>
            <p className="text-[11.5px] text-white/40 mt-2">
              En az {formatTL(data.minTopup)}, en fazla {formatTL(data.maxTopup)} yükleyebilirsiniz.
            </p>
          </div>

          <div className={`grid border border-white/15 rounded-lg overflow-hidden ${cardAvailable && bankAvailable ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {cardAvailable && (
              <button
                type="button"
                onClick={() => setMethod('card')}
                className={`h-12 flex items-center justify-center gap-2 text-[13px] font-bold tracking-wide transition-colors ${
                  effectiveMethod === 'card' ? 'bg-white text-black' : 'bg-[#141414] text-white/60 hover:bg-[#1A1A1A]'
                }`}
                data-testid="tab-wallet-card"
              >
                <CreditCard className="w-4 h-4" /> KREDİ KARTI
              </button>
            )}
            {bankAvailable && (
              <button
                type="button"
                onClick={() => setMethod('bank')}
                className={`h-12 flex items-center justify-center gap-2 text-[13px] font-bold tracking-wide transition-colors ${
                  effectiveMethod === 'bank' ? 'bg-white text-black' : 'bg-[#141414] text-white/60 hover:bg-[#1A1A1A]'
                }`}
                data-testid="tab-wallet-bank"
              >
                <Landmark className="w-4 h-4" /> HAVALE / EFT
              </button>
            )}
          </div>

          {!cardAvailable && !bankAvailable && (
            <p className="text-sm text-white/55">Şu anda aktif bir yükleme yöntemi yok.</p>
          )}

          {effectiveMethod === 'card' && cardAvailable && (
            <p className="text-[12.5px] text-white/55">Ödeme tamamlanır tamamlanmaz bakiyenize otomatik eklenir.</p>
          )}
          {effectiveMethod === 'bank' && bankAvailable && (
            <p className="text-[12.5px] text-white/55">
              Talep oluşturduktan sonra size verilen açıklama koduyla havale yapın. Ödemeniz kontrol edilip onaylandığında bakiyenize eklenir.
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={busy || (!cardAvailable && !bankAvailable)}
            className="w-full h-12 bg-white text-black font-bold tracking-wide rounded-lg hover:bg-white/90 disabled:opacity-50 flex items-center justify-center gap-2"
            data-testid="button-wallet-topup"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : effectiveMethod === 'card' ? 'KARTLA ÖDEMEYE GEÇ' : 'HAVALE TALEBİ OLUŞTUR'}
          </button>
        </div>
      )}

      {(bankResult || pendingBank.length > 0) && data.bank && (
        <div className="border border-yellow-500/25 bg-yellow-500/5 rounded-xl p-5 space-y-4" data-testid="wallet-bank-pending">
          <div className="flex items-center gap-2 text-yellow-300 text-sm font-semibold">
            <Clock className="w-4 h-4" /> Onay bekleyen havale talepleri
          </div>
          <div className="grid gap-2 text-[13px]">
            {([
              ['Banka', data.bank.bankName, 'bank'],
              ['Alıcı', data.bank.accountHolder, 'holder'],
              ['IBAN', data.bank.iban, 'iban'],
            ] as const).map(([label, value, key]) => (
              <div key={key} className="flex items-center justify-between gap-3 bg-black/30 rounded-md px-3 py-2">
                <span className="text-white/50">{label}</span>
                <span className="text-white font-mono text-[12.5px] break-all text-right">{value}</span>
                <button type="button" onClick={() => copy(key, value)} className="text-white/60 hover:text-white shrink-0" aria-label={`${label} kopyala`}>
                  {copied === key ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {pendingBank.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 bg-black/30 rounded-md px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-white font-bold tabular-nums">{formatTL(parseFloat(t.amount))}</p>
                  <p className="text-[12px] text-white/55">
                    Açıklama kodu: <span className="font-mono text-white">{t.reference}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => t.reference && copy(t.id, t.reference)} className="text-white/60 hover:text-white" aria-label="Kodu kopyala">
                    {copied === t.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => t.reference && cancelMutation.mutate(t.reference)}
                    disabled={cancelMutation.isPending}
                    className="text-[12px] text-white/60 hover:text-white underline underline-offset-2"
                    data-testid={`button-wallet-cancel-${t.id}`}
                  >
                    İptal et
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-white/50">Havale açıklamasına yukarıdaki kodu yazmayı unutmayın.</p>
        </div>
      )}

      <div className="border border-white/10 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 bg-[#0F0F0F]">
          <h3 className="text-[13px] font-bold tracking-wide text-white">HESAP HAREKETLERİ</h3>
        </div>
        {data.transactions.length === 0 ? (
          <p className="px-5 py-8 text-sm text-white/45 text-center">Henüz bakiye hareketi yok.</p>
        ) : (
          <ul className="divide-y divide-white/8" data-testid="wallet-history">
            {data.transactions.map((t) => {
              const value = parseFloat(t.amount);
              const st = STATUS_LABELS[t.status] || STATUS_LABELS.completed;
              return (
                <li key={t.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center shrink-0">
                      {value >= 0 ? <ArrowDownLeft className="w-4 h-4 text-emerald-300" /> : <ArrowUpRight className="w-4 h-4 text-white/60" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] text-white truncate">{TYPE_LABELS[t.type] || t.type}</p>
                      <p className="text-[11.5px] text-white/45">{formatTRDateTime(t.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[14px] font-bold tabular-nums ${value >= 0 && t.status === 'completed' ? 'text-emerald-300' : t.status === 'completed' ? 'text-white' : 'text-white/40'}`}>
                      {value >= 0 ? '+' : ''}{formatTL(value)}
                    </p>
                    <span className={`inline-block mt-0.5 text-[10.5px] px-1.5 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
