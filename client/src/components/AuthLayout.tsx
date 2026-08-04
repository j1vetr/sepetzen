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
    <div className="min-h-screen bg-[#F5F5F5]">
      <SEO title={seoTitle} description={seoDescription} url={seoUrl} noIndex />
      <Header />

      <main className="flex items-start justify-center px-5 pb-12 pt-[104px] lg:pt-16" style={{ minHeight: 'calc(100svh - 60px)' }}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
          className={`w-full ${maxWidth}`}
        >
          <div className="bg-white border border-black/8 rounded-xl shadow-[0_2px_16px_-6px_rgba(0,0,0,0.08)] p-7 sm:p-9">
            <div className="text-center mb-7">
              <h1
                className="font-display text-[34px] leading-none tracking-[0.02em] text-black"
                data-testid="text-page-title"
              >
                {title}
              </h1>
              {subtitle && (
                <p className="text-black/60 text-[13px] leading-relaxed mt-2.5">{subtitle}</p>
              )}
            </div>

            {children}
          </div>

          {footerPrompt && footerLinkHref && (
            <p className="text-center text-[13px] text-black/60 mt-6">
              {footerPrompt}{' '}
              <Link
                href={footerLinkHref}
                data-testid={footerLinkTestId}
                className="font-semibold text-black underline underline-offset-4 decoration-black/25 hover:decoration-black transition-colors"
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
  'h-11 bg-white border-black/15 focus:border-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg text-black placeholder:text-black/25 text-[14px]';

export const authLabelCls = 'text-[12px] font-medium text-black/70';

export const authButtonCls =
  'w-full h-12 bg-[#0D0D0D] text-white hover:bg-black font-semibold tracking-[0.14em] text-[12px] uppercase rounded-lg transition-colors duration-300';
