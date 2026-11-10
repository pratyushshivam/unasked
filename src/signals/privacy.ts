import { type Finding, type Part, v } from "./types";

export interface PrivacyInput {
  cookies: boolean;
  /** "1" when Do Not Track is on. */
  doNotTrack: string | null;
  /** undefined where the browser has no Global Privacy Control. */
  globalPrivacyControl: boolean | undefined;
  /** true when the browser is being driven by automation software. */
  webdriver: boolean;
}

export function describePrivacy(p: PrivacyInput): Finding {
  const dnt = p.doNotTrack === "1" || p.doNotTrack === "yes";
  const gpc = p.globalPrivacyControl === true;
  const parts: Part[] = ["Cookies are ", v(p.cookies ? "allowed" : "blocked"), ". You send "];
  if (dnt && gpc) parts.push("both a ", v("Do Not Track"), " request and a ", v("Global Privacy Control"), " signal.");
  else if (dnt) parts.push("a ", v("Do Not Track"), " request, and no Global Privacy Control signal.");
  else if (gpc) parts.push("a ", v("Global Privacy Control"), " signal, and no Do Not Track request.");
  else parts.push(v("neither"), " a Do Not Track request nor a Global Privacy Control signal.");
  if (p.webdriver) parts.push(" Your browser also says it is ", v("driven by automation software"), ".");
  return {
    id: "flags",
    label: "privacy flags",
    parts,
    how: "These are plain properties any script can read. The two signals also travel as headers on every request.",
    reduce:
      "Global Privacy Control has legal weight in some places and is worth sending. Do Not Track mostly has none. Either one is also a visible setting.",
    status: "read",
    stable: [p.cookies, dnt, gpc, p.webdriver].join("|"),
  };
}
