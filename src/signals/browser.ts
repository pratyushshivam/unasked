import { type Finding, type Part, v } from "./types";
import { type UaHints, browserFromBrands, browserFromUa } from "./ua";

export interface BrowserInput {
  ua: string;
  hints: UaHints | null;
  /** Brave announces itself through a property of its own. */
  brave: boolean;
}

/** The rendering engine underneath, which a rebadged browser cannot hide. */
export function engineFromUa(ua: string): "Blink" | "Gecko" | "WebKit" | null {
  if (/Gecko\/\d/.test(ua) && /Firefox\//.test(ua)) return "Gecko";
  if (/Chrome\/|Chromium\/|Edg\//.test(ua)) return "Blink";
  if (/AppleWebKit\//.test(ua)) return "WebKit";
  return null;
}

export function describeBrowser({ ua, hints, brave }: BrowserInput): Finding {
  const full = hints?.fullVersionList ? browserFromBrands(hints.fullVersionList) : null;
  const found = full ?? (hints ? browserFromBrands(hints.brands) : null) ?? browserFromUa(ua);
  const engine = engineFromUa(ua);
  const base = {
    id: "browser",
    label: "browser",
    how: "The same label and hints: a browser names itself and its version so that sites can work around its bugs.",
    reduce: "Hiding it breaks sites. The current version of a widely used browser is the most common answer, and so the least telling.",
  };
  if (!found) {
    return { ...base, parts: ["Your browser does not give its name."], status: "hidden", stable: null };
  }
  const name = brave && !/brave/i.test(found.name) ? "Brave" : found.name;
  // The mark uses the major version only, so a minor update does not change it.
  const major = found.version?.split(".")[0] ?? null;
  const parts: Part[] = found.version
    ? ["Your browser is ", v(name), ", version ", v(found.version)]
    : ["Your browser is ", v(name), ", and it does not give a version"];
  if (engine) parts.push(", built on the ", v(engine), " engine");
  parts.push(".");
  return { ...base, parts, status: found.version ? "read" : "partial", stable: `${name}|${major}|${engine}` };
}
