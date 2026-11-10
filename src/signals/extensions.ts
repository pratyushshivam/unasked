import { type Finding, list, v } from "./types";

export function describeExtensions(traces: string[]): Finding {
  const base = {
    id: "extensions",
    label: "extensions",
    how: "Pages cannot list your extensions. Some extensions give themselves away by what they add to a page: a global object, an attribute, a small button.",
    reduce: "Fewer extensions, fewer traces, and each one can read the pages you visit. Many well-made ones leave nothing a page can see.",
  };
  if (traces.length === 0) {
    return {
      ...base,
      parts: [v("No extension left a trace"), " on this page. You may still have some; the careful ones cannot be seen from here."],
      status: "read",
      stable: "",
    };
  }
  return {
    ...base,
    parts: ["Left behind on this page by your extensions: the marks of ", ...list(traces.map((t) => v(t))), "."],
    status: "read",
    stable: traces.join(","),
  };
}
