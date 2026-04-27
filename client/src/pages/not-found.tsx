import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { Home, ArrowLeft, Search, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative mb-8">
              <h1 className="text-[150px] sm:text-[200px] lg:text-[280px] font-bold text-white/5 leading-none select-none">
                404
              </h1>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center"
                  >
                    <Search className="w-8 h-8 text-white/50" />
                  </motion.div>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
                    Sayfa Bulunamadı
                  </h2>
                  <p className="text-zinc-400 text-sm sm:text-base max-w-md mx-auto">
                    Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir.
                  </p>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12"
            >
              <Link href="/">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-8 py-4 bg-white text-black rounded-xl font-semibold text-sm uppercase tracking-wider hover:bg-zinc-200 transition-colors"
                  data-testid="button-go-home"
                >
                  <Home className="w-4 h-4" />
                  Ana Sayfaya Dön
                </motion.button>
              </Link>
              
              <Link href="/magaza">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-8 py-4 bg-zinc-800 text-white rounded-xl font-semibold text-sm uppercase tracking-wider hover:bg-zinc-700 transition-colors border border-zinc-700"
                  data-testid="button-go-store"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Mağazaya Git
                </motion.button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-16 pt-8 border-t border-zinc-800 px-4"
            >
              <p className="text-zinc-500 text-sm mb-4">Popüler Sayfalar</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 max-w-2xl mx-auto">
                {[
                  { href: '/kategori/mermer', label: 'Mermer' },
                  { href: '/kategori/granit', label: 'Granit' },
                  { href: '/kategori/traverten', label: 'Traverten' },
                  { href: '/hakkimizda', label: 'Hakkımızda' },
                  { href: '/siparis-takip', label: 'Sipariş Takip' },
                ].map((link) => (
                  <Link key={link.href} href={link.href}>
                    <span className="block text-center px-3 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs sm:text-sm rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer whitespace-nowrap">
                      {link.label}
                    </span>
                  </Link>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>

      <footer className="py-8 text-center border-t border-zinc-800">
        <Link href="/">
          <span className="text-zinc-500 hover:text-white text-sm transition-colors cursor-pointer flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Geri Dön
          </span>
        </Link>
      </footer>
    </div>
  );
}
