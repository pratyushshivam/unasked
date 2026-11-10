import { type Finding, type Part, v } from "./types";

export interface PrivacyInput {
  /** "1" when Do Not Track is on. */
  doNotTrack: string | null;
  /** undefined where the browser has no Global Privacy Control. */
  globalPrivacyControl: boolean | undefined;
}

export function describePrivacy(p: PrivacyInput): Finding {
  const dnt = p.doNotTrack === "1" || p.doNotTrack === "yes";
  const gpc = p.globalPrivacyControl === true;
  const parts: Part[] = ["You send "];
  if (dnt && gpc) parts.push("both a ", v("Do Not Track"), " request and a ", v("Global Privacy Control"), " signal.");
  else if (dnt) parts.push("a ", v("Do Not Track"), " request, and no Global Privacy Control signal.");
  else if (gpc) parts.push("a ", v("Global Privacy Control"), " signal, and no Do Not Track request.");
  else parts.push(v("neither"), " a Do Not Track request nor a Global Privacy Control signal.");
  return {
    id: "flags",
    label: "privacy requests",
    parts,
    how: "These are plain properties any script can read. Both also travel as headers on every request you make.",
    reduce: "Global Privacy Control has legal weight in some places and is worth sending. Do Not Track mostly has none. Either one is also a visible setting.",
    status: "read",
    stable: [dnt, gpc].join("|"),
  };
}
