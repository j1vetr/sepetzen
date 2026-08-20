import { useEffect } from 'react';
import { Link, useParams } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { ProductCard } from '@/components/ProductCard';
import { useBrand } from '@/hooks/useProducts';
import NotFound from './not-found';

function BrandLoading() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Header />
      <main className="py-10 lg:py-14 px-5 lg:px-8">
        <div className="max-w-[1400px] mx-auto grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-[3/4] bg-[#151515]" />
              <div className="mt-3 space-y-2">
                <div className="h-3.5 bg-white/10 w-4/5" />
                <div className="h-3.5 bg-white/10 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function BrandPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data, isLoading, error } = useBrand(slug);

  useEffect(() => {
    if (error && (error as Error & { status?: number }).status === 404) {
      document.title = 'Sayfa Bulunamadı | Sepetzen';
    }
  }, [error]);

  if (isLoading) return <BrandLoading />;

  if (error || !data?.brand || !data.brand.isActive) {
    return <NotFound />;
  }

  const { brand, products } = data;
  const title = `${brand.name} Ürünleri`;
  const description = `${brand.name} ürünlerini Sepetzen'de keşfedin. ${brand.name} markasının kamp, outdoor ve bıçak koleksiyonunu inceleyin.`;

  return (
    <div className="min-h-screen bg-[#0A0A0A] overflow-x-hidden">
      <SEO
        title={title}
        description={description}
        url={`/marka/${slug}`}
        image={brand.logoUrl || undefined}
        breadcrumbs={[
          { name: 'Ana Sayfa', url: '/' },
          { name: brand.name, url: `/marka/${slug}` },
        ]}
      />
      <Header />

      <section
        className="relative overflow-hidden bg-black"
        style={{ height: '18vh', minHeight: 140, maxHeight: 200 }}
      >
        {brand.logoUrl && (
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <img
              src={brand.logoUrl}
              alt=""
              aria-hidden="true"
              className="max-w-[min(55vw,420px)] max-h-[55%] object-contain grayscale"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="max-w-[1400px] mx-auto px-5 lg:px-8 pb-4 lg:pb-5 w-full">
            <motion.nav
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-2 text-[10px] text-white/45 tracking-wider uppercase mb-1.5"
              data-testid="breadcrumb"
            >
              <Link href="/">
                <span className="hover:text-white transition-colors">Ana Sayfa</span>
              </Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white/75">{brand.name}</span>
            </motion.nav>

            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-display text-2xl sm:text-3xl lg:text-4xl text-white tracking-wide leading-[1.1]"
                data-testid="text-brand-title"
              >
                {brand.name.toUpperCase()}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-white/45 text-[10px] tracking-[0.2em] uppercase"
              >
                {products.length} ürün
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      <main className="py-10 lg:py-14 px-5 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          {products.length === 0 ? (
            <div className="text-center py-24">
              <p className="font-display text-3xl text-white mb-2">Ürün Bulunamadı</p>
              <p className="text-sm text-white/50 mb-8">
                Bu markaya ait şu anda satışta ürün bulunmuyor.
              </p>
              <Link href="/magaza">
                <span className="text-[11px] tracking-[0.15em] uppercase border border-white/25 text-white px-6 py-3 hover:bg-white hover:text-black transition-colors">
                  Mağazaya Git
                </span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.45, delay: (index % 4) * 0.06 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}