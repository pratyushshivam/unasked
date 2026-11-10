import { type Finding, v } from "./types";
import { type UaHints, browserFromBrands, browserFromUa } from "./ua";

export interface BrowserInput {
  ua: string;
  hints: UaHints | null;
  /** Brave announces itself through a property of its own. */
  brave: boolean;
}

export function describeBrowser({ ua, hints, brave }: BrowserInput): Finding {
  const full = hints?.fullVersionList ? browserFromBrands(hints.fullVersionList) : null;
  const found = full ?? (hints ? browserFromBrands(hints.brands) : null) ?? browserFromUa(ua);
  const base = {
    id: "browser",
    label: "browser",
    how: "The same label and hints: a browser names itself and its version so that sites can work around its bugs.",
    reduce:
      "Hiding it breaks sites. The current version of a widely used browser is the most common answer, and so the least telling.",
  };
  if (!found) {
    return { ...base, parts: ["Your browser does not give its name."], status: "hidden", stable: null };
  }
  const name = brave && !/brave/i.test(found.name) ? "Brave" : found.name;
  // The mark uses the major version only, so a minor update does not change it.
  const major = found.version?.split(".")[0] ?? null;
  return {
    ...base,
    parts: found.version
      ? ["Your browser is ", v(name), ", version ", v(found.version), "."]
      : ["Your browser is ", v(name), ". It does not give a version."],
    status: found.version ? "read" : "partial",
    stable: `${name}|${major}`,
  };
}
