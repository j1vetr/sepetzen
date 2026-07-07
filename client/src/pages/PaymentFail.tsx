import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, RefreshCw, Phone, CreditCard, ShieldCheck, Wallet } from 'lucide-react';
import { SEO } from '@/components/SEO';

export default function PaymentFail() {
  const [merchantOid, setMerchantOid] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oid = params.get('oid');
    const reason = params.get('reason');
    if (oid) setMerchantOid(oid);
    if (reason) setFailureReason(reason);
  }, []);

  const reasons = [
    { icon: Wallet, text: 'Kart bakiyesi yetersiz olabilir' },
    { icon: CreditCard, text: 'Kart bilgileri hatalı girilmiş olabilir' },
    { icon: ShieldCheck, text: 'Kartınız online alışverişe kapalı olabilir' },
    { icon: AlertTriangle, text: '3D Secure doğrulaması tamamlanmamış olabilir' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
      <SEO title="Ödeme Başarısız" description="Ödeme tamamlanamadı." url="/odeme-basarisiz" noIndex />
      <Header />

      {/* Warning banner */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-5 lg:px-8 pt-12 pb-10 text-center">
          <motion.div
            initial={{ scale: 0, rotate: 8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="w-20 h-20 mx-auto mb-5 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center"
          >
            <AlertTriangle className="w-10 h-10 text-amber-600" strokeWidth={2} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3"
            data-testid="text-payment-failed"
          >
            Ödeme Tamamlanamadı
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="text-sm text-gray-500 max-w-md mx-auto"
          >
            Endişelenmeyin — kartınızdan herhangi bir tutar çekilmedi. Bilgilerinizi kontrol edip tekrar deneyebilirsiniz.
          </motion.p>
        </div>
      </section>

      <main className="flex-1 px-4 sm:px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* Bank message */}
          {failureReason && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-amber-50 border border-amber-200 rounded-lg p-5"
              data-testid="text-payment-failure-reason"
            >
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">
                Banka / iyzico mesajı
              </p>
              <p className="text-sm text-amber-900 leading-relaxed">{failureReason}</p>
            </motion.div>
          )}

          {/* Transaction ID */}
          {merchantOid && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="bg-white border border-gray-200 rounded-lg shadow-sm px-5 py-4 flex items-center justify-between"
            >
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">İşlem No</span>
              <span className="font-mono text-sm font-semibold text-gray-900">{merchantOid}</span>
            </motion.div>
          )}

          {/* Possible reasons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
          >
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Olası Nedenler</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reasons.map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 flex items-start gap-3 hover:border-[#4a9a42]/50 transition-colors shadow-sm"
                  data-testid={`card-reason-${text.slice(0, 20)}`}
                >
                  <span className="w-9 h-9 rounded-full bg-[#2D5A27]/10 border border-[#2D5A27]/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#2D5A27]" strokeWidth={2} />
                  </span>
                  <span className="text-[13px] text-gray-600 leading-snug pt-1">{text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Help box */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-900 text-white rounded-lg p-5 sm:p-6"
          >
            <p className="text-xs font-medium text-white/50 uppercase tracking-wide mb-2">Sorun devam ederse</p>
            <p className="text-sm text-white/85 mb-4 leading-relaxed">
              Bizi arayın, telefonda kart bilgilerinizi paylaşmadan size ödeme alternatifleri sunalım: havale, EFT veya başka bir kart.
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
            <Link href="/odeme" className="flex-1">
              <button
                className="w-full h-12 bg-[#2D5A27] hover:bg-[#20401c] text-white font-semibold text-sm flex items-center justify-center gap-2 rounded-md transition-colors"
                data-testid="button-retry-payment"
              >
                <RefreshCw className="w-4 h-4" strokeWidth={2.5} />
                Tekrar Dene
              </button>
            </Link>
            <Link href="/sepet" className="flex-1">
              <button
                className="w-full h-12 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold text-sm flex items-center justify-center rounded-md transition-colors"
                data-testid="button-back-to-cart"
              >
                Sepete Dön
              </button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
