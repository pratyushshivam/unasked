import { type Finding, list, v } from "./types";

export interface AutomationInput {
  webdriver: boolean;
  headlessLabel: boolean;
  noLanguages: boolean;
}

export function describeAutomation(a: AutomationInput): Finding {
  const signs: string[] = [];
  if (a.webdriver) signs.push("the automation flag is raised");
  if (a.headlessLabel) signs.push("the label says headless");
  if (a.noLanguages) signs.push("no languages are set");
  return {
    id: "automation",
    label: "human or robot",
    parts:
      signs.length === 0
        ? ["Nothing here says you are a robot. Your browser reports ", v("no automation"), "."]
        : ["Your browser looks ", v("driven by software"), ": ", ...list(signs.map((s) => v(s))), "."],
    how: "navigator.webdriver is raised by automation tools, and headless browsers show in the label. Sites use this to sort people from bots.",
    reduce: "For a person there is nothing to reduce. The check runs on almost every site with a login or a checkout.",
    status: "read",
    stable: signs.join(","),
  };
}
