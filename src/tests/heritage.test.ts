import { expect, it } from "vitest";
import {
  heritageTreeLayout,
  leafOrnament,
  HERITAGE_ROOT_EXTRA,
} from "../features/tree/heritage";
import { buildPrintDocument } from "../features/tree/export";
import { CARD_WIDTH, cardHeight } from "../features/tree/presentation";
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
it("يرسم الجذر أسفل التاج ويحافظ على ترتيب الإخوة يمينًا إلى يسار", () => {
  const ps = [
      person("root"),
      person("third", "root", 3),
      person("first", "root", 1),
      person("second", "root", 2),
      person("leaf", "second"),
    ],
    p = heritageTreeLayout(ps, 28);
  expect(p.get("first")!.x).toBeGreaterThan(p.get("second")!.x);
  expect(p.get("second")!.x).toBeGreaterThan(p.get("third")!.x);
  for (const child of ps.slice(1))
    expect(p.get(child.id)!.y).toBeLessThan(p.get("root")!.y);
});
it("يفصل الأوراق الكثيفة ويدعم غابة دون تغيير البيانات", () => {
  const ps = [
      person("root"),
      ...Array.from({ length: 100 }, (_, i) =>
        person(String(i), "root", i + 1),
      ),
      person("other"),
    ],
    before = JSON.stringify(ps),
    p = heritageTreeLayout(ps, 28);
  expect(p.size).toBe(ps.length);
  expect(JSON.stringify(ps)).toBe(before);
  const leaves = ps.slice(1, 101);
  for (let i = 1; i < leaves.length; i++) {
    const a = p.get(leaves[i - 1].id)!,
      b = p.get(leaves[i].id)!;
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(200);
  }
  expect(p.get("other")!.x).toBeGreaterThan(p.get("root")!.x);
  expect(heritageTreeLayout([], 28).size).toBe(0);
});
it("يصدر الجذع والأوراق والخلفية التراثية في SVG دون قص الجذور", () => {
  const nodes = [
      {
        id: "root",
        position: { x: 0, y: 0 },
        data: {
          person: person("root"),
          root: true,
          heritage: true,
          displayName: "الجد",
          direct: 1,
          total: 1,
        },
      },
      {
        id: "leaf",
        position: { x: 200, y: -250 },
        data: {
          person: person("leaf", "root"),
          root: false,
          heritage: true,
          displayName: "ابن <script>",
          direct: 0,
          total: 0,
        },
      },
    ],
    edges = [{ source: "root", target: "leaf" }];
  for (const mode of ["fit", "tiles"] as const) {
    const r = buildPrintDocument(
      nodes,
      edges,
      false,
      {
        paper: "A3",
        landscape: false,
        mode,
        cardWidth: 65,
        design: "heritage",
      },
      true,
    );
    expect(r.html).toContain("الشجرة التراثية");
    expect(r.html).toContain("#eee3c7");
    expect(r.html).toContain("&lt;script&gt;");
    expect(r.html).not.toContain("<script>");
    expect(r.html).toContain("#a69270");
    if (mode === "fit")
      expect(r.pages[0].viewY + r.plan.usableH / r.plan.scale).toBeCloseTo(
        cardHeight("الجد") + HERITAGE_ROOT_EXTRA + 8,
      );
    for (const page of r.pages)
      for (const n of page.nodes) {
        if (mode === "tiles") {
          const h =
            cardHeight(n.data.displayName ?? n.data.person.name) +
            (n.data.root ? HERITAGE_ROOT_EXTRA : 0);
          expect(n.position.y).toBeGreaterThanOrEqual(0);
          expect(n.position.y + h).toBeLessThanOrEqual(
            r.plan.usableH / r.plan.scale + 0.001,
          );
          expect(n.position.x + CARD_WIDTH).toBeLessThanOrEqual(
            r.plan.usableW / r.plan.scale + 0.001,
          );
        }
      }
  }
  expect(leafOrnament(true)).not.toBe(leafOrnament(false));
});
