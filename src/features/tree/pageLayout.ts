import type { PrintNode } from "./export";
type Edge = { source: string; target: string };
export type PageLayoutResult = {
  nodes: PrintNode[];
  routes: Map<string, string>;
  width: number;
  height: number;
  scale: number;
  columns: number;
  rows: number;
};
export const routeKey = (e: Edge) => JSON.stringify([e.source, e.target]);
// Reflow generation bands to the physical page; the cards themselves always retain their aspect ratio.
export function pageAwareTreeLayout(
  nodes: PrintNode[],
  edges: Edge[],
  horizontal: boolean,
  upward: boolean,
  pageWidth: number,
  pageHeight: number,
  widthOf: (n: PrintNode) => number,
  heightOf: (n: PrintNode) => number,
): PageLayoutResult {
  if (!nodes.length) throw new Error("لا يوجد أفراد لتوزيعهم على الورقة");
  const byId = new Map(nodes.map((n) => [n.id, n])),
    children = new Map(nodes.map((n) => [n.id, [] as PrintNode[]])),
    parents = new Map<string, string>();
  edges.forEach((e) => {
    if (byId.has(e.source) && byId.has(e.target)) {
      if (parents.has(e.target))
        throw new Error("لا يمكن توزيع شخص مرتبط بأكثر من أب");
      parents.set(e.target, e.source);
      children.get(e.source)!.push(byId.get(e.target)!);
    }
  });
  children.forEach((list) =>
    list.sort(
      (a, b) =>
        a.data.person.siblingOrder - b.data.person.siblingOrder ||
        a.id.localeCompare(b.id),
    ),
  );
  const queue = nodes.filter((n) => !parents.has(n.id)),
    ranks = new Map(queue.map((n) => [n.id, n.data.generation ?? 1])),
    bandsMap = new Map<number, PrintNode[]>();
  for (let i = 0; i < queue.length; i++) {
    const n = queue[i],
      rank = ranks.get(n.id)!;
    const band = bandsMap.get(rank) ?? [];
    band.push(n);
    bandsMap.set(rank, band);
    for (const child of children.get(n.id)!) {
      ranks.set(child.id, Math.max(rank + 1, child.data.generation ?? 1));
      queue.push(child);
    }
  }
  if (queue.length !== nodes.length)
    throw new Error("لا يمكن توزيع علاقات دورية على الورقة");
  const bands = [...bandsMap]
      .sort((a, b) => a[0] - b[0])
      .map(([, band]) => band),
    maxCount = Math.max(1, ...bands.map((b) => b.length)),
    W = Math.max(...nodes.map(widthOf)),
    H = Math.max(...nodes.map(heightOf)),
    gx = 30,
    gy = 30,
    rankGap = 42,
    pad = 24;
  const candidates = new Set<number>([1, maxCount]);
  for (let k = 1; k <= Math.min(250, maxCount); k++) candidates.add(k);
  for (let k = 251; k < maxCount; k = Math.ceil(k * 1.1)) candidates.add(k);
  let best = { cross: 1, scale: 0, width: 0, height: 0, units: [] as number[] };
  for (const cross of candidates) {
    const units = bands.map((b) => Math.ceil(b.length / cross));
    const axis = units.reduce((a, b) => a + b, 0);
    const width = horizontal
      ? axis * (W + gx) -
        bands.length * gx +
        (bands.length - 1) * rankGap +
        2 * pad
      : cross * (W + gx) - gx + 2 * pad;
    const height = horizontal
      ? cross * (H + gy) - gy + 2 * pad
      : axis * (H + gy) -
        bands.length * gy +
        (bands.length - 1) * rankGap +
        2 * pad;
    const scale = Math.min(pageWidth / width, pageHeight / height);
    if (scale > best.scale) best = { cross, scale, width, height, units };
  }
  const canvasW = pageWidth / best.scale,
    canvasH = pageHeight / best.scale;
  const extentX = best.width - 2 * pad - W,
    extentY = best.height - 2 * pad - H;
  const fx = extentX > 0 ? (canvasW - 2 * pad - W) / extentX : 1,
    fy = extentY > 0 ? (canvasH - 2 * pad - H) / extentY : 1;
  const mapX = (x: number) =>
    extentX > 0 ? pad + (x - pad) * fx : (canvasW - W) / 2;
  const mapY = (y: number) =>
    extentY > 0 ? pad + (y - pad) * fy : (canvasH - H) / 2;
  const positions = new Map<string, { x: number; y: number }>();
  let offset = 0;
  bands.forEach((band, bi) => {
    band.forEach((n, i) => {
      let x: number, y: number;
      if (horizontal) {
        const col = Math.floor(i / best.cross),
          row = i % best.cross;
        x = best.width - pad - W - offset - col * (W + gx);
        y = pad + row * (H + gy);
      } else {
        const col = i % best.cross,
          row = Math.floor(i / best.cross);
        x = best.width - pad - W - col * (W + gx);
        y = pad + offset + row * (H + gy);
      }
      positions.set(n.id, { x: mapX(x), y: mapY(y) });
    });
    offset +=
      best.units[bi] * (horizontal ? W + gx : H + gy) +
      (rankGap - (horizontal ? gx : gy));
  });
  // A single chain has only one cross-axis slot: stagger along that free axis rather than collapsing it into a line.
  if (horizontal && extentY <= 0 && bands.length > 1)
    bands.forEach((band, i) =>
      band.forEach((n) => {
        positions.get(n.id)!.y =
          pad + (i / (bands.length - 1)) * (canvasH - 2 * pad - H);
      }),
    );
  if (!horizontal && extentX <= 0 && bands.length > 1)
    bands.forEach((band, i) =>
      band.forEach((n) => {
        positions.get(n.id)!.x =
          canvasW -
          pad -
          W -
          (i / (bands.length - 1)) * (canvasW - 2 * pad - W);
      }),
    );
  if (upward && !horizontal)
    positions.forEach((p, id) => {
      p.y = canvasH - p.y - heightOf(byId.get(id)!);
    });
  const result = nodes.map((n) => ({
      ...n,
      position: positions.get(n.id)!,
      data: {
        ...n.data,
        printParentLabel: parents.has(n.id)
          ? (byId.get(parents.get(n.id)!)!.data.displayName ??
            byId.get(parents.get(n.id)!)!.data.person.name)
          : undefined,
      },
    })),
    placed = new Map(result.map((n) => [n.id, n]));
  const gutters: number[] = [];
  if (horizontal) {
    for (let r = 0; r <= best.cross; r++) {
      if (r === 0) gutters.push(Math.max(8, mapY(pad) - gy / 2));
      else if (r === best.cross)
        gutters.push(
          Math.min(canvasH - 8, mapY(pad + (r - 1) * (H + gy)) + H + gy / 2),
        );
      else
        gutters.push(
          (mapY(pad + (r - 1) * (H + gy)) + H + mapY(pad + r * (H + gy))) / 2,
        );
    }
  } else
    for (let c = 0; c <= best.cross; c++) {
      if (c === 0) gutters.push(Math.max(8, mapX(pad) - gx / 2));
      else if (c === best.cross)
        gutters.push(
          Math.min(canvasW - 8, mapX(pad + (c - 1) * (W + gx)) + W + gx / 2),
        );
      else
        gutters.push(
          (mapX(pad + (c - 1) * (W + gx)) + W + mapX(pad + c * (W + gx))) / 2,
        );
    }
  const routes = new Map<string, string>();
  for (const e of edges) {
    const a = placed.get(e.source),
      b = placed.get(e.target);
    if (!a || !b) continue;
    if (horizontal) {
      const ay = a.position.y + heightOf(a) / 2,
        by = b.position.y + heightOf(b) / 2,
        x1 = a.position.x,
        x2 = b.position.x + widthOf(b);
      const lane =
        best.cross === 1
          ? 8
          : gutters.reduce(
              (chosen, g) =>
                Math.abs(g - (ay + by) / 2) < Math.abs(chosen - (ay + by) / 2)
                  ? g
                  : chosen,
              gutters[0],
            );
      routes.set(
        routeKey(e),
        `M${x1},${ay} H${x1 - gx / 2} V${lane} H${b.position.x + W + gx / 2} V${by} H${x2}`,
      );
    } else {
      const ax = a.position.x + widthOf(a) / 2,
        bx = b.position.x + widthOf(b) / 2,
        y1 = a.position.y + (upward ? 0 : heightOf(a)),
        y2 = b.position.y + (upward ? heightOf(b) : 0),
        sign = upward ? -1 : 1;
      const lane =
        best.cross === 1
          ? 8
          : gutters.reduce(
              (chosen, g) =>
                Math.abs(g - (ax + bx) / 2) < Math.abs(chosen - (ax + bx) / 2)
                  ? g
                  : chosen,
              gutters[0],
            );
      routes.set(
        routeKey(e),
        `M${ax},${y1} V${upward ? a.position.y - (H - heightOf(a)) - gy / 2 : a.position.y + H + gy / 2} H${lane} V${y2 - (sign * gy) / 2} H${bx} V${y2}`,
      );
    }
  }
  return {
    nodes: result,
    routes,
    width: canvasW,
    height: canvasH,
    scale: best.scale,
    columns: horizontal ? best.units.reduce((a, b) => a + b, 0) : best.cross,
    rows: horizontal ? best.cross : best.units.reduce((a, b) => a + b, 0),
  };
}

// Expand the spacing of a botanical composition to the page, preserving every glyph's proportions.
export function spreadArtworkToPage(
  nodes: PrintNode[],
  pageWidth: number,
  pageHeight: number,
  widthOf: (n: PrintNode) => number,
  heightOf: (n: PrintNode) => number,
): PageLayoutResult {
  const pad = 18,
    minX = Math.min(...nodes.map((n) => n.position.x)),
    minY = Math.min(...nodes.map((n) => n.position.y)),
    maxX = Math.max(...nodes.map((n) => n.position.x)),
    maxY = Math.max(...nodes.map((n) => n.position.y)),
    W = Math.max(...nodes.map(widthOf)),
    H = Math.max(...nodes.map(heightOf));
  const width = maxX - minX + W + 2 * pad,
    height = maxY - minY + H + 2 * pad,
    scale = Math.min(pageWidth / width, pageHeight / height),
    targetW = pageWidth / scale,
    targetH = pageHeight / scale;
  return {
    nodes: nodes.map((n) => ({
      ...n,
      position: {
        x:
          maxX > minX
            ? pad +
              ((n.position.x - minX) / (maxX - minX)) * (targetW - W - 2 * pad)
            : (targetW - widthOf(n)) / 2,
        y:
          maxY > minY
            ? pad +
              ((n.position.y - minY) / (maxY - minY)) * (targetH - H - 2 * pad)
            : (targetH - heightOf(n)) / 2,
      },
    })),
    routes: new Map(),
    width: targetW,
    height: targetH,
    scale,
    columns: 0,
    rows: 0,
  };
}
