import { afterEach, describe, expect, it, vi } from "vitest";
import { loadFamily, saveFamily, STORAGE_KEY } from "../utils/storage";
import { demoPeople } from "../data/demo";
afterEach(() => vi.unstubAllGlobals());
describe("حماية التخزين المحلي من البيانات التالفة", () => {
  it("يحمل بيانات سليمة مع معرفات نصية", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => JSON.stringify(demoPeople),
    });
    expect(loadFamily().people?.[0].id).toBe("001");
  });
  it("لا يعتمد بيانات مخزنة ذات دورة أو بنية مفقودة", () => {
    for (const raw of [
      "{bad",
      "[{}]",
      JSON.stringify([{ ...demoPeople[0], parentId: "001" }]),
    ]) {
      vi.stubGlobal("localStorage", { getItem: () => raw });
      expect(loadFamily().people).toBeNull();
      expect(loadFamily().error).not.toBe("");
    }
  });
  it("يُرجع خطأ واضحًا عند فشل الحفظ ولا يدعي نجاحه", () => {
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw new Error("quota");
      },
    });
    expect(saveFamily(demoPeople)).toContain("تعذر الحفظ");
  });
  it("يحفظ نفس البيانات في المفتاح المخصص", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { setItem });
    expect(saveFamily(demoPeople)).toBe("");
    expect(setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(demoPeople),
    );
  });
});
