// Records one continuous take of the built page and cuts it into the film and the GIFs in the README.
//   node scripts/film.mjs [url]
// Needs Chrome and ffmpeg. Writes assets/film.mp4, assets/screens/opening.gif and assets/screens/watching.gif.
//
// The browser is given a neutral time zone and language. The address lookup is answered by a stand-in
// with a documentation address (203.0.113.7), so no real address appears and no request leaves.

import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { chromium } from "playwright-core";

const url = process.argv[2] ?? "http://localhost:4621/";
const size = { width: 1280, height: 800 };
const tmp = "shots/film";
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL ?? "chrome",
  args: ["--disable-blink-features=AutomationControlled"],
});
const plain = (await browser.newPage()).evaluate(() => navigator.userAgent);
const context = await browser.newContext({
  viewport: size,
  locale: "en-GB",
  timezoneId: "Europe/London",
  // A recording browser calls itself headless. An ordinary visitor's does not.
  userAgent: (await plain).replace("HeadlessChrome", "Chrome"),
  recordVideo: { dir: tmp, size },
  // Only so that the paper grain can be switched off for the recording: film compresses noise badly.
  bypassCSP: true,
});
const page = await context.newPage();
await page.route("https://ipinfo.io/**", (route) =>
  route.fulfill({
    json: { ip: "203.0.113.7", city: "Lisbon", region: "Lisbon", country: "PT", org: "AS64500 Example Net", timezone: "Europe/Lisbon" },
    headers: { "access-control-allow-origin": "*" },
  }),
);
const began = Date.now();
const at = () => (Date.now() - began) / 1000;
const marks = {};

// An eased scroll, slower and smoother than the browser's own.
const glide = (selector, offset, ms) =>
  page.evaluate(
    ([s, o, d]) =>
      new Promise((done) => {
        const from = scrollY;
        const target = document.querySelector(s).getBoundingClientRect().top + scrollY + o;
        const start = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - start) / d);
          const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
          scrollTo(0, from + (target - from) * e);
          if (t < 1) requestAnimationFrame(step);
          else done();
        };
        requestAnimationFrame(step);
      }),
    [selector, offset, ms],
  );
// The pointer wanders along a curve, the way a hand does.
const wander = async (points, ms) => {
  const each = ms / points.length;
  for (const [x, y] of points) await page.mouse.move(x, y, { steps: Math.max(6, Math.round(each / 16)) });
};

await page.goto(url, { waitUntil: "commit" });
marks.open = at();
await page.addStyleTag({ content: "body::before{display:none}" }).catch(() => {});
await page.waitForTimeout(3300);
await wander([[200, 300], [520, 260], [860, 330], [640, 470], [330, 420], [900, 520]], 3600);
marks.heroEnd = at();
await glide("#machine", -30, 1700);
await wander([[700, 420], [760, 600]], 900);
await page.waitForTimeout(1500);
await glide("#machine .lines", -110, 1400);
await page.waitForTimeout(1300);
await page.locator(".line__front").nth(1).hover();
await page.waitForTimeout(500);
await page.locator(".line__front").nth(1).click();
await page.waitForTimeout(2300);
await page.locator(".line__back").nth(1).click();
await page.waitForTimeout(1100);
marks.linesEnd = at();
await glide("#senses", -30, 2400);
await page.waitForTimeout(1800);
await glide("#senses .lines", -110, 1500);
await page.waitForTimeout(2200);
await glide("#live", -30, 4200);
await page.waitForTimeout(1500);
await glide(".live__grid", -90, 1300);
marks.live = at();
await wander([[300, 300], [520, 520], [820, 380], [1040, 600], [760, 240], [420, 420], [980, 300], [620, 560], [240, 500]], 5200);
marks.liveEnd = at();
await glide(".typing", -260, 1300);
await page.locator("#type-box").click();
await page.locator("#type-box").pressSequentially("nothing to hide", { delay: 95 });
await page.waitForTimeout(1300);
await glide("#ask", -30, 1900);
await page.waitForTimeout(1500);
await glide(".ask__body", -150, 1100);
await page.locator("#ask-button").hover();
await page.waitForTimeout(600);
await page.locator("#ask-button").click();
await page.waitForTimeout(3600);
await glide("#sum", -30, 1900);
await page.waitForTimeout(1600);
await glide("#mark", -110, 1400);
marks.mark = at();
await page.waitForTimeout(7200);
marks.markEnd = at();
await glide("#known", -120, 1500);
await page.waitForTimeout(2600);
await glide("#stats", -140, 1300);
await page.waitForTimeout(2200);
await glide("#bits", -420, 1300);
await page.waitForTimeout(3400);
await glide("#proof", -30, 2600);
await page.waitForTimeout(2400);
marks.end = at();
await context.close();
await browser.close();

const webm = `${tmp}/${readdirSync(tmp).find((f) => f.endsWith(".webm"))}`;
const ff = (...args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
const t = (n) => n.toFixed(2);

// The whole take, for sharing.
ff("-ss", t(marks.open + 0.35), "-to", t(marks.end), "-i", webm, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", "assets/film.mp4");

// Cuts for the README.
const cut = (from, to, name) => ff("-ss", t(from), "-to", t(to), "-i", webm, "-an", "-c:v", "libx264", "-crf", "16", `${tmp}/${name}.mp4`);
const gif = (inputs, out) =>
  ff(
    ...inputs.flatMap((name) => ["-i", `${tmp}/${name}.mp4`]),
    "-filter_complex",
    `${inputs.map((_, i) => `[${i}:v]`).join("")}concat=n=${inputs.length}:v=1,fps=10,scale=680:-1:flags=lanczos,split[x][y];[x]palettegen=max_colors=32:stats_mode=diff[p];[y][p]paletteuse=dither=none:diff_mode=rectangle`,
    out,
  );
cut(marks.open + 0.35, Math.min(marks.linesEnd, marks.open + 15.35), "a");
cut(marks.live - 0.3, marks.liveEnd, "b");
cut(marks.mark - 0.4, marks.markEnd, "c");
gif(["a"], "assets/screens/opening.gif");
gif(["b", "c"], "assets/screens/watching.gif");
console.log(marks);
