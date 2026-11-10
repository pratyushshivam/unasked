// Small helpers for building the page without innerHTML.

export const reducedMotion = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  content?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

const SVG = "http://www.w3.org/2000/svg";

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

export function byId<T extends Element = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node as unknown as T;
}

/** The two-arrow sign on every card: this turns over. */
export function turnIcon(): SVGSVGElement {
  const icon = svg("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 1.8, "aria-hidden": "true" });
  icon.append(
    svg("path", { d: "M4 11a8 8 0 0 1 14.2-4.6L20 8.5M20 4v4.5h-4.5", "stroke-linecap": "round", "stroke-linejoin": "round" }),
    svg("path", { d: "M20 13a8 8 0 0 1-14.2 4.6L4 15.5M4 20v-4.5h4.5", "stroke-linecap": "round", "stroke-linejoin": "round" }),
  );
  return icon;
}

/** Calls back once, the first time the element is well inside the window. */
export function onceVisible(target: Element, callback: () => void, threshold = 0.3): void {
  const watcher = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        watcher.disconnect();
        callback();
      }
    },
    { threshold },
  );
  watcher.observe(target);
}

export const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
