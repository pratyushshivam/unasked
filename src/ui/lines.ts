// The lines of the file. Each is a card: the sentence on the front, the explanation on the back.

import type { Chapter } from "../profile";
import { type Finding, text } from "../signals/types";
import { el, turnIcon } from "./dom";

const STATE: Record<Finding["status"], string> = { read: "", partial: "in part", hidden: "kept back" };

function meta(number: number, finding: Finding): HTMLElement {
  const box = el("span", "line__meta");
  box.append(el("span", "line__no", String(number).padStart(2, "0")), el("span", "line__label", finding.label));
  if (STATE[finding.status]) box.append(el("span", "line__state", STATE[finding.status]));
  return box;
}

function turnSign(): HTMLElement {
  const sign = el("span", "line__turn");
  sign.append(turnIcon());
  return sign;
}

export function buildLine(number: number, finding: Finding): HTMLLIElement {
  const node = el("li", "line");
  node.dataset.status = finding.status;
  const card = el("div", "line__card");

  const front = el("button", "line__face line__front");
  front.type = "button";
  front.dataset.cursor = "Turn";
  front.setAttribute("aria-label", `${text(finding.parts)} Turn over to see how I know.`);
  const sentence = el("span", "line__text");
  for (const part of finding.parts) {
    sentence.append(typeof part === "string" ? part : el("span", "val", part.v));
  }
  front.append(meta(number, finding), sentence, turnSign());

  const back = el("button", "line__face line__back");
  back.type = "button";
  back.dataset.cursor = "Back";
  back.inert = true;
  back.setAttribute("aria-label", `How I know: ${finding.how} What reduces it: ${finding.reduce} Turn back.`);
  const body = el("span", "back");
  const how = el("span");
  how.append(el("b", undefined, "How I know"), finding.how);
  const reduce = el("span");
  reduce.append(el("b", undefined, "What reduces it"), finding.reduce);
  body.append(how, reduce);
  back.append(meta(number, finding), body, turnSign());

  const turn = (toBack: boolean): void => {
    // The back is laid over the front. While it shows, the card grows to fit it.
    card.style.minHeight = toBack ? `${back.offsetHeight}px` : "";
    node.classList.toggle("is-turned", toBack);
    front.inert = toBack;
    back.inert = !toBack;
    (toBack ? back : front).focus({ preventScroll: true });
    if (toBack) document.dispatchEvent(new CustomEvent("unasked:turn"));
  };
  front.addEventListener("click", () => turn(true));
  back.addEventListener("click", () => turn(false));

  card.append(front, back);
  node.append(card);
  return node;
}

/** Writes the chapters into the page and the list of them into the hero. Returns every line, in order. */
export function buildChapters(chapters: Chapter[], host: HTMLElement, toc: HTMLElement): HTMLLIElement[] {
  const lines: HTMLLIElement[] = [];
  let number = 0;
  chapters.forEach((chapter, i) => {
    const section = el("section", "chap");
    section.id = chapter.id;
    // Paper and ink take turns.
    section.dataset.theme = i % 2 === 1 ? "ink" : "paper";
    const titleId = `${chapter.id}-title`;
    section.setAttribute("aria-labelledby", titleId);
    const wrap = el("div", "wrap");

    const head = el("header", "chap__head");
    const no = el("p", "cap chap__no");
    const count = `${chapter.findings.length} ${chapter.findings.length === 1 ? "line" : "lines"}`;
    no.append(el("span", undefined, String(i + 1).padStart(2, "0")), el("span", undefined, count));
    const title = el("h2", "chap__title", chapter.title);
    title.id = titleId;
    title.dataset.kinetic = "";
    const lede = el("p", "chap__lede", chapter.lede);
    lede.dataset.lines = "";
    head.append(no, title, lede);

    const list = el("ol", "lines");
    for (const finding of chapter.findings) {
      const line = buildLine(++number, finding);
      list.append(line);
      lines.push(line);
    }
    wrap.append(head, list);
    section.append(wrap);
    host.append(section);

    const entry = el("li");
    const link = el("a");
    link.href = `#${chapter.id}`;
    link.append(
      el("span", "toc__no", String(i + 1).padStart(2, "0")),
      el("span", "toc__name", chapter.title),
      el("span", "toc__count", count),
    );
    entry.append(link);
    toc.append(entry);
  });
  return lines;
}
