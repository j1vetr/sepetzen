import { ReactNode } from 'react';
import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { SEO } from '@/components/SEO';
import { motion } from 'framer-motion';

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
