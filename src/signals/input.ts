import { type Finding, type Part, v } from "./types";

export interface InputInput {
  maxTouchPoints: number;
  /** The main pointer: fine is a mouse or trackpad, coarse is a finger. */
  pointer: "fine" | "coarse" | "none" | null;
  /** Whether the main pointer can hover over things. */
  hover: boolean | null;
}

export function describeInput({ maxTouchPoints, pointer, hover }: InputInput): Finding {
  const touch = maxTouchPoints > 0;
  const parts: Part[] = [];
  if (pointer === "fine") {
    parts.push("You point with ", v("a mouse or trackpad"), "; the screen ");
    parts.push(touch ? v(`also takes touch, ${maxTouchPoints} fingers at once`) : v("does not take touch"), ".");
  } else if (pointer === "coarse" || touch) {
    parts.push("You use ", v("a touch screen"), " that follows ", v(String(maxTouchPoints)), " fingers at once");
    parts.push(hover ? ", with something that can hover as well." : ".");
  } else {
    parts.push("Your browser reports ", v("no pointer and no touch screen"), ".");
  }
  return {
    id: "input",
    label: "pointer and touch",
    parts,
    how: "Media queries report the kind of pointer and whether it can hover, and a plain property counts touch points.",
    reduce: "This is hardware, so there is little to do. A laptop with a touch screen is a smaller crowd than one without.",
    status: pointer ? "read" : "partial",
    stable: [maxTouchPoints, pointer, hover].join("|"),
  };
}
