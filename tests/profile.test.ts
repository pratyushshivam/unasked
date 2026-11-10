import { describe, expect, it } from "vitest";
import { arcLength, arcPath, buildRings, fallbackDigest, fnv1a } from "../src/mark";
import { buildProfile, summarise } from "../src/profile";
import { text } from "../src/signals/types";
import { desktop, guarded } from "./fixtures";

describe("the letter", () => {
  const open = buildProfile(desktop);
  const shut = buildProfile(guarded);

  it("has twenty lines, each with its own name", () => {
    expect(open).toHaveLength(20);
    expect(new Set(open.map((f) => f.id)).size).toBe(20);
  });

  it("gives every line a full sentence, a method and a remedy", () => {
    for (const f of [...open, ...shut]) {
      expect(text(f.parts)).toMatch(/^[A-Z0-9].*\.$/);
      expect(text(f.parts)).not.toMatch(/undefined|null|NaN|\s{2,}/);
      expect(f.how.length).toBeGreaterThan(30);
      expect(f.reduce.length).toBeGreaterThan(30);
    }
  });

  it("never puts a refused answer into the mark", () => {
    for (const f of [...open, ...shut]) if (f.status === "hidden") expect(f.stable).toBeNull();
  });

  it("keeps the window, battery, connection and arrival out of the mark", () => {
    for (const id of ["window", "battery", "connection", "arrival"]) {
      expect(open.find((f) => f.id === id)?.stable).toBeNull();
    }
  });

  it("counts what was asked, answered and refused", () => {
    expect(summarise(open)).toMatchObject({ asked: 20, answered: 20, refused: 0, steady: 16 });
    const s = summarise(shut);
    expect(s.asked).toBe(20);
    expect(s.answered + s.refused).toBe(20);
    expect(s.refused).toBe(6);
  });

  it("is the same letter for the same answers, and a different one when an answer changes", () => {
    expect(summarise(buildProfile(desktop)).canonical).toBe(summarise(open).canonical);
    const moved = buildProfile({ ...desktop, time: { ...desktop.time, zone: "Asia/Tokyo" } });
    expect(summarise(moved).canonical).not.toBe(summarise(open).canonical);
  });

  it("does not change with the time of day, the battery or the size of the window", () => {
    const later = buildProfile({
      ...desktop,
      time: { ...desktop.time, now: desktop.time.now + 3_600_000 },
      window: { innerWidth: 900, innerHeight: 600 },
      battery: { level: 0.4, charging: true },
    });
    expect(summarise(later).canonical).toBe(summarise(open).canonical);
  });
});

describe("the mark", () => {
  const findings = buildProfile(desktop);
  const rings = buildRings(findings, { inner: 30, outer: 230 });

  it("hashes like FNV-1a", () => {
    expect(fnv1a("")).toBe(0x811c9dc5);
    expect(fnv1a("a")).toBe(0xe40c292c);
    expect(fnv1a("foobar")).toBe(0xbf9cf968);
    expect(fallbackDigest("x")).toMatch(/^[0-9a-f]{16}$/);
  });

  it("draws one ring for each line, from the inside out", () => {
    expect(rings).toHaveLength(findings.length);
    expect(rings[0]?.r).toBe(30);
    expect(rings.at(-1)?.r).toBeCloseTo(230);
    rings.forEach((ring, i) => {
      if (i > 0) expect(ring.r).toBeGreaterThan(rings[i - 1]?.r ?? 0);
    });
  });

  it("gives steady answers an open arc, and the rest a closed circle", () => {
    for (const ring of rings) {
      if (ring.kind === "steady") {
        expect(ring.sweep).toBeGreaterThanOrEqual(150);
        expect(ring.sweep).toBeLessThan(330);
      } else {
        expect(ring.sweep).toBe(360);
      }
    }
    const shut = buildRings(buildProfile(guarded), { inner: 30, outer: 230 });
    expect(shut.filter((r) => r.kind === "refused")).toHaveLength(6);
  });

  it("is the same shape for the same answers, and changes only where an answer changed", () => {
    expect(buildRings(buildProfile(desktop), { inner: 30, outer: 230 })).toEqual(rings);
    const other = buildRings(buildProfile({ ...desktop, hardware: { threads: 12, memoryGB: 8 } }), {
      inner: 30,
      outer: 230,
    });
    const changed = other.filter((ring, i) => JSON.stringify(ring) !== JSON.stringify(rings[i]));
    expect(changed.map((r) => r.id)).toEqual(["processor"]);
  });

  it("writes arcs as SVG paths", () => {
    expect(arcPath(100, 0, 90)).toBe("M0 -100A100 100 0 0 1 100 0");
    expect(arcPath(100, 0, 270)).toBe("M0 -100A100 100 0 1 1 -100 0");
    expect(arcPath(50, 0, 360)).toBe("M0 -50A50 50 0 1 1 0 50A50 50 0 1 1 0 -50");
    expect(arcLength(100, 180)).toBeCloseTo(Math.PI * 100);
  });
});
