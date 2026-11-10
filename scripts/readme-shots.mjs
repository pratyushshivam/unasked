// Takes the pictures used in the README and the social preview image from the built page.
//   node scripts/readme-shots.mjs [url]
//
// The browser is given a neutral time zone and language, and the machine it runs on is an ordinary
// laptop, so the answers in the pictures are generic ones. The address lookup is answered by a
// stand-in with a documentation address (203.0.113.7): no real address is shown and none is fetched.

import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
import sharp from "sharp";

const url = process.argv[2] ?? "http://localhost:4621/";
mkdirSync("assets/screens", { recursive: true });

const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL ?? "chrome",
  // Without this the browser tells every page it is being automated, and the file would say so.
  args: ["--disable-blink-features=AutomationControlled"],
});
const userAgent = (await (await browser.newPage()).evaluate(() => navigator.userAgent)).replace("HeadlessChrome", "Chrome");

const open = async (viewport, mobile = false) => {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    locale: "en-GB",
    timezoneId: "Europe/London",
    userAgent: mobile ? undefined : userAgent,
  });
  const page = await context.newPage();
  await page.route("https://ipinfo.io/**", (route) =>
    route.fulfill({
      json: { ip: "203.0.113.7", city: "Lisbon", region: "Lisbon", country: "PT", org: "AS64500 Example Net", timezone: "Europe/Lisbon" },
      headers: { "access-control-allow-origin": "*" },
    }),
  );
  await page.goto(url, { waitUntil: "load" });
  return page;
};
const jpg = async (page, name) =>
  sharp(await page.screenshot()).jpeg({ quality: 88, mozjpeg: true }).toFile(`assets/screens/${name}.jpg`);
const to = async (page, selector, offset = 0, settle = 1800) => {
  await page.evaluate(
    ([s, o]) => scrollTo({ top: document.querySelector(s).getBoundingClientRect().top + scrollY + o, behavior: "instant" }),
    [selector, offset],
  );
  await page.waitForTimeout(settle);
};
const readAll = async (page, step) => {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += step) {
    await page.evaluate((top) => scrollTo({ top, behavior: "instant" }), y);
    await page.waitForTimeout(500);
  }
};

// ---- desktop stills
{
  const page = await open({ width: 1440, height: 900 });
  await page.waitForTimeout(900);
  await jpg(page, "opening");
  await page.waitForTimeout(3600);
  await page.mouse.move(420, 300, { steps: 20 });
  await page.waitForTimeout(900);
  await jpg(page, "top");
  await sharp(await page.screenshot({ clip: { x: 0, y: 54, width: 1440, height: 756 } }))
    .resize(1200, 630)
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile("public/og.jpg");
  await readAll(page, 600);

  await to(page, "#machine .lines", -230);
  await page.locator(".line__front").nth(2).click();
  await page.mouse.move(1380, 860);
  await page.waitForTimeout(1400);
  await jpg(page, "chapter");

  await to(page, "#senses", -20);
  await page.mouse.move(980, 250, { steps: 10 });
  await page.waitForTimeout(700);
  await jpg(page, "ink");

  await to(page, ".live__grid", -100);
  for (const [x, y] of [[300, 300], [520, 560], [820, 380], [1040, 640], [760, 240], [420, 460], [980, 320], [620, 600], [330, 520]]) {
    await page.mouse.move(x, y, { steps: 26 });
  }
  await page.waitForTimeout(500);
  await jpg(page, "live");

  await to(page, ".ask__body", -330);
  await page.locator("#ask-button").click();
  await page.mouse.move(1380, 860);
  await page.waitForTimeout(2600);
  await jpg(page, "ask");

  await to(page, "#mark", -120, 7500);
  await page.mouse.move(1380, 120);
  await page.waitForTimeout(600);
  await jpg(page, "mark");
  await page.context().close();
}

// ---- phone stills
{
  const page = await open({ width: 390, height: 844 }, true);
  await page.waitForTimeout(4600);
  await jpg(page, "phone-top");
  await readAll(page, 600);
  await to(page, "#machine .lines", -80);
  await page.locator(".line__front").nth(1).tap();
  await page.waitForTimeout(1400);
  await jpg(page, "phone-chapter");
  await to(page, "#tiles", -90);
  await jpg(page, "phone-live");
  await to(page, "#mark", -70, 7500);
  await jpg(page, "phone-mark");
  await page.context().close();
}

await browser.close();
console.log("wrote assets/screens/*.jpg and public/og.jpg");
