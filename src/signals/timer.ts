import { type Finding, type Part, v } from "./types";

export interface TimerInput {
  /** The smallest step the page's clock was seen to take, in milliseconds. */
  step: number;
  /** Megabytes of memory the browser says a page may use. null where it does not say. */
  heapLimitMb: number | null;
}

export function readableStep(stepMs: number): string {
  const micro = stepMs * 1000;
  return micro >= 1000 ? `${Number((micro / 1000).toFixed(1))} ms` : `${Math.max(1, Math.round(micro))} microseconds`;
}

export function describeTimer(t: TimerInput | null): Finding {
  const base = {
    id: "timer",
    label: "clock precision",
    how: "I read the page's high-resolution clock in a tight loop and noted the smallest step it took.",
    reduce: "Browsers blur this clock on purpose: a sharp one let pages read memory they should not see. A coarse step means more protection.",
  };
  if (!t || !(t.step > 0)) {
    return {
      ...base,
      parts: ["I could not measure how finely your browser tells the time."],
      status: "hidden",
      stable: null,
    };
  }
  const shown = readableStep(t.step);
  const parts: Part[] = ["Your browser lets a page tell the time in steps of ", v(shown), ", blurred on purpose."];
  if (t.heapLimitMb !== null) {
    parts.push(" It allows a page about ", v(`${(t.heapLimitMb / 1024).toFixed(1)} GB`), " of working memory.");
  }
  return { ...base, parts, status: "read", stable: [shown, t.heapLimitMb].join("|") };
}
