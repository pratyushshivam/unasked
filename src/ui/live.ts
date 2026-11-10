// The live chapter: what a page learns by watching. Events go into the tally in src/behaviour.ts;
// this file listens, draws the pointer's path and keeps the figures on screen up to date.

import * as B from "../behaviour";
import { byId, el, reducedMotion } from "./dom";

interface Tile {
  label: string;
  read(b: B.Behaviour, now: number): string;
  unit?: string;
}

const whole = (n: number): string => Math.round(n).toLocaleString("en-GB");
const seconds = (ms: number): string => (ms / 1000).toFixed(1);
const or = (value: number | null, show: (n: number) => string): string => (value === null ? "–" : show(value));

function tiles(touchScreen: boolean, turned: () => number): Tile[] {
  const list: Tile[] = [
    { label: "time you have given this page", read: (b, now) => B.clock(B.activeMs(b, now)) },
    { label: "furthest you have read", read: (b) => String(Math.round(b.deepest * 100)), unit: "%" },
    { label: "distance your pointer has travelled", read: (b) => whole(b.distance), unit: "px" },
    { label: "its speed right now", read: (b) => whole(b.speed), unit: "px/s" },
    { label: "its top speed", read: (b) => whole(b.topSpeed), unit: "px/s" },
    { label: "hesitations", read: (b) => String(b.pauses) },
    { label: "longest stillness", read: (b) => seconds(b.longestPause), unit: "s" },
    { label: "distance scrolled", read: (b) => whole(b.scrolled), unit: "px" },
    { label: "times you scrolled back", read: (b) => String(b.reversals) },
    { label: "times you looked away", read: (b) => String(b.switches) },
    { label: "time spent elsewhere", read: (b, now) => B.clock(b.awayMs + (b.hiddenAt !== null ? now - b.hiddenAt : 0)) },
    { label: "clicks and taps", read: (b) => String(b.clicks) },
    { label: "lines you turned over", read: () => String(turned()) },
    { label: "window resizes", read: (b) => String(b.resizes) },
    { label: "passages you selected", read: (b) => String(b.selections) },
    { label: "copies and right-clicks", read: (b) => String(b.copies + b.menus) },
    { label: "screenshot key presses", read: (b) => String(b.screenshotKeys) },
  ];
  if (touchScreen) {
    list.push({
      label: "your thumb, at a guess",
      read: (b) => B.handedness(b) ?? `${b.touches} of 12`,
    });
  }
  return list;
}

const TYPING: Tile[] = [
  { label: "keys", read: (b) => String(b.keys) },
  { label: "keys a minute", read: (b) => or(B.typingPace(b), whole) },
  { label: "each key held", read: (b) => or(B.averageHold(b), whole), unit: "ms" },
  { label: "gap between keys", read: (b) => or(B.averageGap(b), whole), unit: "ms" },
  { label: "corrections", read: (b) => String(b.corrections) },
];

function mount(host: HTMLElement, list: Tile[]): ((b: B.Behaviour, now: number) => void)[] {
  return list.map((tile) => {
    const box = el("div", "tile");
    const value = el("dd");
    const figure = document.createTextNode("0");
    value.append(figure);
    if (tile.unit) value.append(el("small", undefined, tile.unit));
    box.append(el("dt", undefined, tile.label), value);
    host.append(box);
    let last = "";
    let cool = 0;
    return (b, now) => {
      const next = tile.read(b, now);
      if (next === last) return;
      const first = last === "";
      last = next;
      figure.nodeValue = next;
      if (first) return;
      // A figure that has just changed glows for a moment.
      box.classList.add("is-hot");
      clearTimeout(cool);
      cool = window.setTimeout(() => box.classList.remove("is-hot"), 700);
    };
  });
}

interface Point {
  x: number;
  y: number;
  click: boolean;
}

export function startLive(): void {
  const b = B.start(performance.now(), window.scrollY);
  const touchScreen = navigator.maxTouchPoints > 0;
  let turned = 0;
  document.addEventListener("unasked:turn", () => turned++);

  const updates = [...mount(byId("tiles"), tiles(touchScreen, () => turned)), ...mount(byId("type-tiles"), TYPING)];
  const refresh = (): void => {
    const now = performance.now();
    B.settle(b, now);
    updates.forEach((update) => update(b, now));
  };
  refresh();
  setInterval(refresh, 200);

  // ---- the pointer's path
  const canvas = byId<HTMLCanvasElement>("trace");
  const note = byId("trace-note");
  const ctx = canvas.getContext("2d");
  const path: Point[] = [];
  let dirty = true;
  const record = (x: number, y: number, click = false): void => {
    path.push({ x: x / window.innerWidth, y: y / window.innerHeight, click });
    if (path.length > 2400) path.splice(0, path.length - 2400);
    dirty = true;
  };
  const paint = (): void => {
    if (!ctx || !dirty) return;
    dirty = false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const style = getComputedStyle(document.documentElement);
    const ink = style.getPropertyValue("--fg").trim() || "#f2eee5";
    const accent = style.getPropertyValue("--acc").trim() || "#ff6b3d";
    ctx.lineWidth = 1.4;
    ctx.lineJoin = "round";
    ctx.strokeStyle = ink;
    // Older stretches of the path fade, so the recent movement reads first.
    const total = path.length;
    for (let i = 1; i < total; i++) {
      const from = path[i - 1];
      const to = path[i];
      if (!from || !to) continue;
      ctx.globalAlpha = 0.12 + 0.75 * (i / total) ** 2;
      ctx.beginPath();
      ctx.moveTo(from.x * w, from.y * h);
      ctx.lineTo(to.x * w, to.y * h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = accent;
    ctx.strokeStyle = accent;
    for (const point of path) {
      if (!point.click) continue;
      ctx.beginPath();
      ctx.arc(point.x * w, point.y * h, 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    const head = path[total - 1];
    if (head) {
      ctx.beginPath();
      ctx.arc(head.x * w, head.y * h, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    note.textContent = `${total.toLocaleString("en-GB")} positions recorded, none of them sent`;
  };
  if (reducedMotion()) setInterval(paint, 400);
  else {
    const loop = (): void => {
      paint();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  // The paper and ink change under the drawing, so it is redrawn now and then even when nothing moves.
  setInterval(() => (dirty = true), 500);

  // ---- listening. These are the ordinary events every page receives.
  const passive = { passive: true } as const;
  window.addEventListener(
    "pointermove",
    (event) => {
      B.move(b, event.clientX, event.clientY, performance.now());
      record(event.clientX, event.clientY);
    },
    passive,
  );
  window.addEventListener(
    "pointerdown",
    (event) => {
      b.clicks++;
      record(event.clientX, event.clientY, true);
      if (event.pointerType === "touch") B.touch(b, event.clientX, window.innerWidth);
    },
    passive,
  );
  window.addEventListener(
    "scroll",
    () => B.scroll(b, window.scrollY, document.documentElement.scrollHeight, window.innerHeight),
    passive,
  );
  document.addEventListener("visibilitychange", () => B.visibility(b, document.hidden, performance.now()));
  window.addEventListener("resize", () => b.resizes++);
  document.addEventListener("copy", () => b.copies++);
  document.addEventListener("contextmenu", () => b.menus++);
  document.addEventListener("pointerup", () => {
    if ((document.getSelection()?.toString().length ?? 0) > 0) b.selections++;
  });
  window.addEventListener("keyup", (event) => {
    if (event.key === "PrintScreen") b.screenshotKeys++;
  });

  // ---- typing rhythm. The letters themselves are never looked at: only when a key went down and came up.
  const box = byId<HTMLInputElement>("type-box");
  const down = new Map<string, number>();
  box.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    down.set(event.code, performance.now());
    B.keyDown(b, event.key.length === 1 ? "x" : event.key);
  });
  box.addEventListener("keyup", (event) => {
    const now = performance.now();
    const went = down.get(event.code);
    down.delete(event.code);
    if (went !== undefined) B.keyUp(b, now - went, now);
  });
}
