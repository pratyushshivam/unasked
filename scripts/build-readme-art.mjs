// Writes the README graphics: hand-built SVG with CSS animation, in a light and a dark variant.
//   assets/hero-{light,dark}.svg       the name beside a mark drawn by the page's own ring geometry
//   assets/boundary-{light,dark}.svg   what stays on the device, and the line nothing crosses
// The mark is built from sample answers, not from anyone's browser.
// Run with `npm run readme`.

import { readFileSync, writeFileSync } from "node:fs";
import { arcPath, buildRings } from "../src/mark.ts";

const font = readFileSync("assets/fonts/Geist-readme.woff2").toString("base64");

const THEMES = {
  light: { paper: "#f2eee5", ink: "#15140f", mute: "rgba(21,20,15,.6)", rule: "rgba(21,20,15,.16)", accent: "#d4491a" },
  dark: { paper: "#15140f", ink: "#f2eee5", mute: "rgba(242,238,229,.6)", rule: "rgba(242,238,229,.2)", accent: "#ff6b3d" },
};

// The twenty lines of the letter, with neutral sample answers.
const SAMPLE = [
  ["device", "computer|Windows|11"],
  ["browser", "Chrome|140"],
  ["screen", "1920|1080|24|1"],
  ["window", null],
  ["clock", "Europe/London"],
  ["languages", "en-GB"],
  ["formats", "en-GB|gregory"],
  ["appearance", "light|false|srgb"],
  ["input", "0|fine|QWERTY"],
  ["processor", "8|8"],
  ["graphics", "sample renderer"],
  ["storage", "10 GB"],
  ["battery", null],
  ["connection", null],
  ["fonts", "Arial,Georgia,Verdana"],
  ["voices", "sample voice/en-GB"],
  ["canvas", "c41e9a02"],
  ["audio", "124.04"],
  ["privacy flags", "true|false|false"],
  ["arrival", null],
];
const findings = SAMPLE.map(([id, stable]) => ({ id, stable, status: "read" }));

const style = (t, extra = "") => `<style>
@font-face{font-family:G;font-weight:100 900;src:url(data:font/woff2;base64,${font}) format("woff2")}
text{font-family:G,"Helvetica Neue",Helvetica,Arial,sans-serif;fill:${t.ink}}
.cap{font-size:13px;letter-spacing:.18em;font-weight:500}
.mute{fill:${t.mute}}
.acc{fill:${t.accent}}
.ln{stroke:${t.ink};fill:none;stroke-width:1.25}
.hair{stroke:${t.rule};fill:none;stroke-width:1}
.ring{fill:none;stroke:${t.ink};stroke-width:2.6;stroke-linecap:round}
.thin{fill:none;stroke:${t.mute};stroke-width:1}
.spin{animation:spin linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.rise{animation:rise 1.2s cubic-bezier(.16,1,.3,1) both}
@keyframes rise{from{transform:translateY(40px);opacity:0}}
.draw{stroke-dasharray:1300;animation:draw 1.6s cubic-bezier(.87,0,.13,1) both}
@keyframes draw{from{stroke-dashoffset:1300}}
${extra}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>`;

function mark(cx, cy, scale = 1, inner = 26, outer = 214) {
  const rings = buildRings(findings, { inner, outer });
  const paths = rings
    .map(
      (ring) =>
        `<g class="spin" style="animation-duration:${ring.period}s;animation-direction:${ring.direction === 1 ? "normal" : "reverse"}"><path class="${ring.kind === "steady" ? "ring" : "thin"}" d="${arcPath(ring.r, ring.start, ring.sweep)}"/></g>`,
    )
    .join("");
  return `<g transform="translate(${cx} ${cy}) scale(${scale})">${paths}<circle class="acc" r="${inner * 0.3}"/></g>`;
}

// ------------------------------------------------------------------ hero
function hero(t) {
  const W = 1280;
  const H = 560;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
${style(t)}
<rect width="${W}" height="${H}" fill="${t.paper}"/>
<text class="cap" x="64" y="74">A LETTER FROM YOUR BROWSER</text>
<text class="cap mute" x="760" y="74" text-anchor="end">NOTHING LEAVES YOUR DEVICE</text>
<path class="ln draw" d="M64 98H760"/>
<g class="rise"><text x="56" y="306" font-size="172" font-weight="600" letter-spacing="-9">Unasked</text></g>
<g class="rise" style="animation-delay:.25s">
<text x="64" y="392" font-size="30" font-weight="500" letter-spacing="-.6">You told this page <tspan class="acc">nothing.</tspan> It read this anyway.</text>
<text class="mute" x="64" y="436" font-size="22" letter-spacing="-.2">What any website can learn about you without asking,</text>
<text class="mute" x="64" y="466" font-size="22" letter-spacing="-.2">worked out on your own device and shown only to you.</text>
</g>
${mark(1030, 280, 0.9)}
</svg>`;
}

// -------------------------------------------------------------- boundary
function boundary(t) {
  const W = 1280;
  const H = 440;
  const labels = SAMPLE.map(([id]) => id.toUpperCase());
  const column = (from, x) =>
    labels
      .slice(from, from + 10)
      .map((label, i) => `<text class="cap mute" x="${x}" y="${150 + i * 26}" font-size="11">${String(from + i + 1).padStart(2, "0")}  ${label}</text>`)
      .join("");
  const WALL = 930;
  const extra = `
.probe{animation:probe 3.6s cubic-bezier(.6,0,.2,1) infinite}
@keyframes probe{0%{transform:translateX(0);opacity:0}12%{opacity:1}55%{transform:translateX(106px);opacity:1}70%{transform:translateX(90px);opacity:1}100%{transform:translateX(90px);opacity:0}}
.wall{stroke:${t.accent};stroke-width:2;stroke-dasharray:2 9;stroke-linecap:round;fill:none}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
${style(t, extra)}
<rect width="${W}" height="${H}" fill="${t.paper}"/>
<text class="cap" x="64" y="74">YOUR BROWSER ANSWERS</text>
<text class="cap" x="470" y="74">THE PAGE WRITES IT DOWN, HERE</text>
<text class="cap acc" x="${WALL + 34}" y="74">THE NETWORK</text>
<path class="ln draw" d="M64 98H${WALL - 30}"/>
${column(0, 64)}${column(10, 240)}
<path class="hair" d="M420 120V400"/>
${mark(560, 262, 0.46)}
<text x="690" y="176" font-size="21" font-weight="600" letter-spacing="-.4">Twenty sentences</text>
<text class="mute" x="690" y="202" font-size="16">in plain English</text>
<text x="690" y="262" font-size="21" font-weight="600" letter-spacing="-.4">One mark</text>
<text class="mute" x="690" y="288" font-size="16">a local SHA-256 hash</text>
<text x="690" y="348" font-size="21" font-weight="600" letter-spacing="-.4">Kept: nothing</text>
<text class="mute" x="690" y="374" font-size="16">no cookie, no storage</text>
<path class="wall" d="M${WALL} 44V400"/>
<circle class="acc probe" cx="${WALL - 110}" cy="418" r="5"/>
<text class="cap mute" x="64" y="422" font-size="11">CONNECT-SRC 'NONE': THE BROWSER REFUSES ANYTHING THIS PAGE TRIES TO SEND</text>
<text x="${WALL + 34}" y="290" font-size="150" font-weight="600" letter-spacing="-8" class="acc">0</text>
<text class="mute" x="${WALL + 34}" y="330" font-size="16">requests after the page</text>
<text class="mute" x="${WALL + 34}" y="352" font-size="16">has loaded</text>
</svg>`;
}

for (const [name, theme] of Object.entries(THEMES)) {
  writeFileSync(`assets/hero-${name}.svg`, hero(theme));
  writeFileSync(`assets/boundary-${name}.svg`, boundary(theme));
}
console.log("wrote assets/hero-{light,dark}.svg and assets/boundary-{light,dark}.svg");
