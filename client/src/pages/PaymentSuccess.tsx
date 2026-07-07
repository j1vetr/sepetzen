import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
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
      setPaymentMethod('bank_transfer');
      setOrderNumber(oid);
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      if (cancelledRef.current) return;
      try {
        const res = await fetch(`/api/payment/status/${oid}`, { credentials: 'include' });

        if (res.ok) {
          const data = await res.json();
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
      } catch {
        setError('Bir hata oluştu');
        setLoading(false);
      }
    };

    checkStatus();
    return () => { cancelledRef.current = true; };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <SEO title="Sipariş Onayı" description="Sepetzen sipariş onay sayfası." url="/odeme-basarili" noIndex />
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#2D5A27]" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Ödemeniz Onaylanıyor</h2>
            <p className="text-sm text-gray-500">Banka cevabı bekleniyor, lütfen sayfayı kapatmayın…</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-amber-600" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Bir Sorun Oluştu</h1>
            <p className="text-sm text-gray-500 mb-7">{error}</p>
            <Link href="/">
              <button className="h-12 px-7 bg-[#2D5A27] text-white hover:bg-[#20401c] font-semibold rounded-md transition-colors">
                Ana Sayfaya Dön
              </button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isBankTransfer = paymentMethod === 'bank_transfer';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
      <SEO title="Sipariş Onayı" description="Sepetzen sipariş onay sayfası." url="/odeme-basarili" noIndex />
      <Header />

      {/* Success banner */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-5 lg:px-8 pt-12 pb-10 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="w-20 h-20 mx-auto mb-5 rounded-full bg-[#2D5A27] flex items-center justify-center shadow-[0_8px_24px_-6px_rgba(45,90,39,0.45)]"
          >
            {isBankTransfer ? (
              <span className="text-3xl">🏦</span>
            ) : (
              <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2.2} />
            )}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3"
            data-testid="text-order-success"
          >
            {isBankTransfer ? 'Siparişiniz Alındı' : 'Ödemeniz Alındı'}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="text-sm text-gray-500 max-w-md mx-auto"
          >
            {isBankTransfer
              ? 'Havale ödemeniz alındığında siparişiniz onaylanıp hazırlığa alınacak.'
              : 'Siparişiniz başarıyla oluşturuldu. Onay e-postası birazdan gelecek.'}
          </motion.p>
        </div>
      </section>

      <main className="flex-1 px-4 sm:px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* Order summary card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wide">Sipariş No</p>
                <div className="flex items-center gap-2">
                  <p
                    className="font-mono text-xl sm:text-2xl font-bold text-gray-900 tracking-wide"
                    data-testid="text-order-number"
                  >
                    #{orderNumber}
                  </p>
                  <button
                    onClick={copyOrderNumber}
                    className="p-1.5 text-gray-400 hover:text-[#2D5A27] hover:bg-gray-50 transition-colors rounded"
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
                <p className="text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wide">
                  {isBankTransfer ? 'Durum' : 'Tahmini Teslim'}
                </p>
                <p className={`text-sm font-semibold ${isBankTransfer ? 'text-amber-600' : 'text-gray-900'}`}>
                  {isBankTransfer ? 'Havale Bekleniyor' : '2-4 İş Günü'}
                </p>
              </div>
            </div>

            <Link href={`/siparis-takip?no=${orderNumber}`}>
              <button
                className="mt-5 w-full h-11 border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-sm flex items-center justify-center gap-2 transition-colors rounded-md"
                data-testid="button-track-order"
              >
                Siparişimi Takip Et
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </Link>
          </motion.div>

          {/* Bank info (bank transfer only) */}
          {isBankTransfer && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.21 }}
              className="bg-green-50 border border-green-200 rounded-lg p-5 sm:p-6"
              data-testid="card-bank-info"
            >
              <p className="text-xs font-semibold text-[#2D5A27] uppercase tracking-wide mb-3">Banka Bilgileri</p>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Banka</span>
                  <span className="font-semibold text-gray-900">{BANK_TRANSFER_INFO.bankName}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Hesap Sahibi</span>
                  <span className="font-semibold text-gray-900">{BANK_TRANSFER_INFO.accountHolder}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-gray-500 text-xs">IBAN</span>
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded px-3 py-2.5">
                    <span className="font-mono text-[13px] sm:text-sm font-bold text-gray-900 flex-1 break-all" data-testid="text-iban">
                      {BANK_TRANSFER_INFO.iban}
                    </span>
                    <button
                      onClick={copyIban}
                      className="p-1.5 text-gray-400 hover:text-[#2D5A27] hover:bg-gray-50 transition-colors rounded shrink-0"
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
              <p className="mt-4 text-xs text-gray-600 leading-relaxed">
                Açıklama alanına <span className="font-mono font-semibold text-gray-900">#{orderNumber}</span> yazmanız
                işlemi hızlandırır. Ödemeniz onaylandıktan sonra siparişiniz hazırlığa alınır.
              </p>
            </motion.div>
          )}

          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 sm:p-6"
          >
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-5">Şimdi Ne Olacak?</h3>
            <ol className="relative">
              {(isBankTransfer
                ? [
                    { icon: Clock, title: 'Havale Bekleniyor', desc: 'Yukarıdaki IBAN üzerinden ödemenizi yapın.', active: true },
                    { icon: CheckCircle2, title: 'Sipariş Onayı', desc: 'Ödemeniz hesaba geçince siparişiniz onaylanır ve onay e-postası gönderilir.', active: false },
                    { icon: Package, title: 'Hazırlık ve Kargo', desc: '1 iş günü içinde paketlenir, takip numarası iletilir.', active: false },
                  ]
                : [
                    { icon: Package, title: 'Sipariş Hazırlanıyor', desc: '1 iş günü içinde ürünleriniz özenle paketlenir.', active: true },
                    { icon: Truck, title: 'Kargoya Veriliyor', desc: 'Takip numarası SMS ve e-posta ile bildirilir.', active: false },
                    { icon: Home, title: 'Adresinizde', desc: 'Anlaşmalı kargo ile kapınıza kadar teslim.', active: false },
                  ]
              ).map((step, i, arr) => {
                const Icon = step.icon;
                const isLast = i === arr.length - 1;
                return (
                  <li key={step.title} className="flex gap-4 pb-5 last:pb-0 relative">
                    {!isLast && (
                      <span aria-hidden className="absolute left-[18px] top-9 bottom-0 w-px bg-gray-200" />
                    )}
                    <div
                      className={`relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        step.active ? 'bg-[#2D5A27] text-white' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className={`text-[13px] font-semibold mb-0.5 ${step.active ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.title}
                      </p>
                      <p className="text-[12px] text-gray-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </motion.div>

          {/* Help box */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-900 text-white rounded-lg p-5 sm:p-6"
          >
            <p className="text-xs font-medium text-white/50 uppercase tracking-wide mb-2">Yardım gerekirse</p>
            <p className="text-sm text-white/85 mb-4 leading-relaxed">
              Siparişinizle ilgili sorularınız için bizi arayabilir veya WhatsApp üzerinden ulaşabilirsiniz.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href="tel:+905366301138"
                className="flex-1 inline-flex items-center justify-center gap-2 h-11 border border-white/20 hover:border-[#4a9a42] hover:text-[#4a9a42] transition-colors text-sm font-semibold rounded-md"
                data-testid="link-help-phone"
              >
                <Phone className="w-3.5 h-3.5" strokeWidth={2} />
                0536 630 11 38
              </a>
              <a
                href="https://wa.me/905366301138"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 h-11 bg-[#2D5A27] hover:bg-[#4a9a42] text-white transition-colors text-sm font-semibold rounded-md"
                data-testid="link-help-whatsapp"
              >
                WhatsApp
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </a>
            </div>
          </motion.div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pb-4">
            <Link href="/" className="flex-1">
              <button
                className="w-full h-12 bg-[#2D5A27] hover:bg-[#20401c] text-white font-semibold text-sm flex items-center justify-center gap-2 group rounded-md transition-colors"
                data-testid="button-continue-shopping"
              >
                Alışverişe Devam Et
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
              </button>
            </Link>
            <Link href="/hesabim/siparislerim" className="flex-1">
              <button
                className="w-full h-12 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold text-sm flex items-center justify-center rounded-md transition-colors"
                data-testid="button-view-orders"
              >
                Siparişlerim
              </button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
