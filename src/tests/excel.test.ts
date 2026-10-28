import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  convertRows,
  detectColumns,
  readExcel,
} from "../features/import/excel";
const headers = [
  " ID ",
  "الحالة",
  "تسلسل الجيل",
  "الاسم",
  "اسم الأب",
  "يرأسه",
  "المدينة",
];
const mapping = detectColumns(headers);
describe("استيراد Excel", () => {
  it("يطابق اختلاف الهمزات والمسافات ويحفظ الأصفار والحقول الإضافية", () => {
    const r = convertRows(
      {
        headers,
        rows: [
          {
            " ID ": "001",
            الحالة: "1",
            "تسلسل الجيل": "99",
            الاسم: "محمد",
            "اسم الأب": "",
            يرأسه: "",
            المدينة: "الرياض",
          },
        ],
        rowNumbers: [7],
      },
      mapping,
    );
    expect(r.people[0].id).toBe("001");
    expect(r.people[0].customFields).toEqual({ المدينة: "الرياض" });
    expect(r.issues).toHaveLength(0);
  });
  it("يرفض الأعمدة المفقودة أو المعاد استخدامها", () => {
    expect(
      convertRows({ headers: [], rows: [], rowNumbers: [] }, detectColumns([]))
        .issues,
    ).toHaveLength(6);
    expect(
      convertRows(
        { headers, rows: [], rowNumbers: [] },
        { ...mapping, name: mapping.id },
      ).issues[0].message,
    ).toContain("مختلف");
  });
  it("يحافظ على رقم الصف الأصلي للأخطاء", () => {
    const r = convertRows(
      {
        headers,
        rows: [
          {
            " ID ": "001",
            الحالة: "9",
            "تسلسل الجيل": "1",
            الاسم: "محمد",
            "اسم الأب": "",
            يرأسه: "",
            المدينة: "",
          },
        ],
        rowNumbers: [11],
      },
      mapping,
    );
    expect(r.issues[0].row).toBe(11);
  });
  it("يرفض ملفًا فارغ البيانات", () => {
    expect(
      convertRows({ headers, rows: [], rowNumbers: [] }, mapping).issues.some(
        (i) => i.level === "error",
      ),
    ).toBe(true);
  });
  for (const bookType of ["xlsx", "xls"] as const)
    it(`يقرأ ${bookType} بالعربية ويحفظ الصفوف الفارغة والمعرف النصي`, async () => {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([
          headers,
          ["001", 1, 1, "محمد", "", "", "الرياض"],
          [],
          ["002", 1, 1, "أحمد", "محمد", "001", "جدة"],
        ]),
        "العائلة",
      );
      const bytes = XLSX.write(wb, { type: "array", bookType });
      const sheet = await readExcel(new File([bytes], `family.${bookType}`));
      expect(sheet.rowNumbers).toEqual([2, 4]);
      const r = convertRows(sheet, detectColumns(sheet.headers));
      expect(r.people[0].id).toBe("001");
      expect(r.people[1].parentId).toBe("001");
      expect(r.issues).toHaveLength(0);
    });
});
describe("رفض العلاقات غير الصالحة بعد التحويل", () => {
  const hs = ["ID", "الحالة", "تسلسل الجيل", "الاسم", "أسم الاب", "يرأسه"];
  const make = (values: string[][]) =>
    convertRows(
      {
        headers: hs,
        rows: values.map((row) =>
          Object.fromEntries(hs.map((h, i) => [h, row[i]])),
        ),
        rowNumbers: values.map((_, i) => i + 2),
      },
      detectColumns(hs),
    );
  it("يرفض الدورات والمراجع المفقودة ومعرفًا مكررًا", () => {
    const cycle = make([
      ["a", "1", "1", "أحمد", "محمد", "b"],
      ["b", "1", "1", "محمد", "أحمد", "a"],
    ]);
    expect(cycle.issues.some((i) => i.message.includes("دورة"))).toBe(true);
    expect(
      make([["a", "1", "1", "أحمد", "", "z"]]).issues.some((i) =>
        i.message.includes("غير موجود"),
      ),
    ).toBe(true);
    expect(
      make([
        ["a", "1", "1", "أحمد", "", ""],
        ["a", "1", "2", "محمد", "", ""],
      ]).issues.some((i) => i.message.includes("مكرر")),
    ).toBe(true);
  });
  it("الأسماء المتطابقة واختلاف اسم الأب تحذيرات فقط", () => {
    const r = make([
      ["a", "2", "8", "أحمد", "", ""],
      ["b", "1", "1", "أحمد", "اسم مختلف", "a"],
    ]);
    expect(r.issues.filter((i) => i.level === "error")).toHaveLength(0);
    expect(r.issues.filter((i) => i.level === "warning")).toHaveLength(2);
  });
  it("يرفض الامتداد الخاطئ والعناوين المكررة", async () => {
    await expect(readExcel(new File(["text"], "data.csv"))).rejects.toThrow(
      "XLSX",
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["ID", "ID"],
        ["1", "2"],
      ]),
      "test",
    );
    await expect(
      readExcel(
        new File(
          [XLSX.write(wb, { type: "array", bookType: "xlsx" })],
          "test.xlsx",
        ),
      ),
    ).rejects.toThrow("مكررة");
  });
});

it("يكتشف عنوان ترتيب الشخص بين إخوته الجديد ويقبل العنوان القديم", () => {
  for (const title of [
    "ترتيب الشخص بين إخوته",
    " ترتيب الشخص بين اخوته ",
    "تسلسل الجيل",
    "ترتيب الإخوة",
  ]) {
    expect(detectColumns([title]).siblingOrder).toBe(title);
  }
});
