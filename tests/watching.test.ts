import { describe, expect, it } from "vitest";
import { LOOKUP, LOOKUP_HOST, describeAddress, parseAddress } from "../src/address";
import * as B from "../src/behaviour";
import { ago, nextNote, parseNote, recognise } from "../src/recognise";
import { text } from "../src/signals/types";

describe("watching the pointer", () => {
  it("adds up distance, and measures speed only between moves close in time", () => {
    const b = B.start(0);
    B.move(b, 0, 0, 0);
    B.move(b, 30, 40, 50);
    expect(b.distance).toBe(50);
    expect(b.topSpeed).toBe(1000);
    B.move(b, 330, 440, 5000);
    expect(b.distance).toBe(550);
    expect(b.topSpeed).toBe(1000);
  });

  it("counts a long stillness as a hesitation and remembers the longest", () => {
    const b = B.start(0);
    B.move(b, 0, 0, 0);
    B.move(b, 1, 0, 500);
    B.move(b, 2, 0, 500 + B.PAUSE_MS + 300);
    B.move(b, 3, 0, 9000);
    expect(b.pauses).toBe(2);
    expect(b.longestPause).toBe(9000 - (500 + B.PAUSE_MS + 300));
  });

  it("lets the shown speed fall to rest when the pointer stops", () => {
    const b = B.start(0);
    B.move(b, 0, 0, 0);
    B.move(b, 100, 0, 16);
    expect(b.speed).toBeGreaterThan(0);
    for (let t = 200; t < 4000; t += 200) B.settle(b, t);
    expect(b.speed).toBe(0);
  });
});

describe("watching the reading", () => {
  it("tracks how far down the page was reached, and changes of mind", () => {
    const b = B.start(0, 0);
    B.scroll(b, 500, 4000, 1000);
    B.scroll(b, 1000, 4000, 1000);
    expect(b.deepest).toBe(0.5);
    B.scroll(b, 600, 4000, 1000);
    B.scroll(b, 1200, 4000, 1000);
    expect(b.reversals).toBe(2);
    expect(b.scrolled).toBe(2000);
    B.scroll(b, 3000, 4000, 1000);
    expect(b.deepest).toBe(1);
  });

  it("separates time on the page from time spent elsewhere", () => {
    const b = B.start(0);
    B.visibility(b, true, 10_000);
    expect(B.activeMs(b, 25_000)).toBe(10_000);
    B.visibility(b, false, 40_000);
    expect(b.switches).toBe(1);
    expect(b.awayMs).toBe(30_000);
    expect(B.activeMs(b, 45_000)).toBe(15_000);
    expect(B.clock(75_000)).toBe("1:15");
  });
});

describe("watching the typing", () => {
  it("measures rhythm without ever being given a letter", () => {
    const b = B.start(0);
    for (let i = 0; i < 6; i++) {
      B.keyDown(b, "x");
      B.keyUp(b, 80, 1000 + i * 200);
    }
    B.keyDown(b, "Backspace");
    expect(b.keys).toBe(6);
    expect(b.corrections).toBe(1);
    expect(B.averageHold(b)).toBe(80);
    expect(B.averageGap(b)).toBe(200);
    expect(B.typingPace(b)).toBe(300);
  });

  it("says nothing until there is enough to go on", () => {
    const b = B.start(0);
    B.keyUp(b, 90, 100);
    expect(B.averageHold(b)).toBeNull();
    expect(B.typingPace(b)).toBeNull();
  });
});

describe("guessing a hand", () => {
  it("waits for twelve touches, then leans with them", () => {
    const b = B.start(0);
    for (let i = 0; i < 11; i++) B.touch(b, 300, 390);
    expect(B.handedness(b)).toBeNull();
    B.touch(b, 300, 390);
    expect(B.handedness(b)).toBe("right");
    const left = B.start(0);
    for (let i = 0; i < 12; i++) B.touch(left, 60, 390);
    expect(B.handedness(left)).toBe("left");
    const both = B.start(0);
    for (let i = 0; i < 12; i++) B.touch(both, i % 2 ? 60 : 300, 390);
    expect(B.handedness(both)).toBe("either");
  });
});

describe("recognising a return visit", () => {
  const day = 86_400_000;

  it("meets a new browser as a stranger and writes a first note", () => {
    const seen = recognise(null, "aaaa", 1000);
    expect(seen.returning).toBe(false);
    expect(text(seen.headline)).toBe("I have not seen this browser before.");
    expect(nextNote(null, "aaaa", 1000)).toEqual({ mark: "aaaa", first: 1000, last: 1000, visits: 1 });
  });

  it("knows a returning browser, counts the visit and keeps the first mark", () => {
    const note = { mark: "aaaa", first: 0, last: 0, visits: 2 };
    const seen = recognise(note, "aaaa", 3 * day);
    expect(text(seen.headline)).toBe("I know you. This is visit 3.");
    expect(text(seen.detail)).toContain("3 days ago");
    expect(seen.sameMark).toBe(true);
    expect(nextNote(note, "bbbb", 3 * day)).toEqual({ mark: "aaaa", first: 0, last: 3 * day, visits: 3 });
  });

  it("says so when the mark has changed", () => {
    const seen = recognise({ mark: "aaaa", first: 0, last: 0, visits: 1 }, "bbbb", day);
    expect(seen.sameMark).toBe(false);
    expect(text(seen.detail)).toContain("changed");
  });

  it("ignores anything in storage that is not its own note", () => {
    expect(parseNote(null)).toBeNull();
    expect(parseNote("not json")).toBeNull();
    expect(parseNote('{"mark":1}')).toBeNull();
    expect(parseNote('{"mark":"aaaa","first":1,"last":2,"visits":3}')).toEqual({ mark: "aaaa", first: 1, last: 2, visits: 3 });
  });

  it("tells time the way a person would", () => {
    expect(ago(20_000)).toBe("moments ago");
    expect(ago(60_000)).toBe("a minute ago");
    expect(ago(45 * 60_000)).toBe("45 minutes ago");
    expect(ago(3 * 3_600_000)).toBe("3 hours ago");
    expect(ago(day)).toBe("yesterday");
  });
});

describe("the address lookup", () => {
  // 203.0.113.0/24 is reserved for documentation: it is nobody's address.
  const answer = { ip: "203.0.113.7", city: "Lisbon", region: "Lisbon", country: "PT", org: "AS64500 Example Net", timezone: "Europe/Lisbon" };

  it("goes to one named host over a secure connection", () => {
    expect(new URL(LOOKUP).host).toBe(LOOKUP_HOST);
    expect(new URL(LOOKUP).protocol).toBe("https:");
  });

  it("reads the answer and drops the network number from the provider", () => {
    expect(parseAddress(answer)).toEqual({ ip: "203.0.113.7", place: "Lisbon, Lisbon, PT", provider: "Example Net", zone: "Europe/Lisbon" });
    expect(parseAddress({})).toBeNull();
    expect(parseAddress("no")).toBeNull();
  });

  it("says the place is a guess, and notices when the clock disagrees with the address", () => {
    const address = parseAddress(answer);
    if (!address) throw new Error("no address");
    const agree = describeAddress(address, "Europe/Lisbon").map(text);
    expect(agree[0]).toBe("Your address on the internet is 203.0.113.7.");
    expect(agree[1]).toContain("Near, not at");
    expect(agree.at(-1)).toContain("They agree.");
    expect(describeAddress(address, "Asia/Tokyo").map(text).at(-1)).toContain("your clock gave it away");
    expect(describeAddress(address, null)).toHaveLength(3);
  });
});
