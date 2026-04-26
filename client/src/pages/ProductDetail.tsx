import { useState, useRef, useEffect, useCallback } from 'react';
import { getOriginalPrice } from '@/lib/discountPrice';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { ShippingCountdown } from '@/components/ShippingCountdown';
import { Link, useParams } from 'wouter';
import { 
  ChevronRight, 
  Heart, 
  Truck, 
  RotateCcw, 
  Minus, 
  Plus,
  X,
  Loader2,
  Shield,
  Package,
  Check,
  Ruler,
  Share2,
  ChevronLeft,
  Copy,
  Star,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import { useProduct, useProducts, useCategories } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { trackViewContent, trackAddToCart } from '@/lib/metaPixel';
import { useCartModal } from '@/hooks/useCartModal';
import { useToast } from '@/hooks/use-toast';
import { ProductCard } from '@/components/ProductCard';
import { useProductReviews, useProductRating, useUserReview, useCreateReview } from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';
import { useFavoriteIds, useToggleFavorite } from '@/hooks/useFavorites';

const FREE_SHIPPING_THRESHOLD = 2500;

function StarRating({ rating, size = 16, interactive = false, onChange }: { rating: number; size?: number; interactive?: boolean; onChange?: (rating: number) => void }) {
  const [hover, setHover] = useState(0);
  
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            style={{ width: size, height: size }}
            className={`${
              star <= (hover || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-black/20'
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ProductDetail() {
  const params = useParams<{ slug: string }>();
  const { data: product, isLoading: productLoading } = useProduct(params.slug || '');
  const { data: allProducts = [] } = useProducts({});
  const { data: categories = [] } = useCategories();
  const { addToCart } = useCart();
  const { showModal } = useCartModal();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: reviews = [] } = useProductReviews(product?.id || '');
  const { data: ratingData } = useProductRating(product?.id || '');
  const { data: userReview } = useUserReview(product?.id || '');
  const createReviewMutation = useCreateReview();
  
  const { data: favoriteIds = [] } = useFavoriteIds();
  const { toggleFavorite, isLoading: isFavoriteLoading } = useToggleFavorite();
  const isLiked = product ? favoriteIds.includes(product.id) : false;

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  
  const [sizeChart, setSizeChart] = useState<{ columns: string[]; rows: string[][] } | null>(null);

  const imageRef = useRef<HTMLDivElement>(null);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, dragFree: false });
  const [lightboxEmblaRef, lightboxEmblaApi] = useEmblaCarousel({ loop: true, dragFree: false });

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedImage(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (emblaApi && emblaApi.selectedScrollSnap() !== selectedImage) {
      emblaApi.scrollTo(selectedImage);
    }
  }, [selectedImage, emblaApi]);

  useEffect(() => {
    if (lightboxEmblaApi && lightboxOpen) {
      lightboxEmblaApi.scrollTo(selectedImage, true);
    }
  }, [lightboxOpen, selectedImage, lightboxEmblaApi]);

  const onLightboxSelect = useCallback(() => {
    if (!lightboxEmblaApi) return;
    setSelectedImage(lightboxEmblaApi.selectedScrollSnap());
  }, [lightboxEmblaApi]);

  useEffect(() => {
    if (!lightboxEmblaApi) return;
    lightboxEmblaApi.on('select', onLightboxSelect);
    return () => { lightboxEmblaApi.off('select', onLightboxSelect); };
  }, [lightboxEmblaApi, onLightboxSelect]);

  useEffect(() => {
    if (product) {
      const category = categories.find(c => c.id === product.categoryId);
      trackViewContent({
        contentId: product.id,
        contentName: product.name,
        contentCategory: category?.name,
        value: parseFloat(product.basePrice || '0'),
        userData: user ? {
          email: user.email,
          phone: user.phone || undefined,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          city: user.city || undefined,
          state: user.district || undefined,
          zip: user.postalCode || undefined,
          country: user.country || undefined,
          externalId: user.id,
        } : undefined,
      });
    }
  }, [product?.id]);

  useEffect(() => {
    const fetchSizeChart = async () => {
      if (!product?.categoryId) {
        setSizeChart(null);
        return;
      }
      try {
        const response = await fetch(`/api/size-charts/category/${product.categoryId}`);
        if (response.ok) {
          const data = await response.json();
          setSizeChart(data);
        } else {
          setSizeChart(null);
        }
      } catch (error) {
        console.error('Error fetching size chart:', error);
        setSizeChart(null);
      }
    };
    fetchSizeChart();
  }, [product?.id, product?.categoryId]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    const sizes = product.availableSizes?.length > 0 ? product.availableSizes : [];
    
    if (sizes.length > 0 && !selectedSize) {
      toast({ title: 'Uyarı', description: 'Lütfen bir ölçü seçiniz.', variant: 'destructive' });
      return;
    }
    
    setIsAdding(true);
    try {
      const variant = selectedSize ? product.variants?.find(v => v.size === selectedSize) : undefined;
      await addToCart(product.id, variant?.id, quantity);
      const category = categories.find(c => c.id === product.categoryId);
      trackAddToCart({
        contentId: product.id,
        contentName: product.name,
        contentCategory: category?.name,
        value: parseFloat(product.basePrice || '0') * quantity,
        quantity,
        userData: user ? {
          email: user.email,
          phone: user.phone || undefined,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          city: user.city || undefined,
          state: user.district || undefined,
          zip: user.postalCode || undefined,
          country: user.country || undefined,
          externalId: user.id,
        } : undefined,
      });
      const mainImage = product.images?.length > 0 
        ? product.images[0] 
        : 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=800&fit=crop';
      showModal({
        name: product.name,
        image: mainImage,
        price: parseFloat(product.basePrice || '0') * quantity,
        size: selectedSize || undefined,
        quantity: quantity,
      });
    } catch (error) {
      toast({ title: 'Hata', description: 'Sepete eklenemedi.', variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    
    try {
      await createReviewMutation.mutateAsync({
        productId: product.id,
        rating: reviewRating,
        title: reviewTitle || undefined,
        content: reviewContent || undefined,
      });
      toast({ title: 'Başarılı', description: 'Değerlendirmeniz gönderildi.' });
      setReviewTitle('');
      setReviewContent('');
      setReviewRating(5);
    } catch (error: any) {
      toast({ title: 'Hata', description: error.message || 'Değerlendirme gönderilemedi.', variant: 'destructive' });
    }
  };

  const sizes = (product?.availableSizes && product.availableSizes.length > 0)
    ? product.availableSizes 
    : (product?.variants ? Array.from(new Set(product.variants.map(v => v.size).filter((s): s is string => Boolean(s)))) : []);

  const colors = (product?.availableColors && product.availableColors.length > 0)
    ? product.availableColors 
    : [];

  const totalStock = product?.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) ?? 0;
  const isCompletelyOutOfStock = product?.variants && product.variants.length > 0 && totalStock === 0;

  const category = product ? categories.find(c => c.id === product.categoryId) : null;

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = product ? `${product.name} - Polen Stone` : 'Polen Stone';

  const socialLinks = [
    {
      name: 'WhatsApp',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
      url: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
      color: 'text-black hover:bg-black/5 hover:text-polen-orange',
    },
    {
      name: 'X (Twitter)',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      color: 'text-black hover:bg-black/5 hover:text-polen-orange',
    },
    {
      name: 'Facebook',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      color: 'text-black hover:bg-black/5 hover:text-polen-orange',
    },
  ];

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: 'Bağlantı kopyalandı!' });
    setShowShareMenu(false);
  };

  if (productLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="pt-24 pb-20 px-6">
          <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Loader2 className="w-10 h-10 text-black/25" />
            </motion.div>
            <p className="mt-4 text-sm text-black/40">Ürün yükleniyor...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="pt-24 pb-20 px-6">
          <div className="max-w-7xl mx-auto text-center min-h-[60vh] flex flex-col items-center justify-center">
            <div className="w-24 h-24 border border-black/8 flex items-center justify-center mb-6">
              <Package className="w-12 h-12 text-black/20" />
            </div>
            <h1 className="font-display text-3xl mb-4 text-black">Ürün Bulunamadı</h1>
            <p className="text-black/40 mb-8">Aradığınız ürün mevcut değil veya kaldırılmış olabilir.</p>
            <Link href="/">
              <motion.span whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-semibold hover:bg-polen-orange transition-colors text-xs tracking-[0.18em] uppercase">
                Ana Sayfaya Dön
              </motion.span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const images = product.images?.length > 0 
    ? product.images 
    : ['https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=800&fit=crop'];

  const price = parseFloat(product.basePrice || '0');
  const originalPrice = getOriginalPrice(price, product.discountBadge);
  const relatedProducts = allProducts
    .filter(p => p.id !== product.id && p.categoryId === product.categoryId)
    .slice(0, 4);
  const moreProducts = relatedProducts.length < 4 
    ? [...relatedProducts, ...allProducts.filter(p => p.id !== product.id && p.categoryId !== product.categoryId).slice(0, 4 - relatedProducts.length)]
    : relatedProducts;

  const categoryName = categories.find(c => c.id === product.categoryId)?.name || 'Ürünler';
  const categorySlug = categories.find(c => c.id === product.categoryId)?.slug || '';

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <SEO 
        title={product.name}
        description={product.description || `${product.name} - Polen Stone premium doğal taş ve mermer`}
        image={images[0]}
        url={`/urun/${product.slug}`}
        type="product"
        product={{
          name: product.name,
          price: price,
          currency: 'TRY',
          availability: 'InStock',
          sku: product.sku || undefined,
          brand: 'Polen Stone',
          category: categoryName,
          images: images
        }}
        breadcrumbs={[
          { name: 'Ana Sayfa', url: '/' },
          { name: categoryName, url: `/kategori/${categorySlug}` },
          { name: product.name, url: `/urun/${product.slug}` }
        ]}
      />
      <Header />

      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <button className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors z-20" onClick={() => setLightboxOpen(false)}>
              <X className="w-6 h-6" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setSelectedImage(prev => prev === 0 ? images.length - 1 : prev - 1); }} className="absolute left-4 sm:left-6 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors z-20 hidden sm:flex">
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="hidden sm:block">
              <motion.img key={selectedImage} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', damping: 25 }} src={images[selectedImage]} alt={product.name} className="max-w-[90vw] max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
            </div>
            <div className="sm:hidden w-full h-full flex items-center" onClick={(e) => e.stopPropagation()}>
              <div className="w-full overflow-hidden" ref={lightboxEmblaRef}>
                <div className="flex">
                  {images.map((image, index) => (
                    <div key={index} className="flex-[0_0_100%] min-w-0 flex items-center justify-center px-4">
                      <img src={image} alt={product.name} className="max-w-full max-h-[80vh] object-contain" draggable={false} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setSelectedImage(prev => prev === images.length - 1 ? 0 : prev + 1); }} className="absolute right-4 sm:right-6 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors z-20 hidden sm:flex">
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {images.map((_, idx) => (
                <button key={idx} onClick={(e) => { e.stopPropagation(); setSelectedImage(idx); }} className={`w-2 h-2 rounded-full transition-all ${idx === selectedImage ? 'bg-white w-6' : 'bg-white/30'}`} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSizeGuide && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6" 
            onClick={() => setShowSizeGuide(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 10 }} 
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-none w-full max-w-3xl max-h-[90vh] overflow-hidden border border-black/10 shadow-2xl" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-black/8 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 border border-black/10 flex items-center justify-center">
                      <Ruler className="w-5 h-5 sm:w-6 sm:h-6 text-black/50" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg sm:text-xl text-black">Ölçü Rehberi</h3>
                      <p className="text-xs sm:text-sm text-black/40">Doğru ölçüyü seçmenize yardımcı olur</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowSizeGuide(false)} 
                    className="p-2 sm:p-2.5 hover:bg-black/5 transition-colors"
                  >
                    <X className="w-5 h-5 text-black" />
                  </button>
                </div>
              </div>
              
              <div className="p-4 sm:p-6 overflow-auto max-h-[calc(90vh-100px)]">
                {sizeChart ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto border border-black/8">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-stone-50">
                            {sizeChart.columns.map((col, i) => (
                              <th 
                                key={i} 
                                className={`${i === 0 ? 'text-left' : 'text-center'} py-3 sm:py-4 px-3 sm:px-5 font-semibold text-black text-xs sm:text-sm uppercase tracking-wide whitespace-nowrap`}
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sizeChart.rows.map((row, ri) => (
                            <tr 
                              key={ri} 
                              className={`border-t border-black/6 ${ri % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'} hover:bg-amber-50/60 transition-colors`}
                            >
                              {row.map((cell, ci) => (
                                <td 
                                  key={ci} 
                                  className={`py-3 sm:py-4 px-3 sm:px-5 ${
                                    ci === 0 
                                      ? 'font-bold text-black text-sm sm:text-base' 
                                      : 'text-center text-black/60 text-xs sm:text-sm'
                                  } whitespace-nowrap`}
                                >
                                  {cell || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 sm:p-4 bg-stone-50 border border-black/8">
                      <div className="w-8 h-8 border border-black/8 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-black/40" />
                      </div>
                      <div className="text-xs sm:text-sm text-black/50">
                        <p className="font-medium text-black mb-1">Ölçü Alma İpucu</p>
                        <p>En doğru sonuç için, mekânın yerleştirme alanını dikkatli ölçün ve tablodaki standart ebatlarla karşılaştırın. İki ölçü arasında kalırsanız, daha uyumlu bir görünüm için bir üst ebadı tercih edebilirsiniz.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 border border-black/8 flex items-center justify-center">
                      <Ruler className="w-8 h-8 text-black/20" />
                    </div>
                    <h4 className="text-lg font-medium text-black mb-2">Ölçü Tablosu Bulunamadı</h4>
                    <p className="text-sm text-black/40 max-w-sm mx-auto">Bu kategori için henüz ölçü tablosu eklenmemiş. Lütfen ürün açıklamasındaki ölçü bilgilerini kontrol edin.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-16 lg:pt-8 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.nav initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-xs text-black/40 mb-6">
            <Link href="/" className="hover:text-black transition-colors">Ana Sayfa</Link>
            <ChevronRight className="w-3 h-3" />
            {category && (
              <>
                <Link href={`/kategori/${category.slug}`} className="hover:text-black transition-colors">{category.name}</Link>
                <ChevronRight className="w-3 h-3" />
              </>
            )}
            <span className="text-black truncate max-w-[300px] uppercase">{product.name}</span>
          </motion.nav>

          <div className="grid lg:grid-cols-2 gap-6 lg:gap-16 lg:items-stretch">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex gap-3 sm:gap-4 w-full lg:h-full">
              <div className="hidden sm:flex flex-col gap-2 w-20 shrink-0 lg:h-full">
                {images.length > 5 && selectedImage > 0 && (
                  <button
                    onClick={() => setSelectedImage(prev => Math.max(0, prev - 1))}
                    className="w-full h-8 flex items-center justify-center bg-black/5 hover:bg-black/10 transition-colors flex-shrink-0"
                    data-testid="button-thumbnail-prev"
                  >
                    <ChevronLeft className="w-4 h-4 rotate-90" />
                  </button>
                )}
                <div className="flex flex-col gap-2 lg:flex-1 lg:min-h-0">
                  {images.length <= 5 ? (
                    images.map((image, index) => (
                      <motion.button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative overflow-hidden transition-all aspect-[3/4] lg:aspect-auto lg:flex-1 lg:min-h-0 ${
                          index === selectedImage ? 'ring-2 ring-black' : 'opacity-40 hover:opacity-100'
                        }`}
                        data-testid={`button-thumbnail-${index}`}
                      >
                        <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </motion.button>
                    ))
                  ) : (
                    images.slice(
                      Math.max(0, Math.min(selectedImage - 2, images.length - 5)),
                      Math.max(0, Math.min(selectedImage - 2, images.length - 5)) + 5
                    ).map((image, idx) => {
                      const actualIndex = Math.max(0, Math.min(selectedImage - 2, images.length - 5)) + idx;
                      return (
                        <motion.button
                          key={actualIndex}
                          onClick={() => setSelectedImage(actualIndex)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`relative overflow-hidden transition-all aspect-[3/4] lg:aspect-auto lg:flex-1 lg:min-h-0 ${
                            actualIndex === selectedImage ? 'ring-2 ring-black' : 'opacity-40 hover:opacity-100'
                          }`}
                          data-testid={`button-thumbnail-${actualIndex}`}
                        >
                          <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </motion.button>
                      );
                    })
                  )}
                </div>
                {images.length > 5 && selectedImage < images.length - 1 && (
                  <button
                    onClick={() => setSelectedImage(prev => Math.min(images.length - 1, prev + 1))}
                    className="w-full h-8 flex items-center justify-center bg-black/5 hover:bg-black/10 transition-colors flex-shrink-0"
                    data-testid="button-thumbnail-next"
                  >
                    <ChevronLeft className="w-4 h-4 -rotate-90" />
                  </button>
                )}
              </div>

              <div className="flex-1 min-w-0 flex flex-col lg:h-full">
                <div className="relative flex-1 flex flex-col">
                  <div className="absolute -inset-[1px] rounded-xl pointer-events-none overflow-hidden z-10">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 133" preserveAspectRatio="none">
                      <rect
                        x="0.5"
                        y="0.5"
                        width="99"
                        height="132"
                        rx="6"
                        fill="none"
                        stroke="black"
                        strokeWidth="1"
                        strokeOpacity="0.1"
                        className="animate-border-dash"
                      />
                    </svg>
                  </div>
                  <div className="hidden sm:flex sm:flex-col flex-1">
                    <motion.div 
                      ref={imageRef}
                      className="relative aspect-[3/4] lg:aspect-auto flex-1 lg:min-h-[560px] bg-stone-100 overflow-hidden cursor-zoom-in group w-full"
                      onMouseEnter={() => setIsZooming(true)}
                      onMouseLeave={() => setIsZooming(false)}
                      onMouseMove={handleMouseMove}
                      onClick={() => setLightboxOpen(true)}
                    >
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={selectedImage}
                          initial={{ opacity: 0 }}
                          animate={{ 
                            opacity: 1,
                            scale: isZooming ? 2 : 1,
                            x: isZooming ? (50 - mousePosition.x) * 4 : 0,
                            y: isZooming ? (50 - mousePosition.y) * 4 : 0,
                          }}
                          exit={{ opacity: 0 }}
                          className="w-full h-full"
                        >
                          <img src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover" draggable={false} />
                        </motion.div>
                      </AnimatePresence>
                      {product.discountBadge && (
                        <div className="absolute top-4 left-4 z-20">
                          <div className="bg-black text-white text-sm font-bold px-3 py-1.5">
                            {product.discountBadge}
                          </div>
                        </div>
                      )}
                      {product.isNew && !product.discountBadge && (
                        <span className="absolute top-4 left-4 bg-black text-white text-[10px] font-bold tracking-[0.15em] px-2.5 py-1 z-20 uppercase">Yeni</span>
                      )}
                    </motion.div>
                  </div>
                  <div className="sm:hidden">
                    <div className="relative aspect-[3/4] bg-stone-100 overflow-hidden w-full" ref={emblaRef}>
                      <div className="flex h-full">
                        {images.map((image, index) => (
                          <div 
                            key={index} 
                            className="flex-[0_0_100%] min-w-0 h-full"
                            onClick={() => setLightboxOpen(true)}
                          >
                            <img src={image} alt={product.name} className="w-full h-full object-cover" draggable={false} />
                          </div>
                        ))}
                      </div>
                      {product.discountBadge && (
                        <div className="absolute top-4 left-4 z-20">
                          <div className="bg-black text-white text-sm font-bold px-3 py-1.5">
                            {product.discountBadge}
                          </div>
                        </div>
                      )}
                      {product.isNew && !product.discountBadge && (
                        <span className="absolute top-4 left-4 bg-black text-white text-[10px] font-bold tracking-[0.15em] px-2.5 py-1 z-20 uppercase">Yeni</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="sm:hidden mt-4">
                  {images.length <= 5 ? (
                    <div className="flex gap-2 justify-center">
                      {images.map((image, index) => (
                        <button 
                          key={index} 
                          onClick={() => setSelectedImage(index)} 
                          className={`shrink-0 w-14 aspect-[3/4] overflow-hidden transition-all ${
                            index === selectedImage ? 'ring-2 ring-black ring-offset-2 ring-offset-white' : 'opacity-40'
                          }`}
                        >
                          <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="flex gap-2 justify-center">
                        {images.slice(
                          Math.max(0, Math.min(selectedImage - 2, images.length - 5)),
                          Math.max(0, Math.min(selectedImage - 2, images.length - 5)) + 5
                        ).map((image, idx) => {
                          const actualIndex = Math.max(0, Math.min(selectedImage - 2, images.length - 5)) + idx;
                          return (
                            <button 
                              key={actualIndex} 
                              onClick={() => setSelectedImage(actualIndex)} 
                              className={`shrink-0 w-14 aspect-[3/4] overflow-hidden transition-all ${
                                actualIndex === selectedImage ? 'ring-2 ring-black ring-offset-2 ring-offset-white' : 'opacity-40'
                              }`}
                            >
                              <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" />
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex justify-center gap-1 mt-3">
                        {images.map((_, idx) => (
                          <button 
                            key={idx}
                            onClick={() => setSelectedImage(idx)}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                              idx === selectedImage ? 'bg-black w-4' : 'bg-black/20'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="lg:pt-4">
              {(category || product.sku) && (
                <div className="flex items-center gap-2 mb-3">
                  {category && (
                    <p className="text-[10px] text-black/40 uppercase tracking-[0.25em]">{category.name}</p>
                  )}
                  {category && product.sku && <span className="text-black/20 text-[10px]">·</span>}
                  {product.sku && (
                    <span className="text-[10px] text-black/35 tracking-[0.12em] font-mono uppercase" data-testid="text-sku-header">
                      <span className="text-black/25 not-italic">Stok Kodu:</span> {product.sku}
                    </span>
                  )}
                </div>
              )}
              
              <h1 className="font-display text-2xl sm:text-3xl tracking-wide uppercase mb-4 text-black leading-tight" data-testid="text-product-name">
                {product.name}
              </h1>
              
              <div className="flex items-baseline gap-3 mb-6">
                {originalPrice && (
                  <span className="text-base text-black/35 line-through" data-testid="text-original-price">
                    {originalPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                  </span>
                )}
                <span className="text-2xl font-bold text-black" data-testid="text-price">
                  {price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                </span>
              </div>

              {product.description && (
                <div className="mb-6">
                  <div className={`relative ${!showFullDesc ? 'max-h-[336px] overflow-hidden' : ''}`}>
                    <div
                      className="text-sm text-black/55 leading-relaxed prose prose-sm max-w-none [&_p]:mb-3 [&_ul]:my-3 [&_li]:mb-1 [&_strong]:text-black [&_h3]:text-black [&_h4]:text-black"
                      dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                    {!showFullDesc && (
                      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                    )}
                  </div>
                  <button
                    onClick={() => setShowFullDesc(v => !v)}
                    className="mt-2 text-[11px] font-semibold text-black/40 hover:text-black uppercase tracking-[0.15em] transition-colors flex items-center gap-1.5"
                  >
                    {showFullDesc ? 'Gizle ↑' : 'Devamını Oku ↓'}
                  </button>
                </div>
              )}

              <div className="space-y-6">
                {colors.length > 0 && (
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Renk:</span>
                    <div className="flex items-center gap-2">
                      {colors.map((color) => {
                        const isSelected = selectedColor === color.name || (!selectedColor && color.name === colors[0].name);
                        const isLight = color.hex === '#FFFFFF' || color.hex === '#D4C4A8';
                        return (
                          <motion.button
                            key={color.name}
                            onClick={() => setSelectedColor(color.name)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className={`relative w-8 h-8 rounded-full transition-all ${
                              isSelected ? 'ring-2 ring-black ring-offset-2 ring-offset-white' : 'ring-1 ring-black/20'
                            }`}
                            style={{ backgroundColor: color.hex }}
                            title={color.name}
                            data-testid={`button-color-${color.name}`}
                          >
                            {isSelected && (
                              <Check className={`w-4 h-4 absolute inset-0 m-auto ${isLight ? 'text-black' : 'text-white'}`} />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {sizes.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-medium text-black/40 uppercase tracking-[0.18em]">
                        Ölçü: <span className="text-black font-semibold">{selectedSize || ''}</span>
                      </span>
                      <button 
                        onClick={() => setShowSizeGuide(true)} 
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-black/15 text-black/50 hover:border-black hover:text-black transition-all group"
                      >
                        <Ruler className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium">Ölçü Rehberi</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map((size) => {
                        const variant = product.variants?.find(v => v.size === size);
                        const isOutOfStock = variant ? (variant.stock || 0) <= 0 : false;
                        return (
                          <motion.button
                            key={size}
                            onClick={() => !isOutOfStock && setSelectedSize(size)}
                            whileHover={!isOutOfStock ? { scale: 1.02 } : {}}
                            whileTap={!isOutOfStock ? { scale: 0.98 } : {}}
                            disabled={isOutOfStock}
                            className={`relative min-w-[52px] py-2.5 px-4 text-sm font-medium border transition-all ${
                              isOutOfStock
                                ? 'bg-transparent border-black/10 text-black/25 cursor-not-allowed'
                                : selectedSize === size
                                  ? 'bg-black text-white border-black'
                                  : 'bg-transparent border-black/20 text-black hover:border-black'
                            }`}
                            data-testid={`button-size-${size}`}
                          >
                            <span className={isOutOfStock ? 'line-through' : ''}>{size}</span>
                            {isOutOfStock && (
                              <span className="absolute -top-2 -right-2 text-[9px] bg-black/8 text-black/40 px-1.5 py-0.5">
                                Tükendi
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-black/15 shrink-0">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-black/5 transition-colors text-black" data-testid="button-decrease-quantity">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-medium text-sm text-black" data-testid="text-quantity">{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-black/5 transition-colors text-black" data-testid="button-increase-quantity">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <ShippingCountdown />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <motion.button
                    whileHover={!isCompletelyOutOfStock ? { scale: 1.01 } : {}}
                    whileTap={!isCompletelyOutOfStock ? { scale: 0.99 } : {}}
                    onClick={handleAddToCart}
                    disabled={isAdding || isCompletelyOutOfStock}
                    className={`flex-1 py-3.5 font-medium text-sm uppercase tracking-[0.15em] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                      isCompletelyOutOfStock 
                        ? 'bg-black/8 text-black/35 cursor-not-allowed' 
                        : 'bg-black hover:bg-polen-orange text-white'
                    }`}
                    data-testid="button-add-to-cart"
                  >
                    {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {isCompletelyOutOfStock ? 'TÜKENDİ' : isAdding ? 'Ekleniyor...' : 'Sepete Ekle'}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => product && !isFavoriteLoading && toggleFavorite(product.id, isLiked)}
                    disabled={isFavoriteLoading}
                    className={`w-12 h-12 border flex items-center justify-center transition-colors ${
                      isLiked ? 'bg-black border-black text-white' : 'border-black/20 hover:border-black text-black'
                    } ${isFavoriteLoading ? 'opacity-50' : ''}`}
                    data-testid="button-like"
                  >
                    {isFavoriteLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                    )}
                  </motion.button>

                  <div className="relative">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      className="w-12 h-12 border border-black/20 hover:border-black text-black flex items-center justify-center transition-colors"
                      data-testid="button-share"
                    >
                      <Share2 className="w-5 h-5" />
                    </motion.button>
                    
                    <AnimatePresence>
                      {showShareMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full right-0 mb-2 bg-white border border-black/10 p-2 min-w-[160px] shadow-xl"
                        >
                          {socialLinks.map((social) => (
                            <a key={social.name} href={social.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${social.color}`} onClick={() => setShowShareMenu(false)}>
                              {social.icon}
                              <span className="text-sm">{social.name}</span>
                            </a>
                          ))}
                          <button onClick={copyLink} className="flex items-center gap-3 px-3 py-2 w-full hover:bg-black/5 transition-colors text-black">
                            <Copy className="w-5 h-5" />
                            <span className="text-sm">Kopyala</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-black/8">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 border border-black/8 flex items-center justify-center">
                <Truck className="w-4 h-4 text-black/40" />
              </div>
              <p className="text-xs font-medium text-black">Ücretsiz Kargo</p>
              <p className="text-[10px] text-black/40">2500₺ Üzeri</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 border border-black/8 flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-black/40" />
              </div>
              <p className="text-xs font-medium text-black">Kolay İade</p>
              <p className="text-[10px] text-black/40">14 gün</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 border border-black/8 flex items-center justify-center">
                <Shield className="w-4 h-4 text-black/40" />
              </div>
              <p className="text-xs font-medium text-black">Güvenli Ödeme</p>
              <p className="text-[10px] text-black/40">SSL korumalı</p>
            </div>
          </div>

          <motion.section 
            initial={{ opacity: 0, y: 40 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }} 
            transition={{ duration: 0.6 }} 
            className="mt-16"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-3xl tracking-wide uppercase text-black">Değerlendirmeler</h2>
              {ratingData && ratingData.count > 0 && (
                <div className="flex items-center gap-2">
                  <StarRating rating={Math.round(ratingData.average)} size={18} />
                  <span className="text-sm text-black/40">
                    {ratingData.average.toFixed(1)} ({ratingData.count} değerlendirme)
                  </span>
                </div>
              )}
            </div>

            {user && !userReview && (
              <div className="bg-stone-50 border border-black/8 p-6 mb-8">
                <h3 className="font-semibold mb-4 text-black">Değerlendirme Yaz</h3>
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-xs text-black/40 mb-2 uppercase tracking-wider">Puanınız</label>
                    <StarRating rating={reviewRating} size={28} interactive onChange={setReviewRating} />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Başlık (isteğe bağlı)"
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-black/12 text-black placeholder:text-black/30 focus:outline-none focus:border-black transition-colors"
                      data-testid="input-review-title"
                    />
                  </div>
                  <div>
                    <textarea
                      placeholder="Yorumunuz (isteğe bağlı)"
                      value={reviewContent}
                      onChange={(e) => setReviewContent(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-white border border-black/12 text-black placeholder:text-black/30 focus:outline-none focus:border-black transition-colors resize-none"
                      data-testid="input-review-content"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={createReviewMutation.isPending}
                    className="px-6 py-3 bg-black text-white font-semibold hover:bg-polen-orange transition-colors disabled:opacity-50 flex items-center gap-2 text-xs tracking-[0.18em] uppercase"
                    data-testid="button-submit-review"
                  >
                    {createReviewMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Gönder
                  </button>
                </form>
              </div>
            )}

            {!user && (
              <div className="bg-stone-50 border border-black/8 p-6 mb-8 text-center">
                <p className="text-black font-medium mb-4">Değerlendirme yazmak için giriş yapın</p>
                <Link href="/giris">
                  <button className="px-6 py-3 bg-black text-white font-semibold hover:bg-polen-orange transition-colors text-xs tracking-[0.18em] uppercase">
                    Giriş Yap
                  </button>
                </Link>
              </div>
            )}

            {userReview && (
              <div className="bg-stone-50 border border-black/8 p-6 mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <StarRating rating={userReview.rating} size={16} />
                  <span className="text-xs text-green-700 font-medium uppercase tracking-wider">Değerlendirmeniz</span>
                </div>
                {userReview.title && <h4 className="font-semibold text-black">{userReview.title}</h4>}
                {userReview.content && <p className="text-black/50 mt-1 text-sm">{userReview.content}</p>}
              </div>
            )}

            {reviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.filter(r => r.id !== userReview?.id).map((review) => {
                  const maskName = (name: string | null | undefined) => {
                    if (!name) return '***';
                    return name.slice(0, 2) + '***';
                  };
                  return (
                    <div key={review.id} className="bg-stone-50 border border-black/8 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-black/8 flex items-center justify-center text-sm font-bold text-black">
                            {review.user.firstName?.charAt(0)?.toUpperCase() || 'A'}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-black">
                              {maskName(review.user.firstName)} {maskName(review.user.lastName)}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <StarRating rating={review.rating} size={12} />
                              <span className="text-xs text-black/35">
                                {new Date(review.createdAt).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {review.title && <h4 className="font-semibold text-sm text-black">{review.title}</h4>}
                      {review.content && <p className="text-black/50 text-sm mt-2 leading-relaxed">{review.content}</p>}
                    </div>
                  );
                })}
              </div>
            ) : (
              !userReview && (
                <div className="text-center py-10 text-muted-foreground">
                  <Star className="w-10 h-10 mx-auto mb-3 text-black/12" />
                  <p className="text-black/40">Henüz değerlendirme yok. İlk değerlendirmeyi siz yapın!</p>
                </div>
              )
            )}
          </motion.section>

          {moreProducts.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mt-20">
              <h2 className="font-display text-3xl tracking-wide uppercase mb-8 text-black">Beğenebileceğiniz Ürünler</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6">
                {moreProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </motion.section>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
