// Reading the User-Agent label and its replacement, User-Agent Client Hints.
// Browsers have frozen most of the old label, so the version of the operating system is only
// taken from the hints, never from the label.

export interface Brand {
  brand: string;
  version: string;
}

export interface UaHints {
  brands: Brand[];
  mobile: boolean;
  platform: string;
  platformVersion?: string;
  architecture?: string;
  bitness?: string;
  model?: string;
  fullVersionList?: Brand[];
}

export type Os = "Windows" | "macOS" | "iOS" | "iPadOS" | "Android" | "ChromeOS" | "Linux";

export function osFromUa(ua: string): Os | null {
  if (/Windows NT/.test(ua)) return "Windows";
  if (/Android/.test(ua)) return "Android";
  if (/iPad/.test(ua)) return "iPadOS";
  if (/iPhone|iPod/.test(ua)) return "iOS";
  if (/Mac OS X|Macintosh/.test(ua)) return "macOS";
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Linux|X11/.test(ua)) return "Linux";
  return null;
}

export function osFromHints(platform: string): Os | null {
  const known: Record<string, Os> = {
    windows: "Windows",
    macos: "macOS",
    ios: "iOS",
    android: "Android",
    "chrome os": "ChromeOS",
    chromeos: "ChromeOS",
    linux: "Linux",
  };
  return known[platform.toLowerCase()] ?? null;
}

/** The version a person would recognise, from the platformVersion hint. */
export function osVersion(os: Os, platformVersion: string | undefined): string | null {
  if (!platformVersion) return null;
  const nums = platformVersion.split(".").map((n) => Number.parseInt(n, 10));
  const major = nums[0];
  if (major === undefined || Number.isNaN(major)) return null;
  if (os === "Windows") {
    // Windows reports its API contract version: 13 and above is Windows 11, 1 to 10 is Windows 10.
    if (major >= 13) return "11";
    if (major >= 1) return "10";
    return null;
  }
  if (major === 0) return null;
  const minor = nums[1];
  if (os === "macOS" && minor !== undefined && !Number.isNaN(minor) && minor > 0) return `${major}.${minor}`;
  return String(major);
}

const GREASE = /not.?a.?brand/i;

export interface BrowserName {
  name: string;
  version: string | null;
}

/** Picks the most specific real brand. Browsers add a nonsense brand on purpose; it is dropped. */
export function browserFromBrands(brands: Brand[]): BrowserName | null {
  const real = brands.filter((b) => !GREASE.test(b.brand));
  const specific = real.find((b) => b.brand !== "Chromium") ?? real[0];
  if (!specific) return null;
  return { name: specific.brand, version: specific.version || null };
}

export function browserFromUa(ua: string): BrowserName | null {
  const rules: [RegExp, string][] = [
    [/Edg(?:e|A|iOS)?\/([\d.]+)/, "Microsoft Edge"],
    [/OPR\/([\d.]+)/, "Opera"],
    [/SamsungBrowser\/([\d.]+)/, "Samsung Internet"],
    [/(?:Firefox|FxiOS)\/([\d.]+)/, "Firefox"],
    [/(?:Chrome|CriOS)\/([\d.]+)/, "Chrome"],
    [/Version\/([\d.]+).*Safari\//, "Safari"],
  ];
  for (const [pattern, name] of rules) {
    const m = pattern.exec(ua);
    if (m) return { name, version: m[1] ?? null };
  }
  return null;
}
