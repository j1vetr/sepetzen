import { Moon, Sun } from 'lucide-react';
import { toggleTheme, useTheme } from '@/lib/theme';

/** Koyu başlık üzerinde durmak için tasarlandı, iki temada da aynı görünür. */
export function ThemeToggle({ className = '', testId = 'button-theme-toggle' }: { className?: string; testId?: string }) {
  const theme = useTheme();
  const isLight = theme === 'light';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center text-white/65 hover:text-white transition-colors active:scale-90 ${className}`}
      aria-label={isLight ? 'Koyu temaya geç' : 'Açık temaya geç'}
      title={isLight ? 'Koyu tema' : 'Açık tema'}
      data-testid={testId}
    >
      {isLight ? <Moon className="w-[18px] h-[18px]" strokeWidth={1.75} /> : <Sun className="w-[18px] h-[18px]" strokeWidth={1.75} />}
    </button>
  );
}
