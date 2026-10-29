import type { Person } from "../../types";
import { CARD_WIDTH } from "./presentation";
export const HERITAGE_ANCHOR_X = 120;
export const HERITAGE_ANCHOR_Y = 130;
export const heritageNodeSize = (root: boolean, showStatus = false) => ({
  width: 240,
  height: root ? 390 : 160 + (showStatus ? 16 : 0),
});
export function heritageTreeLayout(
  people: Person[],
  gap: number,
  showStatus = false,
) {
  const ids = new Set(people.map((p) => p.id)),
    children = new Map(people.map((p) => [p.id, [] as Person[]])),
    roots: Person[] = [];
  people.forEach((p) => {
    if (ids.has(p.parentId)) children.get(p.parentId)!.push(p);
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
    const span = new Map<string, number>();
    for (let i = order.length - 1; i >= 0; i--)
      span.set(
        order[i].id,
        Math.max(
          1,
          children
            .get(order[i].id)!
            .reduce((sum, c) => sum + span.get(c.id)!, 0),
        ),
      );
    const units = span.get(root.id)!,
      width = units * 210,
      maxDepth = Math.max(0, ...depth.values()),
      step = Math.max(300 + gap, (width / (maxDepth + 1)) * 0.85),
      starts = new Map([[root.id, 0]]);
    for (const p of order) {
      const start = starts.get(p.id)!,
        size = span.get(p.id)!,
        x = (units - start - size / 2) * 210,
        normalized = width > 210 ? (x - width / 2) / (width / 2 - 105) : 0,
        crown = Math.pow(normalized, 2) * step * 0.8;
      positions.set(p.id, {
        x: forestX + x - HERITAGE_ANCHOR_X,
        y: -(depth.get(p.id) ?? 0) * step + crown - HERITAGE_ANCHOR_Y,
      });
      let childStart = start;
      for (const child of children.get(p.id)!) {
        starts.set(child.id, childStart);
        childStart += span.get(child.id)!;
      }
    }
    forestX += width + 480;
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
  const roots = Array.from({ length: 13 }, (_, i) => {
    const end = 8 + i * 18.5;
    return `<path d="M${97 + i * 3.5} 278 C${80 + i * 7} 318 ${end + (120 - end) * 0.22} 349 ${end} ${363 + (i % 3) * 10}" fill="none" stroke="#464333" stroke-width="${13 - Math.abs(i - 6) * 1.1}" stroke-linecap="round"/><path d="M${97 + i * 3.5} 278 C${80 + i * 7} 318 ${end + (120 - end) * 0.22} 349 ${end} ${363 + (i % 3) * 10}" fill="none" stroke="#c4b899" stroke-width="${9 - Math.abs(i - 6) * 0.8}" stroke-linecap="round"/>`;
  }).join("");
  const grain = Array.from(
    { length: 11 },
    (_, i) =>
      `<path d="M${107 + i * 2.4} 131 C${98 + i * 4} 176 ${115 + i * 1.5} 222 ${92 + i * 5} 285"/>`,
  ).join("");
  return `${roots}<path d="M96 127 C101 176 88 226 66 278 Q119 318 173 279 C146 226 138 177 145 127Z" fill="#b9aa88" stroke="#464333" stroke-width="2.3"/><g fill="none" stroke="#655c46" stroke-width=".9" opacity=".8">${grain}</g>`;
}
export function woodBranch(path: string, width: number, ornaments = 2) {
  const bark = `<path data-branch-spine="true" d="${path}" fill="none" stroke="#464333" stroke-width="${width + 2.4}" stroke-linecap="round"/><path d="${path}" fill="none" stroke="#c4b899" stroke-width="${width}" stroke-linecap="round"/><path d="${path}" fill="none" stroke="#e8ddbf" stroke-width="${Math.max(0.7, width * 0.18)}" stroke-linecap="round"/>`;
  const v = (path.match(/[+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?/gi) ?? []).map(
    Number,
  );
  if (v.length !== 8) return bark;
  let foliage = "";
  for (let i = 0; i < ornaments; i++) {
    const t =
        ornaments > 2
          ? 0.25 +
            (0.55 * Math.floor(i / 2)) /
              Math.max(1, Math.ceil(ornaments / 2) - 1) +
            (i % 2 ? 0.015 : -0.015)
          : 0.62,
      u = 1 - t,
      sign = i % 2 ? 1 : -1;
    const x =
        u * u * u * v[0] +
        3 * u * u * t * v[2] +
        3 * u * t * t * v[4] +
        t * t * t * v[6],
      y =
        u * u * u * v[1] +
        3 * u * u * t * v[3] +
        3 * u * t * t * v[5] +
        t * t * t * v[7];
    const dx =
        3 * u * u * (v[2] - v[0]) +
        6 * u * t * (v[4] - v[2]) +
        3 * t * t * (v[6] - v[4]),
      dy =
        3 * u * u * (v[3] - v[1]) +
        6 * u * t * (v[5] - v[3]) +
        3 * t * t * (v[7] - v[5]),
      angle = (Math.atan2(dy, dx) * 180) / Math.PI + sign * 64;
    foliage += `<g data-ornament="foliage" transform="translate(${x} ${y}) rotate(${angle})" opacity=".9"><path d="M0 0 L18 0" stroke="#71674f" stroke-width="1.1"/><path d="M13 0 C27 -16 48 -18 70 -4 C54 15 32 18 13 0Z" fill="#e9dfc3" stroke="#6b634c" stroke-width="1"/><g fill="none" stroke="#7d7359" stroke-width=".65"><path d="M13 0 L68 -4 M28 -1 L32 -12 M28 -1 L36 10 M41 -2 L45 -12 M41 -2 L49 8 M53 -3 L57 -9 M53 -3 L59 3"/></g></g>`;
  }
  return foliage + bark;
}
