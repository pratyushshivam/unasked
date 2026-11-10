import { describe, expect, it } from "vitest";
import { READERS } from "../src/collect";
import { arcLength, arcPath, buildRings, fallbackDigest, fnv1a } from "../src/mark";
import { allFindings, buildDossier, summarise } from "../src/profile";
import { text } from "../src/signals/types";
import { desktop, guarded } from "./fixtures";

describe("the dossier", () => {
  const chapters = buildDossier(desktop);
  const open = allFindings(chapters);
  const shut = allFindings(buildDossier(guarded));

  it("is told in six chapters", () => {
    expect(chapters.map((c) => c.id)).toEqual(["machine", "senses", "software", "place", "road", "speed"]);
    for (const chapter of chapters) {
      expect(chapter.title.length).toBeGreaterThan(3);
      expect(chapter.lede).toMatch(/\.$/);
      expect(chapter.findings.length).toBeGreaterThan(0);
    }
  });

  it("has forty-one lines, each with its own name, and the opening counts to the same number", () => {
    expect(open).toHaveLength(41);
    expect(new Set(open.map((f) => f.id)).size).toBe(41);
    expect(new Set(open.map((f) => f.label)).size).toBe(41);
    expect(READERS).toBe(open.length);
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

  it("keeps everything that changes by the minute out of the mark", () => {
    for (const id of ["window", "battery", "connection", "arrival", "latency", "speed", "gamepads"]) {
      expect(open.find((f) => f.id === id)?.stable, id).toBeNull();
    }
  });

  it("counts what was asked, answered and refused", () => {
    expect(summarise(open)).toMatchObject({ asked: 41, answered: 41, refused: 0, steady: 34 });
    const s = summarise(shut);
    expect(s.asked).toBe(41);
    expect(s.answered + s.refused).toBe(41);
    expect(s.refused).toBe(14);
  });

  it("is the same file for the same answers, and a different one when an answer changes", () => {
    expect(summarise(allFindings(buildDossier(desktop))).canonical).toBe(summarise(open).canonical);
    const moved = allFindings(buildDossier({ ...desktop, time: { ...desktop.time, zone: "Asia/Tokyo" } }));
    expect(summarise(moved).canonical).not.toBe(summarise(open).canonical);
  });

  it("does not change with the time of day, the battery, the load or the size of the window", () => {
    const later = allFindings(
      buildDossier({
        ...desktop,
        time: { ...desktop.time, now: desktop.time.now + 3_600_000 },
        window: { innerWidth: 900, innerHeight: 600 },
        battery: { level: 0.4, charging: true },
        benchmark: { rounds: 3_000_000, ms: 100 },
        timing: { wait: 300, connect: 0, protocol: "h3" },
      }),
    );
    expect(summarise(later).canonical).toBe(summarise(open).canonical);
  });
});

describe("the mark", () => {
  const findings = allFindings(buildDossier(desktop));
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
    const shut = buildRings(allFindings(buildDossier(guarded)), { inner: 30, outer: 230 });
    expect(shut.filter((r) => r.kind === "refused")).toHaveLength(14);
  });

  it("is the same shape for the same answers, and changes only where an answer changed", () => {
    expect(buildRings(allFindings(buildDossier(desktop)), { inner: 30, outer: 230 })).toEqual(rings);
    const other = buildRings(allFindings(buildDossier({ ...desktop, hardware: { threads: 12, memoryGB: 8 } })), {
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
