import { type Finding, v } from "./types";

export interface MismatchInput {
  /** The region in the first language tag, for example GB in en-GB. */
  region: string | null;
  regionName: string | null;
  zone: string | null;
  /** The time zones used in that region, where the browser can list them. */
  regionZones: string[] | null;
}

export function describeMismatch(m: MismatchInput): Finding {
  const base = {
    id: "mismatch",
    label: "do they agree",
    how: "I compared the country in your first language with the countries that use your time zone. Both came from the lines above.",
    reduce: "A hidden IP address does not hide this. Travellers, expatriates and VPN users all show the same disagreement, and trackers read it.",
  };
  if (!m.region || !m.zone || !m.regionZones || m.regionZones.length === 0) {
    return {
      ...base,
      parts: ["I cannot check your language against your time zone: your browser gives too little of one or the other."],
      status: "hidden",
      stable: null,
    };
  }
  const place = v(m.regionName ?? m.region);
  const agree = m.regionZones.includes(m.zone);
  return {
    ...base,
    parts: agree
      ? ["Your language says ", place, " and your clock agrees: ", v(m.zone), " is one of its time zones."]
      : [
          "Your language says ",
          place,
          ", but your clock says ",
          v(m.zone),
          ", which is ",
          v("somewhere else"),
          ". A traveller, an expatriate, or a borrowed setting.",
        ],
    status: "read",
    stable: String(agree),
  };
}
