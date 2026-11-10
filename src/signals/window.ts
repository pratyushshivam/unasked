import { type Finding, v } from "./types";

export interface WindowInput {
  innerWidth: number;
  innerHeight: number;
  screenWidth: number;
  screenHeight: number;
}

export function describeWindow(w: WindowInput): Finding {
  const base = {
    id: "window",
    label: "window",
    how: "A page needs its own size to lay itself out, so it always has it. Resize the window and reload: this line changes.",
    reduce:
      "A maximised window is common; a hand-dragged size is not. Some browsers round the window to standard steps for this reason.",
    stable: null,
  };
  if (!(w.innerWidth > 0 && w.innerHeight > 0)) {
    return { ...base, parts: ["Your browser does not give the size of this window."], status: "hidden" };
  }
  const size = v(`${w.innerWidth} × ${w.innerHeight}`);
  const screenArea = w.screenWidth * w.screenHeight;
  if (!(screenArea > 0)) {
    return { ...base, parts: ["The window showing this page measures ", size, "."], status: "read" };
  }
  const share = Math.round(((w.innerWidth * w.innerHeight) / screenArea) * 100);
  return {
    ...base,
    parts:
      share >= 100
        ? ["The window showing this page measures ", size, ", ", v("as large as"), " your screen."]
        : ["The window showing this page measures ", size, ", about ", v(`${share}%`), " of your screen."],
    status: "read",
  };
}
