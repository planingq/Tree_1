import { describe, expect, it } from "vitest";
import type { Person } from "../types";
import { analyzeFamily, validatePeople } from "../utils/family";
const person = (
  id: string,
  parentId = "",
  status: 1 | 2 = 1,
  siblingOrder = 1,
  name = id,
): Person => ({
  id,
  name,
  parentId,
  status,
  siblingOrder,
  fatherName: "",
  customFields: {},
});
describe("العلاقات والإحصائيات", () => {
  it("يحسب الذرية المتفرعة دون احتساب الشخص نفسه", () => {
    const f = analyzeFamily([
      person("a", "", 2),
      person("b", "a"),
      person("c", "a", 2),
      person("d", "b"),
      person("e", "b", 2),
    ]);
    expect(f.stats.get("a")).toEqual({
      direct: 2,
      total: 4,
      living: 2,
      deceased: 2,
    });
    expect(f.stats.get("b")?.total).toBe(2);
    expect(f.stats.get("d")?.total).toBe(0);
    expect(f.generations).toEqual([1, 2, 2]);
    expect(f.branches.map((b) => b.count)).toEqual([3, 1]);
  });
  it("يفصل ترتيب الإخوة عن عمق الجيل ويدعم تعدد الجذور", () => {
    const f = analyzeFamily([
      person("a", "", 1, 99),
      person("b", "a", 1, 85),
      person("c", "a", 1, 2),
      person("z"),
    ]);
    expect(f.depth.get("b")).toBe(1);
    expect(f.children.get("a")?.map((p) => p.id)).toEqual(["c", "b"]);
    expect(f.generations).toEqual([2, 2]);
    expect(f.total).toBe(4);
  });
  it("يسمح بالأسماء المكررة ويعتمد على المعرف", () => {
    const ps = [
      person("001", "", 1, 1, "محمد"),
      person("002", "001", 1, 1, "محمد"),
    ];
    expect(validatePeople(ps).filter((i) => i.level === "error")).toHaveLength(
      0,
    );
    expect(validatePeople(ps).some((i) => i.level === "warning")).toBe(true);
    expect(analyzeFamily(ps).stats.get("001")?.total).toBe(1);
  });
  it("يرفض المعرف المكرر والمرجع المفقود والربط بالنفس والحالة غير الصحيحة", () => {
    const ps = [
      person("1"),
      person("1"),
      person("2", "missing"),
      person("3", "3"),
      { ...person("4"), status: 3 as 1 },
    ];
    const errors = validatePeople(ps).filter((i) => i.level === "error");
    expect(errors.map((i) => i.message).join(" ")).toMatch(/مكرر/);
    expect(errors.some((i) => i.message.includes("الأب غير موجود"))).toBe(true);
    expect(errors.some((i) => i.message.includes("بنفسه"))).toBe(true);
    expect(errors.some((i) => i.message.includes("الحالة"))).toBe(true);
  });
  it("يكشف الدورات المباشرة وغير المتصلة بالجذور", () => {
    const errors = validatePeople([
      person("root"),
      person("a", "c"),
      person("b", "a"),
      person("c", "b"),
    ]);
    expect(errors.some((i) => i.message.includes("دورة"))).toBe(true);
  });
  it("يعالج سلسلة 15000 جيل دون تجاوز المكدس", () => {
    const ps = Array.from({ length: 15000 }, (_, i) =>
      person(String(i), i ? String(i - 1) : ""),
    );
    expect(validatePeople(ps)).toHaveLength(0);
    const f = analyzeFamily(ps);
    expect(f.stats.get("0")?.total).toBe(14999);
    expect(f.generations.length).toBe(15000);
  });
  it("يعالج العائلة الفارغة", () => {
    expect(analyzeFamily([]).generations).toEqual([]);
  });
});

it("يرتب الأبناء تصاعديًا من 1 للأكبر ويرفض الصفر والكسور", () => {
  const children = [
    person("third", "root", 1, 3),
    person("first", "root", 1, 1),
    person("second", "root", 1, 2),
  ];
  const people = [person("root"), ...children];
  expect(
    analyzeFamily(people)
      .children.get("root")
      ?.map((p) => p.id),
  ).toEqual(["first", "second", "third"]);
  expect(
    validatePeople(people).filter((i) => i.level === "error"),
  ).toHaveLength(0);
  for (const order of [0, -1, 1.5]) {
    expect(
      validatePeople([person("invalid", "", 1, order)]).some(
        (i) => i.level === "error",
      ),
    ).toBe(true);
  }
});
