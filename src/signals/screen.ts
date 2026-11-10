import { type Finding, type Part, v } from "./types";

export interface ScreenInput {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  dpr: number;
}

export const trim = (n: number, places = 2): string => String(Number(n.toFixed(places)));

export function describeScreen(s: ScreenInput): Finding {
  const base = {
    id: "screen",
    label: "screen",
    how: "The screen object is open to every script: size, usable area, pixel density and colour depth, with no questions asked.",
    reduce:
      "Browsers with fingerprinting protection report a common size, or the window's size, instead. An unusual monitor is hard to disguise.",
  };
  if (!(s.width > 0 && s.height > 0)) {
    return { ...base, parts: ["Your browser does not give the size of your screen."], status: "hidden", stable: null };
  }
  const parts: Part[] = ["Your screen is ", v(`${s.width} × ${s.height}`)];
  if (s.dpr > 0 && s.dpr !== 1) {
    parts.push(
      " at ",
      v(`${trim(s.dpr)}×`),
      " density, which comes to about ",
      v(`${Math.round(s.width * s.dpr)} × ${Math.round(s.height * s.dpr)}`),
      " real pixels",
    );
  } else {
    parts.push(" pixels");
  }
  if (s.colorDepth > 0) parts.push(", in ", v(`${s.colorDepth}-bit`), " colour");
  parts.push(".");
  const lost = Math.max(s.height - s.availHeight, s.width - s.availWidth);
  if (lost > 0 && s.availHeight > 0 && s.availWidth > 0) {
    parts.push(" A taskbar, dock or menu bar takes ", v(`${lost} pixels`), " of it.");
  }
  return {
    ...base,
    parts,
    status: "read",
    stable: [s.width, s.height, s.availWidth, s.availHeight, s.colorDepth, trim(s.dpr)].join("|"),
  };
}
