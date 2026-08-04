import { ReactNode } from 'react';
import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { SEO } from '@/components/SEO';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface AuthLayoutProps {
  seoTitle: string;
  seoDescription: string;
  seoUrl: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Alt geçiş satırı: "Hesabınız yok mu?" + link */
  footerPrompt?: string;
  footerLinkHref?: string;
  footerLinkLabel?: string;
  footerLinkTestId?: string;
  maxWidth?: string;
}

/** Resmi renkli Google "G" ikonu */
function GoogleIcon({ className = 'w-[18px] h-[18px]' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** "Google ile devam et" butonu + "veya" ayracı. Form üstünde kullanılır. */
export function GoogleAuthButton({ label, testId }: { label: string; testId: string }) {
  const { toast } = useToast();
  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => {
          toast({
            title: 'Çok yakında',
            description: 'Google ile giriş şu anda hazırlanıyor. Şimdilik e-posta ile devam edebilirsiniz.',
          });
        }}
        data-testid={testId}
        className="w-full h-11 flex items-center justify-center gap-3 rounded-lg bg-white text-[#1F1F1F] text-sm font-semibold hover:bg-white/90 active:bg-white/85 transition-colors"
      >
        <GoogleIcon />
        {label}
      </button>
      <div className="flex items-center gap-4 mt-6">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/35">veya</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
    </div>
  );
}

export function AuthLayout({
  seoTitle,
  seoDescription,
  seoUrl,
  title,
  subtitle,
  children,
  footerPrompt,
  footerLinkHref,
  footerLinkLabel,
  footerLinkTestId,
  maxWidth = 'max-w-[400px]',
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <SEO title={seoTitle} description={seoDescription} url={seoUrl} noIndex />
      <Header />

      <main className="flex items-start justify-center px-5 pb-12 pt-10 lg:pt-16" style={{ minHeight: 'calc(100svh - 100px)' }}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
          className={`w-full ${maxWidth}`}
        >
          <div className="bg-[#141414] border border-white/8 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.4)] p-7 sm:p-9">
            <div className="text-center mb-7">
              <h1
                className="font-display text-[34px] leading-none tracking-[0.02em] text-white"
                data-testid="text-page-title"
              >
                {title}
              </h1>
              {subtitle && (
                <p className="text-white/60 text-[13px] leading-relaxed mt-2.5">{subtitle}</p>
              )}
            </div>

            {children}
          </div>

          {footerPrompt && footerLinkHref && (
            <p className="text-center text-[13px] text-white/60 mt-6">
              {footerPrompt}{' '}
              <Link
                href={footerLinkHref}
                data-testid={footerLinkTestId}
                className="font-semibold text-white underline underline-offset-4 decoration-white/25 hover:decoration-white transition-colors"
              >
                {footerLinkLabel}
              </Link>
            </p>
          )}
        </motion.div>
      </main>
    </div>
  );
}

export const authInputCls =
  'h-11 bg-white/5 border border-white/12 focus:border-white/35 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg text-white placeholder:text-white/30 text-[14px]';

export const authLabelCls = 'text-[12px] font-medium text-white/70';

export const authButtonCls =
  'w-full h-12 bg-white text-black hover:bg-white/90 font-semibold tracking-[0.14em] text-[12px] uppercase rounded-lg transition-colors duration-300';
