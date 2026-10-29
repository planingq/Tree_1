import { expect, it } from "vitest";
import {
  printTreeLayout,
  PRINT_CARD_WIDTH,
  printNameHeight,
} from "../features/tree/printTree";
import { buildPrintDocument } from "../features/tree/export";
import type { PrintNode } from "../features/tree/export";
function fixture() {
  const counts = [1, 4, 12, 36, 80, 120, 80, 40],
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
        position: { x: 0, y: 0 },
        data: {
          person: {
            id,
            parentId,
            name: `فرد ${i}`,
            status: 1,
            siblingOrder: i + 1,
            fatherName: "",
            customFields: {},
          },
          displayName: `فرد ${i}`,
          direct: 3,
          total: 100,
        },
      });
      if (parentId) edges.push({ source: parentId, target: id });
    });
    previous = ids;
  });
  return { nodes, edges };
}
it("يحافظ على العائلات المتصلة وترتيب الأجيال دون شبكة حرة", () => {
  const f = fixture(),
    before = JSON.stringify(f);
  for (const [horizontal, upward] of [
    [true, false],
    [false, false],
    [false, true],
  ]) {
    const nodes = printTreeLayout(f.nodes, f.edges, horizontal, upward),
      byId = new Map(nodes.map((n) => [n.id, n]));
    expect(nodes).toHaveLength(f.nodes.length);
    for (const e of f.edges) {
      const a = byId.get(e.source)!,
        b = byId.get(e.target)!;
      if (horizontal) expect(a.position.x).toBeGreaterThan(b.position.x);
      else if (upward) expect(a.position.y).toBeGreaterThan(b.position.y);
      else expect(a.position.y).toBeLessThan(b.position.y);
      expect(b.data.printRoute).toBeDefined();
    }
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i],
          b = nodes[j];
        if (
          a.position.x < b.position.x + PRINT_CARD_WIDTH &&
          a.position.x + PRINT_CARD_WIDTH > b.position.x &&
          a.position.y < b.position.y + printNameHeight(b) &&
          a.position.y + printNameHeight(a) > b.position.y
        )
          throw new Error("overlapping print cards");
      }
  }
  expect(JSON.stringify(f)).toBe(before);
});
it("يطبع الاسم وحده ويحتوي جميع الأشخاص والروابط في الصفحة", () => {
  const f = fixture(),
    r = buildPrintDocument(f.nodes, f.edges, true, {
      paper: "A3",
      landscape: true,
      mode: "fit",
      cardWidth: 24,
      autoCardSize: true,
    });
  expect(r.plan.pages).toBe(1);
  expect(r.html.match(/data-person=/g)?.length).toBe(f.nodes.length);
  expect(r.html.match(/data-source=/g)?.length).toBe(f.edges.length);
  expect(r.html).not.toContain("الأب:");
  expect(r.html).not.toContain("الأبناء:");
  expect(r.html).not.toContain("إجمالي الذرية:");
  expect(
    r.pages[0].nodes.every(
      (n) => !n.data.person.parentId || n.data.printRoute !== undefined,
    ),
  ).toBe(true);
});
it("يصغر البطاقة بالتحكم اليدوي ويكيّف الوضع التلقائي مع الورق", () => {
  const f = fixture(),
    nodes = f.nodes.slice(0, 5),
    ids = new Set(nodes.map((n) => n.id)),
    edges = f.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  const opts = {
    paper: "A3" as const,
    landscape: true,
    mode: "tiles" as const,
    autoCardSize: false,
  };
  const small = buildPrintDocument(nodes, edges, false, {
      ...opts,
      cardWidth: 12,
    }),
    large = buildPrintDocument(nodes, edges, false, { ...opts, cardWidth: 32 });
  expect(small.plan.scale * PRINT_CARD_WIDTH).toBeCloseTo(12);
  expect(large.plan.scale * PRINT_CARD_WIDTH).toBeCloseTo(32);
  const a4 = buildPrintDocument(nodes, edges, false, {
      ...opts,
      paper: "A4",
      autoCardSize: true,
      cardWidth: 24,
    }),
    a0 = buildPrintDocument(nodes, edges, false, {
      ...opts,
      paper: "A0",
      autoCardSize: true,
      cardWidth: 24,
    });
  expect(a0.plan.scale).toBeGreaterThan(a4.plan.scale);
});
