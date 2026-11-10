// The smaller moving parts: the counted figures, the 33 bits, the fetch record, the scroll reveals.

import type { Summary } from "../profile";
import { byId, el, onceVisible, reducedMotion, wait } from "./dom";

export function buildStats(summary: Summary): void {
  const rows: [number, string][] = [
    [summary.asked, "things I looked for"],
    [summary.answered, "your browser answered"],
    [summary.refused, "it kept back"],
    [summary.steady, "hold still between visits, and make the mark"],
  ];
  const list = byId("stats");
  rows.forEach(([value, label], i) => {
    const row = el("div", "rv");
    row.style.setProperty("--d", `${i * 90}ms`);
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
    const file = isPage ? "this page" : (new URL(entry.name).pathname.split("/").pop() ?? entry.name);
    const row = el("li");
    row.append(el("span", undefined, file), el("span", undefined, kilobytes(timing.decodedBodySize ?? 0) || "cached"));
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

/** Headings and blocks rise into place the first time they are scrolled to. */
export function revealOnScroll(): void {
  const targets = document.querySelectorAll<HTMLElement>(
    ".sum h2, .sum__lede, .cols > div, .steps li, .do h2, .proof h2, .bits, .key, .ps, .sign",
  );
  targets.forEach((target) => {
    target.classList.add("rv");
    onceVisible(target, () => target.classList.add("is-in"), 0.15);
  });
  document.querySelectorAll<HTMLElement>(".stats .rv").forEach((row) => onceVisible(row, () => row.classList.add("is-in"), 0.15));
}
