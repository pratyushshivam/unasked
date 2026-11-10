import { type Finding, type Part, v } from "./types";

export interface HardwareInput {
  threads: number | null;
  /** Gigabytes, already rounded and capped by the browser. */
  memoryGB: number | null;
}

export function describeHardware({ threads, memoryGB }: HardwareInput): Finding {
  const base = {
    id: "processor",
    label: "processor",
    how: "Two plain properties, hardwareConcurrency and deviceMemory, exist so that pages can size their workload.",
    reduce:
      "Both are rounded or capped by design, and some browsers report one fixed number to everyone. The memory figure is a coarse step, never the real amount.",
  };
  if (threads === null && memoryGB === null) {
    return {
      ...base,
      parts: ["Your browser does not say how many processor threads or how much memory you have."],
      status: "hidden",
      stable: null,
    };
  }
  const parts: Part[] = [];
  if (threads !== null) {
    parts.push("Your processor offers ", v(String(threads)), threads === 1 ? " thread" : " threads");
    if (memoryGB !== null) parts.push(", and your browser admits to about ", v(`${memoryGB} GB`), " of memory.");
    else parts.push(". Your browser does not say how much memory you have.");
  } else {
    parts.push("Your browser does not count your processor threads, but admits to about ", v(`${memoryGB} GB`), " of memory.");
  }
  return {
    ...base,
    parts,
    status: threads !== null && memoryGB !== null ? "read" : "partial",
    stable: `${threads}|${memoryGB}`,
  };
}
