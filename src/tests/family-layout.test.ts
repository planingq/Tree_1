import { expect, it } from "vitest";
import { familyLayout } from "../features/tree/familyLayout";
import type {
  LayoutPerson,
  FamilyLayout,
  Point,
} from "../features/tree/familyLayout";
import { buildPrintDocument } from "../features/tree/export";
const n = (id: string, parentId = "", order = 1): LayoutPerson => ({
  id,
  parentId,
  order,
  width: 120,
  height: 34,
});
export const example = () => [
  n("root"),
  ...Array.from({ length: 7 }, (_, i) => n(`c${i + 1}`, "root", i + 1)),
  ...[9, 3, 5, 2, 0, 1, 4].flatMap((count, i) =>
    Array.from({ length: count }, (_, j) =>
      n(`c${i + 1}-${j + 1}`, `c${i + 1}`, j + 1),
    ),
  ),
];
function safe(items: LayoutPerson[], result: FamilyLayout) {
  expect(result.positions.size).toBe(items.length);
  for (const [i, a] of items.entries()) {
    const p = result.positions.get(a.id)!;
    expect(p.x).toBeGreaterThanOrEqual(-1e-6);
    expect(p.y).toBeGreaterThanOrEqual(-1e-6);
    expect(p.x + a.width).toBeLessThanOrEqual(result.width + 1e-6);
    expect(p.y + a.height).toBeLessThanOrEqual(result.height + 1e-6);
    for (const b of items.slice(i + 1)) {
      const q = result.positions.get(b.id)!;
      expect(
        p.x + a.width <= q.x + 1e-6 ||
          q.x + b.width <= p.x + 1e-6 ||
          p.y + a.height <= q.y + 1e-6 ||
          q.y + b.height <= p.y + 1e-6,
        `overlap ${a.id} ${b.id}`,
      ).toBe(true);
    }
  }
  // Verify every segment against every unrelated card, not just edge endpoints/counts.
  for (const [child, points] of result.routes) {
    const parent = items.find((n) => n.id === child)!.parentId;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i];
      expect(Math.abs(a.x - b.x) < 1e-6 || Math.abs(a.y - b.y) < 1e-6).toBe(
        true,
      );
      for (const n of items) {
        if (n.id === child || n.id === parent) continue;
        const p = result.positions.get(n.id)!;
        const crosses =
          Math.abs(a.x - b.x) < 1e-6
            ? a.x > p.x + 1e-6 &&
              a.x < p.x + n.width - 1e-6 &&
              Math.max(a.y, b.y) > p.y + 1e-6 &&
              Math.min(a.y, b.y) < p.y + n.height - 1e-6
            : a.y > p.y + 1e-6 &&
              a.y < p.y + n.height - 1e-6 &&
              Math.max(a.x, b.x) > p.x + 1e-6 &&
              Math.min(a.x, b.x) < p.x + n.width - 1e-6;
        expect(crosses, `line ${parent}->${child} crosses ${n.id}`).toBe(false);
      }
    }
  }
}
function ordered(
  items: LayoutPerson[],
  r: FamilyLayout,
  horizontal: boolean,
  upward: boolean,
) {
  for (const parent of items) {
    const children = items
      .filter((n) => n.parentId === parent.id)
      .sort((a, b) => a.order - b.order);
    for (let i = 1; i < children.length; i++) {
      const a = r.positions.get(children[i - 1].id)!,
        b = r.positions.get(children[i].id)!;
      // A subtree row/column can advance, but never sort siblings by subtree size.
      if (horizontal)
        expect(
          b.x < a.x - 1e-6 || (Math.abs(a.x - b.x) < 1e-6 && b.y > a.y),
        ).toBe(true);
      else
        expect(
          (upward ? b.y < a.y - 1e-6 : b.y > a.y + 1e-6) ||
            (Math.abs(a.y - b.y) < 1e-6 && b.x < a.x),
        ).toBe(true);
    }
  }
}
it("يوزع مثال 7 أبناء و9 و3 و5 أحفاد على العرض والطول مع ممرات آمنة وترتيب متسلسل", () => {
  const items = example(),
    before = JSON.stringify(items);
  for (const [horizontal, upward] of [
    [false, false],
    [true, false],
    [false, true],
  ])
    for (const area of [
      { width: 1120, height: 720 },
      { width: 720, height: 1120 },
    ]) {
      const r = familyLayout(items, horizontal, upward, 28, area);
      safe(items, r);
      ordered(items, r, horizontal, upward);
      expect(r.width / r.height).toBeCloseTo(area.width / area.height, 6);
      expect(r.routes.size).toBe(items.length - 1);
      // Large family is genuinely staggered; grandchildren do not reserve a single giant generation strip.
      const children = items
        .filter((n) => n.parentId === "root")
        .map((n) => r.positions.get(n.id)!);
      expect(
        new Set(children.map((p) => (horizontal ? p.x : p.y))).size,
      ).toBeGreaterThan(1);
    }
  expect(JSON.stringify(items)).toBe(before);
});
it("يعالج جذورًا متعددة وأسماء طويلة وحالات متباينة دون تداخل أو موصل يمر في بطاقة", () => {
  const items = [
    ...example(),
    n("other-root"),
    n("other-kid", "other-root"),
  ].map((p, i) => ({ ...p, height: i % 4 ? 34 : 72 }));
  for (const h of [false, true])
    safe(items, familyLayout(items, h, false, 40, { width: 900, height: 650 }));
  expect(() =>
    familyLayout([n("a", "b"), n("b", "a")], false, false),
  ).toThrow();
});
it("يحتوي PDF الأفراد والخطوط ضمن جميع أحجام الورق ويحفظ التبعية", () => {
  const items = example(),
    nodes = items.map((p) => ({
      id: p.id,
      position: { x: 0, y: 0 },
      data: {
        person: {
          id: p.id,
          parentId: p.parentId,
          name: p.id,
          status: 1 as const,
          siblingOrder: p.order,
          fatherName: "",
          customFields: {},
        },
        direct: 0,
        total: 0,
      },
    })),
    edges = items
      .filter((p) => p.parentId)
      .map((p) => ({ source: p.parentId, target: p.id }));
  for (const paper of ["A4", "A3", "A0", "4A0"] as const)
    for (const landscape of [true, false])
      for (const [h, up] of [
        [false, false],
        [true, false],
        [false, true],
      ]) {
        const r = buildPrintDocument(
            nodes,
            edges,
            h,
            {
              paper,
              landscape,
              mode: "fit",
              cardWidth: 24,
              autoCardSize: true,
            },
            up,
          ),
          page = r.pages[0],
          W = r.plan.usableW / r.plan.scale,
          H = r.plan.usableH / r.plan.scale;
        for (const node of page.nodes) {
          expect(node.position.x).toBeGreaterThanOrEqual(page.viewX - 1e-6);
          expect(node.position.y).toBeGreaterThanOrEqual(page.viewY - 1e-6);
          expect(node.position.x + 120).toBeLessThanOrEqual(
            page.viewX + W + 1e-6,
          );
          expect(node.position.y + 34).toBeLessThanOrEqual(
            page.viewY + H + 1e-6,
          );
          for (const p of node.data.printRoute ?? []) {
            expect(p.x).toBeGreaterThanOrEqual(page.viewX - 1e-6);
            expect(p.y).toBeGreaterThanOrEqual(page.viewY - 1e-6);
            expect(p.x).toBeLessThanOrEqual(page.viewX + W + 1e-6);
            expect(p.y).toBeLessThanOrEqual(page.viewY + H + 1e-6);
          }
        }
      }
});
it("لا يمر خط في بطاقة بعد توزيع PDF على كامل الورقة أو بعد تقسيمه إلى مجموعات", () => {
  const items = example().map((n, i) => ({ ...n, height: i % 5 ? 34 : 53 }));
  const nodes = items.map((p) => ({
      id: p.id,
      position: { x: 0, y: 0 },
      data: {
        person: {
          id: p.id,
          parentId: p.parentId,
          name: p.height > 34 ? "اسم طويل للاختبار" : "اسم",
          status: 1 as const,
          siblingOrder: p.order,
          fatherName: "",
          customFields: {},
        },
        direct: 0,
        total: 0,
      },
    })),
    edges = items
      .filter((p) => p.parentId)
      .map((p) => ({ source: p.parentId, target: p.id }));
  for (const mode of ["fit", "tiles"] as const)
    for (const [h, up] of [
      [false, false],
      [true, false],
      [false, true],
    ]) {
      const doc = buildPrintDocument(
        nodes,
        edges,
        h,
        { paper: "A3", landscape: true, mode, cardWidth: 32 },
        up,
      );
      for (const page of doc.pages) {
        const idOf = (n: (typeof page.nodes)[number]) =>
          n.data.instanceKey ?? n.id;
        const parents = new Map(page.edges.map((e) => [e.target, e.source]));
        const instanceItems = page.nodes.map((n) => ({
          id: idOf(n),
          parentId: parents.get(idOf(n)) ?? "",
          order: n.data.person.siblingOrder,
          width: 120,
          height: n.data.person.name.includes("طويل") ? 53 : 34,
        }));
        const r = {
          positions: new Map(page.nodes.map((n) => [idOf(n), n.position])),
          routes: new Map(
            page.nodes
              .filter((n) => n.data.printRoute)
              .map((n) => [idOf(n), n.data.printRoute!]),
          ),
          width: doc.plan.usableW / doc.plan.scale,
          height: doc.plan.usableH / doc.plan.scale,
        };
        safe(instanceItems, r);
      }
    }
});
