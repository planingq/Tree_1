import { PRINT_CARD_WIDTH, printNameHeight } from "../features/tree/printTree";
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
      autoCardSize: false,
    });
    expect(result.pages.length).toBeGreaterThan(1);
    const found = new Set<string>();
    for (const page of result.pages) {
      expect(page.nodes[0].id).toBe("root");
      for (const n of page.nodes) {
        found.add(n.id);
        expect(n.position.x).toBeGreaterThanOrEqual(-0.001);
        expect(n.position.y).toBeGreaterThanOrEqual(-0.001);
        expect(n.position.x + PRINT_CARD_WIDTH).toBeLessThanOrEqual(
          result.plan.usableW / result.plan.scale + 0.001,
        );
        expect(n.position.y + printNameHeight(n)).toBeLessThanOrEqual(
          result.plan.usableH / result.plan.scale + 0.001,
        );
      }
      for (const e of page.edges)
        expect(
          page.nodes.some((n) => (n.data.instanceKey ?? n.id) === e.source) &&
            page.nodes.some((n) => (n.data.instanceKey ?? n.id) === e.target),
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
    for (const n of page.nodes) {
      expect(n.position.x).toBeGreaterThanOrEqual(page.viewX);
      expect(n.position.y).toBeGreaterThanOrEqual(page.viewY);
      expect(n.position.x + PRINT_CARD_WIDTH).toBeLessThanOrEqual(
        page.viewX + r.plan.usableW / r.plan.scale,
      );
      expect(n.position.y + printNameHeight(n)).toBeLessThanOrEqual(
        page.viewY + r.plan.usableH / r.plan.scale,
      );
    }
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

it("يفصل الاسم الأول في الرسم عن الاسم الكامل في التفاصيل ويختار اتجاه الصعود", async () => {
  const { firstName, treeDirection } =
    await import("../features/tree/presentation");
  expect(firstName("محمد عبدالله السالم")).toBe("محمد");
  expect(firstName("عبد الرحمن محمد")).toBe("عبد الرحمن");
  expect(treeDirection(false, true)).toBe("BT");
  expect(treeDirection(false, false)).toBe("TB");
  expect(treeDirection(true, false)).toBe("RL");
});
it("يطبع الشجرة الصاعدة من الأسفل للأعلى مع بقاء البطاقات كاملة", () => {
  const ps = [
      person("root", "محمد السالم"),
      person("child", "خالد السالم", "root"),
    ],
    f = analyzeFamily(ps);
  const nodes = ps.map((p, i) => ({
    id: p.id,
    position: { x: 0, y: i ? 0 : 240 },
    data: {
      person: p,
      displayName: p.name.split(" ")[0],
      fullName: "اسم كامل مخفي في الرسم",
      ...f.stats.get(p.id)!,
    },
  }));
  const edges = [{ source: "root", target: "child" }];
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
      },
      true,
    );
    expect(r.html).toContain("شجرة صاعدة");
    expect(r.html).not.toContain("اسم كامل مخفي في الرسم");
    for (const page of r.pages) {
      expect(
        page.nodes.find((n) => n.id === "root")!.position.y,
      ).toBeGreaterThan(page.nodes.find((n) => n.id === "child")!.position.y);
    }
  }
});
