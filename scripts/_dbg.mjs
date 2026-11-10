import { chromium } from "playwright-core";
const [w = "1440", h = "900"] = process.argv.slice(2);
const mobile = +w < 700;
const browser = await chromium.launch({ channel: "chrome", args: ["--disable-blink-features=AutomationControlled"] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, locale: "en-GB", timezoneId: "Europe/London" });
const page = await ctx.newPage();
const problems = [];
page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && problems.push(m.text()));
page.on("pageerror", (e) => problems.push("PAGEERROR " + e));
await page.goto("http://localhost:4621/");
const tag = mobile ? "dm" : "dd";
await page.waitForTimeout(700);
await page.screenshot({ path: `shots/${tag}-0pre.png` });
await page.waitForTimeout(3800);
await page.mouse.move(500, 300);
await page.waitForTimeout(600);
await page.screenshot({ path: `shots/${tag}-1top.png` });
const stops = ["#machine", "#machine .lines", "#senses", "#live", "#ask", "#mark", "#known", "#proof"];
let i = 2;
for (const s of stops) {
  await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: "start", behavior: "instant" }), s);
  await page.mouse.move(300 + i * 40, 200 + i * 30, { steps: 12 });
  await page.waitForTimeout(s === "#mark" ? 6500 : 2200);
  await page.screenshot({ path: `shots/${tag}-${i++}${s.replace(/[^a-z]/g, "")}.png` });
}
console.log("lines:", await page.locator(".line").count(), "overflow:", await page.evaluate(() => document.documentElement.scrollWidth - innerWidth));
console.log((await page.locator(".line__text").allInnerTexts()).map((t, k) => `${String(k + 1).padStart(2, "0")} ${t}`).join("\n"));
console.log("problems:", problems);
await browser.close();
