import type { Person } from "../types";
import { validatePeople } from "./family";
export const STORAGE_KEY = "judhur-demo-family-v1";
export function loadFamily(): { people: Person[] | null; error: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { people: null, error: "" };
    const value: unknown = JSON.parse(raw);
    if (
      !Array.isArray(value) ||
      !value.every(
        (p) =>
          p &&
          typeof p.id === "string" &&
          typeof p.name === "string" &&
          typeof p.parentId === "string" &&
          typeof p.fatherName === "string" &&
          p.customFields &&
          typeof p.customFields === "object" &&
          !Array.isArray(p.customFields) &&
          Object.values(p.customFields).every((v) => typeof v === "string"),
      ) ||
      validatePeople(value as Person[]).some((i) => i.level === "error")
    )
      throw new Error("invalid");
    return { people: value as Person[], error: "" };
  } catch {
    return {
      people: null,
      error:
        "تعذرت قراءة البيانات المحلية أو كانت غير صالحة. عُرضت البيانات التجريبية دون استبدال النسخة المخزنة.",
    };
  }
}
export function saveFamily(people: Person[]): string {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
    return "";
  } catch {
    return "تعذر الحفظ المحلي. التغييرات متاحة في هذه الجلسة فقط؛ قد تكون مساحة المتصفح ممتلئة.";
  }
}
