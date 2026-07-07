import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
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
    <div className="min-h-screen bg-[#faf7f1] flex flex-col overflow-x-hidden">
      <SEO title="Ödeme Başarısız" description="Ödeme tamamlanamadı." url="/odeme-basarisiz" noIndex />
      <Header />

      {/* Üst — uyarı banneri */}
      <section className="relative bg-white border-b border-black/[0.06]">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent"
        />
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
            className="font-display text-2xl sm:text-3xl tracking-[0.14em] uppercase text-black mb-3"
            data-testid="text-payment-failed"
          >
            Ödeme Tamamlanamadı
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="text-sm text-black/60 max-w-md mx-auto"
          >
            Endişelenmeyin - kartınızdan herhangi bir tutar çekilmedi. Bilgilerinizi kontrol edip tekrar deneyebilirsiniz.
          </motion.p>
        </div>
      </section>

      <main className="flex-1 px-4 sm:px-6 py-10">
        <div className="max-w-2xl mx-auto">
          {/* Banka mesajı */}
          {failureReason && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-amber-50 border border-amber-200 p-5 mb-5"
              data-testid="text-payment-failure-reason"
            >
              <p className="text-[10px] tracking-[0.2em] uppercase text-amber-700 font-semibold mb-1.5">
                Banka / iyzico mesajı
              </p>
              <p className="text-sm text-amber-900 leading-relaxed">{failureReason}</p>
            </motion.div>
          )}

          {merchantOid && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="bg-white border border-black/[0.08] px-5 py-4 mb-5 flex items-center justify-between"
            >
              <span className="text-[11px] tracking-[0.18em] uppercase text-black/50 font-medium">
                İşlem No
              </span>
              <span className="font-mono text-sm font-semibold text-black">{merchantOid}</span>
            </motion.div>
          )}

          {/* Olası nedenler — 2x2 kart grid */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
            className="mb-5"
          >
            <h3 className="text-[11px] tracking-[0.2em] uppercase text-black/55 font-semibold mb-3">
              Olası Nedenler
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reasons.map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="bg-white border border-black/[0.08] p-4 sm:p-5 flex items-start gap-3 hover:border-polen-orange/40 transition-colors"
                  data-testid={`card-reason-${text.slice(0, 20)}`}
                >
                  <span className="w-9 h-9 rounded-full bg-polen-orange/10 border border-polen-orange/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-polen-orange" strokeWidth={2} />
                  </span>
                  <span className="text-[13px] text-black/75 leading-snug pt-1">{text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Yardım kutusu */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#1a1612] text-white p-5 sm:p-6 mb-7"
          >
            <p className="text-[11px] tracking-[0.18em] uppercase text-white/50 font-medium mb-2">
              Sorun devam ederse
            </p>
            <p className="text-sm text-white/85 mb-4 leading-relaxed">
              Bizi arayın, telefonda kart bilgilerinizi paylaşmadan size ödeme alternatifleri sunalım: havale, EFT veya başka bir kart.
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

          {/* Ana CTA */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/odeme" className="flex-1">
              <Button
                className="w-full h-12 bg-polen-orange text-black hover:bg-[hsl(var(--polen-orange-deep))] hover:text-white font-semibold tracking-[0.1em] uppercase text-[12px] group rounded-none"
                data-testid="button-retry-payment"
              >
                <RefreshCw className="w-4 h-4 mr-2" strokeWidth={2.5} />
                Tekrar Dene
              </Button>
            </Link>
            <Link href="/sepet" className="flex-1">
              <Button
                variant="outline"
                className="w-full h-12 border-black/20 text-black hover:bg-black/[0.04] font-semibold tracking-[0.1em] uppercase text-[12px] rounded-none"
                data-testid="button-back-to-cart"
              >
                Sepete Dön
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
