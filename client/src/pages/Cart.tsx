import { useState } from 'react';
import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { useCart } from '@/hooks/useCart';
import {
  Minus, Plus, Trash2, ShoppingBag, Truck,
  ShieldCheck, RotateCcw, ArrowLeft, Package,
  ChevronDown, ChevronUp, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SEO } from '@/components/SEO';
import { BANK_TRANSFER_DISCOUNT_RATE } from '@shared/bankInfo';

const FREE_SHIPPING_THRESHOLD = 1500;
const DOMESTIC_SHIPPING_COST = 200;

export default function Cart() {
  const { items, isLoading, updateQuantity, removeItem, totalItems, subtotal } = useCart();
  const [summaryOpen, setSummaryOpen] = useState(false);

  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DOMESTIC_SHIPPING_COST;
  const total = subtotal + shippingCost;
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const shippingProgress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const bankDiscountPercent = Math.round(BANK_TRANSFER_DISCOUNT_RATE * 100);
  const bankDiscountTotal = total * (1 - BANK_TRANSFER_DISCOUNT_RATE);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SEO title="Sepetim" description="Sepetzen alışveriş sepetiniz." url="/sepet" noIndex />
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-32 bg-white rounded-lg border border-gray-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <SEO title="Sepetim" description="Sepetzen alışveriş sepetiniz." url="/sepet" noIndex />
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-6 pb-36 lg:pb-10">
        <Link href="/">
          <div className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-4 cursor-pointer">
            <ArrowLeft size={16} />
            <span className="font-medium">Alışverişe Devam Et</span>
          </div>
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-6" data-testid="text-page-title">
          Sepetim{' '}
          {totalItems > 0 && (
            <span className="text-gray-500 font-normal text-lg">({totalItems} Ürün)</span>
          )}
        </h1>

        {items.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-9 h-9 text-gray-300" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sepetiniz şu an boş</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
              Sepetinize ürün eklemek için alışverişe başlayın.
            </p>
            <Link href="/">
              <button
                className="bg-[#2D5A27] hover:bg-[#20401c] text-white px-7 py-3 rounded-md font-bold transition-colors"
                data-testid="button-continue-shopping"
              >
                Alışverişe Başla
              </button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* ── Left: Items ─────────────────────── */}
            <div className="flex-1 space-y-4">
              {/* Free shipping progress */}
              <div className="bg-white rounded-lg border border-green-100 shadow-sm p-4 flex gap-4 items-start sm:items-center">
                <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center shrink-0">
                  <Truck size={20} className="text-[#2D5A27]" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-gray-700">Kargo Bedava</span>
                    {remainingForFreeShipping > 0 ? (
                      <span className="text-[#2D5A27] font-semibold">
                        {remainingForFreeShipping.toLocaleString('tr-TR')} TL kaldı
                      </span>
                    ) : (
                      <span className="text-[#2D5A27] font-semibold">Tebrikler, kargo bedava!</span>
                    )}
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#4a9a42] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${shippingProgress}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>

              {/* Product card list */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center gap-2 text-sm text-gray-600">
                  Satıcı:{' '}
                  <span className="font-semibold text-gray-900 ml-1">Sepetzen</span>
                  <span className="bg-[#2D5A27] text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                    Resmi Satıcı
                  </span>
                </div>

                <AnimatePresence mode="popLayout">
                  {items.map((item, index) => {
                    const itemPrice = parseFloat(
                      item.variant?.price || item.product?.basePrice || '0'
                    );
                    const lineTotal = itemPrice * item.quantity;
                    const product = item.product;
                    const variant = item.variant;

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="relative flex gap-4 p-5 border-b border-gray-100 last:border-0 group"
                        data-testid={`cart-item-${item.id}`}
                      >
                        {/* Image */}
                        <Link href={`/urun/${product?.slug}`}>
                          <div className="w-20 h-24 sm:w-24 sm:h-28 bg-[#2D5A27]/8 rounded-md shrink-0 overflow-hidden cursor-pointer">
                            {product?.images?.[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={24} className="text-[#2D5A27]/30" />
                              </div>
                            )}
                          </div>
                        </Link>

                        {/* Details */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div className="pr-8">
                            <Link href={`/urun/${product?.slug}`}>
                              <h3
                                className="font-medium text-gray-900 text-sm leading-snug line-clamp-2 hover:underline cursor-pointer"
                                data-testid={`text-product-name-${item.id}`}
                              >
                                {product?.name || 'Ürün'}
                              </h3>
                            </Link>
                            {(variant?.size || variant?.color) && (
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {variant.size && (
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                                    Beden: {variant.size}
                                  </span>
                                )}
                                {variant.color && (
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                                    {variant.color}
                                  </span>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-gray-400 mt-1.5">Tahmini Teslimat: 1–3 İş Günü</p>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-end justify-between mt-3 gap-3">
                            {/* Quantity stepper */}
                            <div className="flex items-center border border-gray-300 rounded-md w-fit">
                              <button
                                onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                disabled={item.quantity <= 1}
                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-[#2D5A27] transition-colors rounded-l-md disabled:opacity-40"
                                data-testid={`button-decrease-${item.id}`}
                              >
                                <Minus size={14} />
                              </button>
                              <span
                                className="w-10 h-8 flex items-center justify-center text-sm font-semibold text-gray-800"
                                data-testid={`text-quantity-${item.id}`}
                              >
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-[#2D5A27] transition-colors rounded-r-md"
                                data-testid={`button-increase-${item.id}`}
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            <div className="text-right">
                              <div
                                className="text-lg sm:text-xl font-bold text-[#2D5A27]"
                                data-testid={`text-price-${item.id}`}
                              >
                                {lineTotal.toLocaleString('tr-TR')} ₺
                              </div>
                              {item.quantity > 1 && (
                                <div className="text-xs text-gray-400">
                                  {itemPrice.toLocaleString('tr-TR')} ₺ / adet
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Ürünü kaldır"
                          data-testid={`button-remove-${item.id}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Havale info banner */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2 text-sm">
                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-blue-800">
                  <strong>Havale/EFT ile ödemelerde %{bankDiscountPercent} indirim!</strong>{' '}
                  Ödeme adımında seçebilirsiniz.
                </p>
              </div>
            </div>

            {/* ── Right: Summary (desktop) ─────────── */}
            <div className="hidden lg:block w-[340px] shrink-0">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 sticky top-24">
                <h2 className="text-lg font-bold text-gray-900 mb-4 pb-4 border-b border-gray-100">
                  Sipariş Özeti
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Ara Toplam ({totalItems} ürün)</span>
                    <span className="font-medium text-gray-900" data-testid="text-subtotal">
                      {subtotal.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Kargo</span>
                    <span
                      className={
                        shippingCost === 0
                          ? 'font-medium text-[#2D5A27]'
                          : 'font-medium text-gray-900'
                      }
                      data-testid="text-shipping"
                    >
                      {shippingCost === 0 ? 'Bedava' : `${shippingCost.toLocaleString('tr-TR')} ₺`}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mb-5">
                  <div className="flex justify-between items-end">
                    <span className="font-bold text-gray-900">Toplam</span>
                    <span
                      className="text-2xl font-black text-[#2D5A27]"
                      data-testid="text-total"
                    >
                      {total.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                </div>

                <Link href="/odeme">
                  <button
                    className="w-full bg-[#2D5A27] hover:bg-[#20401c] text-white py-3.5 rounded-md font-bold text-lg shadow-md hover:shadow-lg transition-all mb-3 flex items-center justify-center gap-2"
                    data-testid="button-checkout"
                  >
                    ÖDEMEYE GEÇ
                  </button>
                </Link>

                <div className="bg-green-50 border border-green-100 rounded p-3 text-center mb-5" data-testid="info-bank-transfer-discount">
                  <p className="text-xs text-green-800 font-medium">
                    Havale / EFT ile ödemede %{bankDiscountPercent} İndirim!
                  </p>
                  <p className="text-sm font-bold text-[#2D5A27] mt-1">
                    {bankDiscountTotal.toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    ₺
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-gray-500">
                    <ShieldCheck size={18} className="text-[#4a9a42] shrink-0" />
                    <span className="text-xs font-medium">Güvenli Ödeme — 256bit SSL</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-500">
                    <RotateCcw size={18} className="text-[#4a9a42] shrink-0" />
                    <span className="text-xs font-medium">14 Gün İçinde Kolay İade</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-500">
                    <Truck size={18} className="text-[#4a9a42] shrink-0" />
                    <span className="text-xs font-medium">Aynı Gün Hızlı Teslimat</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Mobile sticky bottom bar ─────────────── */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.07)] z-40">
          {/* Accordion order summary */}
          <div className="border-b border-gray-100">
            <button
              onClick={() => setSummaryOpen(o => !o)}
              className="w-full px-4 py-3 flex justify-between items-center text-sm font-medium text-gray-700 active:bg-gray-50 transition-colors"
            >
              <span>Sipariş Özeti</span>
              <div className="flex items-center gap-1 text-[#2D5A27]">
                <span className="font-bold">{total.toLocaleString('tr-TR')} ₺</span>
                {summaryOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </div>
            </button>

            <AnimatePresence>
              {summaryOpen && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-2 space-y-2 text-sm bg-gray-50/80 border-t border-gray-100">
                    <div className="flex justify-between text-gray-600">
                      <span>Ara Toplam</span>
                      <span>{subtotal.toLocaleString('tr-TR')} ₺</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Kargo</span>
                      <span className={shippingCost === 0 ? 'text-[#2D5A27]' : ''}>
                        {shippingCost === 0 ? 'Bedava' : `${shippingCost.toLocaleString('tr-TR')} ₺`}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t border-gray-200 text-gray-900">
                      <span>Toplam</span>
                      <span className="text-[#2D5A27]">{total.toLocaleString('tr-TR')} ₺</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CTA row */}
          <div className="px-4 py-3 flex items-center gap-3 bg-white">
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-0.5">Toplam Ödenecek</p>
              <p className="text-lg font-bold text-[#2D5A27] leading-none">
                {total.toLocaleString('tr-TR')} ₺
              </p>
            </div>
            <Link href="/odeme" className="flex-[1.5]">
              <button
                className="w-full bg-[#2D5A27] hover:bg-[#20401c] text-white font-bold py-3.5 px-4 rounded-lg flex items-center justify-center transition-colors shadow-md"
                data-testid="button-checkout-mobile"
              >
                ÖDEMEYE GEÇ
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
