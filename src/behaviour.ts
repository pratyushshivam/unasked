// What a page can learn by watching, while you read. Pure: events go in as numbers, a tally comes out.
// Nothing here listens to anything; src/ui/live.ts feeds it.

export interface Behaviour {
  startedAt: number;
  // pointer
  distance: number;
  speed: number;
  topSpeed: number;
  moves: number;
  lastX: number | null;
  lastY: number | null;
  lastMoveAt: number | null;
  pauses: number;
  longestPause: number;
  clicks: number;
  // scrolling
  scrolled: number;
  deepest: number;
  reversals: number;
  lastScrollY: number;
  lastDirection: 0 | 1 | -1;
  // attention
  switches: number;
  awayMs: number;
  hiddenAt: number | null;
  resizes: number;
  // intent
  copies: number;
  selections: number;
  menus: number;
  screenshotKeys: number;
  // typing
  keys: number;
  corrections: number;
  holdTotal: number;
  holds: number;
  gapTotal: number;
  gaps: number;
  lastKeyUpAt: number | null;
  // touch
  touches: number;
  touchRight: number;
}

/** A stillness of the pointer longer than this counts as a hesitation. */
export const PAUSE_MS = 1200;

export function start(now: number, scrollY = 0): Behaviour {
  return {
    startedAt: now,
    distance: 0, speed: 0, topSpeed: 0, moves: 0, lastX: null, lastY: null, lastMoveAt: null,
    pauses: 0, longestPause: 0, clicks: 0,
    scrolled: 0, deepest: 0, reversals: 0, lastScrollY: scrollY, lastDirection: 0,
    switches: 0, awayMs: 0, hiddenAt: null, resizes: 0,
    copies: 0, selections: 0, menus: 0, screenshotKeys: 0,
    keys: 0, corrections: 0, holdTotal: 0, holds: 0, gapTotal: 0, gaps: 0, lastKeyUpAt: null,
    touches: 0, touchRight: 0,
  };
}

export function move(b: Behaviour, x: number, y: number, now: number): void {
  if (b.lastX !== null && b.lastY !== null && b.lastMoveAt !== null) {
    const step = Math.hypot(x - b.lastX, y - b.lastY);
    const dt = now - b.lastMoveAt;
    if (dt > PAUSE_MS) {
      b.pauses++;
      b.longestPause = Math.max(b.longestPause, dt);
    }
    b.distance += step;
    // Jumps across a long gap are not speed; only steps close together in time are measured.
    if (dt > 0 && dt < 100) {
      const now_speed = (step / dt) * 1000;
      b.speed = b.speed * 0.7 + now_speed * 0.3;
      b.topSpeed = Math.max(b.topSpeed, now_speed);
    }
  }
  b.moves++;
  b.lastX = x;
  b.lastY = y;
  b.lastMoveAt = now;
}

/** Called on a timer so that the shown speed falls to rest when the pointer stops. */
export function settle(b: Behaviour, now: number): void {
  if (b.lastMoveAt !== null && now - b.lastMoveAt > 120) b.speed *= 0.6;
  if (b.speed < 1) b.speed = 0;
}

export function scroll(b: Behaviour, y: number, pageHeight: number, viewHeight: number): void {
  const delta = y - b.lastScrollY;
  if (delta === 0) return;
  b.scrolled += Math.abs(delta);
  const direction = delta > 0 ? 1 : -1;
  // A change of mind: going back up after going down, by more than a nudge.
  if (b.lastDirection !== 0 && direction !== b.lastDirection && Math.abs(delta) > 4) b.reversals++;
  b.lastDirection = direction;
  b.lastScrollY = y;
  const reach = pageHeight > viewHeight ? (y + viewHeight) / pageHeight : 1;
  b.deepest = Math.max(b.deepest, Math.min(1, reach));
}

export function visibility(b: Behaviour, hidden: boolean, now: number): void {
  if (hidden) {
    b.switches++;
    b.hiddenAt = now;
  } else if (b.hiddenAt !== null) {
    b.awayMs += now - b.hiddenAt;
    b.hiddenAt = null;
  }
}

export function keyDown(b: Behaviour, key: string): void {
  if (key === "Backspace" || key === "Delete") b.corrections++;
  else if (key.length === 1) b.keys++;
}

/** `heldMs` is how long the key was down. The gap is the time since the previous key came up. */
export function keyUp(b: Behaviour, heldMs: number, now: number): void {
  if (heldMs > 0 && heldMs < 1000) {
    b.holdTotal += heldMs;
    b.holds++;
  }
  if (b.lastKeyUpAt !== null) {
    const gap = now - b.lastKeyUpAt;
    if (gap > 0 && gap < 2000) {
      b.gapTotal += gap;
      b.gaps++;
    }
  }
  b.lastKeyUpAt = now;
}

export function touch(b: Behaviour, x: number, viewWidth: number): void {
  b.touches++;
  if (x > viewWidth / 2) b.touchRight++;
}

export const averageHold = (b: Behaviour): number | null => (b.holds >= 3 ? b.holdTotal / b.holds : null);
export const averageGap = (b: Behaviour): number | null => (b.gaps >= 3 ? b.gapTotal / b.gaps : null);

/** Keys a minute, from the rhythm between keys. null until there is enough to go on. */
export function typingPace(b: Behaviour): number | null {
  const gap = averageGap(b);
  return gap ? Math.round(60_000 / gap) : null;
}

/** A guess, and only a guess: where on the screen the thumb lands. null until twelve touches. */
export function handedness(b: Behaviour): "right" | "left" | "either" | null {
  if (b.touches < 12) return null;
  const share = b.touchRight / b.touches;
  if (share >= 0.62) return "right";
  if (share <= 0.38) return "left";
  return "either";
}

export function activeMs(b: Behaviour, now: number): number {
  const away = b.awayMs + (b.hiddenAt !== null ? now - b.hiddenAt : 0);
  return Math.max(0, now - b.startedAt - away);
}

export function clock(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
