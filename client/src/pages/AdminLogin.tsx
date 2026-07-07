import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      return response.json();
    },
    onSuccess: () => {
      setLocation('/toov-admin');
    },
    onError: () => {
      setError('Hatalı kullanıcı adı veya şifre');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate({ username, password });
  };

  const isPending = loginMutation.isPending;

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col">
      <main className="flex-1 flex items-center justify-center px-5 py-10 sm:py-16">
        <div className="w-full max-w-[400px]">
          <header className="mb-10 text-center">
            <h1
              className="font-display text-[22px] sm:text-[24px] leading-tight tracking-[0.04em] text-neutral-900"
              data-testid="text-brand"
            >
              <span>POLEN STONE</span>
              <span className="text-neutral-400 mx-2">-</span>
              <span className="text-neutral-500 font-normal">Admin</span>
            </h1>
            <p className="mt-3 text-[13px] text-neutral-500">
              Devam etmek için yönetici hesabınla giriş yap.
            </p>
          </header>

          <div className="bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {error && (
                <div
                  className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-red-50 border border-red-200 text-[13px] text-red-700"
                  role="alert"
                  data-testid="text-error"
                >
                  <span className="mt-[3px] inline-block w-1 h-1 rounded-full bg-red-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="username"
                  className="block text-[12px] font-medium text-neutral-700"
                >
                  Kullanıcı Adı
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isPending}
                  required
                  className="w-full h-11 px-3.5 text-[14px] bg-white text-neutral-900 placeholder:text-neutral-400 border border-neutral-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-polen-orange/25 focus:border-polen-orange disabled:bg-neutral-50 disabled:text-neutral-500"
                  data-testid="input-username"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-[12px] font-medium text-neutral-700"
                >
                  Şifre
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                  required
                  className="w-full h-11 px-3.5 text-[14px] bg-white text-neutral-900 placeholder:text-neutral-400 border border-neutral-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-polen-orange/25 focus:border-polen-orange disabled:bg-neutral-50 disabled:text-neutral-500"
                  data-testid="input-password"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 text-[13px] font-medium tracking-wide bg-neutral-900 text-white rounded-md transition-colors hover:bg-neutral-800 active:bg-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-polen-orange/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="button-login"
              >
                {isPending ? (
                  <>
                    <span aria-hidden="true" className="inline-flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-white/60" />
                      <span className="w-1 h-1 rounded-full bg-white/80" />
                      <span className="w-1 h-1 rounded-full bg-white" />
                    </span>
                    <span>Giriş yapılıyor</span>
                  </>
                ) : (
                  <span>Giriş Yap</span>
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-[11px] text-neutral-400">
            Yetkisiz erişim girişimleri kayıt altına alınır.
          </p>
        </div>
      </main>
    </div>
  );
}
