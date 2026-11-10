// Types the letter, one line after another, as each line comes into view.
// Untyped characters are already in the page but invisible, so nothing jumps while a line is written.

import type { Part } from "../signals/types";
import { el } from "./dom";

interface Segment {
  on: HTMLElement;
  off: HTMLElement;
  text: string;
}

export interface Typed {
  host: HTMLElement;
  segments: Segment[];
  length: number;
  typed: number;
  done: boolean;
  onStart?: () => void;
  onDone?: () => void;
}

export function prepare(host: HTMLElement, parts: Part[]): Typed {
  const segments = parts.map((part) => {
    const value = typeof part !== "string";
    const text = value ? part.v : part;
    const seg = el("span", value ? "seg val" : "seg");
    const on = el("span", "on");
    const off = el("span", "off", text);
    seg.append(on, off);
    host.append(seg);
    return { on, off, text };
  });
  return { host, segments, length: segments.reduce((n, s) => n + s.text.length, 0), typed: 0, done: false };
}

function show(item: Typed, count: number): void {
  let left = count;
  let caret: HTMLElement | null = null;
  for (const seg of item.segments) {
    const take = Math.max(0, Math.min(seg.text.length, left));
    left -= take;
    const shown = seg.text.slice(0, take);
    if (seg.on.textContent !== shown) {
      seg.on.textContent = shown;
      seg.off.textContent = seg.text.slice(take);
    }
    seg.on.classList.remove("is-caret");
    if (take > 0) caret = seg.on;
  }
  if (count < item.length) (caret ?? item.segments[0]?.on)?.classList.add("is-caret");
}

export function finish(item: Typed): void {
  if (item.done) return;
  if (item.typed === 0) item.onStart?.();
  item.typed = item.length;
  item.done = true;
  show(item, item.length);
  item.onDone?.();
}

/** Characters a second. A fast, even hand. */
const RATE = 150;
const PAUSE = 130;

export function run(items: Typed[], instant: boolean): void {
  if (instant) {
    items.forEach(finish);
    return;
  }
  let index = 0;
  let last = performance.now();
  let rest = 0;

  const frame = (now: number): void => {
    const dt = Math.min(64, now - last);
    last = now;
    const item = items[index];
    if (!item) return;
    const box = item.host.getBoundingClientRect();
    if (item.done) {
      index++;
    } else if (box.bottom < 0) {
      // Scrolled past before it was written: no one is watching, so write it at once.
      finish(item);
      index++;
    } else if (box.top < innerHeight * 0.94) {
      if (rest > 0) {
        rest -= dt;
      } else {
        if (item.typed === 0) item.onStart?.();
        // Lines waiting on screen speed the hand up, so the letter never falls far behind the reader.
        let waiting = 0;
        for (let i = index + 1; i < items.length && waiting < 4; i++) {
          if ((items[i]?.host.getBoundingClientRect().top ?? Infinity) < innerHeight) waiting++;
          else break;
        }
        item.typed = Math.min(item.length, item.typed + (RATE * (1 + waiting * 0.5) * dt) / 1000);
        show(item, Math.floor(item.typed));
        if (item.typed >= item.length) {
          item.done = true;
          show(item, item.length);
          item.onDone?.();
          index++;
          rest = PAUSE;
        }
      }
    }
    if (index < items.length) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
