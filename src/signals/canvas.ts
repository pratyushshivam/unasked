import { type Finding, v } from "./types";

export interface CanvasInput {
  /** A short hash of the pixels read back. */
  hash: string;
  /** Whether drawing the same picture a second time gave the same pixels. */
  repeatable: boolean;
}

export const grouped = (hex: string, size = 4): string => hex.match(new RegExp(`.{1,${size}}`, "g"))?.join(" ") ?? hex;

export function describeCanvas(c: CanvasInput | null): Finding {
  const base = {
    id: "canvas",
    label: "canvas",
    how: "I drew text and shapes off-screen and read the pixels back. Graphics chip, drivers and font rendering leave tiny differences, which I hashed.",
    reduce:
      "Browsers with fingerprinting protection add faint noise or hand back a blank image. Noise that holds steady for a whole session looks, from here, like a real answer.",
  };
  if (!c) {
    return {
      ...base,
      parts: ["Your browser would not hand back the hidden picture I drew."],
      status: "hidden",
      stable: null,
    };
  }
  if (!c.repeatable) {
    return {
      ...base,
      parts: ["I drew a hidden picture twice and got ", v("two different results"), ". Your browser is blurring it on purpose."],
      status: "partial",
      stable: null,
    };
  }
  return {
    ...base,
    parts: [
      "I drew a hidden picture and your machine rendered it in its own way: ",
      v(grouped(c.hash)),
      ". Asked twice, it gave ",
      v("the same answer"),
      ".",
    ],
    status: "read",
    stable: c.hash,
  };
}
