import { type Finding, v } from "./types";

export interface StorageInput {
  quotaBytes: number | null;
}

export function readableBytes(bytes: number): string {
  const gb = bytes / 2 ** 30;
  if (gb >= 10) return `${Math.round(gb)} GB`;
  if (gb >= 1) return `${Number(gb.toFixed(1))} GB`;
  return `${Math.max(1, Math.round(bytes / 2 ** 20))} MB`;
}

export function describeStorage({ quotaBytes }: StorageInput): Finding {
  const base = {
    id: "storage",
    label: "storage",
    how: "One call, storage.estimate(), returns the space a site may use, without a prompt.",
    reduce:
      "Browsers used to work this figure out from the size of your disk. Many now report a fixed or rounded one, so that the disk cannot be measured this way.",
  };
  if (quotaBytes === null || !(quotaBytes > 0)) {
    return {
      ...base,
      parts: ["Your browser does not say how much this site may store on your device."],
      status: "hidden",
      stable: null,
    };
  }
  const size = readableBytes(quotaBytes);
  return {
    ...base,
    parts: ["This site would be allowed to keep up to about ", v(size), " on your device. It keeps nothing."],
    status: "read",
    stable: size,
  };
}
