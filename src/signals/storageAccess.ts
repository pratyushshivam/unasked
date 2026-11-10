import { type Finding, type Part, list, v } from "./types";

export interface StorageAccessInput {
  cookies: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDb: boolean;
  serviceWorker: boolean;
}

export function describeStorageAccess(s: StorageAccessInput): Finding {
  const names: [boolean, string][] = [
    [s.cookies, "cookies"],
    [s.localStorage, "local storage"],
    [s.sessionStorage, "session storage"],
    [s.indexedDb, "a database"],
    [s.serviceWorker, "a background worker"],
  ];
  const open = names.filter(([ok]) => ok).map(([, name]) => name);
  const shut = names.filter(([ok]) => !ok).map(([, name]) => name);
  const parts: Part[] = [];
  if (open.length === 0) parts.push("Your browser offers this site ", v("nowhere to keep anything"), ".");
  else parts.push("A site may leave things in your browser by way of ", ...list(open.map((n) => v(n))), ".");
  if (shut.length > 0 && open.length > 0) parts.push(" Closed to it: ", ...list(shut.map((n) => v(n))), ".");
  return {
    id: "places",
    label: "places to keep things",
    parts,
    how: "I checked that each store exists and can be opened. I wrote to none of them for this line.",
    reduce: "Blocking third-party cookies and clearing site data on exit limits what survives. A fingerprint needs none of these, which is its whole appeal.",
    status: "read",
    stable: names.map(([ok]) => (ok ? 1 : 0)).join(""),
  };
}
