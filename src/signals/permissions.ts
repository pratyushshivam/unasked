import { type Finding, type Part, list, v } from "./types";

export type PermissionAnswer = "granted" | "denied" | "prompt";

/** What the browser says this site may already do. Asking is silent: it never shows a prompt. */
export function describePermissions(states: Record<string, PermissionAnswer> | null): Finding {
  const base = {
    id: "permissions",
    label: "permissions",
    how: "permissions.query() reports whether a site already holds a permission. It only reads the answer; I asked for none.",
    reduce: "On a new site every answer is 'not yet'. On a site you use, the pattern of what you allowed and refused is one more trait.",
  };
  const entries = Object.entries(states ?? {});
  if (entries.length === 0) {
    return {
      ...base,
      parts: ["Your browser does not tell pages which permissions they hold."],
      status: "hidden",
      stable: null,
    };
  }
  const granted = entries.filter(([, s]) => s === "granted").map(([n]) => n);
  const denied = entries.filter(([, s]) => s === "denied").map(([n]) => n);
  const parts: Part[] = [];
  if (granted.length === 0 && denied.length === 0) {
    parts.push("This site holds ", v("no permissions"), ". For your ", ...list(entries.map(([n]) => n)), " it would have to ask first, and it will not.");
  } else {
    if (granted.length > 0) parts.push("This site is already allowed your ", ...list(granted.map((n) => v(n))), ".");
    if (denied.length > 0) {
      parts.push(granted.length > 0 ? " It has been refused your " : "This site has been refused your ", ...list(denied.map((n) => v(n))), ".");
    }
  }
  return { ...base, parts, status: "read", stable: entries.map(([n, s]) => `${n}:${s}`).join(",") };
}
