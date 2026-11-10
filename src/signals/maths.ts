import { type Finding, v } from "./types";
import { spaced } from "./webgl";

/** Calculations whose last digits differ between JavaScript engines and maths libraries. */
export const SUMS: readonly (() => number)[] = [
  () => Math.tan(-1e300),
  () => Math.sin(1e300),
  () => Math.cos(1e300),
  () => Math.sinh(1),
  () => Math.cosh(10),
  () => Math.tanh(0.7),
  () => Math.expm1(1),
  () => Math.log1p(10),
  () => Math.atanh(0.5),
  () => Math.asinh(1),
  () => Math.acosh(1e300),
  () => Math.PI ** -100,
  () => Math.exp(10),
  () => Math.cbrt(100),
];

export const doSums = (): string => SUMS.map((sum) => String(sum())).join("|");

export function describeMaths(digest: string | null): Finding {
  const base = {
    id: "maths",
    label: "arithmetic",
    how: `I asked for ${SUMS.length} awkward calculations, such as the tangent of an enormous number. Engines and maths libraries disagree in the last digits.`,
    reduce: "This tells browser engines and systems apart, not people: everyone on your build gets your answers. Nothing to do.",
  };
  if (!digest) {
    return { ...base, parts: ["Your browser would not do my sums."], status: "hidden", stable: null };
  }
  return {
    ...base,
    parts: [
      "Your browser's arithmetic has an accent. ",
      v(String(SUMS.length)),
      " sums, rounded its own way, hash to ",
      v(spaced(digest)),
      ".",
    ],
    status: "read",
    stable: digest,
  };
}
