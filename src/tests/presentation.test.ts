import { expect, it } from "vitest";
import {
  familyNames,
  cardHeight,
  CARD_WIDTH,
  generationRange,
} from "../features/tree/presentation";
import { buildPrintDocument } from "../features/tree/export";
import { analyzeFamily } from "../utils/family";
import type { Person } from "../types";
const person = (id: string, name: string, parentId = ""): Person => ({
  id,
  name,
  parentId,
  status: 1,
  siblingOrder: 1,
  fatherName: "",
  customFields: {},
});
it("يبني الاسم إلى الجذر دون تكرار اسم العائلة ودون إسقاط اسم متكرر بين جيلين", () => {
  const family = analyzeFamily([
    person("1", "عبدالله السالم"),
    person("2", "محمد السالم", "1"),
    person("3", "خالد محمد عبدالله السالم", "2"),
    person("4", "خالد", "3"),
  ]);
  const names = familyNames(family);
  expect(names.get("2")).toBe("محمد عبدالله السالم");
  expect(names.get("3")).toBe("خالد محمد عبدالله السالم");
  expect(names.get("4")).toBe("خالد خالد محمد عبدالله السالم");
});
it("يختار الأجيال الفعلية دون ترتيب الإخوة", () => {
  const ps = [person("1", "أ"), person("2", "ب", "1"), person("3", "ج", "2")],
    f = analyzeFamily(ps);
  expect(generationRange(ps, f, 2, 2).map((p) => p.id)).toEqual(["2"]);
});
it("لا يقص أي بطاقة ويبقي الأب مع الأبناء في كل صفحة متابعة في الاتجاهين", () => {
  const ps = [
      person("root", "عبدالله"),
      ...Array.from({ length: 35 }, (_, i) =>
        person(
          String(i),
          "اسم طويل جدًا من أسماء العائلة للتأكد من ارتفاع البطاقة",
          "root",
        ),
      ),
    ],
    f = analyzeFamily(ps),
    names = familyNames(f),
    nodes = ps.map((p, i) => ({
      id: p.id,
      position: { x: i * 300, y: i * 200 },
      data: { person: p, fullName: names.get(p.id), ...f.stats.get(p.id)! },
    })),
    edges = ps.slice(1).map((p) => ({ source: "root", target: p.id }));
  for (const horizontal of [true, false]) {
    const result = buildPrintDocument(nodes, edges, horizontal, {
      paper: "A4",
      landscape: false,
      mode: "tiles",
      cardWidth: 80,
    });
    expect(result.pages.length).toBeGreaterThan(1);
    const found = new Set<string>();
    for (const page of result.pages) {
      expect(page.nodes[0].id).toBe("root");
      for (const n of page.nodes) {
        found.add(n.id);
        expect(n.position.x).toBeGreaterThanOrEqual(-0.001);
        expect(n.position.y).toBeGreaterThanOrEqual(-0.001);
        expect(n.position.x + CARD_WIDTH).toBeLessThanOrEqual(
          result.plan.usableW / result.plan.scale + 0.001,
        );
        expect(
          n.position.y + cardHeight(n.data.fullName ?? n.data.person.name),
        ).toBeLessThanOrEqual(result.plan.usableH / result.plan.scale + 0.001);
      }
      for (const e of page.edges)
        expect(
          page.nodes.some((n) => n.id === e.source) &&
            page.nodes.some((n) => n.id === e.target),
        ).toBe(true);
    }
    expect(found.size).toBe(ps.length);
  }
});
it("يحاذي الرسم يمينًا أو أعلى في ورقة واحدة ويخفي المعرف من النص المرئي", () => {
  const nodes = [
    {
      id: "secret-id",
      position: { x: 30, y: 30 },
      data: { person: person("secret-id", "عبدالله"), direct: 0, total: 0 },
    },
  ];
  for (const horizontal of [true, false]) {
    const r = buildPrintDocument(nodes, [], horizontal, {
      paper: "A3",
      landscape: true,
      mode: "fit",
      cardWidth: 65,
    });
    const page = r.pages[0];
    if (horizontal)
      expect(page.viewX + r.plan.usableW / r.plan.scale).toBeCloseTo(
        30 + CARD_WIDTH + 8,
      );
    else expect(page.viewY).toBe(22);
    expect(r.html).not.toContain(">secret-id");
    expect(r.html).toContain('text-anchor="middle"');
  }
});
it("يدعم 4A0 والمقاس المخصص ويرفض أبعادًا غير صالحة", () => {
  const nodes = [
    {
      id: "a",
      position: { x: 0, y: 0 },
      data: { person: person("a", "اسم"), direct: 0, total: 0 },
    },
  ];
  const r = buildPrintDocument(nodes, [], false, {
    paper: "custom",
    landscape: true,
    mode: "fit",
    cardWidth: 65,
    customWidth: 1200,
    customHeight: 2400,
  });
  expect(r.plan.pw).toBe(2400);
  expect(r.plan.ph).toBe(1200);
  expect(() =>
    buildPrintDocument(nodes, [], false, {
      paper: "custom",
      landscape: true,
      mode: "fit",
      cardWidth: 65,
      customWidth: NaN,
    }),
  ).toThrow();
});
