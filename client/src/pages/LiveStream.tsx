import { Link } from 'wouter';
import { ExternalLink, Radio } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { ProductCard } from '@/components/ProductCard';
import { useLiveStream } from '@/hooks/useLiveStream';

export default function LiveStreamPage() {
  const { data, isLoading } = useLiveStream();
  const live = data?.isActive ? data : null;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <SEO title="Canlı Yayın" description="Canlı yayında tanıtılan ürünleri hemen inceleyin ve satın alın." url="/canli" />
      <Header />
      <div className="theme-light-zone">
        <main className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8 lg:py-12 min-h-[60vh]">
          {isLoading ? (
            <div className="h-40 animate-pulse bg-white/5 rounded-xl" />
          ) : !live ? (
            <div className="text-center py-24" data-testid="live-offline">
              <Radio className="w-10 h-10 mx-auto text-white/30 mb-4" />
              <h1 className="font-display text-3xl text-white mb-2">Şu anda canlı yayın yok</h1>
              <p className="text-white/55 text-sm mb-6">Yayın başladığında ürünler burada görünecek.</p>
              <Link href="/magaza" className="inline-flex h-11 items-center px-6 bg-white text-black font-bold tracking-wide rounded-lg">
                Mağazaya git
              </Link>
            </div>
          ) : (
            <>
              <section className="keep-dark rounded-2xl border border-red-500/30 bg-[#141414] p-5 lg:p-7 mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5" data-testid="live-hero">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-red-600 text-white text-[11px] font-bold uppercase tracking-[0.14em] px-3 py-1.5 mb-3">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                    </span>
                    Canlı yayında
                  </span>
                  <h1 className="font-display text-3xl lg:text-4xl text-white leading-tight" data-testid="text-live-title">{live.title}</h1>
                  {live.description && <p className="text-white/60 text-sm mt-2 max-w-2xl">{live.description}</p>}
                </div>
                {live.streamUrl && (
                  <a
                    href={live.streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-12 items-center justify-center gap-2 px-6 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold tracking-wide transition-colors shrink-0"
                    data-testid="link-watch-live"
                  >
                    Yayını izle <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </section>

              <div className="flex items-baseline gap-3 mb-5">
                <h2 className="text-[12px] tracking-[0.25em] uppercase text-white/60 font-semibold">Yayındaki ürünler</h2>
                <span className="text-[12px] text-white/40 font-mono tabular-nums">({live.products.length})</span>
              </div>

              {live.products.length === 0 ? (
                <p className="text-white/55 text-sm py-10">Yayındaki ürünler birazdan burada listelenecek.</p>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6" data-testid="live-products">
                  {live.products.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}
