import { Settings } from 'lucide-react';
import SettingsPanel from './SettingsTab';

/**
 * Footer verileri Site Kimliği ayarlarında tutulur. Bu sekme, aynı düzenleyiciyi
 * Site İçeriği altında doğrudan erişilebilir yapar.
 */
export default function FooterTab() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-neutral-100 p-2">
            <Settings className="h-5 w-5 text-neutral-900" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Footer & İletişim</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Footer’daki Kurumsal ve Yardım bağlantılarını; adres, telefon, e-posta, telif metni ve sosyal medya hesaplarını buradan düzenleyin.
            </p>
          </div>
        </div>
      </div>
      <SettingsPanel initialSection="genel" contentOnly />
    </div>
  );
}