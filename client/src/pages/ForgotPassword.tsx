import { useState } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { AuthCrossLinkCTA } from '@/components/AuthCrossLinkCTA';

export default function ForgotPassword() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({ 
        title: 'Hata', 
        description: 'Lütfen e-posta adresinizi girin',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'İşlem başarısız');
      }

      setSubmitted(true);
    } catch (error: any) {
      toast({ 
        title: 'Bilgi', 
        description: 'Eğer bu e-posta adresi sistemimizde kayıtlıysa, şifre sıfırlama bağlantısı gönderilecektir.'
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white">
        <SEO title="Şifremi Unuttum" description="Sepetzen şifre sıfırlama bağlantısı." url="/sifremi-unuttum" noIndex />
        <Header />
        
        <main className="pt-20 min-h-screen flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-md text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-polen-orange to-[hsl(var(--polen-orange-deep))] flex items-center justify-center"
              >
                <CheckCircle2 className="w-10 h-10 text-white" />
              </motion.div>
              
              <h1 className="font-display text-3xl tracking-wide mb-4 text-black" data-testid="text-email-sent">
                E-posta Gönderildi
              </h1>
              <p className="text-black/45 mb-8 leading-relaxed">
                Eğer <strong className="text-black">{email}</strong> adresi sistemimizde kayıtlıysa, 
                şifre sıfırlama bağlantısı içeren bir e-posta gönderdik.
              </p>
              
              <div className="bg-stone-50 border border-black/8 rounded-xl p-5 mb-8 text-left">
                <h3 className="font-medium text-black mb-3">Sonraki Adımlar:</h3>
                <ul className="space-y-2 text-sm text-black/45">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-polen-orange text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                    <span>E-posta kutunuzu kontrol edin</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-polen-orange text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                    <span>Spam/gereksiz klasörünü de kontrol etmeyi unutmayın</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-polen-orange text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                    <span>E-postadaki bağlantıya tıklayarak yeni şifrenizi oluşturun</span>
                  </li>
                </ul>
              </div>
              
              <button
                onClick={() => setSubmitted(false)}
                className="text-sm text-black/45 hover:text-polen-orange transition-colors"
              >
                Farklı bir e-posta adresi dene
              </button>
            </motion.div>
        </main>
        <AuthCrossLinkCTA
          href="/giris"
          index="01"
          eyebrow="Şifrenizi Hatırladınız mı?"
          headline="GİRİŞ SAYFASINA DÖN"
          ctaLabel="Giriş Yap"
          testId="link-login-bottom"
          containerClassName="px-6 lg:px-16 py-7 max-w-3xl mx-auto"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="pt-20 min-h-screen flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-stone-50 to-white border border-black/10 flex items-center justify-center">
                  <KeyRound className="w-7 h-7 text-polen-orange" />
                </div>
                <h1 className="font-display text-4xl tracking-wide mb-3 text-black" data-testid="text-page-title">
                  Şifremi Unuttum
                </h1>
                <p className="text-black/45">
                  E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
                </p>
              </motion.div>
            </div>
            
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onSubmit={handleSubmit} 
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">E-posta Adresi</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/45" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@email.com"
                    required
                    data-testid="input-email"
                    className="h-12 pl-11 bg-stone-50 border-black/12 focus:border-polen-orange rounded-lg"
                  />
                </div>
              </div>

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-12 bg-black text-white hover:bg-polen-orange font-bold tracking-[0.12em] text-xs uppercase rounded-none group"
                  data-testid="button-submit"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      Sıfırlama Bağlantısı Gönder
                      <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.form>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-10 p-4 bg-stone-50 border border-black/8 rounded-none"
            >
              <p className="text-xs text-black/45 text-center leading-relaxed">
                Güvenliğiniz için şifre sıfırlama bağlantısı yalnızca <strong>15 dakika</strong> geçerlidir. 
                Bağlantı süresi dolarsa tekrar talep edebilirsiniz.
              </p>
            </motion.div>
          </motion.div>
      </main>
      <AuthCrossLinkCTA
        href="/giris"
        index="01"
        eyebrow="Şifrenizi Hatırladınız mı?"
        headline="GİRİŞ SAYFASINA DÖN"
        ctaLabel="Giriş Yap"
        testId="link-login"
        containerClassName="px-6 lg:px-16 py-7 max-w-3xl mx-auto"
      />
    </div>
  );
}
