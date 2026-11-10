// Takes the pictures used in the README and the social preview image from the built page.
//   node scripts/readme-shots.mjs [url]
// The browser is given a neutral time zone and language, and the machine it runs on is an ordinary
// laptop, so the answers in the pictures are generic ones.

import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
import sharp from "sharp";

const url = process.argv[2] ?? "http://localhost:4621/";
mkdirSync("assets/screens", { recursive: true });

const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL ?? "chrome",
  // Without this the browser tells every page it is being automated, and the letter would say so.
  args: ["--disable-blink-features=AutomationControlled"],
});

const open = async (viewport, mobile = false) => {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    locale: "en-GB",
    timezoneId: "Europe/London",
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "load" });
  return page;
};
const jpg = async (page, name) =>
  sharp(await page.screenshot()).jpeg({ quality: 88, mozjpeg: true }).toFile(`assets/screens/${name}.jpg`);
const to = (page, selector, block = "start") =>
  page.evaluate(([s, b]) => document.querySelector(s).scrollIntoView({ block: b, behavior: "instant" }), [selector, block]);
const readAll = async (page, step) => {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += step) {
    await page.evaluate((top) => scrollTo({ top, behavior: "instant" }), y);
    await page.waitForTimeout(1300);
  }
};

// ---- desktop stills
{
  const page = await open({ width: 1440, height: 900 });
  await page.waitForTimeout(2500);
  await jpg(page, "top");
  await sharp(await page.screenshot({ clip: { x: 0, y: 54, width: 1440, height: 756 } }))
    .resize(1200, 630)
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile("public/og.jpg");
  await to(page, ".letter__head");
  await page.evaluate(() => scrollBy(0, -90));
  await page.waitForTimeout(7000);
  await page.locator(".line__front").nth(2).click();
  await page.mouse.move(700, 880);
  await page.waitForTimeout(1400);
  await jpg(page, "letter");
  await readAll(page, 540);
  await to(page, "#mark-svg", "center");
  await page.waitForTimeout(7000);
  await jpg(page, "mark");
  await to(page, "#proof");
  await page.waitForTimeout(1500);
  await jpg(page, "proof");
  await page.context().close();
}

// ---- phone stills
{
  const page = await open({ width: 390, height: 844 }, true);
  await page.waitForTimeout(2500);
  await jpg(page, "phone-top");
  await to(page, ".letter__head");
  await page.evaluate(() => scrollBy(0, -70));
  await page.waitForTimeout(5000);
  await page.locator(".line__front").nth(1).tap();
  await page.waitForTimeout(1400);
  await jpg(page, "phone-letter");
  await readAll(page, 500);
  await to(page, "#mark-svg", "center");
  await page.evaluate(() => scrollBy(0, 90));
  await page.waitForTimeout(7000);
  await jpg(page, "phone-mark");
  await page.context().close();
}

// ---- a short film: the letter being typed, a card turning, the signals converging
{
  const page = await open({ width: 1000, height: 620 });
  const frames = [];
  const delays = [];
  const film = async (ms) => {
    const end = Date.now() + ms;
    let last = Date.now();
    while (Date.now() < end) {
      frames.push(await page.screenshot());
      const now = Date.now();
      delays.push(now - last);
      last = now;
    }
  };
  await page.waitForTimeout(700);
  await to(page, ".letter__head");
  await page.evaluate(() => scrollBy(0, -80));
  await film(4600);
  await page.locator(".line__front").nth(1).click();
  await film(1900);
  await page.locator(".line__back").nth(1).click();
  await film(900);
  await readAll(page, 600);
  await to(page, "#mark-svg", "center");
  await page.evaluate(() => scrollBy(0, 40));
  await film(6200);
  delays.push(delays.shift());
  delays[delays.length - 1] = 2500;
  const small = await Promise.all(frames.map((frame) => sharp(frame).resize(800).toBuffer()));
  await sharp(small, { join: { animated: true } })
    .gif({ delay: delays.map((d) => Math.max(20, Math.round(d))), colours: 48, effort: 8, interFrameMaxError: 6 })
    .toFile("assets/screens/letter.gif");
  console.log(`film: ${frames.length} frames`);
  await page.context().close();
}

await browser.close();
