import { READERS, collect } from "./collect";
import { allFindings, buildDossier, summarise } from "./profile";
import { byId, reducedMotion } from "./ui/dom";
import { buildAsk, buildBits, buildKnown, buildReceipt, buildStats } from "./ui/extras";
import { buildChapters } from "./ui/lines";
import { startLive } from "./ui/live";
import { buildMark } from "./ui/markView";
import {
  refresh,
  revealLines,
  startCursor,
  startHeadline,
  startMagnets,
  startOpening,
  startReveals,
  startScroll,
  startThemes,
} from "./ui/motion";
import { startScene } from "./ui/scene";

async function open(): Promise<void> {
  const calm = reducedMotion();
  if (calm) document.documentElement.classList.add("no-motion");
  const opening = calm ? null : startOpening();

  // The date on the letterhead is already something the browser gave away: your clock, in your format.
  const roomy = innerWidth > 720;
  byId("dateline").textContent = new Date().toLocaleDateString(undefined, {
    weekday: roomy ? "long" : undefined,
    day: "numeric",
    month: roomy ? "long" : "short",
    year: "numeric",
  });

  startScene(byId<HTMLCanvasElement>("scene"));
  startLive();

  const snapshot = await collect((done) => opening?.progress(done, READERS));
  const chapters = buildDossier(snapshot);
  const findings = allFindings(chapters);
  const summary = summarise(findings);

  const lines = buildChapters(chapters, byId("chapters"), byId("toc"));
  buildStats(summary);
  buildBits();
  buildReceipt();
  buildAsk(snapshot.time.zone);
  void buildMark(findings, summary).then(({ hex }) => buildKnown(hex));

  // The bar counts the lines as they are shown.
  const ring = byId<SVGCircleElement>("bar-ring");
  const count = byId("bar-count");
  const total = String(findings.length).padStart(2, "0");
  let shown = 0;
  count.textContent = `00 / ${total}`;
  const onShown = (): void => {
    shown++;
    count.textContent = `${String(shown).padStart(2, "0")} / ${total}`;
    ring.style.strokeDashoffset = String(100 - (shown / findings.length) * 100);
  };

  // Text is split into lines for the reveals, so the typeface has to be in place first.
  await document.fonts.ready;
  startScroll();
  startThemes();
  startReveals();
  revealLines(lines, onShown);
  startCursor();
  startMagnets();
  refresh();

  await opening?.finish();
  startHeadline();
}

void open();
