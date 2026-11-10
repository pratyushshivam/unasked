// Turns a snapshot of what the browser reported into the chapters of the dossier.
// Pure: no browser objects are touched here, so the same code runs in the tests.

import { fnv1a, hex8 } from "./mark";
import { type AppearanceInput, describeAppearance } from "./signals/appearance";
import { type ArrivalInput, describeArrival } from "./signals/arrival";
import { type AudioInput, describeAudio } from "./signals/audio";
import { type AutomationInput, describeAutomation } from "./signals/automation";
import { type BatteryInput, describeBattery } from "./signals/battery";
import { type BenchmarkInput, describeBenchmark } from "./signals/benchmark";
import { describeBlocker } from "./signals/blocker";
import { describeBrowser } from "./signals/browser";
import { type CanvasInput, describeCanvas } from "./signals/canvas";
import { type CodecsInput, describeCodecs } from "./signals/codecs";
import { type ConnectionInput, describeConnection } from "./signals/connection";
import { describeDevice } from "./signals/device";
import { type DisplayInput, describeDisplay } from "./signals/display";
import { describeExtensions } from "./signals/extensions";
import { type FeaturesInput, describeFeatures } from "./signals/features";
import { type FontsInput, describeFonts } from "./signals/fonts";
import { type FormatsInput, describeFormats } from "./signals/formats";
import { describeGamepads } from "./signals/gamepads";
import { type GraphicsInput, describeGraphics } from "./signals/graphics";
import { type HardwareInput, describeHardware } from "./signals/hardware";
import { type InputInput, describeInput } from "./signals/input";
import { type Keys, describeKeyboard } from "./signals/keyboard";
import { type LanguagesInput, describeLanguages } from "./signals/languages";
import { describeMaths } from "./signals/maths";
import { type MediaDevicesInput, describeMediaDevices } from "./signals/mediaDevices";
import { type MismatchInput, describeMismatch } from "./signals/mismatch";
import { type PermissionAnswer, describePermissions } from "./signals/permissions";
import { type PluginsInput, describePlugins } from "./signals/plugins";
import { type PrivacyInput, describePrivacy } from "./signals/privacy";
import { describeRefresh } from "./signals/refresh";
import { type ScreenInput, describeScreen } from "./signals/screen";
import { type StorageInput, describeStorage } from "./signals/storage";
import { type StorageAccessInput, describeStorageAccess } from "./signals/storageAccess";
import { type TimeInput, describeTime } from "./signals/time";
import { type TimerInput, describeTimer } from "./signals/timer";
import { type TimingInput, describeTiming } from "./signals/timing";
import type { Finding } from "./signals/types";
import type { UaHints } from "./signals/ua";
import { type Voice, describeVoices } from "./signals/voices";
import { type WebglInput, describeWebgl } from "./signals/webgl";
import { type WebgpuInput, describeWebgpu } from "./signals/webgpu";
import { describeWindow } from "./signals/window";
import { describeZoom } from "./signals/zoom";

/** Everything the page read, as plain data. */
export interface Snapshot {
  ua: string;
  hints: UaHints | null;
  brave: boolean;
  screen: ScreenInput;
  window: { innerWidth: number; innerHeight: number };
  display: DisplayInput;
  refreshHz: number | null;
  pinch: number | null;
  input: InputInput;
  gamepads: string[] | null;
  hardware: HardwareInput;
  battery: BatteryInput | null;
  storage: StorageInput;

  graphics: GraphicsInput;
  webgl: WebglInput | null;
  webgpu: WebgpuInput | null | "absent";
  canvas: CanvasInput | null;
  audio: AudioInput | null;
  /** The answers to the awkward sums, joined. null when they could not be done. */
  maths: string | null;
  codecs: CodecsInput | null;
  media: MediaDevicesInput | null;
  voices: Voice[] | null;

  features: FeaturesInput;
  fonts: FontsInput | null;
  plugins: PluginsInput;
  blocker: boolean | null;
  extensions: string[];
  automation: AutomationInput;
  privacy: PrivacyInput;
  storageAccess: StorageAccessInput;
  permissions: Record<string, PermissionAnswer> | null;
  appearance: AppearanceInput;

  time: TimeInput;
  languages: LanguagesInput;
  formats: FormatsInput;
  keys: Keys | null;
  mismatch: MismatchInput;

  connection: ConnectionInput;
  timing: TimingInput | null;
  arrival: ArrivalInput;

  benchmark: BenchmarkInput | null;
  timer: TimerInput | null;
}

export interface Chapter {
  id: string;
  title: string;
  /** One or two sentences that open the chapter. */
  lede: string;
  findings: Finding[];
}

const digest = (s: string): string => hex8(fnv1a(s));

/** The dossier, chapter by chapter, in the order it is read. */
export function buildDossier(s: Snapshot): Chapter[] {
  return [
    {
      id: "machine",
      title: "The machine",
      lede: "What you are holding or sitting at. Your browser describes it to every page, in more detail than a shop assistant could by looking.",
      findings: [
        describeDevice({ ua: s.ua, hints: s.hints, maxTouchPoints: s.input.maxTouchPoints }),
        describeHardware(s.hardware),
        describeBattery(s.battery),
        describeStorage(s.storage),
        describeScreen(s.screen),
        describeZoom({ dpr: s.screen.dpr, pinch: s.pinch }),
        describeDisplay(s.display),
        describeRefresh(s.refreshHz),
        describeWindow({ ...s.window, screenWidth: s.screen.width, screenHeight: s.screen.height }),
        describeInput(s.input),
        describeGamepads(s.gamepads),
      ],
    },
    {
      id: "senses",
      title: "Its eyes and ears",
      lede: "Graphics, sound and video. No two combinations of chip, driver and system draw a picture or mix a tone in quite the same way, and that difference can be read.",
      findings: [
        describeGraphics(s.graphics),
        describeWebgl(s.webgl, digest),
        describeWebgpu(s.webgpu),
        describeCanvas(s.canvas),
        describeAudio(s.audio),
        describeMaths(s.maths === null ? null : digest(s.maths)),
        describeCodecs(s.codecs),
        describeMediaDevices(s.media),
        describeVoices(s.voices),
      ],
    },
    {
      id: "software",
      title: "What runs on it",
      lede: "Your browser, what is installed beside it, and how you have set it up. Settings are choices, and choices are what tell people apart.",
      findings: [
        describeBrowser({ ua: s.ua, hints: s.hints, brave: s.brave }),
        describeFeatures(s.features, digest),
        describeFonts(s.fonts),
        describePlugins(s.plugins),
        describeBlocker(s.blocker),
        describeExtensions(s.extensions),
        describeAutomation(s.automation),
        describeAppearance(s.appearance),
        describePrivacy(s.privacy),
        describeStorageAccess(s.storageAccess),
        describePermissions(s.permissions),
      ],
    },
    {
      id: "place",
      title: "Where and who",
      lede: "No location was asked for. A clock, a language and a way of writing dates narrow the map on their own.",
      findings: [
        describeTime(s.time),
        describeLanguages(s.languages),
        describeFormats(s.formats),
        describeKeyboard(s.keys),
        describeMismatch(s.mismatch),
      ],
    },
    {
      id: "road",
      title: "The road here",
      lede: "How you reached this page, and what the journey looked like from the other end.",
      findings: [describeArrival(s.arrival), describeConnection(s.connection), describeTiming(s.timing)],
    },
    {
      id: "speed",
      title: "How fast",
      lede: "A tenth of a second of arithmetic is enough to put a machine in its class.",
      findings: [describeBenchmark(s.benchmark), describeTimer(s.timer)],
    },
  ];
}

export const allFindings = (chapters: Chapter[]): Finding[] => chapters.flatMap((chapter) => chapter.findings);

export interface Summary {
  /** How many things the page looked for. */
  asked: number;
  /** How many the browser answered, in full or in part. */
  answered: number;
  /** How many it refused. */
  refused: number;
  /** How many answers hold still between visits, and so go into the mark. */
  steady: number;
  /** The steady answers written out, one per line. This is what gets hashed. */
  canonical: string;
}

export function summarise(findings: Finding[]): Summary {
  const steady = findings.filter((f) => f.stable !== null);
  const refused = findings.filter((f) => f.status === "hidden").length;
  return {
    asked: findings.length,
    answered: findings.length - refused,
    refused,
    steady: steady.length,
    canonical: steady.map((f) => `${f.id}=${f.stable}`).join("\n"),
  };
}
