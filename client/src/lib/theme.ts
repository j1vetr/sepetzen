import { useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';
const STORAGE_KEY = 'sepetzen_theme';

function read(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

let current: Theme = typeof window === 'undefined' ? 'light' : read();
const listeners = new Set<() => void>();

function apply(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function setTheme(theme: Theme) {
  current = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // depolama kapalıysa seçim yalnızca bu oturumda geçerli olur
  }
  apply(theme);
  listeners.forEach((l) => l());
}

export function toggleTheme() {
  setTheme(current === 'dark' ? 'light' : 'dark');
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => 'light' as Theme,
  );
}
