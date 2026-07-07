import React, { useState } from "react";
import { 
  ArrowLeft, 
  Trash2, 
  Minus, 
  Plus, 
  ChevronDown, 
  ChevronUp,
  ShieldCheck,
  CreditCard,
  Truck,
  RotateCcw,
  Info
} from "lucide-react";

export function Mobile() {
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 font-sans max-w-sm mx-auto flex flex-col relative pb-32 overflow-x-hidden shadow-xl border-x border-gray-200">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
        <button className="p-1 -ml-1 text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">SEPETİM <span className="text-gray-500 font-normal text-sm ml-1">(2 ürün)</span></h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Free Shipping Progress */}
        <div className="bg-white p-4 mb-2">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1.5 text-[#2D5A27] text-sm font-medium">
              <Truck size={16} />
              <span>Ücretsiz Kargo</span>
            </div>
            <span className="text-xs text-gray-500 font-medium">750 TL kaldı</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#4a9a42] rounded-full" style={{ width: "65%" }}></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Sepetinize <strong>750 TL</strong>'lik ürün daha ekleyin, kargo bedava olsun.</p>
        </div>

        {/* Cart Items */}
        <div className="bg-white mb-2">
          {/* Item 1 */}
          <div className="p-4 border-b border-gray-100 flex gap-3 relative">
            <div className="w-20 h-20 bg-[#2D5A27]/10 rounded-lg flex-shrink-0 border border-[#2D5A27]/20 flex items-center justify-center">
              <span className="text-[#2D5A27] font-bold text-xs opacity-50">GÖRSEL</span>
            </div>
            <div className="flex-1 flex flex-col">
              <div className="pr-6">
                <h3 className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">El Yapımı Katlanır Çakı – Keklik Desenli</h3>
                <p className="text-xs text-gray-500 mt-1">Stokta var</p>
              </div>
              <div className="mt-auto flex items-end justify-between pt-3">
                <span className="font-bold text-[#2D5A27] text-base">2.000 ₺</span>
                <div className="flex items-center border border-gray-200 rounded-md bg-white">
                  <button className="w-8 h-8 flex items-center justify-center text-gray-600 active:bg-gray-100 rounded-l-md">
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm font-medium text-gray-900">1</span>
                  <button className="w-8 h-8 flex items-center justify-center text-[#2D5A27] active:bg-[#2D5A27]/10 rounded-r-md">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors p-1">
              <Trash2 size={16} />
            </button>
          </div>

          {/* Item 2 */}
          <div className="p-4 flex gap-3 relative">
            <div className="w-20 h-20 bg-[#2D5A27]/10 rounded-lg flex-shrink-0 border border-[#2D5A27]/20 flex items-center justify-center">
              <span className="text-[#2D5A27] font-bold text-xs opacity-50">GÖRSEL</span>
            </div>
            <div className="flex-1 flex flex-col">
              <div className="pr-6">
                <h3 className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">Outdoor Kamp Bıçağı – Paslanmaz Çelik</h3>
                <p className="text-xs text-gray-500 mt-1">Son 2 ürün!</p>
              </div>
              <div className="mt-auto flex items-end justify-between pt-3">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 line-through">1.750 ₺</span>
                  <span className="font-bold text-[#2D5A27] text-base">1.500 ₺</span>
                </div>
                <div className="flex items-center border border-gray-200 rounded-md bg-white">
                  <button className="w-8 h-8 flex items-center justify-center text-gray-600 active:bg-gray-100 rounded-l-md">
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm font-medium text-gray-900">1</span>
                  <button className="w-8 h-8 flex items-center justify-center text-[#2D5A27] active:bg-[#2D5A27]/10 rounded-r-md">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors p-1">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 text-blue-800 p-3 mx-4 mb-4 rounded-lg flex items-start gap-2 text-sm border border-blue-100">
          <Info size={18} className="flex-shrink-0 mt-0.5 text-blue-600" />
          <p><strong>Havale/EFT ile ödemelerde %3 indirim!</strong> Ödeme adımında seçebilirsiniz.</p>
        </div>

        {/* Trust Badges */}
        <div className="mb-6 overflow-x-auto pb-2 hide-scrollbar">
          <div className="flex gap-3 px-4 w-max">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-100">
              <ShieldCheck size={20} className="text-[#2D5A27]" />
              <span className="text-xs font-medium text-gray-700">Güvenli Alışveriş</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-100">
              <CreditCard size={20} className="text-[#2D5A27]" />
              <span className="text-xs font-medium text-gray-700">Taksit İmkanı</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-100">
              <RotateCcw size={20} className="text-[#2D5A27]" />
              <span className="text-xs font-medium text-gray-700">14 Gün İade</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-30">
        {/* Accordion Summary */}
        <div className="border-b border-gray-100">
          <button 
            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
            className="w-full px-4 py-3 flex justify-between items-center text-sm font-medium text-gray-700 active:bg-gray-50 transition-colors"
          >
            <span>Sipariş Özeti</span>
            <div className="flex items-center gap-1 text-[#2D5A27]">
              <span>3.500 ₺</span>
              {isSummaryExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </div>
          </button>
          
          {isSummaryExpanded && (
            <div className="px-4 pb-4 space-y-2 text-sm bg-gray-50/50 pt-2 border-t border-gray-100">
              <div className="flex justify-between text-gray-600">
                <span>Ara Toplam</span>
                <span>3.750 ₺</span>
              </div>
              <div className="flex justify-between text-[#2D5A27]">
                <span>İndirimler</span>
                <span>-250 ₺</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Kargo Bedeli</span>
                <span>49.90 ₺</span>
              </div>
              <div className="flex justify-between text-[#2D5A27] font-medium pt-2 border-t border-gray-200 mt-2">
                <span>Toplam</span>
                <span className="font-bold text-lg">3.549,90 ₺</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Area */}
        <div className="p-4 flex gap-3 items-center bg-white">
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-0.5">Toplam Ödenecek</p>
            <p className="text-lg font-bold text-[#2D5A27] leading-none">3.549,90 ₺</p>
          </div>
          <button className="flex-[1.5] bg-[#2D5A27] hover:bg-[#1a3817] active:bg-[#11240e] text-white font-bold py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md">
            <span>ÖDEMEYE GEÇ</span>
            <ArrowLeft size={18} className="rotate-180" />
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
