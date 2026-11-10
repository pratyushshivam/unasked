// Turns a snapshot of what the browser reported into the lines of the letter.
// Pure: no browser objects are touched here, so the same code runs in the tests.

import { type AppearanceInput, describeAppearance } from "./signals/appearance";
import { type ArrivalInput, describeArrival } from "./signals/arrival";
import { type AudioInput, describeAudio } from "./signals/audio";
import { type BatteryInput, describeBattery } from "./signals/battery";
import { describeBrowser } from "./signals/browser";
import { type CanvasInput, describeCanvas } from "./signals/canvas";
import { type ConnectionInput, describeConnection } from "./signals/connection";
import { describeDevice } from "./signals/device";
import { type FontsInput, describeFonts } from "./signals/fonts";
import { type FormatsInput, describeFormats } from "./signals/formats";
import { type GraphicsInput, describeGraphics } from "./signals/graphics";
import { type HardwareInput, describeHardware } from "./signals/hardware";
import { type InputInput, describeInput } from "./signals/input";
import { type LanguagesInput, describeLanguages } from "./signals/languages";
import { type PrivacyInput, describePrivacy } from "./signals/privacy";
import { type ScreenInput, describeScreen } from "./signals/screen";
import { type StorageInput, describeStorage } from "./signals/storage";
import { type TimeInput, describeTime } from "./signals/time";
import type { Finding } from "./signals/types";
import type { UaHints } from "./signals/ua";
import { type Voice, describeVoices } from "./signals/voices";
import { describeWindow } from "./signals/window";

/** Everything the page read, as plain data. */
export interface Snapshot {
  ua: string;
  hints: UaHints | null;
  brave: boolean;
  screen: ScreenInput;
  window: { innerWidth: number; innerHeight: number };
  time: TimeInput;
  languages: LanguagesInput;
  formats: FormatsInput;
  appearance: AppearanceInput;
  input: InputInput;
  hardware: HardwareInput;
  graphics: GraphicsInput;
  storage: StorageInput;
  battery: BatteryInput | null;
  connection: ConnectionInput;
  fonts: FontsInput | null;
  voices: Voice[] | null;
  canvas: CanvasInput | null;
  audio: AudioInput | null;
  privacy: PrivacyInput;
  arrival: ArrivalInput;
}

/** The lines of the letter, in the order they are written. */
export function buildProfile(s: Snapshot): Finding[] {
  return [
    describeDevice({ ua: s.ua, hints: s.hints, maxTouchPoints: s.input.maxTouchPoints }),
    describeBrowser({ ua: s.ua, hints: s.hints, brave: s.brave }),
    describeScreen(s.screen),
    describeWindow({ ...s.window, screenWidth: s.screen.width, screenHeight: s.screen.height }),
    describeTime(s.time),
    describeLanguages(s.languages),
    describeFormats(s.formats),
    describeAppearance(s.appearance),
    describeInput(s.input),
    describeHardware(s.hardware),
    describeGraphics(s.graphics),
    describeStorage(s.storage),
    describeBattery(s.battery),
    describeConnection(s.connection),
    describeFonts(s.fonts),
    describeVoices(s.voices),
    describeCanvas(s.canvas),
    describeAudio(s.audio),
    describePrivacy(s.privacy),
    describeArrival(s.arrival),
  ];
}

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
