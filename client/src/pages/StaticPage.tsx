import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Link } from 'wouter';

interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  isPublished: boolean;
}

export default function StaticPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data: page, isLoading, isError } = useQuery<Page>({
    queryKey: ['/api/pages', slug],
    queryFn: async () => {
      const res = await fetch(`/api/pages/${slug}`);
      if (!res.ok) throw new Error('Sayfa bulunamadı');
      return res.json();
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 lg:px-8 py-12 lg:py-20">
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[#2D5A27]" />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <AlertCircle className="w-12 h-12 text-destructive/60" />
            <h1 className="text-2xl font-display">Sayfa Bulunamadı</h1>
            <p className="text-muted-foreground">Aradığınız sayfa mevcut değil.</p>
            <Link href="/" className="mt-4 inline-flex items-center gap-2 text-[#2D5A27] hover:underline font-medium">
              ← Ana sayfaya dön
            </Link>
          </div>
        )}

        {page && (
          <>
            <div className="mb-8 pb-6 border-b border-border">
              <p className="text-sm text-muted-foreground mb-2 uppercase tracking-widest font-mono">
                Sepetzen
              </p>
              <h1 className="text-3xl lg:text-4xl font-display text-foreground">
                {page.title}
              </h1>
            </div>

            <div
              className="prose prose-neutral max-w-none text-foreground/80 leading-relaxed
                [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3
                [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2
                [&_p]:mb-4 [&_p]:leading-[1.8]
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4
                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
                [&_li]:mb-1.5
                [&_strong]:font-semibold [&_strong]:text-foreground
                [&_a]:text-[#2D5A27] [&_a]:underline [&_a]:underline-offset-2
                [&_table]:w-full [&_table]:border-collapse [&_table]:mb-4
                [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm
                [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:bg-muted
              "
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
