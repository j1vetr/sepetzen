import { useState, useEffect } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { SEO } from '@/components/SEO';
import { Lock, ArrowRight, CheckCircle2, KeyRound, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
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
      toast({ 
        title: 'Hata', 
        description: 'Şifre en az 6 karakter olmalıdır',
        variant: 'destructive'
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({ 
        title: 'Hata', 
        description: 'Şifreler eşleşmiyor',
        variant: 'destructive'
      });
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
      toast({ 
        title: 'Hata', 
        description: error.message || 'Bir hata oluştu',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Şifre Sıfırla" description="Sepetzen hesap şifrenizi yenileyin." url="/sifre-sifirla" noIndex />
        <Header />
        <main className="pt-20 min-h-screen flex items-center justify-center p-6">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-white mx-auto mb-4" />
            <p className="text-muted-foreground">Bağlantı doğrulanıyor...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!token || !tokenValid) {
    return (
      <div className="min-h-screen bg-background">
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
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center"
            >
              <AlertCircle className="w-10 h-10 text-white" />
            </motion.div>
            
            <h1 className="font-display text-3xl tracking-wide mb-4" data-testid="text-invalid-token">
              GEÇERSİZ BAĞLANTI
            </h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş. 
              Lütfen yeni bir şifre sıfırlama talebi oluşturun.
            </p>
            
            <div className="space-y-3">
              <Link href="/sifremi-unuttum">
                <Button className="w-full h-12 bg-white text-black hover:bg-white/90 font-bold tracking-wide">
                  YENİ TALEP OLUŞTUR
                </Button>
              </Link>
              <Link href="/giris">
                <Button variant="ghost" className="w-full h-12 text-muted-foreground hover:text-white">
                  Giriş Sayfasına Dön
                </Button>
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background">
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
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center"
            >
              <CheckCircle2 className="w-10 h-10 text-white" />
            </motion.div>
            
            <h1 className="font-display text-3xl tracking-wide mb-4" data-testid="text-success">
              ŞİFRENİZ DEĞİŞTİRİLDİ
            </h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Şifreniz başarıyla değiştirildi. Artık yeni şifrenizle giriş yapabilirsiniz.
            </p>
            
            <Link href="/giris">
              <Button className="w-full h-12 bg-white text-black hover:bg-white/90 font-bold tracking-wide group">
                GİRİŞ YAP
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                <KeyRound className="w-7 h-7 text-white" />
              </div>
              <h1 className="font-display text-4xl tracking-wide mb-3" data-testid="text-page-title">
                YENİ ŞİFRE OLUŞTUR
              </h1>
              {email && (
                <p className="text-muted-foreground">
                  <strong className="text-white">{email}</strong> için yeni şifre belirleyin
                </p>
              )}
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
              <Label htmlFor="password" className="text-sm font-medium">Yeni Şifre</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  data-testid="input-password"
                  className="h-12 pl-11 pr-11 bg-zinc-900/50 border-white/10 focus:border-white/30 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">En az 6 karakter</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Şifre Tekrar</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  data-testid="input-confirm-password"
                  className="h-12 pl-11 bg-zinc-900/50 border-white/10 focus:border-white/30 rounded-lg"
                />
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 bg-white text-black hover:bg-white/90 font-bold tracking-wide group"
                data-testid="button-submit"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ŞİFRE DEĞİŞTİRİLİYOR...
                  </>
                ) : (
                  <>
                    ŞİFREMİ DEĞİŞTİR
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </motion.div>
          </motion.form>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-muted-foreground">
              Şifrenizi hatırladınız mı?{' '}
              <Link href="/giris" className="text-white font-medium hover:underline" data-testid="link-login">
                Giriş Yap
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
