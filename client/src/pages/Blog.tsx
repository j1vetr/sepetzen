import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
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

export function formatBlogDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Blog() {
  const { data: posts = [], isLoading, isError } = useQuery<BlogPostSummary[]>({
    queryKey: ['/api/blog'],
    queryFn: async () => {
      const response = await fetch('/api/blog');
      if (!response.ok) throw new Error('Blog yazıları yüklenemedi');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A]">
      <SEO
        title="Blog"
        description="Sepetzen blog — kamp, outdoor, bıçak bakımı ve bağ & bahçe üzerine rehberler, ipuçları ve ürün önerileri."
        url="/blog"
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

        {!isLoading && !isError && posts.length === 0 && (
          <div className="py-24 text-center" data-testid="text-blog-empty">
            <h2 className="text-2xl font-display text-white mb-2">Henüz yazı yok</h2>
            <p className="text-white/55">Yeni içerikler için kısa süre içinde tekrar uğrayın.</p>
          </div>
        )}

        {posts.length > 0 && (
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
        )}
      </main>

      <Footer />
    </div>
  );
}
