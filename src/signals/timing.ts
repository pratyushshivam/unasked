import { type Finding, type Part, v } from "./types";

export interface TimingInput {
  /** Milliseconds from the request for this page to the first byte of the answer. */
  wait: number | null;
  /** Milliseconds spent opening the connection, 0 when one was reused. */
  connect: number | null;
  protocol: string | null;
}

const PROTOCOLS: Record<string, string> = { h2: "HTTP/2", h3: "HTTP/3", "http/1.1": "HTTP/1.1" };

export function describeTiming(t: TimingInput | null): Finding {
  const base = {
    id: "latency",
    label: "distance to the server",
    how: "The browser timed the request that fetched this page and keeps the figures in its Navigation Timing record. I read them; I sent nothing more.",
    reduce: "Any site sees how long you take to answer. Timed from several servers at once, those delays place you on the map roughly, VPN or not.",
    stable: null,
  };
  if (!t || t.wait === null || !(t.wait > 0)) {
    return {
      ...base,
      parts: ["Your browser did not time the fetching of this page, or it came from the cache."],
      status: "hidden",
    };
  }
  const parts: Part[] = ["The server took ", v(`${Math.round(t.wait)} ms`), " to begin answering when you asked for this page"];
  if (t.connect !== null && t.connect >= 1) parts.push(", after ", v(`${Math.round(t.connect)} ms`), " to open the connection");
  if (t.protocol) parts.push(", over ", v(PROTOCOLS[t.protocol] ?? t.protocol));
  parts.push(".");
  return { ...base, parts, status: "read" };
}
