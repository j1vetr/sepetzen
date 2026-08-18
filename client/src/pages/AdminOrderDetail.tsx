import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'wouter';
import {
  ChevronLeft,
  Package,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  User,
  MapPin,
  Phone,
  Mail,
  Tag,
  Hash,
  Calendar,
  MessageSquare,
  ExternalLink,
  Loader2,
  Banknote,
  CheckCircle2,
  Send,
  RefreshCw,
  Printer,
} from 'lucide-react';
import {
  Card,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  StatusBadge,
  FormField,
  TextInput,
  TextArea,
  SectionHeading,
  InlineAlert,
  SelectInput,
} from './admin/_ui/AdminUI';
import AdminModal from './admin/_ui/AdminModal';
import { BANK_TRANSFER_INFO } from '@shared/bankInfo';
import { formatTRDateTime } from '@shared/dateFormat';

/** Sipariş üzerinde kayıtlı kargo sağlayıcısının okunur adı. */
const SHIPMENT_PROVIDER_LABELS: Record<string, string> = {
  geliver: 'Geliver',
  aras: 'Aras Kargo',
  shipentegra: 'ShipEntegra',
};

/** Gönderi aşama satırı: tamamlandı (yeşil), bekleniyor (dönen ikon) veya pasif. */
function ShipmentStep({
  state,
  label,
  detail,
}: {
  state: 'done' | 'waiting' | 'idle';
  label: string;
  detail: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 px-3 py-2">
      {state === 'done' ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
      ) : state === 'waiting' ? (
        <Loader2 className="w-4 h-4 text-amber-500 animate-spin shrink-0 mt-0.5" />
      ) : (
        <Clock className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
      )}
      <div className="min-w-0">
        <div className={`text-[12px] font-semibold ${state === 'idle' ? 'text-neutral-400' : 'text-neutral-900'}`}>
          {label}
        </div>
        <div className={`text-[11px] leading-4 ${state === 'idle' ? 'text-neutral-400' : 'text-neutral-500'}`}>
          {detail}
        </div>
      </div>
    </div>
  );
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantDetails?: string;
  sku?: string;
  productImage?: string;
  /** Admin sipariş detayı API'si ürün adını linklemek için slug döndürür. */
  productSlug?: string | null;
  quantity: number;
  price: string;
  subtotal: string;
  /** Kişiselleştirme (isim yazdırma) yazısı ve birim ek ücreti (fiyata dahil). */
  personalizationText?: string | null;
  personalizationFee?: string | null;
}

interface OrderNote {
  id: string;
  content: string;
  createdAt: string;
  authorId?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    address: string;
    city: string;
    district: string;
    postalCode: string;
    country?: string;
  };
  billingAddress?: {
    address: string;
    city: string;
    district: string;
    postalCode: string;
    country?: string;
    invoiceType?: 'individual' | 'corporate' | null;
    tcknNumber?: string | null;
    companyName?: string | null;
    taxOffice?: string | null;
    taxNumber?: string | null;
  } | null;
  subtotal: string;
  shippingCost: string;
  discountAmount: string;
  couponCode?: string;
  total: string;
  status: string;
  paymentMethod?: string | null;
  paymentStatus: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingCarrier?: string;
  shipmentProvider?: string | null;
  shipmentId?: string | null;
  shipmentLabelUrl?: string | null;
  createdAt: string;
  items: OrderItem[];
}

type StatusTone = 'neutral' | 'amber' | 'blue' | 'indigo' | 'emerald' | 'red' | 'orange';

const statusOptions: {
  value: string;
  label: string;
  tone: StatusTone;
  icon: React.ElementType;
}[] = [
  { value: 'confirmed', label: 'Yeni Sipariş', tone: 'orange', icon: Banknote },
  { value: 'pending', label: 'Beklemede', tone: 'amber', icon: Clock },
  { value: 'processing', label: 'Hazırlanıyor', tone: 'blue', icon: Package },
  { value: 'shipped', label: 'Kargoya Verildi', tone: 'indigo', icon: Truck },
  { value: 'completed', label: 'Tamamlandı', tone: 'emerald', icon: CheckCircle2 },
  { value: 'delivered', label: 'Teslim Edildi', tone: 'emerald', icon: CheckCircle },
  { value: 'cancelled', label: 'İptal Edildi', tone: 'red', icon: XCircle },
];

function formatCurrency(amount: string | number): string {
  return Number(amount).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-pulse">
        <div className="h-3 w-32 rounded bg-neutral-200 mb-5" />
        <div className="bg-white border border-neutral-200 rounded-lg p-5 mb-5">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-48 rounded bg-neutral-100" />
              <div className="h-3 w-36 rounded bg-neutral-100" />
            </div>
            <div className="h-5 w-24 rounded-full bg-neutral-100" />
          </div>
        </div>
        <div className="grid lg:grid-cols-[1fr_320px] gap-5">
          <div className="space-y-5">
            <div className="bg-white border border-neutral-200 rounded-lg h-64" />
            <div className="bg-white border border-neutral-200 rounded-lg h-40" />
          </div>
          <div className="space-y-5">
            <div className="bg-white border border-neutral-200 rounded-lg h-32" />
            <div className="bg-white border border-neutral-200 rounded-lg h-44" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrderDetail() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [couponInfo, setCouponInfo] = useState<{
    isInfluencerCode: boolean;
    influencerInstagram?: string;
  } | null>(null);
  const [shipmentCreating, setShipmentCreating] = useState(false);
  const [shipmentQuerying, setShipmentQuerying] = useState(false);
  const [shipmentMessage, setShipmentMessage] = useState<{ type: 'success' | 'error' | 'warn'; text: string } | null>(null);
  const [shipmentAlreadySent, setShipmentAlreadySent] = useState(false);
  const [shipmentDesi, setShipmentDesi] = useState('');
  const [shipmentWeightKg, setShipmentWeightKg] = useState('');
  // Son takip sorgusundan gelen kargo durumu (aşama göstergesinde kullanılır)
  const [shipmentStatusInfo, setShipmentStatusInfo] = useState<{ statusText?: string; delivered?: boolean } | null>(null);
  const autoPollCount = useRef(0);
  const statusRequestInFlight = useRef(false);
  const [carrier, setCarrier] = useState<{ id: string; label: string; enabled: boolean; configured: boolean; missing?: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/admin/orders/${params.id}`, {
          credentials: 'include',
        });
        if (!res.ok) {
          if (!cancelled) setLoadError('Sipariş bulunamadı.');
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setOrder(data);
        setStatus(data.status);
        setTrackingNumber(data.trackingNumber || '');
        setTrackingUrl(data.trackingUrl || '');

        if (data.couponCode) {
          const couponRes = await fetch(
            `/api/admin/coupons/by-code/${data.couponCode}`,
            { credentials: 'include' },
          );
          if (couponRes.ok && !cancelled) {
            const couponData = await couponRes.json();
            setCouponInfo(couponData);
          }
        }
      } catch (error) {
        console.error('Failed to fetch order:', error);
        if (!cancelled) setLoadError('Sipariş yüklenemedi.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    const fetchNotes = async () => {
      try {
        const res = await fetch(`/api/admin/orders/${params.id}/notes`, {
          credentials: 'include',
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setNotes(data);
        }
      } catch (error) {
        console.error('Failed to fetch notes:', error);
      }
    };

    fetchOrder();
    fetchNotes();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const handleStatusUpdate = async () => {
    if (!order) return;
    setIsUpdating(true);
    try {
      const payload: Record<string, unknown> = { status };
      if (status === 'shipped' && trackingNumber) {
        payload.trackingNumber = trackingNumber;
      }
      await fetch(`/api/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      setOrder({ ...order, status });
    } catch (error) {
      console.error('Status update failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTrackingUpdate = async () => {
    if (!order) return;
    setIsUpdating(true);
    try {
      // Aras için firma takip linki üretilir; diğer sağlayıcılarda link boş
      // bırakılırsa müşteriye kendi sipariş takip sayfamız gönderilir.
      const finalTrackingUrl =
        trackingUrl ||
        (carrier?.id === 'aras' || !carrier
          ? `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${trackingNumber}`
          : '');

      await fetch(`/api/admin/orders/${order.id}/tracking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingNumber,
          trackingUrl: finalTrackingUrl,
          shippingCarrier: order.shippingCarrier || carrierLabel,
        }),
        credentials: 'include',
      });

      let newStatus = status;
      if (status !== 'shipped' && status !== 'delivered') {
        await fetch(`/api/admin/orders/${order.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'shipped' }),
          credentials: 'include',
        });
        newStatus = 'shipped';
        setStatus('shipped');
      }

      setOrder({
        ...order,
        status: newStatus,
        trackingNumber,
        trackingUrl: finalTrackingUrl,
      });
    } catch (error) {
      console.error('Tracking update failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Aktif kargo sağlayıcısını (Aras / Geliver / ShipEntegra) öğren
  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/shipping/providers', { credentials: 'include' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !data?.active) return;
        setCarrier(data.active);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const carrierLabel = carrier?.label || 'Kargo';

  const handleShipmentCreate = async (force = false) => {
    if (!order) return;
    setShipmentCreating(true);
    setShipmentMessage(null);
    setShipmentAlreadySent(false);
    try {
      const url = `/api/admin/orders/${order.id}/shipment/create${force ? '?force=1' : ''}`;
      const body: Record<string, string> = {};
      if (shipmentDesi.trim()) body.desi = shipmentDesi.trim();
      if (shipmentWeightKg.trim()) body.weightKg = shipmentWeightKg.trim();
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const label = data.providerLabel || carrierLabel;
      if (data.success) {
        setShipmentMessage({
          type: 'success',
          text: data.trackingNumber
            ? `${label} gönderisi oluşturuldu. Takip no: ${data.trackingNumber}`
            : `${label} sistemine kayıt gönderildi. Takip numarası oluştuğunda "Takip Durumu" ile çekebilirsiniz.`,
        });
        setNotes((prev) => [{
          id: Date.now().toString(),
          content: `${label} gönderi kaydı oluşturuldu.${data.shipmentId ? ` Gönderi kimliği: ${data.shipmentId}` : ''}`,
          createdAt: new Date().toISOString(),
        }, ...prev]);
        setOrder(prev => prev ? {
          ...prev,
          shipmentProvider: data.provider,
          shipmentId: data.shipmentId ?? prev.shipmentId,
          shipmentLabelUrl: data.labelUrl ?? prev.shipmentLabelUrl,
          ...(data.trackingNumber ? { trackingNumber: data.trackingNumber, status: 'shipped' } : {}),
        } as Order : prev);
        if (data.trackingNumber) {
          setTrackingNumber(data.trackingNumber);
          setStatus('shipped');
        }
      } else if (data.alreadySent) {
        setShipmentAlreadySent(true);
        setShipmentMessage({ type: 'warn', text: data.error || 'Bu sipariş için daha önce kargo kaydı oluşturuldu.' });
      } else {
        setShipmentMessage({ type: 'error', text: data.error || 'Kargo gönderisi oluşturulamadı' });
      }
    } catch {
      setShipmentMessage({ type: 'error', text: 'Bağlantı hatası. Lütfen tekrar deneyin.' });
    } finally {
      setShipmentCreating(false);
    }
  };

  const queryShipmentStatus = async (opts: { silent?: boolean } = {}) => {
    if (!order) return;
    const silent = !!opts.silent;
    if (statusRequestInFlight.current) return;
    statusRequestInFlight.current = true;
    if (!silent) {
      setShipmentQuerying(true);
      setShipmentMessage(null);
    }
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/shipment/status`, { credentials: 'include' });
      const data = await res.json();
      const label = data.providerLabel || carrierLabel;
      if (data.success && data.found) {
        setShipmentStatusInfo({ statusText: data.statusText, delivered: !!data.delivered });
        if (data.trackingNumber && !order.trackingNumber) {
          setTrackingNumber(data.trackingNumber);
          setStatus('shipped');
          setOrder(prev => prev ? {
            ...prev,
            trackingNumber: data.trackingNumber,
            trackingUrl: data.trackingUrl ?? prev.trackingUrl,
            status: 'shipped',
            ...(data.labelUrl ? { shipmentLabelUrl: data.labelUrl } : {}),
          } as Order : prev);
          if (silent) {
            setShipmentMessage({ type: 'success', text: `Takip numarası otomatik alındı ve siparişe kaydedildi: ${data.trackingNumber}` });
          }
        } else if (data.labelUrl) {
          setOrder(prev => prev ? { ...prev, shipmentLabelUrl: data.labelUrl } as Order : prev);
        }
        if (data.delivered) {
          setStatus('delivered');
          setOrder(prev => prev ? { ...prev, status: 'delivered' } as Order : prev);
        }
        if (!silent) {
          const parts = [
            data.trackingNumber && `Takip no: ${data.trackingNumber}`,
            data.statusText && `Durum: ${data.statusText}`,
            data.deliveredAt && `Teslim: ${data.deliveredAt}`,
          ].filter(Boolean);
          setShipmentMessage({
            type: 'success',
            text: (data.savedToOrder ? 'Takip bilgisi siparişe kaydedildi. ' : '') + (parts.join(' - ') || `${label} kaydı bulundu.`),
          });
        }
      } else if (silent) {
        // Otomatik sorguda hata mesajıyla ekranı meşgul etme; aşama göstergesi zaten "bekleniyor" der
      } else if (data.success && !data.found) {
        setShipmentMessage({ type: 'warn', text: data.error || `${label} tarafında takip numarası henüz oluşmadı. Birkaç dakika içinde otomatik denenecek.` });
      } else {
        setShipmentMessage({ type: 'error', text: data.error || 'Kargo durumu sorgulanamadı' });
      }
    } catch {
      if (!silent) setShipmentMessage({ type: 'error', text: 'Bağlantı hatası. Lütfen tekrar deneyin.' });
    } finally {
      statusRequestInFlight.current = false;
      if (!silent) setShipmentQuerying(false);
    }
  };

  const handleShipmentStatus = () => queryShipmentStatus();

  // Gönderi kaydı var ama takip numarası henüz yoksa arayüz kendiliğinden sorgular
  // (5 sn sonra ilk deneme, sonra 20 sn'de bir, en fazla 15 deneme)
  useEffect(() => {
    if (!order?.shipmentId || order.trackingNumber) return;
    if (order.status === 'cancelled') return;
    autoPollCount.current = 0;
    const first = setTimeout(() => queryShipmentStatus({ silent: true }), 5_000);
    const timer = setInterval(() => {
      autoPollCount.current += 1;
      if (autoPollCount.current > 15) {
        clearInterval(timer);
        return;
      }
      queryShipmentStatus({ silent: true });
    }, 20_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, order?.shipmentId, order?.trackingNumber, order?.status]);

  const handleCancelOrder = async () => {
    if (!order) return;
    setIsUpdating(true);
    try {
      await fetch(`/api/admin/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
        credentials: 'include',
      });
      setStatus('cancelled');
      setOrder({ ...order, status: 'cancelled' });
      setShowCancelModal(false);
    } catch (error) {
      console.error('Cancel order failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmBankTransfer = async () => {
    if (!order) return;
    if (!window.confirm('Havale ödemesini onaylamak istediğinizden emin misiniz? Stok düşülecek ve müşteriye onay bildirimi gönderilecek.')) {
      return;
    }
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/confirm-bank-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Havale onaylanamadı');
      }
      const updated = await res.json();
      setOrder({ ...order, ...updated });
      setStatus(updated.status);
    } catch (error) {
      console.error('Confirm bank transfer failed:', error);
      window.alert((error as Error).message || 'Havale onaylanamadı');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectBankTransfer = async () => {
    if (!order) return;
    const reason = window.prompt('Reddetme sebebi (müşteri görmez, dahili not):', 'Havale alınamadı');
    if (reason === null) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/reject-bank-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Havale reddedilemedi');
      }
      const updated = await res.json();
      setOrder({ ...order, ...updated });
      setStatus(updated.status);
    } catch (error) {
      console.error('Reject bank transfer failed:', error);
      window.alert((error as Error).message || 'Havale reddedilemedi');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !order) return;
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
        credentials: 'include',
      });
      const note = await res.json();
      setNotes([note, ...notes]);
      setNewNote('');
    } catch (error) {
      console.error('Add note failed:', error);
    }
  };

  if (isLoading) return <DetailSkeleton />;

  if (loadError || !order) {
    return (
      <div className="admin-font min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-10 h-10 rounded-full bg-neutral-100 border border-neutral-200 mx-auto mb-3 flex items-center justify-center">
            <Package className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-[14px] font-semibold text-neutral-900 mb-1">
            {loadError || 'Sipariş bulunamadı'}
          </p>
          <p className="text-[12px] text-neutral-500 mb-4">
            Sipariş silinmiş ya da erişim izniniz olmayabilir.
          </p>
          <Link href="/toov-admin?tab=orders">
            <SecondaryButton data-testid="button-back-to-orders">
              <ChevronLeft className="w-3.5 h-3.5" />
              Siparişlere Dön
            </SecondaryButton>
          </Link>
        </Card>
      </div>
    );
  }

  const currentStatus =
    statusOptions.find((s) => s.value === status) || statusOptions[1];
  const StatusIcon = currentStatus.icon;
  const isTerminal = status === 'cancelled' || status === 'delivered' || status === 'completed';
  const canShip = !isTerminal;
  const canCancel = !isTerminal;
  const isInfluencer = order.couponCode && couponInfo?.isInfluencerCode;

  return (
    <div className="admin-font min-h-screen bg-neutral-50 pb-24 sm:pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back link */}
        <Link
          href="/toov-admin?tab=orders"
          className="inline-flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-neutral-900 mb-4 transition-colors"
          data-testid="link-back-to-orders"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Siparişlere Dön
        </Link>

        {/* Header block */}
        <Card className="p-5 sm:p-6 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <h1
                  className="text-[18px] sm:text-[20px] font-semibold tracking-tight text-neutral-900"
                  data-testid="text-order-number"
                >
                  Sipariş {order.orderNumber}
                </h1>
                <StatusBadge tone={currentStatus.tone}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {currentStatus.label}
                </StatusBadge>
                {order.paymentMethod === 'bank_transfer' && (
                  <span
                    className="inline-flex items-center gap-1 px-2 h-5 rounded-md bg-polen-orange/15 border border-polen-orange/40 text-[10.5px] font-semibold text-black uppercase tracking-wider"
                    data-testid="badge-bank-transfer"
                  >
                    🏦 Havale
                    {order.paymentStatus === 'awaiting_transfer' && ' · Bekliyor'}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-neutral-500 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="inline-flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {order.customerName}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatTRDateTime(order.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-neutral-700">
                  ₺{formatCurrency(order.total)}
                </span>
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              {canShip && (
                <SecondaryButton
                  onClick={() => {
                    const el = document.getElementById('shipping-section');
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  data-testid="button-jump-shipping"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Kargo Bilgisi
                </SecondaryButton>
              )}
            </div>
          </div>
        </Card>

        {/* Havale onay/red bandı */}
        {order.paymentMethod === 'bank_transfer' && order.paymentStatus === 'awaiting_transfer' && (
          <Card
            className="p-5 sm:p-6 mb-5 border-l-4 border-l-polen-orange bg-polen-orange/[0.06]"
            data-testid="card-bank-transfer-action"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 bg-polen-orange/20 flex items-center justify-center shrink-0 rounded-md">
                  <span className="text-xl">🏦</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-neutral-900 mb-0.5">
                    Havale Ödemesi Bekleniyor
                  </p>
                  <p className="text-[12px] text-neutral-600 leading-relaxed">
                    {BANK_TRANSFER_INFO.bankName} hesabınıza <span className="font-semibold text-neutral-900">₺{formatCurrency(order.total)}</span> tutarında ödeme geldiğinde onaylayın.
                    Onayda stok düşülür ve müşteriye sipariş onay bildirimi gönderilir.
                  </p>
                  <p className="text-[11px] text-neutral-500 font-mono mt-1.5">
                    IBAN: {BANK_TRANSFER_INFO.iban}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRejectBankTransfer}
                  disabled={isUpdating}
                  className="inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-md border border-red-200 bg-white text-red-700 hover:bg-red-50 text-[12px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  data-testid="button-reject-bank-transfer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reddet
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBankTransfer}
                  disabled={isUpdating}
                  className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-md bg-neutral-600 text-white hover:bg-neutral-700 text-[12px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  data-testid="button-confirm-bank-transfer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Havaleyi Onayla
                </button>
              </div>
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-[1fr_320px] gap-5">
          {/* LEFT COLUMN */}
          <div className="space-y-5">
            {/* Items + Summary */}
            <Card className="p-5">
              <SectionHeading
                title="Sipariş Kalemleri"
                description={`${order.items?.length ?? 0} ürün`}
              />
              <div className="space-y-2">
                {order.items?.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="flex gap-3 items-start py-3 border-b border-neutral-100 last:border-0"
                    data-testid={`row-order-item-${item.productId}`}
                  >
                    {item.productImage ? (
                      <div className="w-14 h-14 rounded-md overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-neutral-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {item.productSlug ? (
                        <Link
                          href={`/urun/${item.productSlug}`}
                          className="text-[13px] font-medium text-neutral-900 leading-tight hover:text-polen-orange hover:underline transition-colors"
                          data-testid={`link-product-${item.productId}`}
                        >
                          {item.productName}
                        </Link>
                      ) : (
                        <p className="text-[13px] font-medium text-neutral-900 leading-tight">
                          {item.productName}
                        </p>
                      )}
                      {item.variantDetails && (
                        <p className="text-[11px] text-neutral-500 mt-1">
                          {item.variantDetails}
                        </p>
                      )}
                      {item.personalizationText && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 mt-1 inline-block" data-testid={`text-personalization-${item.productId}`}>
                          Kişiselleştirme: “{item.personalizationText}”
                          {item.personalizationFee && parseFloat(item.personalizationFee) > 0 && (
                            <span className="text-amber-600"> (+₺{formatCurrency(item.personalizationFee)})</span>
                          )}
                        </p>
                      )}
                      {item.sku && (
                        <p className="text-[11px] text-neutral-400 mt-0.5 inline-flex items-center gap-1">
                          <Hash className="w-2.5 h-2.5" />
                          {item.sku}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[12px] text-neutral-500 tabular-nums">
                        {item.quantity} × ₺{formatCurrency(item.price)}
                      </p>
                      <p className="text-[13px] font-semibold text-neutral-900 tabular-nums mt-0.5">
                        ₺{formatCurrency(item.subtotal)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-neutral-100 space-y-1.5">
                <div className="flex justify-between text-[12px] text-neutral-600">
                  <span>Ara Toplam</span>
                  <span className="tabular-nums">
                    ₺{formatCurrency(order.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-[12px] text-neutral-600">
                  <span>Kargo</span>
                  <span className="tabular-nums">
                    ₺{formatCurrency(order.shippingCost || '0')}
                  </span>
                </div>
                {order.discountAmount && parseFloat(order.discountAmount) > 0 && (
                  <div className="flex justify-between text-[12px] text-neutral-700">
                    <span className="inline-flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      İndirim {order.couponCode && `(${order.couponCode})`}
                    </span>
                    <span className="tabular-nums">
                      −₺{formatCurrency(order.discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-[14px] font-semibold text-neutral-900 pt-2 mt-2 border-t border-neutral-100">
                  <span>Toplam</span>
                  <span className="tabular-nums" data-testid="text-order-total">
                    ₺{formatCurrency(order.total)}
                  </span>
                </div>
              </div>

              {isInfluencer && (
                <div className="mt-4">
                  <InlineAlert tone="neutral">
                    <span className="font-medium">Influencer kodu:</span>{' '}
                    {order.couponCode}
                    {couponInfo?.influencerInstagram && (
                      <a
                        href={`https://instagram.com/${couponInfo.influencerInstagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 inline-flex items-center gap-0.5 text-neutral-700 hover:text-neutral-900 underline underline-offset-2"
                      >
                        @{couponInfo.influencerInstagram.replace('@', '')}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </InlineAlert>
                </div>
              )}
            </Card>

            {/* Notes */}
            <Card className="p-5">
              <SectionHeading
                title="Notlar"
                description={
                  notes.length > 0
                    ? `${notes.length} not`
                    : 'Henüz not eklenmemiş'
                }
              />
              <div className="flex gap-2 mb-3">
                <TextInput
                  placeholder="Not ekle…"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddNote();
                  }}
                  data-testid="input-new-note"
                  className="flex-1"
                />
                <SecondaryButton
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  data-testid="button-add-note"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Ekle
                </SecondaryButton>
              </div>
              {notes.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-neutral-50 border border-neutral-200 rounded-md p-3"
                      data-testid={`note-${note.id}`}
                    >
                      <p className="text-[12.5px] text-neutral-800 leading-relaxed">
                        {note.content}
                      </p>
                      <p className="text-[10.5px] text-neutral-400 mt-1.5">
                        {formatTRDateTime(note.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-neutral-400 italic">
                  Bu siparişe ait not bulunmuyor.
                </p>
              )}
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-5">
            {/* Customer */}
            <Card className="p-5">
              <SectionHeading title="Müşteri" />
              <div className="space-y-2">
                <p className="text-[13px] font-medium text-neutral-900">
                  {order.customerName}
                </p>
                <a
                  href={`mailto:${order.customerEmail}`}
                  className="text-[12px] text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5 truncate"
                  data-testid="link-customer-email"
                >
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{order.customerEmail}</span>
                </a>
                <a
                  href={`tel:${order.customerPhone}`}
                  className="text-[12px] text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5"
                  data-testid="link-customer-phone"
                >
                  <Phone className="w-3 h-3 shrink-0" />
                  {order.customerPhone}
                </a>
              </div>
            </Card>

            <Card className="p-5">
              <SectionHeading
                title="Teslimat Adresi"
              />
              <div className="text-[12.5px] text-neutral-700 space-y-1 leading-relaxed">
                <p className="flex items-start gap-1.5">
                  <MapPin className="w-3 h-3 text-neutral-400 mt-1 shrink-0" />
                  <span>{order.shippingAddress?.address}</span>
                </p>
                <p className="text-neutral-500 ml-[18px]">
                  {order.shippingAddress?.district}, {order.shippingAddress?.city}
                  {order.shippingAddress?.postalCode &&
                    ` · ${order.shippingAddress.postalCode}`}
                </p>
                {order.shippingAddress?.country &&
                  !['türkiye', 'turkiye', 'turkey', 'tr'].includes(order.shippingAddress.country.toLowerCase()) && (
                  <p className="ml-[18px] inline-flex items-center gap-1 text-[11px] font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 w-fit">
                    🌍 Yurt dışı · {order.shippingAddress.country}
                  </p>
                )}
              </div>
              {order.billingAddress && (
                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <SectionHeading title="Fatura Adresi" />
                  <div className="text-[12.5px] text-neutral-700 space-y-1 leading-relaxed">
                    <p className="flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 text-neutral-400 mt-1 shrink-0" />
                      <span>{order.billingAddress.address}</span>
                    </p>
                    <p className="text-neutral-500 ml-[18px]">
                      {order.billingAddress.district}, {order.billingAddress.city}
                      {order.billingAddress.postalCode && ` · ${order.billingAddress.postalCode}`}
                    </p>
                    {order.billingAddress.invoiceType === 'corporate' ? (
                      <div className="ml-[18px] pt-1 text-neutral-600">
                        <p className="font-medium text-neutral-800">Kurumsal · {order.billingAddress.companyName}</p>
                        <p>{order.billingAddress.taxOffice} · VKN {order.billingAddress.taxNumber}</p>
                      </div>
                    ) : (
                      <p className="ml-[18px] pt-1 text-neutral-500">
                        Bireysel{order.billingAddress.tcknNumber ? ` · TCKN ${order.billingAddress.tcknNumber}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* Status */}
            <Card className="p-5">
              <SectionHeading title="Sipariş Durumu" />
              <div className="space-y-2">
                <SelectInput
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={status === 'cancelled'}
                  className="w-full"
                  data-testid="select-order-status"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </SelectInput>
                <PrimaryButton
                  onClick={handleStatusUpdate}
                  disabled={
                    isUpdating || status === order.status || status === 'cancelled'
                  }
                  className="w-full"
                  data-testid="button-update-status"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Güncelleniyor…
                    </>
                  ) : (
                    'Durumu Güncelle'
                  )}
                </PrimaryButton>
              </div>
            </Card>

            {/* Shipping - aktif sağlayıcı (Aras / Geliver / ShipEntegra) */}
            <div id="shipping-section">
            <Card className="p-5">
              <SectionHeading
                title={carrierLabel}
                description="API ile otomatik gönderi oluştur veya takip numarasını elle gir."
              />
              <div className="space-y-2.5">

                {carrier && (!carrier.enabled || !carrier.configured) && (
                  <div className="text-[11.5px] px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800" data-testid="text-provider-warning">
                    {!carrier.enabled
                      ? `${carrier.label} entegrasyonu kapalı. Ayarlar > Kargo bölümünden açabilirsiniz.`
                      : `${carrier.label} ayarları eksik. ${carrier.missing || ''}`}
                  </div>
                )}

                {/* Gönderi aşamaları - kalıcı durum, sayfa yenilense de görünür */}
                <div className="rounded-md border border-neutral-200 divide-y divide-neutral-100" data-testid="shipment-pipeline">
                  <ShipmentStep
                    state={order.shipmentId ? 'done' : 'idle'}
                    label="1. Gönderi kaydı"
                    detail={
                      order.shipmentId
                        ? `${SHIPMENT_PROVIDER_LABELS[order.shipmentProvider || ''] || carrierLabel} - Kimlik: ${String(order.shipmentId).slice(0, 18)}${String(order.shipmentId).length > 18 ? '…' : ''}`
                        : 'Henüz oluşturulmadı. "Gönderi Oluştur" ile başlatın.'
                    }
                  />
                  <ShipmentStep
                    state={order.trackingNumber ? 'done' : order.shipmentId ? 'waiting' : 'idle'}
                    label="2. Takip numarası"
                    detail={
                      order.trackingNumber ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="font-mono">{order.trackingNumber}</span>
                          {order.trackingUrl && (
                            <a
                              href={order.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-blue-600 hover:underline"
                            >
                              Takip et <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </span>
                      ) : order.shipmentId ? (
                        'Kargo firması henüz oluşturmadı. Otomatik sorgulanıyor, oluşunca siparişe işlenecek.'
                      ) : (
                        'Gönderi kaydından sonra oluşur.'
                      )
                    }
                  />
                  <ShipmentStep
                    state={order.shipmentLabelUrl ? 'done' : order.shipmentId ? 'waiting' : 'idle'}
                    label="3. Kargo etiketi"
                    detail={
                      order.shipmentLabelUrl
                        ? 'Hazır. "Etiket Yazdır" ile açabilirsiniz.'
                        : order.shipmentId
                        ? 'Hazırlanıyor. Takip numarasıyla birlikte gelir.'
                        : 'Gönderi kaydından sonra oluşur.'
                    }
                  />
                  <ShipmentStep
                    state={
                      order.status === 'delivered' || shipmentStatusInfo?.delivered
                        ? 'done'
                        : order.status === 'shipped'
                        ? 'waiting'
                        : 'idle'
                    }
                    label="4. Teslimat"
                    detail={
                      order.status === 'delivered' || shipmentStatusInfo?.delivered
                        ? 'Teslim edildi.'
                        : shipmentStatusInfo?.statusText
                        ? `Kargo durumu: ${shipmentStatusInfo.statusText}`
                        : order.status === 'shipped'
                        ? 'Kargoda. "Takip Durumu" ile güncel durumu sorgulayabilirsiniz.'
                        : 'Kargoya verildikten sonra takip edilir.'
                    }
                  />
                </div>

                {/* Ağırlık / desi override - uluslararası gönderilerde önemli */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[10.5px] text-neutral-400 mb-1">Desi (opsiyonel)</label>
                    <TextInput
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder={carrier?.id === 'shipentegra' ? 'Örn. 3' : 'Varsayılan'}
                      value={shipmentDesi}
                      onChange={(e) => setShipmentDesi(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10.5px] text-neutral-400 mb-1">Ağırlık kg (opsiyonel)</label>
                    <TextInput
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Örn. 1.5"
                      value={shipmentWeightKg}
                      onChange={(e) => setShipmentWeightKg(e.target.value)}
                    />
                  </div>
                </div>

                {/* API Buttons - Row 1 */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleShipmentCreate()}
                    disabled={shipmentCreating || shipmentQuerying || isTerminal}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-neutral-900 text-white text-[12px] font-semibold hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    data-testid="button-shipment-create"
                    title={`${carrierLabel} sistemine gönderi kaydı oluşturur`}
                  >
                    {shipmentCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {shipmentCreating ? 'Gönderiliyor…' : 'Gönderi Oluştur'}
                  </button>
                  <button
                    type="button"
                    onClick={handleShipmentStatus}
                    disabled={shipmentQuerying || shipmentCreating}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md border border-neutral-200 bg-white text-[12px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    data-testid="button-shipment-status"
                    title="Takip numarasını ve güncel kargo durumunu sorgular"
                  >
                    {shipmentQuerying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    {shipmentQuerying ? 'Sorgulanıyor…' : 'Takip Durumu'}
                  </button>
                </div>

                {/* API Buttons - Row 2 */}
                <div className="flex gap-2">
                  <a
                    href={order ? `/api/admin/orders/${order.id}/shipment/label` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md border-2 border-orange-300 bg-orange-50 text-[12px] font-semibold text-orange-700 hover:bg-orange-100 hover:border-orange-400 transition-colors"
                    data-testid="link-shipment-label"
                    title="Kargo etiketi yeni sekmede açılır"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Etiket Yazdır
                  </a>
                </div>

                {/* API result message */}
                {shipmentMessage && (
                  <div className={`text-[11.5px] px-3 py-2 rounded-md leading-relaxed ${
                    shipmentMessage.type === 'success'
                      ? 'bg-neutral-50 border border-neutral-200 text-neutral-800'
                      : shipmentMessage.type === 'warn'
                      ? 'bg-amber-50 border border-amber-200 text-amber-800'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`} data-testid="text-shipment-message">
                    {shipmentMessage.text}
                    {shipmentAlreadySent && (
                      <button
                        type="button"
                        onClick={() => handleShipmentCreate(true)}
                        disabled={shipmentCreating}
                        className="ml-2 underline text-amber-700 hover:text-amber-900 font-semibold"
                      >
                        Tekrar gönder
                      </button>
                    )}
                  </div>
                )}

                <div className="border-t border-neutral-100 pt-2.5">
                  <p className="text-[10.5px] text-neutral-400 mb-2">Elle takip bilgisi</p>
                  <FormField label="Takip Numarası">
                    <TextInput
                      placeholder="Örn. 1234567890"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      data-testid="input-tracking-number"
                    />
                  </FormField>
                  <div className="mt-2">
                    <FormField label="Takip URL" hint="Boş bırakılırsa sağlayıcıya uygun takip linki oluşturulur.">
                      <TextInput
                        placeholder="https://…"
                        value={trackingUrl}
                        onChange={(e) => setTrackingUrl(e.target.value)}
                        data-testid="input-tracking-url"
                      />
                    </FormField>
                  </div>
                  <div className="mt-2">
                    <PrimaryButton
                      onClick={handleTrackingUpdate}
                      disabled={isUpdating || !trackingNumber}
                      className="w-full"
                      data-testid="button-save-tracking"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Kaydediliyor…
                        </>
                      ) : (
                        <>
                          <Truck className="w-3.5 h-3.5" />
                          Takibi Kaydet
                        </>
                      )}
                    </PrimaryButton>
                  </div>
                </div>

                {order.trackingNumber && order.trackingUrl && (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center h-9 leading-9 rounded-md border border-neutral-200 bg-white text-[12.5px] text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                    data-testid="link-tracking"
                  >
                    Kargo Takibi
                    <ExternalLink className="w-3 h-3 inline ml-1" />
                  </a>
                )}
              </div>
            </Card>
            </div>

            {/* Cancel */}
            {canCancel && (
              <Card className="p-5 border-red-100">
                <SectionHeading
                  title="Tehlikeli Bölge"
                  description="İptal edilen siparişler için stok otomatik iade edilir."
                />
                <SecondaryButton
                  onClick={() => setShowCancelModal(true)}
                  className="w-full !text-red-600 !border-red-200 hover:!bg-red-50"
                  data-testid="button-open-cancel-modal"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Siparişi İptal Et
                </SecondaryButton>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom action bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-neutral-200 px-3 py-2.5 flex items-center gap-2 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        <SecondaryButton
          onClick={() =>
            document
              .getElementById('shipping-section')
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
          className="flex-1 justify-center"
          disabled={!canShip}
          data-testid="button-mobile-shipping"
        >
          <Truck className="w-3.5 h-3.5" />
          Kargo
        </SecondaryButton>
      </div>

      {/* Cancel modal */}
      {showCancelModal && (
        <AdminModal
          open
          onClose={() => setShowCancelModal(false)}
          title="Siparişi iptal et"
          description="Stok otomatik iade edilir ve müşteri bilgilendirilir."
          size="sm"
          testId="modal-cancel-order"
          footer={
            <>
              <GhostButton
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isUpdating}
                data-testid="button-cancel-cancel"
              >
                Vazgeç
              </GhostButton>
              <PrimaryButton
                onClick={handleCancelOrder}
                disabled={isUpdating}
                className="!bg-red-600 hover:!bg-red-700"
                data-testid="button-confirm-cancel"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    İptal ediliyor…
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    Siparişi İptal Et
                  </>
                )}
              </PrimaryButton>
            </>
          }
        >
          <div className="space-y-3">
            <InlineAlert tone="warning">
              Bu işlem geri alınamaz. Sipariş{' '}
              <span className="font-semibold">{order.orderNumber}</span> iptal
              edilecektir.
            </InlineAlert>
            <FormField
              label="İptal sebebi"
              hint="Müşteri ve ekiple paylaşmak için kısa bir açıklama girebilirsiniz."
            >
              <TextArea
                placeholder="Örn. Stokta kalmadı / Müşteri vazgeçti…"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                data-testid="input-cancel-reason"
              />
            </FormField>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
