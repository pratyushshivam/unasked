// The mark: one ring for each thing the page read. Pure geometry, no DOM.

import type { Finding } from "./signals/types";

/** FNV-1a, 32 bit. Small, fast and good enough to turn an answer into a shape. */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export const hex8 = (n: number): string => n.toString(16).padStart(8, "0");

/** A 64-bit stand-in for the rare page that cannot use the browser's own SHA-256. */
export function fallbackDigest(input: string): string {
  return hex8(fnv1a(input)) + hex8(fnv1a(`${input}\u0000unasked`));
}

export type RingKind = "steady" | "passing" | "refused";

export interface Ring {
  id: string;
  kind: RingKind;
  r: number;
  /** Degrees, clockwise from twelve o'clock. */
  start: number;
  sweep: number;
  /** Which way it drifts, and how many seconds a full turn takes. */
  direction: 1 | -1;
  period: number;
}

export interface RingOptions {
  inner: number;
  outer: number;
}

export function buildRings(findings: Pick<Finding, "id" | "status" | "stable">[], { inner, outer }: RingOptions): Ring[] {
  const step = findings.length > 1 ? (outer - inner) / (findings.length - 1) : 0;
  return findings.map((f, i) => {
    const kind: RingKind = f.stable !== null ? "steady" : f.status === "hidden" ? "refused" : "passing";
    // Answers that change or were refused get their shape from their name alone, so the mark holds still.
    const h = fnv1a(f.stable !== null ? `${f.id}=${f.stable}` : f.id);
    return {
      id: f.id,
      kind,
      r: inner + step * i,
      start: h % 360,
      sweep: kind === "steady" ? 150 + ((h >>> 9) % 180) : 360,
      direction: (h >>> 20) % 2 === 0 ? 1 : -1,
      period: 50 + ((h >>> 22) % 70),
    };
  });
}

const point = (r: number, degrees: number): [number, number] => {
  const a = ((degrees - 90) * Math.PI) / 180;
  return [Number((r * Math.cos(a)).toFixed(2)), Number((r * Math.sin(a)).toFixed(2))];
};

/** An SVG path for an arc around the origin. A full circle is drawn as two halves. */
export function arcPath(r: number, start: number, sweep: number): string {
  if (sweep >= 360) {
    const [x1, y1] = point(r, start);
    const [x2, y2] = point(r, start + 180);
    return `M${x1} ${y1}A${r} ${r} 0 1 1 ${x2} ${y2}A${r} ${r} 0 1 1 ${x1} ${y1}`;
  }
  const [x1, y1] = point(r, start);
  const [x2, y2] = point(r, start + sweep);
  return `M${x1} ${y1}A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

export const arcLength = (r: number, sweep: number): number => (2 * Math.PI * r * Math.min(sweep, 360)) / 360;
