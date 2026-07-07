import React from 'react';
import { Trash2, Minus, Plus, ShieldCheck, RefreshCcw, Truck, ChevronRight } from 'lucide-react';

export function Premium() {
  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900">
      {/* Dark Header */}
      <header className="bg-neutral-950 text-white py-6 px-4 md:px-8 flex items-center justify-between sticky top-0 z-10">
        <div className="text-2xl font-bold tracking-widest uppercase">
          SEPET<span className="text-[#4a9a42]">ZEN</span>
        </div>
        <div className="text-sm font-medium tracking-widest text-neutral-400">
          SECURE CHECKOUT
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        
        {/* Cart Items Section */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-10">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
            <h1 className="text-3xl font-light tracking-tight">Alışveriş Sepeti</h1>
            <span className="text-neutral-500 font-medium">2 Ürün</span>
          </div>

          {/* Progress Bar */}
          <div className="bg-neutral-50 border border-neutral-100 p-6 rounded-none">
            <div className="flex justify-between text-sm font-medium mb-3">
              <span className="text-neutral-600">Ücretsiz kargoya <strong className="text-neutral-900">750 ₺</strong> kaldı</span>
            </div>
            <div className="h-1 bg-neutral-200 w-full overflow-hidden rounded-full">
              <div className="h-full bg-[#2D5A27] w-[65%] rounded-full" />
            </div>
          </div>

          {/* Items */}
          <div className="flex flex-col gap-8">
            {/* Item 1 */}
            <div className="flex flex-col sm:flex-row gap-6 group">
              <div className="w-full sm:w-48 aspect-[3/4] bg-gradient-to-br from-[#1b3b17] to-[#2D5A27] flex-shrink-0" />
              <div className="flex flex-col flex-grow py-2">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="text-lg font-medium text-neutral-900 mb-1">El Yapımı Katlanır Çakı</h3>
                    <p className="text-sm text-neutral-500">Keklik Desenli</p>
                  </div>
                  <button className="text-neutral-400 hover:text-red-500 transition-colors p-1">
                    <Trash2 className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>
                
                <div className="mt-auto pt-6 flex items-end justify-between">
                  <div className="flex items-center border border-neutral-300">
                    <button className="px-4 py-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-medium">1</span>
                    <button className="px-4 py-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xl font-medium">2.000 ₺</div>
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-neutral-100" />

            {/* Item 2 */}
            <div className="flex flex-col sm:flex-row gap-6 group">
              <div className="w-full sm:w-48 aspect-[3/4] bg-gradient-to-br from-[#1b3b17] to-[#2D5A27] flex-shrink-0" />
              <div className="flex flex-col flex-grow py-2">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="text-lg font-medium text-neutral-900 mb-1">Outdoor Kamp Bıçağı</h3>
                    <p className="text-sm text-neutral-500">Paslanmaz Çelik</p>
                  </div>
                  <button className="text-neutral-400 hover:text-red-500 transition-colors p-1">
                    <Trash2 className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>
                
                <div className="mt-auto pt-6 flex items-end justify-between">
                  <div className="flex items-center border border-neutral-300">
                    <button className="px-4 py-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-medium">1</span>
                    <button className="px-4 py-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xl font-medium">1.500 ₺</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button className="flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors group w-fit">
              <ChevronRight className="w-4 h-4 mr-2 rotate-180 group-hover:-translate-x-1 transition-transform" />
              Alışverişe devam et
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-[#1b2b1a] text-white p-8 sticky top-32 flex flex-col gap-8 shadow-2xl">
            <h2 className="text-2xl font-light tracking-tight border-b border-white/20 pb-4">Sipariş Özeti</h2>
            
            <div className="flex flex-col gap-4 text-sm font-light">
              <div className="flex justify-between">
                <span className="text-white/70">Ara Toplam</span>
                <span>3.500 ₺</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Kargo</span>
                <span>49,90 ₺</span>
              </div>
            </div>

            <div className="border-t border-white/20 pt-4 flex justify-between items-end">
              <span className="text-base font-medium">Toplam</span>
              <span className="text-3xl font-light">3.549,90 ₺</span>
            </div>

            <div className="flex flex-col gap-3">
              <button className="w-full bg-[#4a9a42] hover:bg-[#3d8336] text-white py-4 px-6 text-sm font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2">
                Ödemeye Geç
              </button>
              <div className="text-center text-xs text-white/50 font-light flex items-center justify-center gap-1">
                <RefreshCcw className="w-3 h-3" />
                Havale/EFT ile ödemelerde <strong>%3 indirim</strong> fırsatı
              </div>
            </div>

            {/* Trust Badges */}
            <div className="pt-6 border-t border-white/10 grid grid-cols-1 gap-4">
              <div className="flex items-center gap-3 text-white/70 text-sm">
                <ShieldCheck className="w-5 h-5 text-[#4a9a42]" strokeWidth={1.5} />
                <span>256-bit SSL Güvenli Ödeme</span>
              </div>
              <div className="flex items-center gap-3 text-white/70 text-sm">
                <RefreshCcw className="w-5 h-5 text-[#4a9a42]" strokeWidth={1.5} />
                <span>14 Gün Koşulsuz İade</span>
              </div>
              <div className="flex items-center gap-3 text-white/70 text-sm">
                <Truck className="w-5 h-5 text-[#4a9a42]" strokeWidth={1.5} />
                <span>Aynı Gün Hızlı Teslimat</span>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
