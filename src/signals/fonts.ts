import { type Finding, type Part, list, v } from "./types";

/** These come with no operating system: someone, or some program, put them there. */
const ADDED_FONTS = [
  "Fira Code", "JetBrains Mono", "Source Code Pro", "Hack", "Inter", "IBM Plex Sans", "Lato", "Open Sans",
  "Montserrat", "Myriad Pro", "Minion Pro", "Proxima Nova",
] as const;

export const ADDED: ReadonlySet<string> = new Set(ADDED_FONTS);

/** Fonts the page looks for. No browser gives a list, so each one is tested by measuring. */
export const PROBES: readonly string[] = [
  // ship with Windows
  "Segoe UI", "Calibri", "Cambria", "Consolas", "Candara", "Constantia", "Corbel", "Bahnschrift", "Segoe Print",
  "Sitka Text", "Gabriola", "Cascadia Code",
  // ship with Apple systems
  "Helvetica Neue", "Menlo", "Monaco", "Avenir", "Avenir Next", "Futura", "Gill Sans", "Optima", "Baskerville",
  "Didot", "American Typewriter", "Geneva",
  // ship with Linux distributions and Android
  "DejaVu Sans", "Liberation Sans", "Ubuntu", "Cantarell", "Noto Sans", "Noto Serif", "Roboto", "Droid Sans",
  // found almost everywhere
  "Arial", "Verdana", "Georgia", "Tahoma", "Trebuchet MS", "Times New Roman", "Courier New", "Comic Sans MS",
  // installed on purpose, or by other software
  ...ADDED_FONTS,
];

export interface FontsInput {
  probed: number;
  found: string[];
}

export function describeFonts(f: FontsInput | null): Finding {
  const base = {
    id: "fonts",
    label: "fonts",
    how: "No list is offered. I measure a test word in each font on a hidden canvas; if its width differs from the fallback, the font is installed.",
    reduce:
      "Some browsers show pages only the fonts that ship with the system. Fonts you added, or that came with other software, say the most.",
  };
  if (!f || f.probed === 0) {
    return {
      ...base,
      parts: ["I could not measure text, so I cannot tell which fonts you have."],
      status: "hidden",
      stable: null,
    };
  }
  if (f.found.length === 0) {
    return {
      ...base,
      parts: ["I looked for ", v(String(f.probed)), " fonts and found ", v("none"), ". Your browser is hiding them."],
      status: "hidden",
      stable: null,
    };
  }
  const added = f.found.filter((name) => ADDED.has(name));
  const parts: Part[] = ["Of ", v(String(f.probed)), " fonts I looked for, ", v(String(f.found.length)), " are installed"];
  if (added.length > 0) {
    const named = added.slice(0, 3).map((name) => v(name));
    parts.push(", among them ", ...list(named), added.length === 1 ? ", which comes" : ", which come");
    parts.push(" with no operating system.");
  } else {
    parts.push(". Every one of them ships with an operating system.");
  }
  return { ...base, parts, status: "read", stable: f.found.join(",") };
}
