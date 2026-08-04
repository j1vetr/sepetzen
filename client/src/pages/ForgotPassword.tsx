import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { AuthLayout, authInputCls, authLabelCls, authButtonCls } from '@/components/AuthLayout';

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
        variant: 'destructive',
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
        description: 'Eğer bu e-posta adresi sistemimizde kayıtlıysa, şifre sıfırlama bağlantısı gönderilecektir.',
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthLayout
        seoTitle="Şifremi Unuttum"
        seoDescription="Sepetzen şifre sıfırlama bağlantısı."
        seoUrl="/sifremi-unuttum"
        title="E-POSTA GÖNDERİLDİ"
        subtitle={
          <>
            Eğer <strong className="text-white">{email}</strong> adresi sistemimizde kayıtlıysa, şifre sıfırlama
            bağlantısı içeren bir e-posta gönderdik.
          </>
        }
        footerPrompt="Şifrenizi hatırladınız mı?"
        footerLinkHref="/giris"
        footerLinkLabel="Giriş Yap"
        footerLinkTestId="link-login-bottom"
      >
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center" data-testid="text-email-sent">
            <CheckCircle2 className="w-7 h-7 text-black" strokeWidth={1.75} />
          </div>
        </div>

        <div className="bg-[#0F0F0F] border border-white/8 rounded-lg p-4 mb-5 text-left">
          <ul className="space-y-2 text-[13px] text-white/55">
            <li>1. E-posta kutunuzu kontrol edin</li>
            <li>2. Spam/gereksiz klasörünü de kontrol etmeyi unutmayın</li>
            <li>3. E-postadaki bağlantıya tıklayarak yeni şifrenizi oluşturun</li>
          </ul>
        </div>

        <button
          onClick={() => setSubmitted(false)}
          className="w-full text-center text-[13px] text-white/60 hover:text-white transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-white/60"
          data-testid="button-try-another-email"
        >
          Farklı bir e-posta adresi dene
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      seoTitle="Şifremi Unuttum"
      seoDescription="Sepetzen şifre sıfırlama bağlantısı."
      seoUrl="/sifremi-unuttum"
      title="ŞİFREMİ UNUTTUM"
      subtitle="E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim."
      footerPrompt="Şifrenizi hatırladınız mı?"
      footerLinkHref="/giris"
      footerLinkLabel="Giriş Yap"
      footerLinkTestId="link-login"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className={authLabelCls}>E-posta Adresi</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@email.com"
            required
            data-testid="input-email"
            className={authInputCls}
          />
        </div>

        <Button type="submit" disabled={loading} className={authButtonCls} data-testid="button-submit">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gönderiliyor...
            </>
          ) : (
            'Sıfırlama Bağlantısı Gönder'
          )}
        </Button>

        <p className="text-[11px] text-white/55 text-center leading-relaxed pt-1">
          Güvenliğiniz için şifre sıfırlama bağlantısı yalnızca <strong>15 dakika</strong> geçerlidir. Bağlantı süresi
          dolarsa tekrar talep edebilirsiniz.
        </p>
      </form>
    </AuthLayout>
  );
}
