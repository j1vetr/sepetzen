import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { BANK_TRANSFER_INFO } from '@shared/bankInfo';
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Home,
  Loader2,
  AlertCircle,
  ArrowRight,
  Copy,
  Check as CheckIcon,
  ExternalLink,
  ShoppingBag,
  ListOrdered,
  LogIn,
} from 'lucide-react';

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  customerName: string;
  createdAt: string;
  processingAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  total: string;
  shippingCost: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingCarrier?: string;
  shippingAddress: {
    address: string;
    city: string;
    district: string;
    postalCode: string;
  };
  items: Array<{
    id: string;
    productName: string;
    variantDetails: string;
    quantity: number;
    subtotal: string;
  }>;
}

function formatStepDate(iso: string | null | undefined): {
  relative: string;
  absolute: string;
} | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  let relative: string;
  if (diffMin < 1) relative = 'Az önce';
  else if (diffMin < 60) relative = `${diffMin} dakika önce`;
  else if (diffHour < 24) relative = `${diffHour} saat önce`;
  else if (diffDay === 1) relative = 'Dün';
  else if (diffDay < 7) relative = `${diffDay} gün önce`;
  else
    relative = date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
    });

  const absolute = date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return { relative, absolute };
}

const statusConfig: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    description: string;
    step: number;
  }
> = {
  pending: {
    label: 'Beklemede',
    icon: Clock,
    description: 'Siparişiniz onay bekliyor',
    step: 1,
  },
  confirmed: {
    label: 'Onaylandı',
    icon: CheckCircle2,
    description: 'Siparişiniz onaylandı',
    step: 1,
  },
  processing: {
    label: 'Hazırlanıyor',
    icon: Package,
    description: 'Siparişiniz hazırlanıyor',
    step: 2,
  },
  shipped: {
    label: 'Kargoda',
    icon: Truck,
    description: 'Siparişiniz kargoya verildi',
    step: 3,
  },
  completed: {
    label: 'Teslim Edildi',
    icon: CheckCircle2,
    description: 'Siparişiniz teslim edildi',
    step: 4,
  },
  delivered: {
    label: 'Teslim Edildi',
    icon: CheckCircle2,
    description: 'Siparişiniz teslim edildi',
    step: 4,
  },
  cancelled: {
    label: 'İptal Edildi',
    icon: XCircle,
    description: 'Sipariş iptal edildi',
    step: 0,
  },
};

type StepDateKey = 'createdAt' | 'processingAt' | 'shippedAt' | 'deliveredAt';

const steps: Array<{
  id: number;
  label: string;
  icon: React.ElementType;
  dateKey: StepDateKey;
}> = [
  { id: 1, label: 'Onaylandı', icon: CheckCircle2, dateKey: 'createdAt' },
  { id: 2, label: 'Hazırlanıyor', icon: Package, dateKey: 'processingAt' },
  { id: 3, label: 'Kargoda', icon: Truck, dateKey: 'shippedAt' },
  { id: 4, label: 'Teslim Edildi', icon: Home, dateKey: 'deliveredAt' },
];

export default function OrderTracking() {
  const { user, isLoading: authLoading } = useAuth();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const noParam = urlParams.get('no');

    if (noParam) {
      setOrderNumber(noParam);
      searchOrder(noParam);
    }
  }, []);

  const searchOrder = async (searchOrderNumber: string) => {
    if (!searchOrderNumber.trim()) {
      setError('Sipariş numarası girin');
      return;
    }

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const params = new URLSearchParams({ orderNumber: searchOrderNumber.trim() });

      const res = await fetch(`/api/orders/track?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setOrder(data);
      } else {
        setError(data.error || 'Sipariş bulunamadı');
      }
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    searchOrder(orderNumber);
  };

  const copyTracking = async () => {
    if (!order?.trackingNumber) return;
    try {
      await navigator.clipboard.writeText(order.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const currentStatus = order ? statusConfig[order.status] || statusConfig.pending : null;
  const currentStep = currentStatus?.step || 0;

  return (
    <div className="min-h-screen bg-[#faf7f1] flex flex-col overflow-x-hidden">
      <Header />

      {/* Üst — sayfa başlığı */}
      <section className="relative bg-white border-b border-black/[0.06]">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-polen-orange to-transparent"
        />
        <div className="max-w-4xl mx-auto px-5 lg:px-8 pt-12 pb-10">
          {/* Mobil — dikey ortalı */}
          <div className="flex flex-col items-center text-center sm:hidden">
            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              className="w-20 h-20 mb-5 rounded-full bg-polen-orange flex items-center justify-center shadow-[0_8px_24px_-6px_rgba(253,181,29,0.55)]"
            >
              <Package className="w-9 h-9 text-black" strokeWidth={2} />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="font-display text-2xl tracking-[0.14em] uppercase text-black mb-3"
              data-testid="text-page-title"
            >
              Sipariş Takip
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="text-sm text-black/60 max-w-md"
            >
              Sipariş numaranızı girerek siparişinizin güncel durumunu öğrenin.
            </motion.p>
          </div>

          {/* Masaüstü — yatay, ortalı */}
          <div className="hidden sm:flex items-center justify-center gap-6">
            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              className="w-20 h-20 rounded-full bg-polen-orange flex items-center justify-center shadow-[0_8px_24px_-6px_rgba(253,181,29,0.55)] shrink-0"
            >
              <Package className="w-9 h-9 text-black" strokeWidth={2} />
            </motion.div>
            <div className="text-left">
              <motion.h1
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 }}
                className="font-display text-3xl tracking-[0.14em] uppercase text-black mb-2"
              >
                Sipariş Takip
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.14 }}
                className="text-sm text-black/60 max-w-md"
              >
                Sipariş numaranızı girerek siparişinizin güncel durumunu öğrenin.
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 px-4 sm:px-6 py-10">
        <div className="max-w-2xl mx-auto">
          {/* Arama formu */}
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            onSubmit={handleSearch}
            className="bg-white border border-black/[0.08] p-5 sm:p-6 mb-5"
          >
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-black/55 font-medium mb-2">
                  Sipariş Numarası *
                </label>
                <Input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="PS-XXXXXX"
                  className="h-12 bg-[#faf7f1] border-black/15 text-black placeholder:text-black/30 focus:border-polen-orange rounded-none"
                  data-testid="input-order-number"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-black/55 font-medium mb-2">
                  E-posta (Opsiyonel)
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@email.com"
                  className="h-12 bg-[#faf7f1] border-black/15 text-black placeholder:text-black/30 focus:border-polen-orange rounded-none"
                  data-testid="input-email"
                />
              </div>
            </div>

            {error && (
              <div
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-sm flex items-center gap-2"
                data-testid="text-error"
              >
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-polen-orange text-black hover:bg-[hsl(var(--polen-orange-deep))] hover:text-white font-semibold tracking-[0.1em] uppercase text-[12px] rounded-none"
              data-testid="button-search-order"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" strokeWidth={2.5} />
                  Siparişimi Bul
                </>
              )}
            </Button>
          </motion.form>

          {!authLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="mb-5"
            >
              {user ? (
                <Link
                  href="/hesabim/siparislerim"
                  className="flex items-center justify-between gap-3 bg-white border border-black/[0.08] hover:border-polen-orange/60 hover:bg-polen-orange/5 transition-colors px-5 py-4 group"
                  data-testid="link-all-orders"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-polen-orange/15 flex items-center justify-center shrink-0">
                      <ListOrdered className="w-4 h-4 text-black" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-black">
                        Tüm Siparişlerim
                      </p>
                      <p className="text-[11px] text-black/55 truncate">
                        Hesabınızdaki tüm siparişleri görüntüleyin
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    className="w-4 h-4 text-black/45 group-hover:text-polen-orange group-hover:translate-x-1 transition-all shrink-0"
                    strokeWidth={2.2}
                  />
                </Link>
              ) : (
                <Link
                  href="/giris"
                  className="flex items-center justify-between gap-3 bg-white border border-black/[0.08] hover:border-polen-orange/60 hover:bg-polen-orange/5 transition-colors px-5 py-4 group"
                  data-testid="link-login-for-orders"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-polen-orange/15 flex items-center justify-center shrink-0">
                      <LogIn className="w-4 h-4 text-black" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-black">
                        Giriş Yap
                      </p>
                      <p className="text-[11px] text-black/55 truncate">
                        Tüm siparişlerinizi tek yerden görmek için giriş yapın
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    className="w-4 h-4 text-black/45 group-hover:text-polen-orange group-hover:translate-x-1 transition-all shrink-0"
                    strokeWidth={2.2}
                  />
                </Link>
              )}
            </motion.div>
          )}

          {order && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="space-y-5"
            >
              {/* Sipariş üst bilgisi */}
              <div className="bg-white border border-black/[0.08] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-black/45 font-medium mb-1.5">
                      Sipariş No
                    </p>
                    <p
                      className="font-mono text-xl sm:text-2xl font-bold text-black tracking-wide"
                      data-testid="text-order-number"
                    >
                      #{order.orderNumber}
                    </p>
                    <p className="text-xs text-black/50 mt-2">
                      {new Date(order.createdAt).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {currentStatus && (
                    <div className="text-right">
                      <p className="text-[10px] tracking-[0.2em] uppercase text-black/45 font-medium mb-1.5">
                        Durum
                      </p>
                      <span
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-polen-orange/15 text-black border border-polen-orange/40 text-[12px] font-semibold tracking-[0.06em] uppercase"
                        data-testid="text-order-status"
                      >
                        {order.paymentMethod === 'bank_transfer' && order.paymentStatus === 'awaiting_transfer' ? (
                          <>🏦 Havale Bekleniyor</>
                        ) : (
                          <>
                            <currentStatus.icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                            {currentStatus.label}
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Havale bekleme uyarısı */}
              {order.paymentMethod === 'bank_transfer' && order.paymentStatus === 'awaiting_transfer' && (
                <div
                  className="bg-polen-orange/[0.08] border border-polen-orange/30 p-5 sm:p-6"
                  data-testid="card-awaiting-transfer"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-polen-orange/20 flex items-center justify-center shrink-0">
                      <span className="text-xl">🏦</span>
                    </div>
                    <div>
                      <p className="font-display text-base tracking-[0.1em] uppercase text-black mb-1">
                        Havale Ödemesi Bekleniyor
                      </p>
                      <p className="text-[13px] text-black/65 leading-relaxed">
                        Aşağıdaki banka hesabına ödemeniz geçtiğinde siparişiniz onaylanıp hazırlığa alınacak.
                      </p>
                    </div>
                  </div>
                  <div className="bg-white border border-black/8 p-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-black/55">Banka</span>
                      <span className="font-semibold text-black">{BANK_TRANSFER_INFO.bankName}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-black/55">Hesap Sahibi</span>
                      <span className="font-semibold text-black">{BANK_TRANSFER_INFO.accountHolder}</span>
                    </div>
                    <div className="flex flex-col gap-1 pt-1">
                      <span className="text-black/55 text-xs">IBAN</span>
                      <span className="font-mono text-[13px] sm:text-sm font-bold text-black break-all" data-testid="text-bank-iban">
                        {BANK_TRANSFER_INFO.iban}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-black/55 leading-relaxed">
                    Açıklamaya <span className="font-mono font-semibold text-black">#{order.orderNumber}</span> yazmanız işlemi hızlandırır.
                  </p>
                </div>
              )}

              {/* Timeline — sipariş aşamaları (havale onayı bekleyen siparişlerde gizli) */}
              {order.status !== 'cancelled' && !(order.paymentMethod === 'bank_transfer' && order.paymentStatus === 'awaiting_transfer') && (
                <div className="bg-white border border-black/[0.08] p-5 sm:p-6">
                  <h3 className="text-[11px] tracking-[0.2em] uppercase text-black/55 font-semibold mb-6">
                    Sipariş Aşamaları
                  </h3>

                  {/* Mobil — dikey timeline */}
                  <ol className="relative sm:hidden">
                    {steps.map((step, i, arr) => {
                      const isCompleted = currentStep > step.id;
                      const isCurrent = currentStep === step.id;
                      const isLast = i === arr.length - 1;
                      const StepIcon = step.icon;
                      const stepDate = formatStepDate(order[step.dateKey] as string | null | undefined);
                      return (
                        <li
                          key={step.id}
                          className="flex gap-4 pb-5 last:pb-0 relative"
                          data-testid={`timeline-step-${step.id}`}
                        >
                          {!isLast && (
                            <span
                              aria-hidden
                              className={`absolute left-[18px] top-9 bottom-0 w-px ${
                                isCompleted ? 'bg-polen-orange' : 'bg-black/10'
                              }`}
                            />
                          )}
                          <div
                            className={`relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                              isCompleted || isCurrent
                                ? 'bg-polen-orange text-black'
                                : 'bg-black/[0.05] text-black/35'
                            }`}
                          >
                            <StepIcon className="w-4 h-4" strokeWidth={2} />
                          </div>
                          <div className="flex-1 pt-1.5">
                            <p
                              className={`text-[13px] font-semibold ${
                                isCompleted || isCurrent ? 'text-black' : 'text-black/55'
                              }`}
                            >
                              {step.label}
                            </p>
                            {stepDate && (isCompleted || isCurrent) && (
                              <p
                                className="text-[11px] text-black/55 mt-0.5"
                                title={stepDate.absolute}
                                data-testid={`text-step-date-${step.id}`}
                              >
                                {stepDate.relative}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>

                  {/* Masaüstü — yatay timeline */}
                  <div className="hidden sm:block">
                    <div className="flex justify-between items-start relative">
                      <div className="absolute left-5 right-5 top-5 h-px bg-black/10 z-0" />
                      <div
                        className="absolute left-5 top-5 h-px bg-polen-orange z-0 transition-all duration-500"
                        style={{
                          width: `calc(${
                            ((Math.max(currentStep, 1) - 1) / (steps.length - 1)) * 100
                          }% - ${
                            ((Math.max(currentStep, 1) - 1) / (steps.length - 1)) * 40
                          }px)`,
                        }}
                      />
                      {steps.map((step) => {
                        const isCompleted = currentStep > step.id;
                        const isCurrent = currentStep === step.id;
                        const StepIcon = step.icon;
                        const stepDate = formatStepDate(order[step.dateKey] as string | null | undefined);
                        return (
                          <div
                            key={step.id}
                            className="relative z-10 flex flex-col items-center flex-1"
                            data-testid={`timeline-step-${step.id}`}
                          >
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                isCompleted || isCurrent
                                  ? 'bg-polen-orange text-black shadow-[0_4px_14px_-4px_rgba(253,181,29,0.6)]'
                                  : 'bg-[#faf7f1] border border-black/15 text-black/35'
                              }`}
                            >
                              <StepIcon className="w-4 h-4" strokeWidth={2} />
                            </div>
                            <span
                              className={`text-[11px] mt-3 font-semibold tracking-[0.06em] uppercase text-center ${
                                isCompleted || isCurrent ? 'text-black' : 'text-black/45'
                              }`}
                            >
                              {step.label}
                            </span>
                            {stepDate && (isCompleted || isCurrent) ? (
                              <span
                                className="text-[10px] mt-1 text-black/55 text-center"
                                title={stepDate.absolute}
                                data-testid={`text-step-date-${step.id}`}
                              >
                                {stepDate.relative}
                              </span>
                            ) : (
                              <span className="text-[10px] mt-1 text-transparent">—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {currentStatus && (
                    <p className="text-[12px] text-black/55 mt-6 text-center leading-relaxed">
                      {currentStatus.description}
                    </p>
                  )}
                </div>
              )}

              {/* DHL takip kartı */}
              {order.trackingNumber && (
                <div
                  className="relative bg-white border border-polen-orange/40 p-5 sm:p-6"
                  data-testid="card-tracking"
                >
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-1 bg-polen-orange"
                  />
                  <div className="flex items-center gap-2 mb-4">
                    <Truck className="w-4 h-4 text-black/70" strokeWidth={2} />
                    <span className="text-[11px] tracking-[0.2em] uppercase text-black/55 font-semibold">
                      Kargo Takibi
                    </span>
                    {order.shippingCarrier && (
                      <span className="ml-auto text-[11px] text-black/50 font-medium">
                        {order.shippingCarrier}
                      </span>
                    )}
                  </div>

                  <div className="text-center mb-5">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-black/45 font-medium mb-2">
                      Takip Numarası
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <p
                        className="font-mono text-xl sm:text-2xl font-bold text-black tracking-widest break-all"
                        data-testid="text-tracking-number"
                      >
                        {order.trackingNumber}
                      </p>
                      <button
                        onClick={copyTracking}
                        className="p-1.5 text-black/45 hover:text-polen-orange hover:bg-black/[0.04] transition-colors rounded shrink-0"
                        aria-label="Takip numarasını kopyala"
                        data-testid="button-copy-tracking"
                      >
                        {copied ? (
                          <CheckIcon className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                        ) : (
                          <Copy className="w-4 h-4" strokeWidth={2} />
                        )}
                      </button>
                    </div>
                    {copied && (
                      <p className="text-[11px] text-emerald-600 mt-2">Kopyalandı</p>
                    )}
                  </div>

                  <a
                    href={
                      order.trackingUrl ||
                      `https://www.dhl.com/tr-tr/home/tracking.html?tracking-id=${order.trackingNumber}&submit=1`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-12 bg-polen-orange text-black hover:bg-[hsl(var(--polen-orange-deep))] hover:text-white transition-colors font-semibold tracking-[0.1em] uppercase text-[12px]"
                    data-testid="link-tracking-external"
                  >
                    Kargoda Takip Et
                    <ExternalLink className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </a>
                </div>
              )}

              {/* Ürünler */}
              <div className="bg-white border border-black/[0.08] p-5 sm:p-6">
                <h3 className="text-[11px] tracking-[0.2em] uppercase text-black/55 font-semibold mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-3.5 h-3.5" strokeWidth={2} />
                  Ürünler
                </h3>
                <div className="divide-y divide-black/[0.06]">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                      data-testid={`row-item-${item.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[13px] font-semibold text-black"
                          data-testid={`text-product-${item.id}`}
                        >
                          {item.productName}
                        </p>
                        {item.variantDetails && (
                          <p className="text-[11px] text-black/50 mt-0.5">
                            {item.variantDetails}
                          </p>
                        )}
                        <p className="text-[11px] text-black/55 mt-1">Adet: {item.quantity}</p>
                      </div>
                      <p className="text-[13px] font-bold text-black whitespace-nowrap">
                        {item.subtotal}₺
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adres + özet */}
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="bg-white border border-black/[0.08] p-5">
                  <h3 className="text-[11px] tracking-[0.2em] uppercase text-black/55 font-semibold mb-3">
                    Teslimat Adresi
                  </h3>
                  <p className="text-[13px] font-semibold text-black mb-1">
                    {order.customerName}
                  </p>
                  <p className="text-[12px] text-black/65 leading-relaxed">
                    {order.shippingAddress.address}
                  </p>
                  <p className="text-[12px] text-black/65 leading-relaxed">
                    {order.shippingAddress.district}, {order.shippingAddress.city}{' '}
                    {order.shippingAddress.postalCode}
                  </p>
                </div>
                <div className="bg-white border border-black/[0.08] p-5">
                  <h3 className="text-[11px] tracking-[0.2em] uppercase text-black/55 font-semibold mb-3">
                    Özet
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[12px] text-black/65">
                      <span>Kargo</span>
                      <span>
                        {parseFloat(order.shippingCost) === 0
                          ? 'Ücretsiz'
                          : `${order.shippingCost}₺`}
                      </span>
                    </div>
                    <div className="flex justify-between text-[14px] font-bold text-black pt-2 border-t border-black/10">
                      <span>Toplam</span>
                      <span data-testid="text-order-total">{order.total}₺</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Geri dön CTA */}
              <div className="pt-2">
                <Link href="/">
                  <Button
                    className="w-full h-12 bg-polen-orange text-black hover:bg-[hsl(var(--polen-orange-deep))] hover:text-white font-semibold tracking-[0.1em] uppercase text-[12px] group rounded-none"
                    data-testid="button-continue-shopping"
                  >
                    Alışverişe Devam Et
                    <ArrowRight
                      className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1"
                      strokeWidth={2.5}
                    />
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
