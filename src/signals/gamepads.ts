import { type Finding, list, v } from "./types";

/** null: the browser does not let pages look. An empty list: none has shown itself. */
export function describeGamepads(names: string[] | null): Finding {
  const base = {
    id: "gamepads",
    label: "controllers",
    how: "navigator.getGamepads(). A controller stays invisible until you press something on it; then its exact model name is handed over.",
    reduce: "Do not touch a controller on a page you do not trust. Some browsers make the page ask first.",
    stable: null,
  };
  if (names === null) {
    return { ...base, parts: ["Your browser does not let pages look for game controllers."], status: "hidden" };
  }
  if (names.length === 0) {
    return {
      ...base,
      parts: [v("No game controller"), " has shown itself. Press a button on one and its model name would appear here."],
      status: "read",
    };
  }
  return {
    ...base,
    parts: ["A game controller is connected: ", ...list(names.slice(0, 2).map((n) => v(n))), "."],
    status: "read",
  };
}
