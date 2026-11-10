/** A piece of a sentence: plain words, or a value the browser reported. */
export type Part = string | { v: string };

/** read: the browser answered. partial: it answered in part. hidden: it gave nothing. */
export type Status = "read" | "partial" | "hidden";

export interface Finding {
  id: string;
  /** Short name, used in the margin and on the mark. */
  label: string;
  /** The sentence shown to the visitor. */
  parts: Part[];
  /** One sentence: how the page found this out. */
  how: string;
  /** One or two sentences: what reduces it. */
  reduce: string;
  status: Status;
  /** The value that goes into the mark. null when it is hidden or changes from minute to minute. */
  stable: string | null;
}

export const v = (value: string | number): { v: string } => ({ v: String(value) });

export const text = (parts: Part[]): string => parts.map((p) => (typeof p === "string" ? p : p.v)).join("");

/** Joins names as "a", "a and b", "a, b and c". */
export function list(items: Part[]): Part[] {
  const out: Part[] = [];
  items.forEach((item, i) => {
    if (i > 0) out.push(i === items.length - 1 ? " and " : ", ");
    out.push(item);
  });
  return out;
}
