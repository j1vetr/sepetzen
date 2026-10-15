import type { ReactNode } from 'react';

const LINKS = {
  kvkk: { href: '/sayfa/kvkk-aydinlatma-metni', label: 'KVKK Aydınlatma Metni' },
  membership: { href: '/sayfa/uyelik-sozlesmesi', label: 'Üyelik Sözleşmesi' },
  distanceSales: { href: '/sayfa/mesafeli-satis-sozlesmesi', label: 'Mesafeli Satış Sözleşmesi' },
  privacy: { href: '/sayfa/gizlilik-guvenlik', label: 'Gizlilik Politikası' },
} as const;

type LinkKey = keyof typeof LINKS;

export function LegalLink({ to }: { to: LinkKey }) {
  const l = LINKS[to];
  return (
    <a
      href={l.href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 text-white hover:text-white/80"
    >
      {l.label}
    </a>
  );
}

interface Props {
  checked: boolean;
  onChange: (value: boolean) => void;
  testId: string;
  children: ReactNode;
  invalid?: boolean;
}

/** Zorunlu onay kutusu. Metin ve bağlantılar çağıran sayfada children olarak verilir. */
export function LegalConsent({ checked, onChange, testId, children, invalid }: Props) {
  return (
    <label
      className={`flex items-start gap-3 cursor-pointer rounded-lg border p-3.5 bg-[#0F0F0F] ${
        invalid ? 'border-red-500/50' : 'border-white/12'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-5 h-5 shrink-0 border-white/20 bg-[#141414] rounded-md accent-white"
        data-testid={testId}
      />
      <span className="text-[12.5px] leading-relaxed text-white/65">{children}</span>
    </label>
  );
}
