// Recognising a returning visitor, harmlessly. The note lives only in this browser's own storage,
// is never sent anywhere, and one click erases it. Pure: storage is handled by the caller.

import type { Part } from "./signals/types";
import { v } from "./signals/types";

export interface Note {
  /** The mark seen on the first visit. */
  mark: string;
  first: number;
  last: number;
  visits: number;
}

export const KEY = "unasked:note";

export function parseNote(raw: string | null): Note | null {
  if (!raw) return null;
  try {
    const n = JSON.parse(raw) as Partial<Note>;
    if (typeof n.mark === "string" && typeof n.first === "number" && typeof n.last === "number" && typeof n.visits === "number") {
      return { mark: n.mark, first: n.first, last: n.last, visits: n.visits };
    }
  } catch {
    /* not ours */
  }
  return null;
}

/** The note to keep after this visit. */
export function nextNote(previous: Note | null, mark: string, now: number): Note {
  if (!previous) return { mark, first: now, last: now, visits: 1 };
  return { mark: previous.mark, first: previous.first, last: now, visits: previous.visits + 1 };
}

export function ago(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "moments ago";
  if (minutes < 60) return minutes === 1 ? "a minute ago" : `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "an hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export interface Recognition {
  headline: Part[];
  detail: Part[];
  returning: boolean;
  sameMark: boolean;
}

export function recognise(previous: Note | null, mark: string, now: number): Recognition {
  if (!previous) {
    return {
      returning: false,
      sameMark: true,
      headline: ["I have not seen this browser before."],
      detail: [
        "I have now written a note in this browser's own storage: your mark, the time, and the number ",
        v("1"),
        ". It stays on this device. Come back and I will know you.",
      ],
    };
  }
  const same = previous.mark === mark;
  const visit = previous.visits + 1;
  return {
    returning: true,
    sameMark: same,
    headline: ["I know you. This is visit ", v(String(visit)), "."],
    detail: same
      ? [
          "You were last here ",
          v(ago(now - previous.last)),
          ". Your mark is ",
          v("the same"),
          " as on your first visit, so I would have known you even without the note. That is what makes a fingerprint different from a cookie.",
        ]
      : [
          "You were last here ",
          v(ago(now - previous.last)),
          ". The note says it is you, but your mark has ",
          v("changed"),
          " since the first visit: an update, a new setting, or a browser that adds noise. That last one is protection at work.",
        ],
  };
}
