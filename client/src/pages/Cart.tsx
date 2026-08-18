import { useState, useRef } from 'react';
import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { useCart } from '@/hooks/useCart';
import {
  Minus, Plus, Trash2, ShoppingBag, Truck,
  ShieldCheck, RotateCcw, ArrowLeft, Package,
  ChevronDown, ChevronUp, Info, Pencil, Check, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SEO } from '@/components/SEO';
import { BANK_TRANSFER_DISCOUNT_RATE } from '@shared/bankInfo';
import { useShippingSettings } from '@/hooks/useShippingSettings';
import { ComplementaryProducts } from '@/components/ComplementaryProducts';

export default function Cart() {
  const { items, isLoading, updateQuantity, updatePersonalizationText, removeItem, totalItems, subtotal } = useCart();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [editingPersonalizationId, setEditingPersonalizationId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [personalizationError, setPersonalizationError] = useState('');
  const [savingPersonalization, setSavingPersonalization] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const { freeShippingThreshold, domesticShippingCost } = useShippingSettings();

  const shippingCost = subtotal >= freeShippingThreshold ? 0 : domesticShippingCost;
  const total = subtotal + shippingCost;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const shippingProgress = Math.min((subtotal / freeShippingThreshold) * 100, 100);
  const bankDiscountPercent = Math.round(BANK_TRANSFER_DISCOUNT_RATE * 100);
  const bankDiscountTotal = total * (1 - BANK_TRANSFER_DISCOUNT_RATE);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <SEO title="Sepetim" description="Sepetzen alışveriş sepetiniz." url="/sepet" noIndex />
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-32 bg-[#141414] rounded-lg border border-white/8 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden">
      <SEO title="Sepetim" description="Sepetzen alışveriş sepetiniz." url="/sepet" noIndex />
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-6 pb-36 lg:pb-10">
        <Link href="/">
          <div className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors mb-4 cursor-pointer">
            <ArrowLeft size={16} />
            <span className="font-medium">Alışverişe Devam Et</span>
          </div>
        </Link>

        <h1 className="font-display text-3xl sm:text-4xl text-white tracking-wide mb-6" data-testid="text-page-title">
          Sepetim{' '}
          {totalItems > 0 && (
            <span className="text-white/50 text-xl align-middle font-sans font-normal tracking-normal">({totalItems} Ürün)</span>
          )}
        </h1>

        {items.length === 0 ? (
          <div className="bg-[#141414] rounded-lg border border-white/8 shadow-[0_8px_30px_rgba(0,0,0,0.4)] p-16 text-center">
            <div className="w-20 h-20 bg-white/8 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-9 h-9 text-white/30" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Sepetiniz şu an boş</h2>
            <p className="text-white/50 text-sm mb-6 max-w-sm mx-auto">
              Sepetinize ürün eklemek için alışverişe başlayın.
            </p>
            <Link href="/">
              <button
                className="bg-white hover:bg-white/90 text-black px-7 py-3 rounded-md font-bold transition-colors"
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
              <div className="bg-[#141414] rounded-lg border border-white/8 shadow-[0_8px_30px_rgba(0,0,0,0.4)] p-4 flex gap-4 items-start sm:items-center">
                <div className="w-10 h-10 bg-white/8 rounded-full flex items-center justify-center shrink-0">
                  <Truck size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-white/70">Kargo Bedava</span>
                    {remainingForFreeShipping > 0 ? (
                        <span className="text-white font-semibold">
                        {remainingForFreeShipping.toLocaleString('tr-TR')} TL kaldı
                      </span>
                    ) : (
                      <span className="text-white font-semibold">Tebrikler, kargo bedava!</span>
                    )}
                  </div>
                  <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-white rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${shippingProgress}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>

              {/* Product card list */}
              <div className="bg-[#141414] rounded-lg border border-white/8 shadow-[0_8px_30px_rgba(0,0,0,0.4)] overflow-hidden">
                <div className="bg-[#0F0F0F] border-b border-white/8 px-5 py-3 flex items-center gap-2 text-sm text-white/55">
                  Satıcı:{' '}
                   <span className="font-semibold text-white ml-1">Sepetzen</span>
                   <span className="bg-white text-black text-[10px] px-1.5 py-0.5 rounded font-bold">
                    Resmi Satıcı
                  </span>
                </div>

                <AnimatePresence mode="popLayout">
                  {items.map((item, index) => {
                    // Kişiselleştirme yazısı olan satıra ürünün ek ücreti eklenir
                    // (useCart.subtotal ile aynı hesap).
                    const persFee = item.personalizationText && item.product?.personalization?.enabled
                      ? parseFloat(item.product.personalization.fee || '0') || 0
                      : 0;
                    const itemPrice = parseFloat(
                      item.variant?.price || item.product?.basePrice || '0'
                    ) + persFee;
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
                         className="relative flex gap-4 p-5 border-b border-white/8 last:border-0 group"
                        data-testid={`cart-item-${item.id}`}
                      >
                        {/* Image */}
                        <Link href={`/urun/${product?.slug}`}>
                          <div className="w-20 h-24 sm:w-24 sm:h-28 bg-[#151515] rounded-md shrink-0 overflow-hidden cursor-pointer">
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
                                 <Package size={24} className="text-white/30" />
                              </div>
                            )}
                          </div>
                        </Link>

                        {/* Details */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div className="pr-8">
                            <Link href={`/urun/${product?.slug}`}>
                              <h3
                                className="font-medium text-white text-sm leading-snug line-clamp-2 hover:underline cursor-pointer"
                                data-testid={`text-product-name-${item.id}`}
                              >
                                {product?.name || 'Ürün'}
                              </h3>
                            </Link>
                            {(variant?.size || variant?.color) && (
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {variant.size && (
                                   <span className="text-xs px-2 py-0.5 bg-white/8 rounded text-white/60">
                                    Beden: {variant.size}
                                  </span>
                                )}
                                {variant.color && (
                                   <span className="text-xs px-2 py-0.5 bg-white/8 rounded text-white/60">
                                    {variant.color}
                                  </span>
                                )}
                              </div>
                            )}
                            {item.personalizationText && editingPersonalizationId !== item.id && (
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap" data-testid={`text-personalization-${item.id}`}>
                                <span className="text-xs px-2 py-0.5 bg-white/8 rounded text-white/60">
                                  Kişiselleştirme: "{item.personalizationText}"
                                  {persFee > 0 && <span className="text-white/45"> (+{persFee.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺)</span>}
                                </span>
                                {product?.personalization?.enabled && (
                                  <button
                                    onClick={() => {
                                      setEditingPersonalizationId(item.id);
                                      setEditingText(item.personalizationText ?? '');
                                      setPersonalizationError('');
                                      setTimeout(() => editInputRef.current?.focus(), 50);
                                    }}
                                    className="p-0.5 text-white/40 hover:text-white/80 transition-colors"
                                    title="Kişiselleştirme yazısını düzenle"
                                    data-testid={`button-edit-personalization-${item.id}`}
                                  >
                                    <Pencil size={12} />
                                  </button>
                                )}
                              </div>
                            )}
                            {editingPersonalizationId === item.id && (
                              <div className="mt-2 space-y-1.5" data-testid={`form-edit-personalization-${item.id}`}>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    ref={editInputRef}
                                    type="text"
                                    value={editingText}
                                    onChange={e => {
                                      setEditingText(e.target.value);
                                      setPersonalizationError('');
                                    }}
                                    maxLength={product?.personalization?.maxChars ?? 30}
                                    placeholder={product?.personalization?.label ?? 'Kişiselleştirme yazısı'}
                                    className="flex-1 text-xs bg-white/8 border border-white/15 rounded px-2 py-1 text-white placeholder:text-white/30 focus:outline-none focus:border-white/35 min-w-0"
                                    onKeyDown={async e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        setSavingPersonalization(true);
                                        try {
                                          await updatePersonalizationText(item.id, editingText.trim());
                                          setEditingPersonalizationId(null);
                                        } catch (err: unknown) {
                                          setPersonalizationError(err instanceof Error ? err.message : 'Güncelleme başarısız');
                                        } finally {
                                          setSavingPersonalization(false);
                                        }
                                      } else if (e.key === 'Escape') {
                                        setEditingPersonalizationId(null);
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={async () => {
                                      setSavingPersonalization(true);
                                      try {
                                        await updatePersonalizationText(item.id, editingText.trim());
                                        setEditingPersonalizationId(null);
                                      } catch (err: unknown) {
                                        setPersonalizationError(err instanceof Error ? err.message : 'Güncelleme başarısız');
                                      } finally {
                                        setSavingPersonalization(false);
                                      }
                                    }}
                                    disabled={savingPersonalization}
                                    className="p-1 text-white/70 hover:text-white bg-white/8 rounded transition-colors disabled:opacity-40"
                                    title="Kaydet"
                                    data-testid={`button-save-personalization-${item.id}`}
                                  >
                                    <Check size={13} />
                                  </button>
                                  <button
                                    onClick={() => setEditingPersonalizationId(null)}
                                    className="p-1 text-white/40 hover:text-white/70 transition-colors"
                                    title="İptal"
                                    data-testid={`button-cancel-personalization-${item.id}`}
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                                {personalizationError && (
                                  <p className="text-xs text-red-400">{personalizationError}</p>
                                )}
                                <p className="text-[10px] text-white/35">
                                  {editingText.length}/{product?.personalization?.maxChars ?? 30} karakter · Boş bırakırsanız kişiselleştirme kaldırılır
                                </p>
                              </div>
                            )}
                            <p className="text-xs text-white/50 mt-1.5">Tahmini Teslimat: 1–3 İş Günü</p>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-end justify-between mt-3 gap-3">
                            {/* Quantity stepper */}
                              <div className="flex items-center border border-white/12 rounded-md w-fit">
                              <button
                                onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                disabled={item.quantity <= 1}
                                 className="w-8 h-8 flex items-center justify-center text-white/50 hover:bg-white/5 hover:text-white transition-colors rounded-l-md disabled:opacity-40"
                                data-testid={`button-decrease-${item.id}`}
                              >
                                <Minus size={14} />
                              </button>
                              <span
                                 className="w-10 h-8 flex items-center justify-center text-sm font-semibold text-white/80"
                                data-testid={`text-quantity-${item.id}`}
                              >
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                 className="w-8 h-8 flex items-center justify-center text-white/50 hover:bg-white/5 hover:text-white transition-colors rounded-r-md"
                                data-testid={`button-increase-${item.id}`}
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            <div className="text-right">
                              <div
                                 className="text-lg sm:text-xl font-bold text-white"
                                data-testid={`text-price-${item.id}`}
                              >
                                {lineTotal.toLocaleString('tr-TR')} ₺
                              </div>
                              {item.quantity > 1 && (
                                 <div className="text-xs text-white/50">
                                  {itemPrice.toLocaleString('tr-TR')} ₺ / adet
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => removeItem(item.id)}
                           className="absolute top-4 right-4 p-1.5 text-white/40 hover:text-[#F04444] hover:bg-[#F04444]/8 rounded transition-colors"
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

              {/* Tamamlayıcı ürünler: sepettekilerle aynı kategoriden hızlı
                  ekleme. Liste bileşen içinde ilk açılışta sabitlenir; ekleme
                  yapılınca satır kaybolmaz, işaret geri kaldırılabilir. */}
              <ComplementaryProducts
                baseProductIds={items.map(i => i.productId)}
                className="rounded-lg overflow-hidden"
              />

              {/* Havale info banner */}
              <div className="bg-[#141414] border border-black rounded-lg p-3 flex items-start gap-2 text-sm">
                <Info size={18} className="text-white/70 shrink-0 mt-0.5" />
                <p className="text-white/85">
                  <strong>Havale/EFT ile ödemelerde %{bankDiscountPercent} indirim!</strong>{' '}
                  Ödeme adımında seçebilirsiniz.
                </p>
              </div>
            </div>

            {/* ── Right: Summary (desktop) ─────────── */}
            <div className="hidden lg:block w-[340px] shrink-0">
               <div className="bg-[#141414] rounded-lg border border-white/8 shadow-[0_8px_30px_rgba(0,0,0,0.4)] p-6 sticky top-24">
                 <h2 className="text-lg font-bold text-white mb-4 pb-4 border-b border-white/8">
                  Sipariş Özeti
                </h2>

                <div className="space-y-3 mb-6">
                   <div className="flex justify-between text-sm text-white/55">
                    <span>Ara Toplam ({totalItems} ürün)</span>
                     <span className="font-medium text-white" data-testid="text-subtotal">
                      {subtotal.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                   <div className="flex justify-between text-sm text-white/55">
                    <span>Kargo</span>
                    <span
                      className={
                        shippingCost === 0
                           ? 'font-medium text-white'
                           : 'font-medium text-white'
                      }
                      data-testid="text-shipping"
                    >
                      {shippingCost === 0 ? 'Bedava' : `${shippingCost.toLocaleString('tr-TR')} ₺`}
                    </span>
                  </div>
                </div>

                 <div className="border-t border-white/8 pt-4 mb-5">
                  <div className="flex justify-between items-end">
                     <span className="font-bold text-white">Toplam</span>
                    <span
                       className="text-2xl font-black text-white"
                      data-testid="text-total"
                    >
                      {total.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                </div>

                <Link href="/odeme">
                  <button
                    className="all-cats-gold !rounded-lg w-full py-3.5 font-bold text-base tracking-[0.12em] uppercase mb-3 flex items-center justify-center gap-2"
                    data-testid="button-checkout"
                  >
                    ÖDEMEYE GEÇ
                  </button>
                </Link>

                 <div className="bg-white/5 border border-white/8 rounded p-3 text-center mb-5" data-testid="info-bank-transfer-discount">
                   <p className="text-xs text-white/70 font-medium">
                    Havale / EFT ile ödemede %{bankDiscountPercent} İndirim!
                  </p>
                   <p className="text-sm font-bold text-white mt-1">
                    {bankDiscountTotal.toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    ₺
                  </p>
                </div>

                 <div className="space-y-3 pt-4 border-t border-white/8">
                   <div className="flex items-center gap-3 text-white/50">
                     <ShieldCheck size={18} className="text-white shrink-0" />
                    <span className="text-xs font-medium">Güvenli Ödeme — 256bit SSL</span>
                  </div>
                   <div className="flex items-center gap-3 text-white/50">
                     <RotateCcw size={18} className="text-white shrink-0" />
                    <span className="text-xs font-medium">14 Gün İçinde Kolay İade</span>
                  </div>
                   <div className="flex items-center gap-3 text-white/50">
                     <Truck size={18} className="text-white shrink-0" />
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
         <div
           className="fixed left-0 right-0 lg:hidden bg-[#141414] border-t border-white/8 shadow-[0_-8px_30px_rgba(0,0,0,0.4)] z-[90]"
           style={{ bottom: 'var(--mobile-nav-total, 58px)' }}
         >
          {/* Accordion order summary */}
           <div className="border-b border-white/8">
            <button
              onClick={() => setSummaryOpen(o => !o)}
               className="w-full px-4 py-3 flex justify-between items-center text-sm font-medium text-white/70 active:bg-white/5 transition-colors"
            >
              <span>Sipariş Özeti</span>
               <div className="flex items-center gap-1 text-white">
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
                   <div className="px-4 pb-4 pt-2 space-y-2 text-sm bg-[#0F0F0F] border-t border-white/8">
                     <div className="flex justify-between text-white/55">
                      <span>Ara Toplam</span>
                      <span>{subtotal.toLocaleString('tr-TR')} ₺</span>
                    </div>
                     <div className="flex justify-between text-white/55">
                      <span>Kargo</span>
                       <span className={shippingCost === 0 ? 'text-white' : ''}>
                        {shippingCost === 0 ? 'Bedava' : `${shippingCost.toLocaleString('tr-TR')} ₺`}
                      </span>
                    </div>
                     <div className="flex justify-between font-bold pt-2 border-t border-white/8 text-white">
                      <span>Toplam</span>
                       <span className="text-white">{total.toLocaleString('tr-TR')} ₺</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CTA row */}
           <div className="px-4 py-3 flex items-center gap-3 bg-[#141414]">
            <div className="flex-1">
               <p className="text-xs text-white/50 mb-0.5">Toplam Ödenecek</p>
               <p className="text-lg font-bold text-white leading-none">
                {total.toLocaleString('tr-TR')} ₺
              </p>
            </div>
            <Link href="/odeme" className="flex-[1.5]">
              <button
                className="all-cats-gold !rounded-lg w-full font-bold py-3.5 px-4 tracking-[0.12em] uppercase flex items-center justify-center"
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
