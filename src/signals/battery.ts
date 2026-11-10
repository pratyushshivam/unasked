import { type Finding, v } from "./types";

export interface BatteryInput {
  /** 0 to 1. */
  level: number;
  charging: boolean;
}

export function describeBattery(b: BatteryInput | null): Finding {
  const base = {
    id: "battery",
    label: "battery",
    how: "One call, getBattery(), answers without a prompt in the browsers that still have it.",
    reduce:
      "Several browsers removed this because the level and time left, read together, could follow a person from site to site. Where it is gone there is nothing to do.",
    stable: null,
  };
  if (!b || !(b.level >= 0)) {
    return { ...base, parts: ["Your browser keeps your battery level to itself."], status: "hidden" };
  }
  const percent = v(`${Math.round(b.level * 100)}%`);
  if (b.level >= 1 && b.charging) {
    return {
      ...base,
      parts: ["Your battery reads ", percent, " and ", v("plugged in"), ": a full laptop on its charger, or a machine with no battery."],
      status: "read",
    };
  }
  return {
    ...base,
    parts: ["Your battery is at ", percent, " and ", v(b.charging ? "charging" : "running down"), "."],
    status: "read",
  };
}
