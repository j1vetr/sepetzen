import { Loader2, Search } from 'lucide-react';
import type {
  ReactNode,
  ComponentType,
  InputHTMLAttributes,
  ButtonHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

const CONTROL_CLASS =
  'admin-control w-full px-3 text-[13px] bg-white border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 shadow-sm shadow-black/[0.02] transition-colors focus:outline-none focus:border-neutral-400 focus:ring-4 focus:ring-neutral-900/[0.06] disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-1.5 px-3.5 text-[13px] font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-neutral-900/[0.10] disabled:opacity-50 disabled:cursor-not-allowed';

export function titleCaseTr(value: string): string {
  return value.replace(/(^|[\s(\/])([a-zçğıöşü])/gi, (_, boundary: string, character: string) => (
    `${boundary}${character.toLocaleUpperCase('tr-TR')}`
  ));
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h2 className="text-[19px] sm:text-[22px] font-semibold tracking-tight text-neutral-950 truncate">
          {titleCaseTr(title)}
        </h2>
        {description && (
          <p className="text-[12px] leading-5 text-neutral-500 mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>
      )}
    </div>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`admin-card bg-white border border-neutral-200/90 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="w-11 h-11 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-center mb-3">
          <Icon className="w-4 h-4 text-neutral-400" />
        </div>
      )}
      <p className="text-[13px] font-semibold text-neutral-900">{titleCaseTr(title)}</p>
      {description && (
        <p className="text-[12px] text-neutral-500 mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Yükleniyor…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5 text-neutral-500 text-[13px] py-10 justify-center">
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-neutral-50 border border-neutral-200">
        <Loader2 className="w-4 h-4 animate-spin" />
      </span>
      <span>{label}</span>
    </div>
  );
}

export function SearchInput({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
      <input
        type="text"
        {...props}
        className={`${CONTROL_CLASS} h-10 pl-8 pr-3`}
      />
    </div>
  );
}

export function SelectInput({
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${CONTROL_CLASS} h-10 appearance-none bg-no-repeat bg-[length:14px_14px] bg-[right_10px_center] bg-[url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20fill=%22none%22%20viewBox=%220%200%2020%2020%22%20stroke=%22%239ca3af%22><path%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%20stroke-width=%222%22%20d=%22M6%208l4%204%204-4%22/></svg>')] ${className}`}
    />
  );
}

export function PrimaryButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`${BUTTON_BASE} h-10 bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-950 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`${BUTTON_BASE} h-10 bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 hover:text-neutral-950 hover:border-neutral-300 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`${BUTTON_BASE} h-9 px-3 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 ${className}`}
    >
      {children}
    </button>
  );
}

export function DangerButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`${BUTTON_BASE} h-10 bg-red-600 text-white hover:bg-red-700 active:bg-red-800 ${className}`}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  className = '',
  tone = 'neutral',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'neutral' | 'danger';
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-neutral-500 hover:text-red-600 hover:bg-red-50'
      : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100';
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-neutral-900/[0.10] disabled:opacity-50 disabled:cursor-not-allowed ${toneClass} ${className}`}
    >
      {children}
    </button>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">{children}</div>
  );
}

type StatusTone = 'neutral' | 'amber' | 'blue' | 'indigo' | 'emerald' | 'red' | 'orange';

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-neutral-50 text-neutral-700 border-neutral-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  blue: 'bg-blue-50 text-blue-800 border-blue-200',
  indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  orange: 'bg-orange-50 text-orange-800 border-orange-200',
};

export function StatusBadge({
  tone = 'neutral',
  children,
}: {
  tone?: StatusTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center px-2.5 h-6 rounded-full border text-[11px] font-medium leading-none ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

export function FormField({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-semibold text-neutral-900">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[11px] leading-4 text-neutral-500">{hint}</p>
      )}
      {error && <p className="text-[11px] leading-4 text-red-600">{error}</p>}
    </div>
  );
}

export function TextInput({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`${CONTROL_CLASS} h-10 ${className}`}
    />
  );
}

export function TextArea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${CONTROL_CLASS} min-h-24 py-2.5 resize-y ${className}`}
    />
  );
}

export function Checkbox({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type="checkbox"
      className={`admin-checkbox h-4 w-4 shrink-0 rounded border border-neutral-300 accent-neutral-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-neutral-900/[0.10] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
}

export function SectionHeading({
  number,
  title,
  description,
}: {
  number?: number;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-baseline gap-2">
        {number !== undefined && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-neutral-100 text-neutral-700 text-[10px] font-semibold tabular-nums">
            {number}
          </span>
        )}
        <h3 className="text-[13px] font-semibold text-neutral-900">{titleCaseTr(title)}</h3>
      </div>
      {description && (
        <p className="text-[11px] text-neutral-500 mt-0.5 ml-7">{description}</p>
      )}
    </div>
  );
}

export function InlineAlert({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'success' | 'warning' | 'error';
  children: ReactNode;
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
      : tone === 'warning'
      ? 'bg-amber-50 border-amber-200 text-amber-700'
      : tone === 'error'
      ? 'bg-red-50 border-red-200 text-red-700'
      : 'bg-neutral-50 border-neutral-200 text-neutral-700';
  return (
    <div
      className={`px-3.5 py-2.5 rounded-lg border text-[12px] leading-5 ${toneClass}`}
      role={tone === 'error' || tone === 'warning' ? 'alert' : undefined}
    >
      {children}
    </div>
  );
}
