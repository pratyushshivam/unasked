import { type Finding, type Part, list, v } from "./types";

export interface MediaDevicesInput {
  cameras: number;
  microphones: number;
  speakers: number;
}

export function describeMediaDevices(m: MediaDevicesInput | null): Finding {
  const base = {
    id: "media",
    label: "camera, microphone",
    how: "enumerateDevices() lists the kinds of media device present. I did not ask to use any of them, so nothing was switched on and no prompt appeared.",
    reduce: "Browsers now show a page one nameless entry per kind until you grant access, which hides how many you own and what they are called. Credit to them.",
  };
  if (!m) {
    return {
      ...base,
      parts: ["Your browser does not tell pages whether you have a camera or a microphone."],
      status: "hidden",
      stable: null,
    };
  }
  const have: Part[] = [];
  if (m.cameras > 0) have.push(v(m.cameras > 1 ? `${m.cameras} cameras` : "a camera"));
  if (m.microphones > 0) have.push(v(m.microphones > 1 ? `${m.microphones} microphones` : "a microphone"));
  if (m.speakers > 0) have.push(v(m.speakers > 1 ? `${m.speakers} sound outputs` : "a sound output"));
  if (have.length === 0) {
    return { ...base, parts: ["Your browser reports ", v("no camera and no microphone"), "."], status: "read", stable: "0|0|0" };
  }
  return {
    ...base,
    parts: ["This device has at least ", ...list(have), ". I did not ask to use them, and your browser kept their names back."],
    status: "partial",
    stable: [m.cameras, m.microphones, m.speakers].join("|"),
  };
}
