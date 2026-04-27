import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, Link } from 'wouter';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Phone, MapPin, CreditCard, Truck, Shield, 
  RotateCcw, Check, ArrowRight, ShoppingBag, ChevronRight,
  Package, Lock, ClipboardCheck, Edit3, AlertCircle, Loader2,
  CheckCircle2, UserPlus, Tag, X, Instagram
} from 'lucide-react';
import { COUNTRIES } from '@/lib/countries';

interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: string;
  images: string[];
}

interface UserAddress {
  id: string;
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
}

const FREE_SHIPPING_THRESHOLD = 2500;
const INTERNATIONAL_SHIPPING_COST = 2500;
const IRAQ_SHIPPING_COST = 5700;
const DOMESTIC_SHIPPING_COST = 200;

const steps = [
  { id: 1, title: 'İletişim', icon: User },
  { id: 2, title: 'Teslimat', icon: MapPin },
  { id: 3, title: 'Ödeme', icon: CreditCard },
];

export default function Checkout() {
  const [, navigate] = useLocation();
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [stepErrors, setStepErrors] = useState<Record<number, string[]>>({});
  const [savedOrderTotal, setSavedOrderTotal] = useState<number | null>(null);
  
  // iyzico Checkout Form State
  const [checkoutFormContent, setCheckoutFormContent] = useState<string | null>(null);
  const [merchantOid, setMerchantOid] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const checkoutFormRef = useRef<HTMLDivElement>(null);
  const initiateCheckoutTracked = useRef(false);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discountType: string;
    discountValue: string;
    freeShipping?: boolean;
    appliesToShipping?: boolean;
    maxDiscountAmount?: string;
    isInfluencerCode?: boolean;
    influencerInstagram?: string;
  } | null>(null);
  const [couponError, setCouponError] = useState('');

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products');
      return res.json();
    },
  });

  // Fetch saved addresses for logged in users
  const { data: savedAddresses = [] } = useQuery<UserAddress[]>({
    queryKey: ['user-addresses'],
    queryFn: async () => {
      const res = await fetch('/api/auth/addresses', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [hasAutoSelectedAddress, setHasAutoSelectedAddress] = useState(false);

  const cartItemsWithProducts = items.map(item => {
    const product = products.find(p => p.id === item.productId);
    return { ...item, product };
  });

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    address: '',
    city: '',
    district: '',
    postalCode: '',
    country: 'Türkiye',
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        customerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || prev.customerName,
        customerEmail: user.email || prev.customerEmail,
        customerPhone: (user as any).phone || prev.customerPhone,
      }));
    }
  }, [user]);

  // Auto-select default address when addresses are loaded (only once on initial load)
  useEffect(() => {
    if (savedAddresses.length > 0 && !hasAutoSelectedAddress) {
      const defaultAddr = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
        setHasAutoSelectedAddress(true);
        setFormData(prev => ({
          ...prev,
          customerName: `${defaultAddr.firstName} ${defaultAddr.lastName}`.trim(),
          customerPhone: defaultAddr.phone,
          address: defaultAddr.address,
          city: defaultAddr.city,
          district: defaultAddr.district,
          postalCode: defaultAddr.postalCode || '',
          country: defaultAddr.country || 'Türkiye',
        }));
      }
    }
  }, [savedAddresses, hasAutoSelectedAddress]);

  // Update form data when a saved address is selected
  const handleSelectAddress = (addr: UserAddress) => {
    setSelectedAddressId(addr.id);
    setShowNewAddressForm(false);
    setFormData(prev => ({
      ...prev,
      customerName: `${addr.firstName} ${addr.lastName}`.trim(),
      customerPhone: addr.phone,
      address: addr.address,
      city: addr.city,
      district: addr.district,
      postalCode: addr.postalCode || '',
      country: addr.country || 'Türkiye',
    }));
  };

  // Calculate shipping based on country
  const isDomestic = formData.country === 'Türkiye';
  const isIraq = formData.country === 'Irak';
  const baseShippingCost = isDomestic 
    ? (subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DOMESTIC_SHIPPING_COST)
    : isIraq ? IRAQ_SHIPPING_COST : INTERNATIONAL_SHIPPING_COST;
  const shippingCost = appliedCoupon?.freeShipping ? 0 : baseShippingCost;
  const remainingForFreeShipping = isDomestic && !appliedCoupon?.freeShipping ? (FREE_SHIPPING_THRESHOLD - subtotal) : 0;
  const shippingProgress = isDomestic ? Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100) : 100;
  
  // Calculate discount based on coupon
  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    const discountBase = appliedCoupon.appliesToShipping ? subtotal + shippingCost : subtotal;
    let disc = 0;
    if (appliedCoupon.discountType === 'percentage') {
      disc = (discountBase * parseFloat(appliedCoupon.discountValue)) / 100;
    } else {
      disc = parseFloat(appliedCoupon.discountValue);
    }
    if (appliedCoupon.maxDiscountAmount) {
      disc = Math.min(disc, parseFloat(appliedCoupon.maxDiscountAmount));
    }
    return Math.min(disc, discountBase);
  };
  
  const discount = calculateDiscount();
  const total = subtotal - discount + shippingCost;

  // Coupon validation handler
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Kupon kodu girin');
      return;
    }
    
    setCouponLoading(true);
    setCouponError('');
    
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, orderTotal: subtotal }),
        credentials: 'include',
      });
      
      const data = await res.json();
      
      if (data.valid && data.coupon) {
        setAppliedCoupon({
          id: data.coupon.id,
          code: data.coupon.code,
          discountType: data.coupon.discountType,
          discountValue: data.coupon.discountValue,
          freeShipping: data.coupon.freeShipping,
          appliesToShipping: data.coupon.appliesToShipping,
          maxDiscountAmount: data.coupon.maxDiscountAmount,
          isInfluencerCode: data.coupon.isInfluencerCode,
          influencerInstagram: data.coupon.influencerInstagram,
        });
        setCouponCode('');
        toast({
          title: 'Kupon Uygulandı',
          description: `${data.coupon.code} kodu başarıyla uygulandı!`,
        });
      } else {
        setCouponError(data.error || 'Geçersiz kupon kodu');
      }
    } catch (error) {
      setCouponError('Kupon doğrulanamadı');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setStepErrors({});
  };

  const validateStep = (step: number): boolean => {
    const errors: string[] = [];
    
    if (step === 1) {
      if (!formData.customerName.trim()) errors.push('Ad Soyad gerekli');
      if (!formData.customerEmail.trim()) errors.push('E-posta gerekli');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) errors.push('Geçerli bir e-posta girin');
      if (!formData.customerPhone.trim()) errors.push('Telefon gerekli');
    }
    
    if (step === 2) {
      if (!formData.address.trim()) errors.push('Adres gerekli');
      if (!formData.city.trim()) errors.push('İl gerekli');
      if (!formData.district.trim()) errors.push('İlçe gerekli');
      if (createAccount && accountPassword.length < 6) {
        errors.push('Şifre en az 6 karakter olmalı');
      }
    }

    if (errors.length > 0) {
      setStepErrors({ [step]: errors });
      return false;
    }
    return true;
  };

  const goToStep = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
      return;
    }
    
    for (let i = 1; i < step; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        return;
      }
    }
    setCurrentStep(step);
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 2) {
        // When moving to step 3 (payment), initiate iyzico Checkout Form
        initiatePayment();
      } else {
        setCurrentStep(prev => Math.min(prev + 1, 4));
      }
    }
  };

  // Initiate iyzico Checkout Form
  const initiatePayment = async () => {
    if (items.length === 0) {
      toast({ 
        title: 'Hata', 
        description: 'Sepetiniz boş',
        variant: 'destructive'
      });
      return;
    }

    setPaymentLoading(true);
    setPaymentError(null);

    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone,
          address: formData.address,
          city: formData.city,
          district: formData.district,
          postalCode: formData.postalCode,
          country: formData.country,
          couponCode: appliedCoupon?.code || null,
          createAccount: !user && createAccount,
          accountPassword: !user && createAccount ? accountPassword : null,
        }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ödeme başlatılamadı');
      }

      setCheckoutFormContent(data.checkoutFormContent || null);
      setMerchantOid(data.merchantOid);
      setSavedOrderTotal(total);
      setCurrentStep(3);

    } catch (error: any) {
      setPaymentError(error.message || 'Ödeme başlatılamadı');
      toast({ 
        title: 'Hata', 
        description: error.message || 'Ödeme başlatılamadı',
        variant: 'destructive'
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const purchaseTracked = useRef(false);

  // Check payment status when redirected back
  const checkPaymentStatus = useCallback(async () => {
    if (!merchantOid) return;

    try {
      const res = await fetch(`/api/payment/status/${merchantOid}`, {
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'completed') {
          setOrderNumber(data.orderNumber);
          setOrderComplete(true);
          clearCart();

        } else if (data.status === 'failed') {
          setPaymentError('Ödeme başarısız oldu. Lütfen tekrar deneyin.');
          setCheckoutFormContent(null);
        }
      }
    } catch (error) {
      console.error('Payment status check failed:', error);
    }
  }, [merchantOid, clearCart]);

  // Poll for payment status when on step 3
  useEffect(() => {
    if (currentStep === 3 && merchantOid && checkoutFormContent) {
      const interval = setInterval(() => {
        checkPaymentStatus();
      }, 3000); // Check every 3 seconds

      return () => clearInterval(interval);
    }
  }, [currentStep, merchantOid, checkoutFormContent, checkPaymentStatus]);

  // Inject iyzico Checkout Form HTML/JS into the DOM when received
  useEffect(() => {
    if (!checkoutFormContent || !checkoutFormRef.current) return;

    const container = checkoutFormRef.current;
    container.innerHTML = '';

    // checkoutFormContent contains both HTML and a <script> tag.
    // Setting innerHTML does NOT execute scripts, so we re-create them.
    const wrapper = document.createElement('div');
    wrapper.innerHTML = checkoutFormContent;

    // Move all non-script nodes into the container
    Array.from(wrapper.childNodes).forEach((node) => {
      if (node.nodeName === 'SCRIPT') {
        const original = node as HTMLScriptElement;
        const script = document.createElement('script');
        if (original.src) script.src = original.src;
        if (original.type) script.type = original.type;
        script.text = original.text;
        container.appendChild(script);
      } else {
        container.appendChild(node);
      }
    });

    return () => {
      container.innerHTML = '';
    };
  }, [checkoutFormContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Payment is now handled by iyzico Checkout Form
    // This function is kept for form compatibility but shouldn't be called directly
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Header />
        <main className="pt-36 pb-20 px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center"
            >
              <CheckCircle2 className="w-12 h-12 text-white" />
            </motion.div>
            <h1 className="font-display text-3xl tracking-wider mb-4" data-testid="text-order-success">
              SİPARİŞİNİZ ALINDI!
            </h1>
            <p className="text-muted-foreground mb-2">
              Siparişiniz başarıyla oluşturuldu.
            </p>
            <p className="text-lg font-mono font-bold text-black mb-8">
              Sipariş No: #{orderNumber}
            </p>
            
            <div className="bg-stone-50 border border-black/8 p-6 mb-8 text-left">
              <h3 className="font-semibold text-black mb-4">Sipariş Detayları</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">E-posta</span>
                  <span>{formData.customerEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Teslimat Adresi</span>
                  <span className="text-right">{formData.district}, {formData.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ödeme Yöntemi</span>
                  <span>Kredi Kartı</span>
                </div>
                <div className="h-px bg-black/8 my-3" />
                <div className="flex justify-between font-semibold">
                  <span>Toplam</span>
                  <span>{(savedOrderTotal || total).toLocaleString('tr-TR')} ₺</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              Sipariş onayı <strong>{formData.customerEmail}</strong> adresine gönderilecektir.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {user ? (
                <Link href="/hesabim" className="flex-1">
                  <Button className="w-full h-12 bg-black hover:bg-black/85 text-white font-bold tracking-wide rounded-none">
                    SİPARİŞLERİM
                  </Button>
                </Link>
              ) : null}
              <Link href="/" className="flex-1">
                <Button className="w-full h-12 bg-black text-white hover:bg-black/85 font-bold tracking-wide group rounded-none">
                  ALIŞVERİŞE DEVAM ET
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden w-full">
        <Header />
        <main className="pt-36 pb-20 px-4 sm:px-6 w-full box-border">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-stone-100 flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="font-display text-3xl tracking-wider mb-4">
              SEPETİNİZ BOŞ
            </h1>
            <p className="text-muted-foreground mb-8">
              Ödeme yapabilmek için önce sepetinize ürün eklemelisiniz.
            </p>
            <Link href="/">
              <Button className="h-12 px-8 bg-white text-black hover:bg-white/90 font-bold tracking-wide group">
                ALIŞVERİŞE BAŞLA
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full">
      <Header />
      
      <main className="pt-36 pb-20 px-4 sm:px-6 w-full box-border overflow-hidden">
        <div className="max-w-5xl mx-auto w-full overflow-hidden">
          <motion.nav 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-xs text-muted-foreground mb-6"
          >
            <Link href="/">Ana Sayfa</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/sepet">Sepet</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground">Ödeme</span>
          </motion.nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="font-display text-4xl sm:text-5xl tracking-wider mb-6" data-testid="text-page-title">
              ÖDEME
            </h1>
            
            <div className="flex items-center justify-center gap-1 sm:gap-2 max-w-2xl mx-auto px-2 overflow-hidden">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center min-w-0">
                  <motion.button 
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    onClick={() => goToStep(step.id)}
                    disabled={step.id > currentStep + 1}
                    className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-full transition-all shrink-0 ${
                      currentStep === step.id 
                        ? 'bg-white text-black' 
                        : currentStep > step.id
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-black/4 text-black/40 border border-black/10'
                    } ${step.id > currentStep + 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    data-testid={`step-${step.id}`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    ) : (
                      <step.icon className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    )}
                    <span className="text-[10px] sm:text-xs font-medium truncate">{step.title}</span>
                  </motion.button>
                  {index < steps.length - 1 && (
                    <div className={`w-2 sm:w-6 h-px mx-0.5 sm:mx-1 shrink-0 ${currentStep > step.id ? 'bg-green-500' : 'bg-black/10'}`} />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 overflow-hidden">
            <div className="lg:col-span-2 min-w-0 overflow-hidden">
              <form onSubmit={handleSubmit} className="space-y-6 w-full">
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-white border border-black/8 rounded-none p-4 sm:p-6 overflow-hidden"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-stone-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-black/50" />
                        </div>
                        <div>
                          <h2 className="font-display text-xl tracking-wide">
                            İLETİŞİM BİLGİLERİ
                          </h2>
                          {!user && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Hesap oluşturmadan devam edebilirsiniz
                            </p>
                          )}
                        </div>
                      </div>

                      {!user && (
                        <div className="mb-6 p-4 bg-stone-50 border border-black/8 rounded-lg">
                          <div className="flex items-start gap-3">
                            <UserPlus className="w-5 h-5 text-black/40 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-black/70">Zaten üye misiniz?</p>
                              <p className="text-xs text-black/40 mt-1">
                                <Link href="/giris" className="text-black font-semibold hover:underline underline-offset-2">Giriş yapın</Link> ve bilgilerinizi otomatik doldurun.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {stepErrors[1] && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <div className="text-sm text-red-400">
                              {stepErrors[1].map((err, i) => <p key={i}>{err}</p>)}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="customerName" className="text-sm font-medium">Ad Soyad *</Label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="customerName"
                              name="customerName"
                              value={formData.customerName}
                              onChange={handleChange}
                              data-testid="input-customerName"
                              className="h-12 pl-11 bg-stone-50 border-black/12 focus:border-black/40 rounded-none text-black placeholder:text-black/25"
                              placeholder="Adınız Soyadınız"
                            />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="customerEmail" className="text-sm font-medium">E-posta *</Label>
                            <div className="relative">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="customerEmail"
                                name="customerEmail"
                                type="email"
                                value={formData.customerEmail}
                                onChange={handleChange}
                                data-testid="input-customerEmail"
                                className="h-12 pl-11 bg-stone-50 border-black/12 focus:border-black/40 rounded-none text-black placeholder:text-black/25"
                                placeholder="ornek@email.com"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="customerPhone" className="text-sm font-medium">Telefon *</Label>
                            <div className="relative">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="customerPhone"
                                name="customerPhone"
                                type="tel"
                                value={formData.customerPhone}
                                onChange={handleChange}
                                data-testid="input-customerPhone"
                                className="h-12 pl-11 bg-stone-50 border-black/12 focus:border-black/40 rounded-none text-black placeholder:text-black/25"
                                placeholder="05XX XXX XX XX"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="mt-6">
                        <Button 
                          type="button" 
                          onClick={handleNextStep}
                          className="w-full h-12 bg-white text-black hover:bg-white/90 font-bold tracking-wide group rounded-lg"
                          data-testid="button-next-step1"
                        >
                          DEVAM ET
                          <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}

                  {currentStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-white border border-black/8 rounded-none p-4 sm:p-6 overflow-hidden"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-stone-100 flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-black/50" />
                        </div>
                        <h2 className="font-display text-xl tracking-wide">
                          TESLİMAT ADRESİ
                        </h2>
                      </div>

                      {stepErrors[2] && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <div className="text-sm text-red-400">
                              {stepErrors[2].map((err, i) => <p key={i}>{err}</p>)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Saved Addresses Section */}
                      {user && savedAddresses.length > 0 && !showNewAddressForm && (
                        <div className="space-y-3 mb-6">
                          <Label className="text-sm font-medium text-muted-foreground">Kayıtlı Adreslerim</Label>
                          <div className="space-y-2">
                            {savedAddresses.map((addr) => (
                              <button
                                key={addr.id}
                                type="button"
                                onClick={() => handleSelectAddress(addr)}
                                className={`w-full text-left p-4 border transition-all ${
                                  selectedAddressId === addr.id 
                                    ? 'border-black bg-stone-50' 
                                    : 'border-black/10 hover:border-black/25 bg-white'
                                }`}
                                data-testid={`address-option-${addr.id}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium">{addr.title}</span>
                                      {addr.isDefault && (
                                        <span className="text-xs bg-white/10 px-2 py-0.5 rounded">Varsayılan</span>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">
                                      {addr.firstName} {addr.lastName}
                                    </p>
                                    <p className="text-sm text-muted-foreground truncate">
                                      {addr.address}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {addr.district}, {addr.city}
                                    </p>
                                  </div>
                                  {selectedAddressId === addr.id && (
                                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowNewAddressForm(true);
                              setSelectedAddressId(null);
                              setFormData(prev => ({
                                ...prev,
                                address: '',
                                city: '',
                                district: '',
                                postalCode: '',
                                country: 'Türkiye',
                              }));
                            }}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-black transition-colors"
                            data-testid="button-new-address"
                          >
                            <UserPlus className="w-4 h-4" />
                            Yeni Adres Ekle
                          </button>
                        </div>
                      )}

                      {/* Manual Address Form - show when no saved addresses or when adding new */}
                      {(!user || savedAddresses.length === 0 || showNewAddressForm) && (
                        <div className="space-y-4">
                          {showNewAddressForm && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowNewAddressForm(false);
                                if (savedAddresses.length > 0) {
                                  const defaultAddr = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
                                  if (defaultAddr) handleSelectAddress(defaultAddr);
                                }
                              }}
                              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-black transition-colors mb-4"
                            >
                              <ArrowRight className="w-4 h-4 rotate-180" />
                              Kayıtlı Adreslerime Dön
                            </button>
                          )}
                          <div className="space-y-2">
                            <Label htmlFor="address" className="text-sm font-medium">Adres *</Label>
                            <Input
                              id="address"
                              name="address"
                              value={formData.address}
                              onChange={handleChange}
                              placeholder="Sokak, Mahalle, Bina No, Daire No"
                              data-testid="input-address"
                              className="h-12 bg-stone-50 border-black/12 focus:border-black/40 rounded-none text-black placeholder:text-black/25"
                            />
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="city" className="text-sm font-medium">İl *</Label>
                              <Input
                                id="city"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                data-testid="input-city"
                                className="h-12 bg-stone-50 border-black/12 focus:border-black/40 rounded-none text-black placeholder:text-black/25"
                                placeholder="İstanbul"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="district" className="text-sm font-medium">İlçe *</Label>
                              <Input
                                id="district"
                                name="district"
                                value={formData.district}
                                onChange={handleChange}
                                data-testid="input-district"
                                className="h-12 bg-stone-50 border-black/12 focus:border-black/40 rounded-none text-black placeholder:text-black/25"
                                placeholder="Kadıköy"
                              />
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="postalCode" className="text-sm font-medium">Posta Kodu</Label>
                              <Input
                                id="postalCode"
                                name="postalCode"
                                value={formData.postalCode}
                                onChange={handleChange}
                                data-testid="input-postalCode"
                                className="h-12 bg-stone-50 border-black/12 focus:border-black/40 rounded-none text-black placeholder:text-black/25"
                                placeholder="34000"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="country" className="text-sm font-medium">Ülke *</Label>
                              <select
                                id="country"
                                name="country"
                                value={formData.country}
                                onChange={handleChange}
                                data-testid="select-country"
                                className="w-full h-12 bg-stone-50 border border-black/12 focus:border-black/40 focus:outline-none rounded-none px-4 text-black"
                              >
                                {COUNTRIES.map(country => (
                                  <option key={country} value={country} className="bg-white">
                                    {country}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          
                          {formData.country !== 'Türkiye' && (
                            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                              <p className="text-sm text-amber-200">
                                <strong>Uluslararası Kargo:</strong> {isIraq ? 'Irak siparişlerinde sabit 5.700 TL' : 'Türkiye dışı siparişlerde sabit 2.500 TL'} kargo ücreti uygulanır.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Account Creation Option - Only for guest users */}
                      {!user && (
                        <div className="mt-6 p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={createAccount}
                              onChange={(e) => setCreateAccount(e.target.checked)}
                              className="mt-1 w-5 h-5 border-black/20 bg-white text-black focus:ring-black focus:ring-offset-0 rounded-none"
                              data-testid="checkbox-create-account"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-blue-400" />
                                <span className="font-medium text-black">Üye olmak ister misiniz?</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Siparişlerinizi kolayca takip edin, adreslerinizi kaydedin ve özel kampanyalardan haberdar olun.
                              </p>
                            </div>
                          </label>
                          
                          <AnimatePresence>
                            {createAccount && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 overflow-hidden"
                              >
                                <div className="space-y-2">
                                  <Label htmlFor="accountPassword" className="text-sm font-medium">Şifre Belirleyin *</Label>
                                  <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                      id="accountPassword"
                                      type="password"
                                      value={accountPassword}
                                      onChange={(e) => setAccountPassword(e.target.value)}
                                      placeholder="En az 6 karakter"
                                      data-testid="input-account-password"
                                      className="h-12 pl-12 bg-stone-50 border-black/12 focus:border-black/40 rounded-none text-black placeholder:text-black/25"
                                      minLength={6}
                                    />
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Sipariş tamamlandığında hesabınız otomatik oluşturulacak.
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      <div className="flex gap-3 mt-6">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => setCurrentStep(1)}
                          className="flex-1 h-12 border-black/15 hover:bg-black/4 text-black rounded-none"
                        >
                          Geri
                        </Button>
                        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="flex-1">
                          <Button 
                            type="button" 
                            onClick={handleNextStep}
                            className="w-full h-12 bg-black text-white hover:bg-black/85 font-bold tracking-wide group rounded-none"
                            data-testid="button-next-step2"
                          >
                            DEVAM ET
                            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-white border border-black/8 rounded-none p-4 sm:p-6 overflow-hidden"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-stone-100 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-black/50" />
                        </div>
                        <h2 className="font-display text-xl tracking-wide">
                          KREDİ KARTI İLE ÖDE
                        </h2>
                      </div>

                      {paymentError && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <div className="text-sm text-red-400">{paymentError}</div>
                          </div>
                        </div>
                      )}

                      {checkoutFormContent ? (
                        <div className="space-y-4">
                          <div
                            ref={checkoutFormRef}
                            className="bg-white rounded-xl overflow-hidden"
                            style={{ minHeight: '500px' }}
                            data-testid="iyzico-checkout-form"
                          />
                          
                          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <div className="flex items-start gap-3">
                              <Lock className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-green-400">256-bit SSL Güvenlik</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Kart bilgileriniz iyzico güvencesiyle şifrelenmektedir.
                                </p>
                              </div>
                            </div>
                          </div>

                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => {
                              setCheckoutFormContent(null);
                              setMerchantOid(null);
                              setPaymentError(null);
                              setCurrentStep(2);
                            }}
                            className="w-full h-12 border-black/15 hover:bg-black/4 text-black rounded-none"
                          >
                            Bilgilerimi Düzenle
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12">
                          <Loader2 className="w-8 h-8 animate-spin text-black/30 mb-4" />
                          <p className="text-muted-foreground">Ödeme formu yükleniyor...</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                </AnimatePresence>
              </form>
            </div>

            <div className="lg:col-span-1">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-stone-50 border border-black/8 p-4 sm:p-6 sticky top-24 overflow-hidden"
              >
                
                <h2 className="font-display text-lg tracking-wide mb-4 relative">
                  SİPARİŞ ÖZETİ
                </h2>

                <div className="space-y-3 pb-4 border-b border-black/8 relative max-h-48 overflow-y-auto">
                  {cartItemsWithProducts.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-14 h-16 bg-stone-200 overflow-hidden shrink-0">
                        {item.product?.images?.[0] && (
                          <img 
                            src={item.product.images[0]} 
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.product?.name || 'Ürün'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Adet: {item.quantity}</p>
                        <p className="text-sm font-bold mt-1">
                          {(parseFloat(item.product?.basePrice || '0') * item.quantity).toLocaleString('tr-TR')} ₺
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coupon Input Section */}
                <div className="py-4 border-b border-black/8 relative">
                  {appliedCoupon ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-medium text-green-400">{appliedCoupon.code}</span>
                        </div>
                        <button
                          onClick={handleRemoveCoupon}
                          className="text-muted-foreground hover:text-black transition-colors"
                          data-testid="button-remove-coupon"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {appliedCoupon.freeShipping && (
                        <div className="flex items-center gap-2 text-xs text-green-400">
                          <Truck className="w-4 h-4" />
                          <span>Ücretsiz kargo kuponu uygulandı</span>
                        </div>
                      )}
                      {appliedCoupon.isInfluencerCode && appliedCoupon.influencerInstagram && (
                        <div className="flex items-center gap-2 text-xs text-pink-400">
                          <Instagram className="w-4 h-4" />
                          <a 
                            href={`https://instagram.com/${appliedCoupon.influencerInstagram.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            data-testid="link-influencer-instagram"
                          >
                            {appliedCoupon.influencerInstagram}
                          </a>
                          <span className="text-muted-foreground">influencer koduyla alışveriş yapıyorsunuz</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            value={couponCode}
                            onChange={(e) => {
                              setCouponCode(e.target.value.toUpperCase());
                              setCouponError('');
                            }}
                            placeholder="Kupon kodu"
                            className="pl-10 bg-stone-50 border-black/12 h-10 uppercase text-black placeholder:text-black/25 rounded-none"
                            data-testid="input-coupon-code"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponCode.trim()}
                          className="h-10 px-4 bg-white text-black hover:bg-white/90 font-bold"
                          data-testid="button-apply-coupon"
                        >
                          {couponLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Uygula'
                          )}
                        </Button>
                      </div>
                      {couponError && (
                        <p className="text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {couponError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3 text-sm py-4 relative">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ara Toplam</span>
                    <span data-testid="text-subtotal">{subtotal.toLocaleString('tr-TR')} ₺</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        İndirim ({appliedCoupon?.code})
                      </span>
                      <span data-testid="text-discount">-{discount.toLocaleString('tr-TR')} ₺</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kargo</span>
                    <span data-testid="text-shipping" className={shippingCost === 0 ? 'text-green-400 font-medium' : ''}>
                      {shippingCost === 0 ? 'ÜCRETSİZ' : `${shippingCost.toFixed(2)} ₺`}
                    </span>
                  </div>
                  {shippingCost > 0 && remainingForFreeShipping > 0 && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Truck className="w-4 h-4 text-amber-400" />
                        <p className="text-xs">
                          <span className="font-bold text-amber-400">{remainingForFreeShipping.toFixed(0)} TL</span> daha harcayın, kargo ücretsiz!
                        </p>
                      </div>
                      <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${shippingProgress}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                        />
                      </div>
                    </div>
                  )}
                  {shippingCost === 0 && (
                    <div className="mt-2 p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-green-400" />
                        <p className="text-xs text-green-400 font-medium">Ücretsiz kargo kazandınız!</p>
                      </div>
                    </div>
                  )}
                  <div className="h-px bg-black/8" />
                  <div className="flex justify-between text-base">
                    <span className="font-bold">Toplam</span>
                    <span className="font-bold text-xl" data-testid="text-total">{total.toLocaleString('tr-TR')} ₺</span>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-black/8 relative">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Shield className="w-4 h-4 shrink-0 text-green-400" />
                    <span>Güvenli Ödeme</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Truck className="w-4 h-4 shrink-0" />
                    <span>Hızlı Teslimat (1 İş Günü)</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <RotateCcw className="w-4 h-4 shrink-0" />
                    <span>14 Gün Ücretsiz İade</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
