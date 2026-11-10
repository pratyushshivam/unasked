import { type Finding, type Part, v } from "./types";

export interface GraphicsInput {
  /** The WebGL renderer string. null when no 3D context could be opened. */
  renderer: string | null;
}

export interface Renderer {
  name: string;
  api: string | null;
  /** Some browsers report a family of similar chips and say so. */
  approximate: boolean;
  /** Drawn by the processor, with no graphics chip in use. */
  software: boolean;
}

const APIS: [RegExp, string][] = [
  [/Direct3D ?(\d+)/i, "Direct3D $1"],
  [/Metal/i, "Metal"],
  [/Vulkan/i, "Vulkan"],
  [/OpenGL ES/i, "OpenGL ES"],
  [/OpenGL/i, "OpenGL"],
];

export function parseRenderer(raw: string): Renderer {
  const approximate = /,?\s*or similar\s*$/i.test(raw);
  let s = raw.replace(/,?\s*or similar\s*$/i, "").trim();
  let api: string | null = null;
  for (const [pattern, label] of APIS) {
    const m = pattern.exec(s);
    if (m) {
      api = label.replace("$1", m[1] ?? "");
      break;
    }
  }
  // Chromium and Firefox wrap the name: ANGLE (vendor, name and API, driver).
  const angle = /^ANGLE \((.*)\)$/.exec(s);
  if (angle?.[1]) {
    const fields = angle[1].split(/,\s*/);
    s = (fields.length >= 2 ? fields[1] : fields[0]) ?? s;
  }
  s = s
    .replace(/^ANGLE Metal Renderer:\s*/i, "")
    .replace(/\s*\(0x[0-9a-f]+\)/gi, "")
    .replace(/\s+(Direct3D|OpenGL|Vulkan|Metal).*$/i, "")
    .replace(/\((R|TM)\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const software = /swiftshader|llvmpipe|software|basic render/i.test(raw);
  return { name: s || raw, api, approximate, software };
}

export function describeGraphics({ renderer }: GraphicsInput): Finding {
  const base = {
    id: "graphics",
    label: "graphics",
    how: "I opened a hidden WebGL context and asked for the name of its renderer, a string meant for tracking down graphics bugs.",
    reduce:
      "Some browsers report a generic name or a family of chips in place of the exact model. Turning off hardware acceleration changes the answer but makes you rarer.",
  };
  if (!renderer) {
    return {
      ...base,
      parts: ["I could not open a 3D drawing context, so your graphics hardware stays unknown to me."],
      status: "hidden",
      stable: null,
    };
  }
  const r = parseRenderer(renderer);
  const parts: Part[] = r.software
    ? ["Your graphics are drawn in ", v("software"), ", by ", v(r.name), ", with no graphics chip in use"]
    : ["Your graphics are drawn by ", v(r.name)];
  if (r.approximate) parts.push(", or something close to it");
  if (r.api && !r.software) parts.push(", through ", v(r.api));
  parts.push(".");
  return { ...base, parts, status: r.approximate ? "partial" : "read", stable: renderer };
}
