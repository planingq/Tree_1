import { PRINT_CARD_WIDTH, printNameHeight } from "../features/tree/printTree";
import { expect, it } from "vitest";
import { compactTreeLayout } from "../features/tree/layout";
import {
  CARD_WIDTH,
  cardHeight,
  filterStatus,
} from "../features/tree/presentation";
import { buildPrintDocument } from "../features/tree/export";
import { analyzeFamily } from "../utils/family";
import type { Person } from "../types";
const person = (id: string, parentId = "", siblingOrder = 1): Person => ({
  id,
  name: id,
  parentId,
  siblingOrder,
  status: 1,
  fatherName: "",
  customFields: {},
});
it("يجمع أبناء ماجد المتجاورين رغم وجود فروع كبيرة قبله وبعده", () => {
  const ps = [
    person("root"),
    person("large", "root", 1),
    person("ماجد", "root", 2),
    person("other", "root", 3),
    ...Array.from({ length: 30 }, (_, i) =>
      person("large" + i, "large", i + 1),
    ),
    person("جواد", "ماجد", 2),
    person("عبدالعزيز", "ماجد", 1),
    person("otherkid", "other"),
  ];
  for (const horizontal of [true, false]) {
    const p = compactTreeLayout(ps, horizontal, false, 28),
      a = p.get("جواد")!,
      b = p.get("عبدالعزيز")!;
    expect(horizontal ? Math.abs(a.y - b.y) : Math.abs(a.x - b.x)).toBe(
      horizontal ? cardHeight("جواد") + 12 : CARD_WIDTH + 12,
    );
  }
});
it("يرتب الأخوة بحسب ترتيبهم ويعالج فروعًا عميقة دون recursion", () => {
  const ps = [
    person("root"),
    person("third", "root", 3),
    person("first", "root", 1),
    person("second", "root", 2),
  ];
  const p = compactTreeLayout(ps, true, false, 28);
  expect(p.get("first")!.y).toBeLessThan(p.get("second")!.y);
  expect(p.get("second")!.y).toBeLessThan(p.get("third")!.y);
  for (const upward of [false, true]) {
    const v = compactTreeLayout(ps, false, upward, 28);
    expect(v.get("first")!.x).toBeGreaterThan(v.get("second")!.x);
    expect(v.get("second")!.x).toBeGreaterThan(v.get("third")!.x);
  }
  const deep = Array.from({ length: 10000 }, (_, i) =>
    person(String(i), i ? String(i - 1) : ""),
  );
  expect(compactTreeLayout(deep, false, true, 28).size).toBe(10000);
});
it("يحفظ التصفية دون تغيير العلاقات أو استبعاد ذرية أب مخفي", () => {
  const ps = [
    { ...person("dead"), status: 2 as const },
    person("alive", "dead"),
  ];
  expect(filterStatus(ps, "1").map((p) => p.id)).toEqual(["alive"]);
  expect(filterStatus(ps, "2").map((p) => p.id)).toEqual(["dead"]);
  expect(
    compactTreeLayout(filterStatus(ps, "1"), false, false, 28).has("alive"),
  ).toBe(true);
  expect(ps[1].parentId).toBe("dead");
});
it("يضبط الصفحات حسب الورق ويجمع عائلات متعددة دون قص أو موصلات مختلطة", () => {
  const ps = Array.from({ length: 9 }, (_, i) =>
      person(String(i), i ? String(i - 1) : ""),
    ),
    f = analyzeFamily(ps),
    nodes = ps.map((p, i) => ({
      id: p.id,
      position: { x: i * 200, y: i * 120 },
      data: { person: p, ...f.stats.get(p.id)! },
    })),
    edges = ps.slice(1).map((p) => ({ source: p.parentId, target: p.id }));
  const small = buildPrintDocument(nodes, edges, true, {
      paper: "A4",
      landscape: true,
      mode: "tiles",
      cardWidth: 65,
    }),
    large = buildPrintDocument(nodes, edges, true, {
      paper: "A0",
      landscape: true,
      mode: "tiles",
      cardWidth: 65,
    });
  expect(small.plan.pages).toBeGreaterThan(large.plan.pages);
  expect(large.plan.pages).toBe(1);
  for (const r of [small, large])
    for (const page of r.pages) {
      const instances = new Map(
        page.nodes.map((n) => [n.data.instanceKey ?? n.id, n]),
      );
      for (const n of page.nodes) {
        expect(n.position.x).toBeGreaterThanOrEqual(0);
        expect(n.position.y).toBeGreaterThanOrEqual(0);
        expect(n.position.x + PRINT_CARD_WIDTH).toBeLessThanOrEqual(
          r.plan.usableW / r.plan.scale + 0.001,
        );
        expect(n.position.y + printNameHeight(n)).toBeLessThanOrEqual(
          r.plan.usableH / r.plan.scale + 0.001,
        );
      }
      for (const e of page.edges) {
        expect(instances.has(e.source)).toBe(true);
        expect(instances.has(e.target)).toBe(true);
        expect(e.source.split(":")[0]).toBe(e.target.split(":")[0]);
      }
    }
});
it("يخفي الحالة في PDF افتراضيًا ويظهرها عند الطلب مع اللون الأغمق", () => {
  const node = {
    id: "dead",
    position: { x: 0, y: 0 },
    data: {
      person: { ...person("dead"), status: 2 as const },
      direct: 0,
      total: 0,
    },
  };
  const options = {
    paper: "A4" as const,
    landscape: true,
    mode: "fit" as const,
    cardWidth: 65,
  };
  const r = buildPrintDocument([node], [], false, options);
  expect(r.html).not.toContain("متوفى — رحمه الله");
  expect(r.html).toContain("#e1e3dc");
  expect(
    buildPrintDocument(
      [{ ...node, data: { ...node.data, showStatus: true } }],
      [],
      false,
      options,
    ).html,
  ).toContain("متوفى — رحمه الله");
});
