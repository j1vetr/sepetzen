import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Settings, Mail, Loader2, CheckCircle2, XCircle, Send, Server, CreditCard, Copy, AlertTriangle, Wrench, MessageCircle, KeyRound, ShieldCheck, Truck, MapPin } from 'lucide-react';
import { BANK_TRANSFER_INFO } from '@shared/bankInfo';

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
              className={`w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-0 ${value === a.addressId ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-neutral-700'}`}
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

export default function SettingsPanel() {
  const [settings, setSettings] = useState<Record<string, string>>({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_secure: 'false',
    admin_email: '',
    site_url: '',
    site_name: '',
    wpileti_enabled: 'false',
    wpileti_api_key: '',
    wpileti_endpoint: 'http://127.0.0.1:3225/api/send-message',
    wpileti_admin_phone: '',
    turnstile_site_key: '',
    turnstile_secret_key: '',
    aras_kargo_enabled: 'false',
    aras_kargo_username: '',
    aras_kargo_password: '',
    aras_kargo_customer_code: '',
    aras_kargo_setorder_url: 'https://customerws.araskargo.com.tr/arascargoservice.asmx',
    aras_kargo_query_url: 'https://customerservices.araskargo.com.tr/ArasCargoCustomerIntegrationService/ArasCargoIntegrationService.svc',
    aras_kargo_sender_address_id: '',
    aras_kargo_default_desi: '1',
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
  const [waTesting, setWaTesting] = useState(false);
  const [waTestPhone, setWaTestPhone] = useState('');
  const [waTestMessage, setWaTestMessage] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountCurrentPassword, setAccountCurrentPassword] = useState('');
  const [accountNewUsername, setAccountNewUsername] = useState('');
  const [accountNewPassword, setAccountNewPassword] = useState('');
  const [accountNewPassword2, setAccountNewPassword2] = useState('');

  const { data: maintenanceData, refetch: refetchMaintenance } = useQuery<{ enabled: boolean }>({
    queryKey: ['/api/admin/maintenance'],
  });

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

  const { data: savedSettings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/settings'],
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSettings]);

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
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Ayarlar</h2>
        <p className="text-neutral-500">E-posta ve sistem ayarlarını yönetin</p>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

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
                  Site şu anda bakımda. Ziyaretçiler "Yakında yeni tasarımımız ile sizlerle birlikteyiz" mesajını görüyor. Admin paneline (<code>/admin</code>) erişim sürüyor.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
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
              <div className={`text-xs font-medium ${iyzicoConfig.configured ? 'text-emerald-600' : 'text-red-600'}`} data-testid="text-iyzico-status">
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
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
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

      {/* Aras Kargo Section */}
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
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <Send className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Test E-postası</h3>
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
          <div className="p-2 bg-emerald-50 rounded-lg">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900">WhatsApp Bildirimleri (wpileti)</h3>
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
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 font-medium"
              data-testid="button-whatsapp-test"
            >
              {waTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Test Gönder
            </button>
          </div>
        </div>
      </div>

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
    </div>
  );
}

