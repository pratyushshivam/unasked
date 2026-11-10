import { type Finding, type Part, v } from "./types";

export interface ConnectionInput {
  online: boolean;
  /** The Network Information API. null where the browser never shipped it. */
  info: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
    type?: string;
  } | null;
}

export function describeConnection({ online, info }: ConnectionInput): Finding {
  const base = {
    id: "connection",
    label: "connection",
    how: "The Network Information API reports measurements your browser had already made. This page sent nothing to take them.",
    reduce: "The figures are rounded and capped on purpose, and several browsers never shipped the API at all.",
    stable: null,
  };
  if (!info || (!info.effectiveType && info.downlink === undefined)) {
    return {
      ...base,
      parts: ["Your browser does not describe your connection. It says only that you are ", v(online ? "online" : "offline"), "."],
      status: "partial",
    };
  }
  const parts: Part[] = ["Your connection"];
  if (info.type && info.type !== "unknown") parts.push(", over ", v(info.type), ",");
  if (info.effectiveType) parts.push(" is rated ", v(info.effectiveType));
  else parts.push(" is measured");
  if (info.downlink !== undefined) parts.push(": about ", v(`${info.downlink} Mbps`), " down");
  if (info.rtt !== undefined) parts.push(info.downlink !== undefined ? " with a " : ": a ", v(`${info.rtt} ms`), " round trip");
  parts.push(".");
  if (info.saveData !== undefined) parts.push(" Data saver is ", v(info.saveData ? "on" : "off"), ".");
  return { ...base, parts, status: "read" };
}
