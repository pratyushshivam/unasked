// Motion: smooth scrolling, the opening count, reveals, the kinetic headline, the cursor.
// Every library is bundled with the page; nothing is fetched from anywhere.

import gsap from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { byId, reducedMotion } from "./dom";

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

const finePointer = (): boolean => matchMedia("(hover: hover) and (pointer: fine)").matches;
const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/";

/** Smooth scrolling, kept in step with ScrollTrigger. Links to places on the page glide there. */
export function startScroll(): void {
  let lenis: Lenis | null = null;
  if (!reducedMotion()) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 0.95 });
    lenis.on("scroll", ScrollTrigger.update);
    const active = lenis;
    gsap.ticker.add((t) => active.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  document.addEventListener("click", (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    const target = link ? document.querySelector<HTMLElement>(link.getAttribute("href") ?? "") : null;
    if (!target) return;
    event.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: -40, duration: 1.6 });
    else target.scrollIntoView();
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });
}

export interface Opening {
  progress(done: number, of: number): void;
  finish(): Promise<void>;
}

/** The opening: a count of what has been read so far, over paper, then the sheet lifts. */
export function startOpening(): Opening {
  const sheet = byId("pre");
  const count = byId("pre-count");
  const bar = byId("pre-bar");
  const rows = sheet.querySelectorAll(".pre__row > span");
  const state = { shown: 0, target: 0, total: 1 };
  document.documentElement.classList.add("is-locked");
  gsap.from(rows, { yPercent: 110, duration: 0.7, stagger: 0.06, ease: "power3.out" });
  const render = (): void => {
    count.textContent = String(Math.round(state.shown)).padStart(2, "0");
    gsap.set(bar, { scaleX: state.shown / state.total });
  };
  return {
    progress(done, of) {
      state.total = of;
      state.target = done;
      gsap.to(state, { shown: done, duration: 0.5, ease: "power2.out", onUpdate: render, overwrite: true });
    },
    finish() {
      return new Promise((resolve) => {
        gsap
          .timeline({
            onComplete: () => {
              sheet.style.display = "none";
            },
          })
          // The count always runs to the end, however fast the browser answered.
          .to(state, { shown: state.total, duration: 0.75, ease: "power2.inOut", onUpdate: render, overwrite: true })
          .to(rows, { yPercent: -110, duration: 0.55, stagger: 0.05, ease: "expo.in" }, "+=0.12")
          .add(() => {
            document.documentElement.classList.remove("is-locked");
            resolve();
          }, "-=0.15")
          .to(sheet, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.9, ease: "expo.inOut" }, "-=0.2");
      });
    },
  };
}

/** The headline: letters rise in from thin to heavy, then lean toward the pointer. */
export function startHeadline(): void {
  const title = byId("hero-title");
  if (reducedMotion()) return;
  SplitText.create(title, {
    type: "lines,chars",
    linesClass: "kline",
    charsClass: "kch",
    aria: "auto",
    onSplit(self) {
      const chars = self.chars as HTMLElement[];
      gsap.fromTo(chars, { "--w": 100, opacity: 0, yPercent: 60 }, {
        "--w": 600,
        opacity: 1,
        yPercent: 0,
        duration: 1.3,
        ease: "expo.out",
        stagger: { each: 0.022, from: "start" },
      });
      if (!finePointer()) return;
      // Each letter grows heavier the nearer the pointer is to it.
      const weights = chars.map(() => 600);
      let px = -9999;
      let py = -9999;
      let live = false;
      window.addEventListener(
        "pointermove",
        (event) => {
          px = event.clientX;
          py = event.clientY;
          live = true;
        },
        { passive: true },
      );
      gsap.ticker.add(() => {
        if (!live || title.getBoundingClientRect().bottom < 0) return;
        let moving = false;
        chars.forEach((char, i) => {
          const box = char.getBoundingClientRect();
          const distance = Math.hypot(px - (box.left + box.width / 2), py - (box.top + box.height / 2));
          const target = 560 + 340 * Math.max(0, 1 - distance / 300) ** 1.6;
          const now = weights[i] ?? 600;
          const next = now + (target - now) * 0.14;
          if (Math.abs(next - now) > 0.4) {
            weights[i] = next;
            char.style.setProperty("--w", next.toFixed(0));
            moving = true;
          }
        });
        live = moving;
      });
    },
  });
}

/**
 * The reveal vocabulary, by data attribute:
 *   data-lines     text rises line by line from behind a mask
 *   data-rise      a block rises and fades in
 *   data-kinetic   a heading whose letters gain weight as it is scrolled into place
 */
export function startReveals(root: ParentNode = document): void {
  if (reducedMotion()) return;
  root.querySelectorAll<HTMLElement>("[data-lines]").forEach((el) => {
    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      autoSplit: true,
      aria: "auto",
      onSplit(self) {
        return gsap.from(self.lines, {
          yPercent: 115,
          duration: 1.2,
          stagger: 0.085,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        });
      },
    });
  });
  root.querySelectorAll<HTMLElement>("[data-rise]").forEach((el) => {
    gsap.from(el, {
      y: 40,
      opacity: 0,
      duration: 1.1,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 92%", once: true },
    });
  });
  root.querySelectorAll<HTMLElement>("[data-kinetic]").forEach((el) => {
    SplitText.create(el, {
      type: "words,chars",
      charsClass: "kch",
      aria: "auto",
      onSplit(self) {
        const chars = self.chars as HTMLElement[];
        gsap.set(chars, { "--w": 100, opacity: 0.1, yPercent: 24 });
        return gsap.to(chars, {
          "--w": 600,
          opacity: 1,
          yPercent: 0,
          ease: "power2.out",
          stagger: { each: 0.03, from: "start" },
          scrollTrigger: { trigger: el, start: "top 94%", end: "top 48%", scrub: 0.9 },
        });
      },
    });
  });
}

/** A value arrives as noise and settles into what the browser said. */
export function decode(el: HTMLElement, delay = 0): void {
  if (reducedMotion()) return;
  const text = el.textContent ?? "";
  if (!text || el.children.length > 0) return;
  gsap.to(el, {
    duration: Math.min(1.3, 0.5 + text.length * 0.03),
    delay,
    ease: "none",
    scrambleText: { text, chars: GLYPHS, speed: 0.7, revealDelay: 0.12 },
  });
}

/** Lines of the file rise in as they are reached, and their values decode. */
export function revealLines(lines: HTMLElement[], onShown: (line: HTMLElement) => void): void {
  if (reducedMotion()) {
    lines.forEach(onShown);
    return;
  }
  gsap.set(lines, { opacity: 0, y: 30 });
  ScrollTrigger.batch(lines, {
    start: "top 93%",
    once: true,
    onEnter: (batch) => {
      gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, stagger: 0.09, ease: "power3.out", clearProps: "transform" });
      (batch as HTMLElement[]).forEach((line, i) => {
        line.querySelectorAll<HTMLElement>(".line__front .val").forEach((value) => decode(value, i * 0.09 + 0.1));
        gsap.delayedCall(i * 0.09 + 0.25, () => onShown(line));
      });
    },
  });
}

/** The page turns from paper to ink and back as its sections pass the middle of the window. */
export function startThemes(): void {
  const set = (theme: string | undefined): void => {
    document.documentElement.classList.toggle("theme-ink", theme === "ink");
  };
  document.querySelectorAll<HTMLElement>("[data-theme]").forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: "top 55%",
      end: "bottom 55%",
      onToggle: (self) => {
        if (self.isActive) set(section.dataset.theme);
      },
    });
  });
}

/** A small dot that trails the pointer and opens into a labelled disc over things that can be pressed. */
export function startCursor(): void {
  if (reducedMotion() || !finePointer()) return;
  const dot = byId("cursor");
  const label = dot.querySelector("span");
  document.documentElement.classList.add("has-cursor");
  const xTo = gsap.quickTo(dot, "x", { duration: 0.45, ease: "power3.out" });
  const yTo = gsap.quickTo(dot, "y", { duration: 0.45, ease: "power3.out" });
  let shown = false;
  window.addEventListener(
    "pointermove",
    (event) => {
      if (!shown) {
        shown = true;
        gsap.set(dot, { x: event.clientX, y: event.clientY });
        gsap.to(dot, { autoAlpha: 1, duration: 0.3 });
      }
      xTo(event.clientX);
      yTo(event.clientY);
    },
    { passive: true },
  );
  window.addEventListener(
    "pointerover",
    (event) => {
      const target = (event.target as Element).closest<HTMLElement>("[data-cursor], a, button, input");
      const text = target?.dataset.cursor;
      dot.classList.toggle("is-label", Boolean(text));
      dot.classList.toggle("is-link", Boolean(target) && !text);
      if (text && label) label.textContent = text;
    },
    { passive: true },
  );
  document.documentElement.addEventListener("pointerleave", () => {
    shown = false;
    gsap.to(dot, { autoAlpha: 0, duration: 0.2 });
  });
}

/** Buttons marked magnetic lean toward the pointer and spring back. */
export function startMagnets(): void {
  if (reducedMotion() || !finePointer()) return;
  document.querySelectorAll<HTMLElement>(".magnetic").forEach((el) => {
    const xTo = gsap.quickTo(el, "x", { duration: 0.9, ease: "elastic.out(1, 0.4)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.9, ease: "elastic.out(1, 0.4)" });
    el.addEventListener("pointermove", (event) => {
      const box = el.getBoundingClientRect();
      xTo((event.clientX - (box.left + box.width / 2)) * 0.3);
      yTo((event.clientY - (box.top + box.height / 2)) * 0.3);
    });
    el.addEventListener("pointerleave", () => {
      xTo(0);
      yTo(0);
    });
  });
}

export const refresh = (): void => ScrollTrigger.refresh();
