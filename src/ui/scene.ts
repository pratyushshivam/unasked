// The living background: rings of dots, like the mark, that turn slowly and follow the pointer.
// It is the page looking back at you.

import { reducedMotion } from "./dom";

interface RingOfDots {
  r: number;
  count: number;
  speed: number;
  phase: number;
}

export function startScene(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const still = reducedMotion();
  const root = document.documentElement;
  let width = 0;
  let height = 0;
  let rings: RingOfDots[] = [];
  // Where the rings are centred, where they are heading, and where the pointer is.
  const centre = { x: 0, y: 0 };
  const home = { x: 0, y: 0 };
  const pointer = { x: -9999, y: -9999, seen: false };

  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    home.x = width * (width > 860 ? 0.76 : 0.5);
    home.y = height * 0.44;
    if (!pointer.seen) Object.assign(centre, home);
    const reach = Math.hypot(width, height) * 0.62;
    const gap = width > 860 ? 46 : 38;
    rings = [];
    for (let r = 34, i = 0; r < reach; r += gap, i++) {
      rings.push({
        r,
        count: Math.max(8, Math.floor((2 * Math.PI * r) / 26)),
        speed: (i % 2 === 0 ? 1 : -1) * (0.05 + 0.5 / (i + 3)),
        phase: i * 0.7,
      });
    }
  };

  const draw = (time: number): void => {
    const style = getComputedStyle(root);
    const ink = style.getPropertyValue("--fg").trim() || "#15140f";
    const accent = style.getPropertyValue("--acc").trim() || "#d4491a";
    // The centre drifts toward the pointer, slowly, and a little way only.
    const aimX = pointer.seen ? home.x + (pointer.x - home.x) * 0.32 : home.x;
    const aimY = pointer.seen ? home.y + (pointer.y - home.y) * 0.32 : home.y;
    centre.x += (aimX - centre.x) * 0.045;
    centre.y += (aimY - centre.y) * 0.045;
    ctx.clearRect(0, 0, width, height);
    const t = time / 1000;
    for (const ring of rings) {
      const turn = ring.phase + t * ring.speed * 0.25;
      for (let k = 0; k < ring.count; k++) {
        const a = turn + (k / ring.count) * Math.PI * 2;
        const x = centre.x + Math.cos(a) * ring.r;
        const y = centre.y + Math.sin(a) * ring.r;
        if (x < -4 || y < -4 || x > width + 4 || y > height + 4) continue;
        const near = pointer.seen ? Math.max(0, 1 - Math.hypot(x - pointer.x, y - pointer.y) / 170) : 0;
        if (near > 0.02) {
          ctx.globalAlpha = 0.2 + near * 0.8;
          ctx.fillStyle = accent;
          const size = 1.3 + near * 2.6;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalAlpha = 0.16;
          ctx.fillStyle = ink;
          ctx.fillRect(x - 1, y - 1, 2, 2);
        }
      }
    }
    ctx.globalAlpha = 1;
  };

  resize();
  window.addEventListener("resize", resize);
  if (still) {
    draw(0);
    return;
  }
  window.addEventListener(
    "pointermove",
    (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.seen = true;
    },
    { passive: true },
  );
  const loop = (time: number): void => {
    if (!document.hidden) draw(time);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
