// The one thing the page cannot work out alone: what the network says about you.
// It is fetched only when the visitor presses the button. Pure: this file only reads the answer.

import type { Part } from "./signals/types";
import { v } from "./signals/types";

/** The single outside address this page may ever contact, and only on request. */
export const LOOKUP = "https://ipinfo.io/json";
export const LOOKUP_HOST = "ipinfo.io";

export interface Address {
  ip: string;
  place: string | null;
  provider: string | null;
  zone: string | null;
}

export function parseAddress(json: unknown): Address | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;
  const text = (key: string): string | null => (typeof j[key] === "string" && j[key] ? (j[key] as string) : null);
  const ip = text("ip");
  if (!ip) return null;
  const place = [text("city"), text("region"), text("country")].filter(Boolean).join(", ") || null;
  // The provider arrives as "AS12345 Name of provider".
  const provider = text("org")?.replace(/^AS\d+\s+/, "") ?? null;
  return { ip, place, provider, zone: text("timezone") };
}

export function describeAddress(a: Address, systemZone: string | null): Part[][] {
  const lines: Part[][] = [["Your address on the internet is ", v(a.ip), "."]];
  if (a.place) lines.push(["It is registered near ", v(a.place), ". Near, not at: this is a guess from the address, often the wrong town."]);
  if (a.provider) lines.push(["Your connection is sold by ", v(a.provider), "."]);
  if (a.zone && systemZone) {
    lines.push(
      a.zone === systemZone
        ? ["The address sits in ", v(a.zone), ", and so does your clock. They agree."]
        : ["The address sits in ", v(a.zone), ", but your clock says ", v(systemZone), ". A VPN, a proxy or a journey: your clock gave it away."],
    );
  }
  return lines;
}
