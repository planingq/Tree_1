import type { Person } from "../../types";
import { CARD_WIDTH, cardHeight, firstName } from "./presentation";
export const HERITAGE_ROOT_EXTRA = 190;
export function heritageTreeLayout(
  people: Person[],
  gap: number,
  showStatus = false,
) {
  const byId = new Map(people.map((p) => [p.id, p])),
    children = new Map(people.map((p) => [p.id, [] as Person[]])),
    roots: Person[] = [];
  people.forEach((p) => {
    if (byId.has(p.parentId)) children.get(p.parentId)!.push(p);
    else roots.push(p);
  });
  children.forEach((list) =>
    list.sort(
      (a, b) => a.siblingOrder - b.siblingOrder || a.id.localeCompare(b.id),
    ),
  );
  const positions = new Map<string, { x: number; y: number }>();
  let forestX = 0;
  for (const root of roots) {
    const order = [root],
      depth = new Map([[root.id, 0]]);
    for (let i = 0; i < order.length; i++)
      for (const child of children.get(order[i].id)!) {
        depth.set(child.id, depth.get(order[i].id)! + 1);
        order.push(child);
      }
    const spans = new Map<string, number>();
    for (let i = order.length - 1; i >= 0; i--)
      spans.set(
        order[i].id,
        Math.max(
          1,
          children
            .get(order[i].id)!
            .reduce((sum, c) => sum + spans.get(c.id)!, 0),
        ),
      );
    const slots = spans.get(root.id)!,
      starts = new Map([[root.id, 0]]),
      angles = new Map<string, number>(),
      anglesByDepth = new Map<number, number[]>();
    for (const p of order) {
      let start = starts.get(p.id)!;
      const angle =
        ((-20 - ((start + spans.get(p.id)! / 2) / slots) * 140) * Math.PI) /
        180;
      angles.set(p.id, angle);
      const d = depth.get(p.id)!;
      if (d) {
        const row = anglesByDepth.get(d) ?? [];
        row.push(angle);
        anglesByDepth.set(d, row);
      }
      for (const c of children.get(p.id)!) {
        starts.set(c.id, start);
        start += spans.get(c.id)!;
      }
    }
    const radii: number[] = [0];
    const maxDepth = Math.max(0, ...depth.values());
    for (let d = 1; d <= maxDepth; d++) {
      const a = (anglesByDepth.get(d) ?? []).sort((x, y) => x - y);
      let delta = Math.PI;
      for (let i = 1; i < a.length; i++)
        delta = Math.min(delta, a[i] - a[i - 1]);
      radii[d] = Math.max(
        radii[d - 1] + 220 + gap,
        210 / (2 * Math.sin(delta / 2)),
      );
    }
    const radius = radii.at(-1) ?? 0;
    const center = forestX + radius + CARD_WIDTH;
    for (const p of order) {
      const d = depth.get(p.id)!,
        angle = angles.get(p.id)!;
      positions.set(p.id, {
        x: center + (d ? radii[d] * Math.cos(angle) : 0) - CARD_WIDTH / 2,
        y:
          (d ? radii[d] * Math.sin(angle) : 0) -
          cardHeight(firstName(p.name), showStatus) / 2,
      });
    }
    forestX += 2 * radius + CARD_WIDTH * 3;
  }
  return positions;
}
export function leafOrnament(deceased = false, selected = false) {
  const fill = selected ? "#d2c19a" : deceased ? "#bfb8a4" : "#eadfc3",
    ink = selected ? "#514126" : "#75664c";
  const veins = Array.from({ length: 7 }, (_, i) => {
    const x = 28 + i * 15;
    return `<path d="M${x} 49 Q${x - 9} 37 ${x - 8} ${26 - Math.sin(i) * 4} M${x} 49 Q${x + 4} 61 ${x + 1} ${72 + Math.sin(i) * 3}"/>`;
  }).join("");
  return `<path d="M5 78 C8 25 70 5 153 8 C151 60 94 100 5 78Z" fill="${fill}" stroke="${ink}" stroke-width="${selected ? 3 : 1.5}"/><g fill="none" stroke="${ink}" stroke-width=".65" opacity=".32"><path d="M5 78 Q82 35 153 8"/>${veins}</g>`;
}
export function trunkOrnament() {
  const roots = Array.from({ length: 11 }, (_, i) => {
    const end = 8 + i * 30;
    return `<path d="M${145 + i * 2} 120 C${125 + i * 5} 177 ${end + (160 - end) * 0.2} 217 ${end} ${249 + (i % 3) * 10}" fill="none" stroke="#4d4230" stroke-width="${10 - Math.abs(i - 5) * 0.8}"/><path d="M${145 + i * 2} 120 C${125 + i * 5} 177 ${end + (160 - end) * 0.2} 217 ${end} ${249 + (i % 3) * 10}" fill="none" stroke="#c4b18a" stroke-width="${6 - Math.abs(i - 5) * 0.4}"/>`;
  }).join("");
  return `${roots}<path d="M143 1 Q152 69 136 133 Q150 163 181 137 Q161 79 179 1Z" fill="#a69270" stroke="#4d4230" stroke-width="2"/><g fill="none" stroke="#5b4c35" stroke-width="1" opacity=".75">${Array.from({ length: 9 }, (_, i) => `<path d="M${146 + i * 3} 6 Q${164 - i * 2} 75 ${143 + i * 3} 140"/>`).join("")}</g>`;
}
export function woodBranch(path: string, width: number) {
  return `<path d="${path}" fill="none" stroke="#4e4432" stroke-width="${width + 2}" stroke-linecap="round"/><path d="${path}" fill="none" stroke="#ac9974" stroke-width="${width}" stroke-linecap="round"/><path d="${path}" fill="none" stroke="#e2d3b0" stroke-width="${Math.max(0.7, width * 0.2)}" stroke-linecap="round"/>`;
}
