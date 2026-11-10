import { describe, expect, it } from "vitest";
import { describeAppearance } from "../src/signals/appearance";
import { describeArrival, referrerHost, trackingTags } from "../src/signals/arrival";
import { describeAudio } from "../src/signals/audio";
import { describeAutomation } from "../src/signals/automation";
import { describeBattery } from "../src/signals/battery";
import { describeBenchmark, speedClass, spin } from "../src/signals/benchmark";
import { describeBlocker } from "../src/signals/blocker";
import { describeCanvas, grouped } from "../src/signals/canvas";
import { FORMATS, describeCodecs } from "../src/signals/codecs";
import { describeConnection } from "../src/signals/connection";
import { describeDisplay } from "../src/signals/display";
import { describeExtensions } from "../src/signals/extensions";
import { FEATURES, describeFeatures } from "../src/signals/features";
import { ADDED, PROBES, describeFonts } from "../src/signals/fonts";
import { describeFormats } from "../src/signals/formats";
import { describeGamepads } from "../src/signals/gamepads";
import { describeGraphics, parseRenderer } from "../src/signals/graphics";
import { describeHardware } from "../src/signals/hardware";
import { describeInput } from "../src/signals/input";
import { describeKeyboard, keyboardLayout } from "../src/signals/keyboard";
import { describeLanguages } from "../src/signals/languages";
import { SUMS, describeMaths, doSums } from "../src/signals/maths";
import { describeMediaDevices } from "../src/signals/mediaDevices";
import { describeMismatch } from "../src/signals/mismatch";
import { describePermissions } from "../src/signals/permissions";
import { describePlugins } from "../src/signals/plugins";
import { describePrivacy } from "../src/signals/privacy";
import { describeRefresh, nearestRate } from "../src/signals/refresh";
import { describeScreen } from "../src/signals/screen";
import { describeStorage, readableBytes } from "../src/signals/storage";
import { describeStorageAccess } from "../src/signals/storageAccess";
import { describeTime, localClock, utcOffset } from "../src/signals/time";
import { describeTimer, readableStep } from "../src/signals/timer";
import { describeTiming } from "../src/signals/timing";
import { type Finding, list, text, v } from "../src/signals/types";
import { describeVoices } from "../src/signals/voices";
import { describeWebgl, spaced } from "../src/signals/webgl";
import { describeWebgpu } from "../src/signals/webgpu";
import { describeWindow } from "../src/signals/window";
import { describeZoom } from "../src/signals/zoom";
import { desktop, guarded } from "./fixtures";

const say = (f: Finding): string => text(f.parts);
const hash = (s: string): string => String(s.length).padStart(8, "0");

describe("sentences", () => {
  it("joins lists the way a person writes them", () => {
    expect(text(list([v("a")]))).toBe("a");
    expect(text(list([v("a"), v("b")]))).toBe("a and b");
    expect(text(list([v("a"), v("b"), v("c")]))).toBe("a, b and c");
  });
});

describe("the machine", () => {
  it("works out real pixels and the space a taskbar takes", () => {
    expect(say(describeScreen(desktop.screen))).toBe(
      "Your screen is 1536 × 864 at 1.25× density, which comes to about 1920 × 1080 real pixels, in 24-bit colour. A taskbar, dock or menu bar takes 48 pixels of it.",
    );
    expect(say(describeScreen(guarded.screen))).toBe("Your screen is 1400 × 900 pixels, in 24-bit colour.");
    expect(describeScreen({ ...desktop.screen, width: 0 }).status).toBe("hidden");
  });

  it("does not pretend to separate display scaling from zoom", () => {
    expect(say(describeZoom({ dpr: 1.25, pinch: 1 }))).toBe(
      "Your pixel ratio is 1.25, a number that blends your display's scaling with your page zoom; pinch zoom is at 1×.",
    );
    expect(say(describeZoom({ dpr: 2, pinch: null }))).not.toContain("pinch");
  });

  it("describes what the panel can show", () => {
    expect(say(describeDisplay(desktop.display))).toBe(
      "Your display covers the wider P3 colour range and does not show HDR. It is turned the wide way.",
    );
    expect(say(describeDisplay(guarded.display))).toBe("Your display covers the standard sRGB colour range.");
    expect(describeDisplay({ gamut: null, hdr: null, orientation: null }).status).toBe("hidden");
  });

  it("snaps a measured frame rate to a rate screens are built with", () => {
    expect(nearestRate(59.94)).toBe(60);
    expect(nearestRate(143.2)).toBe(144);
    expect(nearestRate(119.5)).toBe(120);
    expect(nearestRate(83)).toBe(83);
    expect(say(describeRefresh(59.94))).toBe("Your screen redraws about 60 times a second.");
    expect(describeRefresh(null).status).toBe("hidden");
  });

  it("compares the window with the screen, and never keeps it in the mark", () => {
    const f = describeWindow({ innerWidth: 1280, innerHeight: 720, screenWidth: 1536, screenHeight: 864 });
    expect(say(f)).toBe("The window showing this page measures 1280 × 720, about 69% of your screen.");
    expect(f.stable).toBeNull();
  });

  it("tells a mouse from a touch screen", () => {
    expect(say(describeInput(desktop.input))).toBe("You point with a mouse or trackpad; the screen does not take touch.");
    expect(say(describeInput({ maxTouchPoints: 5, pointer: "coarse", hover: false }))).toBe(
      "You use a touch screen that follows 5 fingers at once.",
    );
    expect(say(describeInput({ maxTouchPoints: 10, pointer: "fine", hover: true }))).toContain("also takes touch, 10 fingers");
  });

  it("reports threads and memory, each only if given", () => {
    expect(say(describeHardware(desktop.hardware))).toBe(
      "Your processor offers 8 threads, and your browser admits to about 8 GB of memory.",
    );
    expect(say(describeHardware(guarded.hardware))).toBe(
      "Your processor offers 2 threads. Your browser does not say how much memory you have.",
    );
    expect(describeHardware({ threads: null, memoryGB: null }).status).toBe("hidden");
  });

  it("reads the battery and the storage allowance", () => {
    expect(say(describeBattery(desktop.battery))).toBe("Your battery is at 82% and running down.");
    expect(say(describeBattery({ level: 1, charging: true }))).toContain("or a machine with no battery");
    expect(describeBattery(null).status).toBe("hidden");
    expect(readableBytes(10 * 2 ** 30)).toBe("10 GB");
    expect(readableBytes(2.5 * 2 ** 30)).toBe("2.5 GB");
    expect(readableBytes(300 * 2 ** 20)).toBe("300 MB");
    expect(say(describeStorage(desktop.storage))).toContain("about 10 GB");
  });

  it("waits for a controller to show itself", () => {
    expect(say(describeGamepads([]))).toContain("No game controller has shown itself");
    expect(say(describeGamepads(["Wireless Controller (STANDARD GAMEPAD)"]))).toContain("Wireless Controller");
    expect(describeGamepads(null).status).toBe("hidden");
    expect(describeGamepads(["x"]).stable).toBeNull();
  });
});

describe("its eyes and ears", () => {
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
    expect(say(describeGraphics(desktop.graphics))).toBe(
      "Your graphics are drawn by Intel UHD Graphics 620, through Direct3D 11.",
    );
    expect(describeGraphics(guarded.graphics).status).toBe("hidden");
  });

  it("counts and hashes what the graphics driver offers", () => {
    expect(spaced("7dc040fb")).toBe("7dc0 40fb");
    const f = describeWebgl(desktop.webgl, hash);
    expect(say(f)).toContain("3 optional extensions and textures up to 16,384 pixels wide");
    expect(f.stable).toMatch(/^\d{8}$/);
    const fewer = describeWebgl({ ...desktop.webgl!, extensions: ["EXT_blend_minmax"] }, hash);
    expect(fewer.stable).not.toBe(f.stable);
    expect(describeWebgl(null, hash).status).toBe("hidden");
  });

  it("tells a browser without WebGPU from one that would not answer", () => {
    expect(say(describeWebgpu(desktop.webgpu))).toBe(
      "Through WebGPU, your graphics chip calls itself intel, gen-9 and offers 12 optional features.",
    );
    expect(say(describeWebgpu("absent"))).toContain("does not offer WebGPU");
    expect(say(describeWebgpu(null))).toContain("would not give me an adapter");
  });

  it("reports a canvas that repeats, and spots one that does not", () => {
    expect(grouped("c41e9a02")).toBe("c41e 9a02");
    expect(describeCanvas(desktop.canvas).stable).toBe("c41e9a02");
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

  it("does the same sums every time on the same engine", () => {
    expect(doSums()).toBe(doSums());
    expect(doSums().split("|")).toHaveLength(SUMS.length);
    expect(say(describeMaths("6638adaf"))).toContain(`${SUMS.length} sums, rounded its own way, hash to 6638 adaf`);
    expect(describeMaths(null).status).toBe("hidden");
  });

  it("names the formats a browser will not play, when they are few", () => {
    expect(new Set(FORMATS.map(([name]) => name)).size).toBe(FORMATS.length);
    expect(say(describeCodecs(desktop.codecs))).toBe(
      "Your browser plays 9 of the 12 video and sound formats I asked about, all but HEVC, Dolby Vision and Dolby Digital.",
    );
    expect(say(describeCodecs(guarded.codecs))).toBe("Your browser plays 7 of the 12 video and sound formats I asked about.");
    expect(describeCodecs(null).status).toBe("hidden");
  });

  it("says only what kinds of media device exist, and credits the browser for hiding the rest", () => {
    const f = describeMediaDevices(desktop.media);
    expect(say(f)).toBe(
      "This device has at least a camera, a microphone and a sound output. I did not ask to use them, and your browser kept their names back.",
    );
    expect(f.status).toBe("partial");
    expect(say(describeMediaDevices({ cameras: 0, microphones: 0, speakers: 0 }))).toContain("no camera and no microphone");
    expect(describeMediaDevices(null).status).toBe("hidden");
  });

  it("counts voices and their languages", () => {
    expect(say(describeVoices(desktop.voices))).toBe(
      "2 reading voices are installed, covering 2 languages. The first on the list is Microsoft Hazel.",
    );
    expect(describeVoices([]).status).toBe("hidden");
  });
});

describe("what runs on it", () => {
  it("has no duplicates in the lists it tests against", () => {
    expect(new Set(PROBES).size).toBe(PROBES.length);
    for (const name of ADDED) expect(PROBES).toContain(name);
    expect(new Set(FEATURES).size).toBe(FEATURES.length);
    for (const feature of FEATURES) expect(feature).toMatch(/^(navigator|window)\.\w+$/);
  });

  it("hashes the set of abilities, so a different set is a different answer", () => {
    const f = describeFeatures(desktop.features, hash);
    expect(say(f)).toContain("Of 40 newer browser abilities I tested for, yours has 3.");
    expect(describeFeatures(guarded.features, hash).stable).not.toBe(f.stable);
  });

  it("points out fonts that come with no operating system", () => {
    expect(say(describeFonts(desktop.fonts))).toBe(
      "Of 52 fonts I looked for, 4 are installed, among them Fira Code, which comes with no operating system.",
    );
    expect(say(describeFonts({ probed: 52, found: ["Arial", "Georgia"] }))).toContain(
      "Every one of them ships with an operating system.",
    );
    expect(describeFonts(guarded.fonts).status).toBe("hidden");
  });

  it("recognises the frozen plug-in list for what it is", () => {
    expect(say(describePlugins(desktop.plugins))).toBe(
      "Your browser lists 2 plug-ins, every one a PDF viewer: a fixed list that now says nothing about you. It opens PDFs itself.",
    );
    expect(say(describePlugins({ names: [], pdfViewer: null }))).toBe("Your browser lists no plug-ins.");
    expect(say(describePlugins({ names: ["Shockwave Flash"], pdfViewer: false }))).toContain("the first of them Shockwave Flash");
  });

  it("reports the bait test both ways, and its limit", () => {
    expect(say(describeBlocker(true))).toContain("you are running a content blocker");
    expect(say(describeBlocker(false))).toContain("or yours works on the network");
    expect(describeBlocker(null).status).toBe("hidden");
  });

  it("lists only the extensions that left a mark, and says the rest cannot be seen", () => {
    expect(say(describeExtensions([]))).toContain("the careful ones cannot be seen from here");
    expect(say(describeExtensions(["a crypto wallet", "a grammar checker"]))).toBe(
      "Left behind on this page by your extensions: the marks of a crypto wallet and a grammar checker.",
    );
  });

  it("sorts a person from a robot by what the browser itself says", () => {
    expect(say(describeAutomation(desktop.automation))).toContain("no automation");
    expect(say(describeAutomation({ webdriver: true, headlessLabel: true, noLanguages: false }))).toBe(
      "Your browser looks driven by software: the automation flag is raised and the label says headless.",
    );
  });

  it("reports settings, and only the accessibility ones that are on", () => {
    expect(say(describeAppearance(desktop.appearance))).toBe(
      "You prefer a dark theme and full motion. No accessibility setting that a page can see is switched on.",
    );
    const f = describeAppearance({ ...desktop.appearance, contrast: "more", forcedColors: true, reducedMotion: true });
    expect(say(f)).toContain("reduced motion, with more contrast.");
    expect(say(f)).toContain("You have also asked for a forced colour palette.");
  });

  it("reads the privacy requests as they are", () => {
    expect(say(describePrivacy(desktop.privacy))).toBe(
      "You send neither a Do Not Track request nor a Global Privacy Control signal.",
    );
    expect(say(describePrivacy(guarded.privacy))).toContain("both a Do Not Track request and a Global Privacy Control signal");
  });

  it("lists where a site may keep things, and what is closed", () => {
    expect(say(describeStorageAccess(desktop.storageAccess))).toBe(
      "A site may leave things in your browser by way of cookies, local storage, session storage, a database and a background worker.",
    );
    expect(say(describeStorageAccess(guarded.storageAccess))).toContain("Closed to it: a background worker.");
  });

  it("reads which permissions a site holds without asking for any", () => {
    expect(say(describePermissions(desktop.permissions))).toBe(
      "This site holds no permissions. For your location, camera, microphone and notifications it would have to ask first, and it will not.",
    );
    expect(say(describePermissions({ location: "granted", camera: "denied" }))).toBe(
      "This site is already allowed your location. It has been refused your camera.",
    );
    expect(describePermissions(null).status).toBe("hidden");
  });
});

describe("where and who", () => {
  it("writes offsets the usual way and derives the local clock from the offset alone", () => {
    expect(utcOffset(0)).toBe("UTC+0");
    expect(utcOffset(-330)).toBe("UTC+5:30");
    expect(utcOffset(480)).toBe("UTC−8");
    expect(localClock(Date.UTC(2026, 10, 4, 23, 50), -330)).toEqual({ time: "05:20", day: "Thursday" });
    expect(say(describeTime(desktop.time))).toBe(
      "Your clock says 14:32 on a Wednesday. Your time zone is Europe/Lisbon, UTC+0.",
    );
    expect(describeTime({ ...desktop.time, zone: null }).status).toBe("partial");
  });

  it("lists languages in the order the browser asks for them", () => {
    expect(say(describeLanguages(desktop.languages))).toBe(
      "Your browser asks websites for English (United Kingdom) first, then Portuguese (Portugal) and French.",
    );
    expect(say(describeLanguages(guarded.languages))).toBe(
      "Your browser asks websites for English (United States), and for nothing else.",
    );
    expect(describeLanguages({ tags: [], names: [] }).status).toBe("hidden");
  });

  it("shows the visitor's own way of writing dates and numbers", () => {
    expect(say(describeFormats(desktop.formats))).toBe(
      "You would write New Year's Eve as 31/12/2026, half past nine at night as 21:30 and a large number as 1,234,567.89. Your calendar is Gregorian.",
    );
    expect(describeFormats({ ...desktop.formats, locale: null }).status).toBe("hidden");
  });

  it("recognises keyboard layouts from three keys, and credits a browser that hides them", () => {
    expect(keyboardLayout({ KeyQ: "q", KeyW: "w", KeyY: "y" })).toBe("QWERTY");
    expect(keyboardLayout({ KeyQ: "q", KeyW: "w", KeyY: "z" })).toBe("QWERTZ");
    expect(keyboardLayout({ KeyQ: "a", KeyW: "z", KeyY: "y" })).toBe("AZERTY");
    expect(keyboardLayout({ KeyQ: "'", KeyW: ",", KeyY: "f" })).toBe("Dvorak");
    expect(keyboardLayout({ KeyQ: "q" })).toBeNull();
    expect(say(describeKeyboard(desktop.keys))).toBe("Your keyboard is laid out QWERTY.");
    expect(describeKeyboard(null).status).toBe("hidden");
  });

  it("notices when language and clock point to different places, and stays silent when it cannot tell", () => {
    expect(say(describeMismatch(desktop.mismatch))).toBe(
      "Your language says United Kingdom, but your clock says Europe/Lisbon, which is somewhere else. A traveller, an expatriate, or a borrowed setting.",
    );
    expect(say(describeMismatch({ ...desktop.mismatch, zone: "Europe/London" }))).toBe(
      "Your language says United Kingdom and your clock agrees: Europe/London is one of its time zones.",
    );
    expect(describeMismatch(guarded.mismatch).status).toBe("hidden");
    expect(describeMismatch({ region: null, regionName: null, zone: "UTC", regionZones: null }).status).toBe("hidden");
  });
});

describe("the road here", () => {
  it("shows only the host a visitor came from, and how the page was reached", () => {
    expect(referrerHost("https://example.org/a/page?q=1")).toBe("example.org");
    expect(referrerHost("not a url")).toBeNull();
    expect(say(describeArrival(desktop.arrival))).toBe(
      "You followed a link here from example.org. This tab remembers 3 pages, though not which.",
    );
    expect(say(describeArrival({ ...guarded.arrival, kind: "reload" }))).toContain("You reloaded this page.");
    expect(say(describeArrival({ ...guarded.arrival, kind: "back_forward" }))).toContain("back or forward");
    expect(say(describeArrival(guarded.arrival))).toContain("directly");
  });

  it("finds tracking tags in an address by name, never by value", () => {
    expect(trackingTags("?utm_source=x&id=7&fbclid=abc&page=2")).toEqual(["utm_source", "fbclid"]);
    expect(trackingTags("")).toEqual([]);
    const f = describeArrival({ ...desktop.arrival, tags: ["utm_source", "fbclid"] });
    expect(say(f)).toContain("The link carried tracking tags: utm_source and fbclid.");
    expect(say(f)).not.toContain("abc");
  });

  it("reads the connection the browser has already measured", () => {
    expect(say(describeConnection(desktop.connection))).toBe(
      "Your connection is rated 4g: about 10 Mbps down with a 50 ms round trip. Data saver is off.",
    );
    expect(say(describeConnection(guarded.connection))).toBe(
      "Your browser does not describe your connection. It says only that you are online.",
    );
  });

  it("reads how long the server took from the browser's own record", () => {
    const f = describeTiming(desktop.timing);
    expect(say(f)).toBe(
      "The server took 42 ms to begin answering when you asked for this page, after 18 ms to open the connection, over HTTP/2.",
    );
    expect(f.stable).toBeNull();
    expect(say(describeTiming({ wait: 12, connect: 0, protocol: null }))).toBe(
      "The server took 12 ms to begin answering when you asked for this page.",
    );
    expect(describeTiming(null).status).toBe("hidden");
  });
});

describe("how fast", () => {
  it("runs a sum that cannot be skipped", () => {
    expect(spin(1000)).toBe(spin(1000));
    expect(spin(1000)).not.toBe(spin(1001));
  });

  it("sorts a machine into a class on a scale it admits is its own", () => {
    expect(speedClass(60_000, 65_000)).toBe("fast");
    expect(speedClass(20_000, 65_000)).toBe("middling");
    expect(speedClass(5_000, 65_000)).toBe("slow");
    const f = describeBenchmark(desktop.benchmark);
    expect(say(f)).toBe(
      "Your processor got through 5.2 million rounds of a fixed sum in 100 ms. By my rough scale: a fast machine.",
    );
    expect(f.how).toContain("my own rough scale");
    expect(f.stable).toBeNull();
    expect(describeBenchmark(null).status).toBe("hidden");
  });

  it("reports how coarse the page's clock is", () => {
    expect(readableStep(0.1)).toBe("100 microseconds");
    expect(readableStep(0.005)).toBe("5 microseconds");
    expect(readableStep(1)).toBe("1 ms");
    expect(say(describeTimer(desktop.timer))).toBe(
      "Your browser lets a page tell the time in steps of 100 microseconds, blurred on purpose. It allows a page about 4.0 GB of working memory.",
    );
    expect(say(describeTimer(guarded.timer))).toBe(
      "Your browser lets a page tell the time in steps of 1 ms, blurred on purpose.",
    );
    expect(describeTimer(null).status).toBe("hidden");
  });
});
