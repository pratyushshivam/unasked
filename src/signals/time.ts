import { type Finding, v } from "./types";

export interface TimeInput {
  /** IANA name, for example Europe/Lisbon. null when the browser gives none. */
  zone: string | null;
  /** Minutes to add to local time to reach UTC, as Date.getTimezoneOffset returns it. */
  offsetMinutes: number;
  /** Milliseconds since 1970, UTC. */
  now: number;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function utcOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "UTC+0";
  const ahead = offsetMinutes < 0;
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${ahead ? "+" : "−"}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

export function localClock(now: number, offsetMinutes: number): { time: string; day: string } {
  const local = new Date(now - offsetMinutes * 60_000);
  const hh = String(local.getUTCHours()).padStart(2, "0");
  const mm = String(local.getUTCMinutes()).padStart(2, "0");
  return { time: `${hh}:${mm}`, day: DAYS[local.getUTCDay()] ?? "" };
}

export function describeTime({ zone, offsetMinutes, now }: TimeInput): Finding {
  const { time, day } = localClock(now, offsetMinutes);
  const offset = utcOffset(offsetMinutes);
  return {
    id: "clock",
    label: "clock",
    parts: zone
      ? ["Your clock says ", v(time), " on a ", v(day), ". Your time zone is ", v(zone), ", ", v(offset), "."]
      : ["Your clock says ", v(time), " on a ", v(day), ", ", v(offset), ". Your browser does not name the time zone."],
    how: "The browser hands scripts the system time zone by name, so that pages can show local times.",
    reduce:
      "Browsers with fingerprinting protection report UTC to everyone. Otherwise it follows your system setting, and places you on the map even when your IP address is hidden.",
    status: zone ? "read" : "partial",
    stable: zone ?? offset,
  };
}
