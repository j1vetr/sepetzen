import { useState, useEffect, useRef, useCallback } from 'react';
import { pickThumbUrl, isVideoUrl } from '@/lib/mediaUtils';
import { useLocation, Link } from 'wouter';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { SEO } from '@/components/SEO';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Phone, MapPin, CreditCard, Truck, Shield, 
  RotateCcw, Check, ArrowRight, ShoppingBag, ChevronRight,
  Package, Lock, ClipboardCheck, Edit3, AlertCircle, Loader2,
  CheckCircle2, UserPlus, Tag, X, Instagram
} from 'lucide-react';
import { COUNTRIES } from '@/lib/countries';
import CityDistrictSelect from '@/components/CityDistrictSelect';
import { GoogleAuthButton } from '@/components/AuthLayout';
import { BANK_TRANSFER_INFO } from '@shared/bankInfo';
import { InvoiceFields, emptyInvoiceForm, invoiceFormFrom, invoicePayload, validateInvoiceForm, type InvoiceFormValue } from '@/components/InvoiceFields';
import { useShippingSettings } from '@/hooks/useShippingSettings';
import { ComplementaryProducts } from '@/components/ComplementaryProducts';

interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: string;
  images: string[];
  personalization?: {
    enabled: boolean;
    fee?: string;
    label?: string;
    maxChars?: number;
  } | null;
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
  invoiceType?: 'individual' | 'corporate' | null;
  tcknNumber?: string | null;
  companyName?: string | null;
  taxOffice?: string | null;
  taxNumber?: string | null;
}


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
  const { freeShippingThreshold, domesticShippingCost, internationalShippingCost, countryShippingRates } = useShippingSettings();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [stepErrors, setStepErrors] = useState<Record<number, string[]>>({});
  const [savedOrderTotal, setSavedOrderTotal] = useState<number | null>(null);
  
  // Payment method tab (card = iyzico | card_paytr = PayTR | bank_transfer)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'card_paytr' | 'bank_transfer'>('card');
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyBankField = async (key: 'bank' | 'holder' | 'iban', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(key);
      setTimeout(() => setCopiedField((curr) => (curr === key ? null : curr)), 1800);
    } catch {}
  };
  const [bankTransferLoading, setBankTransferLoading] = useState(false);

  // iyzico Checkout Form State
  const [checkoutFormContent, setCheckoutFormContent] = useState<string | null>(null);
  const [paymentPageUrl, setPaymentPageUrl] = useState<string | null>(null);
  const [merchantOid, setMerchantOid] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const checkoutFormRef = useRef<HTMLDivElement>(null);
  const initiateCheckoutTracked = useRef(false);

  // PayTR iFrame State
  const [paytrIframeUrl, setPaytrIframeUrl] = useState<string | null>(null);
  
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

  // Aktif ödeme yöntemleri (admin panelden yönetilir)
  const { data: payMethods = { iyzico: true, paytr: false, bankTransfer: true } } = useQuery<{
    iyzico: boolean;
    paytr: boolean;
    bankTransfer: boolean;
  }>({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const res = await fetch('/api/payment/methods');
      return res.json();
    },
    refetchOnMount: 'always',
  });

  // Havale bilgileri ve indirim oranı (admin panelden yönetilir)
  const { data: bankInfo = {
    enabled: true,
    bankName: BANK_TRANSFER_INFO.bankName,
    accountHolder: BANK_TRANSFER_INFO.accountHolder,
    iban: BANK_TRANSFER_INFO.iban,
    discountPercent: 10,
  } } = useQuery<{
    enabled: boolean;
    bankName: string;
    accountHolder: string;
    iban: string;
    discountPercent: number;
  }>({
    queryKey: ['bank-transfer-info'],
    queryFn: async () => {
      const res = await fetch('/api/payment/bank-transfer/info');
      return res.json();
    },
    refetchOnMount: 'always',
  });

  // Varsayılan sekme: kapalı bir sekmede kalınmasın
  useEffect(() => {
    const firstAvailable = payMethods.iyzico ? 'card' : payMethods.paytr ? 'card_paytr' : 'bank_transfer';
    if (paymentMethod === 'card' && !payMethods.iyzico) {
      setPaymentMethod(payMethods.paytr ? 'card_paytr' : 'bank_transfer');
    } else if (paymentMethod === 'card_paytr' && !payMethods.paytr) {
      setPaymentMethod(payMethods.iyzico ? 'card' : 'bank_transfer');
    } else if (paymentMethod === 'bank_transfer' && !payMethods.bankTransfer) {
      setPaymentMethod(firstAvailable);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payMethods.iyzico, payMethods.paytr, payMethods.bankTransfer]);

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

  const queryClient = useQueryClient();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [hasAutoSelectedAddress, setHasAutoSelectedAddress] = useState(false);
  // "Bu adresi kaydet" seçeneği (yeni adres formu, giriş yapmış kullanıcı)
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [newAddressTitle, setNewAddressTitle] = useState('Adresim');
  // Seçili adresin fatura bilgisi anlık görüntüsü; değişince güncelleme önerisi gösterilir
  const [invoiceInfoAtSelection, setInvoiceInfoAtSelection] = useState<InvoiceFormValue | null>(null);
  const [addressSaving, setAddressSaving] = useState(false);

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
  const [useSeparateBillingAddress, setUseSeparateBillingAddress] = useState(false);
  const [billingAddress, setBillingAddress] = useState({
    address: '',
    city: '',
    district: '',
    postalCode: '',
    country: 'Türkiye',
  });
  // Fatura kimlik bilgileri (Bireysel / Kurumsal) — açılıp kapanan sekme.
  const [invoiceInfo, setInvoiceInfo] = useState<InvoiceFormValue>(emptyInvoiceForm);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

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
        const invoice = invoiceFormFrom(defaultAddr as any);
        setInvoiceInfo(invoice);
        setInvoiceInfoAtSelection(invoice);
        if (invoice.invoiceType === 'corporate') setInvoiceOpen(true);
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
    const invoice = invoiceFormFrom(addr as any);
    setInvoiceInfo(invoice);
    setInvoiceInfoAtSelection(invoice);
    if (invoice.invoiceType === 'corporate') setInvoiceOpen(true);
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

  // Seçili adreste fatura bilgisi değiştiğinde güncelleme kaydeder
  const handleUpdateSelectedAddressInvoice = async () => {
    if (!selectedAddressId) return;
    const addr = savedAddresses.find(a => a.id === selectedAddressId);
    if (!addr) return;
    setAddressSaving(true);
    try {
      const res = await fetch(`/api/auth/addresses/${selectedAddressId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: addr.title,
          firstName: addr.firstName,
          lastName: addr.lastName,
          phone: addr.phone,
          address: addr.address,
          city: addr.city,
          district: addr.district,
          postalCode: addr.postalCode,
          country: addr.country,
          ...invoicePayload(invoiceInfo),
        }),
        credentials: 'include',
      });
      if (res.ok) {
        setInvoiceInfoAtSelection(invoiceInfo);
        queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
        toast({ title: 'Adres güncellendi', description: 'Fatura bilgileri adres defterinize kaydedildi.' });
      }
    } catch {
      // non-fatal
    } finally {
      setAddressSaving(false);
    }
  };

  // Seçili adresin fatura bilgisi değişti mi?
  const invoiceChangedFromSelection =
    !!selectedAddressId &&
    invoiceInfoAtSelection !== null &&
    JSON.stringify(invoiceInfo) !== JSON.stringify(invoiceInfoAtSelection);

  // Calculate shipping based on country
  const isDomestic = formData.country === 'Türkiye';
  const countryRate = countryShippingRates.find(r => r.country === formData.country);
  const rawRate = isDomestic
    ? domesticShippingCost
    : (countryRate ? countryRate.cost : internationalShippingCost);
  const baseShippingCost = isDomestic
    ? (subtotal >= freeShippingThreshold ? 0 : rawRate)
    : rawRate;
  const shippingCost = appliedCoupon?.freeShipping ? 0 : baseShippingCost;
  const remainingForFreeShipping = isDomestic && !appliedCoupon?.freeShipping ? (freeShippingThreshold - subtotal) : 0;
  const shippingProgress = isDomestic ? Math.min((subtotal / freeShippingThreshold) * 100, 100) : 100;
  
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
  const bankTransferDiscount = paymentMethod === 'bank_transfer'
    ? Math.round(total * (bankInfo.discountPercent / 100) * 100) / 100
    : 0;
  const finalTotal = total - bankTransferDiscount;

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

  const handleBillingAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setBillingAddress({ ...billingAddress, [e.target.name]: e.target.value });
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
      if (useSeparateBillingAddress) {
        if (!billingAddress.address.trim()) errors.push('Fatura adresi gerekli');
        if (!billingAddress.city.trim()) errors.push('Fatura ili gerekli');
        if (!billingAddress.district.trim()) errors.push('Fatura ilçesi gerekli');
      }
      const invoiceError = validateInvoiceForm(invoiceInfo);
      if (invoiceError) {
        errors.push(invoiceError);
        setInvoiceOpen(true);
      }
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

  const handleNextStep = async () => {
    if (validateStep(currentStep)) {
      if (currentStep === 2) {
        // Giriş yapmış kullanıcı yeni adres girdi ve kaydetmek istedi
        if (user && showNewAddressForm && saveNewAddress) {
          setAddressSaving(true);
          try {
            const [firstName, ...lastParts] = formData.customerName.trim().split(' ');
            const lastName = lastParts.join(' ');
            await fetch('/api/auth/addresses', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: newAddressTitle.trim() || 'Adresim',
                firstName: firstName || formData.customerName,
                lastName: lastName || '',
                phone: formData.customerPhone,
                address: formData.address,
                city: formData.city,
                district: formData.district,
                postalCode: formData.postalCode,
                country: formData.country,
                ...invoicePayload(invoiceInfo),
              }),
              credentials: 'include',
            });
            queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
          } catch {
            // non-fatal — adres kaydedilemese de siparişe devam et
          } finally {
            setAddressSaving(false);
          }
        }

        // Move to payment step. If a card tab is selected, kick off the provider now.
        setCurrentStep(3);
        if (paymentMethod === 'card' && !checkoutFormContent && !paymentPageUrl) {
          initiatePayment('iyzico');
        } else if (paymentMethod === 'card_paytr' && !paytrIframeUrl) {
          initiatePayment('paytr');
        }
      } else {
        setCurrentStep(prev => Math.min(prev + 1, 4));
      }
    }
  };

  // Submit a bank transfer order (no iyzico). Backend creates a pending order
  // and waits for admin to confirm the wire transfer.
  const handleBankTransferSubmit = async () => {
    if (items.length === 0) {
      toast({ title: 'Hata', description: 'Sepetiniz boş', variant: 'destructive' });
      return;
    }
    setBankTransferLoading(true);
    setPaymentError(null);
    try {
      const res = await fetch('/api/payment/bank-transfer', {
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
          billingAddress: {
            sameAsShipping: !useSeparateBillingAddress,
            ...(useSeparateBillingAddress ? billingAddress : {}),
            ...invoicePayload(invoiceInfo),
          },
          couponCode: appliedCoupon?.code || null,
          createAccount: !user && createAccount,
          accountPassword: !user && createAccount ? accountPassword : null,
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sipariş oluşturulamadı');
      clearCart();
      navigate(`/odeme-basarili?oid=${encodeURIComponent(data.orderNumber)}&method=bank_transfer`);
    } catch (error: any) {
      setPaymentError(error.message || 'Sipariş oluşturulamadı');
      toast({
        title: 'Hata',
        description: error.message || 'Sipariş oluşturulamadı',
        variant: 'destructive',
      });
    } finally {
      setBankTransferLoading(false);
    }
  };

  // PayTR iframe linkleri tek kullanımlıktır: sekmeden ayrılınca linki temizle ki
  // geri dönüldüğünde taze bir link alınsın ("üzgünüz link kayboldu" hatasını önler).
  useEffect(() => {
    if (paymentMethod !== 'card_paytr') {
      setPaytrIframeUrl(prev => (prev ? null : prev));
    }
  }, [paymentMethod]);

  // When user switches back to a card tab on step 3, ensure the payment form is loaded.
  useEffect(() => {
    if (currentStep !== 3 || paymentLoading) return;
    if (paymentMethod === 'card' && !checkoutFormContent && !paymentPageUrl) {
      initiatePayment('iyzico');
    } else if (paymentMethod === 'card_paytr' && !paytrIframeUrl) {
      initiatePayment('paytr');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, currentStep]);

  // Initiate card payment (iyzico Checkout Form or PayTR iFrame)
  const initiatePayment = async (provider: 'iyzico' | 'paytr' = 'iyzico') => {
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
          billingAddress: {
            sameAsShipping: !useSeparateBillingAddress,
            ...(useSeparateBillingAddress ? billingAddress : {}),
            ...invoicePayload(invoiceInfo),
          },
          couponCode: appliedCoupon?.code || null,
          createAccount: !user && createAccount,
          accountPassword: !user && createAccount ? accountPassword : null,
          provider,
        }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ödeme başlatılamadı');
      }

      if (data.provider === 'paytr') {
        setPaytrIframeUrl(data.iframeUrl || null);
        setPaymentPageUrl(null);
        setCheckoutFormContent(null);
      } else {
        // Prefer iyzico hosted page in iframe (most reliable). Fallback to inline content.
        setPaymentPageUrl(data.paymentPageUrl || null);
        setCheckoutFormContent(data.checkoutFormContent || null);
        setPaytrIframeUrl(null);
      }
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

  // Poll for payment status when on step 3 (works for both iframe and inline modes)
  useEffect(() => {
    if (currentStep === 3 && merchantOid && (paymentPageUrl || checkoutFormContent || paytrIframeUrl)) {
      const interval = setInterval(() => {
        checkPaymentStatus();
      }, 3000); // Check every 3 seconds

      return () => clearInterval(interval);
    }
  }, [currentStep, merchantOid, paymentPageUrl, checkoutFormContent, paytrIframeUrl, checkPaymentStatus]);

  // Inject iyzico Checkout Form HTML/JS into the DOM when received.
  // iyzico's bundle.js looks for a div with id="iyzipay-checkout-form" and
  // class "responsive" — without it the form area stays blank. We also clear
  // the global iyziInit on unmount so a second checkout in the same SPA
  // session re-renders correctly (the snippet does `if (typeof iyziInit == 'undefined')`).
  useEffect(() => {
    if (!checkoutFormContent || !checkoutFormRef.current) return;

    const container = checkoutFormRef.current;
    container.innerHTML = '';

    // 1) Mount point that iyzico's bundle.js targets.
    const formMount = document.createElement('div');
    formMount.id = 'iyzipay-checkout-form';
    formMount.className = 'responsive';
    container.appendChild(formMount);

    // 2) Reset any previous global so the snippet always re-initialises.
    try {
      delete (window as unknown as { iyziInit?: unknown }).iyziInit;
    } catch {
      (window as unknown as { iyziInit?: unknown }).iyziInit = undefined;
    }

    // 3) checkoutFormContent contains HTML and/or a <script> tag.
    // Setting innerHTML does NOT execute inline scripts, so we re-create them.
    const injectedScripts: HTMLScriptElement[] = [];
    const wrapper = document.createElement('div');
    wrapper.innerHTML = checkoutFormContent;

    Array.from(wrapper.childNodes).forEach((node) => {
      if (node.nodeName === 'SCRIPT') {
        const original = node as HTMLScriptElement;
        const script = document.createElement('script');
        if (original.src) script.src = original.src;
        if (original.type) script.type = original.type;
        script.text = original.text;
        container.appendChild(script);
        injectedScripts.push(script);
      } else {
        container.appendChild(node);
      }
    });

    return () => {
      container.innerHTML = '';
      injectedScripts.forEach((s) => s.parentNode?.removeChild(s));
      // Remove the bundle.js tag iyzico appended to <head> so a fresh form can load it again.
      document
        .querySelectorAll('script[src*="static.iyzipay.com/checkoutform"]')
        .forEach((el) => el.parentNode?.removeChild(el));
      try {
        delete (window as unknown as { iyziInit?: unknown }).iyziInit;
      } catch {
        (window as unknown as { iyziInit?: unknown }).iyziInit = undefined;
      }
    };
  }, [checkoutFormContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Payment is now handled by iyzico Checkout Form
    // This function is kept for form compatibility but shouldn't be called directly
  };


  // ─────────────────────────────────────────────────────────────
  // Görünüm: sıfırdan, mobil öncelikli monokrom tasarım
  // ─────────────────────────────────────────────────────────────

  const inputCls =
    'h-12 w-full bg-[#0F0F0F] border-white/12 focus:border-white/40 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg text-white placeholder:text-white/25 text-[14px]';

  const summaryRows = (
    <div className="space-y-2 text-[13px]">
      <div className="flex justify-between gap-3">
        <span className="text-white/50">Ara Toplam</span>
        <span className="text-white tabular-nums" data-testid="text-subtotal">{subtotal.toLocaleString('tr-TR')} ₺</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between gap-3">
          <span className="text-white/50 flex items-center gap-1.5 min-w-0">
            <Tag className="w-3 h-3 shrink-0" />
            <span className="truncate">İndirim ({appliedCoupon?.code})</span>
          </span>
          <span className="text-white tabular-nums" data-testid="text-discount">-{discount.toLocaleString('tr-TR')} ₺</span>
        </div>
      )}
      <div className="flex justify-between gap-3">
        <span className="text-white/50">Kargo</span>
        <span className="text-white tabular-nums" data-testid="text-shipping">
          {shippingCost === 0 ? 'ÜCRETSİZ' : `${shippingCost.toLocaleString('tr-TR')} ₺`}
        </span>
      </div>
      {bankTransferDiscount > 0 && (
        <div className="flex justify-between gap-3">
          <span className="text-white/50">Havale İndirimi (%{bankInfo.discountPercent})</span>
          <span className="text-white tabular-nums" data-testid="text-bank-transfer-discount">-{bankTransferDiscount.toLocaleString('tr-TR')} ₺</span>
        </div>
      )}
      <div className="h-px bg-white/10 my-1" />
      <div className="flex justify-between items-end gap-3 pt-0.5">
        <span className="text-white font-bold text-[14px]">Toplam</span>
        <span className="text-white font-bold text-[19px] leading-none tabular-nums" data-testid="text-total">
          {finalTotal.toLocaleString('tr-TR')} ₺
        </span>
      </div>
    </div>
  );

  const couponBox = appliedCoupon ? (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 bg-white/8 border border-white/20 rounded-lg px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Tag className="w-4 h-4 text-white/70 shrink-0" />
          <span className="text-[13px] font-semibold text-white truncate">{appliedCoupon.code}</span>
        </div>
        <button
          type="button"
          onClick={handleRemoveCoupon}
          className="text-white/45 hover:text-white transition-colors shrink-0"
          data-testid="button-remove-coupon"
          aria-label="Kuponu kaldır"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {appliedCoupon.freeShipping && (
        <p className="flex items-center gap-1.5 text-[11.5px] text-white/60">
          <Truck className="w-3.5 h-3.5" /> Ücretsiz kargo kuponu uygulandı
        </p>
      )}
      {appliedCoupon.isInfluencerCode && appliedCoupon.influencerInstagram && (
        <p className="flex items-center gap-1.5 text-[11.5px] text-white/60">
          <Instagram className="w-3.5 h-3.5" />
          <a
            href={`https://instagram.com/${appliedCoupon.influencerInstagram.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:underline underline-offset-2"
            data-testid="link-influencer-instagram"
          >
            {appliedCoupon.influencerInstagram}
          </a>
          koduyla alışveriş yapıyorsunuz
        </p>
      )}
    </div>
  ) : (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
          <Input
            value={couponCode}
            onChange={(e) => {
              setCouponCode(e.target.value.toUpperCase());
              setCouponError('');
            }}
            placeholder="Kupon kodu"
            className="h-11 pl-9 bg-[#0F0F0F] border-white/12 focus:border-white/40 focus-visible:ring-0 focus-visible:ring-offset-0 uppercase text-white placeholder:text-white/25 rounded-lg text-[13px]"
            data-testid="input-coupon-code"
          />
        </div>
        <Button
          type="button"
          onClick={handleApplyCoupon}
          disabled={couponLoading || !couponCode.trim()}
          className="h-11 px-4 bg-white text-black hover:bg-white/90 font-bold rounded-lg text-[12px] shrink-0"
          data-testid="button-apply-coupon"
        >
          {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Uygula'}
        </Button>
      </div>
      {couponError && (
        <p className="text-[11.5px] text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {couponError}
        </p>
      )}
    </div>
  );

  const itemsList = (compact: boolean) => (
    <div className="space-y-3">
      {cartItemsWithProducts.map((item) => {
        // Satır fiyatı: varyant fiyatı (yoksa taban fiyat) + kişiselleştirme
        // ek ücreti — sepet sayfası ve useCart.subtotal ile aynı hesap.
        const persFee = item.personalizationText && item.product?.personalization?.enabled
          ? parseFloat(item.product.personalization.fee || '0') || 0
          : 0;
        const unitPrice = parseFloat(item.variant?.price || item.product?.basePrice || '0') + persFee;
        return (
        <div key={item.id} className="flex gap-3 items-center min-w-0">
          <div className={`${compact ? 'w-11 h-12' : 'w-14 h-16'} bg-white/8 rounded-md overflow-hidden shrink-0`}>
            {(() => {
              const src = pickThumbUrl(item.product?.images);
              if (!src) return null;
              return isVideoUrl(src)
                ? <video src={src} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                : <img src={src} alt={item.product?.name} className="w-full h-full object-cover" />;
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-medium text-white truncate">{item.product?.name || 'Ürün'}</p>
            {item.personalizationText && (
              <p className="text-[11px] text-white/45 mt-0.5 truncate">Kişiselleştirme: “{item.personalizationText}”</p>
            )}
            <p className="text-[11px] text-white/45 mt-0.5">Adet {item.quantity}</p>
          </div>
          <p className="text-[13px] font-bold text-white tabular-nums shrink-0">
            {(unitPrice * item.quantity).toLocaleString('tr-TR')} ₺
          </p>
        </div>
        );
      })}
    </div>
  );

  const trustRow = (
    <div className="grid grid-cols-3 gap-2 text-center">
      {[
        { icon: Shield, label: 'Güvenli Ödeme' },
        { icon: Truck, label: 'Hızlı Kargo' },
        { icon: RotateCcw, label: '14 Gün İade' },
      ].map(({ icon: Icon, label }) => (
        <div key={label} className="flex flex-col items-center gap-1.5 py-3 bg-[#111111] border border-white/8 rounded-lg min-w-0">
          <Icon className="w-4 h-4 text-white/50" strokeWidth={1.75} />
          <span className="text-[10px] text-white/55 leading-tight px-1">{label}</span>
        </div>
      ))}
    </div>
  );

  const stepBack = (to: number, extraCls = '') => (
    <Button
      type="button"
      variant="outline"
      onClick={() => setCurrentStep(to)}
      className={`h-12 border-white/15 bg-transparent hover:bg-white/5 text-white rounded-lg ${extraCls}`}
      data-testid={`button-back-step${to + 1}`}
    >
      Geri
    </Button>
  );

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] overflow-x-hidden">
        <SEO title="Ödeme" description="Sepetzen güvenli ödeme sayfası." url="/odeme" noIndex />
        <Header />
        <main className="pt-10 pb-16 px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-white flex items-center justify-center"
            >
              <Check className="w-10 h-10 text-black" strokeWidth={2.5} />
            </motion.div>
            <h1 className="font-display text-3xl sm:text-4xl tracking-wider text-white mb-3" data-testid="text-order-success">
              SİPARİŞİNİZ ALINDI
            </h1>
            <p className="text-white/55 text-sm mb-1.5">Siparişiniz başarıyla oluşturuldu.</p>
            <p className="text-base font-mono font-bold text-white mb-8">Sipariş No #{orderNumber}</p>

            <div className="bg-[#111111] border border-white/10 rounded-xl p-5 mb-6 text-left">
              <h3 className="font-display text-sm tracking-[0.12em] text-white/80 mb-4">SİPARİŞ DETAYLARI</h3>
              <div className="space-y-2.5 text-[13px]">
                <div className="flex justify-between gap-3">
                  <span className="text-white/50">E-posta</span>
                  <span className="text-white truncate">{formData.customerEmail}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/50">Teslimat</span>
                  <span className="text-white text-right">{formData.district}, {formData.city}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/50">Ödeme</span>
                  <span className="text-white">Kredi Kartı</span>
                </div>
                <div className="h-px bg-white/10 my-2" />
                <div className="flex justify-between font-bold text-white">
                  <span>Toplam</span>
                  <span className="tabular-nums">{(savedOrderTotal || total).toLocaleString('tr-TR')} ₺</span>
                </div>
              </div>
            </div>

            <p className="text-[12.5px] text-white/50 mb-6">
              Sipariş onayı <strong className="text-white/80">{formData.customerEmail}</strong> adresine gönderilecektir.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              {user && (
                <Link href="/hesabim" className="flex-1">
                  <Button className="w-full h-12 bg-white text-black hover:bg-white/90 font-bold tracking-wide rounded-lg">
                    SİPARİŞLERİM
                  </Button>
                </Link>
              )}
              <Link href="/" className="flex-1">
                <Button
                  variant="outline"
                  className="w-full h-12 border-white/15 bg-transparent hover:bg-white/5 text-white font-bold tracking-wide rounded-lg group"
                >
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
      <div className="min-h-screen bg-[#0A0A0A] overflow-x-hidden">
        <SEO title="Ödeme" description="Sepetzen güvenli ödeme sayfası." url="/odeme" noIndex />
        <Header />
        <main className="pt-12 pb-16 px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-sm mx-auto text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-[#141414] border border-white/10 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-white/40" />
            </div>
            <h1 className="font-display text-3xl tracking-wider text-white mb-3">SEPETİNİZ BOŞ</h1>
            <p className="text-white/55 text-sm mb-8">Ödeme yapabilmek için önce sepetinize ürün eklemelisiniz.</p>
            <Link href="/">
              <Button className="h-12 px-8 bg-white text-black hover:bg-white/90 font-bold tracking-wide rounded-lg group">
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
    <div className="min-h-screen bg-[#0A0A0A] overflow-x-hidden">
      <SEO title="Ödeme" description="Sepetzen güvenli ödeme sayfası." url="/odeme" noIndex />
      <Header />

      <main className="pt-6 lg:pt-10 pb-36 lg:pb-16">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 min-w-0">

          {/* ── Başlık ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-5">
            <p className="flex items-center justify-center gap-1.5 text-[10px] font-mono tracking-[0.3em] uppercase text-white/40 mb-2">
              <Lock className="w-3 h-3" /> Güvenli Ödeme
            </p>
            <h1 className="font-display text-[32px] sm:text-4xl leading-none tracking-wider text-white" data-testid="text-page-title">
              ÖDEME
            </h1>
          </motion.div>

          {/* ── Adım çubuğu ── */}
          <div className="max-w-md mx-auto mb-5">
            <div className="grid grid-cols-3 gap-2.5">
              {steps.map((step) => {
                const isActive = currentStep === step.id;
                const isDone = currentStep > step.id;
                const isLocked = step.id > currentStep + 1;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => goToStep(step.id)}
                    disabled={isLocked}
                    aria-current={isActive ? 'step' : undefined}
                    className={`min-w-0 text-left transition-opacity ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    data-testid={`step-${step.id}`}
                  >
                    <div className={`h-[3px] rounded-full mb-2 transition-colors ${isActive || isDone ? 'bg-white' : 'bg-white/15'}`} />
                    <p className="flex items-center gap-1 text-[9px] font-mono tracking-[0.18em] text-white/35 mb-0.5">
                      {isDone ? <Check className="w-3 h-3 text-white/70" strokeWidth={2.5} /> : <>0{step.id}</>}
                    </p>
                    <p
                      className={`text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.08em] truncate ${
                        isActive ? 'text-white' : isDone ? 'text-white/70' : 'text-white/35'
                      }`}
                    >
                      {step.title}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Mobil sipariş özeti ── */}
          <div className="lg:hidden mb-4 bg-[#111111] border border-white/10 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setMobileSummaryOpen((o) => !o)}
              aria-expanded={mobileSummaryOpen}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5"
              data-testid="button-mobile-summary-toggle"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <ShoppingBag className="w-4 h-4 text-white/50 shrink-0" />
                <span className="text-[13px] text-white/70 truncate">
                  Sipariş Özeti ({items.reduce((n, i) => n + i.quantity, 0)} ürün)
                </span>
                <ChevronRight
                  className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${mobileSummaryOpen ? 'rotate-90' : ''}`}
                />
              </span>
              <span className="text-[15px] font-bold text-white tabular-nums shrink-0" data-testid="text-mobile-summary-total">
                {finalTotal.toLocaleString('tr-TR')} ₺
              </span>
            </button>
            <AnimatePresence initial={false}>
              {mobileSummaryOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-3 border-t border-white/8 space-y-4">
                    {itemsList(true)}
                    {items.length > 0 && !checkoutFormContent && !paymentPageUrl && !paytrIframeUrl && (
                      <ComplementaryProducts
                        baseProductIds={items.map(i => i.productId)}
                        className="rounded-lg overflow-hidden"
                      />
                    )}
                    {couponBox}
                    {summaryRows}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="lg:grid lg:grid-cols-[1fr_350px] lg:gap-8 lg:items-start">

            {/* ── Sol: adım kartları ── */}
            <div className="min-w-0">
              <form onSubmit={handleSubmit}>
                <AnimatePresence mode="wait">

                  {/* ── ADIM 1 · İletişim ── */}
                  {currentStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -14 }}
                      className="bg-[#111111] border border-white/10 rounded-xl p-4 sm:p-6"
                    >
                      <div className="mb-5">
                        <h2 className="font-display text-[22px] leading-none tracking-wide text-white">İLETİŞİM BİLGİLERİ</h2>
                        {!user && (
                          <p className="text-[12px] text-white/45 mt-1.5">Hesap oluşturmadan misafir olarak devam edebilirsiniz.</p>
                        )}
                      </div>

                      {!user && (
                        <div className="mb-6">
                          <GoogleAuthButton label="Google ile Devam Et" testId="button-google-checkout" />
                          <p className="text-[12px] text-white/45 text-center -mt-1">
                            Zaten üye misiniz?{' '}
                            <Link href="/giris" className="text-white font-semibold hover:underline underline-offset-2">
                              Giriş yapın
                            </Link>{' '}
                            ve bilgileriniz otomatik dolsun.
                          </p>
                        </div>
                      )}

                      {stepErrors[1] && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <div className="text-[13px] text-red-400">
                              {stepErrors[1].map((err, i) => (
                                <p key={i}>{err}</p>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="customerName" className="text-[12px] font-medium text-white/70">Ad Soyad *</Label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <Input
                              id="customerName"
                              name="customerName"
                              value={formData.customerName}
                              onChange={handleChange}
                              data-testid="input-customerName"
                              className={`${inputCls} pl-10`}
                              placeholder="Adınız Soyadınız"
                            />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="customerEmail" className="text-[12px] font-medium text-white/70">E-posta *</Label>
                            <div className="relative">
                              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                              <Input
                                id="customerEmail"
                                name="customerEmail"
                                type="email"
                                value={formData.customerEmail}
                                onChange={handleChange}
                                data-testid="input-customerEmail"
                                className={`${inputCls} pl-10`}
                                placeholder="ornek@email.com"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="customerPhone" className="text-[12px] font-medium text-white/70">Telefon *</Label>
                            <div className="relative">
                              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                              <Input
                                id="customerPhone"
                                name="customerPhone"
                                type="tel"
                                value={formData.customerPhone}
                                onChange={handleChange}
                                data-testid="input-customerPhone"
                                className={`${inputCls} pl-10`}
                                placeholder="05XX XXX XX XX"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 hidden lg:block">
                        <Button
                          type="button"
                          onClick={handleNextStep}
                          className="w-full h-12 bg-white text-black hover:bg-white/90 font-bold tracking-[0.1em] text-[13px] rounded-lg group"
                          data-testid="button-next-step1"
                        >
                          DEVAM ET
                          <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── ADIM 2 · Teslimat ── */}
                  {currentStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -14 }}
                      className="bg-[#111111] border border-white/10 rounded-xl p-4 sm:p-6"
                    >
                      <div className="mb-5">
                        <h2 className="font-display text-[22px] leading-none tracking-wide text-white">TESLİMAT ADRESİ</h2>
                        <p className="text-[12px] text-white/45 mt-1.5">Siparişiniz bu adrese gönderilecek.</p>
                      </div>

                      {stepErrors[2] && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <div className="text-[13px] text-red-400">
                              {stepErrors[2].map((err, i) => (
                                <p key={i}>{err}</p>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {user && savedAddresses.length > 0 && !showNewAddressForm && (
                        <div className="space-y-3 mb-6">
                          <Label className="text-[12px] font-medium text-white/50">Kayıtlı Adreslerim</Label>
                          <div className="space-y-2">
                            {savedAddresses.map((addr) => (
                              <button
                                key={addr.id}
                                type="button"
                                onClick={() => handleSelectAddress(addr)}
                                className={`w-full text-left p-4 rounded-lg border transition-all ${
                                  selectedAddressId === addr.id
                                    ? 'border-white bg-white/5'
                                    : 'border-white/10 hover:border-white/25 bg-[#0F0F0F]'
                                }`}
                                data-testid={`address-option-${addr.id}`}
                              >
                                <div className="flex items-start justify-between gap-3 min-w-0">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[13.5px] font-semibold text-white truncate">{addr.title}</span>
                                      {addr.isDefault && (
                                        <span className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded shrink-0">Varsayılan</span>
                                      )}
                                    </div>
                                    <p className="text-[12.5px] text-white/50 truncate">{addr.firstName} {addr.lastName}</p>
                                    <p className="text-[12.5px] text-white/50 truncate">{addr.address}</p>
                                    <p className="text-[12.5px] text-white/50">{addr.district}, {addr.city}</p>
                                  </div>
                                  {selectedAddressId === addr.id && (
                                    <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
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
                              setFormData((prev) => ({
                                ...prev,
                                address: '',
                                city: '',
                                district: '',
                                postalCode: '',
                                country: 'Türkiye',
                              }));
                            }}
                            className="flex items-center gap-2 text-[13px] text-white/55 hover:text-white transition-colors"
                            data-testid="button-new-address"
                          >
                            <UserPlus className="w-4 h-4" />
                            Yeni Adres Ekle
                          </button>
                        </div>
                      )}

                      {(!user || savedAddresses.length === 0 || showNewAddressForm) && (
                        <div className="space-y-4">
                          {showNewAddressForm && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowNewAddressForm(false);
                                if (savedAddresses.length > 0) {
                                  const defaultAddr = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
                                  if (defaultAddr) handleSelectAddress(defaultAddr);
                                }
                              }}
                              className="flex items-center gap-2 text-[13px] text-white/55 hover:text-white transition-colors"
                            >
                              <ArrowRight className="w-4 h-4 rotate-180" />
                              Kayıtlı Adreslerime Dön
                            </button>
                          )}

                          <div className="space-y-1.5">
                            <Label htmlFor="address" className="text-[12px] font-medium text-white/70">Adres *</Label>
                            <Input
                              id="address"
                              name="address"
                              value={formData.address}
                              onChange={handleChange}
                              placeholder="Sokak, Mahalle, Bina No, Daire No"
                              data-testid="input-address"
                              className={inputCls}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            {formData.country === 'Türkiye' ? (
                              <CityDistrictSelect
                                city={formData.city}
                                district={formData.district}
                                onCityChange={(val) => { setFormData((prev) => ({ ...prev, city: val, district: '' })); setStepErrors({}); }}
                                onDistrictChange={(val) => { setFormData((prev) => ({ ...prev, district: val })); setStepErrors({}); }}
                                selectClassName="w-full h-12 bg-[#0F0F0F] border border-white/12 focus:border-white/40 focus:outline-none rounded-lg px-3 text-white text-[14px]"
                                labelClassName="text-[12px] font-medium text-white/70 block mb-1.5"
                                cityTestId="input-city"
                                districtTestId="input-district"
                              />
                            ) : (
                              <>
                                <div className="space-y-1.5 min-w-0">
                                  <Label htmlFor="city" className="text-[12px] font-medium text-white/70">İl *</Label>
                                  <Input id="city" name="city" value={formData.city} onChange={handleChange} data-testid="input-city" className={inputCls} placeholder="Şehir" />
                                </div>
                                <div className="space-y-1.5 min-w-0">
                                  <Label htmlFor="district" className="text-[12px] font-medium text-white/70">İlçe *</Label>
                                  <Input id="district" name="district" value={formData.district} onChange={handleChange} data-testid="input-district" className={inputCls} placeholder="İlçe / Bölge" />
                                </div>
                              </>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-1.5 min-w-0">
                              <Label htmlFor="postalCode" className="text-[12px] font-medium text-white/70">Posta Kodu</Label>
                              <Input
                                id="postalCode"
                                name="postalCode"
                                value={formData.postalCode}
                                onChange={handleChange}
                                data-testid="input-postalCode"
                                className={inputCls}
                                placeholder="34000"
                              />
                            </div>
                            <div className="space-y-1.5 min-w-0">
                              <Label htmlFor="country" className="text-[12px] font-medium text-white/70">Ülke *</Label>
                              <select
                                id="country"
                                name="country"
                                value={formData.country}
                                onChange={handleChange}
                                data-testid="select-country"
                                className="w-full h-12 bg-[#0F0F0F] border border-white/12 focus:border-white/40 focus:outline-none rounded-lg px-3 text-white text-[14px]"
                              >
                                {COUNTRIES.map((country) => (
                                  <option key={country} value={country} className="bg-[#141414]">
                                    {country}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {formData.country !== 'Türkiye' && (
                            <div className="p-3 bg-white/5 border border-white/15 rounded-lg">
                              <p className="text-[12.5px] text-white/70">
                                <strong className="text-white">Uluslararası Kargo:</strong>{' '}
                                {Number(baseShippingCost).toLocaleString('tr-TR')} ₺ kargo ücreti uygulanır.
                              </p>
                            </div>
                          )}

                          {/* Giriş yapmış kullanıcıya yeni adresi kaydetme seçeneği */}
                          {user && showNewAddressForm && (
                            <div className="space-y-2">
                              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-white/10 bg-[#0F0F0F] hover:bg-white/[0.02] transition-colors">
                                <input
                                  type="checkbox"
                                  checked={saveNewAddress}
                                  onChange={(e) => setSaveNewAddress(e.target.checked)}
                                  className="mt-0.5 w-5 h-5 border-white/20 bg-[#141414] rounded-md accent-white shrink-0"
                                  data-testid="checkbox-save-new-address"
                                />
                                <div>
                                  <span className="text-[13.5px] font-semibold text-white">Bu adresi kaydet</span>
                                  <p className="text-[11.5px] text-white/45 mt-0.5">Bir sonraki siparişinizde hızlıca seçebilirsiniz.</p>
                                </div>
                              </label>
                              <AnimatePresence>
                                {saveNewAddress && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-1 space-y-1.5">
                                      <Label htmlFor="newAddressTitle" className="text-[12px] font-medium text-white/70">Adres Başlığı</Label>
                                      <Input
                                        id="newAddressTitle"
                                        value={newAddressTitle}
                                        onChange={(e) => setNewAddressTitle(e.target.value)}
                                        placeholder="Ev, İş…"
                                        data-testid="input-new-address-title"
                                        className="w-full h-10 bg-[#0F0F0F] border border-white/12 focus:border-white/40 focus:outline-none rounded-lg px-3 text-white text-[14px] placeholder:text-white/30"
                                      />
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-6 border-t border-white/10 pt-5">
                        <InvoiceFields
                          value={invoiceInfo}
                          onChange={setInvoiceInfo}
                          open={invoiceOpen}
                          onOpenChange={setInvoiceOpen}
                          inputClassName="w-full h-12 bg-[#141414] border border-white/12 focus:border-white/40 focus:outline-none rounded-lg px-3 text-white text-[14px] placeholder:text-white/30"
                          testIdPrefix="checkout-invoice"
                        >
                          <label className="flex items-start gap-3 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={useSeparateBillingAddress}
                              onChange={(e) => setUseSeparateBillingAddress(e.target.checked)}
                              className="mt-0.5 w-5 h-5 border-white/20 bg-[#141414] rounded-md accent-white"
                              data-testid="checkbox-separate-billing-address"
                            />
                            <div>
                              <span className="text-[13.5px] font-semibold text-white">Fatura adresim farklı</span>
                              <p className="text-[11.5px] text-white/45 mt-0.5">Seçilmezse teslimat adresiniz fatura adresi olarak kullanılır.</p>
                            </div>
                          </label>

                        <AnimatePresence>
                          {useSeparateBillingAddress && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-5 p-4 bg-[#141414] border border-white/10 rounded-xl space-y-4">
                                <div>
                                  <h3 className="text-[13.5px] font-semibold text-white">FATURA ADRESİ</h3>
                                  <p className="text-[11.5px] text-white/45 mt-0.5">Faturanız bu adres bilgileriyle düzenlenecek.</p>
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor="billingAddress" className="text-[12px] font-medium text-white/70">Adres *</Label>
                                  <Input id="billingAddress" name="address" value={billingAddress.address} onChange={handleBillingAddressChange} placeholder="Sokak, Mahalle, Bina No, Daire No" data-testid="input-billing-address" className={inputCls} />
                                </div>
                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                  {billingAddress.country === 'Türkiye' ? (
                                    <CityDistrictSelect
                                      city={billingAddress.city}
                                      district={billingAddress.district}
                                      onCityChange={(val) => { setBillingAddress((prev) => ({ ...prev, city: val, district: '' })); setStepErrors({}); }}
                                      onDistrictChange={(val) => { setBillingAddress((prev) => ({ ...prev, district: val })); setStepErrors({}); }}
                                      selectClassName="w-full h-12 bg-[#0F0F0F] border border-white/12 focus:border-white/40 focus:outline-none rounded-lg px-3 text-white text-[14px]"
                                      labelClassName="text-[12px] font-medium text-white/70 block mb-1.5"
                                      cityTestId="input-billing-city"
                                      districtTestId="input-billing-district"
                                    />
                                  ) : (
                                    <>
                                      <div className="space-y-1.5 min-w-0">
                                        <Label htmlFor="billingCity" className="text-[12px] font-medium text-white/70">İl *</Label>
                                        <Input id="billingCity" name="city" value={billingAddress.city} onChange={handleBillingAddressChange} placeholder="Şehir" data-testid="input-billing-city" className={inputCls} />
                                      </div>
                                      <div className="space-y-1.5 min-w-0">
                                        <Label htmlFor="billingDistrict" className="text-[12px] font-medium text-white/70">İlçe *</Label>
                                        <Input id="billingDistrict" name="district" value={billingAddress.district} onChange={handleBillingAddressChange} placeholder="İlçe / Bölge" data-testid="input-billing-district" className={inputCls} />
                                      </div>
                                    </>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                  <div className="space-y-1.5 min-w-0">
                                    <Label htmlFor="billingPostalCode" className="text-[12px] font-medium text-white/70">Posta Kodu</Label>
                                    <Input id="billingPostalCode" name="postalCode" value={billingAddress.postalCode} onChange={handleBillingAddressChange} placeholder="34000" data-testid="input-billing-postal-code" className={inputCls} />
                                  </div>
                                  <div className="space-y-1.5 min-w-0">
                                    <Label htmlFor="billingCountry" className="text-[12px] font-medium text-white/70">Ülke *</Label>
                                    <select id="billingCountry" name="country" value={billingAddress.country} onChange={handleBillingAddressChange} data-testid="select-billing-country" className="w-full h-12 bg-[#141414] border border-white/12 focus:border-white/40 focus:outline-none rounded-lg px-3 text-white text-[14px]">
                                      {COUNTRIES.map((country) => <option key={country} value={country} className="bg-[#141414]">{country}</option>)}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        </InvoiceFields>
                      </div>

                      {/* Seçili adreste fatura bilgisi değiştiğinde güncelleme önerisi */}
                      <AnimatePresence>
                        {invoiceChangedFromSelection && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 flex items-center justify-between gap-3 p-3 rounded-lg border border-white/15 bg-[#0F0F0F]">
                              <p className="text-[12.5px] text-white/65">
                                Fatura bilgileri değiştirildi. Adresi güncellemek ister misiniz?
                              </p>
                              <button
                                type="button"
                                onClick={handleUpdateSelectedAddressInvoice}
                                disabled={addressSaving}
                                className="shrink-0 text-[12.5px] font-semibold text-white underline underline-offset-2 disabled:opacity-50"
                                data-testid="button-update-address-invoice"
                              >
                                {addressSaving ? 'Kaydediliyor…' : 'Güncelle'}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!user && (
                        <div className="mt-6 p-4 bg-[#0F0F0F] border border-white/12 rounded-xl">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={createAccount}
                              onChange={(e) => setCreateAccount(e.target.checked)}
                              className="mt-0.5 w-5 h-5 border-white/20 bg-[#141414] rounded-md accent-white"
                              data-testid="checkbox-create-account"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-white/60 shrink-0" />
                                <span className="text-[13.5px] font-semibold text-white">Üye olmak ister misiniz?</span>
                              </div>
                              <p className="text-[11.5px] text-white/45 mt-1 leading-relaxed">
                                Siparişlerinizi kolayca takip edin, adreslerinizi kaydedin ve kampanyalardan haberdar olun.
                              </p>
                            </div>
                          </label>

                          <AnimatePresence>
                            {createAccount && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="space-y-1.5 mt-4">
                                  <Label htmlFor="accountPassword" className="text-[12px] font-medium text-white/70">Şifre Belirleyin *</Label>
                                  <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    <Input
                                      id="accountPassword"
                                      type="password"
                                      value={accountPassword}
                                      onChange={(e) => setAccountPassword(e.target.value)}
                                      placeholder="En az 6 karakter"
                                      data-testid="input-account-password"
                                      className={`${inputCls} pl-10`}
                                      minLength={6}
                                    />
                                  </div>
                                  <p className="text-[11.5px] text-white/45">Sipariş tamamlandığında hesabınız otomatik oluşturulacak.</p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      <div className="flex gap-3 mt-6">
                        {stepBack(1, 'flex-1')}
                        <Button
                          type="button"
                          onClick={handleNextStep}
                          className="hidden lg:flex flex-1 h-12 bg-white text-black hover:bg-white/90 font-bold tracking-[0.1em] text-[13px] rounded-lg group"
                          data-testid="button-next-step2"
                        >
                          DEVAM ET
                          <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── ADIM 3 · Ödeme ── */}
                  {currentStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -14 }}
                      className="bg-[#111111] border border-white/10 rounded-xl p-4 sm:p-6"
                    >
                      <div className="mb-5">
                        <h2 className="font-display text-[22px] leading-none tracking-wide text-white">ÖDEME YÖNTEMİ</h2>
                        <p className="text-[12px] text-white/45 mt-1.5">Size uygun ödeme yöntemini seçin.</p>
                      </div>

                      <div
                        className={`grid mb-6 border border-white/15 rounded-lg overflow-hidden ${
                          [payMethods.iyzico, payMethods.paytr, payMethods.bankTransfer].filter(Boolean).length === 3
                            ? 'grid-cols-3'
                            : [payMethods.iyzico, payMethods.paytr, payMethods.bankTransfer].filter(Boolean).length === 2
                              ? 'grid-cols-2'
                              : 'grid-cols-1'
                        }`}
                      >
                        {payMethods.iyzico && (
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('card')}
                          className={`h-12 px-2 text-[11.5px] sm:text-[13px] font-bold tracking-wide transition-colors flex items-center justify-center gap-1.5 sm:gap-2 min-w-0 ${
                            paymentMethod === 'card' ? 'bg-white text-black' : 'bg-[#141414] text-white/60 hover:bg-[#1A1A1A]'
                          }`}
                          data-testid="tab-payment-card"
                        >
                          <CreditCard className="w-4 h-4 shrink-0" />
                          <span className="truncate">{payMethods.paytr ? 'KART' : 'KREDİ KARTI'}</span>
                        </button>
                        )}
                        {payMethods.paytr && (
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('card_paytr')}
                          className={`h-12 px-2 text-[11.5px] sm:text-[13px] font-bold tracking-wide transition-colors flex items-center justify-center gap-1.5 sm:gap-2 min-w-0 ${
                            paymentMethod === 'card_paytr' ? 'bg-white text-black' : 'bg-[#141414] text-white/60 hover:bg-[#1A1A1A]'
                          }`}
                          data-testid="tab-payment-paytr"
                        >
                          <CreditCard className="w-4 h-4 shrink-0" />
                          <span className="truncate">{payMethods.iyzico ? 'PAYTR' : 'KREDİ KARTI'}</span>
                        </button>
                        )}
                        {payMethods.bankTransfer && (
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('bank_transfer')}
                          className={`h-12 px-2 text-[11.5px] sm:text-[13px] font-bold tracking-wide transition-colors flex items-center justify-center gap-1.5 sm:gap-2 min-w-0 ${
                            paymentMethod === 'bank_transfer' ? 'bg-white text-black' : 'bg-[#141414] text-white/60 hover:bg-[#1A1A1A]'
                          }`}
                          data-testid="tab-payment-bank-transfer"
                        >
                          <span className="truncate">HAVALE</span>
                          {bankInfo.discountPercent > 0 && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              paymentMethod === 'bank_transfer' ? 'bg-black text-white' : 'bg-white/12 text-white'
                            }`}
                          >
                            %{bankInfo.discountPercent}
                          </span>
                          )}
                        </button>
                        )}
                      </div>

                      {paymentError && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <div className="text-[13px] text-red-400">{paymentError}</div>
                          </div>
                        </div>
                      )}

                      {paymentMethod === 'bank_transfer' ? (
                        <div className="space-y-4" data-testid="bank-transfer-panel">
                          <div className="bg-white/5 border border-white/15 rounded-lg p-4">
                            <p className="text-[13.5px] font-bold text-white">Havale ile %{bankInfo.discountPercent} indirim kazandınız</p>
                            <p className="text-[12px] text-white/55 mt-1 leading-relaxed">
                              Aşağıdaki banka bilgilerine ödemenizi yaptıktan sonra siparişiniz onaylanıp hazırlığa alınır.
                            </p>
                          </div>

                          <div className="border border-white/10 rounded-lg p-4 space-y-3">
                            <h3 className="font-display text-[13px] tracking-[0.14em] text-white/80">BANKA BİLGİLERİ</h3>
                            <div className="space-y-2.5">
                              {[
                                { key: 'bank' as const, label: 'Banka', value: bankInfo.bankName, testId: 'bank-name' },
                                { key: 'holder' as const, label: 'Hesap Sahibi', value: bankInfo.accountHolder, testId: 'bank-holder' },
                                { key: 'iban' as const, label: 'IBAN', value: bankInfo.iban, testId: 'bank-iban', mono: true },
                              ].map(({ key, label, value, testId, mono }) => (
                                <div key={key} className="min-w-0">
                                  <p className="text-[11px] text-white/45 mb-0.5">{label}</p>
                                  <div className="flex items-center justify-between gap-2 min-w-0">
                                    <span
                                      className={`text-white font-semibold break-all text-[13px] ${mono ? 'font-mono' : ''}`}
                                      data-testid={`text-${testId}`}
                                    >
                                      {value}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => copyBankField(key, value)}
                                      className="p-1.5 text-white/45 hover:text-white hover:bg-white/5 transition-colors rounded shrink-0"
                                      aria-label={`${label} kopyala`}
                                      data-testid={`button-copy-${testId}`}
                                    >
                                      {copiedField === key ? (
                                        <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
                                      ) : (
                                        <ClipboardCheck className="w-4 h-4" strokeWidth={2} />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {copiedField && (
                                <p className="text-[11px] text-white font-medium" data-testid="text-copied-feedback">
                                  Kopyalandı
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="bg-[#0F0F0F] border border-white/8 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between text-[13px]">
                              <span className="text-white/50">Sipariş Toplamı</span>
                              <span className="text-white/60 line-through tabular-nums">{total.toLocaleString('tr-TR')} ₺</span>
                            </div>
                            <div className="flex justify-between text-[13px]">
                              <span className="text-white">Havale İndirimi (%{bankInfo.discountPercent})</span>
                              <span className="text-white tabular-nums" data-testid="text-bank-discount">
                                -{bankTransferDiscount.toLocaleString('tr-TR')} ₺
                              </span>
                            </div>
                            <div className="h-px bg-white/10" />
                            <div className="flex justify-between items-end">
                              <span className="font-bold text-white text-[14px]">Ödenecek Tutar</span>
                              <span className="font-bold text-[22px] leading-none text-white tabular-nums" data-testid="text-bank-final-total">
                                {finalTotal.toLocaleString('tr-TR')} ₺
                              </span>
                            </div>
                          </div>

                          <p className="text-[11.5px] text-white/45 leading-relaxed">
                            Ödemeniz banka hesabımıza geçtikten sonra siparişiniz onaylanır ve hazırlığa alınır.
                          </p>

                          <div className="flex gap-3 pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setCurrentStep(2)}
                              className="flex-1 h-12 border-white/15 bg-transparent hover:bg-white/5 text-white rounded-lg"
                              data-testid="button-bank-back"
                            >
                              Geri
                            </Button>
                            <Button
                              type="button"
                              onClick={handleBankTransferSubmit}
                              disabled={bankTransferLoading}
                              className="hidden lg:flex flex-[2] h-12 bg-white text-black hover:bg-white/90 font-bold tracking-wide rounded-lg"
                              data-testid="button-bank-confirm"
                            >
                              {bankTransferLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>SİPARİŞİ ONAYLA ({finalTotal.toLocaleString('tr-TR')} ₺)</>
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : paymentMethod === 'card_paytr' ? (
                        paytrIframeUrl ? (
                          <div className="space-y-4" data-testid="paytr-panel">
                            <div className="bg-white rounded-lg overflow-hidden">
                              <iframe
                                src={paytrIframeUrl}
                                title="PayTR Güvenli Ödeme"
                                className="w-full block"
                                style={{ minHeight: '680px', border: 0 }}
                                allow="payment *"
                                data-testid="paytr-payment-iframe"
                              />
                            </div>

                            <div className="flex items-center justify-between gap-3 text-[11.5px]">
                              <div className="flex items-center gap-1.5 text-white/55 min-w-0">
                                <Lock className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">256-bit SSL, PayTR güvencesiyle</span>
                              </div>
                              <a
                                href={paytrIframeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white/70 hover:text-white underline underline-offset-2 shrink-0"
                                data-testid="link-paytr-newtab"
                              >
                                Yeni sekmede aç
                              </a>
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setPaytrIframeUrl(null);
                                setCheckoutFormContent(null);
                                setPaymentPageUrl(null);
                                setMerchantOid(null);
                                setPaymentError(null);
                                setCurrentStep(2);
                              }}
                              className="w-full h-12 border-white/15 bg-transparent hover:bg-white/5 text-white rounded-lg"
                            >
                              Bilgilerimi Düzenle
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-14">
                            <Loader2 className="w-8 h-8 animate-spin text-white/30 mb-4" />
                            <p className="text-white/50 text-sm">Ödeme formu yükleniyor...</p>
                          </div>
                        )
                      ) : paymentPageUrl ? (
                        <div className="space-y-4">
                          <div className="bg-white rounded-lg overflow-hidden">
                            <iframe
                              src={paymentPageUrl}
                              title="iyzico Güvenli Ödeme"
                              className="w-full block"
                              style={{ minHeight: '680px', border: 0 }}
                              allow="payment *"
                              data-testid="iyzico-payment-iframe"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-3 text-[11.5px]">
                            <div className="flex items-center gap-1.5 text-white/55 min-w-0">
                              <Lock className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">256-bit SSL, iyzico güvencesiyle</span>
                            </div>
                            <a
                              href={paymentPageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white/70 hover:text-white underline underline-offset-2 shrink-0"
                              data-testid="link-iyzico-newtab"
                            >
                              Yeni sekmede aç
                            </a>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setCheckoutFormContent(null);
                              setPaymentPageUrl(null);
                              setPaytrIframeUrl(null);
                              setMerchantOid(null);
                              setPaymentError(null);
                              setCurrentStep(2);
                            }}
                            className="w-full h-12 border-white/15 bg-transparent hover:bg-white/5 text-white rounded-lg"
                          >
                            Bilgilerimi Düzenle
                          </Button>
                        </div>
                      ) : checkoutFormContent ? (
                        <div className="space-y-4">
                          <div
                            ref={checkoutFormRef}
                            className="bg-white rounded-lg overflow-hidden"
                            style={{ minHeight: '500px' }}
                            data-testid="iyzico-checkout-form"
                          />

                          <div className="flex items-center gap-2 text-[11.5px] text-white/55">
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>Kart bilgileriniz 256-bit SSL ile iyzico güvencesinde şifrelenir.</span>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setCheckoutFormContent(null);
                              setPaymentPageUrl(null);
                              setPaytrIframeUrl(null);
                              setMerchantOid(null);
                              setPaymentError(null);
                              setCurrentStep(2);
                            }}
                            className="w-full h-12 border-white/15 bg-transparent hover:bg-white/5 text-white rounded-lg"
                          >
                            Bilgilerimi Düzenle
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-14">
                          <Loader2 className="w-8 h-8 animate-spin text-white/30 mb-4" />
                          <p className="text-white/50 text-sm">Ödeme formu yükleniyor...</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>

              {/* Güven satırı (mobil) */}
              <div className="mt-4 lg:hidden">{trustRow}</div>
            </div>

            {/* ── Sağ: sipariş özeti (masaüstü) ── */}
            <aside className="hidden lg:block sticky top-24 min-w-0">
              <div className="bg-[#111111] border border-white/10 rounded-xl p-5">
                <h2 className="font-display text-[17px] tracking-[0.1em] text-white mb-4">SİPARİŞ ÖZETİ</h2>

                <div className="pb-4 border-b border-white/8 max-h-56 overflow-y-auto pr-1">{itemsList(false)}</div>

                {/* Tamamlayıcı ürünler: son fırsat çapraz satış.
                    Ödeme oturumu (iyzico/PayTR) oluşturulduktan sonra gizlenir;
                    sepet değişirse oturum tutarıyla uyumsuzluk oluşurdu. */}
                {items.length > 0 && !checkoutFormContent && !paymentPageUrl && !paytrIframeUrl && (
                  <div className="py-4 border-b border-white/8">
                    <ComplementaryProducts
                      baseProductIds={items.map(i => i.productId)}
                      className="rounded-lg overflow-hidden"
                    />
                  </div>
                )}

                <div className="py-4 border-b border-white/8">{couponBox}</div>

                <div className="py-4">{summaryRows}</div>

                {shippingCost > 0 && remainingForFreeShipping > 0 && (
                  <div className="mb-4 p-3 bg-white/5 border border-white/12 rounded-lg">
                    <p className="text-[12px] text-white/70 mb-2">
                      <span className="font-bold text-white">{remainingForFreeShipping.toLocaleString('tr-TR')} TL</span> daha ekleyin, kargo ücretsiz olsun.
                    </p>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${shippingProgress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-white rounded-full"
                      />
                    </div>
                  </div>
                )}
                {shippingCost === 0 && isDomestic && (
                  <div className="mb-4 p-3 bg-white/5 border border-white/12 rounded-lg flex items-center gap-2">
                    <Truck className="w-4 h-4 text-white/70 shrink-0" />
                    <p className="text-[12px] text-white/70 font-medium">Ücretsiz kargo kazandınız</p>
                  </div>
                )}

                <div className="space-y-2.5 pt-4 border-t border-white/8">
                  {[
                    { icon: Shield, label: 'Güvenli Ödeme' },
                    { icon: Truck, label: 'Hızlı Teslimat (1 İş Günü)' },
                    { icon: RotateCcw, label: '14 Gün Ücretsiz İade' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2.5 text-[12px] text-white/50">
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* ── Mobil sabit buton (adım 1 ve 2) ── */}
      {(currentStep === 1 || currentStep === 2) && (
        <div
          className="fixed left-0 right-0 lg:hidden bg-[#111111]/98 backdrop-blur border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] z-[90]"
          style={{ bottom: 'var(--mobile-nav-total, 58px)' }}
        >
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10.5px] text-white/45 mb-0.5">Toplam</p>
              <p className="text-[17px] font-bold text-white leading-none tabular-nums">
                {finalTotal.toLocaleString('tr-TR')} ₺
              </p>
            </div>
            <button
              type="button"
              onClick={handleNextStep}
              className="flex-[1.5] h-12 bg-white text-black font-bold tracking-[0.08em] text-[13px] rounded-lg flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
              data-testid="button-next-mobile"
            >
              DEVAM ET
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Mobil sabit buton (adım 3, havale) ── */}
      {currentStep === 3 && paymentMethod === 'bank_transfer' && (
        <div
          className="fixed left-0 right-0 lg:hidden bg-[#111111]/98 backdrop-blur border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] z-[90]"
          style={{ bottom: 'var(--mobile-nav-total, 58px)' }}
        >
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10.5px] text-white/45 mb-0.5">Ödenecek (%{bankInfo.discountPercent} indirimli)</p>
              <p className="text-[17px] font-bold text-white leading-none tabular-nums">
                {finalTotal.toLocaleString('tr-TR')} ₺
              </p>
            </div>
            <button
              type="button"
              onClick={handleBankTransferSubmit}
              disabled={bankTransferLoading}
              className="flex-[1.6] h-12 bg-white text-black font-bold tracking-[0.06em] text-[12.5px] rounded-lg flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99] transition-transform"
              data-testid="button-bank-confirm-mobile"
            >
              {bankTransferLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SİPARİŞİ ONAYLA'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
