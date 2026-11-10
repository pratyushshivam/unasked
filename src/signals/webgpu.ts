import { type Finding, type Part, v } from "./types";

export interface WebgpuInput {
  vendor: string;
  architecture: string;
  device: string;
  description: string;
  features: number;
}

/** null: the API exists but gave no adapter. "absent": the browser has no WebGPU. */
export function describeWebgpu(g: WebgpuInput | null | "absent"): Finding {
  const base = {
    id: "webgpu",
    label: "webgpu",
    how: "The newer graphics API, WebGPU, hands a page an adapter with its maker, chip family and a list of features. No prompt.",
    reduce: "Browsers deliberately keep these fields coarse, often a maker and a family and nothing more. Many still do not ship the API.",
  };
  if (g === "absent") {
    return { ...base, parts: ["Your browser does not offer WebGPU, so that door is shut."], status: "hidden", stable: null };
  }
  if (!g) {
    return { ...base, parts: ["Your browser has WebGPU but would not give me an adapter."], status: "hidden", stable: null };
  }
  const who = [g.vendor, g.architecture].filter(Boolean).join(", ");
  const parts: Part[] = ["Through WebGPU, your graphics chip calls itself ", v(who || "nothing at all")];
  if (g.description || g.device) parts.push(" (", v(g.description || g.device), ")");
  parts.push(" and offers ", v(String(g.features)), g.features === 1 ? " optional feature." : " optional features.");
  return {
    ...base,
    parts,
    status: who ? "read" : "partial",
    stable: [g.vendor, g.architecture, g.device, g.description, g.features].join("|"),
  };
}
