import { Link, useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { sanitizeAdminHtml } from '@/lib/sanitizeHtml';
import { formatBlogDate } from './Blog';
import { ProductCard } from '@/components/ProductCard';

// Turkish stop words to exclude from keyword matching
const TR_STOP_WORDS = new Set([
  've', 'ile', 'bir', 'bu', 'da', 've', 'de', 'mi', 'mu', 'mı', 'mü',
  'ne', 'en', 'çok', 'için', 'gibi', 'ama', 'ya', 'ya da', 'hem', 'hiç',
  'her', 'bazı', 'nasıl', 'neden', 'hangi', 'kadar', 'daha', 'çok', 'az',
  'tam', 'sadece', 'bile', 'artık', 'zaten', 'hep', 'yani', 'şey', 'var',
  'yok', 'olan', 'ile', 'den', 'dan', 'ten', 'tan', 'nin', 'nın', 'nun',
  'nün', 'nde', 'nda', 'ın', 'in', 'un', 'ün', 'ı', 'i', 'u', 'ü',
]);

/** Extract meaningful keywords from a blog post title */
function extractKeywords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !TR_STOP_WORDS.has(w))
    .slice(0, 3);
}

interface BlogPostDetail {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  createdAt: string;
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: string;
  images: string[];
  isNew?: boolean;
  discountBadge?: string | null;
  variants?: { id: string; size?: string; color?: string; colorHex?: string; price: string; stock: number; isActive: boolean }[];
}

export default function BlogPost() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data: post, isLoading, isError } = useQuery<BlogPostDetail>({
    queryKey: ['/api/blog', slug],
    queryFn: async () => {
      const response = await fetch(`/api/blog/${slug}`);
      if (!response.ok) throw new Error('Yazı bulunamadı');
      return response.json();
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  // Extract keywords from the post title for product matching
  const keywords = post ? extractKeywords(post.title) : [];
  const searchTerm = keywords[0] ?? '';

  const { data: relatedProducts } = useQuery<RelatedProduct[]>({
    queryKey: ['/api/products', 'related-blog', searchTerm],
    queryFn: async () => {
      const res = await fetch(`/api/products?search=${encodeURIComponent(searchTerm)}&limit=8`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data.slice(0, 4) : [];
    },
    enabled: searchTerm.length >= 4,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A]">
      {post && (
        <SEO
          title={post.seoTitle || post.title}
          description={post.seoDescription || post.excerpt || `Sepetzen blog — ${post.title}`}
          url={`/blog/${post.slug}`}
          type="article"
          image={post.coverImage ?? undefined}
          breadcrumbs={[
            { name: 'Ana Sayfa', url: '/' },
            { name: 'Blog', url: '/blog' },
            { name: post.title, url: `/blog/${post.slug}` },
          ]}
        />
      )}
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 lg:px-8 py-12 lg:py-20">
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <AlertCircle className="w-12 h-12 text-destructive/60" />
            <h1 className="text-2xl font-display text-white">Yazı Bulunamadı</h1>
            <p className="text-white/55">Aradığınız yazı yayından kaldırılmış olabilir.</p>
            <Link href="/blog" className="mt-4 inline-flex items-center gap-2 text-white hover:underline font-medium">
              ← Blog'a dön
            </Link>
          </div>
        )}

        {post && (
          <article>
            <Link
              href="/blog"
              className="mb-8 inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
              data-testid="link-back-to-blog"
            >
              <ArrowLeft className="h-4 w-4" /> Tüm yazılar
            </Link>

            <div className="mb-8 pb-6 border-b border-border">
              <p className="text-sm text-white/50 mb-2 uppercase tracking-widest font-mono">
                {formatBlogDate(post.publishedAt ?? post.createdAt) || 'Sepetzen'}
              </p>
              <h1 className="text-3xl lg:text-4xl font-display text-white" data-testid="text-blog-post-title">
                {post.title}
              </h1>
              {post.excerpt && <p className="mt-4 text-white/60 leading-relaxed">{post.excerpt}</p>}
            </div>

            {post.coverImage && (
              <img
                src={post.coverImage}
                alt={post.title}
                className="mb-10 w-full rounded-xl border border-white/8 object-cover"
                data-testid="img-blog-post-cover"
              />
            )}

            <div
              className="prose prose-invert max-w-none text-white/70 leading-relaxed
                [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-8 [&_h2]:mb-3
                [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-6 [&_h3]:mb-2
                [&_p]:mb-4 [&_p]:leading-[1.8]
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4
                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
                [&_li]:mb-1.5
                [&_strong]:font-semibold [&_strong]:text-white
                [&_a]:text-white [&_a]:underline [&_a]:underline-offset-2
                [&_img]:rounded-lg [&_img]:my-6
                [&_blockquote]:border-l-2 [&_blockquote]:border-white/20 [&_blockquote]:pl-4 [&_blockquote]:italic
                [&_table]:w-full [&_table]:border-collapse [&_table]:mb-4
                [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm
                [&_th]:border [&_th]:border-white/8 [&_th]:px-3 [&_th]:py-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:bg-[#141414]
              "
              data-testid="content-blog-post"
              dangerouslySetInnerHTML={{ __html: sanitizeAdminHtml(post.content) }}
            />
          </article>
        )}

        {/* Related products section — only shown when there are keyword matches */}
        {relatedProducts && relatedProducts.length > 0 && (
          <section
            className="mt-16 pt-12 border-t border-white/10"
            data-testid="section-related-products"
          >
            <h2 className="text-xl font-display text-white mb-8 tracking-wide">
              İlgili Ürünler
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {relatedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
