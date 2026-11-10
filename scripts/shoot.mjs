// Opens the built page in a real browser and checks what it does.
//   node scripts/shoot.mjs [url]
// Needs a Chrome or Edge on the machine (playwright-core drives it; nothing is downloaded).
//
// It reads the whole page at desktop size, phone size and with reduced motion, turns a line over by
// mouse and by keyboard, and fails if the page makes any request after it has loaded, logs an error,
// or scrolls sideways. A fourth visit presses the address button, with the outside service replaced
// by a stand-in, and fails unless that is the one and only request that leaves.

import { chromium } from "playwright-core";

const url = process.argv[2] ?? "http://localhost:4621/";
const origin = new URL(url).origin;
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? "chrome", headless: true });

// 203.0.113.0/24 is reserved for documentation. It is nobody's address.
const SAMPLE = { ip: "203.0.113.7", city: "Lisbon", region: "Lisbon", country: "PT", org: "AS64500 Example Net", timezone: "Europe/Lisbon" };

async function visit(name, viewport, { mobile = false, reduced = false, ask = false } = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: mobile ? 2 : 1,
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
  await page.route("https://ipinfo.io/**", (route) =>
    route.fulfill({ json: SAMPLE, headers: { "access-control-allow-origin": "*" } }),
  );

  await page.goto(url, { waitUntil: "load" });
  const loadedAt = Date.now();
  await page.waitForTimeout(reduced ? 800 : 3600);

  // Read the whole page at a reader's pace.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += Math.round(viewport.height * 0.7)) {
    await page.evaluate((top) => scrollTo({ top, behavior: "instant" }), y);
    await page.waitForTimeout(reduced ? 60 : 650);
  }

  // Turn a line over with the pointer, and another with the keyboard.
  const third = page.locator(".line__front").nth(2);
  await third.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await third.click();
  await page.waitForTimeout(1100);
  const turnedByClick = await page.locator(".line").nth(2).evaluate((el) => el.classList.contains("is-turned"));
  await page.locator(".line__front").nth(4).focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1100);
  const turnedByKey = await page.evaluate(() => document.activeElement?.classList.contains("line__back") ?? false);

  // Type in the box: the page must count keys, and must not keep them.
  await page.locator("#type-box").scrollIntoViewIfNeeded();
  await page.locator("#type-box").pressSequentially("nothing", { delay: 70 });
  await page.waitForTimeout(400);
  const keys = await page.locator("#type-tiles dd").first().innerText();

  let asked = null;
  if (ask) {
    await page.locator("#ask-button").scrollIntoViewIfNeeded();
    await page.locator("#ask-button").click();
    await page.waitForTimeout(2200);
    asked = await page.locator("#ask-answer").innerText();
  }

  await page.locator("#mark-svg").scrollIntoViewIfNeeded();
  await page.waitForTimeout(reduced ? 400 : 5500);

  const outside = requests.filter((r) => !r.url.startsWith(origin)).map((r) => r.url);
  const report = {
    name,
    files: requests.filter((r) => r.url.startsWith(origin)).map((r) => r.url.replace(url, "/")),
    // The tab icon is fetched by the browser itself just after load; anything later would be the page's doing.
    afterLoad: requests.filter((r) => r.at > loadedAt + 2000 && r.url.startsWith(origin)).map((r) => r.url),
    outside,
    problems,
    overflow: await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    lines: await page.locator(".line").count(),
    shown: await page.locator("#bar-count").innerText(),
    mark: await page.locator("#mark-hash").innerText(),
    since: await page.locator("#receipt-since").innerText(),
    known: await page.locator("#known-headline").innerText(),
    stored: await page.evaluate(() => Object.keys(localStorage)),
    cookies: (await context.cookies()).length,
    turnedByClick,
    turnedByKey,
    keys,
    asked,
  };
  await context.close();
  return report;
}

const reports = [
  await visit("desktop", { width: 1440, height: 900 }),
  await visit("phone", { width: 390, height: 844 }, { mobile: true }),
  await visit("reduced motion", { width: 1440, height: 900 }, { reduced: true }),
  await visit("address asked for", { width: 1440, height: 900 }, { ask: true }),
];
await browser.close();

let failed = false;
const check = (ok, message) => {
  if (!ok) failed = true;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${message}`);
};
for (const r of reports) {
  const asking = r.asked !== null;
  console.log(`\n== ${r.name}`);
  console.log(`  files: ${r.files.join("  ")}`);
  check(r.afterLoad.length === 0, `requests to its own host after loading: ${r.afterLoad.length}`);
  check(
    asking ? r.outside.length === 1 && r.outside[0] === "https://ipinfo.io/json" : r.outside.length === 0,
    `requests to anyone else: ${r.outside.length}${asking ? " (the one lookup that was asked for)" : ""}`,
  );
  check(r.since === (asking ? "1" : "0"), `the page's own count of late requests: ${r.since}`);
  check(r.problems.length === 0, `console errors and warnings: ${r.problems.length} ${r.problems.join(" | ")}`);
  check(r.overflow <= 0, `sideways overflow: ${r.overflow}px`);
  check(r.lines === 41 && r.shown === "41 / 41", `lines written: ${r.lines}, shown: ${r.shown}`);
  check(/^[0-9a-f]{4}( [0-9a-f]{4}){3}$/.test(r.mark), `mark: ${r.mark}`);
  check(r.turnedByClick && r.turnedByKey, `a line turns over by pointer (${r.turnedByClick}) and by keyboard (${r.turnedByKey})`);
  check(r.keys === "7", `keys counted in the typing box: ${r.keys}`);
  check(r.cookies === 0 && r.stored.join() === "unasked:note", `kept on the device: ${r.cookies} cookies, storage keys [${r.stored.join(", ")}]`);
  check(r.known.includes("not seen this browser"), `first visit: "${r.known}"`);
  if (asking) check(r.asked.includes("203.0.113.7") && r.asked.includes("Example Net"), "the stand-in answer is shown");
}
console.log(failed ? "\nFAILED" : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
