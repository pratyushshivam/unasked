// Quick look at one part of the page: node scripts/peek.mjs <selector> <file> [width] [height]
import { chromium } from "playwright-core";
const [sel, file, w = "1440", h = "900"] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome" });
const mobile = Number(w) < 700;
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, locale: "en-GB", timezoneId: "Europe/London", reducedMotion: "reduce" });
const page = await ctx.newPage();
await page.goto(process.env.URL ?? "http://localhost:4621/");
await page.waitForTimeout(700);
await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: "start", behavior: "instant" }), sel);
await page.waitForTimeout(900);
await page.screenshot({ path: file });
await browser.close();
