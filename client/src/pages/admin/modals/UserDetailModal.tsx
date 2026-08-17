import { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import type { User } from '../_shared/types';
import AdminModal from '../_ui/AdminModal';
import { PrimaryButton, SecondaryButton } from '../_ui/AdminUI';

interface SavedAddress {
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
  invoiceType: string;
  companyName: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
}

type UserForm = Omit<User, 'id' | 'createdAt'>;

const toForm = (user: User): UserForm => ({
  email: user.email ?? '',
  firstName: user.firstName ?? '',
  lastName: user.lastName ?? '',
  phone: user.phone ?? '',
  address: user.address ?? '',
  city: user.city ?? '',
  district: user.district ?? '',
  postalCode: user.postalCode ?? '',
  country: user.country ?? 'Türkiye',
  whatsappOptIn: user.whatsappOptIn ?? true,
});

export default function UserDetailModal({
  user,
  onClose,
  onSave,
  isSaving,
  saveError,
}: {
  user: User;
  onClose: () => void;
  onSave: (user: User) => void;
  isSaving: boolean;
  saveError: string | null;
}) {
  const [form, setForm] = useState<UserForm>(() => toForm(user));
  const [stats, setStats] = useState<{
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: string | null;
    products: string[];
  } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);

  useEffect(() => {
    setForm(toForm(user));
    setIsLoadingStats(true);
    setIsLoadingAddresses(true);
    fetch(`/api/admin/users/${user.id}/stats`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setIsLoadingStats(false));
    fetch(`/api/admin/users/${user.id}/addresses`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setSavedAddresses(data))
      .catch(() => setSavedAddresses([]))
      .finally(() => setIsLoadingAddresses(false));
  }, [user]);

  const setField = <K extends keyof UserForm>(field: K, value: UserForm[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  const inputClass =
    'w-full h-10 px-3 text-sm text-neutral-900 bg-white border border-neutral-200 rounded-md outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/10';
  const labelClass = 'block text-xs font-medium text-neutral-600 mb-1.5';

  return (
    <AdminModal
      open
      onClose={onClose}
      title="Kullanıcı Bilgilerini Düzenle"
      description="Profil ve iletişim bilgilerini güncelleyin."
      size="lg"
      testId="modal-user-detail"
      closeOnOutsideClick={!isSaving}
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={isSaving}>Vazgeç</SecondaryButton>
          <PrimaryButton form="user-edit-form" type="submit" disabled={isSaving} data-testid="button-save-user">
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Kaydet
          </PrimaryButton>
        </>
      }
    >
      <form
        id="user-edit-form"
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ ...user, ...form });
        }}
      >
        <section>
          <h3 className="text-sm font-semibold text-neutral-900 mb-4">Hesap ve iletişim</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label>
              <span className={labelClass}>Ad</span>
              <input className={inputClass} value={form.firstName ?? ''} onChange={(e) => setField('firstName', e.target.value)} maxLength={100} />
            </label>
            <label>
              <span className={labelClass}>Soyad</span>
              <input className={inputClass} value={form.lastName ?? ''} onChange={(e) => setField('lastName', e.target.value)} maxLength={100} />
            </label>
            <label className="sm:col-span-2">
              <span className={labelClass}>E-posta <span className="text-red-600">*</span></span>
              <input className={inputClass} type="email" required value={form.email} onChange={(e) => setField('email', e.target.value)} maxLength={255} />
            </label>
            <label>
              <span className={labelClass}>Telefon</span>
              <input className={inputClass} type="tel" value={form.phone ?? ''} onChange={(e) => setField('phone', e.target.value)} maxLength={30} />
            </label>
            <label className="flex items-center gap-3 pt-6 cursor-pointer">
              <input type="checkbox" checked={form.whatsappOptIn} onChange={(e) => setField('whatsappOptIn', e.target.checked)} className="w-4 h-4 accent-neutral-900" />
              <span className="text-sm text-neutral-700">WhatsApp bilgilendirmelerine izin veriyor</span>
            </label>
          </div>
        </section>

        <section className="pt-5 border-t border-neutral-200">
          <h3 className="text-sm font-semibold text-neutral-900 mb-4">Kayıtlı adres</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="sm:col-span-2">
              <span className={labelClass}>Adres</span>
              <textarea className={`${inputClass} h-24 py-2 resize-y`} value={form.address ?? ''} onChange={(e) => setField('address', e.target.value)} maxLength={1000} />
            </label>
            <label>
              <span className={labelClass}>İl</span>
              <input className={inputClass} value={form.city ?? ''} onChange={(e) => setField('city', e.target.value)} maxLength={100} />
            </label>
            <label>
              <span className={labelClass}>İlçe</span>
              <input className={inputClass} value={form.district ?? ''} onChange={(e) => setField('district', e.target.value)} maxLength={100} />
            </label>
            <label>
              <span className={labelClass}>Posta kodu</span>
              <input className={inputClass} value={form.postalCode ?? ''} onChange={(e) => setField('postalCode', e.target.value)} maxLength={20} />
            </label>
            <label>
              <span className={labelClass}>Ülke</span>
              <input className={inputClass} value={form.country ?? ''} onChange={(e) => setField('country', e.target.value)} maxLength={100} />
            </label>
          </div>
        </section>

        {saveError && <p className="text-sm text-red-600" role="alert">{saveError}</p>}

        {/* Saved addresses (read-only) */}
        <section className="pt-5 border-t border-neutral-200">
          <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-neutral-400" />
            Kayıtlı adresler
          </h3>
          {isLoadingAddresses ? (
            <div className="text-sm text-neutral-500">Yükleniyor...</div>
          ) : savedAddresses.length === 0 ? (
            <p className="text-sm text-neutral-400 italic">Kayıtlı adres yok.</p>
          ) : (
            <div className="space-y-3">
              {savedAddresses.map((addr) => (
                <div key={addr.id} className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-semibold text-neutral-900">{addr.title}</span>
                    {addr.isDefault && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-800 text-white px-1.5 py-0.5 rounded">
                        Varsayılan
                      </span>
                    )}
                    {addr.invoiceType === 'corporate' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        Kurumsal
                      </span>
                    )}
                  </div>
                  <p className="text-neutral-800 font-medium">{addr.firstName} {addr.lastName}</p>
                  <p className="text-neutral-600">{addr.address}</p>
                  <p className="text-neutral-600">{addr.district}, {addr.city}{addr.postalCode ? ` ${addr.postalCode}` : ''}</p>
                  <p className="text-neutral-600">{addr.country}</p>
                  <p className="text-neutral-500 mt-1">{addr.phone}</p>
                  {addr.invoiceType === 'corporate' && addr.companyName && (
                    <div className="mt-1.5 pt-1.5 border-t border-neutral-200 text-neutral-600">
                      <p>{addr.companyName}</p>
                      {addr.taxOffice && <p>Vergi Dairesi: {addr.taxOffice}</p>}
                      {addr.taxNumber && <p>Vergi No: {addr.taxNumber}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="pt-5 border-t border-neutral-200">
          <h3 className="text-sm font-semibold text-neutral-900 mb-3">Sipariş özeti</h3>
          {isLoadingStats ? (
            <div className="text-sm text-neutral-500">Yükleniyor...</div>
          ) : stats ? (
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Toplam sipariş" value={String(stats.totalOrders)} />
              <Stat label="Toplam harcama" value={`${stats.totalSpent.toFixed(2)} ₺`} />
              <Stat label="Son sipariş" value={stats.lastOrderDate ? new Date(stats.lastOrderDate).toLocaleDateString('tr-TR') : '-'} />
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Sipariş özeti alınamadı.</p>
          )}
        </section>
      </form>
    </AdminModal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-neutral-50 rounded-lg p-3 text-center">
      <p className="text-sm font-semibold text-neutral-900 truncate">{value}</p>
      <p className="mt-1 text-[11px] text-neutral-500">{label}</p>
    </div>
  );
}