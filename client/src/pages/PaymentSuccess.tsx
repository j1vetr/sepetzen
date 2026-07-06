import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  ArrowRight,
  Loader2,
  Package,
  Truck,
  Home,
  Copy,
  Check as CheckIcon,
  AlertTriangle,
  Phone,
  Clock,
} from 'lucide-react';
import { BANK_TRANSFER_INFO } from '@shared/bankInfo';
import { SEO } from '@/components/SEO';

export default function PaymentSuccess() {
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_transfer'>('card');
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    const params = new URLSearchParams(window.location.search);
    const oid = params.get('oid');
    const method = params.get('method');

    if (!oid) {
      setError('Sipariş bulunamadı');
      setLoading(false);
      return;
    }

    if (method === 'bank_transfer') {
      // Bank transfer orders are confirmed server-side at submit time;
      // no payment polling required — show success immediately.
      setPaymentMethod('bank_transfer');
      setOrderNumber(oid);
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      if (cancelledRef.current) return;
      try {
        const res = await fetch(`/api/payment/status/${oid}`, {
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          // Havale algılaması — query param olmadan refresh edildiğinde de
          // doğru ekran gösterilsin diye order'ın paymentMethod'una bakarız.
          if (data.paymentMethod === 'bank_transfer' || data.status === 'awaiting_transfer') {
            setPaymentMethod('bank_transfer');
            setOrderNumber(data.orderNumber || oid);
            setLoading(false);
            return;
          }
          if (data.status === 'completed') {
            setOrderNumber(data.orderNumber);
            setLoading(false);
          } else if (data.status === 'failed') {
            setError('Ödeme işlemi başarısız oldu');
            setLoading(false);
          } else {
            setTimeout(checkStatus, 2500);
          }
        } else {
          setError('Sipariş durumu kontrol edilemedi');
          setLoading(false);
        }
      } catch (err) {
        setError('Bir hata oluştu');
        setLoading(false);
      }
    };

    checkStatus();
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const copyIban = async () => {
    try {
      await navigator.clipboard.writeText(BANK_TRANSFER_INFO.iban);
      setCopiedIban(true);
      setTimeout(() => setCopiedIban(false), 1800);
    } catch {}
  };

  const copyOrderNumber = async () => {
    if (!orderNumber) return;
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f1] flex flex-col">
        <SEO title="Sipariş Onayı" description="Sepetzen sipariş onay sayfası." url="/odeme-basarili" noIndex />
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full border-2 border-polen-orange/20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-polen-orange" strokeWidth={2} />
            </div>
            <h2 className="font-display text-xl tracking-[0.14em] uppercase text-black mb-2">
              Ödemeniz Onaylanıyor
            </h2>
            <p className="text-sm text-black/55">Banka cevabı bekleniyor, lütfen sayfayı kapatmayın…</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#faf7f1] flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-amber-600" strokeWidth={2} />
            </div>
            <h1 className="font-display text-2xl tracking-[0.14em] uppercase text-black mb-3">
              Bir Sorun Oluştu
            </h1>
            <p className="text-sm text-black/60 mb-7">{error}</p>
            <Link href="/">
              <Button className="h-12 px-7 bg-polen-orange text-black hover:bg-[hsl(var(--polen-orange-deep))] hover:text-white font-semibold tracking-[0.1em] uppercase text-[12px] rounded-none">
                Ana Sayfaya Dön
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────
  const isBankTransfer = paymentMethod === 'bank_transfer';
  return (
    <div className="min-h-screen bg-[#faf7f1] flex flex-col overflow-x-hidden">
      <Header />

      {/* Üst — başarı banneri */}
      <section className="relative bg-white border-b border-black/[0.06]">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-polen-orange to-transparent"
        />
        <div className="max-w-3xl mx-auto px-5 lg:px-8 pt-12 pb-10 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="w-20 h-20 mx-auto mb-5 rounded-full bg-polen-orange flex items-center justify-center shadow-[0_8px_24px_-6px_rgba(253,181,29,0.55)]"
          >
            {isBankTransfer ? (
              <span className="text-3xl">🏦</span>
            ) : (
              <CheckCircle2 className="w-10 h-10 text-black" strokeWidth={2.2} />
            )}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="font-display text-2xl sm:text-3xl tracking-[0.14em] uppercase text-black mb-3"
            data-testid="text-order-success"
          >
            {isBankTransfer ? 'Siparişiniz Alındı' : 'Ödemeniz Alındı'}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="text-sm text-black/60 max-w-md mx-auto"
          >
            {isBankTransfer
              ? 'Havale ödemeniz alındığında siparişiniz onaylanıp hazırlığa alınacak.'
              : 'Siparişiniz başarıyla oluşturuldu. Onay e-postası birazdan gelecek.'}
          </motion.p>
        </div>
      </section>

      <main className="flex-1 px-4 sm:px-6 py-10">
        <div className="max-w-2xl mx-auto">
          {/* Sipariş özet kartı */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="bg-white border border-black/[0.08] p-5 sm:p-6 mb-5"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-black/45 font-medium mb-1.5">
                  Sipariş No
                </p>
                <div className="flex items-center gap-2">
                  <p
                    className="font-mono text-xl sm:text-2xl font-bold text-black tracking-wide"
                    data-testid="text-order-number"
                  >
                    #{orderNumber}
                  </p>
                  <button
                    onClick={copyOrderNumber}
                    className="p-1.5 text-black/45 hover:text-polen-orange hover:bg-black/[0.04] transition-colors rounded"
                    aria-label="Sipariş numarasını kopyala"
                    data-testid="button-copy-order-number"
                  >
                    {copied ? (
                      <CheckIcon className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                    ) : (
                      <Copy className="w-4 h-4" strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] tracking-[0.2em] uppercase text-black/45 font-medium mb-1.5">
                  {isBankTransfer ? 'Durum' : 'Tahmini Teslim'}
                </p>
                <p className={`text-sm font-semibold ${isBankTransfer ? 'text-polen-orange' : 'text-black'}`}>
                  {isBankTransfer ? 'Havale Bekleniyor' : '2-4 İş Günü'}
                </p>
              </div>
            </div>

            <Link href={`/siparis-takip?no=${orderNumber}`}>
              <button
                className="mt-5 w-full h-11 border border-black/15 text-black hover:bg-black/[0.04] font-semibold tracking-[0.08em] uppercase text-[11.5px] flex items-center justify-center gap-2 transition-colors"
                data-testid="button-track-order"
              >
                Siparişimi Takip Et
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </Link>
          </motion.div>

          {/* Banka bilgileri (sadece havale) */}
          {isBankTransfer && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.21 }}
              className="bg-polen-orange/[0.08] border border-polen-orange/30 p-5 sm:p-6 mb-5"
              data-testid="card-bank-info"
            >
              <p className="text-[10px] tracking-[0.2em] uppercase text-polen-orange font-semibold mb-3">
                Banka Bilgileri
              </p>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-black/55">Banka</span>
                  <span className="font-semibold text-black">{BANK_TRANSFER_INFO.bankName}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-black/55">Hesap Sahibi</span>
                  <span className="font-semibold text-black">{BANK_TRANSFER_INFO.accountHolder}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-black/55 text-xs">IBAN</span>
                  <div className="flex items-center gap-2 bg-white border border-black/8 px-3 py-2.5">
                    <span className="font-mono text-[13px] sm:text-sm font-bold text-black flex-1 break-all" data-testid="text-iban">
                      {BANK_TRANSFER_INFO.iban}
                    </span>
                    <button
                      onClick={copyIban}
                      className="p-1.5 text-black/45 hover:text-polen-orange hover:bg-black/[0.04] transition-colors rounded shrink-0"
                      aria-label="IBAN'ı kopyala"
                      data-testid="button-copy-iban"
                    >
                      {copiedIban ? (
                        <CheckIcon className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                      ) : (
                        <Copy className="w-4 h-4" strokeWidth={2} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-black/60 leading-relaxed">
                Açıklama alanına <span className="font-mono font-semibold text-black">#{orderNumber}</span> yazmanız işlemi hızlandırır. Ödemeniz onaylandıktan sonra siparişiniz hazırlığa alınır.
              </p>
            </motion.div>
          )}

          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="bg-white border border-black/[0.08] p-5 sm:p-6 mb-5"
          >
            <h3 className="text-[11px] tracking-[0.2em] uppercase text-black/55 font-semibold mb-5">
              Şimdi Ne Olacak?
            </h3>
            <ol className="relative">
              {(isBankTransfer
                ? [
                    {
                      icon: Clock,
                      title: 'Havale Bekleniyor',
                      desc: 'Yukarıdaki IBAN üzerinden ödemenizi yapın.',
                      active: true,
                    },
                    {
                      icon: CheckCircle2,
                      title: 'Sipariş Onayı',
                      desc: 'Ödemeniz hesaba geçince siparişiniz onaylanır ve onay e-postası gönderilir.',
                      active: false,
                    },
                    {
                      icon: Package,
                      title: 'Hazırlık ve Kargo',
                      desc: '1 iş günü içinde paketlenir, takip numarası iletilir.',
                      active: false,
                    },
                  ]
                : [
                    {
                      icon: Package,
                      title: 'Sipariş Hazırlanıyor',
                      desc: '1 iş günü içinde ürünleriniz özenle paketlenir.',
                      active: true,
                    },
                    {
                      icon: Truck,
                      title: 'Kargoya Veriliyor',
                      desc: 'Takip numarası SMS ve e-posta ile bildirilir.',
                      active: false,
                    },
                    {
                      icon: Home,
                      title: 'Adresinizde',
                      desc: 'Anlaşmalı kargo ile kapınıza kadar teslim.',
                      active: false,
                    },
                  ]
              ).map((step, i, arr) => {
                const Icon = step.icon;
                const isLast = i === arr.length - 1;
                return (
                  <li key={step.title} className="flex gap-4 pb-5 last:pb-0 relative">
                    {!isLast && (
                      <span
                        aria-hidden
                        className="absolute left-[18px] top-9 bottom-0 w-px bg-black/10"
                      />
                    )}
                    <div
                      className={`relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        step.active
                          ? 'bg-polen-orange text-black'
                          : 'bg-black/[0.05] text-black/35'
                      }`}
                    >
                      <Icon className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <div className="flex-1 pt-1">
                      <p
                        className={`text-[13px] font-semibold mb-0.5 ${
                          step.active ? 'text-black' : 'text-black/55'
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-[12px] text-black/50 leading-relaxed">{step.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </motion.div>

          {/* Yardım kutusu */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#1a1612] text-white p-5 sm:p-6 mb-7"
          >
            <p className="text-[11px] tracking-[0.18em] uppercase text-white/50 font-medium mb-2">
              Yardım gerekirse
            </p>
            <p className="text-sm text-white/85 mb-4 leading-relaxed">
              Siparişinizle ilgili sorularınız için bizi arayabilir veya WhatsApp üzerinden ulaşabilirsiniz.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href="tel:+905326956183"
                className="flex-1 inline-flex items-center justify-center gap-2 h-11 border border-white/20 hover:border-polen-orange hover:text-polen-orange transition-colors text-[12px] tracking-[0.08em] uppercase font-semibold"
                data-testid="link-help-phone"
              >
                <Phone className="w-3.5 h-3.5" strokeWidth={2} />
                0532 695 61 83
              </a>
              <a
                href="https://wa.me/905326956183"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 h-11 bg-polen-orange text-black hover:bg-white transition-colors text-[12px] tracking-[0.08em] uppercase font-semibold"
                data-testid="link-help-whatsapp"
              >
                WhatsApp
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </a>
            </div>
          </motion.div>

          {/* Geri dön CTA */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/" className="flex-1">
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
            <Link href="/hesabim/siparislerim" className="flex-1">
              <Button
                variant="outline"
                className="w-full h-12 border-black/20 text-black hover:bg-black/[0.04] font-semibold tracking-[0.1em] uppercase text-[12px] rounded-none"
                data-testid="button-view-orders"
              >
                Siparişlerim
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
