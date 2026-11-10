import { describe, expect, it } from "vitest";
import { describeAppearance } from "../src/signals/appearance";
import { describeArrival, referrerHost } from "../src/signals/arrival";
import { describeAudio } from "../src/signals/audio";
import { describeBattery } from "../src/signals/battery";
import { describeCanvas, grouped } from "../src/signals/canvas";
import { describeConnection } from "../src/signals/connection";
import { ADDED, PROBES, describeFonts } from "../src/signals/fonts";
import { describeFormats } from "../src/signals/formats";
import { describeGraphics, parseRenderer } from "../src/signals/graphics";
import { describeHardware } from "../src/signals/hardware";
import { describeInput, keyboardLayout } from "../src/signals/input";
import { describeLanguages } from "../src/signals/languages";
import { describePrivacy } from "../src/signals/privacy";
import { describeScreen } from "../src/signals/screen";
import { describeStorage, readableBytes } from "../src/signals/storage";
import { describeTime, localClock, utcOffset } from "../src/signals/time";
import { type Finding, list, text, v } from "../src/signals/types";
import { describeVoices } from "../src/signals/voices";
import { describeWindow } from "../src/signals/window";
import { desktop, guarded } from "./fixtures";

const say = (f: Finding): string => text(f.parts);

describe("sentences", () => {
  it("joins lists the way a person writes them", () => {
    expect(text(list([v("a")]))).toBe("a");
    expect(text(list([v("a"), v("b")]))).toBe("a and b");
    expect(text(list([v("a"), v("b"), v("c")]))).toBe("a, b and c");
  });
});

describe("screen and window", () => {
  it("works out real pixels and the space a taskbar takes", () => {
    expect(say(describeScreen(desktop.screen))).toBe(
      "Your screen is 1536 × 864 at 1.25× density, which comes to about 1920 × 1080 real pixels, in 24-bit colour. A taskbar, dock or menu bar takes 48 pixels of it.",
    );
  });

  it("stays quiet about density and bars when there is nothing to say", () => {
    expect(say(describeScreen(guarded.screen))).toBe("Your screen is 1400 × 900 pixels, in 24-bit colour.");
  });

  it("says the screen is hidden when its size is zero", () => {
    expect(describeScreen({ ...desktop.screen, width: 0 }).status).toBe("hidden");
  });

  it("compares the window with the screen, and never keeps it in the mark", () => {
    const f = describeWindow({ innerWidth: 1280, innerHeight: 720, screenWidth: 1536, screenHeight: 864 });
    expect(say(f)).toBe("The window showing this page measures 1280 × 720, about 69% of your screen.");
    expect(f.stable).toBeNull();
    const zoomed = describeWindow({ innerWidth: 1600, innerHeight: 900, screenWidth: 1536, screenHeight: 864 });
    expect(say(zoomed)).toContain("as large as");
  });
});

describe("clock", () => {
  it("writes offsets the usual way", () => {
    expect(utcOffset(0)).toBe("UTC+0");
    expect(utcOffset(-330)).toBe("UTC+5:30");
    expect(utcOffset(480)).toBe("UTC−8");
  });

  it("derives the local clock from the offset alone", () => {
    expect(localClock(Date.UTC(2026, 10, 4, 23, 50), -330)).toEqual({ time: "05:20", day: "Thursday" });
    expect(localClock(Date.UTC(2026, 10, 4, 3, 5), 480)).toEqual({ time: "19:05", day: "Tuesday" });
  });

  it("names the zone, or says the browser did not", () => {
    expect(say(describeTime(desktop.time))).toBe(
      "Your clock says 14:32 on a Wednesday. Your time zone is Europe/Lisbon, UTC+0.",
    );
    const unnamed = describeTime({ ...desktop.time, zone: null });
    expect(say(unnamed)).toContain("does not name the time zone");
    expect(unnamed.status).toBe("partial");
  });
});

describe("languages and formats", () => {
  it("lists languages in the order the browser asks for them", () => {
    expect(say(describeLanguages(desktop.languages))).toBe(
      "Your browser asks websites for English (United Kingdom) first, then Portuguese (Portugal) and French.",
    );
    expect(say(describeLanguages(guarded.languages))).toBe(
      "Your browser asks websites for English (United States), and for nothing else.",
    );
    expect(describeLanguages({ tags: [], names: [] }).status).toBe("hidden");
  });

  it("falls back to the tag when a language has no name", () => {
    expect(say(describeLanguages({ tags: ["tlh"], names: [] }))).toContain("tlh");
  });

  it("shows the visitor's own way of writing dates and numbers", () => {
    expect(say(describeFormats(desktop.formats))).toBe(
      "You would write New Year's Eve as 31/12/2026, half past nine at night as 21:30 and a large number as 1,234,567.89. Your calendar is Gregorian.",
    );
    expect(describeFormats({ ...desktop.formats, locale: null }).status).toBe("hidden");
  });
});

describe("appearance and input", () => {
  it("reports preferences and the display's range", () => {
    expect(say(describeAppearance(desktop.appearance))).toBe(
      "You prefer a dark theme and full motion. Your display covers the wider P3 colour range and does not show HDR.",
    );
  });

  it("leaves HDR out when the browser does not understand the question", () => {
    expect(say(describeAppearance(guarded.appearance))).toBe(
      "You prefer a light theme and full motion. Your display covers the standard sRGB colour range.",
    );
  });

  it("mentions contrast and forced colours only when they are set", () => {
    const f = describeAppearance({ ...desktop.appearance, contrast: "more", forcedColors: true, reducedMotion: true });
    expect(say(f)).toContain("reduced motion, with more contrast.");
    expect(say(f)).toContain("forced colour palette");
  });

  it("recognises keyboard layouts from three keys", () => {
    expect(keyboardLayout({ KeyQ: "q", KeyW: "w", KeyY: "y" })).toBe("QWERTY");
    expect(keyboardLayout({ KeyQ: "q", KeyW: "w", KeyY: "z" })).toBe("QWERTZ");
    expect(keyboardLayout({ KeyQ: "a", KeyW: "z", KeyY: "y" })).toBe("AZERTY");
    expect(keyboardLayout({ KeyQ: "'", KeyW: ",", KeyY: "f" })).toBe("Dvorak");
    expect(keyboardLayout({ KeyQ: "q" })).toBeNull();
  });

  it("tells a mouse from a touch screen, and admits a hidden keyboard", () => {
    expect(say(describeInput(desktop.input))).toBe(
      "You point with a mouse or trackpad; the screen does not take touch. Your keyboard is laid out QWERTY.",
    );
    const phone = describeInput({ maxTouchPoints: 5, pointer: "coarse", keys: null });
    expect(say(phone)).toBe(
      "You use a touch screen that follows 5 fingers at once. It does not show me your keyboard layout.",
    );
    expect(phone.status).toBe("partial");
    expect(say(describeInput({ maxTouchPoints: 10, pointer: "fine", keys: null }))).toContain(
      "also takes touch, 10 fingers",
    );
  });
});

describe("hardware", () => {
  it("reports threads and memory, each only if given", () => {
    expect(say(describeHardware(desktop.hardware))).toBe(
      "Your processor offers 8 threads, and your browser admits to about 8 GB of memory.",
    );
    expect(say(describeHardware(guarded.hardware))).toBe(
      "Your processor offers 2 threads. Your browser does not say how much memory you have.",
    );
    expect(describeHardware({ threads: null, memoryGB: null }).status).toBe("hidden");
  });

  it("cleans up the renderer strings browsers really send", () => {
    expect(
      parseRenderer("ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002503) Direct3D11 vs_5_0 ps_5_0, D3D11)"),
    ).toEqual({ name: "NVIDIA GeForce RTX 3060", api: "Direct3D 11", approximate: false, software: false });
    expect(parseRenderer("ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)")).toMatchObject({
      name: "Apple M2",
      api: "Metal",
    });
    expect(
      parseRenderer("ANGLE (Intel, Intel(R) HD Graphics 400 Direct3D11 vs_5_0 ps_5_0), or similar"),
    ).toMatchObject({ name: "Intel HD Graphics 400", approximate: true });
    expect(parseRenderer("Apple GPU")).toMatchObject({ name: "Apple GPU", api: null });
    expect(
      parseRenderer("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)")
        .software,
    ).toBe(true);
  });

  it("writes the graphics line, with its hedge when the browser hedges", () => {
    expect(say(describeGraphics(desktop.graphics))).toBe(
      "Your graphics are drawn by Intel UHD Graphics 620, through Direct3D 11.",
    );
    const vague = describeGraphics({
      renderer: "ANGLE (Intel, Intel(R) HD Graphics 400 Direct3D11 vs_5_0 ps_5_0), or similar",
    });
    expect(say(vague)).toContain("or something close to it");
    expect(vague.status).toBe("partial");
    expect(describeGraphics(guarded.graphics).status).toBe("hidden");
  });

  it("rounds storage to a size a person would say", () => {
    expect(readableBytes(10 * 2 ** 30)).toBe("10 GB");
    expect(readableBytes(2.5 * 2 ** 30)).toBe("2.5 GB");
    expect(readableBytes(300 * 2 ** 20)).toBe("300 MB");
    expect(say(describeStorage(desktop.storage))).toContain("about 10 GB");
    expect(describeStorage({ quotaBytes: null }).status).toBe("hidden");
  });
});

describe("things that change by the minute", () => {
  it("reads the battery, and never keeps it in the mark", () => {
    const f = describeBattery(desktop.battery);
    expect(say(f)).toBe("Your battery is at 82% and running down.");
    expect(f.stable).toBeNull();
    expect(say(describeBattery({ level: 1, charging: true }))).toContain("or a machine with no battery");
    expect(describeBattery(null).status).toBe("hidden");
  });

  it("reads the connection the browser has already measured", () => {
    expect(say(describeConnection(desktop.connection))).toBe(
      "Your connection is rated 4g: about 10 Mbps down with a 50 ms round trip. Data saver is off.",
    );
    const none = describeConnection(guarded.connection);
    expect(say(none)).toBe("Your browser does not describe your connection. It says only that you are online.");
    expect(none.stable).toBeNull();
  });

  it("shows only the host of the page a visitor came from", () => {
    expect(referrerHost("https://example.org/a/page?q=1")).toBe("example.org");
    expect(referrerHost("")).toBeNull();
    expect(referrerHost("not a url")).toBeNull();
    expect(say(describeArrival(desktop.arrival))).toBe(
      "You followed a link here from example.org. This tab remembers 3 pages, though not which.",
    );
    expect(say(describeArrival(guarded.arrival))).toContain("directly");
  });
});

describe("fingerprint surfaces", () => {
  it("has no duplicate fonts to look for, and every added font is on the list", () => {
    expect(new Set(PROBES).size).toBe(PROBES.length);
    for (const name of ADDED) expect(PROBES).toContain(name);
  });

  it("points out fonts that come with no operating system", () => {
    expect(say(describeFonts(desktop.fonts))).toBe(
      "Of 52 fonts I looked for, 4 are installed, among them Fira Code, which comes with no operating system.",
    );
    expect(say(describeFonts({ probed: 52, found: ["Arial", "Georgia"] }))).toContain(
      "Every one of them ships with an operating system.",
    );
  });

  it("says the list is hidden when nothing is found", () => {
    expect(describeFonts(guarded.fonts).status).toBe("hidden");
    expect(describeFonts(null).status).toBe("hidden");
  });

  it("counts voices and their languages", () => {
    expect(say(describeVoices(desktop.voices))).toBe(
      "2 reading voices are installed, covering 2 languages. The first on the list is Microsoft Hazel.",
    );
    expect(describeVoices([]).status).toBe("hidden");
  });

  it("reports a canvas that repeats, and spots one that does not", () => {
    expect(grouped("c41e9a02")).toBe("c41e 9a02");
    const steady = describeCanvas(desktop.canvas);
    expect(say(steady)).toContain("c41e 9a02");
    expect(steady.stable).toBe("c41e9a02");
    const blurred = describeCanvas(guarded.canvas);
    expect(say(blurred)).toContain("two different results");
    expect(blurred.stable).toBeNull();
    expect(describeCanvas(null).status).toBe("hidden");
  });

  it("treats a silent or missing audio result as a refusal", () => {
    expect(say(describeAudio(desktop.audio))).toContain("124.04347527516074");
    expect(describeAudio({ sum: 0 }).status).toBe("hidden");
    expect(describeAudio(null).status).toBe("hidden");
  });

  it("reads the privacy flags as they are", () => {
    expect(say(describePrivacy(desktop.privacy))).toBe(
      "Cookies are allowed. You send neither a Do Not Track request nor a Global Privacy Control signal.",
    );
    expect(say(describePrivacy(guarded.privacy))).toContain(
      "both a Do Not Track request and a Global Privacy Control signal",
    );
    expect(say(describePrivacy({ ...desktop.privacy, webdriver: true }))).toContain("automation software");
  });
});
