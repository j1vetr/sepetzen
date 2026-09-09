import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef, type ComponentType } from 'react';
import { Settings, Mail, Loader2, CheckCircle2, XCircle, Send, Server, CreditCard, Copy, AlertTriangle, Wrench, MessageCircle, KeyRound, ShieldCheck, Truck, MapPin, Megaphone, Globe, Banknote, Upload, ShoppingBag, Plus, Trash2, Sparkles, Zap, Image, Bell, SlidersHorizontal, ChevronUp, ChevronDown as ChevronDownIcon, Snowflake, BarChart2, Code2 } from 'lucide-react';
import { BANK_TRANSFER_INFO } from '@shared/bankInfo';
import type { SiteIdentity, SocialLink, MobileNavItem } from '@shared/siteIdentity';
import { COUNTRIES } from '@/lib/countries';

type WhatsAppEvent =
  | 'order_received_customer'
  | 'order_received_admin'
  | 'order_preparing_customer'
  | 'order_shipped_customer'
  | 'order_delivered_customer'
  | 'order_cancelled_customer'
  | 'order_cancelled_admin'
  | 'order_bank_transfer_pending_customer'
  | 'order_bank_transfer_admin'
  | 'review_pending_admin';

const DIVIDER = '━━━━━━━━━━━━━━━';

const WHATSAPP_EVENTS: { key: WhatsAppEvent; label: string; defaultTpl: string }[] = [
  {
    key: 'order_received_customer',
    label: 'Sipariş alındı (müşteriye)',
    defaultTpl:
      `🎉 *SİPARİŞİNİZ ALINDI*\n${DIVIDER}\n\nMerhaba {{musteriAdi}} 👋\n\nBizi tercih ettiğiniz için teşekkürler! Siparişiniz başarıyla oluşturuldu ve hazırlık sırasına alındı.\n\n📦 *Sipariş No:* {{siparisNo}}\n🛒 *Ürün Sayısı:* {{urunSayisi}}\n💰 *Toplam:* {{toplam}} ₺\n💳 *Ödeme:* {{odemeYontemi}}\n🕐 *Tarih:* {{siparisTarihSaat}}\n\n🔍 Siparişinizi takip edin:\n{{siparisTakipLink}}\n\nHazırlığa başladığımızda yine haberdar edeceğiz. ✨\n\n- {{siteAdi}}`,
  },
  {
    key: 'order_received_admin',
    label: 'Yeni sipariş bildirimi (yöneticiye)',
    defaultTpl:
      `🛍️ *YENİ SİPARİŞ*\n${DIVIDER}\n\n📦 *Sipariş No:* {{siparisNo}}\n👤 *Müşteri:* {{musteriAdi}}\n📞 *Telefon:* {{musteriTelefon}}\n📧 *E-posta:* {{musteriEposta}}\n🛒 *Ürün:* {{urunSayisi}} kalem\n💰 *Tutar:* {{toplam}} ₺\n💳 *Ödeme:* {{odemeYontemi}}\n🕐 *Tarih:* {{siparisTarihSaat}}\n\n🔧 Yönetim paneli:\n{{adminPanelUrl}}`,
  },
  {
    key: 'order_preparing_customer',
    label: 'Sipariş hazırlanıyor (müşteriye)',
    defaultTpl:
      `📦 *SİPARİŞİNİZ HAZIRLANIYOR*\n${DIVIDER}\n\nMerhaba {{musteriAdi}} 👋\n\n*{{siparisNo}}* numaralı siparişiniz atölyemizde özenle hazırlanıyor. 🛠️\n\nKargoya verildiğinde takip numarası ile birlikte size tekrar yazacağız. 🚚\n\n🔍 Sipariş takibi:\n{{siparisTakipLink}}\n\n- {{siteAdi}}`,
  },
  {
    key: 'order_shipped_customer',
    label: 'Kargoya verildi (müşteriye)',
    defaultTpl:
      `🚚 *KARGOYA VERİLDİ*\n${DIVIDER}\n\nMerhaba {{musteriAdi}} 👋\n\n*{{siparisNo}}* numaralı siparişiniz kargoya teslim edildi! 📮\n\n🚛 *Kargo Firması:* {{kargoFirma}}\n🏷️ *Takip No:* {{kargoTakipNo}}\n\n🔗 Kargo takibi:\n{{kargoTakipLink}}\n\n📋 Sipariş detayı:\n{{siparisTakipLink}}\n\nGüzel günlerde kullanın! 🌟\n\n- {{siteAdi}}`,
  },
  {
    key: 'order_delivered_customer',
    label: 'Teslim edildi (müşteriye)',
    defaultTpl:
      `🎉 *TESLİMAT TAMAMLANDI*\n${DIVIDER}\n\nMerhaba {{musteriAdi}} 👋\n\n*{{siparisNo}}* numaralı siparişiniz başarıyla teslim edildi. ✅\n\nBizi tercih ettiğiniz için çok teşekkür ederiz. 🙏\n\n⭐ Memnun kaldıysanız ürün sayfasından kısa bir değerlendirme bırakırsanız çok mutlu oluruz.\n\n- {{siteAdi}}`,
  },
  {
    key: 'order_cancelled_customer',
    label: 'Sipariş iptal edildi (müşteriye)',
    defaultTpl:
      `ℹ️ *SİPARİŞ İPTALİ*\n${DIVIDER}\n\nMerhaba {{musteriAdi}} 👋\n\n*{{siparisNo}}* numaralı siparişiniz iptal edilmiştir.\n\n💳 *Tutar:* {{toplam}} ₺\n🕐 *Tarih:* {{siparisTarihSaat}}\n\nÖdemeniz alındıysa iade süreci en kısa sürede başlatılacaktır. Sorularınız için bize yazabilirsiniz. 💬\n\n- {{siteAdi}}`,
  },
  {
    key: 'order_cancelled_admin',
    label: 'Sipariş iptal edildi (yöneticiye)',
    defaultTpl:
      `❌ *SİPARİŞ İPTAL EDİLDİ*\n${DIVIDER}\n\n📦 *Sipariş No:* {{siparisNo}}\n👤 *Müşteri:* {{musteriAdi}}\n📞 *Telefon:* {{musteriTelefon}}\n💰 *Tutar:* {{toplam}} ₺\n💳 *Ödeme:* {{odemeYontemi}}\n🕐 *Tarih:* {{siparisTarihSaat}}\n\n🔧 Yönetim paneli:\n{{adminPanelUrl}}`,
  },
  {
    key: 'order_bank_transfer_pending_customer',
    label: 'Havale ödeme bekleniyor (müşteriye)',
    defaultTpl:
      `🏦 *HAVALE ONAYI BEKLENİYOR*\n${DIVIDER}\n\nMerhaba {{musteriAdi}} 👋\n\n*{{siparisNo}}* numaralı siparişiniz oluşturuldu. Aşağıdaki hesaba ödemenizi gönderdiğinizde siparişiniz hazırlığa alınacak. ✅\n\n💰 *Tutar:* {{toplam}} ₺\n🛒 *Ürün Sayısı:* {{urunSayisi}}\n🕐 *Tarih:* {{siparisTarihSaat}}\n\n📋 *Banka Bilgileri*\n🏦 Banka: ${BANK_TRANSFER_INFO.bankName}\n🔢 IBAN: \`${BANK_TRANSFER_INFO.iban}\`\n👤 Ad Soyad: ${BANK_TRANSFER_INFO.accountHolder}\n📝 Açıklama: {{siparisNo}}\n\n💡 Açıklamaya sipariş numaranızı yazmayı unutmayın.\n\n🔍 Sipariş takibi:\n{{siparisTakipLink}}\n\n- {{siteAdi}}`,
  },
  {
    key: 'order_bank_transfer_admin',
    label: 'Havale ödeme - kontrol et (yöneticiye)',
    defaultTpl:
      `⚠️ *HAVALE ÖDEME - KONTROL ET*\n${DIVIDER}\n\nMüşteri havale yöntemiyle yeni bir sipariş oluşturdu. Hesap hareketlerini kontrol edip onaylayın. 🔍\n\n📦 *Sipariş No:* {{siparisNo}}\n👤 *Müşteri:* {{musteriAdi}}\n📞 *Telefon:* {{musteriTelefon}}\n📧 *E-posta:* {{musteriEposta}}\n💰 *Tutar:* {{toplam}} ₺\n🛒 *Ürün:* {{urunSayisi}} kalem\n🕐 *Tarih:* {{siparisTarihSaat}}\n\n🔧 Yönetim paneli:\n{{adminPanelUrl}}`,
  },
  {
    key: 'review_pending_admin',
    label: 'Yeni yorum onay bekliyor (yöneticiye)',
    defaultTpl:
      `💬 *YENİ YORUM - ONAY BEKLİYOR*\n${DIVIDER}\n\n🪨 *Ürün:* {{urunAdi}}\n👤 *Yazan:* {{yorumYazari}} {{misafirEtiketi}}\n⭐ *Puan:* {{yildizlar}} ({{puan}}/5)\n{{baslikSatiri}}{{icerikSatiri}}\n🔧 Onaylamak için:\n{{adminPanelUrl}}`,
  },
];

const WHATSAPP_VARIABLES = [
  '{{musteriAdi}}',
  '{{musteriTelefon}}',
  '{{musteriEposta}}',
  '{{siparisNo}}',
  '{{siparisTarihi}}',
  '{{siparisSaati}}',
  '{{siparisTarihSaat}}',
  '{{urunSayisi}}',
  '{{odemeYontemi}}',
  '{{toplam}}',
  '{{araToplam}}',
  '{{kargoUcreti}}',
  '{{kargoTakipNo}}',
  '{{kargoTakipLink}}',
  '{{kargoFirma}}',
  '{{siparisTakipLink}}',
  '{{adminPanelUrl}}',
  '{{siteAdi}}',
];

// ── Aras Sender Address Picker ─────────────────────────────────────────────
/**
 * Seçili kargo sağlayıcısı için bağlantı testi yapar.
 * `values` verilirse test, ekranda görünen (henüz kaydedilmemiş) form
 * değerleriyle yapılır; verilmezse kayıtlı ayarlar kullanılır.
 */
function ShippingTestButton({ provider, label, values }: { provider: string; label: string; values?: Record<string, string> }) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/shipping/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ provider, ...(values ? { overrides: values } : {}) }),
      });
      const data = await res.json();
      setResult({ ok: !!data.success, text: data.success ? (data.message || 'Bağlantı başarılı.') : (data.error || 'Bağlantı kurulamadı.') });
    } catch {
      setResult({ ok: false, text: 'Bağlantı hatası. Lütfen tekrar deneyin.' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={runTest}
        disabled={testing}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm font-medium text-neutral-800 hover:bg-neutral-100 disabled:opacity-50"
        data-testid={`button-test-${provider}`}
      >
        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
        {testing ? 'Test ediliyor…' : `${label} bağlantısını test et`}
      </button>
      {result && (
        <span
          className={`text-xs px-3 py-1.5 rounded-md ${result.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
          data-testid={`text-test-result-${provider}`}
        >
          {result.text}
        </span>
      )}
      <span className="text-xs text-neutral-400">
        {values
          ? 'Test, ekranda görünen değerlerle yapılır. Kalıcı olması için kaydetmeyi unutmayın.'
          : 'Testten önce ayarları kaydedin.'}
      </span>
    </div>
  );
}

function ArasSenderAddressPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState<{ addressId: string; adres: string; sube: string; bolge: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchAddresses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/aras-kargo/addresses', { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.addresses?.length) {
        setAddresses(data.addresses);
      } else {
        setError(data.error || 'Adres listesi alınamadı. Kullanıcı adı/şifre girilmiş ve kaydedilmiş olmalı.');
      }
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="SenderAccountAddressId"
          className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 font-mono text-sm"
          data-testid="input-aras-sender-address"
        />
        <button
          type="button"
          onClick={fetchAddresses}
          disabled={loading}
          title="Aras API'den kayıtlı adreslerinizi çeker"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors shrink-0"
          data-testid="button-aras-fetch-addresses"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
          {loading ? 'Yükleniyor' : 'Listele'}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
      {addresses.length > 0 && (
        <div className="border border-neutral-200 rounded-lg overflow-hidden">
          {addresses.map((a) => (
            <button
              key={a.addressId}
              type="button"
              onClick={() => { onChange(a.addressId); setAddresses([]); }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-0 ${value === a.addressId ? 'bg-neutral-50 text-neutral-800 font-semibold' : 'text-neutral-700'}`}
              data-testid={`option-aras-address-${a.addressId}`}
            >
              <span className="font-mono font-bold">{a.addressId}</span>
              {a.adres && <span className="ml-2 text-neutral-500">{a.adres}</span>}
              {a.sube && <span className="ml-1 text-neutral-400">- {a.sube}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Contact Page Info ────────────────────────────────────────────────────
// /sayfa/iletisim adresindeki telefon, e-posta ve adres bilgilerini yönetir.
// ─── Yardımcı: site-identity kaydet ─────────────────────────────────────────
async function saveSiteIdentityPatch(patch: Partial<SiteIdentity>): Promise<void> {
  const res = await fetch('/api/admin/site-identity', { credentials: 'include' });
  const current: SiteIdentity = res.ok ? await res.json() : {};
  const merged = { ...current, ...patch };
  const saveRes = await fetch('/api/admin/site-identity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(merged),
    credentials: 'include',
  });
  if (!saveRes.ok) {
    const d = await saveRes.json().catch(() => ({}));
    throw new Error(d.error || 'Kaydedilemedi');
  }
}

async function uploadBannerImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('images', file);
  const res = await fetch('/api/admin/upload/branding', { method: 'POST', body: formData, credentials: 'include' });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload.urls?.[0]) throw new Error(payload.error || 'Görsel yüklenemedi');
  return payload.urls[0];
}

// ─── E-posta Görünüm Ayarları ─────────────────────────────────────────────────
function EmailBrandingSection() {
  const queryClient = useQueryClient();
  const { data: adminSettings } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/settings'],
  });

  const [brandName,    setBrandName]    = useState('');
  const [tagline,      setTagline]      = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2D5A27');
  const [logoUrl,      setLogoUrl]      = useState('');
  const [logoWidth,    setLogoWidth]    = useState('160');
  const [siteUrl,      setSiteUrl]      = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [phoneTel,     setPhoneTel]     = useState('');
  const [address1,     setAddress1]     = useState('');
  const [address2,     setAddress2]     = useState('');
  const [saving,       setSaving]       = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [result,       setResult]       = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!adminSettings) return;
    if (adminSettings.email_brand_name    !== undefined) setBrandName(adminSettings.email_brand_name);
    if (adminSettings.email_brand_tagline !== undefined) setTagline(adminSettings.email_brand_tagline);
    if (adminSettings.email_primary_color !== undefined) setPrimaryColor(adminSettings.email_primary_color);
    if (adminSettings.email_logo_url      !== undefined) setLogoUrl(adminSettings.email_logo_url);
    if (adminSettings.email_logo_width    !== undefined) setLogoWidth(adminSettings.email_logo_width || '160');
    if (adminSettings.email_site_url      !== undefined) setSiteUrl(adminSettings.email_site_url);
    if (adminSettings.email_contact_email !== undefined) setContactEmail(adminSettings.email_contact_email);
    if (adminSettings.email_phone_display !== undefined) setPhoneDisplay(adminSettings.email_phone_display);
    if (adminSettings.email_phone_tel     !== undefined) setPhoneTel(adminSettings.email_phone_tel);
    if (adminSettings.email_address_line1 !== undefined) setAddress1(adminSettings.email_address_line1);
    if (adminSettings.email_address_line2 !== undefined) setAddress2(adminSettings.email_address_line2);
  }, [adminSettings]);

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('images', file);
      const res = await fetch('/api/admin/upload/branding', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.urls?.[0]) throw new Error(data.error || 'Yükleme başarısız');
      setLogoUrl(data.urls[0]);
    } catch (e: any) {
      setResult({ ok: false, text: e.message });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email_brand_name:    brandName,
          email_brand_tagline: tagline,
          email_primary_color: primaryColor,
          email_logo_url:      logoUrl,
          email_logo_width:    logoWidth,
          email_site_url:      siteUrl,
          email_contact_email: contactEmail,
          email_phone_display: phoneDisplay,
          email_phone_tel:     phoneTel,
          email_address_line1: address1,
          email_address_line2: address2,
        }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
        setResult({ ok: true, text: 'E-posta görünüm ayarları kaydedildi.' });
      } else {
        const d = await res.json().catch(() => ({}));
        setResult({ ok: false, text: d.error || 'Kayıt başarısız.' });
      }
    } catch {
      setResult({ ok: false, text: 'Bir hata oluştu.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-100">
        <div className="p-2 bg-neutral-50 rounded-lg">
          <Mail className="w-5 h-5 text-neutral-900" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-neutral-900">E-posta Görünümü</h3>
          <p className="text-xs text-neutral-500">Gönderilen tüm e-postaların başlık, logo, renk ve iletişim bilgilerini ayarlayın</p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Marka adı + tagline */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Marka Adı</label>
            <input
              type="text"
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              placeholder="SEPETZEN"
              data-testid="input-email-brand-name"
              className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:border-neutral-900"
            />
            <p className="text-xs text-neutral-400 mt-1">E-posta başlığında ve altbilgide büyük harf görünür</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Kısa Tanım (Tagline)</label>
            <input
              type="text"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              placeholder="Kamp, Outdoor & Bıçak"
              data-testid="input-email-tagline"
              className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:border-neutral-900"
            />
            <p className="text-xs text-neutral-400 mt-1">Marka adının hemen altında küçük harf çıkar</p>
          </div>
        </div>

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Logo (E-posta Başlığı)</label>
          <div className="flex items-start gap-3">
            {logoUrl ? (
              <div className="relative group shrink-0">
                <img src={logoUrl} alt="E-posta logosu" className="h-12 w-auto max-w-[160px] object-contain bg-neutral-100 border border-neutral-200 rounded-lg p-1" />
                <button
                  onClick={() => setLogoUrl('')}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs leading-none shadow"
                >×</button>
              </div>
            ) : null}
            <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-neutral-300 rounded-lg text-sm text-neutral-600 hover:border-neutral-500 cursor-pointer transition-colors">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Yükleniyor...' : logoUrl ? 'Değiştir' : 'Logo Yükle'}
              <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }} />
            </label>
            {!logoUrl && (
              <input
                type="text"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://... (URL ile girin veya yükleyin)"
                className="flex-1 px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:border-neutral-900"
              />
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-1">PNG, WebP, GIF desteklenir. Boş bırakılırsa /email-logo.png kullanılır. Şeffaf zemin önerilir.</p>
        </div>

        {/* Logo genişliği */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Logo Genişliği (px)</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={40}
              max={400}
              value={logoWidth}
              onChange={e => setLogoWidth(e.target.value)}
              className="w-28 px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 font-mono focus:outline-none focus:border-neutral-900"
              placeholder="160"
            />
            <span className="text-sm text-neutral-500">px — yükseklik orantılı hesaplanır (40–400)</span>
          </div>
          {logoUrl && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-900 rounded">
              <img
                src={logoUrl}
                alt="Önizleme"
                style={{ width: `${Math.min(parseInt(logoWidth) || 160, 200)}px`, height: 'auto', maxHeight: '48px', objectFit: 'contain' }}
              />
            </div>
          )}
          <p className="text-xs text-neutral-400 mt-1">Varsayılan: 160 px. WebP veya geniş logolar için artırın.</p>
        </div>

        {/* Ana renk */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Ana Renk (Düğme ve Vurgu)</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-neutral-200 bg-neutral-50 p-0.5"
              data-testid="input-email-primary-color"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
              placeholder="#2D5A27"
              className="w-32 px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 font-mono focus:outline-none focus:border-neutral-900"
            />
            <span className="text-xs text-neutral-400">Sipariş takibi butonu, bağlantı renkleri</span>
          </div>
        </div>

        {/* Site URL + İletişim e-postası */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Site URL</label>
            <input
              type="text"
              value={siteUrl}
              onChange={e => setSiteUrl(e.target.value)}
              placeholder="https://sepetzen.com"
              className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:border-neutral-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">İletişim E-postası</label>
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="sepetzen@gmail.com"
              className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:border-neutral-900"
            />
          </div>
        </div>

        {/* Telefon */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Telefon (görünür)</label>
            <input
              type="text"
              value={phoneDisplay}
              onChange={e => setPhoneDisplay(e.target.value)}
              placeholder="0536 630 11 38"
              className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:border-neutral-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Telefon (tel: formatı)</label>
            <input
              type="text"
              value={phoneTel}
              onChange={e => setPhoneTel(e.target.value)}
              placeholder="+905366301138"
              className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-mono text-neutral-900 focus:outline-none focus:border-neutral-900"
            />
          </div>
        </div>

        {/* Adres */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Adres Satır 1</label>
            <input
              type="text"
              value={address1}
              onChange={e => setAddress1(e.target.value)}
              placeholder="Karaçalı Mah. Nergiz Sk. No.8/A"
              className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:border-neutral-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Adres Satır 2</label>
            <input
              type="text"
              value={address2}
              onChange={e => setAddress2(e.target.value)}
              placeholder="Dalaman / Muğla"
              className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:border-neutral-900"
            />
          </div>
        </div>

        {result && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${result.ok ? 'bg-neutral-50 border border-neutral-200 text-neutral-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {result.ok ? <CheckCircle2 className="w-4 h-4 text-neutral-600 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            {result.text}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            data-testid="button-save-email-branding"
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Kar Efekti Ayarları ──────────────────────────────────────────────────────
const SNOW_COLORS = [
  { label: 'Beyaz',     hex: '#ffffff' },
  { label: 'Buz mavisi', hex: '#c8e6ff' },
  { label: 'Altın',    hex: '#ffe89a' },
  { label: 'Pembe',    hex: '#ffd6e0' },
  { label: 'Gümüş',   hex: '#d8d8d8' },
];

function StockVisibilitySection() {
  const { data: adminSettings, refetch } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/settings'],
  });

  const [showOutOfStock, setShowOutOfStock] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!adminSettings) return;
    if (adminSettings.show_outofstock_products !== undefined) {
      setShowOutOfStock(adminSettings.show_outofstock_products !== 'false');
    }
  }, [adminSettings]);

  const handleSave = async () => {
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show_outofstock_products: String(showOutOfStock) }),
        credentials: 'include',
      });
      if (res.ok) {
        await refetch();
        setResult({ ok: true, text: 'Ayar kaydedildi.' });
      } else {
        const data = await res.json();
        setResult({ ok: false, text: data.error || 'Kaydedilemedi.' });
      }
    } catch {
      setResult({ ok: false, text: 'Kayıt sırasında hata oluştu.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <ShoppingBag className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900">Tükenen Ürün Görünürlüğü</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Stoğu biten ürünler listede görünmeye devam etsin mi?</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={showOutOfStock}
            onChange={e => setShowOutOfStock(e.target.checked)}
          />
          <div className="w-11 h-6 bg-neutral-200 rounded-full peer peer-checked:bg-neutral-900 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
        </label>
      </div>
      <div className="px-6 py-4 space-y-2">
        <p className="text-xs text-neutral-500">
          <strong className="text-neutral-700">Aktif:</strong> Stoğu biten ürünler listede kalmaya devam eder; ürün kartında yarı saydam "Tükendi" etiketi gösterilir. Google indeksi korunur, stok yenilenince sıralama kaldığı yerden devam eder.
        </p>
        <p className="text-xs text-neutral-500">
          <strong className="text-neutral-700">Pasif:</strong> Stoğu biten ürünler liste ve arama sonuçlarından gizlenir.
        </p>
        <div className="flex items-center justify-between pt-2">
          {result ? (
            <p className={`text-xs ${result.ok ? 'text-emerald-600' : 'text-red-600'}`}>{result.text}</p>
          ) : <span />}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SnowSettingsSection() {
  const { data: adminSettings, refetch } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/settings'],
  });

  const [enabled,  setEnabled]  = useState(false);
  const [speed,    setSpeed]    = useState(5);
  const [color,    setColor]    = useState('#ffffff');
  const [opacity,  setOpacity]  = useState(70);
  const [density,  setDensity]  = useState(60);
  const [saving,   setSaving]   = useState(false);
  const [result,   setResult]   = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!adminSettings) return;
    if (adminSettings.snow_enabled !== undefined) setEnabled(adminSettings.snow_enabled === 'true');
    if (adminSettings.snow_speed   !== undefined) setSpeed(Number(adminSettings.snow_speed));
    if (adminSettings.snow_color   !== undefined) setColor(adminSettings.snow_color);
    if (adminSettings.snow_opacity !== undefined) setOpacity(Number(adminSettings.snow_opacity));
    if (adminSettings.snow_density !== undefined) setDensity(Number(adminSettings.snow_density));
  }, [adminSettings]);

  const handleSave = async () => {
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snow_enabled: String(enabled),
          snow_speed:   String(speed),
          snow_color:   color,
          snow_opacity: String(opacity),
          snow_density: String(density),
        }),
        credentials: 'include',
      });
      if (res.ok) {
        await refetch();
        setResult({ ok: true, text: 'Kar efekti ayarları kaydedildi.' });
      } else {
        const data = await res.json();
        setResult({ ok: false, text: data.error || 'Kaydedilemedi.' });
      }
    } catch {
      setResult({ ok: false, text: 'Kayıt sırasında hata oluştu.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
      {/* Başlık + ana toggle */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg transition-colors ${enabled ? 'bg-blue-50' : 'bg-neutral-50'}`}>
            <Snowflake className={`w-5 h-5 transition-colors ${enabled ? 'text-blue-500' : 'text-neutral-400'}`} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900">Kar Efekti</h3>
            <p className="text-xs text-neutral-500">Ziyaretçiler siteyi açtığında düşen kar animasyonu</p>
          </div>
        </div>
        {/* Toggle */}
        <button
          type="button"
          onClick={() => setEnabled(v => !v)}
          data-testid="toggle-snow-enabled"
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
            enabled ? 'bg-blue-500' : 'bg-neutral-200'
          }`}
          role="switch"
          aria-checked={enabled}
        >
          <span className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Ayar gövdesi */}
      <div className={`px-6 py-5 space-y-6 transition-opacity duration-200 ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>

        {/* Renk seçimi */}
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Kar Rengi</label>
          <div className="flex flex-wrap gap-2 items-center">
            {SNOW_COLORS.map(c => (
              <button
                key={c.hex}
                type="button"
                title={c.label}
                onClick={() => setColor(c.hex)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  color === c.hex ? 'border-neutral-900 scale-110' : 'border-neutral-200 hover:border-neutral-400'
                }`}
                style={{ background: c.hex === '#ffffff' ? 'linear-gradient(135deg,#fff,#e0e8f0)' : c.hex }}
                data-testid={`snow-color-${c.hex}`}
              />
            ))}
            {/* Özel renk */}
            <label className="flex items-center gap-1.5 cursor-pointer" title="Özel renk seç">
              <span className="text-xs text-neutral-500">Özel</span>
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-8 h-8 rounded-full cursor-pointer border border-neutral-200"
                data-testid="snow-color-custom"
              />
            </label>
            <span className="text-xs font-mono text-neutral-400 ml-1">{color}</span>
          </div>
        </div>

        {/* Hız */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Düşme Hızı</label>
            <span className="text-xs font-mono font-semibold text-neutral-700">
              {speed <= 3 ? 'Yavaş' : speed <= 6 ? 'Normal' : speed <= 8 ? 'Hızlı' : 'Çok hızlı'} ({speed}/10)
            </span>
          </div>
          <input
            type="range"
            min={1} max={10} step={1}
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            data-testid="snow-speed"
            className="w-full h-2 rounded-full appearance-none bg-neutral-200 accent-blue-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
            <span>Yavaş</span><span>Çok hızlı</span>
          </div>
        </div>

        {/* Yoğunluk */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Yoğunluk</label>
            <span className="text-xs font-mono font-semibold text-neutral-700">
              {density <= 30 ? 'Az' : density <= 70 ? 'Orta' : density <= 110 ? 'Çok' : 'Yoğun'} ({density} tanecik)
            </span>
          </div>
          <input
            type="range"
            min={10} max={150} step={5}
            value={density}
            onChange={e => setDensity(Number(e.target.value))}
            data-testid="snow-density"
            className="w-full h-2 rounded-full appearance-none bg-neutral-200 accent-blue-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
            <span>Az</span><span>Yoğun</span>
          </div>
        </div>

        {/* Belirginlik */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Belirginlik (Opaklık)</label>
            <span className="text-xs font-mono font-semibold text-neutral-700">%{opacity}</span>
          </div>
          <input
            type="range"
            min={10} max={100} step={5}
            value={opacity}
            onChange={e => setOpacity(Number(e.target.value))}
            data-testid="snow-opacity"
            className="w-full h-2 rounded-full appearance-none bg-neutral-200 accent-blue-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
            <span>%10 (şeffaf)</span><span>%100 (tam)</span>
          </div>
        </div>

        {/* Önizleme ipucu */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
          <Snowflake className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Ayarları kaydettikten sonra mağaza sayfasında kar efekti görünür hale gelir.
            Admin panelinde efekt gösterilmez.
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-4">
        {result ? (
          <p className={`text-xs ${result.ok ? 'text-neutral-600' : 'text-red-600'}`} data-testid="text-snow-result">
            {result.text}
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          data-testid="button-save-snow"
          className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Snowflake className="w-4 h-4" />}
          Kaydet
        </button>
      </div>
    </div>
  );
}

// ─── Filtre Özellikleri ───────────────────────────────────────────────────────
function FilterAttributesSection() {
  const DEFAULT_ATTRS = [
    { label: 'Ürün Cinsi', key: 'urunCinsi' },
    { label: 'Çelik Cinsi', key: 'celikCinsi' },
    { label: 'Sap Cinsi', key: 'sapCinsi' },
  ];

  const { data: adminSettings, refetch } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/settings'],
  });

  const [attrs, setAttrs] = useState<{ label: string; key: string }[]>(DEFAULT_ATTRS);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!adminSettings) return;
    const raw = adminSettings.filter_attributes;
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setAttrs(parsed);
    } catch { /* ignore */ }
  }, [adminSettings]);

  const add = () => setAttrs(prev => [...prev, { label: '', key: '' }]);
  const remove = (idx: number) => setAttrs(prev => prev.filter((_, i) => i !== idx));
  const move = (idx: number, dir: -1 | 1) => {
    setAttrs(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };
  const update = (idx: number, field: 'label' | 'key', value: string) => {
    setAttrs(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  };

  const handleSave = async () => {
    for (const attr of attrs) {
      if (!attr.label.trim()) {
        setResult({ ok: false, text: 'Tüm etiket alanları dolu olmalıdır.' });
        return;
      }
      if (!attr.key.trim() || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(attr.key)) {
        setResult({ ok: false, text: `"${attr.key}" geçersiz alan adı. Yalnızca harf, rakam ve alt çizgi kullanın; harf ile başlamalıdır.` });
        return;
      }
    }
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter_attributes: JSON.stringify(attrs) }),
        credentials: 'include',
      });
      if (res.ok) {
        await refetch();
        setResult({ ok: true, text: 'Filtre özellikleri kaydedildi.' });
      } else {
        const data = await res.json();
        setResult({ ok: false, text: data.error || 'Kaydedilemedi.' });
      }
    } catch {
      setResult({ ok: false, text: 'Kayıt sırasında hata oluştu.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <SlidersHorizontal className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Filtre Özellikleri</h3>
            <p className="text-sm text-neutral-500">Mağaza ve kategori sayfalarında gösterilecek ek filtre bölümleri</p>
          </div>
        </div>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-2 px-3 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Ekle
        </button>
      </div>

      {attrs.length === 0 && (
        <p className="text-sm text-neutral-400 text-center py-6 border border-dashed border-neutral-200 rounded-lg mb-4">
          Henüz özel filtre eklenmedi. Marka ve Fiyat filtreleri her zaman gösterilir.
        </p>
      )}

      <div className="space-y-2 mb-4">
        {attrs.map((attr, idx) => (
          <div key={idx} className="flex items-center gap-2 p-3 bg-neutral-50 rounded-lg border border-neutral-100">
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                className="p-0.5 text-neutral-400 hover:text-neutral-900 disabled:opacity-20 transition-colors"
                aria-label="Yukarı taşı"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={idx === attrs.length - 1}
                className="p-0.5 text-neutral-400 hover:text-neutral-900 disabled:opacity-20 transition-colors"
                aria-label="Aşağı taşı"
              >
                <ChevronDownIcon className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-medium text-neutral-400 mb-1 uppercase tracking-wide">Görünen Başlık</label>
              <input
                type="text"
                value={attr.label}
                onChange={(e) => update(idx, 'label', e.target.value)}
                placeholder="ör. Çelik Cinsi"
                data-testid={`filter-attr-label-${idx}`}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-900 bg-white focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>
            <div className="w-44">
              <label className="block text-[10px] font-medium text-neutral-400 mb-1 uppercase tracking-wide">Alan Adı</label>
              <input
                type="text"
                value={attr.key}
                onChange={(e) => update(idx, 'key', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="ör. celikCinsi"
                data-testid={`filter-attr-key-${idx}`}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono text-neutral-900 bg-white focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={() => remove(idx)}
              className="mt-4 p-2 text-neutral-400 hover:text-red-600 transition-colors"
              aria-label="Kaldır"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700 mb-4">
        <strong>Alan adı:</strong> Ürün formundaki özellikler bölümündeki alan adıyla eşleşmeli.
        Mevcut alanlar: <code className="font-mono bg-blue-100 px-1 rounded">celikCinsi</code>, <code className="font-mono bg-blue-100 px-1 rounded">sapCinsi</code>, <code className="font-mono bg-blue-100 px-1 rounded">urunCinsi</code>, <code className="font-mono bg-blue-100 px-1 rounded">etKalinligi</code>, <code className="font-mono bg-blue-100 px-1 rounded">agirlik</code>.
        Yeni alan eklemek için önce ürün formuna o alanı ekleyin.
      </div>

      {result && (
        <div className={`p-3 rounded-lg border text-xs mb-4 ${result.ok ? 'bg-neutral-50 border-neutral-200 text-neutral-800' : 'bg-red-50 border-red-200 text-red-800'}`} data-testid="text-filter-attrs-result">
          {result.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="button-save-filter-attrs"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
          Kaydet
        </button>
      </div>
    </div>
  );
}

// ─── Ticker Ayarları ─────────────────────────────────────────────────────────
function TickerSettingsSection() {
  const qc = useQueryClient();
  const { data } = useQuery<SiteIdentity>({ queryKey: ['/api/admin/site-identity'] });
  const [enabled, setEnabled] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(28);
  const [color, setColor] = useState<string>('#ffffff');
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (data && !hydrated) {
      setEnabled(data.tickerEnabled ?? true);
      setSpeed(data.tickerSpeed ?? 28);
      setColor(data.tickerTextColor ?? '#ffffff');
      setAnnouncements(data.announcements ?? []);
      setHydrated(true);
    }
  }, [data, hydrated]);

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      const filtered = announcements.filter(a => a.trim().length > 0);
      await saveSiteIdentityPatch({ tickerEnabled: enabled, tickerSpeed: speed, tickerTextColor: color, announcements: filtered.length > 0 ? filtered : [''] });
      setMsg({ type: 'success', text: 'Ticker ayarları kaydedildi.' });
      qc.invalidateQueries({ queryKey: ['/api/site-identity'] });
      qc.invalidateQueries({ queryKey: ['/api/admin/site-identity'] });
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Hata' });
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="section-ticker-settings">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-amber-50 rounded-lg"><Zap className="w-5 h-5 text-amber-600" /></div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Kayan Yazı Bandı</h3>
          <p className="text-sm text-neutral-500">Ticker hızı, rengi ve aktif/pasif durumu</p>
        </div>
      </div>
      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${msg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {msg.text}
        </div>
      )}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-neutral-700">Aktif</p>
            <p className="text-xs text-neutral-500">Pasif yapıldığında ticker gizlenir</p>
          </div>
          <button type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled(v => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-neutral-300'}`}
            data-testid="switch-ticker-enabled">
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Hız <span className="text-neutral-400 font-normal">(saniye, küçük = hızlı)</span>
            </label>
            <input type="number" min={5} max={120} value={speed}
              onChange={e => setSpeed(Math.max(5, Math.min(120, Number(e.target.value))))}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm"
              data-testid="input-ticker-speed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Yazı Rengi</label>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                className="h-9 w-14 rounded border border-neutral-200 cursor-pointer p-0.5"
                data-testid="input-ticker-color" />
              <input type="text" value={color} onChange={e => setColor(e.target.value)}
                className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm font-mono" />
            </div>
          </div>
        </div>
        {/* Duyuru metinleri listesi */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-neutral-700">Kayan Yazılar</label>
            <button
              type="button"
              onClick={() => setAnnouncements(a => [...a, ''])}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
            >
              + Yazı Ekle
            </button>
          </div>
          <div className="space-y-2">
            {announcements.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={e => setAnnouncements(a => a.map((v, i) => i === idx ? e.target.value : v))}
                  placeholder={`Yazı ${idx + 1}`}
                  className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setAnnouncements(a => a.filter((_, i) => i !== idx))}
                  className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                  aria-label="Sil"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
            {announcements.length === 0 && (
              <p className="text-xs text-neutral-400 italic">Henüz yazı eklenmedi. "+ Yazı Ekle" ile başlayın.</p>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-1.5">Her satır bandın bir döngüsünde görünür; sıra burada belirlendiği gibidir.</p>
        </div>

        <div className="pt-2 border-t border-neutral-100">
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            data-testid="button-save-ticker">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Üst Banner ──────────────────────────────────────────────────────────────
function TopBannerSection() {
  const qc = useQueryClient();
  const { data } = useQuery<SiteIdentity>({ queryKey: ['/api/admin/site-identity'] });
  const [enabled, setEnabled] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (data && !hydrated) {
      const b = data.topBanner;
      setEnabled(b?.enabled ?? false);
      setImageUrl(b?.imageUrl ?? '');
      setLinkUrl(b?.linkUrl ?? '');
      setHydrated(true);
    }
  }, [data, hydrated]);

  const handleUpload = async (file: File) => {
    setUploading(true); setMsg(null);
    try { setImageUrl(await uploadBannerImage(file)); }
    catch (e) { setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Hata' }); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      await saveSiteIdentityPatch({ topBanner: { enabled, imageUrl, linkUrl } });
      setMsg({ type: 'success', text: 'Üst banner kaydedildi.' });
      qc.invalidateQueries({ queryKey: ['/api/site-identity'] });
      qc.invalidateQueries({ queryKey: ['/api/admin/site-identity'] });
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Hata' });
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="section-top-banner">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-blue-50 rounded-lg"><Image className="w-5 h-5 text-blue-600" /></div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Üst Banner</h3>
          <p className="text-sm text-neutral-500">Ticker bandının üstünde gösterilen tam genişlik görsel veya GIF</p>
        </div>
      </div>
      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${msg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {msg.text}
        </div>
      )}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-neutral-700">Aktif</p>
            <p className="text-xs text-neutral-500">Pasif yapıldığında banner gizlenir</p>
          </div>
          <button type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled(v => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-neutral-300'}`}
            data-testid="switch-top-banner-enabled">
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Banner Görseli (PNG, JPG, GIF, WebP)</label>
          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" id="top-banner-file"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
          {imageUrl ? (
            <div className="space-y-2">
              <img src={imageUrl} alt="Banner önizleme" className="w-full max-h-40 object-cover rounded-lg border border-neutral-200" />
              <div className="flex gap-2">
                <label htmlFor="top-banner-file" className="cursor-pointer text-xs font-medium text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded px-2 py-1 transition-colors">
                  {uploading ? 'Yükleniyor…' : 'Değiştir'}
                </label>
                <button type="button" onClick={() => setImageUrl('')} className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1">Kaldır</button>
              </div>
            </div>
          ) : (
            <label htmlFor="top-banner-file" className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-neutral-200 rounded-lg hover:border-neutral-400 hover:bg-neutral-50 transition-colors cursor-pointer">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin text-neutral-400" /> : <Upload className="w-5 h-5 text-neutral-400" />}
              <span className="text-sm text-neutral-500">{uploading ? 'Yükleniyor…' : 'Bilgisayardan görsel seç'}</span>
              <span className="text-xs text-neutral-400">JPG, PNG, WebP veya GIF (animasyonlu desteklenir)</span>
            </label>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Tıklama Linki <span className="text-neutral-400 font-normal">(isteğe bağlı)</span></label>
          <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm" data-testid="input-top-banner-link" />
        </div>

        <div className="pt-2 border-t border-neutral-100">
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            data-testid="button-save-top-banner">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Popup Duyuru ────────────────────────────────────────────────────────────
function PopupBannerSection() {
  const qc = useQueryClient();
  const { data } = useQuery<SiteIdentity>({ queryKey: ['/api/admin/site-identity'] });
  const [enabled, setEnabled] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [delay, setDelay] = useState(3);
  const [showOnce, setShowOnce] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (data && !hydrated) {
      const p = data.popupBanner;
      setEnabled(p?.enabled ?? false);
      setImageUrl(p?.imageUrl ?? '');
      setLinkUrl(p?.linkUrl ?? '');
      setTitle(p?.title ?? '');
      setBody(p?.body ?? '');
      setDelay(p?.showAfterSeconds ?? 3);
      setShowOnce(p?.showOnce ?? true);
      setHydrated(true);
    }
  }, [data, hydrated]);

  const handleUpload = async (file: File) => {
    setUploading(true); setMsg(null);
    try { setImageUrl(await uploadBannerImage(file)); }
    catch (e) { setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Hata' }); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      await saveSiteIdentityPatch({ popupBanner: { enabled, imageUrl, linkUrl, title, body, showAfterSeconds: delay, showOnce } });
      setMsg({ type: 'success', text: 'Popup duyuru kaydedildi.' });
      qc.invalidateQueries({ queryKey: ['/api/site-identity'] });
      qc.invalidateQueries({ queryKey: ['/api/admin/site-identity'] });
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Hata' });
    } finally { setSaving(false); }
  };

  const inputCls = 'w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm';

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="section-popup-banner">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-purple-50 rounded-lg"><Bell className="w-5 h-5 text-purple-600" /></div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Popup Duyuru</h3>
          <p className="text-sm text-neutral-500">Ziyaretçilere sayfa açıldığında gösterilen popup</p>
        </div>
      </div>
      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${msg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {msg.text}
        </div>
      )}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-neutral-700">Aktif</p>
            <p className="text-xs text-neutral-500">Pasif yapıldığında popup gösterilmez</p>
          </div>
          <button type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled(v => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-neutral-300'}`}
            data-testid="switch-popup-enabled">
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Popup Görseli (PNG, JPG, GIF, WebP)</label>
          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" id="popup-banner-file"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
          {imageUrl ? (
            <div className="space-y-2">
              <img src={imageUrl} alt="Popup önizleme" className="w-full max-h-48 object-contain rounded-lg border border-neutral-200 bg-neutral-100" />
              <div className="flex gap-2">
                <label htmlFor="popup-banner-file" className="cursor-pointer text-xs font-medium text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded px-2 py-1 transition-colors">
                  {uploading ? 'Yükleniyor…' : 'Değiştir'}
                </label>
                <button type="button" onClick={() => setImageUrl('')} className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1">Kaldır</button>
              </div>
            </div>
          ) : (
            <label htmlFor="popup-banner-file" className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-neutral-200 rounded-lg hover:border-neutral-400 hover:bg-neutral-50 transition-colors cursor-pointer">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin text-neutral-400" /> : <Upload className="w-5 h-5 text-neutral-400" />}
              <span className="text-sm text-neutral-500">{uploading ? 'Yükleniyor…' : 'Bilgisayardan görsel seç'}</span>
              <span className="text-xs text-neutral-400">JPG, PNG, WebP veya GIF (animasyonlu desteklenir)</span>
            </label>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Başlık <span className="text-neutral-400 font-normal">(isteğe bağlı)</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Özel Fırsat!" className={inputCls} data-testid="input-popup-title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Tıklama Linki <span className="text-neutral-400 font-normal">(isteğe bağlı)</span></label>
            <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." className={inputCls} data-testid="input-popup-link" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Açıklama <span className="text-neutral-400 font-normal">(isteğe bağlı)</span></label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={2} placeholder="Sınırlı süre kampanya..." className={inputCls} data-testid="input-popup-body" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Gösterme Gecikmesi <span className="text-neutral-400 font-normal">(saniye)</span></label>
            <input type="number" min={0} max={60} value={delay} onChange={e => setDelay(Math.max(0, Number(e.target.value)))} className={inputCls} data-testid="input-popup-delay" />
          </div>
          <div className="flex items-center gap-3 mt-5">
            <input type="checkbox" id="popup-show-once" checked={showOnce} onChange={e => setShowOnce(e.target.checked)} className="w-4 h-4 accent-neutral-900" data-testid="checkbox-popup-show-once" />
            <label htmlFor="popup-show-once" className="text-sm text-neutral-700 cursor-pointer">Her oturumda değil, bir kez göster</label>
          </div>
        </div>

        <div className="pt-2 border-t border-neutral-100">
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            data-testid="button-save-popup">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactInfoSection() {
  const queryClient = useQueryClient();
  const [identity, setIdentity] = useState<SiteIdentity | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data } = useQuery<SiteIdentity>({ queryKey: ['/api/admin/site-identity'] });

  useEffect(() => {
    if (data && !identity) setIdentity(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!identity) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-6 flex items-center gap-3 text-neutral-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…
      </div>
    );
  }

  const set = (patch: Partial<SiteIdentity>) => setIdentity(prev => prev ? { ...prev, ...patch } : prev);

  const handleSave = async () => {
    if (!identity.phone.trim() || !identity.email.trim()) {
      setMsg({ type: 'error', text: 'Telefon ve e-posta zorunludur' });
      return;
    }
    const cleaned = {
      ...identity,
      addressLines: identity.addressLines.map(a => a.trim()).filter(Boolean),
    };
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/site-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleaned),
        credentials: 'include',
      });
      if (res.ok) {
        setIdentity(cleaned);
        setMsg({ type: 'success', text: 'İletişim bilgileri kaydedildi. /sayfa/iletisim sayfasına yansıdı.' });
        queryClient.invalidateQueries({ queryKey: ['/api/site-identity'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/site-identity'] });
      } else {
        const d = await res.json().catch(() => ({}));
        setMsg({ type: 'error', text: d.error || 'Kaydedilemedi' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Bir hata oluştu' });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm';
  const smallBtnCls = 'text-[11px] font-semibold text-neutral-500 hover:text-red-600 transition-colors shrink-0';
  const addBtnCls = 'text-[12px] font-semibold text-neutral-700 border border-neutral-200 rounded-lg px-3 py-1.5 hover:bg-neutral-50 transition-colors';

  return (
    <div className="bg-white border border-blue-200 rounded-xl p-6" data-testid="section-contact-info">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">İletişim Sayfası Bilgileri</h3>
            <p className="text-sm text-neutral-500">
              <a href="/sayfa/iletisim" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-blue-600">/sayfa/iletisim</a>
              {' '}adresinde görünen telefon, e-posta ve adres
            </p>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${
          msg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      <div className="space-y-4">
        {/* Phone */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Telefon <span className="text-red-500">*</span>
              <span className="text-neutral-400 font-normal ml-1">(sayfada görünen yazı)</span>
            </label>
            <input
              type="text"
              value={identity.phone}
              onChange={e => set({ phone: e.target.value })}
              placeholder="0536 630 11 38"
              className={inputCls}
              data-testid="input-contact-phone"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Telefon / WhatsApp Linki
              <span className="text-neutral-400 font-normal ml-1">(+905... formatında)</span>
            </label>
            <input
              type="text"
              value={identity.phoneHref}
              onChange={e => set({ phoneHref: e.target.value })}
              placeholder="+905366301138"
              className={inputCls}
              data-testid="input-contact-phone-href"
            />
            <p className="text-[11px] text-neutral-400 mt-1">Telefon araması ve WhatsApp linki bu değeri kullanır</p>
          </div>
        </div>

        {/* WhatsApp Order Button Toggle */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-lg border border-neutral-200 bg-neutral-50">
          <div>
            <p className="text-sm font-medium text-neutral-800">Ürün sayfasında "WhatsApp ile Sipariş Ver" butonu</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">Kapalıyken buton hiçbir ürün sayfasında gösterilmez</p>
          </div>
          <button
            type="button"
            onClick={() => set({ whatsappOrderEnabled: !identity.whatsappOrderEnabled })}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
              identity.whatsappOrderEnabled ? 'bg-emerald-500' : 'bg-neutral-300'
            }`}
            data-testid="toggle-whatsapp-order"
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              identity.whatsappOrderEnabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Working Hours */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            Çalışma Saatleri
            <span className="text-neutral-400 font-normal ml-1">(telefon kartında görünür)</span>
          </label>
          <input
            type="text"
            value={identity.workingHours ?? ''}
            onChange={e => set({ workingHours: e.target.value })}
            placeholder="Hf. 09:00 - 18:00"
            className={inputCls}
            data-testid="input-contact-working-hours"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            E-posta <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={identity.email}
            onChange={e => set({ email: e.target.value })}
            placeholder="sepetzen@gmail.com"
            className={inputCls}
            data-testid="input-contact-email"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Adres satırları</label>
          <div className="space-y-2">
            {identity.addressLines.map((line, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={line}
                  onChange={e => {
                    const list = [...identity.addressLines];
                    list[i] = e.target.value;
                    set({ addressLines: list });
                  }}
                  placeholder={`Adres satırı ${i + 1}`}
                  className={inputCls}
                  data-testid={`input-contact-address-${i}`}
                />
                <button
                  type="button"
                  onClick={() => set({ addressLines: identity.addressLines.filter((_, j) => j !== i) })}
                  className={smallBtnCls}
                >
                  Sil
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => set({ addressLines: [...identity.addressLines, ''] })}
            className={`${addBtnCls} mt-2`}
          >
            + Satır Ekle
          </button>
        </div>

        <div className="pt-2 border-t border-neutral-100">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            data-testid="button-save-contact-info"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? 'Kaydediliyor…' : 'İletişim Bilgilerini Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Site Identity (announcements, contact, footer, mobile nav) ────────────
function SiteIdentitySection() {
  const queryClient = useQueryClient();
  const [identity, setIdentity] = useState<SiteIdentity | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data } = useQuery<SiteIdentity>({ queryKey: ['/api/admin/site-identity'] });

  useEffect(() => {
    if (data && !identity) setIdentity(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!identity) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-6 flex items-center gap-3 text-neutral-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Site kimliği yükleniyor…
      </div>
    );
  }

  const set = (patch: Partial<SiteIdentity>) => setIdentity((prev) => (prev ? { ...prev, ...patch } : prev));

  const updateListItem = <K extends 'socialLinks' | 'kurumsalLinks' | 'yardimLinks' | 'mobileNavItems'>(
    key: K, idx: number, patch: Partial<SiteIdentity[K][number]>,
  ) => {
    const list = [...identity[key]] as any[];
    list[idx] = { ...list[idx], ...patch };
    set({ [key]: list } as any);
  };

  const removeListItem = (key: 'socialLinks' | 'kurumsalLinks' | 'yardimLinks' | 'mobileNavItems', idx: number) => {
    set({ [key]: identity[key].filter((_, i) => i !== idx) } as any);
  };

  const handleSave = async () => {
    // Client-side sanity checks matching server validation
    const cleaned: SiteIdentity = {
      ...identity,
      announcements: identity.announcements.map((a) => a.trim()).filter(Boolean),
      addressLines: identity.addressLines.map((a) => a.trim()).filter(Boolean),
      socialLinks: identity.socialLinks.filter((s) => s.url.trim() && s.label.trim()),
      kurumsalLinks: identity.kurumsalLinks.filter((l) => l.href.trim() && l.label.trim()),
      yardimLinks: identity.yardimLinks.filter((l) => l.href.trim() && l.label.trim()),
      mobileNavItems: identity.mobileNavItems.filter((l) => l.href.trim() && l.label.trim()),
    };
    if (!cleaned.announcements.length) { setMsg({ type: 'error', text: 'En az bir duyuru mesajı gerekli' }); return; }
    if (!cleaned.phone.trim() || !cleaned.email.trim()) { setMsg({ type: 'error', text: 'Telefon ve e-posta zorunludur' }); return; }
    if (!cleaned.addressLines.length) { setMsg({ type: 'error', text: 'En az bir adres satırı gerekli' }); return; }
    if (cleaned.mobileNavItems.length < 1 || cleaned.mobileNavItems.length > 5) { setMsg({ type: 'error', text: 'Mobil alt menü 1-5 öğe içermeli' }); return; }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/site-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleaned),
        credentials: 'include',
      });
      if (res.ok) {
        setIdentity(cleaned);
        setMsg({ type: 'success', text: 'Site kimliği kaydedildi. Değişiklikler sitede aktif.' });
        queryClient.invalidateQueries({ queryKey: ['/api/site-identity'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/site-identity'] });
      } else {
        const data = await res.json().catch(() => ({}));
        setMsg({ type: 'error', text: data.error || 'Kaydedilemedi' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Bir hata oluştu' });
    } finally {
      setSaving(false);
    }
  };

  const uploadBrandingFile = async (file: File, field: 'logoUrl' | 'faviconUrl') => {
    setMsg(null);
    const formData = new FormData();
    formData.append('images', file);
    try {
      const res = await fetch('/api/admin/upload/branding', { method: 'POST', body: formData, credentials: 'include' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.urls?.[0]) throw new Error(payload.error || 'Görsel yüklenemedi');
      set({ [field]: payload.urls[0] } as Partial<SiteIdentity>);
      setMsg({ type: 'success', text: field === 'logoUrl' ? 'Logo yüklendi. Kaydettiğinizde vitrine yansır.' : 'Favicon yüklendi. Kaydettiğinizde tarayıcı sekmesinde görünür.' });
    } catch (error) {
      setMsg({ type: 'error', text: error instanceof Error ? error.message : 'Görsel yüklenemedi' });
    }
  };

  const inputCls = 'w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm';
  const smallBtnCls = 'text-[11px] font-semibold text-neutral-500 hover:text-red-600 transition-colors shrink-0';
  const addBtnCls = 'text-[12px] font-semibold text-neutral-700 border border-neutral-200 rounded-lg px-3 py-1.5 hover:bg-neutral-50 transition-colors';
  const groupTitleCls = 'text-[12px] font-semibold tracking-wide uppercase text-neutral-500 mb-2';

  const ICON_OPTIONS: { value: MobileNavItem['icon']; label: string }[] = [
    { value: 'home', label: 'Ev' },
    { value: 'store', label: 'Mağaza' },
    { value: 'cart', label: 'Sepet' },
    { value: 'user', label: 'Kullanıcı' },
    { value: 'heart', label: 'Kalp' },
    { value: 'search', label: 'Arama' },
    { value: 'phone', label: 'Telefon' },
    { value: 'grid', label: 'Izgara' },
  ];

  const PLATFORM_OPTIONS: { value: SocialLink['platform']; label: string }[] = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'etsy', label: 'Etsy' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'twitter', label: 'Twitter/X' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'other', label: 'Diğer' },
  ];

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="section-site-identity">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-neutral-50 rounded-lg">
          <Megaphone className="w-5 h-5 text-neutral-900" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Site Kimliği & İletişim</h3>
          <p className="text-sm text-neutral-500">Duyuru bandı, telefon, e-posta, adres, sosyal medya, footer linkleri ve mobil alt menü</p>
        </div>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${
          msg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`} data-testid="text-site-identity-message">
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h4 className={groupTitleCls}>Logo ve Tarayıcı Simgesi</h4>
          <div className="grid md:grid-cols-2 gap-4">
            {([
              ['logoUrl', 'Site Logosu', 'img-logo-upload'],
              ['faviconUrl', 'Favicon', 'img-favicon-upload'],
            ] as const).map(([field, label, testId]) => (
              <div key={field} className="rounded-lg border border-neutral-200 p-3">
                <p className="mb-2 text-sm font-medium text-neutral-700">{label}</p>
                <div className="h-20 bg-neutral-950 rounded-md flex items-center justify-center overflow-hidden mb-3">
                  <img src={identity[field]} alt={`${label} önizleme`} className="max-h-full max-w-full object-contain" />
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-neutral-700 hover:text-neutral-950">
                  <Upload className="h-4 w-4" /> Görsel Yükle
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" data-testid={testId} onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadBrandingFile(file, field);
                    event.target.value = '';
                  }} />
                </label>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-500">PNG, JPG, WebP ve GIF desteklenir. Logo için yatay PNG/WebP, favicon için kare PNG önerilir. Yüklenen görseli siteye aktarmak için aşağıdan kaydedin.</p>
        </div>

        {/* Announcements */}
        <div>
          <h4 className={groupTitleCls}>Duyuru Bandı Mesajları</h4>
          <div className="space-y-2">
            {identity.announcements.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={a}
                  onChange={(e) => {
                    const list = [...identity.announcements];
                    list[i] = e.target.value;
                    set({ announcements: list });
                  }}
                  className={inputCls}
                  data-testid={`input-announcement-${i}`}
                />
                <button type="button" onClick={() => set({ announcements: identity.announcements.filter((_, j) => j !== i) })} className={smallBtnCls} data-testid={`button-remove-announcement-${i}`}>Sil</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => set({ announcements: [...identity.announcements, ''] })} className={`${addBtnCls} mt-2`} data-testid="button-add-announcement">+ Mesaj Ekle</button>
        </div>

        {/* Contact */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Telefon (görünen)</label>
            <input type="text" value={identity.phone} onChange={(e) => set({ phone: e.target.value })} className={inputCls} data-testid="input-identity-phone" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Telefon (arama linki, örn. +905XXXXXXXXX)</label>
            <input type="text" value={identity.phoneHref} onChange={(e) => set({ phoneHref: e.target.value })} className={inputCls} data-testid="input-identity-phone-href" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">E-posta</label>
            <input type="email" value={identity.email} onChange={(e) => set({ email: e.target.value })} className={inputCls} data-testid="input-identity-email" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Telif Metni (footer)</label>
            <input type="text" value={identity.copyright} onChange={(e) => set({ copyright: e.target.value })} className={inputCls} data-testid="input-identity-copyright" />
          </div>
        </div>

        {/* Address */}
        <div>
          <h4 className={groupTitleCls}>Adres (Satır Satır)</h4>
          <div className="space-y-2">
            {identity.addressLines.map((line, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={line}
                  onChange={(e) => {
                    const list = [...identity.addressLines];
                    list[i] = e.target.value;
                    set({ addressLines: list });
                  }}
                  className={inputCls}
                  data-testid={`input-address-line-${i}`}
                />
                <button type="button" onClick={() => set({ addressLines: identity.addressLines.filter((_, j) => j !== i) })} className={smallBtnCls} data-testid={`button-remove-address-line-${i}`}>Sil</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => set({ addressLines: [...identity.addressLines, ''] })} className={`${addBtnCls} mt-2`} data-testid="button-add-address-line">+ Satır Ekle</button>
        </div>

        {/* Social links */}
        <div>
          <h4 className={groupTitleCls}>Sosyal Medya Linkleri</h4>
          <div className="space-y-2">
            {identity.socialLinks.map((s, i) => (
              <div key={i} className="flex flex-col md:flex-row gap-2">
                <select value={s.platform} onChange={(e) => updateListItem('socialLinks', i, { platform: e.target.value as SocialLink['platform'] })} className={`${inputCls} md:w-36`} data-testid={`select-social-platform-${i}`}>
                  {PLATFORM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input type="text" value={s.url} onChange={(e) => updateListItem('socialLinks', i, { url: e.target.value })} placeholder="https://..." className={inputCls} data-testid={`input-social-url-${i}`} />
                <div className="flex items-center gap-2">
                  <input type="text" value={s.label} onChange={(e) => updateListItem('socialLinks', i, { label: e.target.value })} placeholder="Görünen ad" className={`${inputCls} md:w-40`} data-testid={`input-social-label-${i}`} />
                  <button type="button" onClick={() => removeListItem('socialLinks', i)} className={smallBtnCls} data-testid={`button-remove-social-${i}`}>Sil</button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => set({ socialLinks: [...identity.socialLinks, { platform: 'other', url: '', label: '' }] })} className={`${addBtnCls} mt-2`} data-testid="button-add-social">+ Sosyal Medya Ekle</button>
        </div>

        {/* Footer link groups */}
        {([['kurumsalLinks', 'Footer: Kurumsal Linkler'], ['yardimLinks', 'Footer: Yardım Linkleri']] as const).map(([key, title]) => (
          <div key={key}>
            <h4 className={groupTitleCls}>{title}</h4>
            <div className="space-y-2">
              {identity[key].map((l, i) => (
                <div key={i} className="flex flex-col md:flex-row gap-2">
                  <input type="text" value={l.label} onChange={(e) => updateListItem(key, i, { label: e.target.value })} placeholder="Etiket" className={inputCls} data-testid={`input-${key}-label-${i}`} />
                  <div className="flex items-center gap-2 md:w-[55%]">
                    <input type="text" value={l.href} onChange={(e) => updateListItem(key, i, { href: e.target.value })} placeholder="/sayfa/..." className={inputCls} data-testid={`input-${key}-href-${i}`} />
                    <button type="button" onClick={() => removeListItem(key, i)} className={smallBtnCls} data-testid={`button-remove-${key}-${i}`}>Sil</button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => set({ [key]: [...identity[key], { href: '', label: '' }] } as any)} className={`${addBtnCls} mt-2`} data-testid={`button-add-${key}`}>+ Link Ekle</button>
          </div>
        ))}

        {/* Mobile bottom nav */}
        <div>
          <h4 className={groupTitleCls}>Mobil Alt Menü (1-5 Öğe)</h4>
          <div className="space-y-2">
            {identity.mobileNavItems.map((item, i) => (
              <div key={i} className="flex flex-col md:flex-row gap-2">
                <input type="text" value={item.label} onChange={(e) => updateListItem('mobileNavItems', i, { label: e.target.value })} placeholder="Etiket" className={inputCls} data-testid={`input-mobilenav-label-${i}`} />
                <input type="text" value={item.href} onChange={(e) => updateListItem('mobileNavItems', i, { href: e.target.value })} placeholder="/yol" className={`${inputCls} md:w-40`} data-testid={`input-mobilenav-href-${i}`} />
                <div className="flex items-center gap-2">
                  <select value={item.icon} onChange={(e) => updateListItem('mobileNavItems', i, { icon: e.target.value as MobileNavItem['icon'] })} className={`${inputCls} md:w-32`} data-testid={`select-mobilenav-icon-${i}`}>
                    {ICON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <button type="button" onClick={() => removeListItem('mobileNavItems', i)} className={smallBtnCls} data-testid={`button-remove-mobilenav-${i}`}>Sil</button>
                </div>
              </div>
            ))}
          </div>
          {identity.mobileNavItems.length < 5 && (
            <button type="button" onClick={() => set({ mobileNavItems: [...identity.mobileNavItems, { href: '', label: '', icon: 'grid' }] })} className={`${addBtnCls} mt-2`} data-testid="button-add-mobilenav">+ Öğe Ekle</button>
          )}
        </div>

        <div className="pt-2 border-t border-neutral-100">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            data-testid="button-save-site-identity"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? 'Kaydediliyor…' : 'Site Kimliğini Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

type SettingsSection = 'genel' | 'odeme' | 'kargo' | 'bildirim' | 'guvenlik';
type GenelTab = 'marka' | 'vitrin' | 'iletisim' | 'site';

const SETTINGS_SECTIONS: { key: SettingsSection; label: string; Icon: ComponentType<{ className?: string }> }[] = [
  { key: 'genel', label: 'Genel', Icon: Settings },
  { key: 'odeme', label: 'Ödeme', Icon: CreditCard },
  { key: 'kargo', label: 'Kargo', Icon: Truck },
  { key: 'bildirim', label: 'Bildirimler', Icon: Mail },
  { key: 'guvenlik', label: 'Giriş & Güvenlik', Icon: ShieldCheck },
];

export default function SettingsPanel({ initialSection = 'genel', contentOnly = false }: {
  initialSection?: SettingsSection;
  contentOnly?: boolean;
}) {
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const [genelTab, setGenelTab] = useState<GenelTab>('marka');
  const [settings, setSettings] = useState<Record<string, string>>({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_secure: 'false',
    admin_email: '',
    site_url: '',
    site_name: '',
    google_merchant_enabled: 'false',
    google_merchant_brand: '',
    google_merchant_category: '',
    google_merchant_include_out_of_stock: 'false',
    wpileti_enabled: 'false',
    wpileti_api_key: '',
    wpileti_endpoint: 'http://127.0.0.1:3225/api/send-message',
    wpileti_admin_phone: '',
    turnstile_site_key: '',
    turnstile_secret_key: '',
    openai_api_key: '',
    aras_kargo_enabled: 'false',
    aras_kargo_username: '',
    aras_kargo_password: '',
    aras_kargo_customer_code: '',
    aras_kargo_setorder_url: 'https://customerws.araskargo.com.tr/arascargoservice.asmx',
    aras_kargo_query_url: 'https://customerservices.araskargo.com.tr/ArasCargoCustomerIntegrationService/ArasCargoIntegrationService.svc',
    aras_kargo_sender_address_id: '',
    aras_kargo_default_desi: '1',
    free_shipping_threshold: '1500',
    domestic_shipping_cost: '200',
    international_shipping_cost: '2500',
    country_shipping_rates: '[]',
    shipping_provider: 'aras',
    geliver_enabled: 'false',
    geliver_api_token: '',
    geliver_sender_address_id: '',
    geliver_service_code: 'GELIVER_STANDART',
    geliver_store_url: '',
    geliver_test_mode: 'false',
    shipentegra_enabled: 'false',
    shipentegra_client_id: '',
    shipentegra_client_secret: '',
    shipentegra_test_mode: 'false',
    shipentegra_shipping_type: '1',
    shipentegra_sender_name: '',
    shipentegra_sender_address: '',
    shipentegra_sender_city: '',
    shipentegra_sender_zip: '',
    shipentegra_sender_phone: '',
    shipentegra_sender_email: '',
    google_tag_code: '',
    custom_css: '',
    ...Object.fromEntries(WHATSAPP_EVENTS.flatMap(({ key, defaultTpl }) => [
      [`wpileti_evt_${key}`, 'true'],
      [`wpileti_tpl_${key}`, defaultTpl],
    ])),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [iyzicoSaving, setIyzicoSaving] = useState(false);
  const [callbackCopied, setCallbackCopied] = useState(false);
  const [merchantLinkCopied, setMerchantLinkCopied] = useState(false);
  const [iyzicoApiKey, setIyzicoApiKey] = useState('');
  const [iyzicoSecretKey, setIyzicoSecretKey] = useState('');
  const [iyzicoTesting, setIyzicoTesting] = useState(false);
  const [iyzicoTestResult, setIyzicoTestResult] = useState<{
    ok: boolean;
    errorCode?: string;
    errorMessage?: string;
    apiKeyLength?: number;
    secretKeyLength?: number;
    uri?: string;
  } | null>(null);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const [maintenanceContentSaving, setMaintenanceContentSaving] = useState(false);
  const [maintenanceContent, setMaintenanceContent] = useState({
    title: '',
    logoUrl: '',
    heading: '',
    description: '',
    instagramHandle: '',
  });
  const [waTesting, setWaTesting] = useState(false);
  const [waTestPhone, setWaTestPhone] = useState('');
  const [waTestMessage, setWaTestMessage] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountCurrentPassword, setAccountCurrentPassword] = useState('');
  const [accountNewUsername, setAccountNewUsername] = useState('');
  const [accountNewPassword, setAccountNewPassword] = useState('');
  const [accountNewPassword2, setAccountNewPassword2] = useState('');

  // Ülke bazlı kargo tarifeleri - ayrı local state, settings.country_shipping_rates ile senkronize
  type CountryRateRow = { country: string; cost: string };
  const [countryRateRows, setCountryRateRows] = useState<CountryRateRow[]>([]);

  const { data: maintenanceData, refetch: refetchMaintenance } = useQuery<{
    enabled: boolean;
    content: { title: string; logoUrl: string; heading: string; description: string; instagramHandle: string };
  }>({
    queryKey: ['/api/admin/maintenance'],
  });

  // Sunucudan gelen içeriği local state'e yükle (sadece bir kez)
  const maintenanceContentLoaded = useRef(false);
  useEffect(() => {
    if (maintenanceData?.content && !maintenanceContentLoaded.current) {
      maintenanceContentLoaded.current = true;
      setMaintenanceContent({
        title: maintenanceData.content.title || '',
        logoUrl: maintenanceData.content.logoUrl || '',
        heading: maintenanceData.content.heading || '',
        description: maintenanceData.content.description || '',
        instagramHandle: maintenanceData.content.instagramHandle || '',
      });
    }
  }, [maintenanceData]);

  const handleMaintenanceToggle = async (enabled: boolean) => {
    if (!maintenanceData || maintenanceData.enabled === enabled) return;
    setMaintenanceSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
        credentials: 'include',
      });
      if (res.ok) {
        await refetchMaintenance();
        setMessage({
          type: 'success',
          text: enabled
            ? 'Bakım modu AÇILDI. Site ziyaretçilere bakım sayfası gösteriliyor. Admin paneli açık kalır.'
            : 'Bakım modu KAPATILDI. Site normal şekilde yayında.',
        });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Bakım modu değiştirilemedi' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Bakım modu değiştirilemedi' });
    } finally {
      setMaintenanceSaving(false);
    }
  };

  const { data: iyzicoConfig, refetch: refetchIyzico } = useQuery<{
    mode: 'live';
    configured: boolean;
    apiKeyMasked: string;
    secretKeyMasked: string;
    hasApiKey: boolean;
    hasSecretKey: boolean;
    callbackUrl: string;
    baseUrl: string;
  }>({
    queryKey: ['/api/admin/iyzico/config'],
  });

  const handleIyzicoSaveCredentials = async () => {
    if (!iyzicoApiKey.trim() || !iyzicoSecretKey.trim()) {
      setMessage({ type: 'error', text: 'API anahtarı ve gizli anahtar zorunludur.' });
      return;
    }
    setIyzicoSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/iyzico/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: iyzicoApiKey.trim(),
          secretKey: iyzicoSecretKey.trim(),
        }),
        credentials: 'include',
      });
      if (res.ok) {
        await refetchIyzico();
        setIyzicoApiKey('');
        setIyzicoSecretKey('');
        setMessage({
          type: 'success',
          text: 'iyzico anahtarları kaydedildi. Ödemeler artık canlı (production) modda işlenecek.',
        });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Anahtarlar kaydedilemedi' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Anahtarlar kaydedilemedi' });
    } finally {
      setIyzicoSaving(false);
    }
  };

  const handleIyzicoTestConnection = async () => {
    setIyzicoTesting(true);
    setIyzicoTestResult(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/iyzico/test', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      setIyzicoTestResult(data);
    } catch {
      setIyzicoTestResult({ ok: false, errorMessage: 'Test isteği gönderilemedi' });
    } finally {
      setIyzicoTesting(false);
    }
  };

  const handleCopyCallback = async () => {
    if (!iyzicoConfig?.callbackUrl) return;
    try {
      await navigator.clipboard.writeText(iyzicoConfig.callbackUrl);
      setCallbackCopied(true);
      setTimeout(() => setCallbackCopied(false), 2000);
    } catch {
      setMessage({ type: 'error', text: 'URL panoya kopyalanamadı' });
    }
  };

  // ── PayTR ayarları ──────────────────────────────────────────────
  const [paytrSaving, setPaytrSaving] = useState(false);
  const [paytrMerchantId, setPaytrMerchantId] = useState('');
  const [paytrMerchantKey, setPaytrMerchantKey] = useState('');
  const [paytrMerchantSalt, setPaytrMerchantSalt] = useState('');
  const [paytrMaxInstallment, setPaytrMaxInstallment] = useState<number | null>(null);
  const [paytrCallbackCopied, setPaytrCallbackCopied] = useState(false);

  const { data: paytrConfig, refetch: refetchPaytr } = useQuery<{
    mode: 'live';
    configured: boolean;
    merchantId: string;
    merchantKeyMasked: string;
    merchantSaltMasked: string;
    callbackUrl: string;
    baseUrl: string;
    maxInstallment: number;
  }>({
    queryKey: ['/api/admin/paytr/config'],
  });

  const { data: methodToggles, refetch: refetchMethodToggles } = useQuery<{
    iyzicoEnabled: boolean;
    paytrEnabled: boolean;
    iyzicoConfigured: boolean;
    paytrConfigured: boolean;
  }>({
    queryKey: ['/api/admin/payment-methods'],
  });

  const handlePaytrSaveCredentials = async () => {
    if (!paytrMerchantId.trim() || !paytrMerchantKey.trim() || !paytrMerchantSalt.trim()) {
      setMessage({ type: 'error', text: 'Mağaza no, mağaza parola ve gizli anahtar zorunludur.' });
      return;
    }
    setPaytrSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/paytr/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: paytrMerchantId.trim(),
          merchantKey: paytrMerchantKey.trim(),
          merchantSalt: paytrMerchantSalt.trim(),
          ...(paytrMaxInstallment !== null ? { maxInstallment: paytrMaxInstallment } : {}),
        }),
        credentials: 'include',
      });
      if (res.ok) {
        await Promise.all([refetchPaytr(), refetchMethodToggles()]);
        setPaytrMerchantId('');
        setPaytrMerchantKey('');
        setPaytrMerchantSalt('');
        setMessage({
          type: 'success',
          text: 'PayTR anahtarları kaydedildi. Ödemeler canlı modda işlenecek.',
        });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'PayTR anahtarları kaydedilemedi' });
      }
    } catch {
      setMessage({ type: 'error', text: 'PayTR anahtarları kaydedilemedi' });
    } finally {
      setPaytrSaving(false);
    }
  };

  const handleToggleMethod = async (which: 'iyzico' | 'paytr', enabled: boolean) => {
    try {
      const res = await fetch('/api/admin/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(which === 'iyzico' ? { iyzicoEnabled: enabled } : { paytrEnabled: enabled }),
        credentials: 'include',
      });
      if (res.ok) {
        await refetchMethodToggles();
      } else {
        setMessage({ type: 'error', text: 'Ödeme yöntemi durumu güncellenemedi' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Ödeme yöntemi durumu güncellenemedi' });
    }
  };

  const handleCopyPaytrCallback = async () => {
    if (!paytrConfig?.callbackUrl) return;
    try {
      await navigator.clipboard.writeText(paytrConfig.callbackUrl);
      setPaytrCallbackCopied(true);
      setTimeout(() => setPaytrCallbackCopied(false), 2000);
    } catch {
      setMessage({ type: 'error', text: 'URL panoya kopyalanamadı' });
    }
  };

  // ── Havale ayarları ─────────────────────────────────────────────
  const [bankSaving, setBankSaving] = useState(false);
  const [bankForm, setBankForm] = useState<{ bankName: string; accountHolder: string; iban: string; discountPercent: string } | null>(null);

  const { data: bankConfig, refetch: refetchBank } = useQuery<{
    enabled: boolean;
    bankName: string;
    accountHolder: string;
    iban: string;
    discountPercent: number;
  }>({
    queryKey: ['/api/admin/bank-transfer/config'],
  });

  const bankFormValues = bankForm ?? (bankConfig ? {
    bankName: bankConfig.bankName,
    accountHolder: bankConfig.accountHolder,
    iban: bankConfig.iban,
    discountPercent: String(bankConfig.discountPercent),
  } : { bankName: '', accountHolder: '', iban: '', discountPercent: '10' });

  const handleBankSave = async () => {
    const pct = Number(bankFormValues.discountPercent);
    if (!bankFormValues.bankName.trim() || !bankFormValues.accountHolder.trim() || !bankFormValues.iban.trim()) {
      setMessage({ type: 'error', text: 'Banka adı, hesap sahibi ve IBAN zorunludur.' });
      return;
    }
    if (!Number.isFinite(pct) || pct < 0 || pct > 50) {
      setMessage({ type: 'error', text: 'İndirim oranı 0 ile 50 arasında olmalıdır.' });
      return;
    }
    setBankSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/bank-transfer/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName: bankFormValues.bankName.trim(),
          accountHolder: bankFormValues.accountHolder.trim(),
          iban: bankFormValues.iban.trim().toUpperCase(),
          discountPercent: pct,
        }),
        credentials: 'include',
      });
      if (res.ok) {
        await refetchBank();
        setBankForm(null);
        setMessage({ type: 'success', text: 'Havale ayarları kaydedildi. Ödeme sayfası, e-posta ve sipariş takip sayfaları yeni bilgileri kullanacak.' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Havale ayarları kaydedilemedi' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Havale ayarları kaydedilemedi' });
    } finally {
      setBankSaving(false);
    }
  };

  const handleBankToggle = async (enabled: boolean) => {
    try {
      const res = await fetch('/api/admin/bank-transfer/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
        credentials: 'include',
      });
      if (res.ok) {
        await refetchBank();
      } else {
        setMessage({ type: 'error', text: 'Havale durumu güncellenemedi' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Havale durumu güncellenemedi' });
    }
  };

  const { data: savedSettings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/settings'],
  });

  const { data: merchantStatus, refetch: refetchMerchantStatus, isFetching: merchantStatusLoading } = useQuery<{
    enabled: boolean;
    feedUrl: string;
    itemCount: number;
    productCount: number;
  }>({
    queryKey: ['/api/admin/google-merchant/status'],
  });

  useEffect(() => {
    if (savedSettings) {
      setSettings(prev => {
        const next: Record<string, string> = { ...prev };
        for (const [k, v] of Object.entries(savedSettings)) {
          if (v !== undefined && v !== null) next[k] = String(v);
        }
        return next;
      });
      if (savedSettings.admin_email) {
        setTestEmail(savedSettings.admin_email);
      }
      if (savedSettings.wpileti_admin_phone && !waTestPhone) {
        setWaTestPhone(savedSettings.wpileti_admin_phone);
      }
      // Ülke bazlı kargo tarifelerini ayrıştır
      try {
        const rows = JSON.parse(savedSettings.country_shipping_rates ?? '[]');
        if (Array.isArray(rows)) {
          setCountryRateRows(rows.map((r: { country: string; cost: number | string }) => ({
            country: String(r.country),
            cost: String(r.cost),
          })));
        }
      } catch { /* geçersiz JSON - boş bırak */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSettings]);

  /** Ülke bazlı satır değişince settings.country_shipping_rates'i güncelle */
  const syncCountryRates = (rows: CountryRateRow[]) => {
    setCountryRateRows(rows);
    setSettings(s => ({
      ...s,
      country_shipping_rates: JSON.stringify(
        rows.map(r => ({ country: r.country, cost: Number(r.cost) || 0 }))
      ),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        credentials: 'include',
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Ayarlar kaydedildi!' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Ayarlar kaydedilemedi' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Bir hata oluştu' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!waTestPhone.trim()) {
      setMessage({ type: 'error', text: 'Test için telefon numarası girin (90XXXXXXXXXX formatında)' });
      return;
    }
    setWaTesting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: waTestPhone, message: waTestMessage || undefined }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Test WhatsApp mesajı gönderildi!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Test mesajı gönderilemedi' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Bir hata oluştu' });
    } finally {
      setWaTesting(false);
    }
  };

  const handleAccountUpdate = async () => {
    if (!accountCurrentPassword) {
      setMessage({ type: 'error', text: 'Mevcut şifrenizi girmelisiniz' });
      return;
    }
    if (!accountNewUsername.trim() && !accountNewPassword) {
      setMessage({ type: 'error', text: 'Yeni kullanıcı adı veya yeni şifre girin' });
      return;
    }
    if (accountNewPassword && accountNewPassword !== accountNewPassword2) {
      setMessage({ type: 'error', text: 'Yeni şifreler eşleşmiyor' });
      return;
    }
    if (accountNewPassword && accountNewPassword.length < 8) {
      setMessage({ type: 'error', text: 'Yeni şifre en az 8 karakter olmalı' });
      return;
    }

    setAccountSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: accountCurrentPassword,
          newUsername: accountNewUsername.trim() || undefined,
          newPassword: accountNewPassword || undefined,
        }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        const parts: string[] = [];
        if (data.usernameChanged) parts.push('kullanıcı adı');
        if (data.passwordChanged) parts.push('şifre');
        setMessage({
          type: 'success',
          text: `Yönetici ${parts.join(' ve ')} başarıyla güncellendi.${
            data.passwordChanged ? ' Bir sonraki girişte yeni şifrenizi kullanın.' : ''
          }`,
        });
        setAccountCurrentPassword('');
        setAccountNewUsername('');
        setAccountNewPassword('');
        setAccountNewPassword2('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Güncelleme başarısız' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Bir hata oluştu' });
    } finally {
      setAccountSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) return;
    setIsTesting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Test e-postası gönderildi!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Test e-postası gönderilemedi' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Bir hata oluştu' });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!contentOnly && <div>
        <h2 className="text-2xl font-bold text-neutral-900">Ayarlar</h2>
        <p className="text-neutral-500">Site, ödeme, kargo, bildirim ve güvenlik ayarlarını yönetin</p>
      </div>}

      {!contentOnly && <div className="flex flex-wrap gap-1.5 border-b border-neutral-200 pb-px -mb-2" data-testid="settings-tabs">
        {SETTINGS_SECTIONS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSection(key)}
            data-testid={`tab-settings-${key}`}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border border-b-0 transition-colors ${
              section === key
                ? 'bg-white border-neutral-200 text-neutral-900 shadow-sm relative -mb-px'
                : 'bg-transparent border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>}

      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-neutral-500/10 border border-neutral-500/30 text-neutral-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {section === 'genel' && (
        <>
          {/* Genel alt sekme navigasyonu */}
          <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl">
            {([
              { key: 'marka',    label: 'Marka'    },
              { key: 'vitrin',   label: 'Vitrin'   },
              { key: 'iletisim', label: 'İletişim' },
              { key: 'site',     label: 'Site'     },
            ] as { key: GenelTab; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setGenelTab(key)}
                className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-lg transition-colors ${
                  genelTab === key
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {genelTab === 'marka' && (
            <div className="space-y-6">
              <SiteIdentitySection />
            </div>
          )}

          {genelTab === 'vitrin' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600" data-testid="content-context-showcase">
                <strong className="text-neutral-900">Mağaza vitrini</strong>
                <p className="mt-1 text-xs">
                  Ziyaretçilerin mağazaya girdiğinde gördüğü banner, popup ve duyuru bandını burada yönetin.
                  Ana sayfa bölümleri Ana Sayfa sekmesinde, menü bağlantıları Menü Yönetimi'nde, bilgi sayfaları Sayfalar'da ve yazılar Blog'da düzenlenir.
                </p>
              </div>
              <StockVisibilitySection />
              <SnowSettingsSection />
              <FilterAttributesSection />
              <TickerSettingsSection />
              <TopBannerSection />
              <PopupBannerSection />
            </div>
          )}

          {genelTab === 'iletisim' && (
            <div className="space-y-6">
              <ContactInfoSection />
            </div>
          )}
        </>
      )}

      {section === 'bildirim' && (<>
      <EmailBrandingSection />

      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <Server className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">SMTP Ayarları</h3>
            <p className="text-sm text-neutral-500">E-posta gönderimi için SMTP sunucu yapılandırması</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">SMTP Sunucu</label>
            <input
              type="text"
              value={settings.smtp_host}
              onChange={(e) => setSettings(s => ({ ...s, smtp_host: e.target.value }))}
              placeholder="mail.example.com"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:border-white transition-colors"
              data-testid="input-smtp-host"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Port</label>
            <input
              type="text"
              value={settings.smtp_port}
              onChange={(e) => setSettings(s => ({ ...s, smtp_port: e.target.value }))}
              placeholder="587"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:border-white transition-colors"
              data-testid="input-smtp-port"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Kullanıcı Adı (E-posta)</label>
            <input
              type="text"
              value={settings.smtp_user}
              onChange={(e) => setSettings(s => ({ ...s, smtp_user: e.target.value }))}
              placeholder="no-reply@example.com"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:border-white transition-colors"
              data-testid="input-smtp-user"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Şifre</label>
            <input
              type="password"
              value={settings.smtp_pass}
              onChange={(e) => setSettings(s => ({ ...s, smtp_pass: e.target.value }))}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:border-white transition-colors"
              data-testid="input-smtp-pass"
            />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.smtp_secure === 'true'}
                onChange={(e) => setSettings(s => ({ ...s, smtp_secure: e.target.checked ? 'true' : 'false' }))}
                className="w-5 h-5 rounded bg-neutral-50 border-neutral-200"
              />
              <span className="text-sm text-neutral-900">SSL/TLS Kullan (Port 465 için)</span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <Mail className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Bildirim Ayarları</h3>
            <p className="text-sm text-neutral-500">Sipariş bildirimleri için admin e-posta adresi</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Admin E-posta</label>
            <input
              type="email"
              value={settings.admin_email}
              onChange={(e) => setSettings(s => ({ ...s, admin_email: e.target.value }))}
              placeholder="admin@example.com"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:border-white transition-colors"
              data-testid="input-admin-email"
            />
            <p className="text-xs text-neutral-500 mt-1">Yeni sipariş bildirimleri bu adrese gönderilir</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Site URL</label>
            <input
              type="text"
              value={settings.site_url}
              onChange={(e) => setSettings(s => ({ ...s, site_url: e.target.value }))}
              placeholder="https://polenstone.com"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:border-white transition-colors"
              data-testid="input-site-url"
            />
            <p className="text-xs text-neutral-500 mt-1">E-postalardaki bağlantılar için kullanılır</p>
          </div>
        </div>
      </div>
      </>)}

      {section === 'genel' && genelTab === 'site' && (
      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-maintenance-settings">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <Wrench className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Bakım Modu</h3>
            <p className="text-sm text-neutral-500">Açıkken siteye gelen ziyaretçilere bakım sayfası gösterilir. Admin paneli ve API erişimi açık kalır.</p>
          </div>
        </div>

        {!maintenanceData ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleMaintenanceToggle(false)}
                disabled={maintenanceSaving}
                data-testid="button-maintenance-off"
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors text-left ${
                  !maintenanceData.enabled
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {!maintenanceData.enabled && <CheckCircle2 className="w-4 h-4" />}
                  <span>KAPALI · Site yayında</span>
                </div>
                <div className={`text-xs mt-1 ${!maintenanceData.enabled ? 'text-white/70' : 'text-neutral-500'}`}>
                  Normal çalışma modu
                </div>
              </button>
              <button
                onClick={() => handleMaintenanceToggle(true)}
                disabled={maintenanceSaving}
                data-testid="button-maintenance-on"
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors text-left ${
                  maintenanceData.enabled
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {maintenanceData.enabled && <CheckCircle2 className="w-4 h-4" />}
                  <span>AÇIK · Bakım sayfası</span>
                </div>
                <div className={`text-xs mt-1 ${maintenanceData.enabled ? 'text-white/80' : 'text-neutral-500'}`}>
                  Ziyaretçiler bakım sayfasını görür
                </div>
              </button>
            </div>

            {maintenanceData.enabled && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  Site şu anda bakımda. Ziyaretçiler bakım sayfasını görüyor. Admin paneline (<code>/admin</code>) erişim sürüyor.
                </div>
              </div>
            )}

            {/* ── Bakım sayfası içerik düzenleyici ───────────────────── */}
            <div className="border-t border-neutral-100 pt-5 space-y-4">
              <p className="text-sm font-semibold text-neutral-700">Bakım Sayfası İçeriği</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Sayfa Başlığı (tarayıcı sekmesi)</label>
                  <input
                    type="text"
                    value={maintenanceContent.title}
                    onChange={e => setMaintenanceContent(c => ({ ...c, title: e.target.value }))}
                    placeholder="Bakım Modu - Sepetzen"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:border-neutral-400 transition-colors"
                    data-testid="input-maintenance-title"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Instagram Kullanıcı Adı</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm select-none">@</span>
                    <input
                      type="text"
                      value={maintenanceContent.instagramHandle}
                      onChange={e => setMaintenanceContent(c => ({ ...c, instagramHandle: e.target.value.replace(/^@/, '') }))}
                      placeholder="sepetzen"
                      className="w-full pl-7 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:border-neutral-400 transition-colors"
                      data-testid="input-maintenance-instagram"
                    />
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">Boş bırakılırsa Instagram linki gösterilmez.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Logo URL</label>
                <input
                  type="text"
                  value={maintenanceContent.logoUrl}
                  onChange={e => setMaintenanceContent(c => ({ ...c, logoUrl: e.target.value }))}
                  placeholder="/uploads/branding/logo.png"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-mono text-neutral-900 focus:outline-none focus:border-neutral-400 transition-colors"
                  data-testid="input-maintenance-logo-url"
                />
                <p className="text-xs text-neutral-400 mt-1">Boş bırakılırsa logo gösterilmez.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Ana Başlık (h1)</label>
                <input
                  type="text"
                  value={maintenanceContent.heading}
                  onChange={e => setMaintenanceContent(c => ({ ...c, heading: e.target.value }))}
                  placeholder="Yakında yeni tasarımımız ile sizlerle birlikteyiz."
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:border-neutral-400 transition-colors"
                  data-testid="input-maintenance-heading"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Açıklama Metni</label>
                <textarea
                  rows={2}
                  value={maintenanceContent.description}
                  onChange={e => setMaintenanceContent(c => ({ ...c, description: e.target.value }))}
                  placeholder="Sitemiz şu anda bakımda. Daha iyi bir deneyim için çalışıyoruz..."
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 resize-y focus:outline-none focus:border-neutral-400 transition-colors"
                  data-testid="input-maintenance-description"
                />
              </div>

              <button
                type="button"
                disabled={maintenanceContentSaving}
                onClick={async () => {
                  setMaintenanceContentSaving(true);
                  setMessage(null);
                  try {
                    const res = await fetch('/api/admin/maintenance/content', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(maintenanceContent),
                      credentials: 'include',
                    });
                    if (res.ok) {
                      await refetchMaintenance();
                      maintenanceContentLoaded.current = false;
                      setMessage({ type: 'success', text: 'Bakım sayfası içeriği kaydedildi.' });
                    } else {
                      const d = await res.json();
                      setMessage({ type: 'error', text: d.error || 'Kaydedilemedi.' });
                    }
                  } catch {
                    setMessage({ type: 'error', text: 'Sunucuya ulaşılamadı.' });
                  } finally {
                    setMaintenanceContentSaving(false);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
                data-testid="button-save-maintenance-content"
              >
                {maintenanceContentSaving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor…</>
                  : <><CheckCircle2 className="w-4 h-4" /> Bakım Sayfasını Kaydet</>}
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {section === 'genel' && genelTab === 'site' && (
      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-google-merchant-settings">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <ShoppingBag className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Google Merchant Beslemesi</h3>
            <p className="text-sm text-neutral-500">
              Ürünlerinizi Google Alışveriş'te listelemek için XML besleme adresi üretir. Merchant Center'da "Planlanmış getirme" olarak eklenir.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSettings(s => ({ ...s, google_merchant_enabled: 'false' }))}
              data-testid="button-merchant-off"
              className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors text-left ${
                settings.google_merchant_enabled !== 'true'
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {settings.google_merchant_enabled !== 'true' && <CheckCircle2 className="w-4 h-4" />}
                <span>KAPALI</span>
              </div>
              <div className={`text-xs mt-1 ${settings.google_merchant_enabled !== 'true' ? 'text-white/70' : 'text-neutral-500'}`}>
                Besleme adresi 404 döner
              </div>
            </button>
            <button
              type="button"
              onClick={() => setSettings(s => ({ ...s, google_merchant_enabled: 'true' }))}
              data-testid="button-merchant-on"
              className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors text-left ${
                settings.google_merchant_enabled === 'true'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {settings.google_merchant_enabled === 'true' && <CheckCircle2 className="w-4 h-4" />}
                <span>AÇIK</span>
              </div>
              <div className={`text-xs mt-1 ${settings.google_merchant_enabled === 'true' ? 'text-white/80' : 'text-neutral-500'}`}>
                Besleme yayında
              </div>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Besleme Adresi</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={merchantStatus?.feedUrl || `${(settings.site_url || '').replace(/\/+$/, '')}/google-merchant.xml`}
                className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm font-mono"
                data-testid="input-merchant-feed-url"
              />
              <button
                type="button"
                onClick={() => {
                  const url = merchantStatus?.feedUrl || `${(settings.site_url || '').replace(/\/+$/, '')}/google-merchant.xml`;
                  navigator.clipboard.writeText(url);
                  setMerchantLinkCopied(true);
                  setTimeout(() => setMerchantLinkCopied(false), 2000);
                }}
                className="flex items-center gap-2 px-4 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium"
                data-testid="button-copy-merchant-feed-url"
              >
                {merchantLinkCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {merchantLinkCopied ? 'Kopyalandı' : 'Kopyala'}
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Adres, "Site URL" ayarına göre oluşur. Merchant Center'a bu adresi ekleyin.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-500 mb-2">Marka Adı</label>
              <input
                type="text"
                value={settings.google_merchant_brand}
                onChange={(e) => setSettings(s => ({ ...s, google_merchant_brand: e.target.value }))}
                placeholder={settings.site_name || 'Sepetzen'}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:border-neutral-900 transition-colors"
                data-testid="input-merchant-brand"
              />
              <p className="text-xs text-neutral-500 mt-1">Ürünün kendi markası boşsa bu değer kullanılır</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-500 mb-2">Varsayılan Google Ürün Kategorisi</label>
              <input
                type="text"
                value={settings.google_merchant_category}
                onChange={(e) => setSettings(s => ({ ...s, google_merchant_category: e.target.value }))}
                placeholder="Örn: 632 veya Home &amp; Garden > Kitchen &amp; Dining"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:border-neutral-900 transition-colors"
                data-testid="input-merchant-category"
              />
              <p className="text-xs text-neutral-500 mt-1">Boş bırakılırsa Google kategoriyi kendi tahmin eder</p>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.google_merchant_include_out_of_stock === 'true'}
              onChange={(e) => setSettings(s => ({ ...s, google_merchant_include_out_of_stock: e.target.checked ? 'true' : 'false' }))}
              className="w-4 h-4 accent-neutral-900"
              data-testid="checkbox-merchant-include-oos"
            />
            <span className="text-sm text-neutral-900">Stokta olmayan ürünleri de beslemeye ekle (out_of_stock olarak)</span>
          </label>

          <div className="flex items-start gap-2 p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-700" data-testid="text-merchant-status">
            {merchantStatusLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Besleme özeti hesaplanıyor...</>
            ) : merchantStatus ? (
              <span>
                Beslemede <strong>{merchantStatus.productCount}</strong> ürün, <strong>{merchantStatus.itemCount}</strong> varyant kaydı yer alıyor.
                {' '}Görseli olmayan, pasif veya fiyatsız ürünler dışarıda bırakılır.
              </span>
            ) : (
              <span>Besleme özeti alınamadı.</span>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => refetchMerchantStatus()}
              disabled={merchantStatusLoading}
              className="px-5 py-2.5 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium disabled:opacity-50"
              data-testid="button-merchant-refresh"
            >
              Özeti Yenile
            </button>
            <button
              type="button"
              onClick={async () => {
                await handleSave();
                await refetchMerchantStatus();
              }}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium disabled:opacity-50"
              data-testid="button-save-merchant-settings"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Besleme Ayarlarını Kaydet
            </button>
          </div>
        </div>
      </div>
      )}

      {/* ── Google Analiz / Tag ── */}
      {section === 'genel' && genelTab === 'site' && (
      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-google-tag-settings">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <BarChart2 className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Google Analiz / Tag</h3>
            <p className="text-sm text-neutral-500">
              Measurement ID veya GTM kimliği girin; tam kod snippet da yapıştırılabilir. Tüm sayfalara otomatik eklenir.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Google Tag kodu
            </label>
            <textarea
              value={settings.google_tag_code}
              onChange={(e) => setSettings(s => ({ ...s, google_tag_code: e.target.value }))}
              rows={5}
              spellCheck={false}
              placeholder={"G-XXXXXXXXXX\nveya GTM-XXXXXXX\nveya tam <script> snippet'i"}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:border-neutral-900 transition-colors font-mono text-sm resize-y"
              data-testid="textarea-google-tag-code"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Sadece ID girilirse (G-… veya GTM-…) snippet otomatik oluşturulur. Farklı bir araç için tam kodu yapıştırabilirsiniz.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium disabled:opacity-50"
              data-testid="button-save-google-tag"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Kaydet
            </button>
          </div>
        </div>
      </div>
      )}

      {/* ── Ek CSS ── */}
      {section === 'genel' && genelTab === 'site' && (
      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-custom-css-settings">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <Code2 className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Ek CSS</h3>
            <p className="text-sm text-neutral-500">
              Tüm sayfalara eklenmesini istediğiniz özel CSS kuralları. Tema stillerinin üzerine yazar.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              CSS kodu
            </label>
            <textarea
              value={settings.custom_css}
              onChange={(e) => setSettings(s => ({ ...s, custom_css: e.target.value }))}
              rows={8}
              spellCheck={false}
              placeholder={".my-class {\n  color: red;\n}"}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:border-neutral-900 transition-colors font-mono text-sm resize-y"
              data-testid="textarea-custom-css"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Değişiklikler kaydedildikten sonra en fazla 60 saniye içinde siteye yansır.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium disabled:opacity-50"
              data-testid="button-save-custom-css"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Kaydet
            </button>
          </div>
        </div>
      </div>
      )}

      {section === 'odeme' && (
      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-iyzico-settings">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <CreditCard className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">iyzico Ödeme Ayarları</h3>
            <p className="text-sm text-neutral-500">API anahtarlarını yönetin (yalnızca canlı/production modu)</p>
          </div>
        </div>

        {!iyzicoConfig ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor...
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Ödemeler her zaman <strong>CANLI (Production)</strong> modunda işlenir. Aşağıya iyzico Merchant
                Panel'den aldığınız <strong>canlı</strong> API ve gizli anahtarları girin.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">API Anahtarı</label>
                <input
                  type="text"
                  value={iyzicoApiKey}
                  onChange={(e) => setIyzicoApiKey(e.target.value)}
                  placeholder={iyzicoConfig.hasApiKey ? iyzicoConfig.apiKeyMasked : 'apikey-...'}
                  data-testid="input-iyzico-api-key"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm font-mono focus:outline-none focus:border-neutral-900 transition-colors"
                  autoComplete="off"
                />
                <p className="text-xs text-neutral-500 mt-1.5">
                  {iyzicoConfig.hasApiKey
                    ? 'Mevcut anahtarın üzerine yazmak için yeni bir değer girin.'
                    : 'iyzico Merchant Panel → Ayarlar → Merchant API Anahtarları'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Gizli Anahtar (Secret)</label>
                <input
                  type="password"
                  value={iyzicoSecretKey}
                  onChange={(e) => setIyzicoSecretKey(e.target.value)}
                  placeholder={iyzicoConfig.hasSecretKey ? iyzicoConfig.secretKeyMasked : 'secret-...'}
                  data-testid="input-iyzico-secret-key"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm font-mono focus:outline-none focus:border-neutral-900 transition-colors"
                  autoComplete="new-password"
                />
                <p className="text-xs text-neutral-500 mt-1.5">
                  {iyzicoConfig.hasSecretKey
                    ? 'Güvenlik için kayıtlı değer gösterilmez; değiştirmek için yeniden girin.'
                    : 'Anahtar veritabanına kaydedilir; çevre değişkeni kullanılmaz.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className={`text-xs font-medium ${iyzicoConfig.configured ? 'text-neutral-600' : 'text-red-600'}`} data-testid="text-iyzico-status">
                {iyzicoConfig.configured ? '✓ Anahtarlar tanımlı - ödeme aktif' : '⚠ Anahtarlar eksik - ödeme alınamaz'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleIyzicoTestConnection}
                  disabled={iyzicoTesting || !iyzicoConfig.configured}
                  data-testid="button-iyzico-test"
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-300 text-neutral-900 rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {iyzicoTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Bağlantıyı Test Et
                </button>
                <button
                  type="button"
                  onClick={handleIyzicoSaveCredentials}
                  disabled={iyzicoSaving || !iyzicoApiKey.trim() || !iyzicoSecretKey.trim()}
                  data-testid="button-iyzico-save-credentials"
                  className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {iyzicoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Anahtarları Kaydet
                </button>
              </div>
            </div>

            {iyzicoTestResult && (
              <div
                className={`p-3 rounded-lg border text-xs space-y-1 ${
                  iyzicoTestResult.ok
                    ? 'bg-neutral-50 border-neutral-200 text-neutral-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
                data-testid="text-iyzico-test-result"
              >
                <div className="font-semibold">
                  {iyzicoTestResult.ok
                    ? '✓ Bağlantı başarılı - iyzico anahtarlarınızı kabul etti.'
                    : `✗ Bağlantı başarısız${iyzicoTestResult.errorCode ? ` (Kod: ${iyzicoTestResult.errorCode})` : ''}`}
                </div>
                {!iyzicoTestResult.ok && iyzicoTestResult.errorMessage && (
                  <div>Hata: {iyzicoTestResult.errorMessage}</div>
                )}
                <div className="text-[11px] opacity-80 font-mono">
                  uri: {iyzicoTestResult.uri || '-'} • apiKey uzunluk: {iyzicoTestResult.apiKeyLength ?? 0} • secret
                  uzunluk: {iyzicoTestResult.secretKeyLength ?? 0}
                </div>
                {!iyzicoTestResult.ok && iyzicoTestResult.errorCode === '1001' && (
                  <div className="mt-2 pt-2 border-t border-red-200">
                    <strong>Olası nedenler:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      <li>Sandbox/test anahtarı kaydedilmiş - canlı uçnokta kabul etmez. iyzico panelinde sekmeyi <strong>Canlı (Production)</strong>'a alıp anahtarı yeniden kopyalayın.</li>
                      <li>Anahtarda boşluk veya eksik karakter var - iyzico panelinden tek tıkla "Kopyala" butonunu kullanın.</li>
                      <li>iyzico hesabınız henüz canlı moda geçirilmemiş (onay süreci tamamlanmamış olabilir).</li>
                      <li>API anahtarı ile gizli anahtar farklı hesaplara ait - ikisi de aynı satırdan alınmalı.</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-500 mb-2">
                Callback URL (iyzico panelinde &ldquo;Bildirim URL&rdquo; alanına girin)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={iyzicoConfig.callbackUrl}
                  data-testid="input-iyzico-callback-url"
                  className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={handleCopyCallback}
                  data-testid="button-copy-callback-url"
                  className="flex items-center gap-2 px-4 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium"
                >
                  {callbackCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {callbackCopied ? 'Kopyalandı' : 'Kopyala'}
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                iyzico Merchant Panel → Ayarlar → Bildirim Ayarları bölümünden bu URL'i kaydedin.
              </p>
            </div>
          </div>
        )}
      </div>
      )}

      {/* PayTR Ödeme Ayarları */}
      {section === 'odeme' && (
      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-paytr-settings">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <CreditCard className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">PayTR Ödeme Ayarları</h3>
            <p className="text-sm text-neutral-500">Mağaza bilgilerini yönetin (yalnızca canlı mod, iFrame API)</p>
          </div>
        </div>

        {!paytrConfig ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor...
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Mağaza No (merchant_id)</label>
                <input
                  type="text"
                  value={paytrMerchantId}
                  onChange={(e) => setPaytrMerchantId(e.target.value)}
                  placeholder={paytrConfig.merchantId || '483600'}
                  data-testid="input-paytr-merchant-id"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm font-mono focus:outline-none focus:border-neutral-900 transition-colors"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Mağaza Parola (merchant_key)</label>
                <input
                  type="password"
                  value={paytrMerchantKey}
                  onChange={(e) => setPaytrMerchantKey(e.target.value)}
                  placeholder={paytrConfig.merchantKeyMasked || 'merchant_key'}
                  data-testid="input-paytr-merchant-key"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm font-mono focus:outline-none focus:border-neutral-900 transition-colors"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Gizli Anahtar (merchant_salt)</label>
                <input
                  type="password"
                  value={paytrMerchantSalt}
                  onChange={(e) => setPaytrMerchantSalt(e.target.value)}
                  placeholder={paytrConfig.merchantSaltMasked || 'merchant_salt'}
                  data-testid="input-paytr-merchant-salt"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm font-mono focus:outline-none focus:border-neutral-900 transition-colors"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Maksimum taksit sayısı */}
            <div className="border-t border-neutral-100 pt-5">
              <label className="block text-sm font-semibold text-neutral-700 mb-1">
                Maksimum Taksit Sayısı
              </label>
              <p className="text-xs text-neutral-500 mb-3">
                Ödeme adımında ve ürün sayfasında gösterilecek maksimum taksit sayısını belirler. Bu değer PayTR iFrame API'sine aktarılır. PayTR panelinizden de ayrıca kontrol edebilirsiniz:
                {' '}<a href="https://www.paytr.com/magaza/ayarlar" target="_blank" rel="noopener noreferrer" className="underline text-neutral-600 hover:text-neutral-900">paytr.com/magaza/ayarlar</a>
              </p>
              <div className="flex items-center gap-3">
                <select
                  value={paytrMaxInstallment ?? paytrConfig.maxInstallment}
                  onChange={(e) => setPaytrMaxInstallment(Number(e.target.value))}
                  data-testid="select-paytr-max-installment"
                  className="px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                >
                  <option value={0}>Sınırsız (PayTR varsayılanı — 12 taksit)</option>
                  <option value={2}>2 Taksit</option>
                  <option value={3}>3 Taksit</option>
                  <option value={6}>6 Taksit</option>
                  <option value={9}>9 Taksit</option>
                  <option value={12}>12 Taksit</option>
                  <option value={1}>Taksit kapalı (tek çekim)</option>
                </select>
                <button
                  type="button"
                  onClick={async () => {
                    const val = paytrMaxInstallment ?? paytrConfig.maxInstallment;
                    try {
                      const r = await fetch('/api/admin/paytr/max-installment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ maxInstallment: val }),
                        credentials: 'include',
                      });
                      if (r.ok) {
                        await refetchPaytr();
                        setPaytrMaxInstallment(null);
                        setMessage({ type: 'success', text: 'Maksimum taksit sayısı kaydedildi.' });
                      }
                    } catch {
                      setMessage({ type: 'error', text: 'Taksit ayarı kaydedilemedi.' });
                    }
                  }}
                  disabled={!paytrConfig.configured}
                  className="flex items-center gap-2 px-4 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  data-testid="button-save-max-installment"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Kaydet
                </button>
              </div>
              <p className="text-xs text-neutral-400 mt-2">
                Ürün sayfasındaki taksit tablosu bu ayara göre otomatik güncellenir. Ödeme adımında PayTR, gerçek banka komisyonlarını gösterir.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className={`text-xs font-medium ${paytrConfig.configured ? 'text-neutral-600' : 'text-red-600'}`} data-testid="text-paytr-status">
                {paytrConfig.configured ? '✓ Mağaza bilgileri tanımlı - ödeme aktif edilebilir' : '⚠ Mağaza bilgileri eksik - ödeme alınamaz'}
              </div>
              <button
                type="button"
                onClick={handlePaytrSaveCredentials}
                disabled={paytrSaving || !paytrMerchantId.trim() || !paytrMerchantKey.trim() || !paytrMerchantSalt.trim()}
                data-testid="button-paytr-save-credentials"
                className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {paytrSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Bilgileri Kaydet
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-500 mb-2">
                Bildirim URL (PayTR mağaza panelinde &ldquo;Bildirim URL&rdquo; alanına girin)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={paytrConfig.callbackUrl}
                  data-testid="input-paytr-callback-url"
                  className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={handleCopyPaytrCallback}
                  data-testid="button-copy-paytr-callback-url"
                  className="flex items-center gap-2 px-4 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium"
                >
                  {paytrCallbackCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {paytrCallbackCopied ? 'Kopyalandı' : 'Kopyala'}
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                PayTR Mağaza Paneli → Ayarlar → Bildirim URL Ayarları bölümüne bu adresi kaydedin. Bu adres kaydedilmeden ödemeler onaylanmaz.
              </p>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Aktif kart sağlayıcıları */}
      {section === 'odeme' && (
      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-payment-methods">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <CreditCard className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Aktif Kart Ödeme Sağlayıcıları</h3>
            <p className="text-sm text-neutral-500">Müşterilerin ödeme sayfasında göreceği kart sağlayıcılarını seçin. İkisi de açık olabilir.</p>
          </div>
        </div>
        {!methodToggles ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor...
          </div>
        ) : (
          <div className="space-y-3">
            <label className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
              <div>
                <div className="text-sm font-semibold text-neutral-900">iyzico ile kart ödemesi</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {methodToggles.iyzicoConfigured ? 'Anahtarlar tanımlı' : 'Anahtarlar eksik, açsanız bile ödeme alınamaz'}
                </div>
              </div>
              <input
                type="checkbox"
                checked={methodToggles.iyzicoEnabled}
                onChange={(e) => handleToggleMethod('iyzico', e.target.checked)}
                className="w-5 h-5 rounded"
                data-testid="checkbox-method-iyzico"
              />
            </label>
            <label className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
              <div>
                <div className="text-sm font-semibold text-neutral-900">PayTR ile kart ödemesi</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {methodToggles.paytrConfigured ? 'Mağaza bilgileri tanımlı' : 'Mağaza bilgileri eksik, açsanız bile ödeme alınamaz'}
                </div>
              </div>
              <input
                type="checkbox"
                checked={methodToggles.paytrEnabled}
                onChange={(e) => handleToggleMethod('paytr', e.target.checked)}
                className="w-5 h-5 rounded"
                data-testid="checkbox-method-paytr"
              />
            </label>
            <p className="text-xs text-neutral-500">Havale açma kapama ve banka bilgileri aşağıdaki Havale kartından yönetilir. Bir sağlayıcıyı kapatırsanız müşteriler o sekmeyi görmez.</p>
          </div>
        )}
      </div>
      )}

      {/* Havale (Banka Transferi) Ayarları */}
      {section === 'odeme' && (
      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-bank-transfer-settings">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <Banknote className="w-5 h-5 text-neutral-900" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900">Havale İle Ödeme</h3>
            <p className="text-sm text-neutral-500">Banka bilgileri ve havale indirimi buradan yönetilir. Ödeme sayfası, e-postalar ve sipariş takibi bu bilgileri kullanır.</p>
          </div>
          {bankConfig && (
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={bankConfig.enabled}
                onChange={(e) => handleBankToggle(e.target.checked)}
                className="w-5 h-5 rounded"
                data-testid="checkbox-bank-transfer-enabled"
              />
              <span className="text-sm font-medium text-neutral-900">Etkin</span>
            </label>
          )}
        </div>

        {!bankConfig ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor...
          </div>
        ) : (
          <div className="space-y-5">
            {!bankConfig.enabled && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                Havale şu anda kapalı. Müşteriler ödeme sayfasında HAVALE sekmesini görmez.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Banka Adı</label>
                <input
                  type="text"
                  value={bankFormValues.bankName}
                  onChange={(e) => setBankForm({ ...bankFormValues, bankName: e.target.value })}
                  placeholder="Ziraat Bankası"
                  data-testid="input-bank-name"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Hesap Sahibi</label>
                <input
                  type="text"
                  value={bankFormValues.accountHolder}
                  onChange={(e) => setBankForm({ ...bankFormValues, accountHolder: e.target.value })}
                  placeholder="Ad Soyad"
                  data-testid="input-bank-account-holder"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">IBAN</label>
                <input
                  type="text"
                  value={bankFormValues.iban}
                  onChange={(e) => setBankForm({ ...bankFormValues, iban: e.target.value })}
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                  data-testid="input-bank-iban"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm font-mono focus:outline-none focus:border-neutral-900 transition-colors"
                />
                <p className="text-xs text-neutral-500 mt-1.5">TR ile başlamalıdır. Müşterilere ödeme sayfasında ve e-postalarda gösterilir.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Havale İndirimi (%)</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={bankFormValues.discountPercent}
                  onChange={(e) => setBankForm({ ...bankFormValues, discountPercent: e.target.value })}
                  data-testid="input-bank-discount"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                />
                <p className="text-xs text-neutral-500 mt-1.5">Havale seçen müşteriye uygulanan indirim. 0 yazarsanız indirim uygulanmaz.</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleBankSave}
                disabled={bankSaving}
                data-testid="button-bank-save"
                className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bankSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Havale Ayarlarını Kaydet
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Google OAuth Section */}
      {section === 'guvenlik' && <GoogleOAuthSection />}

      {/* Aras Kargo Section */}
      {section === 'kargo' && (<>
      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-free-shipping-threshold">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-neutral-100 rounded-lg">
            <Truck className="w-5 h-5 text-neutral-700" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Ücretsiz Kargo Eşiği</h3>
            <p className="text-sm text-neutral-500">
              Bu tutar ve üzerindeki ürünlerde ücretsiz kargo rozeti gösterilir. Sipariş kargo ücreti de aynı eşik üzerinden hesaplanır.
            </p>
          </div>
        </div>
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-neutral-700 mb-2" htmlFor="free-shipping-threshold">
            Minimum ürün / sepet tutarı (TL)
          </label>
          <input
            id="free-shipping-threshold"
            type="number"
            min="1"
            step="1"
            value={settings.free_shipping_threshold}
            onChange={(e) => setSettings(s => ({ ...s, free_shipping_threshold: e.target.value }))}
            data-testid="input-free-shipping-threshold"
            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
          />
        </div>
      </div>

      {/* Yurt İçi Kargo Ücreti */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-domestic-shipping">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-neutral-100 rounded-lg">
            <MapPin className="w-5 h-5 text-neutral-700" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Yurt İçi Kargo Ücreti</h3>
            <p className="text-sm text-neutral-500">
              Türkiye'ye yapılan ve ücretsiz kargo eşiğinin altında kalan siparişlere uygulanır.
            </p>
          </div>
        </div>
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-neutral-700 mb-2" htmlFor="domestic-shipping-cost">
            Kargo ücreti (₺)
          </label>
          <input
            id="domestic-shipping-cost"
            type="number"
            min="0"
            step="1"
            value={settings.domestic_shipping_cost}
            onChange={(e) => setSettings(s => ({ ...s, domestic_shipping_cost: e.target.value }))}
            data-testid="input-domestic-shipping-cost"
            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
          />
          <p className="text-xs text-neutral-400 mt-1.5">0 girilirse yurt içi kargo her zaman ücretsiz olur.</p>
        </div>
      </div>

      {/* Yurt Dışı Kargo Ücreti */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-international-shipping">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-neutral-100 rounded-lg">
            <Globe className="w-5 h-5 text-neutral-700" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Yurt Dışı Kargo Ücreti</h3>
            <p className="text-sm text-neutral-500">
              Türkiye dışındaki ülkelere yapılan siparişlere uygulanan varsayılan ücret. Aşağıda özel tarife tanımlanmamış tüm ülkeler bu ücreti kullanır.
            </p>
          </div>
        </div>
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-neutral-700 mb-2" htmlFor="international-shipping-cost">
            Kargo ücreti (₺)
          </label>
          <input
            id="international-shipping-cost"
            type="number"
            min="0"
            step="1"
            value={settings.international_shipping_cost}
            onChange={(e) => setSettings(s => ({ ...s, international_shipping_cost: e.target.value }))}
            data-testid="input-international-shipping-cost"
            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
          />
        </div>
      </div>

      {/* Ülke Bazlı Özel Kargo Tarifeleri */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-country-shipping-rates">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-100 rounded-lg">
              <Truck className="w-5 h-5 text-neutral-700" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Ülke Bazlı Özel Tarifeler</h3>
              <p className="text-sm text-neutral-500">
                Belirli ülkelere farklı kargo ücreti uygulayın. Türkiye buraya eklenmez; yurt içi ücret yukarıdaki ayardan gelir.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => syncCountryRates([...countryRateRows, { country: '', cost: '' }])}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-700 transition-colors shrink-0"
            data-testid="button-add-country-rate"
          >
            <Plus className="w-4 h-4" />
            Ülke Ekle
          </button>
        </div>

        {countryRateRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-neutral-200 rounded-lg">
            <Globe className="w-8 h-8 text-neutral-300 mb-2" />
            <p className="text-sm text-neutral-500 font-medium">Henüz özel tarife yok</p>
            <p className="text-xs text-neutral-400 mt-1">Tüm yurt dışı siparişler varsayılan yurt dışı ücretini kullanır.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_140px_40px] gap-3 px-1">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Ülke</span>
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Ücret (₺)</span>
              <span />
            </div>
            {countryRateRows.map((row, idx) => {
              const usedCountries = countryRateRows.filter((_, i) => i !== idx).map(r => r.country);
              const availableCountries = COUNTRIES.filter(c => c !== 'Türkiye' && !usedCountries.includes(c));
              return (
                <div key={idx} className="grid grid-cols-[1fr_140px_40px] gap-3 items-center">
                  <select
                    value={row.country}
                    onChange={(e) => {
                      const next = [...countryRateRows];
                      next[idx] = { ...next[idx], country: e.target.value };
                      syncCountryRates(next);
                    }}
                    data-testid={`select-country-rate-country-${idx}`}
                    className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                  >
                    <option value="">Ülke seçin…</option>
                    {row.country && !availableCountries.includes(row.country) && (
                      <option value={row.country}>{row.country}</option>
                    )}
                    {availableCountries.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={row.cost}
                      onChange={(e) => {
                        const next = [...countryRateRows];
                        next[idx] = { ...next[idx], cost: e.target.value };
                        syncCountryRates(next);
                      }}
                      data-testid={`input-country-rate-cost-${idx}`}
                      placeholder="0"
                      className="w-full pl-3 pr-7 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">₺</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => syncCountryRates(countryRateRows.filter((_, i) => i !== idx))}
                    data-testid={`button-remove-country-rate-${idx}`}
                    className="flex items-center justify-center w-9 h-9 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

            {/* Summary preview */}
            <div className="mt-4 p-3 bg-neutral-50 rounded-lg border border-neutral-100">
              <p className="text-xs font-semibold text-neutral-600 mb-2">Özet - ülkeye göre ücret:</p>
              <div className="flex flex-wrap gap-2">
                {countryRateRows.filter(r => r.country).map(r => (
                  <span key={r.country} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-neutral-200 rounded-md text-xs text-neutral-700">
                    <span className="font-medium">{r.country}</span>
                    <span className="text-neutral-400">→</span>
                    <span className="font-semibold text-neutral-900">{Number(r.cost || 0).toLocaleString('tr-TR')} ₺</span>
                  </span>
                ))}
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 border border-neutral-200 rounded-md text-xs text-neutral-500 italic">
                  Diğer tüm ülkeler → {Number(settings.international_shipping_cost || 0).toLocaleString('tr-TR')} ₺
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Aktif kargo sağlayıcısı seçimi */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-shipping-provider">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-neutral-100 rounded-lg">
            <Truck className="w-5 h-5 text-neutral-700" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Aktif Kargo Sağlayıcısı</h3>
            <p className="text-sm text-neutral-500">
              Sipariş detayındaki "Gönderi Oluştur" işlemi seçtiğiniz sağlayıcı üzerinden çalışır.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {([
            { id: 'aras', name: 'Aras Kargo', desc: 'Yurt içi SOAP entegrasyonu' },
            { id: 'geliver', name: 'Geliver', desc: 'Çoklu kargo pazaryeri (REST)' },
            { id: 'shipentegra', name: 'ShipEntegra', desc: 'Yurt dışı gönderiler (REST)' },
          ] as const).map(p => (
            <label
              key={p.id}
              className={`flex flex-col gap-1 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                settings.shipping_provider === p.id
                  ? 'border-neutral-900 bg-neutral-50'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
              data-testid={`radio-provider-${p.id}`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="shipping_provider"
                  value={p.id}
                  checked={settings.shipping_provider === p.id}
                  onChange={() => setSettings(s => ({ ...s, shipping_provider: p.id }))}
                  className="w-4 h-4"
                />
                <span className="text-sm font-semibold text-neutral-900">{p.name}</span>
              </div>
              <span className="text-xs text-neutral-500 pl-6">{p.desc}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-neutral-400 mt-3">
          Daha önce başka bir sağlayıcı ile oluşturulmuş gönderiler, o sağlayıcı üzerinden sorgulanmaya devam eder.
        </p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-aras-kargo-settings">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-50 rounded-lg">
            <Truck className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900">Aras Kargo API</h3>
            <p className="text-sm text-neutral-500">
              Sipariş detayında "API'ye Gönder" butonuyla SetOrder çağrısı yapar; takip numarası otomatik alınır.
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.aras_kargo_enabled === 'true'}
              onChange={(e) => setSettings(s => ({ ...s, aras_kargo_enabled: e.target.checked ? 'true' : 'false' }))}
              className="w-5 h-5 rounded"
              data-testid="checkbox-aras-kargo-enabled"
            />
            <span className="text-sm font-medium text-neutral-900">Etkin</span>
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Kullanıcı Adı (UserName)</label>
            <input
              type="text"
              value={settings.aras_kargo_username}
              onChange={(e) => setSettings(s => ({ ...s, aras_kargo_username: e.target.value }))}
              placeholder="Aras API kullanıcı adı"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 font-mono text-sm"
              data-testid="input-aras-username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Şifre (Password)</label>
            <input
              type="password"
              value={settings.aras_kargo_password}
              onChange={(e) => setSettings(s => ({ ...s, aras_kargo_password: e.target.value }))}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900"
              data-testid="input-aras-password"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Müşteri Kodu (CustomerCode)</label>
            <input
              type="text"
              value={settings.aras_kargo_customer_code}
              onChange={(e) => setSettings(s => ({ ...s, aras_kargo_customer_code: e.target.value }))}
              placeholder="Müşteri kodu"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 font-mono text-sm"
              data-testid="input-aras-customer-code"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Gönderici Adres ID <span className="text-neutral-400 font-normal">(opsiyonel)</span></label>
            <ArasSenderAddressPicker
              value={settings.aras_kargo_sender_address_id}
              onChange={(v) => setSettings(s => ({ ...s, aras_kargo_sender_address_id: v }))}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Varsayılan Desi</label>
            <input
              type="number"
              min="1"
              value={settings.aras_kargo_default_desi}
              onChange={(e) => setSettings(s => ({ ...s, aras_kargo_default_desi: e.target.value }))}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900"
              data-testid="input-aras-desi"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-500 mb-2">SetOrder URL</label>
            <input
              type="text"
              value={settings.aras_kargo_setorder_url}
              onChange={(e) => setSettings(s => ({ ...s, aras_kargo_setorder_url: e.target.value }))}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 font-mono text-xs"
              data-testid="input-aras-setorder-url"
            />
          </div>
        </div>

        <p className="text-xs text-neutral-400 mt-1">
          Değişiklikler ana ayarlar kaydedildiğinde (aşağıdaki "Ayarları Kaydet" butonu) uygulanır.
        </p>

        <ShippingTestButton provider="aras" label="Aras Kargo" />
      </div>

      {/* Geliver */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-geliver-settings">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-sky-50 rounded-lg">
            <Truck className="w-5 h-5 text-sky-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900">Geliver API</h3>
            <p className="text-sm text-neutral-500">
              Tek istekte gönderi oluşturur ve etiketi satın alır; barkod ve etiket bağlantısı siparişe kaydedilir.
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.geliver_enabled === 'true'}
              onChange={(e) => setSettings(s => ({ ...s, geliver_enabled: e.target.checked ? 'true' : 'false' }))}
              className="w-5 h-5 rounded"
              data-testid="checkbox-geliver-enabled"
            />
            <span className="text-sm font-medium text-neutral-900">Etkin</span>
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">API Token</label>
            <input
              type="password"
              value={settings.geliver_api_token}
              onChange={(e) => setSettings(s => ({ ...s, geliver_api_token: e.target.value }))}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 font-mono text-sm"
              data-testid="input-geliver-token"
            />
            <p className="text-xs text-neutral-400 mt-1">Geliver panelinden alınan Bearer token.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Servis Kodu (providerServiceCode)</label>
            <input
              type="text"
              value={settings.geliver_service_code}
              onChange={(e) => setSettings(s => ({ ...s, geliver_service_code: e.target.value }))}
              placeholder="GELIVER_STANDART"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 font-mono text-sm"
              data-testid="input-geliver-service-code"
            />
            <p className="text-xs text-neutral-400 mt-1">Örn. GELIVER_STANDART, MNG_STANDART, SURAT_STANDART.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Gönderici Adres ID <span className="text-neutral-400 font-normal">(opsiyonel)</span></label>
            <input
              type="text"
              value={settings.geliver_sender_address_id}
              onChange={(e) => setSettings(s => ({ ...s, geliver_sender_address_id: e.target.value }))}
              placeholder="Boş bırakılırsa varsayılan adres kullanılır"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 font-mono text-sm"
              data-testid="input-geliver-sender-address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Mağaza Adresi (sourceIdentifier)</label>
            <input
              type="text"
              value={settings.geliver_store_url}
              onChange={(e) => setSettings(s => ({ ...s, geliver_store_url: e.target.value }))}
              placeholder="https://magazam.com"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm"
              data-testid="input-geliver-store-url"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.geliver_test_mode === 'true'}
            onChange={(e) => setSettings(s => ({ ...s, geliver_test_mode: e.target.checked ? 'true' : 'false' }))}
            className="w-4 h-4 rounded"
            data-testid="checkbox-geliver-test-mode"
          />
          <span className="text-sm text-neutral-700">Test gönderisi oluştur (canlıda kapatın)</span>
        </label>

        <ShippingTestButton provider="geliver" label="Geliver" values={settings} />
      </div>

      {/* ShipEntegra */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-shipentegra-settings">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-violet-50 rounded-lg">
            <Globe className="w-5 h-5 text-violet-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900">ShipEntegra API</h3>
            <p className="text-sm text-neutral-500">
              Sipariş oluşturur, etiket üretir ve takip numarasını siparişe yazar. Yurt dışı gönderiler için uygundur.
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.shipentegra_enabled === 'true'}
              onChange={(e) => setSettings(s => ({ ...s, shipentegra_enabled: e.target.checked ? 'true' : 'false' }))}
              className="w-5 h-5 rounded"
              data-testid="checkbox-shipentegra-enabled"
            />
            <span className="text-sm font-medium text-neutral-900">Etkin</span>
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Client ID</label>
            <input
              type="text"
              value={settings.shipentegra_client_id}
              onChange={(e) => setSettings(s => ({ ...s, shipentegra_client_id: e.target.value }))}
              placeholder="ShipEntegra Client ID"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 font-mono text-sm"
              data-testid="input-shipentegra-client-id"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Client Secret</label>
            <input
              type="password"
              value={settings.shipentegra_client_secret}
              onChange={(e) => setSettings(s => ({ ...s, shipentegra_client_secret: e.target.value }))}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900"
              data-testid="input-shipentegra-client-secret"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Gönderici Adı</label>
            <input
              type="text"
              value={settings.shipentegra_sender_name}
              onChange={(e) => setSettings(s => ({ ...s, shipentegra_sender_name: e.target.value }))}
              placeholder="Firma / kişi adı"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm"
              data-testid="input-shipentegra-sender-name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Gönderici Adresi</label>
            <input
              type="text"
              value={settings.shipentegra_sender_address}
              onChange={(e) => setSettings(s => ({ ...s, shipentegra_sender_address: e.target.value }))}
              placeholder="Adres satırı"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm"
              data-testid="input-shipentegra-sender-address"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Şehir</label>
            <input
              type="text"
              value={settings.shipentegra_sender_city}
              onChange={(e) => setSettings(s => ({ ...s, shipentegra_sender_city: e.target.value }))}
              placeholder="Istanbul"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm"
              data-testid="input-shipentegra-sender-city"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Posta Kodu</label>
            <input
              type="text"
              value={settings.shipentegra_sender_zip}
              onChange={(e) => setSettings(s => ({ ...s, shipentegra_sender_zip: e.target.value }))}
              placeholder="34000"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm"
              data-testid="input-shipentegra-sender-zip"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Gönderi Tipi</label>
            <select
              value={settings.shipentegra_shipping_type}
              onChange={(e) => setSettings(s => ({ ...s, shipentegra_shipping_type: e.target.value }))}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm"
              data-testid="select-shipentegra-shipping-type"
            >
              <option value="1">ShipEntegra DDP</option>
              <option value="2">DDU</option>
              <option value="3">IOSS</option>
              <option value="4">ShipEntegra IOSS</option>
              <option value="5">HMRC</option>
              <option value="6">Diğer</option>
              <option value="7">VOEC</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Gönderici Telefon</label>
            <input
              type="text"
              value={settings.shipentegra_sender_phone}
              onChange={(e) => setSettings(s => ({ ...s, shipentegra_sender_phone: e.target.value }))}
              placeholder="+90 555 000 00 00"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm"
              data-testid="input-shipentegra-sender-phone"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Gönderici E-posta</label>
            <input
              type="email"
              value={settings.shipentegra_sender_email}
              onChange={(e) => setSettings(s => ({ ...s, shipentegra_sender_email: e.target.value }))}
              placeholder="info@magazam.com"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm"
              data-testid="input-shipentegra-sender-email"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.shipentegra_test_mode === 'true'}
            onChange={(e) => setSettings(s => ({ ...s, shipentegra_test_mode: e.target.checked ? 'true' : 'false' }))}
            className="w-4 h-4 rounded"
            data-testid="checkbox-shipentegra-test-mode"
          />
          <span className="text-sm text-neutral-700">Sandbox ortamını kullan (canlıda kapatın)</span>
        </label>

        <ShippingTestButton provider="shipentegra" label="ShipEntegra" />
      </div>
      </>)}

      {section === 'bildirim' && (<>
      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <Send className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Test E-Postası</h3>
            <p className="text-sm text-neutral-500">SMTP ayarlarınızı test edin</p>
          </div>
        </div>

        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@example.com"
            className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:border-white transition-colors"
            data-testid="input-test-email"
          />
          <button
            onClick={handleTestEmail}
            disabled={isTesting || !testEmail}
            className="flex items-center gap-2 px-6 py-3 bg-neutral-50 text-neutral-900 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
            data-testid="button-send-test"
          >
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Test Gönder
          </button>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-whatsapp-settings">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <MessageCircle className="w-5 h-5 text-neutral-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900">WhatsApp Bildirimleri (Wpileti)</h3>
            <p className="text-sm text-neutral-500">
              Sipariş aşamalarında müşteriye ve yöneticiye otomatik WhatsApp mesajı gönderir.
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.wpileti_enabled === 'true'}
              onChange={(e) =>
                setSettings(s => ({ ...s, wpileti_enabled: e.target.checked ? 'true' : 'false' }))
              }
              className="w-5 h-5 rounded"
              data-testid="checkbox-wpileti-enabled"
            />
            <span className="text-sm font-medium text-neutral-900">Etkin</span>
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">wpileti API Anahtarı</label>
            <input
              type="password"
              value={settings.wpileti_api_key}
              onChange={(e) => setSettings(s => ({ ...s, wpileti_api_key: e.target.value }))}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900"
              data-testid="input-wpileti-apikey"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">wpileti Endpoint URL</label>
            <input
              type="text"
              value={settings.wpileti_endpoint}
              onChange={(e) => setSettings(s => ({ ...s, wpileti_endpoint: e.target.value }))}
              placeholder="http://127.0.0.1:3225/api/send-message"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm font-mono"
              data-testid="input-wpileti-endpoint"
            />
            <p className="text-xs text-neutral-500 mt-1">
              wpileti sunucunuzun adresi. Yerel kuruluysa varsayılan değeri bırakın.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Yönetici WhatsApp Numarası</label>
            <input
              type="text"
              value={settings.wpileti_admin_phone}
              onChange={(e) => setSettings(s => ({ ...s, wpileti_admin_phone: e.target.value }))}
              placeholder="905551234567"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900"
              data-testid="input-wpileti-admin-phone"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Başında 90 ülke kodu olmalı. Yeni sipariş ve iptal mesajları bu numaraya gider.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Site Adı (mesajlarda kullanılır)</label>
            <input
              type="text"
              value={settings.site_name}
              onChange={(e) => setSettings(s => ({ ...s, site_name: e.target.value }))}
              placeholder="Polen Stone"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900"
              data-testid="input-site-name"
            />
          </div>
        </div>

        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mb-5">
          <p className="text-xs font-medium text-neutral-700 mb-2">Şablonlarda kullanabileceğiniz değişkenler:</p>
          <div className="flex flex-wrap gap-1.5">
            {WHATSAPP_VARIABLES.map(v => (
              <code key={v} className="px-2 py-0.5 bg-white border border-neutral-200 rounded text-[11px] text-neutral-700 font-mono">
                {v}
              </code>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {WHATSAPP_EVENTS.map(({ key, label, defaultTpl }) => {
            const enabledKey = `wpileti_evt_${key}`;
            const tplKey = `wpileti_tpl_${key}`;
            const evtEnabled = settings[enabledKey] !== 'false';
            return (
              <div
                key={key}
                className="border border-neutral-200 rounded-lg p-4"
                data-testid={`section-whatsapp-event-${key}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-neutral-900">{label}</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={evtEnabled}
                      onChange={(e) =>
                        setSettings(s => ({ ...s, [enabledKey]: e.target.checked ? 'true' : 'false' }))
                      }
                      className="w-4 h-4 rounded"
                      data-testid={`checkbox-whatsapp-evt-${key}`}
                    />
                    <span className="text-xs text-neutral-600">{evtEnabled ? 'Açık' : 'Kapalı'}</span>
                  </label>
                </div>
                <textarea
                  value={settings[tplKey] ?? defaultTpl}
                  onChange={(e) => setSettings(s => ({ ...s, [tplKey]: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 font-mono"
                  placeholder={defaultTpl}
                  data-testid={`textarea-whatsapp-tpl-${key}`}
                  disabled={!evtEnabled}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-5 border-t border-neutral-200">
          <h4 className="text-sm font-semibold text-neutral-900 mb-3">Test Mesajı Gönder</h4>
          <p className="text-xs text-neutral-500 mb-3">
            Önce yukarıdaki ayarları kaydedin, ardından buradan test mesajı gönderin.
          </p>
          <div className="grid md:grid-cols-[1fr_2fr_auto] gap-3">
            <input
              type="text"
              value={waTestPhone}
              onChange={(e) => setWaTestPhone(e.target.value)}
              placeholder="905551234567"
              className="px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900"
              data-testid="input-whatsapp-test-phone"
            />
            <input
              type="text"
              value={waTestMessage}
              onChange={(e) => setWaTestMessage(e.target.value)}
              placeholder="Test mesajı (boş bırakırsanız otomatik metin gönderilir)"
              className="px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900"
              data-testid="input-whatsapp-test-message"
            />
            <button
              onClick={handleTestWhatsApp}
              disabled={waTesting || !waTestPhone}
              className="flex items-center gap-2 px-6 py-3 bg-neutral-600 text-white rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50 font-medium"
              data-testid="button-whatsapp-test"
            >
              {waTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Test Gönder
            </button>
          </div>
        </div>
      </div>
      </>)}

      {section === 'guvenlik' && (<>
      <TwoFactorSection />
      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-turnstile">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-50 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900">Cloudflare Turnstile (Captcha)</h3>
            <p className="text-sm text-neutral-500">
              Misafir yorumlarda spam'i önlemek için kullanılan Cloudflare Turnstile anahtarları.
              Anahtarları{' '}
              <a
                href="https://dash.cloudflare.com/?to=/:account/turnstile"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Cloudflare panelinden
              </a>{' '}
              alabilirsiniz.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Site Key</label>
            <input
              type="text"
              value={settings.turnstile_site_key}
              onChange={(e) => setSettings(s => ({ ...s, turnstile_site_key: e.target.value }))}
              placeholder="0x4AAAAA..."
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 font-mono text-sm"
              data-testid="input-turnstile-site-key"
            />
            <p className="text-xs text-neutral-500 mt-1">Tarayıcıda görünür. Ürün sayfasındaki yorum kutusunu çalıştırır.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Secret Key</label>
            <input
              type="password"
              value={settings.turnstile_secret_key}
              onChange={(e) => setSettings(s => ({ ...s, turnstile_secret_key: e.target.value }))}
              placeholder="0x4AAAAA..."
              autoComplete="new-password"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 font-mono text-sm"
              data-testid="input-turnstile-secret-key"
            />
            <p className="text-xs text-neutral-500 mt-1">Sunucuda saklanır, asla görüntülenmez. Token doğrulamada kullanılır.</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          Boş bırakılırsa sunucudaki ortam değişkenleri (TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY) kullanılır. Production'da her ikisi de boşsa misafir yorumları reddedilir.
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-openai">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-violet-50 rounded-lg">
            <Sparkles className="w-5 h-5 text-violet-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900">OpenAI (Yapay Zeka)</h3>
            <p className="text-sm text-neutral-500">
              Blog yazısı ve ürün açıklaması üretiminde kullanılan ChatGPT API anahtarı.
              Anahtarınızı{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                OpenAI panelinden
              </a>{' '}
              alabilirsiniz.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-500 mb-2">OpenAI API Anahtarı</label>
          <input
            type="password"
            value={settings.openai_api_key}
            onChange={(e) => setSettings(s => ({ ...s, openai_api_key: e.target.value }))}
            placeholder="sk-..."
            autoComplete="new-password"
            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 font-mono text-sm"
            data-testid="input-openai-api-key"
          />
          <p className="text-xs text-neutral-500 mt-1">Sunucuda saklanır, asla görüntülenmez.</p>
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          Boş bırakılırsa sunucudaki OPENAI_API_KEY ortam değişkeni kullanılır. Her ikisi de boşsa yapay zeka özellikleri devre dışı kalır.
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-admin-account">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-50 rounded-lg">
            <KeyRound className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900">Yönetici Hesabı</h3>
            <p className="text-sm text-neutral-500">
              Panele giriş için kullandığınız kullanıcı adı ve şifreyi değiştirin.
              Onay için mevcut şifrenizi girmek zorundasınız.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">
              Mevcut Şifre <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={accountCurrentPassword}
              onChange={(e) => setAccountCurrentPassword(e.target.value)}
              placeholder="Mevcut şifreniz"
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900"
              data-testid="input-account-current-password"
            />
          </div>

          <div className="border-t border-neutral-200 pt-4">
            <p className="text-xs font-medium text-neutral-700 mb-3">
              Aşağıdakilerden en az birini doldurun. Boş bıraktıklarınız değişmez.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-500 mb-2">
                  Yeni Kullanıcı Adı
                </label>
                <input
                  type="text"
                  value={accountNewUsername}
                  onChange={(e) => setAccountNewUsername(e.target.value)}
                  placeholder="(değişmesin diye boş bırakın)"
                  autoComplete="off"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900"
                  data-testid="input-account-new-username"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  En az 3 karakter; harf, rakam, '.', '_' ve '-' kullanılabilir.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-500 mb-2">
                  Yeni Şifre
                </label>
                <input
                  type="password"
                  value={accountNewPassword}
                  onChange={(e) => setAccountNewPassword(e.target.value)}
                  placeholder="(değişmesin diye boş bırakın)"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900"
                  data-testid="input-account-new-password"
                />
                <p className="text-xs text-neutral-500 mt-1">En az 8 karakter olmalı.</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-500 mb-2">
                  Yeni Şifre (Tekrar)
                </label>
                <input
                  type="password"
                  value={accountNewPassword2}
                  onChange={(e) => setAccountNewPassword2(e.target.value)}
                  placeholder="Yeni şifreyi tekrar girin"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900"
                  data-testid="input-account-new-password-confirm"
                  disabled={!accountNewPassword}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleAccountUpdate}
              disabled={accountSaving}
              className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 font-medium"
              data-testid="button-account-save"
            >
              {accountSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Hesabı Güncelle
            </button>
          </div>
        </div>
      </div>
      </>)}

      {(section === 'bildirim' || section === 'kargo' || section === 'guvenlik') && (
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 font-medium"
          data-testid="button-save-settings"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Ayarları Kaydet
        </button>
      </div>
      )}
    </div>
  );
}

// ============================================================================
// Google OAuth bölümü - ayrı bileşen olarak izole edildi
// ============================================================================
function TwoFactorSection() {
  const qc = useQueryClient();
  const [step, setStep] = useState<'idle' | 'setup' | 'backup'>('idle');
  const [password, setPassword] = useState('');
  const [setupData, setSetupData] = useState<{ qrDataUrl: string; manualKey: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disableCode, setDisableCode] = useState('');
  const [showDisable, setShowDisable] = useState(false);
  const [showRegen, setShowRegen] = useState(false);
  const [regenCode, setRegenCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const { data: status } = useQuery<{
    enabled: boolean;
    pendingSetup: boolean;
    backupCodesRemaining: number;
  }>({
    queryKey: ['/api/admin/2fa/status'],
  });

  const post = async (url: string, body: Record<string, unknown>) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'İşlem başarısız');
    return data;
  };

  const refreshStatus = () => qc.invalidateQueries({ queryKey: ['/api/admin/2fa/status'] });

  const handleStartSetup = async () => {
    if (!password) {
      setMsg({ ok: false, text: 'Kurulumu başlatmak için mevcut şifrenizi girin.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const data = await post('/api/admin/2fa/setup', { currentPassword: password });
      setSetupData({ qrDataUrl: data.qrDataUrl, manualKey: data.manualKey });
      setStep('setup');
      setPassword('');
      setVerifyCode('');
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleEnable = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const data = await post('/api/admin/2fa/enable', { code: verifyCode.trim() });
      setBackupCodes(data.backupCodes || []);
      setStep('backup');
      setSetupData(null);
      setVerifyCode('');
      await refreshStatus();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await post('/api/admin/2fa/disable', { code: disableCode.trim() });
      setDisableCode('');
      setShowDisable(false);
      setStep('idle');
      setBackupCodes([]);
      await refreshStatus();
      setMsg({ ok: true, text: 'İki adımlı doğrulama kapatıldı.' });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerate = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const data = await post('/api/admin/2fa/backup-codes/regenerate', { code: regenCode.trim() });
      setBackupCodes(data.backupCodes || []);
      setStep('backup');
      setShowRegen(false);
      setRegenCode('');
      await refreshStatus();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard?.writeText(backupCodes.join('\n')).then(
      () => setMsg({ ok: true, text: 'Yedek kodlar panoya kopyalandı.' }),
      () => setMsg({ ok: false, text: 'Kopyalama başarısız - kodları elle not edin.' }),
    );
  };

  const enabled = status?.enabled ?? false;

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-two-factor">
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-lg ${enabled ? 'bg-emerald-50' : 'bg-neutral-50'}`}>
          <ShieldCheck className={`w-5 h-5 ${enabled ? 'text-emerald-600' : 'text-neutral-900'}`} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-neutral-900">İki Adımlı Doğrulama (Google Authenticator)</h3>
          <p className="text-sm text-neutral-500">
            Girişte şifreye ek olarak telefonunuzdaki uygulamadan 6 haneli kod istenir.
            Google Authenticator, Authy veya benzeri bir TOTP uygulamasıyla çalışır.
          </p>
        </div>
        {status && (
          <span
            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
              enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
            }`}
            data-testid="text-2fa-status"
          >
            {enabled ? 'Aktif' : 'Kapalı'}
          </span>
        )}
      </div>

      {msg && (
        <div
          className={`p-3 rounded-lg mb-4 text-xs font-medium ${
            msg.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-700'
          }`}
          data-testid="text-2fa-message"
        >
          {msg.text}
        </div>
      )}

      {/* KAPALI - kurulum başlat */}
      {!enabled && step === 'idle' && (
        <div className="space-y-3">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            Önerilir: Panel yalnızca şifreyle korunuyor. İki adımlı doğrulama, şifreniz ele geçse bile hesabınızı korur.
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 max-w-sm">
              <label className="block text-sm font-medium text-neutral-500 mb-2">Mevcut Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Onay için şifreniz"
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900"
                data-testid="input-2fa-password"
              />
            </div>
            <button
              onClick={handleStartSetup}
              disabled={busy || !password}
              className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50 font-medium"
              data-testid="button-2fa-start"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Kurulumu Başlat
            </button>
          </div>
        </div>
      )}

      {/* KURULUM - QR + doğrulama */}
      {!enabled && step === 'setup' && setupData && (
        <div className="space-y-4">
          <ol className="text-sm text-neutral-600 list-decimal list-inside space-y-1">
            <li>Telefonunuza <span className="font-medium">Google Authenticator</span> uygulamasını indirin.</li>
            <li>Uygulamada “+” → “QR kodu tara” deyip aşağıdaki kodu okutun.</li>
            <li>Uygulamanın gösterdiği 6 haneli kodu girip onaylayın.</li>
          </ol>
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <img
              src={setupData.qrDataUrl}
              alt="Google Authenticator QR kodu"
              className="w-[180px] h-[180px] border border-neutral-200 rounded-lg p-2 bg-white shrink-0"
              data-testid="img-2fa-qr"
            />
            <div className="flex-1 space-y-3 w-full">
              <div>
                <label className="block text-sm font-medium text-neutral-500 mb-1">QR okutamıyorsanız - manuel anahtar</label>
                <code className="block px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-[13px] font-mono text-neutral-800 break-all select-all" data-testid="text-2fa-manual-key">
                  {setupData.manualKey}
                </code>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-500 mb-1">Uygulamadaki 6 Haneli Kod</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-40 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 font-mono text-center tracking-[0.25em]"
                  data-testid="input-2fa-verify-code"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleEnable}
                  disabled={busy || verifyCode.length !== 6}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 font-medium"
                  data-testid="button-2fa-enable"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Doğrula ve Aktifleştir
                </button>
                <button
                  onClick={() => { setStep('idle'); setSetupData(null); setVerifyCode(''); setMsg(null); }}
                  className="px-4 py-3 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                  data-testid="button-2fa-cancel-setup"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YEDEK KODLAR - tek seferlik gösterim */}
      {step === 'backup' && backupCodes.length > 0 && (
        <div className="space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 font-medium">
            ✓ İki adımlı doğrulama aktifleştirildi!
          </div>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-semibold text-amber-900 mb-1">Yedek kodlarınızı şimdi kaydedin - bir daha gösterilmeyecek</p>
            <p className="text-xs text-amber-800 mb-3">
              Telefonunuza erişemezseniz bu kodlardan biriyle giriş yapabilirsiniz. Her kod bir kez kullanılır.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {backupCodes.map((c) => (
                <code key={c} className="px-2 py-1.5 bg-white border border-amber-200 rounded text-[13px] font-mono text-center text-neutral-800 select-all">
                  {c}
                </code>
              ))}
            </div>
            <button
              onClick={copyBackupCodes}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-amber-300 text-amber-900 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium"
              data-testid="button-2fa-copy-backup"
            >
              <Copy className="w-3.5 h-3.5" />
              Kodları Kopyala
            </button>
          </div>
          <button
            onClick={() => { setStep('idle'); setBackupCodes([]); setMsg(null); }}
            className="px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors font-medium"
            data-testid="button-2fa-backup-done"
          >
            Kodları Kaydettim, Bitir
          </button>
        </div>
      )}

      {/* AKTİF - durum + kapatma */}
      {enabled && step === 'idle' && (
        <div className="space-y-3">
          <p className="text-sm text-neutral-600">
            Girişlerde artık 6 haneli doğrulama kodu isteniyor.
            {typeof status?.backupCodesRemaining === 'number' && (
              <> Kalan yedek kod: <span className="font-semibold">{status.backupCodesRemaining}</span></>
            )}
          </p>
          {showRegen && (
            <div className="p-4 border border-neutral-200 bg-neutral-50 rounded-lg space-y-3 max-w-md">
              <p className="text-sm text-neutral-700 font-medium">
                Yeni yedek kodlar üretmek için uygulamadaki 6 haneli kodu girin. Eski kodlar geçersiz olur.
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={regenCode}
                onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-40 px-4 py-3 bg-white border border-neutral-200 rounded-lg text-neutral-900 font-mono text-center tracking-[0.25em]"
                data-testid="input-2fa-regen-code"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleRegenerate}
                  disabled={busy || regenCode.length !== 6}
                  className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50 text-sm font-medium"
                  data-testid="button-2fa-regenerate"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Yeni Kodlar Üret
                </button>
                <button
                  onClick={() => { setShowRegen(false); setRegenCode(''); }}
                  className="px-4 py-2.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          )}
          {!showDisable ? (
            <div className="flex flex-wrap gap-2">
              {!showRegen && (
                <button
                  onClick={() => { setShowRegen(true); setMsg(null); }}
                  className="px-4 py-2.5 text-sm font-medium text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                  data-testid="button-2fa-show-regen"
                >
                  Yedek Kodları Yenile
                </button>
              )}
              <button
                onClick={() => { setShowDisable(true); setShowRegen(false); setMsg(null); }}
                className="px-4 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                data-testid="button-2fa-show-disable"
              >
                İki Adımlı Doğrulamayı Kapat
              </button>
            </div>
          ) : (
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg space-y-3 max-w-md">
              <p className="text-sm text-red-800 font-medium">
                Kapatmak için uygulamadaki 6 haneli kodu (veya bir yedek kodu) girin.
              </p>
              <input
                type="text"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder="123456 veya XXXX-XXXX"
                className="w-full px-4 py-3 bg-white border border-red-200 rounded-lg text-neutral-900 font-mono"
                data-testid="input-2fa-disable-code"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDisable}
                  disabled={busy || !disableCode.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-medium"
                  data-testid="button-2fa-disable"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Kapat
                </button>
                <button
                  onClick={() => { setShowDisable(false); setDisableCode(''); }}
                  className="px-4 py-2.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GoogleOAuthSection() {
  const qc = useQueryClient();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const { data: config } = useQuery<{
    configured: boolean;
    clientIdMasked: string;
    hasClientId: boolean;
    hasClientSecret: boolean;
  }>({
    queryKey: ['/api/admin/google-oauth/config'],
  });

  const handleSave = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setResult({ ok: false, text: 'Client ID ve Client Secret zorunludur.' });
      return;
    }
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/google-oauth/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ clientId: clientId.trim(), clientSecret: clientSecret.trim() }),
      });
      if (res.ok) {
        setClientId('');
        setClientSecret('');
        await qc.invalidateQueries({ queryKey: ['/api/admin/google-oauth/config'] });
        setResult({ ok: true, text: 'Google bilgileri kaydedildi. Kullanıcılar artık Google ile giriş yapabilir.' });
      } else {
        const d = await res.json();
        setResult({ ok: false, text: d.error || 'Kayıt başarısız.' });
      }
    } catch {
      setResult({ ok: false, text: 'Bağlantı hatası.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-google-oauth-settings">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-neutral-50 rounded-lg">
          <Globe className="w-5 h-5 text-neutral-900" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Google İle Giriş</h3>
          <p className="text-sm text-neutral-500">Müşterilerin Google hesabıyla giriş yapmasını sağlayın</p>
        </div>
      </div>

      {config && (
        <div className={`flex items-center gap-2 p-3 rounded-lg mb-5 text-xs font-medium ${config.configured ? 'bg-neutral-50 border border-neutral-200 text-neutral-700' : 'bg-amber-50 border border-amber-200 text-amber-800'}`} data-testid="text-google-oauth-status">
          {config.configured
            ? `✓ Google girişi aktif (Client ID: ${config.clientIdMasked})`
            : '⚠ Henüz yapılandırılmadı - aşağıdaki bilgileri girin.'}
        </div>
      )}

      <div className="space-y-4 mb-5">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Google Cloud Console'da OAuth 2.0 Client ID oluşturun. Yetkili redirect URI olarak
            {' '}<code className="font-mono bg-blue-100 px-1 rounded">https://siteniz.com/api/auth/google/callback</code>{' '}
            adresini ekleyin.
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Client ID</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder={config?.hasClientId ? config.clientIdMasked : '123456789-xxx.apps.googleusercontent.com'}
              data-testid="input-google-client-id"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm font-mono focus:outline-none focus:border-neutral-900 transition-colors"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Client Secret</label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={config?.hasClientSecret ? '••••••••••••••••' : 'GOCSPX-...'}
              data-testid="input-google-client-secret"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm font-mono focus:outline-none focus:border-neutral-900 transition-colors"
              autoComplete="new-password"
            />
          </div>
        </div>
      </div>

      {result && (
        <div className={`p-3 rounded-lg border text-xs mb-4 ${result.ok ? 'bg-neutral-50 border-neutral-200 text-neutral-800' : 'bg-red-50 border-red-200 text-red-800'}`} data-testid="text-google-oauth-result">
          {result.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !clientId.trim() || !clientSecret.trim()}
          data-testid="button-google-oauth-save"
          className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          Bilgileri Kaydet
        </button>
      </div>
    </div>
  );
}

