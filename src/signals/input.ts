import { type Finding, type Part, v } from "./types";

export interface Keys {
  KeyQ?: string;
  KeyW?: string;
  KeyY?: string;
}

export interface InputInput {
  maxTouchPoints: number;
  /** The main pointer: fine is a mouse or trackpad, coarse is a finger. */
  pointer: "fine" | "coarse" | "none" | null;
  /** What three physical keys type. null when the browser does not offer the keyboard map. */
  keys: Keys | null;
}

export function keyboardLayout(keys: Keys): string | null {
  const q = keys.KeyQ?.toLowerCase();
  const w = keys.KeyW?.toLowerCase();
  const y = keys.KeyY?.toLowerCase();
  if (!q || !w || !y) return null;
  if (q === "q" && w === "w" && y === "y") return "QWERTY";
  if (q === "q" && w === "w" && y === "z") return "QWERTZ";
  if (q === "a" && w === "z" && y === "y") return "AZERTY";
  if (q === "'" && w === ",") return "Dvorak";
  return `with ${q} and ${w} where Q and W usually sit`;
}

export function describeInput({ maxTouchPoints, pointer, keys }: InputInput): Finding {
  const touch = maxTouchPoints > 0;
  const parts: Part[] = [];
  if (pointer === "fine") {
    parts.push("You point with ", v("a mouse or trackpad"), "; the screen ");
    parts.push(touch ? v(`also takes touch, ${maxTouchPoints} fingers at once`) : v("does not take touch"), ".");
  } else if (pointer === "coarse" || touch) {
    parts.push("You use ", v("a touch screen"), " that follows ", v(String(maxTouchPoints)), " fingers at once.");
  } else {
    parts.push("Your browser reports ", v("no pointer and no touch screen"), ".");
  }
  const layout = keys ? keyboardLayout(keys) : null;
  if (layout) parts.push(" Your keyboard is laid out ", v(layout), ".");
  else parts.push(" It does not show me your keyboard layout.");
  return {
    id: "input",
    label: "input",
    parts,
    how: "Media queries report the kind of pointer, a property counts touch points, and the Keyboard API maps keys to characters.",
    reduce:
      "This is hardware, so there is little to do. Some browsers do not offer the keyboard map at all, for this reason.",
    status: layout ? "read" : "partial",
    stable: [maxTouchPoints, pointer, layout].join("|"),
  };
}
