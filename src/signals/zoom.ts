import { trim } from "./screen";
import { type Finding, type Part, v } from "./types";

export interface ZoomInput {
  dpr: number;
  /** Pinch zoom, from the visual viewport. null where the browser does not give it. */
  pinch: number | null;
}

export function describeZoom({ dpr, pinch }: ZoomInput): Finding {
  const parts: Part[] = [
    "Your pixel ratio is ",
    v(trim(dpr)),
    ", a number that blends your display's scaling with your page zoom",
  ];
  if (pinch !== null) parts.push("; pinch zoom is at ", v(`${trim(pinch)}×`));
  parts.push(".");
  return {
    id: "zoom",
    label: "scaling",
    parts,
    how: "window.devicePixelRatio, and the scale of the visual viewport. A page needs both to draw sharp pictures.",
    reduce: "Zooming a page changes this number, so an unusual zoom you always use is an unusual answer. 100% is the crowd.",
    status: "read",
    stable: trim(dpr),
  };
}
