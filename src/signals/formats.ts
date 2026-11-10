import { type Finding, type Part, v } from "./types";

export interface FormatsInput {
  /** The locale the formatting API resolved to. */
  locale: string | null;
  /** 31 December, 21:30 and 1,234,567.89, each written the way the visitor's own locale writes it. */
  date: string;
  time: string;
  number: string;
  calendar: string | null;
}

const CALENDARS: Record<string, string> = {
  gregory: "Gregorian",
  buddhist: "Buddhist",
  japanese: "Japanese",
  persian: "Persian",
  "islamic-umalqura": "Islamic (Umm al-Qura)",
  hebrew: "Hebrew",
  indian: "Indian national",
  roc: "Minguo",
};

export function describeFormats(f: FormatsInput): Finding {
  const base = {
    id: "formats",
    label: "formats",
    how: "The formatting API reveals the region your system is set to, down to digits, calendar and clock style.",
    reduce:
      "These follow your system's regional settings. A region that disagrees with your language or time zone is unusual, and unusual gets noticed.",
  };
  if (!f.locale) {
    return {
      ...base,
      parts: ["Your browser does not say how you write dates and numbers."],
      status: "hidden",
      stable: null,
    };
  }
  const parts: Part[] = [
    "You would write New Year's Eve as ",
    v(f.date),
    ", half past nine at night as ",
    v(f.time),
    " and a large number as ",
    v(f.number),
    ".",
  ];
  if (f.calendar) parts.push(" Your calendar is ", v(CALENDARS[f.calendar] ?? f.calendar), ".");
  return { ...base, parts, status: "read", stable: [f.locale, f.calendar, f.date, f.time, f.number].join("|") };
}
