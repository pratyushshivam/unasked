// Draws the mark and plays the ending: every signal travels to the centre and becomes a ring.

import { type Ring, arcPath, buildRings, fallbackDigest } from "../mark";
import type { Summary } from "../profile";
import { grouped } from "../signals/canvas";
import type { Finding } from "../signals/types";
import { byId, el, onceVisible, reducedMotion, svg, wait } from "./dom";

async function digest(input: string): Promise<{ hex: string; sha: boolean }> {
  // SHA-256 from the browser itself. It needs a secure page; anywhere else a simpler hash stands in.
  if (globalThis.crypto?.subtle) {
    try {
      const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
      const hex = [...bytes.slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("");
      return { hex, sha: true };
    } catch {
      /* fall through */
    }
  }
  return { hex: fallbackDigest(input), sha: false };
}

function drawRing(ring: Ring): { group: SVGGElement; path: SVGPathElement } {
  const group = svg("g", { class: ring.direction === 1 ? "spin" : "spin spin--back" });
  group.style.setProperty("--period", String(ring.period));
  const path = svg("path", { class: `ring ring--${ring.kind}`, d: arcPath(ring.r, ring.start, ring.sweep) });
  if (ring.kind !== "refused") path.setAttribute("pathLength", "1");
  group.append(path);
  return { group, path };
}

export function buildMark(findings: Finding[], summary: Summary): void {
  const figure = byId<SVGSVGElement>("mark-svg");
  const holder = byId("mark");
  const dots = byId("mark-dots");
  const hashLine = byId("mark-hash");
  const note = byId("mark-note");
  const rings = buildRings(findings, { inner: 30, outer: 236 });
  const half = Math.ceil(findings.length / 2);

  const title = svg("title");
  title.textContent = `A mark of ${findings.length} concentric rings, one for each thing this page read from your browser.`;
  figure.append(title);
  const core = svg("circle", { class: "core", r: 9 });
  figure.append(core);

  const paths: SVGPathElement[] = [];
  const labels: HTMLElement[] = [];
  rings.forEach((ring, i) => {
    const { group, path } = drawRing(ring);
    figure.append(group);
    paths.push(path);
    const finding = findings[i];
    const item = el("li");
    item.dataset.kind = ring.kind;
    const number = el("i", undefined, String(i + 1).padStart(2, "0"));
    const name = el("span", undefined, finding?.label ?? ring.id);
    // Left column reads "name 01", right column "01 name", so the numbers face the mark.
    if (i < half) item.append(name, number);
    else item.append(number, name);
    byId(i < half ? "legend-a" : "legend-b").append(item);
    labels.push(item);
  });

  const digestReady = digest(summary.canonical);

  const writeNote = (sha: boolean): void => {
    note.textContent = sha
      ? `The first 64 of 256 bits of a SHA-256 hash of your ${summary.steady} steady answers, worked out here and shown only here. Reload and it should stay the same. If it changes, your browser is adding noise, which is protection at work.`
      : `A 64-bit hash of your ${summary.steady} steady answers, worked out here and shown only here. Reload and it should stay the same. If it changes, your browser is adding noise, which is protection at work.`;
    note.classList.add("is-on");
  };

  const play = async (): Promise<void> => {
    const { hex, sha } = await digestReady;
    const shown = grouped(hex);
    if (reducedMotion()) {
      paths.forEach((path) => path.classList.add("is-drawn"));
      labels.forEach((label) => label.classList.add("is-sent"));
      figure.classList.add("is-live");
      hashLine.textContent = shown;
      writeNote(sha);
      return;
    }
    const frame = holder.getBoundingClientRect();
    const centre = figure.getBoundingClientRect();
    const cx = centre.left + centre.width / 2 - frame.left;
    const cy = centre.top + centre.height / 2 - frame.top;
    const flights = labels.map(async (label, i) => {
      await wait(i * 120);
      const number = label.querySelector("i") ?? label;
      const from = number.getBoundingClientRect();
      const x = from.left + from.width / 2 - frame.left;
      const y = from.top + from.height / 2 - frame.top;
      const dot = el("i");
      dots.append(dot);
      label.classList.add("is-sent");
      // A shallow curve: the dot leaves sideways, then falls into the centre.
      const midX = x + (cx - x) * 0.55;
      const midY = y + (cy - y) * 0.15;
      await dot.animate(
        [
          { transform: `translate(${x}px, ${y}px) scale(0.2)`, opacity: 0 },
          { transform: `translate(${midX}px, ${midY}px) scale(1.25)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${cx}px, ${cy}px) scale(0.5)`, opacity: 1 },
        ],
        { duration: 900, easing: "cubic-bezier(0.6, 0, 0.2, 1)", fill: "forwards" },
      ).finished;
      dot.remove();
      paths[i]?.classList.add("is-drawn");
    });
    await Promise.all(flights);
    figure.classList.add("is-live");
    await wait(350);
    for (let i = 1; i <= shown.length; i++) {
      hashLine.textContent = shown.slice(0, i);
      await wait(45);
    }
    writeNote(sha);
  };

  onceVisible(figure, () => void play(), 0.45);
}
