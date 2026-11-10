import { type Finding, type Part, v } from "./types";

export interface PluginsInput {
  names: string[];
  /** null where the browser does not say. */
  pdfViewer: boolean | null;
}

export function describePlugins(p: PluginsInput): Finding {
  const distinct = [...new Set(p.names)];
  const frozen = distinct.length > 0 && distinct.every((name) => /pdf/i.test(name));
  const parts: Part[] = [];
  if (distinct.length === 0) parts.push("Your browser lists ", v("no plug-ins"), ".");
  else if (frozen) {
    parts.push("Your browser lists ", v(String(distinct.length)), " plug-ins, every one a PDF viewer: a fixed list that now says nothing about you.");
  } else {
    parts.push("Your browser lists ", v(String(distinct.length)), " plug-ins, the first of them ", v(distinct[0] ?? ""), ".");
  }
  if (p.pdfViewer !== null) parts.push(" It ", v(p.pdfViewer ? "opens PDFs itself" : "does not open PDFs itself"), ".");
  return {
    id: "plugins",
    label: "plug-ins",
    parts,
    how: "navigator.plugins, once the richest fingerprint on the web: it listed every plug-in you had installed, with version numbers.",
    reduce: "Browsers froze this list to the same few PDF entries for everyone. This is what a fixed leak looks like.",
    status: "read",
    stable: [distinct.join(","), p.pdfViewer].join("|"),
  };
}
