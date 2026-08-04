import { Loader2, Search } from 'lucide-react';
import type {
  ReactNode,
  ComponentType,
  InputHTMLAttributes,
  ButtonHTMLAttributes,
  SelectHTMLAttributes,
} from 'react';

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
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h2 className="text-[18px] sm:text-[20px] font-semibold tracking-tight text-neutral-900 truncate">
          {title}
        </h2>
        {description && (
          <p className="text-[12px] text-neutral-500 mt-1">{description}</p>
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
      className={`bg-white border border-neutral-200 rounded-lg ${className}`}
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
        <div className="w-10 h-10 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center mb-3">
          <Icon className="w-4 h-4 text-neutral-400" />
        </div>
      )}
      <p className="text-[13px] font-semibold text-neutral-900">{title}</p>
      {description && (
        <p className="text-[12px] text-neutral-500 mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Yükleniyor…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-neutral-500 text-[13px] py-8 justify-center">
      <Loader2 className="w-4 h-4 animate-spin" />
      {label}
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
        className="pl-8 pr-3 h-9 text-[13px] bg-white border border-neutral-200 rounded-md text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-300 w-full"
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
      className={`h-9 px-2.5 pr-8 text-[13px] bg-white border border-neutral-200 rounded-md text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-300 appearance-none bg-no-repeat bg-[length:14px_14px] bg-[right_8px_center] bg-[url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20fill=%22none%22%20viewBox=%220%200%2020%2020%22%20stroke=%22%239ca3af%22><path%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%20stroke-width=%222%22%20d=%22M6%208l4%204%204-4%22/></svg>')] ${className}`}
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
      className={`inline-flex items-center justify-center gap-1.5 h-9 px-3.5 text-[13px] font-medium bg-neutral-900 text-white rounded-md hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
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
      className={`inline-flex items-center justify-center gap-1.5 h-9 px-3.5 text-[13px] font-medium bg-white text-neutral-700 border border-neutral-200 rounded-md hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
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
      className={`inline-flex items-center justify-center gap-1.5 h-9 px-3 text-[13px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
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
      className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors ${toneClass} ${className}`}
    >
      {children}
    </button>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">{children}</div>
  );
}

type StatusTone = 'neutral' | 'amber' | 'blue' | 'indigo' | 'emerald' | 'red' | 'orange';

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-neutral-50 text-neutral-700 border-neutral-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  emerald: 'bg-neutral-50 text-neutral-700 border-neutral-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
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
      className={`inline-flex items-center px-2 h-5 rounded-full border text-[11px] font-medium leading-none ${TONE_CLASS[tone]}`}
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
    <div>
      <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-[11px] text-neutral-500">{hint}</p>
      )}
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
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
      className={`w-full h-9 px-3 text-[13px] bg-white border border-neutral-200 rounded-md text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-300 disabled:bg-neutral-50 disabled:text-neutral-500 ${className}`}
    />
  );
}

export function TextArea({
  className = '',
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 text-[13px] bg-white border border-neutral-200 rounded-md text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-300 ${className}`}
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
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-neutral-100 text-neutral-700 text-[10px] font-semibold tabular-nums">
            {number}
          </span>
        )}
        <h3 className="text-[13px] font-semibold text-neutral-900">{title}</h3>
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
      ? 'bg-neutral-50 border-neutral-200 text-neutral-700'
      : tone === 'warning'
      ? 'bg-amber-50 border-amber-200 text-amber-700'
      : tone === 'error'
      ? 'bg-red-50 border-red-200 text-red-700'
      : 'bg-neutral-50 border-neutral-200 text-neutral-700';
  return (
    <div
      className={`px-3 py-2 rounded-md border text-[12px] ${toneClass}`}
      role={tone === 'error' || tone === 'warning' ? 'alert' : undefined}
    >
      {children}
    </div>
  );
}
