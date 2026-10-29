/** Ordered subtree packing. A complete subtree owns its rectangle and connector lanes.
 * Siblings follow reading order across shelves, never sorted by subtree size.
 * Iterative passes avoid a recursion limit on deep pedigrees. */
export type Point = { x: number; y: number };
export type LayoutPerson = {
  id: string;
  parentId: string;
  order: number;
  width: number;
  height: number;
};
export type FamilyLayout = {
  positions: Map<string, Point>;
  routes: Map<string, Point[]>;
  width: number;
  height: number;
};
type Placement = { id: string; u: number; v: number; bus: number };
type Box = {
  width: number;
  height: number;
  anchor: number;
  rows: number;
  kids: Placement[];
};
export function routePath(points: Point[]) {
  return points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
}
export function familyLayout(
  items: LayoutPerson[],
  horizontal: boolean,
  upward: boolean,
  gap = 28,
  area?: { width: number; height: number },
  spread = true,
): FamilyLayout {
  if (!items.length)
    return { positions: new Map(), routes: new Map(), width: 0, height: 0 };
  const byId = new Map(items.map((n) => [n.id, n]));
  if (byId.size !== items.length) throw new Error("معرّفات مكررة في الشجرة");
  const children = new Map(items.map((n) => [n.id, [] as LayoutPerson[]])),
    roots: LayoutPerson[] = [];
  for (const n of items) {
    if (byId.has(n.parentId)) children.get(n.parentId)!.push(n);
    else roots.push(n);
  }
  for (const list of children.values())
    list.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const order = [...roots];
  for (let i = 0; i < order.length; i++)
    for (const child of children.get(order[i].id)!) order.push(child);
  if (order.length !== items.length) throw new Error("دورة في علاقات الأبوة");
  const C = Math.max(...items.map((n) => (horizontal ? n.height : n.width))),
    D = Math.max(...items.map((n) => (horizontal ? n.width : n.height)));
  const weight = new Map<string, number>();
  for (let i = order.length - 1; i >= 0; i--)
    weight.set(
      order[i].id,
      1 +
        children
          .get(order[i].id)!
          .reduce((sum, c) => sum + weight.get(c.id)!, 0),
    );
  const lane = Math.max(12, gap / 2),
    space = 12;
  const targetU = area ? (horizontal ? area.height : area.width) : 1000,
    targetV = area ? (horizontal ? area.width : area.height) : 700;
  const pack = (
    ids: LayoutPerson[],
    boxes: Map<string, Box>,
    budget: number,
  ): Box => {
    const rows: Placement[][] = [[]];
    let u = 0,
      v = 0,
      rowHeight = 0,
      maxU = 0;
    for (const child of ids) {
      const b = boxes.get(child.id)!;
      if (u > 0 && u + space + b.width > budget) {
        v += rowHeight + gap;
        u = 0;
        rowHeight = 0;
        rows.push([]);
      }
      if (u) u += space;
      rows.at(-1)!.push({ id: child.id, u, v, bus: v - lane });
      u += b.width;
      maxU = Math.max(maxU, u);
      rowHeight = Math.max(rowHeight, b.height);
    }
    const rail = rows.length > 1 ? lane : 0;
    return {
      width: Math.max(C, maxU + rail),
      height: v + rowHeight,
      anchor: 0,
      rows: rows.length,
      kids: rows.flat().map((p) => ({ ...p, u: p.u + rail })),
    };
  };
  let best: { boxes: Map<string, Box>; forest: Box; score: number } | undefined;
  // A bounded search over shelf widths chooses the best readable scale for the actual aspect ratio.
  const maxBudget = Math.max(C, items.length * (C + space));
  const ideal = Math.sqrt(
    (items.length * (C + space) * (D + gap) * targetU) / targetV,
  );
  const budgets = new Set([C, maxBudget, Math.max(C, ideal)]);
  for (let i = 0; i < 22; i++)
    budgets.add(
      Math.max(C, Math.min(maxBudget, ideal * Math.pow(1.22, i - 10))),
    );
  for (const budget of budgets) {
    const boxes = new Map<string, Box>();
    for (let i = order.length - 1; i >= 0; i--) {
      const n = order[i],
        kids = children.get(n.id)!;
      if (!kids.length) {
        boxes.set(n.id, {
          width: C,
          height: D,
          anchor: C / 2,
          rows: 0,
          kids: [],
        });
        continue;
      }
      const keepRow =
        kids.length <= 3 && kids.every((k) => !children.get(k.id)!.length);
      const packed = pack(
        kids,
        boxes,
        keepRow
          ? Number.POSITIVE_INFINITY
          : Math.max(
              C,
              budget * Math.sqrt(weight.get(n.id)! / items.length) - lane,
            ),
      );
      const width = Math.max(C, packed.width),
        anchor = width / 2;
      boxes.set(n.id, {
        ...packed,
        width,
        height: D + gap + packed.height,
        anchor,
        kids: packed.kids.map((p) => ({
          ...p,
          v: p.v + D + gap,
          bus: p.bus + D + gap,
        })),
      });
    }
    const forest = pack(roots, boxes, budget);
    const scale = Math.min(targetU / forest.width, targetV / forest.height);
    // Tiny tie-break favours less empty area, without sacrificing the readable card scale.
    const score =
      scale *
      (1 +
        (0.001 * (forest.width * forest.height)) /
          ((targetU * targetV) / (scale * scale)));
    if (!best || score > best.score) best = { boxes, forest, score };
  }
  const { boxes, forest } = best!;
  const canonical = new Map<string, { u: number; v: number }>(),
    links = new Map<string, { u: number; v: number }[]>();
  const queue = forest.kids.map((p) => ({ ...p, baseU: p.u, baseV: p.v }));
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i],
      box = boxes.get(p.id)!;
    canonical.set(p.id, { u: p.baseU + box.anchor - C / 2, v: p.baseV });
    for (const child of box.kids) {
      const childBox = boxes.get(child.id)!,
        cu = p.baseU + child.u + childBox.anchor,
        cv = p.baseV + child.v;
      const start = { u: p.baseU + box.anchor, v: p.baseV + D },
        end = { u: cu, v: cv };
      const bus = p.baseV + child.bus;
      const points =
        box.rows > 1
          ? [
              start,
              { u: start.u, v: p.baseV + D + gap - lane },
              { u: p.baseU + lane / 2, v: p.baseV + D + gap - lane },
              { u: p.baseU + lane / 2, v: bus },
              { u: cu, v: bus },
              end,
            ]
          : [start, { u: start.u, v: bus }, { u: cu, v: bus }, end];
      links.set(child.id, points);
      queue.push({ ...child, baseU: p.baseU + child.u, baseV: cv });
    }
  }
  // Expand whitespace, never the cards or glyphs. Monotonic coordinate mapping preserves all lanes.
  const scale = Math.min(targetU / forest.width, targetV / forest.height, 1);
  const W = spread ? Math.max(forest.width, targetU / scale) : forest.width;
  const H = spread ? Math.max(forest.height, targetV / scale) : forest.height;
  const su = W / forest.width,
    sv = H / forest.height;
  const positions = new Map<string, Point>(),
    routes = new Map<string, Point[]>();
  const transform = (u: number, v: number): Point =>
    horizontal
      ? { x: H - v, y: u }
      : upward
        ? { x: W - u, y: H - v }
        : { x: W - u, y: v };
  for (const n of items) {
    const p = canonical.get(n.id)!;
    const point = transform((p.u + C / 2) * su, (p.v + D / 2) * sv);
    positions.set(n.id, {
      x: point.x - n.width / 2,
      y: point.y - n.height / 2,
    });
  }
  for (const [id, points] of links) {
    // All intermediate points live in whitespace; use a centre-based affine map there.
    const mapped = points.map((p) => transform(p.u * su, p.v * sv));
    const child = byId.get(id)!,
      parent = byId.get(child.parentId)!,
      a = positions.get(parent.id)!,
      b = positions.get(id)!;
    mapped[0] = horizontal
      ? { x: a.x, y: a.y + parent.height / 2 }
      : upward
        ? { x: a.x + parent.width / 2, y: a.y }
        : { x: a.x + parent.width / 2, y: a.y + parent.height };
    mapped[mapped.length - 1] = horizontal
      ? { x: b.x + child.width, y: b.y + child.height / 2 }
      : upward
        ? { x: b.x + child.width / 2, y: b.y + child.height }
        : { x: b.x + child.width / 2, y: b.y };
    // Keep the exit and entry legs perpendicular to their respective card faces.
    if (horizontal) {
      mapped[1].y = mapped[0].y;
      mapped[mapped.length - 2].y = mapped.at(-1)!.y;
    } else {
      mapped[1].x = mapped[0].x;
      mapped[mapped.length - 2].x = mapped.at(-1)!.x;
    }
    routes.set(id, mapped);
  }
  return {
    positions,
    routes,
    width: horizontal ? H : W,
    height: horizontal ? W : H,
  };
}
