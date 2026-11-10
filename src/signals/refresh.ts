import { type Finding, v } from "./types";

const COMMON = [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 240, 360];

/** Snaps a measured rate to the nearest rate screens are really built with, if it is within 5%. */
export function nearestRate(hz: number): number {
  const best = COMMON.reduce((a, b) => (Math.abs(b - hz) < Math.abs(a - hz) ? b : a));
  return Math.abs(best - hz) / best <= 0.05 ? best : Math.round(hz);
}

export function describeRefresh(measuredHz: number | null): Finding {
  const base = {
    id: "refresh",
    label: "refresh rate",
    how: "I timed a few dozen animation frames. A browser paints in step with the screen, so the rhythm of its frames is the rhythm of your display.",
    reduce: "Nothing to switch off: any page that animates can count. A high rate is rarer than 60 and marks out gaming and recent premium screens.",
  };
  if (measuredHz === null || !(measuredHz > 5)) {
    return { ...base, parts: ["I could not time your screen's refresh rate."], status: "hidden", stable: null };
  }
  const rate = nearestRate(measuredHz);
  return {
    ...base,
    parts: ["Your screen redraws about ", v(String(rate)), " times a second."],
    status: "read",
    stable: String(rate),
  };
}
