import { type Finding, type Part, list, v } from "./types";

export interface LanguagesInput {
  /** BCP 47 tags in order of preference, for example ["en-GB", "en", "fr"]. */
  tags: string[];
  /** The same languages named in English, in the same order. Falls back to the tag. */
  names: string[];
}

export function describeLanguages({ tags, names }: LanguagesInput): Finding {
  const base = {
    id: "languages",
    label: "languages",
    how: "This list goes to every site in the Accept-Language header, and scripts can read the same list.",
    reduce:
      "One common language is a small signal. A long, ordered list is a rare one. Some browsers send only the first.",
  };
  const shown = tags.map((tag, i) => names[i] ?? tag);
  const first = shown[0];
  if (first === undefined) {
    return { ...base, parts: ["Your browser does not say which languages you read."], status: "hidden", stable: null };
  }
  const parts: Part[] = ["Your browser asks websites for ", v(first)];
  const rest = shown.slice(1);
  if (rest.length === 0) parts.push(", and for nothing else.");
  else parts.push(" first, then ", ...list(rest.map((n) => v(n))), ".");
  return { ...base, parts, status: "read", stable: tags.join(",") };
}
