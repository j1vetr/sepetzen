import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { Minus, Plus, Trash2, ShoppingBag, Truck, Shield, RotateCcw, ArrowRight, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { SEO } from '@/components/SEO';

interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: string;
  images: string[];
}

const FREE_SHIPPING_THRESHOLD = 2500;

export default function Cart() {
  const { items, isLoading, updateQuantity, removeItem, totalItems, subtotal } = useCart();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products');
      return res.json();
    },
  });

  const cartItemsWithProducts = items.map(item => {
    const product = products.find(p => p.id === item.productId);
    return { ...item, product };
  });

  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 200;
  const total = subtotal + shippingCost;
  const remainingForFreeShipping = FREE_SHIPPING_THRESHOLD - subtotal;
  const shippingProgress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="pt-20 lg:pt-8 pb-12 px-6">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="font-display text-xl text-black/40"
            >
              Yükleniyor...
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden w-full">
      <SEO title="Sepetim" description="Sepetzen alışveriş sepetiniz." url="/sepet" noIndex />
      <Header />

      <main className="pt-20 lg:pt-8 pb-12 px-4 sm:px-6 w-full box-border">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <h1 className="font-display text-3xl sm:text-4xl tracking-wider mb-1.5 text-black" data-testid="text-page-title">
              SEPETİM
            </h1>
            <p className="text-black/40 text-sm">
              {totalItems > 0 ? `${totalItems} ürün sepetinizde` : 'Sepetiniz boş'}
            </p>
          </motion.div>

          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 mx-auto mb-6 bg-stone-100 flex items-center justify-center">
                <ShoppingBag className="w-10 h-10 text-black/25" />
              </div>
              <h2 className="font-display text-2xl tracking-wide mb-4 text-black">Sepetiniz Boş</h2>
              <p className="text-black/40 mb-8 max-w-md mx-auto">
                Henüz sepetinize ürün eklemediniz. Koleksiyonumuzu keşfedin ve favori ürünlerinizi ekleyin.
              </p>
              <Link href="/">
                <Button className="h-12 px-8 bg-black text-white hover:bg-black/85 font-bold tracking-wide group rounded-none" data-testid="button-continue-shopping">
                  ALIŞVERİŞE BAŞLA
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </motion.div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 overflow-hidden">
              <div className="lg:col-span-2 space-y-4 overflow-hidden">

                {remainingForFreeShipping > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border border-amber-200/70 rounded-lg p-5"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-amber-100 flex items-center justify-center rounded-full">
                        <Truck className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-black/80">Ücretsiz Kargoya Az Kaldı!</p>
                        <p className="text-sm text-black/45">
                          <span className="font-bold text-amber-600">{remainingForFreeShipping.toFixed(0)} TL</span> daha harcayın
                        </p>
                      </div>
                    </div>
                    <div className="h-2 bg-black/6 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${shippingProgress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                      />
                    </div>
                  </motion.div>
                )}

                {remainingForFreeShipping <= 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-50 border border-green-200/70 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 flex items-center justify-center rounded-full">
                        <Truck className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-green-700">Ücretsiz Kargo Kazandınız!</p>
                        <p className="text-sm text-black/40">Siparişiniz ücretsiz kargo ile gönderilecek</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-stone-50 border border-black/6 rounded-lg p-4 space-y-1"
                >
                  <p className="text-xs text-black/45 text-center">
                    <strong className="text-black/60">Türkiye içi kargo:</strong> 2.500 TL üzeri ücretsiz, altı 200 TL
                  </p>
                  <p className="text-xs text-black/45 text-center">
                    <strong className="text-black/60">Uluslararası kargo:</strong> Sabit 2.500 TL (ödeme adımında hesaplanır)
                  </p>
                </motion.div>

                <AnimatePresence mode="popLayout">
                  {cartItemsWithProducts.map((item, index) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group bg-white border border-black/8 hover:border-black/15 transition-colors overflow-hidden rounded-lg"
                      data-testid={`cart-item-${item.id}`}
                    >
                      <div className="flex gap-4 p-4">
                        <Link href={`/urun/${item.product?.slug}`}>
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="w-28 h-32 bg-stone-100 overflow-hidden shrink-0 relative rounded-lg"
                          >
                            {item.product?.images?.[0] && (
                              <img
                                src={item.product.images[0]}
                                alt={item.product.name}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                            )}
                          </motion.div>
                        </Link>

                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                          <div>
                            <Link href={`/urun/${item.product?.slug}`}>
                              <h3 className="font-medium text-sm leading-snug line-clamp-2 hover:text-black/70 transition-colors text-black" data-testid={`text-product-name-${item.id}`}>
                                {item.product?.name || 'Ürün'}
                              </h3>
                            </Link>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {item.variant?.size && (
                                <span className="text-xs px-2 py-0.5 bg-black/5 rounded text-black/60">
                                  Beden: {item.variant.size}
                                </span>
                              )}
                              {item.variant?.color && (
                                <span className="text-xs px-2 py-0.5 bg-black/5 rounded text-black/60">
                                  {item.variant.color}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-3">
                            <div className="flex items-center bg-black/4 rounded-lg p-0.5 shrink-0">
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded hover:bg-black/8 transition-colors text-black"
                                data-testid={`button-decrease-${item.id}`}
                              >
                                <Minus className="w-3 h-3" />
                              </motion.button>
                              <span className="w-6 sm:w-7 text-center text-xs sm:text-sm font-medium text-black" data-testid={`text-quantity-${item.id}`}>
                                {item.quantity}
                              </span>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded hover:bg-black/8 transition-colors text-black"
                                data-testid={`button-increase-${item.id}`}
                              >
                                <Plus className="w-3 h-3" />
                              </motion.button>
                            </div>

                            <p className="font-bold text-base sm:text-lg shrink-0 text-black" data-testid={`text-price-${item.id}`}>
                              {(parseFloat(item.product?.basePrice || '0') * item.quantity).toLocaleString('tr-TR')} ₺
                            </p>
                          </div>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => removeItem(item.id)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-red-50 text-black/25 hover:text-red-500 transition-colors self-start rounded-full"
                          data-testid={`button-remove-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-stone-50 border border-black/8 p-4 sm:p-6 sticky top-24 overflow-hidden"
                >
                  <h2 className="font-display text-xl tracking-wide mb-6 text-black">
                    SİPARİŞ ÖZETİ
                  </h2>

                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-black/45">Ara Toplam ({totalItems} ürün)</span>
                      <span className="font-medium text-black" data-testid="text-subtotal">{subtotal.toLocaleString('tr-TR')} ₺</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/45">Kargo</span>
                      <span data-testid="text-shipping" className={shippingCost === 0 ? 'text-green-600 font-medium' : 'text-black'}>
                        {shippingCost === 0 ? 'ÜCRETSİZ' : `${shippingCost.toFixed(2)} ₺`}
                      </span>
                    </div>
                    <div className="h-px bg-black/8 my-4" />
                    <div className="flex justify-between text-base">
                      <span className="font-bold text-black">Toplam</span>
                      <span className="font-bold text-xl text-black" data-testid="text-total">{total.toLocaleString('tr-TR')} ₺</span>
                    </div>
                  </div>

                  <Link href="/odeme">
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <Button className="w-full h-14 mt-6 bg-black text-white hover:bg-black/85 font-bold text-sm tracking-wider group rounded-none" data-testid="button-checkout">
                        ÖDEMEYE GEÇ
                        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </motion.div>
                  </Link>

                  <div
                    className="mt-3 px-3 py-2.5 bg-polen-orange/10 border border-polen-orange/30 flex items-start gap-2"
                    data-testid="info-bank-transfer-discount"
                  >
                    <span className="text-[15px] leading-none mt-0.5">🏦</span>
                    <p className="text-[12px] text-black/75 leading-snug">
                      <span className="font-semibold text-black">Havale ile %10 indirim</span> — ödeme adımında seçin.
                    </p>
                  </div>

                  <Link href="/">
                    <Button variant="ghost" className="w-full mt-3 text-sm text-black/35 hover:text-black hover:bg-transparent" data-testid="button-continue">
                      Alışverişe Devam Et
                    </Button>
                  </Link>

                  <div className="mt-6 pt-6 border-t border-black/6 space-y-3">
                    <div className="flex items-center gap-3 text-xs text-black/40">
                      <Shield className="w-4 h-4 shrink-0" />
                      <span>Güvenli Ödeme</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-black/40">
                      <RotateCcw className="w-4 h-4 shrink-0" />
                      <span>14 Gün Ücretsiz İade</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-black/40">
                      <Package className="w-4 h-4 shrink-0" />
                      <span>Hızlı Teslimat (1 İş Günü)</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
