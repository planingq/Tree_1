import { expect, it } from "vitest";
import { pageAwareTreeLayout, routeKey } from "../features/tree/pageLayout";
import { buildPrintDocument } from "../features/tree/export";
import type { PrintNode } from "../features/tree/export";
import { CARD_WIDTH, cardHeight } from "../features/tree/presentation";
function fixture() {
  const counts = [1, 5, 20, 50, 100, 120, 60, 40],
    nodes: PrintNode[] = [],
    edges: { source: string; target: string }[] = [];
  let previous: string[] = [];
  counts.forEach((count, g) => {
    const ids = Array.from({ length: count }, (_, i) => `g${g}-${i}`);
    ids.forEach((id, i) => {
      const parentId = g
        ? previous[Math.floor((i * previous.length) / count)]
        : "";
      nodes.push({
        id,
        position: { x: -g * 190, y: i * 104 },
        data: {
          person: {
            id,
            name: `فرد ${i}`,
            parentId,
            status: 1,
            siblingOrder: i + 1,
            fatherName: "",
            customFields: {},
          },
          displayName: `فرد ${i}`,
          direct: 0,
          total: 0,
          generation: g + 1,
        },
      });
      if (parentId) edges.push({ source: parentId, target: id });
    });
    previous = ids;
  });
  return { nodes, edges };
}
function segments(path: string) {
  const parts = path.match(/[MHV][^MHV]+/g)!,
    points: { x: number; y: number }[] = [];
  let x = 0,
    y = 0;
  for (const part of parts) {
    const v = part.slice(1).split(",").map(Number);
    if (part[0] === "M") {
      x = v[0];
      y = v[1];
    } else if (part[0] === "H") x = v[0];
    else y = v[0];
    points.push({ x, y });
  }
  return points.slice(1).map((p, i) => [points[i], p]);
}
it("يوزع نحو 400 فرد من ثمانية أجيال على عرض الورقة وارتفاعها دون تشويه أو فقد روابط", () => {
  const f = fixture(),
    before = JSON.stringify(f);
  for (const [horizontal, upward] of [
    [true, false],
    [false, false],
    [false, true],
  ]) {
    const r = pageAwareTreeLayout(
      f.nodes,
      f.edges,
      horizontal,
      upward,
      400,
      262,
      () => CARD_WIDTH,
      (n) => cardHeight(n.data.displayName!),
    );
    expect(r.nodes).toHaveLength(f.nodes.length);
    expect(r.routes.size).toBe(f.edges.length);
    const minX = Math.min(...r.nodes.map((n) => n.position.x)),
      maxX = Math.max(...r.nodes.map((n) => n.position.x + CARD_WIDTH)),
      minY = Math.min(...r.nodes.map((n) => n.position.y)),
      maxY = Math.max(
        ...r.nodes.map((n) => n.position.y + cardHeight(n.data.displayName!)),
      );
    expect((maxX - minX) / r.width).toBeGreaterThan(0.9);
    expect((maxY - minY) / r.height).toBeGreaterThan(0.9);
    for (const n of r.nodes) {
      expect(n.position.x).toBeGreaterThanOrEqual(0);
      expect(n.position.y).toBeGreaterThanOrEqual(0);
      expect(n.position.x + CARD_WIDTH).toBeLessThanOrEqual(r.width);
      expect(
        n.position.y + cardHeight(n.data.displayName!),
      ).toBeLessThanOrEqual(r.height);
    }
    for (let i = 0; i < r.nodes.length; i++)
      for (let j = i + 1; j < r.nodes.length; j++) {
        const a = r.nodes[i],
          b = r.nodes[j];
        if (
          a.position.x < b.position.x + CARD_WIDTH - 0.01 &&
          a.position.x + CARD_WIDTH > b.position.x + 0.01 &&
          a.position.y < b.position.y + 92 - 0.01 &&
          a.position.y + 92 > b.position.y + 0.01
        )
          throw new Error("overlapping cards");
      }
    for (const e of f.edges) {
      expect(r.routes.has(routeKey(e))).toBe(true);
      const path = segments(r.routes.get(routeKey(e))!);
      for (const [a, b] of path)
        for (const n of r.nodes) {
          if (n.id === e.source || n.id === e.target) continue;
          const x = n.position.x,
            y = n.position.y,
            h = cardHeight(n.data.displayName!);
          const vertical = a.x === b.x;
          if (
            vertical
              ? a.x > x + 0.01 &&
                a.x < x + CARD_WIDTH - 0.01 &&
                Math.max(a.y, b.y) > y + 0.01 &&
                Math.min(a.y, b.y) < y + h - 0.01
              : a.y > y + 0.01 &&
                a.y < y + h - 0.01 &&
                Math.max(a.x, b.x) > x + 0.01 &&
                Math.min(a.x, b.x) < x + CARD_WIDTH - 0.01
          )
            throw new Error("connector cuts another card");
        }
    }
  }
  expect(JSON.stringify(f)).toBe(before);
});
it("ينتج صفحة واحدة بخيار متوازن افتراضي وخيار التخطيط الأصلي المستقل", () => {
  const f = fixture(),
    balanced = buildPrintDocument(f.nodes, f.edges, true, {
      paper: "A3",
      landscape: true,
      mode: "fit",
      cardWidth: 65,
    }),
    original = buildPrintDocument(f.nodes, f.edges, true, {
      paper: "A3",
      landscape: true,
      mode: "fit",
      cardWidth: 65,
      singlePageLayout: "original",
    });
  expect(balanced.plan.pages).toBe(1);
  expect(balanced.balanced).not.toBeNull();
  expect(original.balanced).toBeNull();
  expect(balanced.html.match(/data-person=/g)?.length).toBe(f.nodes.length);
  expect(balanced.html.match(/data-source=/g)?.length).toBe(f.edges.length);
  expect(balanced.html).toContain("الأب:");
});
it("يحفظ الغابات والأبوة عند استبعاد أب ويمنع الدورة بدل إخفاء أفراد", () => {
  const f = fixture(),
    nodes = f.nodes.filter((n) => n.id !== "g0-0"),
    ids = new Set(nodes.map((n) => n.id)),
    edges = f.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  const r = pageAwareTreeLayout(
    nodes,
    edges,
    true,
    false,
    400,
    262,
    () => 160,
    () => 92,
  );
  expect(r.nodes).toHaveLength(nodes.length);
  expect(r.routes.size).toBe(edges.length);
  expect(() =>
    pageAwareTreeLayout(
      f.nodes,
      [...f.edges, { source: f.nodes.at(-1)!.id, target: "g0-0" }],
      true,
      false,
      400,
      262,
      () => 160,
      () => 92,
    ),
  ).toThrow();
});
