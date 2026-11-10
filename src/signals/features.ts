import { type Finding, v } from "./types";
import { spaced } from "./webgl";

/** Newer parts of the web platform, by the name a script would look for. Having or lacking each one dates a browser. */
export const FEATURES: readonly string[] = [
  "navigator.gpu", "navigator.usb", "navigator.bluetooth", "navigator.serial", "navigator.hid", "navigator.xr",
  "navigator.wakeLock", "navigator.share", "navigator.credentials", "navigator.locks", "navigator.scheduling",
  "navigator.virtualKeyboard", "navigator.windowControlsOverlay", "navigator.ink", "navigator.login",
  "navigator.storageBuckets", "navigator.userActivation", "navigator.mediaSession", "navigator.clipboard",
  "window.showOpenFilePicker", "window.EyeDropper", "window.documentPictureInPicture", "window.launchQueue",
  "window.SharedArrayBuffer", "window.WebTransport", "window.VideoDecoder", "window.CompressionStream",
  "window.PaymentRequest", "window.Notification", "window.IdleDetector", "window.BarcodeDetector",
  "window.cookieStore", "window.Sanitizer", "window.CloseWatcher", "window.navigation", "window.scheduler",
  "window.trustedTypes", "window.ViewTransition", "window.LanguageModel", "window.Temporal",
];

export interface FeaturesInput {
  tested: number;
  present: string[];
}

export function describeFeatures(f: FeaturesInput, hash: (s: string) => string): Finding {
  const digest = hash(f.present.join(","));
  return {
    id: "features",
    label: "abilities",
    parts: [
      "Of ",
      v(String(f.tested)),
      " newer browser abilities I tested for, yours has ",
      v(String(f.present.length)),
      ". That exact set, ",
      v(spaced(digest)),
      ", dates your browser more finely than its version number does.",
    ],
    how: "I only checked whether each one exists, by name. None was used, so nothing was connected, opened or asked for.",
    reduce: "The set follows your browser, its version and its settings. People on the same release share it; switching features off makes yours rarer.",
    status: "read",
    stable: digest,
  };
}
