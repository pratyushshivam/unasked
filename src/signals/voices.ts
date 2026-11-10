import { type Finding, type Part, v } from "./types";

export interface Voice {
  name: string;
  lang: string;
}

export function describeVoices(voices: Voice[] | null): Finding {
  const base = {
    id: "voices",
    label: "voices",
    how: "The speech API lists every text-to-speech voice on the system, with its name and language. I read the list; nothing is spoken.",
    reduce: "The list mirrors your system and its language packs. Some browsers shorten it to the defaults for that reason.",
  };
  if (!voices || voices.length === 0) {
    return { ...base, parts: ["Your browser lists no reading voices."], status: "hidden", stable: null };
  }
  const languages = new Set(voices.map((voice) => voice.lang.split(/[-_]/)[0]?.toLowerCase()).filter(Boolean));
  const first = voices[0];
  const parts: Part[] = [
    v(String(voices.length)),
    voices.length === 1 ? " reading voice is installed" : " reading voices are installed",
    ", covering ",
    v(String(languages.size)),
    languages.size === 1 ? " language." : " languages.",
  ];
  if (first) parts.push(" The first on the list is ", v(first.name), ".");
  return { ...base, parts, status: "read", stable: voices.map((voice) => `${voice.name}/${voice.lang}`).join(",") };
}
