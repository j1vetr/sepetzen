import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Check } from 'lucide-react';
import { COUNTRIES } from '@/lib/countries';
import { AuthLayout, authInputCls, authLabelCls, authButtonCls } from '@/components/AuthLayout';

export default function Register() {
  const [, navigate] = useLocation();
  const { register } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    district: '',
    country: 'Türkiye',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({ title: 'Hata', description: 'Şifreler eşleşmiyor', variant: 'destructive' });
      return;
    }
    if (formData.password.length < 6) {
      toast({ title: 'Hata', description: 'Şifre en az 6 karakter olmalıdır', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        district: formData.district || undefined,
        country: formData.country || 'Türkiye',
      });
      toast({ title: 'Başarılı', description: 'Kayıt tamamlandı' });
      navigate('/');
    } catch (error: any) {
      toast({ title: 'Hata', description: error.message || 'Kayıt başarısız', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength =
    formData.password.length === 0 ? 0 : formData.password.length < 6 ? 1 : formData.password.length < 8 ? 2 : 3;
  const strengthColors = ['', 'bg-[#F04444]', 'bg-white/40', 'bg-white'];
  const strengthTexts = ['', 'Zayıf', 'Orta', 'Güçlü'];

  const sectionCls = 'text-[10px] font-semibold tracking-[0.2em] uppercase text-white/55 pt-2';

  return (
    <AuthLayout
      seoTitle="Üye Ol"
      seoDescription="Sepetzen üyelik kaydı."
      seoUrl="/kayit"
      title="HESAP OLUŞTUR"
      subtitle="Bilgilerinizi bir kez girin; sonraki siparişlerde otomatik dolu gelsin."
      footerPrompt="Zaten üye misiniz?"
      footerLinkHref="/giris"
      footerLinkLabel="Giriş Yap"
      footerLinkTestId="link-login"
      maxWidth="max-w-[460px]"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <p className={sectionCls}>Kişisel Bilgiler</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className={authLabelCls}>Ad</Label>
            <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Adınız" data-testid="input-firstName" className={authInputCls} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName" className={authLabelCls}>Soyad</Label>
            <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Soyadınız" data-testid="input-lastName" className={authInputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="email" className={authLabelCls}>E-posta *</Label>
            <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="ornek@email.com" required autoComplete="email" data-testid="input-email" className={authInputCls} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className={authLabelCls}>Telefon *</Label>
            <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="05XX XXX XX XX" required autoComplete="tel" data-testid="input-phone" className={authInputCls} />
          </div>
        </div>

        <p className={sectionCls}>Adres Bilgileri</p>
        <div className="space-y-1.5">
          <Label htmlFor="address" className={authLabelCls}>Adres</Label>
          <Input id="address" name="address" value={formData.address} onChange={handleChange} placeholder="Sokak, Mahalle, Bina No, Daire No" data-testid="input-address" className={authInputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="city" className={authLabelCls}>İl</Label>
            <Input id="city" name="city" value={formData.city} onChange={handleChange} placeholder="İstanbul" data-testid="input-city" className={authInputCls} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="district" className={authLabelCls}>İlçe</Label>
            <Input id="district" name="district" value={formData.district} onChange={handleChange} placeholder="Kadıköy" data-testid="input-district" className={authInputCls} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="country" className={authLabelCls}>Ülke</Label>
          <select
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            data-testid="select-country"
             className="w-full h-11 bg-white/5 border border-white/12 focus:border-white/35 focus:outline-none rounded-lg px-4 text-white text-sm"
          >
            {COUNTRIES.map((country) => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>

        <p className={sectionCls}>Şifre</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="password" className={authLabelCls}>Şifre *</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="En az 6 karakter"
                required
                autoComplete="new-password"
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
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className={authLabelCls}>Şifre Tekrar *</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Tekrar girin"
                required
                autoComplete="new-password"
                data-testid="input-confirmPassword"
                className={`${authInputCls} pr-11`}
              />
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                 <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white" strokeWidth={2.25} />
              )}
            </div>
          </div>
        </div>

        {formData.password.length > 0 && (
          <div className="flex items-center gap-3 -mt-1">
            <div className="flex-1 flex gap-1">
              {[1, 2, 3].map((level) => (
                <div
                  key={level}
                  className={`h-0.5 flex-1 rounded-full transition-colors ${
                     passwordStrength >= level ? strengthColors[passwordStrength] : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            <span
              className={`text-[10px] font-mono tracking-wider uppercase ${
                passwordStrength === 1 ? 'text-[#F04444]'
                   : passwordStrength === 2 ? 'text-white/50'
                   : passwordStrength === 3 ? 'text-white'
                  : ''
              }`}
            >
              {strengthTexts[passwordStrength]}
            </span>
          </div>
        )}

        <div className="pt-2">
          <Button type="submit" className={authButtonCls} disabled={loading} data-testid="button-register">
            {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
          </Button>
        </div>

         <p className="text-[11px] text-white/55 text-center pt-1 leading-relaxed">
          Kayıt olarak{' '}
           <span className="underline underline-offset-2 hover:text-white transition-colors cursor-pointer">Kullanım Koşulları</span>
          {' '}ve{' '}
           <span className="underline underline-offset-2 hover:text-white transition-colors cursor-pointer">Gizlilik Politikası</span>
          'nı kabul etmiş olursunuz.
        </p>
      </form>
    </AuthLayout>
  );
}
