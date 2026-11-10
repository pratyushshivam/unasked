import { type Finding, type Part, list, v } from "./types";

export interface ArrivalInput {
  referrer: string;
  historyLength: number;
  /** How the browser says this page was reached: navigate, reload or back_forward. */
  kind: string | null;
  /** Whether another page opened this tab and still holds a handle to it. */
  opened: boolean;
  /** Names of tracking tags found in the address, such as utm_source. Names only. */
  tags: string[];
}

export function referrerHost(referrer: string): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).host || null;
  } catch {
    return null;
  }
}

/** Query parameters that campaigns and ad networks add to links to follow a click. */
export function trackingTags(search: string): string[] {
  const known = /^(utm_|fbclid$|gclid$|gbraid$|wbraid$|msclkid$|mc_eid$|igshid$|twclid$|ttclid$|li_fat_id$|yclid$|ref$|ref_src$)/i;
  return [...new URLSearchParams(search).keys()].filter((key) => known.test(key));
}

export function describeArrival(a: ArrivalInput): Finding {
  const host = referrerHost(a.referrer);
  const parts: Part[] = [];
  if (a.kind === "reload") parts.push("You ", v("reloaded"), " this page.");
  else if (a.kind === "back_forward") parts.push("You came back to this page with the ", v("back or forward"), " button.");
  else if (host) parts.push("You followed a link here from ", v(host), ".");
  else parts.push("You came here ", v("directly"), ", or from a page that chose not to say.");
  if (a.opened) parts.push(" The page that opened this tab can still reach it.");
  if (a.tags.length > 0) parts.push(" The link carried tracking tags: ", ...list(a.tags.slice(0, 3).map((t) => v(t))), ".");
  if (a.historyLength > 0) {
    parts.push(" This tab remembers ", v(String(a.historyLength)), a.historyLength === 1 ? " page" : " pages", ", though not which.");
  }
  return {
    id: "arrival",
    label: "how you got here",
    parts,
    how: "The referrer names the page whose link you followed, the browser records whether you reloaded or went back, and history.length counts pages.",
    reduce: "Browsers now trim the referrer to the site's name, and a link can ask for none to be sent. The links on this page do. Tags in an address can simply be deleted.",
    status: "read",
    stable: null,
  };
}
