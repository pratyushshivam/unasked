import { type Finding, type Part, v } from "./types";
import { type UaHints, osFromHints, osFromUa, osVersion } from "./ua";

export interface DeviceInput {
  ua: string;
  hints: UaHints | null;
  maxTouchPoints: number;
}

export function chipName(architecture: string | undefined, bitness: string | undefined): string | null {
  if (!architecture) return null;
  const family = architecture === "arm" ? "ARM" : architecture;
  const described = bitness ? `${bitness}-bit ${family}` : family;
  return `${/^[aeiou8x]/i.test(described) ? "an" : "a"} ${described}`;
}

export function describeDevice({ ua, hints, maxTouchPoints }: DeviceInput): Finding {
  const os = (hints && osFromHints(hints.platform)) ?? osFromUa(ua);
  // An iPad asking for desktop sites calls itself a Mac. A Mac has no touch screen.
  const maybeIpad = os === "macOS" && maxTouchPoints > 1;
  const phone = hints ? hints.mobile : /Mobi/.test(ua);
  const kind = phone ? "phone" : os === "iPadOS" || os === "Android" || maybeIpad ? "tablet" : "computer";
  const version = os ? osVersion(os, hints?.platformVersion) : null;
  const model = hints?.model?.trim() || null;
  const chip = chipName(hints?.architecture, hints?.bitness);

  const base = {
    id: "device",
    label: "device",
    how: "Your browser sends a User-Agent label with every request, and answers a script's follow-up questions about platform, version and processor.",
    reduce:
      "Browsers have frozen most of the old label, and some refuse the follow-up questions. An up-to-date browser gives away less here.",
  };

  if (!os) {
    return { ...base, parts: ["Your browser does not say what kind of device this is."], status: "hidden", stable: null };
  }

  const parts: Part[] = ["You are reading this on a ", v(kind)];
  if (model) parts.push(", a ", v(model), ",");
  parts.push(" running ");
  if (maybeIpad) parts.push(v("iPadOS or macOS"), " (it calls itself a Mac, yet has a touch screen)");
  else parts.push(v(version ? `${os} ${version}` : os));
  if (chip) parts.push(", on ", v(chip), " processor");
  parts.push(".");
  if (!version) parts.push(" It does not give a version I can trust.");

  return {
    ...base,
    parts,
    status: version ? "read" : "partial",
    stable: [kind, maybeIpad ? "ipad-or-mac" : os, version, model, chip].join("|"),
  };
}
