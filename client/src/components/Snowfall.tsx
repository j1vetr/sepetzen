import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

interface SnowSettings {
  enabled: boolean;
  speed: number;    // 1-10
  color: string;    // hex (#ffffff)
  opacity: number;  // 10-100
  density: number;  // 10-150
}

const DEFAULTS: SnowSettings = {
  enabled: false,
  speed: 5,
  color: '#ffffff',
  opacity: 70,
  density: 60,
};

function useSnowSettings() {
  return useQuery({
    queryKey: ['snow-settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings/snow');
      if (!res.ok) throw new Error('Failed');
      return res.json() as Promise<SnowSettings>;
    },
    staleTime: 60_000,
  });
}

/** Hex → {r, g, b} */
function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function Snowfall() {
  const { data: settings = DEFAULTS } = useSnowSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!settings.enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Kar tanesi yapısı
    interface Flake {
      x: number; y: number;
      r: number;        // yarıçap
      vx: number;       // yatay hız (sürüklenme)
      vy: number;       // dikey hız
      phase: number;    // sinus dalgası fazı (doğal salınım için)
      opacity: number;  // bireysel opaklık çeşitliliği
    }

    const speedFactor = settings.speed / 5; // 1.0 = normal
    const { r: cr, g: cg, b: cb } = hexToRgb(settings.color);
    const globalOpacity = settings.opacity / 100;

    const makeFlake = (startDistributed: boolean): Flake => ({
      x: Math.random() * canvas.width,
      y: startDistributed ? Math.random() * canvas.height : -10,
      r: 1.5 + Math.random() * 3.5,
      vx: (Math.random() - 0.5) * 0.4 * speedFactor,
      vy: (0.6 + Math.random() * 1.4) * speedFactor,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.45 + Math.random() * 0.55,
    });

    const flakes: Flake[] = Array.from(
      { length: settings.density },
      () => makeFlake(true),
    );

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.012;

      for (const f of flakes) {
        // Yatay salınım: gentle sine wave
        const wx = Math.sin(t + f.phase) * 0.5;

        f.x += f.vx + wx;
        f.y += f.vy;

        // Ekran dışına çıkınca yukarıdan yeniden başla
        if (f.y > canvas.height + 10) {
          f.y = -10;
          f.x = Math.random() * canvas.width;
        }
        if (f.x < -10) f.x = canvas.width + 10;
        if (f.x > canvas.width + 10) f.x = -10;

        // Büyük taneler için hafif bulanıklık hissi (iç içe iki daire)
        const alpha = f.opacity * globalOpacity;
        if (f.r > 3) {
          const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
          grad.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha})`);
          grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [settings.enabled, settings.density, settings.speed, settings.color, settings.opacity]);

  if (!settings.enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 9997,
      }}
    />
  );
}
