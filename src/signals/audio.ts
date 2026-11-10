import { type Finding, v } from "./types";

export interface AudioInput {
  /** The sum of the absolute sample values of a rendered test tone. */
  sum: number;
}

export function describeAudio(a: AudioInput | null): Finding {
  const base = {
    id: "audio",
    label: "audio",
    how: "An offline audio context renders a tone through a compressor without playing it. The sum of the samples differs slightly by browser engine and processor.",
    reduce:
      "People with the same browser and chip family usually share this number, so alone it says little. Some browsers add noise to it.",
  };
  if (!a || !Number.isFinite(a.sum) || a.sum === 0) {
    return { ...base, parts: ["Your browser would not render my silent test tone."], status: "hidden", stable: null };
  }
  return {
    ...base,
    parts: ["A tone I rendered in silence came back from your audio system as ", v(String(a.sum)), "."],
    status: "read",
    stable: String(a.sum),
  };
}
