import { collect } from "./collect";
import { buildProfile, summarise } from "./profile";
import { byId, reducedMotion } from "./ui/dom";
import { buildBits, buildReceipt, buildStats, revealOnScroll } from "./ui/extras";
import { buildLine } from "./ui/lines";
import { buildMark } from "./ui/markView";
import { type Typed, prepare, run } from "./ui/typer";

async function write(): Promise<void> {
  // The date on the letterhead is already something the browser gave away: your clock, in your format.
  const roomy = innerWidth > 720;
  byId("dateline").textContent = new Date().toLocaleDateString(undefined, {
    weekday: roomy ? "long" : undefined,
    day: "numeric",
    month: roomy ? "long" : "short",
    year: "numeric",
  });

  const salute = byId("salute");
  const greeting = salute.textContent ?? "";
  salute.textContent = "";
  const opening = prepare(salute, [greeting]);
  salute.setAttribute("aria-label", greeting);

  const findings = buildProfile(await collect());
  const summary = summarise(findings);

  const list = byId("lines");
  const ring = byId<SVGCircleElement>("bar-ring");
  const count = byId("bar-count");
  const hint = byId("hint");
  let written = 0;
  const total = String(findings.length).padStart(2, "0");
  count.textContent = `00 / ${total}`;

  const queue: Typed[] = [opening];
  findings.forEach((finding, i) => {
    const { node, typed } = buildLine(i, finding);
    typed.onStart = () => node.classList.add("is-on");
    typed.onDone = () => {
      written++;
      count.textContent = `${String(written).padStart(2, "0")} / ${total}`;
      ring.style.strokeDashoffset = String(100 - (written / findings.length) * 100);
      if (written === 1) hint.classList.add("is-on");
    };
    list.append(node);
    queue.push(typed);
  });

  buildStats(summary);
  buildBits();
  buildMark(findings, summary);
  buildReceipt();
  revealOnScroll();

  // Give the headline its moment, then start writing.
  const instant = reducedMotion();
  setTimeout(() => run(queue, instant), instant ? 0 : 900);
}

void write();
