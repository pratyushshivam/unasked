// Opens the built page in a real browser, checks what it does on the network and takes the screenshots.
//   node scripts/shoot.mjs [url] [outDir]
// Needs a Chrome or Edge on the machine (playwright-core drives it; nothing is downloaded).
// The browser is given a neutral time zone and language, so the pictures carry no one's settings.

import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const url = process.argv[2] ?? "http://localhost:4621/";
const out = process.argv[3] ?? "shots";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? "chrome", headless: true });

async function visit(name, viewport, { mobile = false, reduced = false } = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: mobile ? 3 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    locale: "en-GB",
    timezoneId: "Europe/London",
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  const requests = [];
  const problems = [];
  page.on("request", (r) => requests.push({ url: r.url(), at: Date.now() }));
  page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && problems.push(m.text()));
  page.on("pageerror", (e) => problems.push(String(e)));

  await page.goto(url, { waitUntil: "load" });
  const loadedAt = Date.now();
  await page.waitForTimeout(reduced ? 600 : 5200);
  await page.screenshot({ path: `${out}/${name}-top.png` });

  // Turn the third line over.
  const third = page.locator(".line__front").nth(2);
  await third.scrollIntoViewIfNeeded();
  await page.waitForTimeout(reduced ? 100 : 2500);
  await third.click();
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${out}/${name}-turned.png` });

  // Read the whole letter at a reader's pace, then watch the ending.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += Math.round(viewport.height * 0.6)) {
    await page.evaluate((top) => scrollTo({ top, behavior: "instant" }), y);
    await page.waitForTimeout(reduced ? 60 : 1500);
  }
  await page.locator("#mark-svg").scrollIntoViewIfNeeded();
  await page.evaluate(() => document.querySelector("#mark-svg").scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(reduced ? 300 : 6500);
  await page.screenshot({ path: `${out}/${name}-mark.png` });
  await page.evaluate(() => document.querySelector("#proof").scrollIntoView({ block: "start", behavior: "instant" }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${name}-proof.png` });
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${name}-full.png`, fullPage: true });

  const lines = await page.locator(".line__text").allInnerTexts();
  const report = {
    name,
    requests: requests.map((r) => r.url.replace(url, "/")),
    // The tab icon is fetched by the browser itself just after load; anything later than that would be the page's doing.
    afterLoad: requests.filter((r) => r.at > loadedAt + 2000).map((r) => r.url),
    problems,
    overflow: await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    hash: await page.locator("#mark-hash").innerText(),
    since: await page.locator("#receipt-since").innerText(),
    lines,
  };
  await context.close();
  return report;
}

const reports = [
  await visit("desktop", { width: 1440, height: 900 }),
  await visit("phone", { width: 390, height: 844 }, { mobile: true }),
  await visit("reduced", { width: 1440, height: 900 }, { reduced: true }),
];
await browser.close();

let failed = false;
for (const r of reports) {
  console.log(`\n== ${r.name}`);
  console.log(`requests: ${r.requests.join("  ")}`);
  console.log(`after load: ${r.afterLoad.length}   page's own count: ${r.since}   sideways overflow: ${r.overflow}px`);
  console.log(`mark: ${r.hash}`);
  if (r.problems.length) console.log(`console: ${r.problems.join(" | ")}`);
  if (r.name === "desktop") r.lines.forEach((line, i) => console.log(`${String(i + 1).padStart(2, "0")} ${line}`));
  if (r.afterLoad.length || r.problems.length || r.overflow > 0 || r.since !== "0") failed = true;
}
process.exit(failed ? 1 : 0);
