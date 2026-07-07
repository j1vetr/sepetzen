import { useState, useEffect } from 'react';
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

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantDetails?: string;
  sku?: string;
  productImage?: string;
  quantity: number;
  price: string;
  subtotal: string;
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
  };
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
  const [arasCreating, setArasCreating] = useState(false);
  const [arasQuerying, setArasQuerying] = useState(false);
  const [arasMessage, setArasMessage] = useState<{ type: 'success' | 'error' | 'warn'; text: string } | null>(null);
  const [arasAlreadySent, setArasAlreadySent] = useState(false);
  const [arasCargoInfo, setArasCargoInfo] = useState(false);
  const [arasCargoStatus, setArasCargoStatus] = useState<{ status?: string; deliveryDate?: string; deliveryBranch?: string; waybillNo?: string } | null>(null);
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
      const finalTrackingUrl =
        trackingUrl ||
        `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${trackingNumber}`;

      await fetch(`/api/admin/orders/${order.id}/tracking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingNumber,
          trackingUrl: finalTrackingUrl,
          shippingCarrier: 'Aras Kargo',
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

  const handleArasCreate = async (force = false) => {
    if (!order) return;
    setArasCreating(true);
    setArasMessage(null);
    setArasAlreadySent(false);
    try {
      const url = `/api/admin/orders/${order.id}/aras-kargo/create${force ? '?force=1' : ''}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setArasMessage({ type: 'success', text: `Aras Kargo sistemine kayıt gönderildi. Kargo şubeye teslim ettikten sonra "Takip No Sorgula" butonuna basın.` });
        setNotes((prev) => [{
          id: Date.now().toString(),
          content: `Aras Kargo API'ye kayıt gönderildi. Entegrasyon kodu: ${data.integrationCode}`,
          createdAt: new Date().toISOString(),
        }, ...prev]);
      } else if (data.alreadySent) {
        setArasAlreadySent(true);
        setArasMessage({ type: 'warn', text: 'Bu sipariş daha önce Aras sistemine gönderildi.' });
      } else {
        setArasMessage({ type: 'error', text: data.error || data.resultMessage || 'Kargo oluşturulamadı' });
      }
    } catch {
      setArasMessage({ type: 'error', text: 'Bağlantı hatası. Lütfen tekrar deneyin.' });
    } finally {
      setArasCreating(false);
    }
  };

  const handleArasQuery = async () => {
    if (!order) return;
    setArasQuerying(true);
    setArasMessage(null);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/aras-kargo/status`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.found && data.trackingNumber) {
        const msg = data.savedToOrder
          ? `Takip numarası alındı ve siparişe kaydedildi: ${data.trackingNumber}`
          : `Takip numarası: ${data.trackingNumber}${data.cargoStatus ? ` - Durum: ${data.cargoStatus}` : ''}`;
        setArasMessage({ type: 'success', text: msg });
        if (data.savedToOrder) {
          setTrackingNumber(data.trackingNumber);
          setOrder({ ...order, trackingNumber: data.trackingNumber, status: 'shipped' });
          setStatus('shipped');
        }
      } else if (data.success && !data.found) {
        setArasMessage({ type: 'error', text: data.error || 'Şube henüz irsaliye oluşturmadı. Kargo fiziksel teslimden sonra tekrar sorgulayın.' });
      } else {
        setArasMessage({ type: 'error', text: data.error || 'Durum sorgulanamadı' });
      }
    } catch {
      setArasMessage({ type: 'error', text: 'Bağlantı hatası. Lütfen tekrar deneyin.' });
    } finally {
      setArasQuerying(false);
    }
  };

  const handleArasCargoInfo = async () => {
    if (!order) return;
    setArasCargoInfo(true);
    setArasMessage(null);
    setArasCargoStatus(null);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/aras-kargo/cargo-info`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.found) {
        setArasCargoStatus({ status: data.status, deliveryDate: data.deliveryDate, deliveryBranch: data.deliveryBranch, waybillNo: data.waybillNo });
        const parts = [data.status && `Durum: ${data.status}`, data.deliveryDate && `Teslim: ${data.deliveryDate}`, data.deliveryBranch && `Şube: ${data.deliveryBranch}`].filter(Boolean);
        setArasMessage({ type: 'success', text: parts.join(' - ') || 'Kargo bilgisi alındı' });
      } else {
        setArasMessage({ type: 'error', text: data.error || 'Kargo bilgisi bulunamadı' });
      }
    } catch {
      setArasMessage({ type: 'error', text: 'Bağlantı hatası.' });
    } finally {
      setArasCargoInfo(false);
    }
  };

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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
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
    <div className="min-h-screen bg-neutral-50 pb-24 sm:pb-8">
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
                  className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-[12px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                  <div className="flex justify-between text-[12px] text-emerald-700">
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

            {/* Shipping address (also used as billing address) */}
            <Card className="p-5">
              <SectionHeading
                title="Teslimat ve Fatura Adresi"
                description="Bu sipariş için teslimat ve fatura adresi aynıdır."
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
              </div>
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

            {/* Shipping (Aras Kargo) */}
            <div id="shipping-section">
            <Card className="p-5">
              <SectionHeading
                title="Aras Kargo"
                description="API ile otomatik gönder veya takip numarasını elle gir."
              />
              <div className="space-y-2.5">

                {/* API Buttons — Row 1 */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleArasCreate()}
                    disabled={arasCreating || arasQuerying || isTerminal}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-neutral-900 text-white text-[12px] font-semibold hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    data-testid="button-aras-create"
                    title="SetOrder API'ye sipariş bilgilerini gönderir"
                  >
                    {arasCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {arasCreating ? 'Gönderiliyor…' : 'API\'ye Gönder'}
                  </button>
                  <button
                    type="button"
                    onClick={handleArasQuery}
                    disabled={arasQuerying || arasCreating}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md border border-neutral-200 bg-white text-[12px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    data-testid="button-aras-query"
                    title="Aras sisteminden takip numarasını çeker"
                  >
                    {arasQuerying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    {arasQuerying ? 'Sorgulanıyor…' : 'Takip No Sorgula'}
                  </button>
                </div>

                {/* API Buttons — Row 2 */}
                <div className="flex gap-2">
                  <a
                    href={order ? `/api/admin/orders/${order.id}/aras-kargo/label` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md border-2 border-orange-300 bg-orange-50 text-[12px] font-semibold text-orange-700 hover:bg-orange-100 hover:border-orange-400 transition-colors"
                    data-testid="link-aras-label"
                    title="A4 kargo etiketi + barkod - yeni sekmede açılır, otomatik yazdır çalışır"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Etiket Yazdır
                  </a>
                  <button
                    type="button"
                    onClick={handleArasCargoInfo}
                    disabled={arasCargoInfo || arasCreating || arasQuerying}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md border border-sky-200 bg-sky-50 text-[12px] font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    data-testid="button-aras-cargo-info"
                    title="GetCargoInfo - gerçek kargo durumunu sorgular (teslim edildi, şubede, yolda)"
                  >
                    {arasCargoInfo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                    {arasCargoInfo ? 'Sorgulanıyor…' : 'Kargo Durumu'}
                  </button>
                </div>

                {/* API result message */}
                {arasMessage && (
                  <div className={`text-[11.5px] px-3 py-2 rounded-md leading-relaxed ${
                    arasMessage.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : arasMessage.type === 'warn'
                      ? 'bg-amber-50 border border-amber-200 text-amber-800'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`} data-testid="text-aras-message">
                    {arasMessage.text}
                    {arasAlreadySent && (
                      <button
                        type="button"
                        onClick={() => handleArasCreate(true)}
                        disabled={arasCreating}
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
                    <FormField label="Takip URL" hint="Boş bırakılırsa Aras Kargo linki oluşturulur.">
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
