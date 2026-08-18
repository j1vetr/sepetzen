import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus, Check, Loader2, ChevronRight, Package } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '@/hooks/useCart';
import { getOriginalPrice } from '@/lib/discountPrice';

interface ComplementaryRow {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  price: string;
  discountBadge: string | null;
  variantId: string;
  requiresSelection: boolean;
}

interface Props {
  /** Önerilerin türetileceği kaynak ürünler (mevcut ürün ya da sepettekiler). */
  baseProductIds: string[];
  title?: string;
  limit?: number;
  className?: string;
}

/**
 * "Tamamlayıcı Ürünler" bölümü: kaynak ürünlerle aynı kategorideki diğer
 * ürünleri listeler; kutucuğu işaretlemek ürünü sepete ekler, kaldırmak
 * sepetten çıkarır. Beden/renk seçimi gereken ürünler ürün sayfasına götürür.
 *
 * Öneri listesi ilk açılışta sabitlenir (idsKey), böylece eklenen ürün
 * listeden kaybolmaz ve işaret geri kaldırılabilir.
 */
export function ComplementaryProducts({ baseProductIds, title = 'Tamamlayıcı Ürünler', limit = 3, className = '' }: Props) {
  const [idsKey] = useState(() => [...baseProductIds].sort().join(','));
  const [open, setOpen] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { items, addToCart, removeItem } = useCart();

  const { data: rows = [] } = useQuery<ComplementaryRow[]>({
    queryKey: ['complementary-products', idsKey, limit],
    queryFn: async () => {
      const res = await fetch(`/api/complementary-products?ids=${encodeURIComponent(idsKey)}&limit=${limit}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: idsKey.length > 0,
    staleTime: 60_000,
  });

  if (rows.length === 0) return null;

  const cartLineFor = (row: ComplementaryRow) =>
    items.find((ci) => ci.productId === row.id && ci.variantId === row.variantId && !ci.personalizationText);

  const toggle = async (row: ComplementaryRow) => {
    if (busyId) return;
    setBusyId(row.id);
    try {
      const line = cartLineFor(row);
      if (line) {
        await removeItem(line.id);
      } else {
        await addToCart(row.id, row.variantId, 1);
      }
    } catch {
      // Stok yetersiz vb. — sessizce bırak; kutucuk işaretlenmemiş kalır
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={`border border-white/10 bg-[#111111] ${className}`} data-testid="section-complementary">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="complementary-list"
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        data-testid="button-complementary-toggle"
      >
        <span className="text-[11px] tracking-[0.22em] uppercase text-white/70 font-semibold">{title}</span>
        <span className="w-7 h-7 flex items-center justify-center border border-white/12 text-white/70">
          {open ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div id="complementary-list" className="px-3 pb-3 space-y-2">
              {rows.map((row) => {
                const price = parseFloat(row.price) || 0;
                const original = getOriginalPrice(price, row.discountBadge);
                const inCart = !!cartLineFor(row);
                const busy = busyId === row.id;

                const inner = (
                  <>
                    <div className="w-12 h-14 bg-[#1A1A1A] shrink-0 overflow-hidden">
                      {row.image ? (
                        <img src={row.image} alt={row.name} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-4 h-4 text-white/25" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium text-white leading-snug line-clamp-2">{row.name}</p>
                      <p className="text-[12px] mt-0.5 tabular-nums">
                        <span className="text-white font-semibold">
                          {price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </span>
                        {original && (
                          <span className="text-white/30 line-through ml-2">
                            {original.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                          </span>
                        )}
                      </p>
                    </div>
                  </>
                );

                if (row.requiresSelection) {
                  // Beden/renk seçimi gerekli: ürün sayfasına yönlendir
                  return (
                    <Link key={row.id} href={`/urun/${row.slug}`}>
                      <div
                        className="flex items-center gap-3 p-2.5 bg-white/[0.04] hover:bg-white/[0.07] transition-colors cursor-pointer"
                        data-testid={`complementary-link-${row.id}`}
                      >
                        {inner}
                        <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
                      </div>
                    </Link>
                  );
                }

                return (
                  <div
                    key={row.id}
                    role="checkbox"
                    aria-checked={inCart}
                    aria-busy={busy}
                    aria-disabled={!!busyId && !busy}
                    tabIndex={0}
                    onClick={() => toggle(row)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(row); } }}
                    className={`flex items-center gap-3 p-2.5 bg-white/[0.04] transition-colors select-none ${
                      busyId ? 'cursor-wait opacity-80' : 'cursor-pointer hover:bg-white/[0.07]'
                    }`}
                    data-testid={`complementary-item-${row.id}`}
                  >
                    {inner}
                    <span
                      className={`w-6 h-6 shrink-0 border flex items-center justify-center transition-colors ${
                        inCart ? 'bg-white border-white text-black' : 'border-white/25 text-transparent'
                      }`}
                    >
                      {busy
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white/60" />
                        : <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
