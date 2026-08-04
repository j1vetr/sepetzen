import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import { AuthLayout, authInputCls, authLabelCls, authButtonCls } from '@/components/AuthLayout';

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
    <AuthLayout
      seoTitle="Giriş Yap"
      seoDescription="Sepetzen üyelik girişi."
      seoUrl="/giris"
      title="GİRİŞ YAP"
      subtitle="Hesabınıza giriş yaparak siparişlerinizi yönetin."
      footerPrompt="Hesabınız yok mu?"
      footerLinkHref="/kayit"
      footerLinkLabel="Kayıt Ol"
      footerLinkTestId="link-register"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className={authLabelCls}>
            E-posta
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@email.com"
            required
            autoComplete="email"
            data-testid="input-email"
            className={authInputCls}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className={authLabelCls}>
            Şifre
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              data-testid="input-password"
              className={`${authInputCls} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
               className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white transition-colors"
              aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-right">
            <Link
              href="/sifremi-unuttum"
               className="text-[12px] text-white/60 hover:text-white transition-colors underline underline-offset-4 decoration-white/15 hover:decoration-white/60"
              data-testid="link-forgot-password"
            >
              Şifremi Unuttum
            </Link>
          </div>
        </div>

        <Button type="submit" className={authButtonCls} disabled={loading} data-testid="button-login">
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </Button>
      </form>
    </AuthLayout>
  );
}
