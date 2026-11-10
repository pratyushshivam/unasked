import { describe, expect, it } from "vitest";
import { describeBrowser } from "../src/signals/browser";
import { chipName, describeDevice } from "../src/signals/device";
import { text } from "../src/signals/types";
import { browserFromBrands, browserFromUa, osFromUa, osVersion } from "../src/signals/ua";
import { desktop, guarded } from "./fixtures";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";
const EDGE =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0";
const SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";

describe("operating system", () => {
  it("is read from the label", () => {
    expect(osFromUa(desktop.ua)).toBe("Windows");
    expect(osFromUa(IPHONE)).toBe("iOS");
    expect(osFromUa(ANDROID)).toBe("Android");
    expect(osFromUa(SAFARI)).toBe("macOS");
    expect(osFromUa("Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0")).toBe("Linux");
    expect(osFromUa("curl/8")).toBeNull();
  });

  it("takes its version only from the hints", () => {
    expect(osVersion("Windows", "15.0.0")).toBe("11");
    expect(osVersion("Windows", "10.0.0")).toBe("10");
    expect(osVersion("Windows", "0.3.0")).toBeNull();
    expect(osVersion("macOS", "15.5.0")).toBe("15.5");
    expect(osVersion("Android", "16.0.0")).toBe("16");
    expect(osVersion("Android", undefined)).toBeNull();
  });
});

describe("browser name", () => {
  it("drops the decoy brand and prefers the specific one", () => {
    expect(browserFromBrands(desktop.hints?.brands ?? [])).toEqual({ name: "Google Chrome", version: "140" });
    expect(
      browserFromBrands([
        { brand: "Not A(Brand", version: "8" },
        { brand: "Chromium", version: "140" },
      ])?.name,
    ).toBe("Chromium");
    expect(browserFromBrands([])).toBeNull();
  });

  it("falls back to the label, most specific first", () => {
    expect(browserFromUa(EDGE)).toEqual({ name: "Microsoft Edge", version: "140.0.0.0" });
    expect(browserFromUa(guarded.ua)).toEqual({ name: "Firefox", version: "140.0" });
    expect(browserFromUa(SAFARI)).toEqual({ name: "Safari", version: "26.0" });
    expect(browserFromUa(ANDROID)?.name).toBe("Chrome");
  });
});

describe("the device line", () => {
  it("states system, version and processor when the browser gives them", () => {
    const f = describeDevice({ ua: desktop.ua, hints: desktop.hints, maxTouchPoints: 0 });
    expect(text(f.parts)).toBe("You are reading this on a computer running Windows 11, on a 64-bit x86 processor.");
    expect(f.status).toBe("read");
  });

  it("says so when the version is not given, and never repeats the frozen one", () => {
    const f = describeDevice({ ua: IPHONE, hints: null, maxTouchPoints: 5 });
    expect(text(f.parts)).toBe("You are reading this on a phone running iOS. It does not give a version I can trust.");
    expect(text(f.parts)).not.toContain("18");
    expect(f.status).toBe("partial");
  });

  it("does not guess between a Mac and an iPad that calls itself a Mac", () => {
    const f = describeDevice({ ua: SAFARI, hints: null, maxTouchPoints: 5 });
    expect(text(f.parts)).toContain("iPadOS or macOS");
  });

  it("names a phone's model when the hints carry one", () => {
    const hints = { brands: [], mobile: true, platform: "Android", platformVersion: "16.0.0", model: "Pixel 9" };
    expect(text(describeDevice({ ua: ANDROID, hints, maxTouchPoints: 5 }).parts)).toBe(
      "You are reading this on a phone, a Pixel 9, running Android 16.",
    );
  });

  it("admits it when nothing is given", () => {
    expect(describeDevice({ ua: "", hints: null, maxTouchPoints: 0 }).status).toBe("hidden");
  });

  it("picks the right article for the processor", () => {
    expect(chipName("x86", "64")).toBe("a 64-bit x86");
    expect(chipName("arm", undefined)).toBe("an ARM");
    expect(chipName(undefined, "64")).toBeNull();
  });
});

describe("the browser line", () => {
  it("gives the full version when offered, and keeps only the major one for the mark", () => {
    const f = describeBrowser({ ua: desktop.ua, hints: desktop.hints, brave: false });
    expect(text(f.parts)).toBe("Your browser is Google Chrome, version 140.0.7300.10.");
    expect(f.stable).toBe("Google Chrome|140");
  });

  it("recognises a browser that announces itself another way", () => {
    expect(text(describeBrowser({ ua: desktop.ua, hints: null, brave: true }).parts)).toContain("Brave");
  });
});
