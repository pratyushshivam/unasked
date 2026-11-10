// The lines of the letter. Each is a card: the sentence on the front, the explanation on the back.

import { type Finding, text } from "../signals/types";
import { el, turnIcon } from "./dom";
import { type Typed, finish, prepare } from "./typer";

const STATE: Record<Finding["status"], string> = { read: "", partial: "in part", hidden: "kept back" };

function meta(index: number, finding: Finding): HTMLElement {
  const box = el("span", "line__meta");
  box.append(el("span", "line__no", String(index + 1).padStart(2, "0")), el("span", "line__label", finding.label));
  if (STATE[finding.status]) box.append(el("span", "line__state", STATE[finding.status]));
  return box;
}

function turnSign(): HTMLElement {
  const sign = el("span", "line__turn");
  sign.append(turnIcon());
  return sign;
}

export function buildLine(index: number, finding: Finding): { node: HTMLLIElement; typed: Typed } {
  const node = el("li", "line");
  node.dataset.status = finding.status;
  const card = el("div", "line__card");

  const front = el("button", "line__face line__front");
  front.type = "button";
  front.setAttribute("aria-label", `${text(finding.parts)} Turn over to see how I know.`);
  const sentence = el("span", "line__text");
  const typed = prepare(sentence, finding.parts);
  front.append(meta(index, finding), sentence, turnSign());

  const back = el("button", "line__face line__back");
  back.type = "button";
  back.inert = true;
  back.setAttribute("aria-label", `How I know: ${finding.how} What reduces it: ${finding.reduce} Turn back.`);
  const body = el("span", "back");
  const how = el("span");
  how.append(el("b", undefined, "How I know"), finding.how);
  const reduce = el("span");
  reduce.append(el("b", undefined, "What reduces it"), finding.reduce);
  body.append(how, reduce);
  back.append(meta(index, finding), body, turnSign());

  const turn = (toBack: boolean): void => {
    finish(typed);
    // The back is laid over the front. While it shows, the card grows to fit it.
    card.style.minHeight = toBack ? `${back.offsetHeight}px` : "";
    node.classList.toggle("is-turned", toBack);
    front.inert = toBack;
    back.inert = !toBack;
    (toBack ? back : front).focus({ preventScroll: true });
  };
  front.addEventListener("click", () => turn(true));
  back.addEventListener("click", () => turn(false));

  card.append(front, back);
  node.append(card);
  typed.host = node;
  return { node, typed };
}
