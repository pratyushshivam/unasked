import { type Finding, type Part, v } from "./types";

export interface ArrivalInput {
  referrer: string;
  historyLength: number;
}

export function referrerHost(referrer: string): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).host || null;
  } catch {
    return null;
  }
}

export function describeArrival({ referrer, historyLength }: ArrivalInput): Finding {
  const host = referrerHost(referrer);
  const parts: Part[] = host
    ? ["You followed a link here from ", v(host), "."]
    : ["You came here ", v("directly"), ", or from a page that chose not to say."];
  if (historyLength > 0) {
    parts.push(" This tab remembers ", v(String(historyLength)), historyLength === 1 ? " page" : " pages", ", though not which.");
  }
  return {
    id: "arrival",
    label: "arrival",
    parts,
    how: "The referrer names the page whose link you followed, and history.length counts the pages this tab has shown.",
    reduce:
      "Browsers now trim the referrer to the site's name by default, and a link can ask for none to be sent. The links on this page do.",
    status: "read",
    stable: null,
  };
}
