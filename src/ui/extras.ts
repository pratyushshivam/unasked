// The smaller parts: the counted figures, the 33 bits, the fetch record, the address lookup, the note.

import { LOOKUP, LOOKUP_HOST, describeAddress, parseAddress } from "../address";
import type { Summary } from "../profile";
import { KEY, nextNote, parseNote, recognise } from "../recognise";
import type { Part } from "../signals/types";
import { byId, el, onceVisible, reducedMotion, wait } from "./dom";
import { decode } from "./motion";

/** Writes a sentence into an element, with the reported values marked. */
export function write(host: HTMLElement, parts: Part[]): void {
  host.replaceChildren(...parts.map((part) => (typeof part === "string" ? part : el("span", "val", part.v))));
}

export function buildStats(summary: Summary): void {
  const rows: [number, string][] = [
    [summary.asked, "things I looked for"],
    [summary.answered, "your browser answered"],
    [summary.refused, "it kept back"],
    [summary.steady, "hold still between visits, and make the mark"],
  ];
  const list = byId("stats");
  rows.forEach(([value, label], i) => {
    const row = el("div");
    row.dataset.rise = "";
    const figure = el("dd", undefined, reducedMotion() ? String(value) : "0");
    row.append(el("dt", undefined, label), figure);
    list.append(row);
    onceVisible(row, () => {
      if (reducedMotion()) return;
      const began = performance.now() + i * 90;
      const tick = (now: number): void => {
        const t = Math.min(1, Math.max(0, (now - began) / 1100));
        figure.textContent = String(Math.round(value * (1 - (1 - t) ** 4)));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  });
}

export function buildBits(): void {
  const row = byId("bits-row");
  const count = byId("bits-count");
  const people = byId("bits-people");
  const squares = Array.from({ length: 33 }, () => el("li"));
  row.append(...squares);
  const set = (n: number): void => {
    count.textContent = String(n);
    people.textContent = (2 ** n).toLocaleString("en-GB");
  };
  if (reducedMotion()) {
    squares.forEach((square) => square.classList.add("is-on"));
    return;
  }
  set(0);
  onceVisible(
    byId("bits"),
    async () => {
      for (let n = 1; n <= 33; n++) {
        squares[n - 1]?.classList.add("is-on");
        set(n);
        await wait(70);
      }
    },
    0.6,
  );
}

const kilobytes = (bytes: number): string => (bytes > 0 ? `${Math.max(1, Math.round(bytes / 1024))} kB` : "");

/** Lists what the browser says this page fetched, and keeps counting for as long as the page is open. */
export function buildReceipt(): void {
  const list = byId("receipt");
  const since = byId("receipt-since");
  const note = byId("receipt-note");
  if (!("PerformanceObserver" in window) || !performance.getEntriesByType) {
    note.textContent = "Your browser does not expose its fetch record to pages, so use the developer tools instead.";
    return;
  }
  const seen = new Set<string>();
  let late = 0;
  const loaded = (): number => {
    const [nav] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    return nav && nav.loadEventEnd > 0 ? nav.loadEventEnd : Number.POSITIVE_INFINITY;
  };
  const add = (entry: PerformanceEntry): void => {
    const key = `${entry.name}@${entry.startTime}`;
    if (seen.has(key)) return;
    seen.add(key);
    const timing = entry as PerformanceResourceTiming;
    const isPage = entry.entryType === "navigation";
    const address = new URL(entry.name);
    const outside = !isPage && address.host !== location.host;
    const row = el("li");
    if (outside) {
      row.className = "is-asked";
      row.append(el("span", undefined, address.host), el("span", undefined, "the lookup you asked for"));
    } else {
      const file = isPage ? "this page" : (address.pathname.split("/").pop() ?? entry.name);
      row.append(el("span", undefined, file), el("span", undefined, kilobytes(timing.decodedBodySize ?? 0) || "cached"));
    }
    list.append(row);
    if (!isPage && entry.startTime > loaded() + 1000) {
      late++;
      since.textContent = String(late);
    }
  };
  performance.getEntriesByType("navigation").forEach(add);
  performance.getEntriesByType("resource").forEach(add);
  new PerformanceObserver((entries) => entries.getEntries().forEach(add)).observe({ type: "resource", buffered: true });
  note.textContent =
    "Read from the Resource Timing record your browser keeps for every page. The list and the count update while the page is open.";
}

/** The one request this page can make, and only when asked. */
export function buildAsk(systemZone: string | null): void {
  const button = byId<HTMLButtonElement>("ask-button");
  const answer = byId("ask-answer");
  button.addEventListener("click", async () => {
    button.disabled = true;
    const label = button.querySelector("span");
    if (label) label.textContent = "Asking";
    const heading = el("p", "cap", `The one request you asked for, to ${LOOKUP_HOST}`);
    const lines = el("div", "ask__lines");
    try {
      // No cookies, no referrer: the service learns your address, as any site does, and nothing else.
      const reply = await fetch(LOOKUP, { credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store" });
      const address = parseAddress(await reply.json());
      if (!address) throw new Error("no address in the answer");
      for (const parts of describeAddress(address, systemZone)) {
        const line = el("p");
        write(line, parts);
        lines.append(line);
      }
      if (label) label.textContent = "Asked once";
    } catch {
      lines.append(
        el(
          "p",
          undefined,
          "The lookup did not answer. A content blocker or your network may have stopped it, which is no bad thing. Nothing was learned.",
        ),
      );
      if (label) label.textContent = "No answer";
    }
    answer.replaceChildren(heading, lines);
    lines.querySelectorAll<HTMLElement>(".val").forEach((value, i) => decode(value, i * 0.12));
  });
}

/** Shows what being recognised looks like, with a note kept only in this browser. */
export function buildKnown(mark: string): void {
  const headline = byId("known-headline");
  const detail = byId("known-detail");
  const note = byId("known-note");
  const erase = byId<HTMLButtonElement>("known-erase");
  let store: Storage | null = null;
  try {
    store = window.localStorage;
    const now = Date.now();
    const previous = parseNote(store.getItem(KEY));
    const seen = recognise(previous, mark, now);
    write(headline, seen.headline);
    write(detail, seen.detail);
    store.setItem(KEY, JSON.stringify(nextNote(previous, mark, now)));
    note.textContent =
      "Kept in this browser only, and never sent: your mark, the time of your first and latest visit, and a count. Under a hundred bytes.";
  } catch {
    store = null;
    headline.textContent = "I cannot leave myself a note.";
    detail.textContent =
      "Your browser gives this page nowhere to keep anything, so I cannot recognise you that way. Credit to it. Your mark, though, would still be the same next time.";
    erase.hidden = true;
  }
  erase.addEventListener("click", () => {
    try {
      store?.removeItem(KEY);
    } catch {
      /* nothing to erase */
    }
    headline.textContent = "Erased.";
    detail.textContent =
      "This browser now holds nothing from this page. Reload and I will greet you as a stranger. Your mark will be the same all the same, and a tracker that kept it on its own server would not have asked you first.";
    note.textContent = "Nothing is kept.";
    erase.disabled = true;
  });
}
