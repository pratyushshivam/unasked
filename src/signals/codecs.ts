import { type Finding, type Part, list, v } from "./types";

/** Formats the page asks about. The second string is what the browser is asked. */
export const FORMATS: readonly [string, string][] = [
  ["H.264", 'video/mp4; codecs="avc1.42E01E"'],
  ["HEVC", 'video/mp4; codecs="hvc1.1.6.L93.B0"'],
  ["VP9", 'video/webm; codecs="vp9"'],
  ["AV1", 'video/mp4; codecs="av01.0.05M.08"'],
  ["Theora", 'video/ogg; codecs="theora"'],
  ["Dolby Vision", 'video/mp4; codecs="dvh1.05.06"'],
  ["AAC", 'audio/mp4; codecs="mp4a.40.2"'],
  ["MP3", "audio/mpeg"],
  ["Opus", 'audio/ogg; codecs="opus"'],
  ["Vorbis", 'audio/ogg; codecs="vorbis"'],
  ["FLAC", "audio/flac"],
  ["Dolby Digital", 'audio/mp4; codecs="ac-3"'],
];

export interface CodecsInput {
  /** The names from FORMATS that the browser says it can play. */
  playable: string[];
  asked: number;
}

export function describeCodecs(c: CodecsInput | null): Finding {
  const base = {
    id: "codecs",
    label: "formats played",
    how: "A video element will say whether it can play a format, no file needed. Some answers depend on your hardware and on licences your system holds.",
    reduce: "The mix is set by browser, system and chip. HEVC and the Dolby formats are the telling ones, since they need licensed or hardware decoders.",
  };
  if (!c || c.asked === 0) {
    return {
      ...base,
      parts: ["Your browser would not say which video and sound formats it plays."],
      status: "hidden",
      stable: null,
    };
  }
  const missing = FORMATS.map(([name]) => name).filter((name) => !c.playable.includes(name));
  const parts: Part[] = [
    "Your browser plays ",
    v(String(c.playable.length)),
    " of the ",
    v(String(c.asked)),
    " video and sound formats I asked about",
  ];
  if (missing.length > 0 && missing.length <= 4) parts.push(", all but ", ...list(missing.map((n) => v(n))));
  parts.push(".");
  return { ...base, parts, status: "read", stable: c.playable.join(",") };
}
