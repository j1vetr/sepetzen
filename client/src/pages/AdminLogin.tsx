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
      if (!response.ok) throw new Error('Login failed');
      return response.json();
    },
    onSuccess: () => setLocation('/toov-admin'),
    onError: () => setError('Hatalı kullanıcı adı veya şifre.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate({ username, password });
  };

  const isPending = loginMutation.isPending;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-12"
      style={{ background: 'linear-gradient(160deg, #0a1508 0%, #0f1f0b 50%, #0c1a09 100%)' }}
    >
      {/* Subtle texture overlay */}
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(45,90,39,0.15) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(45,90,39,0.10) 0%, transparent 60%)' }} />

      <div className="relative w-full max-w-[380px] flex flex-col items-center">

        {/* Toov Logo */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <img
            src="/images/toov-logo.png"
            alt="Toov Internet Solutions"
            className="h-14 sm:h-16 w-auto object-contain select-none"
            draggable={false}
            data-testid="img-toov-logo"
          />
          <div className="h-px w-16 bg-white/10" />
          <p className="text-[11px] tracking-[0.22em] uppercase text-white/30 font-mono">
            Admin Paneli
          </p>
        </div>

        {/* Form card */}
        <div
          className="w-full rounded-xl p-7 sm:p-8"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded-md text-[13px]"
                style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)', color: '#fca5a5' }}
                role="alert"
                data-testid="text-error"
              >
                <span className="mt-[3px] shrink-0 w-1.5 h-1.5 rounded-full bg-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-[12px] font-medium text-white/50 tracking-wide">
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
                className="w-full h-11 px-3.5 text-[14px] rounded-md transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                }}
                onFocus={e => { e.currentTarget.style.border = '1px solid rgba(74,154,66,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,90,39,0.20)'; }}
                onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
                data-testid="input-username"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[12px] font-medium text-white/50 tracking-wide">
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
                className="w-full h-11 px-3.5 text-[14px] rounded-md transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                }}
                onFocus={e => { e.currentTarget.style.border = '1px solid rgba(74,154,66,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,90,39,0.20)'; }}
                onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
                data-testid="input-password"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 text-[13px] font-semibold tracking-wide rounded-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: '#2D5A27', color: '#fff' }}
              onMouseEnter={e => { if (!isPending) e.currentTarget.style.background = '#3a7232'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#2D5A27'; }}
              data-testid="button-login"
            >
              {isPending ? (
                <>
                  <span aria-hidden="true" className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-white/60 animate-pulse" />
                    <span className="w-1 h-1 rounded-full bg-white/80 animate-pulse [animation-delay:0.15s]" />
                    <span className="w-1 h-1 rounded-full bg-white animate-pulse [animation-delay:0.30s]" />
                  </span>
                  <span>Giriş yapılıyor</span>
                </>
              ) : (
                <span>Giriş Yap</span>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-white/20">
          Yetkisiz erişim girişimleri kayıt altına alınır.
        </p>
      </div>
    </div>
  );
}
