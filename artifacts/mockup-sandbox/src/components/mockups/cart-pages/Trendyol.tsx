import React, { useState } from 'react';
import { Trash2, Minus, Plus, ShieldCheck, ArrowLeft, Truck, RefreshCcw } from 'lucide-react';

export function Trendyol() {
  const [items, setItems] = useState([
    {
      id: 1,
      name: 'El Yapımı Katlanır Çakı – Keklik Desenli',
      seller: 'Sepetzen',
      price: 2000,
      quantity: 1,
      imageGradient: 'from-stone-700 to-stone-500'
    },
    {
      id: 2,
      name: 'Outdoor Kamp Bıçağı – Paslanmaz Çelik',
      seller: 'Sepetzen',
      price: 1500,
      quantity: 1,
      imageGradient: 'from-green-800 to-stone-700'
    }
  ]);

  const updateQuantity = (id: number, delta: number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingThreshold = 4000;
  const shippingCost = subtotal > shippingThreshold || items.length === 0 ? 0 : 200;
  const remainingForFreeShipping = Math.max(0, shippingThreshold - subtotal);
  const total = subtotal + shippingCost;
  const discountTotal = total * 0.97; // 3% EFT discount

  const progressPercentage = Math.min(100, (subtotal / shippingThreshold) * 100);

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="text-2xl font-black tracking-tighter text-gray-900 flex items-center gap-1">
            SEPET<span className="text-[#2D5A27]">ZEN</span>
          </div>
          <div className="text-sm text-gray-500 font-medium">Güvenli Alışveriş</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-gray-600 mb-6 cursor-pointer hover:text-gray-900 transition-colors inline-flex">
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">Alışverişe Devam Et</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Sepetim ({items.length} Ürün)</h1>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Cart Items Area */}
          <div className="flex-1 space-y-4">
            
            {/* Free Shipping Progress */}
            {items.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-green-100 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center shrink-0">
                  <Truck size={20} className="text-[#2D5A27]" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-gray-700">Kargo Bedava</span>
                    {remainingForFreeShipping > 0 ? (
                      <span className="text-[#2D5A27] font-semibold">{remainingForFreeShipping.toLocaleString('tr-TR')} TL kaldı</span>
                    ) : (
                      <span className="text-[#2D5A27] font-semibold">Tebrikler, kargo bedava!</span>
                    )}
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#4a9a42] transition-all duration-500 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Items List */}
            {items.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-gray-50 border-b border-gray-200 p-3 px-5 text-sm text-gray-600 flex items-center">
                  Satıcı: <span className="font-semibold text-gray-900 ml-1">Sepetzen</span>
                  <span className="ml-2 bg-[#2D5A27] text-white text-[10px] px-1.5 py-0.5 rounded font-bold">Resmi Satıcı</span>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {items.map(item => (
                    <div key={item.id} className="p-5 flex gap-4 sm:gap-6 relative group">
                      {/* Product Image Placeholder */}
                      <div className={`w-20 h-24 sm:w-24 sm:h-28 rounded-md bg-gradient-to-br ${item.imageGradient} shrink-0 shadow-inner flex items-center justify-center`}>
                         <div className="text-white/30 text-xs font-bold rotate-[-45deg] tracking-widest">ZEN</div>
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="pr-8">
                          <h3 className="font-medium text-gray-900 line-clamp-2 text-sm sm:text-base leading-snug hover:underline cursor-pointer">
                            {item.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">Tahmini Teslimat: 2-4 Gün</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between mt-4 gap-4">
                          {/* Quantity Controls */}
                          <div className="flex items-center border border-gray-300 rounded-md bg-white w-fit">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-[#2D5A27] transition-colors rounded-l-md disabled:opacity-50"
                              disabled={item.quantity <= 1}
                            >
                              <Minus size={14} />
                            </button>
                            <div className="w-10 h-8 flex items-center justify-center text-sm font-semibold text-gray-700">
                              {item.quantity}
                            </div>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-[#2D5A27] transition-colors rounded-r-md"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-lg sm:text-xl font-bold text-[#2D5A27]">
                              {(item.price * item.quantity).toLocaleString('tr-TR')} ₺
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{item.price.toLocaleString('tr-TR')} ₺ / adet</div>
                          </div>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Sil"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="text-gray-400">
                    <Trash2 size={32} />
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Sepetiniz şu an boş</h2>
                <p className="text-gray-500 mb-6">Sepetinizi indirimli ürünlerle doldurmak için alışverişe başlayın.</p>
                <button className="bg-[#2D5A27] hover:bg-[#20401c] text-white px-6 py-3 rounded-md font-bold transition-colors">
                  Alışverişe Başla
                </button>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          {items.length > 0 && (
            <div className="w-full lg:w-[340px] shrink-0">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 sticky top-24">
                <h2 className="text-lg font-bold text-gray-900 mb-4 pb-4 border-b border-gray-100">Sipariş Özeti</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Ara Toplam</span>
                    <span className="font-medium text-gray-900">{subtotal.toLocaleString('tr-TR')} ₺</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Kargo Tutarı</span>
                    <span className="font-medium text-gray-900">{shippingCost === 0 ? 'Bedava' : `${shippingCost.toLocaleString('tr-TR')} ₺`}</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mb-6">
                  <div className="flex justify-between items-end mb-1">
                    <span className="font-bold text-gray-900">Toplam</span>
                    <span className="text-2xl font-black text-[#2D5A27]">{total.toLocaleString('tr-TR')} ₺</span>
                  </div>
                </div>

                <button className="w-full bg-[#f27a1a] hover:bg-[#e06912] text-white py-3.5 rounded-md font-bold text-lg shadow-md hover:shadow-lg transition-all mb-3 flex items-center justify-center gap-2">
                  ÖDEMEYE GEÇ
                </button>
                
                <div className="bg-green-50 border border-green-100 rounded p-3 text-center mb-6">
                  <p className="text-xs text-green-800 font-medium">Havale / EFT ile ödemede %3 İndirim!</p>
                  <p className="text-sm font-bold text-[#2D5A27] mt-1">{discountTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</p>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-gray-600">
                    <ShieldCheck size={20} className="text-[#4a9a42]" />
                    <span className="text-xs font-medium">Güvenli Ödeme - 256bit SSL</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <RefreshCcw size={20} className="text-[#4a9a42]" />
                    <span className="text-xs font-medium">14 Gün İçinde Kolay İade</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Truck size={20} className="text-[#4a9a42]" />
                    <span className="text-xs font-medium">Aynı Gün Hızlı Teslimat</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
