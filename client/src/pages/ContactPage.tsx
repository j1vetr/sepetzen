import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { Link } from 'wouter';
import { ChevronRight, Phone, Mail, MapPin, MessageCircle, Send, CheckCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface SiteSettings {
  contact_email?: string;
  contact_phone?: string;
  whatsapp_number?: string;
  site_address?: string;
}

const SUBJECTS = [
  'Sipariş Hakkında',
  'Ürün Bilgisi',
  'İade & Değişim',
  'Kargo Takibi',
  'Bayi & Toptan',
  'Şikayet & Öneri',
  'Diğer',
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: SUBJECTS[0], message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ['/api/site-settings-public'],
    queryFn: async () => {
      const res = await fetch('/api/site-identity');
      if (!res.ok) return {};
      const data = await res.json();
      return data.settings ?? {};
    },
    staleTime: 10 * 60 * 1000,
  });

  const phone = settings?.contact_phone ?? '0536 630 11 38';
  const email = settings?.contact_email ?? 'sepetzen@gmail.com';
  const whatsapp = settings?.whatsapp_number ?? '905366301138';
  const address = settings?.site_address ?? 'Karaçalı Mah. Nergiz Sk. No.8/A, Dalaman / Muğla';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gönderim başarısız');
      setStatus('success');
      setForm({ name: '', email: '', subject: SUBJECTS[0], message: '' });
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Bir hata oluştu');
    }
  };

  const inputCls = `w-full bg-white/[0.04] border border-white/12 text-white placeholder:text-white/30
    text-[13px] px-4 py-3 rounded-sm focus:outline-none focus:border-white/35 focus:bg-white/[0.06]
    transition-colors`;

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A]">
      <SEO
        title="İletişim"
        description="Sepetzen iletişim — bize yazın, telefon edin ya da WhatsApp'tan ulaşın. 0536 630 11 38 · sepetzen@gmail.com · Dalaman / Muğla."
        url="/sayfa/iletisim"
        breadcrumbs={[
          { name: 'Ana Sayfa', url: '/' },
          { name: 'İletişim', url: '/sayfa/iletisim' },
        ]}
      />
      <Header />

      {/* Breadcrumb + page title */}
      <div className="bg-[#0F0F0F] border-b border-white/8 pt-4 pb-5 px-6">
        <div className="max-w-[1100px] mx-auto">
          <nav className="flex items-center gap-1.5 text-[11px] tracking-wide text-white/40 mb-2">
            <Link href="/"><span className="hover:text-white/70 transition-colors cursor-pointer">Ana Sayfa</span></Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/70">İletişim</span>
          </nav>
          <h1 className="text-[26px] lg:text-[32px] font-bold text-white tracking-tight leading-none">
            İletişim
          </h1>
          <p className="text-[13px] text-white/45 mt-2">
            Sorularınız için bize yazın — en kısa sürede dönüş yaparız.
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-[1100px] mx-auto w-full px-4 lg:px-6 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">

          {/* ── Left: Contact info ── */}
          <div className="lg:col-span-2 space-y-3">

            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              className="group flex items-start gap-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/8 hover:border-white/16 rounded-sm p-5 transition-colors"
            >
              <span className="w-10 h-10 rounded-sm bg-white/[0.06] flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                <Phone className="w-4 h-4 text-white/60" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-[10px] tracking-[0.14em] uppercase text-white/35 mb-1">Telefon</p>
                <p className="text-[15px] font-semibold text-white tracking-wide">{phone}</p>
                <p className="text-[11px] text-white/35 mt-0.5">Hf. 09:00 – 18:00</p>
              </div>
            </a>

            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/8 hover:border-white/16 rounded-sm p-5 transition-colors"
            >
              <span className="w-10 h-10 rounded-sm bg-white/[0.06] flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                <MessageCircle className="w-4 h-4 text-white/60" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-[10px] tracking-[0.14em] uppercase text-white/35 mb-1">WhatsApp</p>
                <p className="text-[15px] font-semibold text-white tracking-wide">{phone}</p>
                <p className="text-[11px] text-white/35 mt-0.5">Mesaj gönderin, hızlı dönelim</p>
              </div>
            </a>

            <a
              href={`mailto:${email}`}
              className="group flex items-start gap-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/8 hover:border-white/16 rounded-sm p-5 transition-colors"
            >
              <span className="w-10 h-10 rounded-sm bg-white/[0.06] flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                <Mail className="w-4 h-4 text-white/60" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-[10px] tracking-[0.14em] uppercase text-white/35 mb-1">E-posta</p>
                <p className="text-[14px] font-semibold text-white break-all">{email}</p>
              </div>
            </a>

            <div className="flex items-start gap-4 bg-white/[0.03] border border-white/8 rounded-sm p-5">
              <span className="w-10 h-10 rounded-sm bg-white/[0.06] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-white/60" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-[10px] tracking-[0.14em] uppercase text-white/35 mb-1">Adres</p>
                <p className="text-[13px] text-white/75 leading-relaxed">{address}</p>
              </div>
            </div>

            {/* Quick links */}
            <div className="pt-2">
              <p className="text-[10px] tracking-[0.14em] uppercase text-white/25 mb-3">Sık sorulanlar</p>
              <div className="space-y-1">
                {[
                  { label: 'Kargo ve Teslimat', href: '/sayfa/kargo-sureci' },
                  { label: 'İade ve Değişim', href: '/sayfa/iptal-ve-iade-sartlari' },
                  { label: 'Sipariş Takibi', href: '/siparis-takip' },
                ].map(l => (
                  <Link key={l.href} href={l.href}>
                    <span className="flex items-center gap-2 text-[12px] text-white/45 hover:text-white transition-colors cursor-pointer py-1.5">
                      <ChevronRight className="w-3 h-3" />
                      {l.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Form ── */}
          <div className="lg:col-span-3">
            <div className="bg-white/[0.03] border border-white/8 rounded-sm p-6 lg:p-8">
              <h2 className="text-[13px] font-bold tracking-[0.16em] uppercase text-white/60 mb-6">
                Mesaj Gönderin
              </h2>

              {status === 'success' ? (
                <div className="flex flex-col items-center justify-center py-14 text-center gap-4">
                  <CheckCircle className="w-12 h-12 text-emerald-400" strokeWidth={1.5} />
                  <div>
                    <p className="text-[16px] font-semibold text-white mb-1">Mesajınız iletildi!</p>
                    <p className="text-[13px] text-white/50">En kısa sürede size dönüş yapacağız.</p>
                  </div>
                  <button
                    onClick={() => setStatus('idle')}
                    className="mt-2 text-[11px] tracking-[0.14em] uppercase text-white/40 hover:text-white transition-colors border border-white/12 hover:border-white/30 px-4 py-2 rounded-sm"
                  >
                    Yeni mesaj gönder
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] tracking-[0.14em] uppercase text-white/40 mb-1.5">
                        Ad Soyad <span className="text-red-400">*</span>
                      </label>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Adınız ve soyadınız"
                        required
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.14em] uppercase text-white/40 mb-1.5">
                        E-posta <span className="text-red-400">*</span>
                      </label>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="ornek@gmail.com"
                        required
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] tracking-[0.14em] uppercase text-white/40 mb-1.5">
                      Konu
                    </label>
                    <select
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      className={inputCls + ' cursor-pointer'}
                    >
                      {SUBJECTS.map(s => (
                        <option key={s} value={s} className="bg-[#1a1a1a] text-white">{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] tracking-[0.14em] uppercase text-white/40 mb-1.5">
                      Mesajınız <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Mesajınızı buraya yazın..."
                      required
                      rows={6}
                      className={inputCls + ' resize-none'}
                    />
                  </div>

                  {status === 'error' && (
                    <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-sm">
                      {errorMsg || 'Bir hata oluştu. Lütfen tekrar deneyin.'}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="w-full h-12 bg-white text-black text-[11px] font-bold tracking-[0.18em] uppercase
                      hover:bg-white/90 disabled:bg-white/30 disabled:cursor-not-allowed transition-colors
                      flex items-center justify-center gap-2 rounded-sm"
                  >
                    {status === 'sending' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Gönder
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-white/25 text-center">
                    Yanıt genellikle 1 iş günü içinde gelir.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
