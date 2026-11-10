// The only file that touches the browser's objects. It reads what any page may read without
// a permission prompt and returns plain data. Nothing here sends, stores or asks for anything.

import { fnv1a, hex8 } from "./mark";
import type { Snapshot } from "./profile";
import { trackingTags } from "./signals/arrival";
import { spin } from "./signals/benchmark";
import { FORMATS } from "./signals/codecs";
import { FEATURES } from "./signals/features";
import { PROBES } from "./signals/fonts";
import { doSums } from "./signals/maths";
import type { PermissionAnswer } from "./signals/permissions";
import type { UaHints } from "./signals/ua";

/** Waits for a promise, but never longer than `ms`. A browser that stalls counts as one that refused. */
function within<T>(work: () => Promise<T> | T, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    Promise.resolve()
      .then(work)
      .then(
        (value) => {
          clearTimeout(timer);
          resolve(value ?? null);
        },
        () => {
          clearTimeout(timer);
          resolve(null);
        },
      );
  });
}

const attempt = <T>(read: () => T): T | null => {
  try {
    return read() ?? null;
  } catch {
    return null;
  }
};

const matches = (query: string): boolean => attempt(() => matchMedia(query).matches) ?? false;
const understood = (query: string): boolean => attempt(() => matchMedia(query).media !== "not all") ?? false;

// Parts of the web platform that are not in every browser, and so not in the standard types.
interface NavigatorExtras {
  userAgentData?: {
    brands: UaHints["brands"];
    mobile: boolean;
    platform: string;
    getHighEntropyValues(hints: string[]): Promise<Partial<UaHints>>;
  };
  brave?: unknown;
  deviceMemory?: number;
  connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean; type?: string };
  getBattery?: () => Promise<{ level: number; charging: boolean }>;
  keyboard?: { getLayoutMap(): Promise<Map<string, string>> };
  globalPrivacyControl?: boolean;
  pdfViewerEnabled?: boolean;
  gpu?: {
    requestAdapter(): Promise<{
      info?: Record<string, string>;
      requestAdapterInfo?: () => Promise<Record<string, string>>;
      features: { size: number };
    } | null>;
  };
}

async function readHints(nav: Navigator & NavigatorExtras): Promise<UaHints | null> {
  const data = nav.userAgentData;
  if (!data) return null;
  const low: UaHints = { brands: [...(data.brands ?? [])], mobile: data.mobile, platform: data.platform };
  const high = await within(
    () => data.getHighEntropyValues(["platformVersion", "architecture", "bitness", "model", "fullVersionList"]),
    800,
  );
  return high ? { ...low, ...high, brands: low.brands } : low;
}

function readGraphics(): Pick<Snapshot, "graphics" | "webgl"> {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl") ?? (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
  if (!gl) return { graphics: { renderer: null }, webgl: null };
  let renderer = String(gl.getParameter(gl.RENDERER) ?? "");
  // Chromium and Safari answer with a placeholder here and keep the real name behind an extension.
  if (!renderer || /^(WebKit WebGL|Mozilla)$/i.test(renderer)) {
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    if (info) renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) ?? renderer);
  }
  const webgl = {
    version: String(gl.getParameter(gl.VERSION) ?? ""),
    shading: String(gl.getParameter(gl.SHADING_LANGUAGE_VERSION) ?? ""),
    maxTexture: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 0,
    maxRenderbuffer: Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)) || 0,
    maxAttribs: Number(gl.getParameter(gl.MAX_VERTEX_ATTRIBS)) || 0,
    antialias: gl.getContextAttributes()?.antialias ?? false,
    extensions: gl.getSupportedExtensions() ?? [],
  };
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return { graphics: { renderer: renderer || null }, webgl };
}

async function readWebgpu(nav: Navigator & NavigatorExtras): Promise<Snapshot["webgpu"]> {
  if (!nav.gpu) return "absent";
  const adapter = await nav.gpu.requestAdapter();
  if (!adapter) return null;
  // Older browsers hand the description over through a method, newer ones through a property.
  const old = adapter as unknown as { requestAdapterInfo?: () => Promise<Record<string, string>> };
  const info = (adapter.info as unknown as Record<string, string> | undefined) ?? (await old.requestAdapterInfo?.()) ?? {};
  return {
    vendor: info.vendor ?? "",
    architecture: info.architecture ?? "",
    device: info.device ?? "",
    description: info.description ?? "",
    features: adapter.features?.size ?? 0,
  };
}

function readFonts(): Snapshot["fonts"] {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  const sample = "mmMwWLli0O&1";
  const fallbacks = ["monospace", "sans-serif", "serif"];
  const width = (family: string): number => {
    ctx.font = `72px ${family}`;
    return ctx.measureText(sample).width;
  };
  const base = fallbacks.map(width);
  const found = PROBES.filter((name) => fallbacks.some((fallback, i) => width(`"${name}", ${fallback}`) !== base[i]));
  return { probed: PROBES.length, found };
}

function drawPicture(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 280;
  canvas.height = 60;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#f2eee5";
  ctx.fillRect(0, 0, 280, 60);
  ctx.fillStyle = "#d4491a";
  ctx.beginPath();
  ctx.arc(40, 30, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "multiply";
  const fade = ctx.createLinearGradient(0, 0, 280, 60);
  fade.addColorStop(0, "#15140f");
  fade.addColorStop(1, "#ff6b3d");
  ctx.fillStyle = fade;
  ctx.font = "italic 19px Georgia, serif";
  ctx.fillText("Unasked, 0123 éñ \u{1F58B}", 12.5, 36.5);
  ctx.strokeStyle = "rgba(21, 20, 15, 0.6)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(8, 50);
  ctx.bezierCurveTo(90, 8, 170, 62, 272, 14);
  ctx.stroke();
  return canvas.toDataURL();
}

function readCanvas(): Snapshot["canvas"] {
  const first = drawPicture();
  const second = drawPicture();
  if (first.length < 200) return null;
  return { hash: hex8(fnv1a(first)), repeatable: first === second };
}

async function readAudio(): Promise<Snapshot["audio"]> {
  const Offline =
    window.OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!Offline) return null;
  // An offline context renders into memory. Nothing is played and no device is opened.
  const ctx = new Offline(1, 5000, 44100);
  const tone = ctx.createOscillator();
  tone.type = "triangle";
  tone.frequency.value = 10000;
  const squeeze = ctx.createDynamicsCompressor();
  squeeze.threshold.value = -50;
  squeeze.knee.value = 40;
  squeeze.ratio.value = 12;
  squeeze.attack.value = 0;
  squeeze.release.value = 0.25;
  tone.connect(squeeze);
  squeeze.connect(ctx.destination);
  tone.start(0);
  const samples = (await ctx.startRendering()).getChannelData(0);
  let sum = 0;
  for (let i = 4500; i < samples.length; i++) sum += Math.abs(samples[i] ?? 0);
  return { sum };
}

async function readVoices(): Promise<Snapshot["voices"]> {
  if (!("speechSynthesis" in window)) return null;
  const speech = window.speechSynthesis;
  let voices = speech.getVoices();
  if (voices.length === 0) {
    // Some browsers fill the list a moment after the first call.
    await new Promise<void>((resolve) => {
      const done = (): void => resolve();
      speech.addEventListener("voiceschanged", done, { once: true });
      setTimeout(done, 400);
    });
    voices = speech.getVoices();
  }
  return voices.map((voice) => ({ name: voice.name, lang: voice.lang }));
}

/** Times a run of animation frames. The browser paints in step with the screen. */
function readRefresh(): Promise<number | null> {
  return new Promise((resolve) => {
    const stamps: number[] = [];
    const tick = (now: number): void => {
      stamps.push(now);
      if (stamps.length < 26) return void requestAnimationFrame(tick);
      const gaps = stamps.slice(1).map((t, i) => t - (stamps[i] ?? t)).sort((a, b) => a - b);
      const median = gaps[Math.floor(gaps.length / 2)] ?? 0;
      resolve(median > 0 ? 1000 / median : null);
    };
    requestAnimationFrame(tick);
  });
}

async function readMedia(): Promise<Snapshot["media"]> {
  // This lists kinds of device. It does not open one, and it does not prompt.
  const devices = await navigator.mediaDevices?.enumerateDevices?.();
  if (!devices) return null;
  const count = (kind: MediaDeviceKind): number => devices.filter((d) => d.kind === kind).length;
  return { cameras: count("videoinput"), microphones: count("audioinput"), speakers: count("audiooutput") };
}

function readCodecs(): Snapshot["codecs"] {
  const video = document.createElement("video");
  if (!video.canPlayType) return null;
  return { asked: FORMATS.length, playable: FORMATS.filter(([, type]) => video.canPlayType(type) !== "").map(([name]) => name) };
}

function readFeatures(): Snapshot["features"] {
  const present = FEATURES.filter((path) => {
    const [owner, name] = path.split(".") as [string, string];
    return attempt(() => name in (owner === "navigator" ? navigator : window)) ?? false;
  });
  return { tested: FEATURES.length, present };
}

/** Puts an empty box with an advertisement's kind of name on the page, and sees whether something hides it. */
async function readBlocker(): Promise<boolean | null> {
  const bait = document.createElement("div");
  bait.className = "bait adsbox ad-banner ad-placement pub_300x250 text-ad textAd";
  document.body.append(bait);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const hidden = bait.offsetHeight === 0 || getComputedStyle(bait).display === "none";
  bait.remove();
  return hidden;
}

/** Marks that well-known kinds of extension leave on a page. Nothing is probed beyond this page. */
function readExtensions(): string[] {
  const w = window as unknown as Record<string, unknown>;
  const root = document.documentElement;
  const found: string[] = [];
  const add = (seen: unknown, name: string): void => {
    if (seen) found.push(name);
  };
  add(w.ethereum || w.solana || w.phantom, "a crypto wallet");
  add(w.__REACT_DEVTOOLS_GLOBAL_HOOK__, "React developer tools");
  add(w.__VUE_DEVTOOLS_GLOBAL_HOOK__, "Vue developer tools");
  add(w.__REDUX_DEVTOOLS_EXTENSION__, "Redux developer tools");
  add(root.hasAttribute("data-darkreader-mode") || document.querySelector('meta[name="darkreader"]'), "a dark-mode extension");
  add(
    document.body.hasAttribute("data-gr-ext-installed") || document.querySelector("grammarly-desktop-integration"),
    "a grammar checker",
  );
  add(
    document.querySelector("[data-lastpass-icon-root], com-1password-button, [data-dashlane-rid], [data-bwautofill]"),
    "a password manager",
  );
  return found;
}

async function readPermissions(): Promise<Record<string, PermissionAnswer> | null> {
  if (!navigator.permissions?.query) return null;
  const names: [string, string][] = [
    ["geolocation", "location"],
    ["camera", "camera"],
    ["microphone", "microphone"],
    ["notifications", "notifications"],
  ];
  const out: Record<string, PermissionAnswer> = {};
  await Promise.all(
    names.map(async ([name, label]) => {
      // query() reads the stored answer. It never shows a prompt.
      const status = await within(() => navigator.permissions.query({ name: name as PermissionName }), 500);
      if (status) out[label] = status.state;
    }),
  );
  // Keep a fixed order whatever order the answers came back in.
  return Object.fromEntries(names.filter(([, label]) => label in out).map(([, label]) => [label, out[label] as PermissionAnswer]));
}

function readMismatch(tag: string | undefined, zone: string | null): Snapshot["mismatch"] {
  const none = { region: null, regionName: null, zone, regionZones: null };
  if (!tag) return none;
  const locale = attempt(() => new Intl.Locale(tag)) as (Intl.Locale & { getTimeZones?: () => string[]; timeZones?: string[] }) | null;
  const region = locale?.region ?? null;
  if (!locale || !region) return none;
  // Browsers spell some zones two ways (Calcutta, Kolkata). Run both sides through the same canonical form.
  const canon = (z: string): string => attempt(() => new Intl.DateTimeFormat("en", { timeZone: z }).resolvedOptions().timeZone) ?? z;
  const zones = attempt(() => locale.getTimeZones?.() ?? locale.timeZones) ?? null;
  return {
    region,
    regionName: attempt(() => new Intl.DisplayNames(["en"], { type: "region" }).of(region)) ?? region,
    zone: zone ? canon(zone) : null,
    regionZones: zones ? zones.map(canon) : null,
  };
}

function readTiming(): Pick<Snapshot, "timing"> & { kind: string | null } {
  const [nav] = (attempt(() => performance.getEntriesByType("navigation")) ?? []) as PerformanceNavigationTiming[];
  if (!nav) return { timing: null, kind: null };
  return {
    kind: nav.type ?? null,
    timing: {
      wait: nav.responseStart > 0 && nav.requestStart > 0 ? nav.responseStart - nav.requestStart : null,
      connect: nav.connectEnd - nav.connectStart,
      protocol: nav.nextHopProtocol || null,
    },
  };
}

/** A tenth of a second of a fixed sum, counted. */
function readBenchmark(): Snapshot["benchmark"] {
  const began = performance.now();
  let rounds = 0;
  let x = 1;
  while (performance.now() - began < 100) {
    x = spin(20_000, x);
    rounds += 20_000;
  }
  return { rounds, ms: performance.now() - began };
}

function readTimer(): Snapshot["timer"] {
  let smallest = Number.POSITIVE_INFINITY;
  let last = performance.now();
  for (let i = 0; i < 50_000; i++) {
    const now = performance.now();
    if (now > last) {
      smallest = Math.min(smallest, now - last);
      last = now;
    }
  }
  const heap = (performance as unknown as { memory?: { jsHeapSizeLimit?: number } }).memory?.jsHeapSizeLimit;
  return { step: Number.isFinite(smallest) ? smallest : 0, heapLimitMb: heap ? Math.round(heap / 2 ** 20) : null };
}

function languageNames(tags: readonly string[]): string[] {
  const namer = attempt(() => new Intl.DisplayNames(["en"], { type: "language", languageDisplay: "standard" }));
  return tags.map((tag) => attempt(() => namer?.of(tag)) ?? tag);
}

function readFormats(): Snapshot["formats"] {
  const options = attempt(() => new Intl.DateTimeFormat().resolvedOptions());
  const evening = new Date(2026, 11, 31, 21, 30);
  return {
    locale: options?.locale ?? null,
    calendar: options?.calendar ?? null,
    date: evening.toLocaleDateString(undefined, { year: "numeric", month: "numeric", day: "numeric" }),
    time: evening.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    number: (1234567.89).toLocaleString(),
  };
}

/** How many things `collect` reads, for the opening count. */
export const READERS = 41;

export async function collect(onProgress: (done: number) => void = () => {}): Promise<Snapshot> {
  const nav = navigator as Navigator & NavigatorExtras;
  let done = 0;
  const step = <T>(value: T): T => {
    onProgress(++done);
    return value;
  };
  const slow = <T>(work: () => Promise<T> | T, ms: number): Promise<T | null> => within(work, ms).then(step);

  // The slow readers run side by side. Each has a deadline, so one stubborn API cannot hold up the page.
  const [hints, storage, battery, keys, audio, voices, refreshHz, media, webgpu, blocker, permissions] = await Promise.all([
    slow(() => readHints(nav), 1000),
    slow(() => nav.storage?.estimate?.(), 800),
    slow(() => nav.getBattery?.(), 800),
    slow(() => nav.keyboard?.getLayoutMap(), 800),
    slow(readAudio, 1500),
    slow(readVoices, 800),
    slow(readRefresh, 1200),
    slow(readMedia, 800),
    within(() => readWebgpu(nav), 1200).then((g) => step(g === null && !nav.gpu ? ("absent" as const) : g)),
    slow(readBlocker, 600),
    slow(readPermissions, 900),
  ]);

  const tags = attempt(() => [...nav.languages]) ?? [];
  if (tags.length === 0 && nav.language) tags.push(nav.language);
  const zone = attempt(() => Intl.DateTimeFormat().resolvedOptions().timeZone) || null;
  const { timing, kind } = readTiming();
  const { graphics, webgl } = attempt(readGraphics) ?? { graphics: { renderer: null }, webgl: null };
  const gamut = (["rec2020", "p3", "srgb"] as const).find((g) => matches(`(color-gamut: ${g})`)) ?? null;

  const snapshot: Snapshot = {
    ua: nav.userAgent ?? "",
    hints,
    brave: nav.brave !== undefined,
    screen: {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      dpr: window.devicePixelRatio || 1,
    },
    window: { innerWidth: window.innerWidth, innerHeight: window.innerHeight },
    display: {
      gamut,
      hdr: understood("(dynamic-range: high)") ? matches("(dynamic-range: high)") : null,
      orientation: attempt(() => screen.orientation?.type) ?? null,
    },
    refreshHz,
    pinch: attempt(() => window.visualViewport?.scale) ?? null,
    input: {
      maxTouchPoints: nav.maxTouchPoints ?? 0,
      pointer: matches("(pointer: fine)") ? "fine" : matches("(pointer: coarse)") ? "coarse" : matches("(pointer: none)") ? "none" : null,
      hover: understood("(hover: hover)") ? matches("(hover: hover)") : null,
    },
    gamepads: attempt(() => (nav.getGamepads ? [...nav.getGamepads()].filter((pad) => pad !== null).map((pad) => pad.id) : null)),
    hardware: { threads: nav.hardwareConcurrency ?? null, memoryGB: nav.deviceMemory ?? null },
    battery: battery ? { level: battery.level, charging: battery.charging } : null,
    storage: { quotaBytes: storage?.quota ?? null },

    graphics,
    webgl,
    webgpu,
    canvas: attempt(readCanvas),
    audio,
    maths: attempt(doSums),
    codecs: attempt(readCodecs),
    media,
    voices,

    features: readFeatures(),
    fonts: attempt(readFonts),
    plugins: {
      names: attempt(() => [...nav.plugins].map((plugin) => plugin.name)) ?? [],
      pdfViewer: nav.pdfViewerEnabled ?? null,
    },
    blocker,
    extensions: attempt(readExtensions) ?? [],
    automation: {
      webdriver: nav.webdriver === true,
      headlessLabel: /Headless/i.test(nav.userAgent ?? ""),
      noLanguages: tags.length === 0,
    },
    privacy: { doNotTrack: nav.doNotTrack ?? null, globalPrivacyControl: nav.globalPrivacyControl },
    storageAccess: {
      cookies: nav.cookieEnabled,
      localStorage: attempt(() => Boolean(window.localStorage)) ?? false,
      sessionStorage: attempt(() => Boolean(window.sessionStorage)) ?? false,
      indexedDb: attempt(() => Boolean(window.indexedDB)) ?? false,
      serviceWorker: attempt(() => "serviceWorker" in nav) ?? false,
    },
    permissions,
    appearance: {
      scheme: matches("(prefers-color-scheme: dark)") ? "dark" : matches("(prefers-color-scheme: light)") ? "light" : null,
      reducedMotion: understood("(prefers-reduced-motion: reduce)") ? matches("(prefers-reduced-motion: reduce)") : null,
      contrast: matches("(prefers-contrast: more)") ? "more" : matches("(prefers-contrast: less)") ? "less" : null,
      forcedColors: matches("(forced-colors: active)"),
      reducedTransparency: matches("(prefers-reduced-transparency: reduce)"),
      reducedData: matches("(prefers-reduced-data: reduce)"),
      invertedColors: matches("(inverted-colors: inverted)"),
    },

    time: { zone, offsetMinutes: new Date().getTimezoneOffset(), now: Date.now() },
    languages: { tags, names: languageNames(tags) },
    formats: readFormats(),
    keys: keys ? { KeyQ: keys.get("KeyQ"), KeyW: keys.get("KeyW"), KeyY: keys.get("KeyY") } : null,
    mismatch: readMismatch(tags[0], zone),

    connection: {
      online: nav.onLine,
      info: nav.connection
        ? {
            effectiveType: nav.connection.effectiveType,
            downlink: nav.connection.downlink,
            rtt: nav.connection.rtt,
            saveData: nav.connection.saveData,
            type: nav.connection.type,
          }
        : null,
    },
    timing,
    arrival: {
      referrer: document.referrer,
      historyLength: history.length,
      kind,
      opened: attempt(() => Boolean(window.opener)) ?? false,
      tags: attempt(() => trackingTags(location.search)) ?? [],
    },

    benchmark: attempt(readBenchmark),
    timer: attempt(readTimer),
  };
  onProgress(READERS);
  return snapshot;
}
