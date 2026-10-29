import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  ancestorPath,
  buildPrintDocument,
  printPlan,
} from "../features/tree/export";
import {
  createExportWorkbook,
  readExcel,
  detectColumns,
  convertRows,
} from "../features/import/excel";
import { analyzeFamily } from "../utils/family";
import { demoPeople } from "../data/demo";
import type { Person } from "../types";
describe("الأسلاف والتصدير والطباعة", () => {
  it("يعرض تسعة أجيال حتى الجذر دون الإخوة أو الأبناء", () => {
    const people: Person[] = Array.from({ length: 9 }, (_, i) => ({
      id: String(i + 1),
      parentId: i ? String(i) : "",
      name: `جيل ${i + 1}`,
      status: 1,
      siblingOrder: 1,
      fatherName: "",
      customFields: {},
    }));
    people.push({ ...people[8], id: "sibling", siblingOrder: 2 });
    const family = analyzeFamily(people);
    expect(ancestorPath("9", family).map((p) => p.id)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
    ]);
    expect(ancestorPath("missing", family)).toEqual([]);
    expect(ancestorPath("1", family)).toHaveLength(1);
  });
  it("يحسب حجم الورق والاتجاه والتقسيم دون فقد مساحة الرسم", () => {
    for (const paper of ["A4", "A3", "A2", "A1", "A0"] as const) {
      for (const landscape of [true, false]) {
        const fit = printPlan(1200, 1800, {
          paper,
          landscape,
          mode: "fit",
          cardWidth: 65,
        });
        expect(fit.pages).toBe(1);
        expect(fit.usableW / fit.scale).toBeGreaterThanOrEqual(1200 - 0.001);
        expect(fit.usableH / fit.scale).toBeGreaterThanOrEqual(1800 - 0.001);
      }
    }
    const tiled = printPlan(4000, 3000, {
      paper: "A4",
      landscape: false,
      mode: "tiles",
      cardWidth: 65,
    });
    expect(tiled.pages).toBeGreaterThan(1);
    expect((tiled.cols * tiled.usableW) / tiled.scale).toBeGreaterThanOrEqual(
      4000,
    );
    expect((tiled.rows * tiled.usableH) / tiled.scale).toBeGreaterThanOrEqual(
      3000,
    );
  });
  it("يطبع نصوص SVG آمنة ويعطي خطأ للرسوم الفارغة", () => {
    const node = {
      id: "1",
      position: { x: 0, y: 0 },
      data: {
        person: { ...demoPeople[0], name: "<script> & اسم" },
        direct: 2,
        total: 5,
      },
    };
    const { html, plan } = buildPrintDocument([node], [], false, {
      paper: "A3",
      landscape: true,
      mode: "fit",
      cardWidth: 65,
    });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("<svg");
    expect(html).not.toContain("إجمالي الذرية");
    expect(html).not.toContain("الأبناء:");
    expect(html).toContain("&lt;script&gt;");
    expect(plan.pages).toBe(1);
    expect(() =>
      buildPrintDocument([], [], false, {
        paper: "A4",
        landscape: false,
        mode: "fit",
        cardWidth: 65,
      }),
    ).toThrow();
  });
  it("يصدر ملف Excel قابلًا لإعادة الاستيراد بالأصفار والترتيب والحقول المخصصة", async () => {
    const people = demoPeople.map((p) => ({
      ...p,
      customFields: { ...p.customFields, اختبار: "=1+1" },
    }));
    const book = createExportWorkbook(people),
      sheet = book.Sheets[book.SheetNames[0]];
    expect(sheet["A2"].t).toBe("s");
    const bytes = XLSX.write(book, { type: "array", bookType: "xlsx" });
    const raw = await readExcel(new File([bytes], "export.xlsx"));
    const result = convertRows(raw, detectColumns(raw.headers));
    expect(result.people).toEqual(people);
    expect(result.issues.filter((i) => i.level === "error")).toHaveLength(0);
    expect(
      Object.values(sheet).some(
        (cell) => cell && typeof cell === "object" && "f" in cell,
      ),
    ).toBe(false);
  });
});
