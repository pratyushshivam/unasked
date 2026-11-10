import { type Finding, v } from "./types";

export interface Keys {
  KeyQ?: string;
  KeyW?: string;
  KeyY?: string;
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

export function describeKeyboard(keys: Keys | null): Finding {
  const base = {
    id: "keyboard",
    label: "keyboard",
    how: "The Keyboard API maps physical keys to the characters they type. Three keys are enough to tell the common layouts apart.",
    reduce: "Several browsers left this API out because a layout gives away a country. Where it is missing, credit your browser.",
  };
  const layout = keys ? keyboardLayout(keys) : null;
  if (!layout) {
    return { ...base, parts: ["Your browser keeps your keyboard layout to itself."], status: "hidden", stable: null };
  }
  return { ...base, parts: ["Your keyboard is laid out ", v(layout), "."], status: "read", stable: layout };
}
