import { useState, useEffect } from 'react';
import { Link, useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { AuthLayout, authInputCls, authLabelCls, authButtonCls } from '@/components/AuthLayout';

export default function ResetPassword() {
  const { toast } = useToast();
  const search = useSearch();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const token = new URLSearchParams(search).get('token');

  useEffect(() => {
    if (!token) {
      setValidating(false);
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch(`/api/auth/verify-reset-token/${token}`);
        const data = await res.json();

        if (res.ok && data.valid) {
          setTokenValid(true);
          setEmail(data.email || '');
        }
      } catch (err) {
        console.error('Token validation error:', err);
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: 'Hata', description: 'Şifre en az 6 karakter olmalıdır', variant: 'destructive' });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: 'Hata', description: 'Şifreler eşleşmiyor', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Şifre sıfırlama başarısız');
      }

      setSuccess(true);
    } catch (error: any) {
      toast({ title: 'Hata', description: error.message || 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <AuthLayout
        seoTitle="Şifre Sıfırla"
        seoDescription="Sepetzen hesap şifrenizi yenileyin."
        seoUrl="/sifre-sifirla"
        title="ŞİFRE SIFIRLA"
      >
        <div className="flex flex-col items-center py-6">
          <Loader2 className="w-8 h-8 animate-spin text-black mb-4" />
          <p className="text-black/50 text-[13px]">Bağlantı doğrulanıyor...</p>
        </div>
      </AuthLayout>
    );
  }

  if (!token || !tokenValid) {
    return (
      <AuthLayout
        seoTitle="Şifre Sıfırla"
        seoDescription="Sepetzen hesap şifrenizi yenileyin."
        seoUrl="/sifre-sifirla"
        title="GEÇERSİZ BAĞLANTI"
        subtitle="Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş. Lütfen yeni bir şifre sıfırlama talebi oluşturun."
        footerPrompt="Şifrenizi hatırladınız mı?"
        footerLinkHref="/giris"
        footerLinkLabel="Giriş Yap"
        footerLinkTestId="link-login"
      >
        <div className="flex justify-center mb-6" data-testid="text-invalid-token">
          <div className="w-14 h-14 rounded-full bg-[#F04444] flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-white" strokeWidth={1.75} />
          </div>
        </div>
        <Link href="/sifremi-unuttum">
          <Button className={authButtonCls} data-testid="button-new-request">Yeni Talep Oluştur</Button>
        </Link>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout
        seoTitle="Şifre Sıfırla"
        seoDescription="Sepetzen hesap şifrenizi yenileyin."
        seoUrl="/sifre-sifirla"
        title="ŞİFRENİZ DEĞİŞTİRİLDİ"
        subtitle="Şifreniz başarıyla değiştirildi. Artık yeni şifrenizle giriş yapabilirsiniz."
      >
        <div className="flex justify-center mb-6" data-testid="text-success">
          <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={1.75} />
          </div>
        </div>
        <Link href="/giris">
          <Button className={authButtonCls} data-testid="button-go-login">Giriş Yap</Button>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      seoTitle="Şifre Sıfırla"
      seoDescription="Sepetzen hesap şifrenizi yenileyin."
      seoUrl="/sifre-sifirla"
      title="YENİ ŞİFRE OLUŞTUR"
      subtitle={
        email ? (
          <>
            <strong className="text-black">{email}</strong> için yeni şifre belirleyin
          </>
        ) : undefined
      }
      footerPrompt="Şifrenizi hatırladınız mı?"
      footerLinkHref="/giris"
      footerLinkLabel="Giriş Yap"
      footerLinkTestId="link-login"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password" className={authLabelCls}>Yeni Şifre</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="En az 6 karakter"
              required
              data-testid="input-password"
              className={`${authInputCls} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/35 hover:text-black transition-colors"
              aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className={authLabelCls}>Şifre Tekrar</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Tekrar girin"
            required
            data-testid="input-confirm-password"
            className={authInputCls}
          />
        </div>

        <Button type="submit" disabled={loading} className={authButtonCls} data-testid="button-submit">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Şifre değiştiriliyor...
            </>
          ) : (
            'Şifremi Değiştir'
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
