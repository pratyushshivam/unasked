import { type Finding, v } from "./types";

/** true: the bait was hidden. false: it was left alone. null: could not test. */
export function describeBlocker(hidden: boolean | null): Finding {
  const base = {
    id: "blocker",
    label: "content blocker",
    how: "I put an empty, invisible box on the page with the kind of name advertisements have, then checked whether something had hidden it.",
    reduce: "A blocker is worth far more than the one bit it gives away here. It stops most fingerprinting scripts from loading at all.",
  };
  if (hidden === null) {
    return { ...base, parts: ["I could not test for a content blocker."], status: "hidden", stable: null };
  }
  return {
    ...base,
    parts: hidden
      ? ["Something on your side ", v("hid my bait"), ": you are running a content blocker."]
      : [v("Nothing hid my bait"), ". Either you run no content blocker, or yours works on the network and leaves page elements alone."],
    status: "read",
    stable: String(hidden),
  };
}
