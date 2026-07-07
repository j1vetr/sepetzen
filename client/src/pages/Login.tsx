import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { SEO } from '@/components/SEO';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowUpRight } from 'lucide-react';
import heroImg from '@assets/generated_images/polen-hero-dark-1.png';

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast({ title: 'Başarılı', description: 'Giriş yapıldı' });
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Hata',
        description: error.message || 'Giriş başarısız',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white">
      <SEO title="Giriş Yap" description="Sepetzen üyelik girişi." url="/giris" noIndex />
      <Header />

      <main className="pt-[60px] lg:pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:min-h-[calc(100vh-72px)]">
          {/* FORM COLUMN */}
          <section className="flex items-center justify-center px-5 sm:px-8 lg:px-12 py-10 lg:py-12 order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
              className="w-full max-w-[400px]"
            >
              <div className="flex items-center gap-3 mb-5">
                <span className="text-[10px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums">01 / Giriş</span>
                <span className="h-px flex-1 bg-black/12" />
              </div>

              <h1
                className="font-display text-3xl sm:text-[34px] tracking-[0.005em] text-black leading-[1.02] mb-2"
                data-testid="text-page-title"
              >
                Hoş geldiniz
              </h1>
              <p className="text-black/55 text-[13px] leading-relaxed mb-7">
                Sipariş geçmişiniz, favori taşlarınız ve adresleriniz tek noktada.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[10px] font-medium tracking-[0.22em] uppercase text-black/55">
                    E-posta
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" strokeWidth={1.75} />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ornek@email.com"
                      required
                      autoComplete="email"
                      data-testid="input-email"
                      className="h-11 pl-10 bg-stone-50 border-black/12 focus:border-polen-orange focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none text-black placeholder:text-black/25"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-[10px] font-medium tracking-[0.22em] uppercase text-black/55">
                      Şifre
                    </Label>
                    <Link
                      href="/sifremi-unuttum"
                      className="text-[11px] tracking-wide text-black/45 hover:text-polen-orange transition-colors"
                    >
                      Şifremi unuttum →
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" strokeWidth={1.75} />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      data-testid="input-password"
                      className="h-11 pl-10 pr-10 bg-stone-50 border-black/12 focus:border-polen-orange focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none text-black placeholder:text-black/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/30 hover:text-polen-orange transition-colors"
                      aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <motion.div whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.995 }} className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-11 bg-black text-white hover:bg-polen-orange font-semibold tracking-[0.18em] text-[11px] uppercase group rounded-none transition-colors duration-300 gap-3"
                    disabled={loading}
                    data-testid="button-login"
                  >
                    {loading ? (
                      'Giriş yapılıyor...'
                    ) : (
                      <>
                        <span>Giriş Yap</span>
                        <ArrowUpRight
                          className="w-4 h-4 transition-transform duration-300 group-hover:rotate-[-45deg]"
                          strokeWidth={1.75}
                        />
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>

              {/* Inline cross-link — daha kompakt, alt şerit yok */}
              <div className="mt-6 pt-5 border-t border-black/8 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className="block text-[9px] font-mono tracking-[0.28em] uppercase text-polen-orange tabular-nums">02 / Yeni Misiniz?</span>
                  <p className="font-display text-sm text-black/80 mt-0.5">Hesap oluşturun</p>
                </div>
                <Link
                  href="/kayit"
                  data-testid="link-register"
                  className="group inline-flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase font-medium text-black hover:text-polen-orange transition-colors"
                >
                  <span>Kayıt Ol</span>
                  <span className="inline-flex items-center justify-center w-8 h-8 border border-black/15 group-hover:border-polen-orange group-hover:bg-polen-orange transition-all">
                    <ArrowUpRight className="w-3.5 h-3.5 text-black group-hover:text-white transition-all duration-300 group-hover:rotate-[-45deg]" strokeWidth={2} />
                  </span>
                </Link>
              </div>
            </motion.div>
          </section>

          {/* IMAGE COLUMN — desktop only */}
          <aside className="relative hidden lg:block bg-polen-stone overflow-hidden order-1 lg:order-2">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${heroImg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/55 via-black/20 to-transparent" aria-hidden />

            <div className="relative z-10 h-full flex flex-col justify-between p-10 xl:p-12">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-mono tracking-[0.32em] uppercase text-white/85 tabular-nums">
                  Sepetzen - Outdoor & Bıçak
                </span>
                <span className="text-[10px] font-mono tracking-[0.28em] uppercase text-polen-orange tabular-nums">
                  EST. 2001
                </span>
              </div>

              <div className="max-w-md">
                <span className="block text-[10px] font-mono tracking-[0.32em] uppercase text-polen-orange mb-4">
                  - Üyelere Özel
                </span>
                <h2 className="font-display text-[40px] xl:text-5xl tracking-[0.005em] text-white leading-[1.02]">
                  Doğanın imzasını<br />
                  <span className="text-polen-orange">mekânlara taşıyın.</span>
                </h2>

                <div className="mt-7 grid grid-cols-3 gap-5 border-t border-white/15 pt-5">
                  <Stat n="120+" label="Mermer Türü" />
                  <Stat n="25" label="Yıl Tecrübe" />
                  <Stat n="∞" label="Olasılık" />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <p className="font-display text-2xl text-white tabular-nums leading-none">{n}</p>
      <p className="text-[9px] font-mono tracking-[0.22em] uppercase text-white/55 mt-1.5">{label}</p>
    </div>
  );
}
