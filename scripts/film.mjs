// Records one continuous take of the built page and cuts it into the film and the GIF in the README.
//   node scripts/film.mjs [url]
// Needs Chrome and ffmpeg. Writes assets/film.mp4 and assets/screens/letter.gif.

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
const context = await browser.newContext({
  viewport: size,
  locale: "en-GB",
  timezoneId: "Europe/London",
  recordVideo: { dir: tmp, size },
  // Only so that the paper grain can be switched off for the recording: film compresses noise badly.
  bypassCSP: true,
});
const page = await context.newPage();
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
        document.documentElement.style.scrollBehavior = "auto";
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

await page.goto(url, { waitUntil: "load" });
await page.addStyleTag({ content: "body::before{display:none}" });
marks.open = at();
await page.waitForTimeout(2600);
await glide(".letter__head", -90, 1400);
marks.letter = at();
await page.waitForTimeout(4200);
await page.locator(".line__front").nth(1).click();
await page.mouse.move(640, 790);
await page.waitForTimeout(2300);
await page.locator(".line__back").nth(1).click();
await page.mouse.move(640, 790);
await page.waitForTimeout(1300);
marks.letterEnd = at();
await glide("#sum", -20, 3800);
await page.waitForTimeout(1500);
await glide("#mark", -150, 1500);
marks.mark = at();
await page.waitForTimeout(7200);
marks.markEnd = at();
await glide("#stats", -120, 1600);
await page.waitForTimeout(2200);
await glide("#bits", -420, 1400);
await page.waitForTimeout(3600);
await glide("#proof", 0, 2600);
await page.waitForTimeout(2600);
marks.end = at();
await context.close();
await browser.close();

const webm = `${tmp}/${readdirSync(tmp).find((f) => f.endsWith(".webm"))}`;
const ff = (...args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
const t = (n) => n.toFixed(2);

// The whole take, for sharing.
ff("-ss", t(marks.open + 0.2), "-to", t(marks.end), "-i", webm, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", "assets/film.mp4");

// Two cuts for the README: the letter being typed and turned, then the signals converging.
const cut = (from, to, name) => ff("-ss", t(from), "-to", t(to), "-i", webm, "-an", "-c:v", "libx264", "-crf", "16", `${tmp}/${name}.mp4`);
cut(marks.letter - 0.2, marks.letterEnd, "a");
cut(marks.mark - 0.4, marks.markEnd, "b");
ff(
  "-i", `${tmp}/a.mp4`, "-i", `${tmp}/b.mp4`,
  "-filter_complex",
  "[0:v][1:v]concat=n=2:v=1,fps=12,scale=800:-1:flags=lanczos,split[x][y];[x]palettegen=max_colors=40:stats_mode=diff[p];[y][p]paletteuse=dither=none:diff_mode=rectangle",
  "assets/screens/letter.gif",
);
console.log(marks);
