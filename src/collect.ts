// The only file that touches the browser's objects. It reads what any page may read without
// a permission prompt and returns plain data. Nothing here sends, stores or asks for anything.

import { fnv1a, hex8 } from "./mark";
import type { Snapshot } from "./profile";
import { PROBES } from "./signals/fonts";
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
          resolve(value);
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
    return read();
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

function readRenderer(): string | null {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl") ?? (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
  if (!gl) return null;
  let renderer = String(gl.getParameter(gl.RENDERER) ?? "");
  // Chromium and Safari answer with a placeholder here and keep the real name behind an extension.
  if (!renderer || /^(WebKit WebGL|Mozilla)$/i.test(renderer)) {
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    if (info) renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) ?? renderer);
  }
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return renderer || null;
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

function readAppearance(): Snapshot["appearance"] {
  const gamut = (["rec2020", "p3", "srgb"] as const).find((g) => matches(`(color-gamut: ${g})`)) ?? null;
  return {
    scheme: matches("(prefers-color-scheme: dark)") ? "dark" : matches("(prefers-color-scheme: light)") ? "light" : null,
    reducedMotion: understood("(prefers-reduced-motion: reduce)") ? matches("(prefers-reduced-motion: reduce)") : null,
    contrast: matches("(prefers-contrast: more)") ? "more" : matches("(prefers-contrast: less)") ? "less" : null,
    forcedColors: matches("(forced-colors: active)"),
    gamut,
    hdr: understood("(dynamic-range: high)") ? matches("(dynamic-range: high)") : null,
  };
}

export async function collect(): Promise<Snapshot> {
  const nav = navigator as Navigator & NavigatorExtras;

  // The slow readers run side by side. Each has a deadline, so one stubborn API cannot hold up the letter.
  const [hints, storage, battery, keys, audio, voices] = await Promise.all([
    within(() => readHints(nav), 1000),
    within(() => nav.storage?.estimate?.(), 800),
    within(() => nav.getBattery?.(), 800),
    within(() => nav.keyboard?.getLayoutMap(), 800),
    within(readAudio, 1500),
    within(readVoices, 800),
  ]);

  const tags = attempt(() => [...nav.languages]) ?? [];
  if (tags.length === 0 && nav.language) tags.push(nav.language);

  return {
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
    time: {
      zone: attempt(() => Intl.DateTimeFormat().resolvedOptions().timeZone) || null,
      offsetMinutes: new Date().getTimezoneOffset(),
      now: Date.now(),
    },
    languages: { tags, names: languageNames(tags) },
    formats: readFormats(),
    appearance: readAppearance(),
    input: {
      maxTouchPoints: nav.maxTouchPoints ?? 0,
      pointer: matches("(pointer: fine)") ? "fine" : matches("(pointer: coarse)") ? "coarse" : matches("(pointer: none)") ? "none" : null,
      keys: keys ? { KeyQ: keys.get("KeyQ"), KeyW: keys.get("KeyW"), KeyY: keys.get("KeyY") } : null,
    },
    hardware: { threads: nav.hardwareConcurrency ?? null, memoryGB: nav.deviceMemory ?? null },
    graphics: { renderer: attempt(readRenderer) },
    storage: { quotaBytes: storage?.quota ?? null },
    battery: battery ? { level: battery.level, charging: battery.charging } : null,
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
    fonts: attempt(readFonts),
    voices,
    canvas: attempt(readCanvas),
    audio,
    privacy: {
      cookies: nav.cookieEnabled,
      doNotTrack: nav.doNotTrack ?? null,
      globalPrivacyControl: nav.globalPrivacyControl,
      webdriver: nav.webdriver === true,
    },
    arrival: { referrer: document.referrer, historyLength: history.length },
  };
}
