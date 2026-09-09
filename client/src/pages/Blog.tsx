import { Link, useSearch, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';

export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  publishedAt: string | null;
  createdAt: string;
}

interface BlogPage {
  posts: BlogPostSummary[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
}

export function formatBlogDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Hangi sayfa numaralarını gösterelim: en fazla 7 düğme
  const getPages = (): (number | '…')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '…')[] = [];
    pages.push(1);
    if (page > 3) pages.push('…');
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) {
      pages.push(p);
    }
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  };

  return (
    <nav
      className="flex items-center justify-center gap-1 mt-12"
      aria-label="Blog sayfaları"
    >
      {/* Geri */}
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all"
        aria-label="Önceki sayfa"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Numara düğmeleri */}
      {getPages().map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-white/30 text-sm select-none">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`w-9 h-9 rounded-lg border text-sm font-medium transition-all ${
              p === page
                ? 'border-white/70 bg-white/15 text-white ring-1 ring-inset ring-white/20'
                : 'border-white/10 bg-white/5 text-white/55 hover:border-white/25 hover:bg-white/10 hover:text-white'
            }`}
          >
            {p}
          </button>
        )
      )}

      {/* İleri */}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all"
        aria-label="Sonraki sayfa"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}

export default function Blog() {
  const search = useSearch();
  const [, setLocation] = useLocation();

  const currentPage = Math.max(1, parseInt(new URLSearchParams(search).get('sayfa') || '1', 10) || 1);

  const { data, isLoading, isError } = useQuery<BlogPage>({
    queryKey: ['/api/blog', currentPage],
    queryFn: async () => {
      const response = await fetch(`/api/blog?sayfa=${currentPage}`);
      if (!response.ok) throw new Error('Blog yazıları yüklenemedi');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const posts = data?.posts ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const goToPage = (p: number) => {
    const safe = Math.max(1, Math.min(p, totalPages));
    setLocation(safe === 1 ? '/blog' : `/blog?sayfa=${safe}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A]">
      <SEO
        title={currentPage > 1 ? `Blog — Sayfa ${currentPage}` : 'Blog'}
        description="Sepetzen blog — kamp, outdoor, bıçak bakımı ve bağ & bahçe üzerine rehberler, ipuçları ve ürün önerileri."
        url={currentPage > 1 ? `/blog?sayfa=${currentPage}` : '/blog'}
        breadcrumbs={[
          { name: 'Ana Sayfa', url: '/' },
          { name: 'Blog', url: '/blog' },
        ]}
      />
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 lg:px-8 py-12 lg:py-20">
        <div className="mb-10 pb-6 border-b border-border">
          <p className="text-sm text-white/50 mb-2 uppercase tracking-widest font-mono">Sepetzen</p>
          <h1 className="text-3xl lg:text-4xl font-display text-white">Blog</h1>
          <p className="mt-3 text-white/55 max-w-2xl leading-relaxed">
            Kamp, outdoor, bıçak bakımı ve bağ & bahçe üzerine yazdıklarımız.
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <AlertCircle className="w-12 h-12 text-destructive/60" />
            <h2 className="text-2xl font-display text-white">Yazılar yüklenemedi</h2>
            <p className="text-white/55">Lütfen sayfayı yenileyip tekrar deneyin.</p>
          </div>
        )}

        {!isLoading && !isError && total === 0 && (
          <div className="py-24 text-center" data-testid="text-blog-empty">
            <h2 className="text-2xl font-display text-white mb-2">Henüz yazı yok</h2>
            <p className="text-white/55">Yeni içerikler için kısa süre içinde tekrar uğrayın.</p>
          </div>
        )}

        {posts.length > 0 && (
          <>
            {/* Yazı sayısı bilgisi */}
            {total > 0 && (
              <p className="text-xs text-white/35 font-mono mb-6">
                {total} yazı
                {totalPages > 1 && ` · sayfa ${currentPage}/${totalPages}`}
              </p>
            )}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="list-blog-posts">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-white/8 bg-[#141414] transition-colors hover:border-white/25"
                  data-testid={`link-blog-post-${post.slug}`}
                >
                  <div className="aspect-[16/10] w-full overflow-hidden bg-[#0F0F0F]">
                    {post.coverImage ? (
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-white/25 font-mono">
                        Sepetzen
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <span className="mb-2 text-xs text-white/40 font-mono">
                      {formatBlogDate(post.publishedAt ?? post.createdAt)}
                    </span>
                    <h2 className="text-lg font-semibold text-white leading-snug">{post.title}</h2>
                    {post.excerpt && (
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/55">{post.excerpt}</p>
                    )}
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white">
                      Yazıyı oku
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
            />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
