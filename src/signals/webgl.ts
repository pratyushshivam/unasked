import { type Finding, type Part, v } from "./types";

export interface WebglInput {
  version: string;
  shading: string;
  maxTexture: number;
  maxRenderbuffer: number;
  maxAttribs: number;
  antialias: boolean;
  extensions: string[];
}

export const spaced = (hex: string): string => hex.replace(/(.{4})(?=.)/g, "$1 ");

export function describeWebgl(w: WebglInput | null, hash: (s: string) => string): Finding {
  const base = {
    id: "webgl",
    label: "graphics limits",
    how: "The same hidden WebGL context lists its limits and every optional extension the driver supports. I hashed the whole list.",
    reduce: "The list comes from your graphics driver, so it shifts with driver updates. Protective browsers trim it to a common core.",
  };
  if (!w) {
    return {
      ...base,
      parts: ["With no 3D context, your graphics driver's limits stay hidden."],
      status: "hidden",
      stable: null,
    };
  }
  const digest = hash(
    [w.version, w.shading, w.maxTexture, w.maxRenderbuffer, w.maxAttribs, w.antialias, ...w.extensions].join("|"),
  );
  const parts: Part[] = [
    "Your graphics driver offers ",
    v(String(w.extensions.length)),
    " optional extensions and textures up to ",
    v(`${w.maxTexture.toLocaleString("en-GB")} pixels`),
    " wide. The full list hashes to ",
    v(spaced(digest)),
    ".",
  ];
  return { ...base, parts, status: "read", stable: digest };
}
