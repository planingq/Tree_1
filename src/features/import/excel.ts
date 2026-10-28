import * as XLSX from "xlsx";
import type { Person, Issue } from "../../types";
import { validatePeople } from "../../utils/family";
export const fields = [
  "id",
  "status",
  "siblingOrder",
  "name",
  "fatherName",
  "parentId",
] as const;
export type Field = (typeof fields)[number];
export const labels: Record<Field, string> = {
  id: "ID",
  status: "الحالة",
  siblingOrder: "ترتيب الشخص بين إخوته",
  name: "الاسم",
  fatherName: "أسم الاب",
  parentId: "يرأسه",
};
const normalize = (s: string) =>
  s.trim().toLowerCase().replace(/[أإآ]/g, "ا").replace(/\s+/g, "");
export function detectColumns(headers: string[]): Record<Field, string> {
  return Object.fromEntries(
    fields.map((f) => [
      f,
      headers.find((h) => normalize(h) === normalize(labels[f])) ??
        (f === "siblingOrder"
          ? headers.find((h) =>
              ["تسلسل الجيل", "ترتيب الإخوة", "ترتيب الشخص بين اخوته"].some(
                (alias) => normalize(h) === normalize(alias),
              ),
            )
          : undefined) ??
        "",
    ]),
  ) as Record<Field, string>;
}
export type RawSheet = {
  headers: string[];
  rows: Record<string, string>[];
  rowNumbers: number[];
};
export async function readExcel(file: File): Promise<RawSheet> {
  if (!/\.xlsx?$/i.test(file.name)) throw new Error("اختر ملف XLSX أو XLS");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("الحد الأقصى لحجم الملف 10 ميجابايت");
  const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
  if (!book.SheetNames.length) throw new Error("الملف لا يحتوي أوراق عمل");
  const matrix = XLSX.utils.sheet_to_json<string[]>(
    book.Sheets[book.SheetNames[0]],
    { header: 1, raw: false, defval: "", blankrows: true },
  );
  const headers = (matrix[0] ?? []).map(String).map((h) => h.trim());
  if (
    !headers.length ||
    new Set(headers).size !== headers.length ||
    headers.some((h) => !h)
  )
    throw new Error("عناوين الأعمدة يجب أن تكون غير فارغة وغير مكررة");
  const rows: RawSheet["rows"] = [],
    rowNumbers: number[] = [];
  matrix.slice(1).forEach((r, i) => {
    if (r.some((v) => String(v).trim())) {
      rows.push(
        Object.fromEntries(
          headers.map((h, j) => [h, String(r[j] ?? "").trim()]),
        ),
      );
      rowNumbers.push(i + 2);
    }
  });
  if (rows.length > 20000) throw new Error("الحد الأقصى 20,000 فرد لكل ملف");
  return { headers, rows, rowNumbers };
}
export function convertRows(
  sheet: RawSheet,
  mapping: Record<Field, string>,
): { people: Person[]; issues: Issue[] } {
  const missing = fields.filter((f) => !mapping[f]);
  if (missing.length)
    return {
      people: [],
      issues: missing.map((f) => ({
        row: 1,
        level: "error",
        message: `اربط العمود: ${labels[f]}`,
      })),
    };
  if (new Set(Object.values(mapping)).size !== fields.length)
    return {
      people: [],
      issues: [
        { row: 1, level: "error", message: "يجب ربط كل حقل بعمود مختلف" },
      ],
    };
  const people = sheet.rows.map((row) => ({
    id: row[mapping.id],
    name: row[mapping.name],
    status: Number(row[mapping.status]) as 1 | 2,
    siblingOrder:
      row[mapping.siblingOrder] === ""
        ? NaN
        : Number(row[mapping.siblingOrder]),
    fatherName: row[mapping.fatherName],
    parentId: row[mapping.parentId],
    customFields: Object.fromEntries(
      sheet.headers
        .filter((h) => !Object.values(mapping).includes(h))
        .map((h) => [h, row[h]]),
    ),
  }));
  const issues = validatePeople(people, sheet.rowNumbers);
  if (!people.length)
    issues.push({
      row: 0,
      level: "error",
      message: "لا توجد بيانات للاستيراد",
    });
  return { people, issues };
}
export function downloadTemplate() {
  const sheet = XLSX.utils.aoa_to_sheet([
    Object.values(labels),
    ["001", 2, 1, "عبدالله السالم", "", ""],
    ["002", 1, 1, "محمد السالم", "عبدالله السالم", "001"],
  ]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "العائلة");
  XLSX.writeFile(book, "نموذج-شجرة-العائلة.xlsx");
}

export function createExportWorkbook(people: Person[]) {
  const customKeys = [
    ...new Set(people.flatMap((p) => Object.keys(p.customFields))),
  ];
  const sheet = XLSX.utils.aoa_to_sheet([
    [...Object.values(labels), ...customKeys],
    ...people.map((p) => [
      p.id,
      p.status,
      p.siblingOrder,
      p.name,
      p.fatherName,
      p.parentId,
      ...customKeys.map((key) => p.customFields[key] ?? ""),
    ]),
  ]);
  sheet["!cols"] = [14, 10, 25, 30, 30, 14, ...customKeys.map(() => 24)].map(
    (wch) => ({ wch }),
  );
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "العائلة");
  return book;
}
export function exportPeople(people: Person[]) {
  XLSX.writeFile(createExportWorkbook(people), "شجرة-العائلة.xlsx");
}
