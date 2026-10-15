import { useState, type Dispatch, type SetStateAction } from 'react';
import { FileText, Loader2, ShieldCheck } from 'lucide-react';

type Settings = Record<string, string>;

interface Props {
  settings: Settings;
  setSettings: Dispatch<SetStateAction<any>>;
}

const PROVIDERS = [
  { id: 'birfatura', name: 'BirFatura', desc: 'e-Arşiv / e-Fatura (OutEBelgeV2)' },
  { id: 'parasut', name: 'Paraşüt', desc: 'Ön muhasebe ile e-Arşiv / e-Fatura (API v4)' },
] as const;

const inputClass =
  'w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 font-mono text-sm';
const labelClass = 'block text-sm font-medium text-neutral-500 mb-2';

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'password';
  placeholder?: string;
  testId: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
        data-testid={testId}
      />
    </div>
  );
}

function ParasutTestButton() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async () => {
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/invoice/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ provider: 'parasut' }),
      });
      const data = await res.json();
      setResult({ ok: !!data.ok, text: data.ok ? data.message : data.error || 'Bağlantı kurulamadı.' });
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
        onClick={run}
        disabled={testing}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm font-medium text-neutral-800 hover:bg-neutral-100 disabled:opacity-50"
        data-testid="button-test-parasut"
      >
        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
        {testing ? 'Test ediliyor…' : 'Paraşüt bağlantısını test et'}
      </button>
      {result && (
        <span
          className={`text-xs px-3 py-1.5 rounded-md ${
            result.ok
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
          data-testid="text-test-result-parasut"
        >
          {result.text}
        </span>
      )}
    </div>
  );
}

export default function InvoiceSettingsSection({ settings, setSettings }: Props) {
  const set = (key: string) => (v: string) => setSettings((s: Settings) => ({ ...s, [key]: v }));
  const active = settings.invoice_provider === 'parasut' ? 'parasut' : 'birfatura';

  return (
    <>
      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-invoice-provider">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-neutral-100 rounded-lg">
            <FileText className="w-5 h-5 text-neutral-700" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Aktif Fatura Sağlayıcısı</h3>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {PROVIDERS.map((p) => (
            <label
              key={p.id}
              className={`flex flex-col gap-1 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                active === p.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'
              }`}
              data-testid={`radio-invoice-provider-${p.id}`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="invoice_provider"
                  value={p.id}
                  checked={active === p.id}
                  onChange={() => set('invoice_provider')(p.id)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-semibold text-neutral-900">{p.name}</span>
              </div>
              <span className="text-xs text-neutral-500 pl-6">{p.desc}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-birfatura-settings">
        <h3 className="text-lg font-semibold text-neutral-900 mb-5">BirFatura</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="API Key" value={settings.birfatura_api_key ?? ''} onChange={set('birfatura_api_key')} type="password" placeholder="••••••••" testId="input-birfatura-api-key" />
          <Field label="Secret Key" value={settings.birfatura_secret_key ?? ''} onChange={set('birfatura_secret_key')} type="password" placeholder="••••••••" testId="input-birfatura-secret-key" />
          <Field label="Integration Key" value={settings.birfatura_integration_key ?? ''} onChange={set('birfatura_integration_key')} type="password" placeholder="••••••••" testId="input-birfatura-integration-key" />
          <Field label="API Adresi" value={settings.birfatura_base_url ?? ''} onChange={set('birfatura_base_url')} placeholder="https://uygulama.edonustur.com" testId="input-birfatura-base-url" />
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-parasut-settings">
        <h3 className="text-lg font-semibold text-neutral-900 mb-5">Paraşüt</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Firma ID" value={settings.parasut_company_id ?? ''} onChange={set('parasut_company_id')} placeholder="123456" testId="input-parasut-company-id" />
          <Field label="Client ID" value={settings.parasut_client_id ?? ''} onChange={set('parasut_client_id')} testId="input-parasut-client-id" />
          <Field label="Client Secret" value={settings.parasut_client_secret ?? ''} onChange={set('parasut_client_secret')} type="password" placeholder="••••••••" testId="input-parasut-client-secret" />
          <Field label="Kullanıcı Adı (e-posta)" value={settings.parasut_username ?? ''} onChange={set('parasut_username')} testId="input-parasut-username" />
          <Field label="Şifre" value={settings.parasut_password ?? ''} onChange={set('parasut_password')} type="password" placeholder="••••••••" testId="input-parasut-password" />
          <Field label="Tahsilat Hesabı ID" value={settings.parasut_payment_account_id ?? ''} onChange={set('parasut_payment_account_id')} testId="input-parasut-payment-account" />
        </div>
        <ParasutTestButton />
      </div>
    </>
  );
}
