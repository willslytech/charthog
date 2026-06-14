'use client';

import { useEffect, useRef } from 'react';

export function LandingCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = (canvas.width = innerWidth);
    let H = (canvas.height = innerHeight);
    let t = 0;
    let raf = 0;

    const resize = () => {
      W = canvas.width = innerWidth;
      H = canvas.height = innerHeight;
    };
    window.addEventListener('resize', resize);

    // ── 3-D starfield (drone descent — city lights from above) ──────────────
    type Star = { x: number; y: number; z: number; c: string };
    const stars: Star[] = Array.from({ length: 200 }, () => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random(),
      c:
        Math.random() > 0.65
          ? '#22c55e'
          : Math.random() > 0.5
          ? '#f59e0b'
          : '#c8d6e5',
    }));

    // ── Floating ticker labels ───────────────────────────────────────────────
    const RAW: [string, string, boolean][] = [
      ['AAPL', '+2.41%', true],  ['TSLA', '-1.83%', false], ['NVDA', '+5.21%', true],
      ['MSFT', '+1.14%', true],  ['AMZN', '-0.62%', false], ['META', '+3.34%', true],
      ['SPY',  '+0.78%', true],  ['QQQ',  '+1.22%', true],  ['GOOG', '+1.73%', true],
      ['JPM',  '-0.94%', false], ['GS',   '+0.44%', true],  ['BAC',  '-0.31%', false],
      ['NFLX', '+2.09%', true],  ['AMD',  '+4.18%', true],  ['DIS',  '-0.77%', false],
    ];
    type Lbl = { text: string; x: number; y: number; a: number; spd: number; col: string };
    const labels: Lbl[] = RAW.map(([sym, chg, bull]) => ({
      text: `${sym}  ${chg}`,
      x: Math.random() * W,
      y: Math.random() * H,
      a: Math.random() * 0.3 + 0.06,
      spd: Math.random() * 0.22 + 0.1,
      col: bull ? '#22c55e' : '#ef4444',
    }));

    // ── Perspective floor grid ───────────────────────────────────────────────
    const drawGrid = () => {
      const cx = W / 2;
      const hor = H * 0.56;

      // radial glow on horizon
      const rg = ctx.createRadialGradient(cx, hor, 0, cx, hor, W * 0.6);
      rg.addColorStop(0, 'rgba(34,197,94,0.12)');
      rg.addColorStop(1, 'transparent');
      ctx.fillStyle = rg;
      ctx.fillRect(0, hor - 40, W, 80);

      // vertical lines to vanishing point
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 30; i++) {
        const frac = i / 30;
        const ex = cx + (frac - 0.5) * W * 4;
        const ga = 0.06 + 0.04 * Math.sin(t * 0.8 + i * 0.4);
        ctx.strokeStyle = `rgba(34,197,94,${ga})`;
        ctx.beginPath();
        ctx.moveTo(cx, hor);
        ctx.lineTo(ex, H + 80);
        ctx.stroke();
      }

      // horizontal bands scrolling toward viewer
      for (let row = 0; row < 24; row++) {
        const p = ((row / 24) + (t * 0.042) % (1 / 24)) % 1;
        const yy = hor + Math.pow(p, 1.5) * (H * 1.35 - hor);
        const hw = ((yy - hor) / (H - hor + 1)) * W * 2;
        const ga = p * 0.1;
        ctx.strokeStyle = `rgba(34,197,94,${ga})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - hw, yy);
        ctx.lineTo(cx + hw, yy);
        ctx.stroke();
      }

      // glowing horizon line
      const lg = ctx.createLinearGradient(0, hor, W, hor);
      lg.addColorStop(0, 'transparent');
      lg.addColorStop(0.2, 'rgba(34,197,94,0.2)');
      lg.addColorStop(0.5, 'rgba(34,197,94,0.5)');
      lg.addColorStop(0.8, 'rgba(34,197,94,0.2)');
      lg.addColorStop(1, 'transparent');
      ctx.strokeStyle = lg;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, hor);
      ctx.lineTo(W, hor);
      ctx.stroke();
    };

    // ── 3-D star draw + update ───────────────────────────────────────────────
    const drawStars = () => {
      const cx = W / 2;
      const cy = H * 0.44;
      const fov = 290;

      for (const s of stars) {
        const px = cx + (s.x / s.z) * fov;
        const py = cy + (s.y / s.z) * fov;
        const sz = Math.max(0.3, (1 / s.z) * 2.8);
        const al = Math.min(1, (1 - s.z) * 2) * 0.8;

        ctx.save();
        ctx.globalAlpha = al;
        ctx.shadowColor = s.c;
        ctx.shadowBlur = sz * 4;
        ctx.fillStyle = s.c;
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        s.z -= 0.0028 + (1 - s.z) * 0.001;
        if (s.z <= 0.04) {
          s.z = 1;
          s.x = (Math.random() - 0.5) * 2;
          s.y = (Math.random() - 0.5) * 2;
        }
      }
    };

    // ── Floating labels ──────────────────────────────────────────────────────
    const drawLabels = () => {
      ctx.font = '10px "Courier New", monospace';
      for (const lb of labels) {
        ctx.save();
        ctx.globalAlpha = lb.a * (0.55 + 0.45 * Math.sin(t * 1.1 + lb.x * 0.01));
        ctx.fillStyle = lb.col;
        ctx.fillText(lb.text, lb.x, lb.y);
        ctx.restore();
        lb.y -= lb.spd;
        if (lb.y < -14) {
          lb.y = H + 14;
          lb.x = Math.random() * (W - 80);
        }
      }
    };

    // ── Main loop ────────────────────────────────────────────────────────────
    const loop = () => {
      t += 0.016;
      ctx.fillStyle = 'rgba(5,8,22,0.18)';
      ctx.fillRect(0, 0, W, H);
      drawGrid();
      drawStars();
      drawLabels();
      raf = requestAnimationFrame(loop);
    };

    ctx.fillStyle = '#050816';
    ctx.fillRect(0, 0, W, H);
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
