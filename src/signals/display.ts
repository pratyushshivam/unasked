import { type Finding, type Part, v } from "./types";

export interface DisplayInput {
  gamut: "rec2020" | "p3" | "srgb" | null;
  hdr: boolean | null;
  /** portrait-primary, landscape-primary and so on. null where the browser does not say. */
  orientation: string | null;
}

const GAMUT = { srgb: "the standard sRGB", p3: "the wider P3", rec2020: "the very wide Rec. 2020" } as const;

export function describeDisplay(d: DisplayInput): Finding {
  const base = {
    id: "display",
    label: "display",
    how: "CSS media queries for colour gamut and dynamic range, and the screen orientation API. They exist so that pages can send better pictures to better screens.",
    reduce: "This is the panel you bought. Browsers with fingerprinting protection answer sRGB and no HDR for everyone.",
  };
  if (!d.gamut && d.hdr === null && !d.orientation) {
    return { ...base, parts: ["Your browser does not describe what your display can show."], status: "hidden", stable: null };
  }
  const parts: Part[] = [];
  if (d.gamut) parts.push("Your display covers ", v(GAMUT[d.gamut]), " colour range");
  else parts.push("Your browser does not give your display's colour range");
  if (d.hdr === true) parts.push(" and ", v("can show HDR"));
  if (d.hdr === false) parts.push(" and does ", v("not show HDR"));
  parts.push(".");
  if (d.orientation) {
    parts.push(" It is turned ", v(d.orientation.startsWith("portrait") ? "upright" : "the wide way"), ".");
  }
  return {
    ...base,
    parts,
    status: d.gamut ? "read" : "partial",
    stable: [d.gamut, d.hdr, d.orientation?.split("-")[0]].join("|"),
  };
}
