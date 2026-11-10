import { type Finding, type Part, list, v } from "./types";

export interface AppearanceInput {
  scheme: "dark" | "light" | null;
  reducedMotion: boolean | null;
  contrast: "more" | "less" | null;
  forcedColors: boolean;
  reducedTransparency: boolean;
  reducedData: boolean;
  invertedColors: boolean;
}

export function describeAppearance(a: AppearanceInput): Finding {
  const base = {
    id: "appearance",
    label: "your settings",
    how: "CSS media queries answer these so that a page can match your settings. This page uses the motion one to decide whether to animate.",
    reduce: "Defaults are the crowd. An accessibility setting is worth having if you need it; it is also one more thing that sets a browser apart.",
  };
  if (a.scheme === null && a.reducedMotion === null) {
    return { ...base, parts: ["Your browser does not share your display preferences."], status: "hidden", stable: null };
  }
  const parts: Part[] = [];
  if (a.scheme) parts.push("You prefer a ", v(a.scheme), " theme");
  else parts.push("You state no theme preference");
  if (a.reducedMotion !== null) parts.push(" and ", v(a.reducedMotion ? "reduced motion" : "full motion"));
  if (a.contrast) parts.push(", with ", v(`${a.contrast} contrast`));
  parts.push(".");
  const extras: string[] = [];
  if (a.forcedColors) extras.push("a forced colour palette");
  if (a.reducedTransparency) extras.push("less transparency");
  if (a.reducedData) extras.push("lighter pages to save data");
  if (a.invertedColors) extras.push("inverted colours");
  if (extras.length > 0) parts.push(" You have also asked for ", ...list(extras.map((e) => v(e))), ".");
  else parts.push(" No accessibility setting that a page can see is switched on.");
  return {
    ...base,
    parts,
    status: "read",
    stable: [a.scheme, a.reducedMotion, a.contrast, a.forcedColors, a.reducedTransparency, a.reducedData, a.invertedColors].join("|"),
  };
}
