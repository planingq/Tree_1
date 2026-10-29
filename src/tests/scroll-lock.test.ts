import { expect, it, vi } from "vitest";
import { lockBodyScroll } from "../utils/scrollLock";
it("يبقي قفل ملء الشاشة والحوار متداخلين ويعيد التمرير بأي ترتيب إغلاق", () => {
  vi.stubGlobal("document", { body: { style: { overflow: "auto" } } });
  const a = lockBodyScroll(),
    b = lockBodyScroll();
  expect(document.body.style.overflow).toBe("hidden");
  a();
  expect(document.body.style.overflow).toBe("hidden");
  a();
  b();
  expect(document.body.style.overflow).toBe("auto");
  vi.unstubAllGlobals();
});
