import { type Finding, v } from "./types";

export interface BenchmarkInput {
  /** Rounds of a fixed calculation completed. */
  rounds: number;
  /** In this many milliseconds. */
  ms: number;
}

/** The fixed calculation. Each round feeds the next, so it cannot be skipped or done in parallel. */
export function spin(rounds: number, seed = 1): number {
  let x = seed;
  for (let i = 0; i < rounds; i++) x = Math.sqrt(x * 1.000001 + i) % 1000;
  return x;
}

/**
 * A coarse class on this page's own scale. The thresholds are not a standard: they were set by
 * running the same loop on a recent laptop, and the page says so.
 */
export function speedClass(roundsPerMs: number, fast: number): "fast" | "middling" | "slow" {
  if (roundsPerMs >= fast * 0.55) return "fast";
  if (roundsPerMs >= fast * 0.2) return "middling";
  return "slow";
}

/** Rounds per millisecond measured on the 2024 laptop the scale was set on. */
export const REFERENCE = 65_000;

export function describeBenchmark(b: BenchmarkInput | null, reference = REFERENCE): Finding {
  const base = {
    id: "speed",
    label: "speed",
    how: "For a tenth of a second I ran a fixed calculation flat out and counted the rounds. The class is my own rough scale, not a standard.",
    reduce: "Any script can time itself. The result drifts with load and battery saving, so trackers use it to sort devices into classes, as I did.",
    stable: null,
  };
  if (!b || !(b.ms > 0) || !(b.rounds > 0)) {
    return { ...base, parts: ["I could not time your processor."], status: "hidden" };
  }
  const millions = (b.rounds / 1e6).toFixed(1);
  return {
    ...base,
    parts: [
      "Your processor got through ",
      v(`${millions} million`),
      " rounds of a fixed sum in ",
      v(`${Math.round(b.ms)} ms`),
      ". By my rough scale: a ",
      v(speedClass(b.rounds / b.ms, reference)),
      " machine.",
    ],
    status: "read",
  };
}
