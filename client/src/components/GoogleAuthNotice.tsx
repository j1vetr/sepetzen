import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Google girişi iptal edildi. Tekrar denemek için Google ile giriş butonunu kullanabilirsiniz.',
  state_mismatch: 'Güvenlik doğrulaması eşleşmedi. Lütfen sayfayı yenileyip tekrar deneyin.',
  not_configured: 'Google ile giriş şu anda yapılandırılmamış. Lütfen e-posta ve şifre ile giriş yapın.',
  token_failed: 'Google ile bağlantı doğrulanamadı. Lütfen tekrar deneyin, sorun sürerse e-posta ile giriş yapın.',
  userinfo_failed: 'Google hesap bilgileriniz alınamadı. Lütfen tekrar deneyin.',
  server_error: 'Giriş sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin, sorun sürerse bize ulaşın.',
};

// Google OAuth dönüşünde ?google_login=success veya ?google_error=... parametrelerini
// yakalayıp kullanıcıya net bir bildirim gösterir, ardından URL'i temizler.
export function GoogleAuthNotice() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('google_login');
    const error = params.get('google_error');
    if (!success && !error) return;

    // Toast sistemi ilk render sırasında henüz dinlemeye başlamamış olabilir,
    // bu yüzden bildirimi bir sonraki döngüye erteliyoruz.
    setTimeout(() => {
      if (success === 'success') {
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
        toast({
          title: 'Giriş başarılı',
          description: 'Google hesabınızla giriş yaptınız. Hoş geldiniz!',
        });
      } else if (error) {
        toast({
          title: 'Google ile giriş yapılamadı',
          description: ERROR_MESSAGES[error] || ERROR_MESSAGES.server_error,
          variant: 'destructive',
        });
      }
    }, 100);

    params.delete('google_login');
    params.delete('google_error');
    const rest = params.toString();
    const cleanUrl = window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash;
    window.history.replaceState({}, '', cleanUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
