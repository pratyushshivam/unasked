import { type Finding, type Part, v } from "./types";

export interface AppearanceInput {
  scheme: "dark" | "light" | null;
  reducedMotion: boolean | null;
  contrast: "more" | "less" | null;
  forcedColors: boolean;
  gamut: "rec2020" | "p3" | "srgb" | null;
  hdr: boolean | null;
}

const GAMUT = { srgb: "the standard sRGB", p3: "the wider P3", rec2020: "the very wide Rec. 2020" } as const;

export function describeAppearance(a: AppearanceInput): Finding {
  const base = {
    id: "appearance",
    label: "appearance",
    how: "CSS media queries answer these so that a page can match your settings. This page uses the motion one to decide whether to animate.",
    reduce:
      "Defaults are the crowd. An accessibility setting is worth having if you need it; it is also one more thing that sets a browser apart.",
  };
  if (a.scheme === null && a.reducedMotion === null && a.gamut === null) {
    return { ...base, parts: ["Your browser does not share your display preferences."], status: "hidden", stable: null };
  }
  const parts: Part[] = [];
  if (a.scheme) parts.push("You prefer a ", v(a.scheme), " theme");
  else parts.push("You state no theme preference");
  if (a.reducedMotion !== null) parts.push(" and ", v(a.reducedMotion ? "reduced motion" : "full motion"));
  if (a.contrast) parts.push(", with ", v(`${a.contrast} contrast`));
  parts.push(".");
  if (a.forcedColors) parts.push(" A ", v("forced colour palette"), " is switched on.");
  if (a.gamut) {
    parts.push(" Your display covers ", v(GAMUT[a.gamut]), " colour range");
    if (a.hdr === true) parts.push(" and ", v("can show HDR"));
    if (a.hdr === false) parts.push(" and does ", v("not show HDR"));
    parts.push(".");
  }
  return {
    ...base,
    parts,
    status: "read",
    stable: [a.scheme, a.reducedMotion, a.contrast, a.forcedColors, a.gamut, a.hdr].join("|"),
  };
}
