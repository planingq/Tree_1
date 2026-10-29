import { heritageTreeLayout } from "./heritage";
import { compactTreeLayout } from "./layout";
import { filterStatus } from "./presentation";
import type { StatusFilter } from "./presentation";
import { generationRange, firstName } from "./presentation";
import { useMemo, useState } from "react";
import { Download, Printer, X } from "lucide-react";
import Dialog from "../../components/Dialog";
import type { Person } from "../../types";
import type { FamilyAnalysis } from "../../utils/family";
import { buildPrintDocument, paperSizes } from "./export";
import type { PrintNode, PrintOptions } from "./export";
export default function ExportControls({
  nodes,
  edges,
  people,
  family,
  horizontal,
  upward,
  names,
  gap,
  showStatus,
  status,
  heritage,
}: {
  nodes: PrintNode[];
  edges: { source: string; target: string }[];
  people: Person[];
  family: FamilyAnalysis;
  horizontal: boolean;
  upward: boolean;
  names: Map<string, string>;
  gap: number;
  showStatus: boolean;
  status: StatusFilter;
  heritage: boolean;
}) {
  const [open, setOpen] = useState(false),
    [scope, setScope] = useState("visible"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [fromGeneration, setFromGeneration] = useState(1),
    [toGeneration, setToGeneration] = useState(0),
    [printStatus, setPrintStatus] = useState<StatusFilter>(status),
    [printShowStatus, setPrintShowStatus] = useState(showStatus);
  const [options, setOptions] = useState<PrintOptions>({
    paper: "A3",
    landscape: true,
    mode: "tiles",
    cardWidth: 65,
  });
  const targetPeople = useMemo(
    () =>
      filterStatus(
        generationRange(
          scope === "all" ? people : nodes.map((n) => n.data.person),
          family,
          fromGeneration,
          toGeneration || family.generations.length,
        ),
        printStatus,
      ),
    [scope, people, nodes, family, fromGeneration, toGeneration, printStatus],
  );
  const printData = useMemo(() => {
    const positions = heritage
        ? heritageTreeLayout(targetPeople, gap, printShowStatus)
        : compactTreeLayout(
            targetPeople,
            horizontal,
            upward,
            gap,
            printShowStatus,
          ),
      ids = new Set(targetPeople.map((p) => p.id)),
      selectedIds = new Set(
        nodes.filter((n) => n.data.selected).map((n) => n.id),
      );
    return {
      nodes: targetPeople.map((p) => ({
        id: p.id,
        position: positions.get(p.id)!,
        data: {
          person: p,
          displayName: firstName(p.name),
          fullName: names.get(p.id) ?? p.name,
          showStatus: printShowStatus,
          selected: selectedIds.has(p.id),
          heritage,
          root: !ids.has(p.parentId),
          ...family.stats.get(p.id)!,
        },
      })),
      edges: targetPeople
        .filter((p) => ids.has(p.parentId))
        .map((p) => ({ source: p.parentId, target: p.id })),
    };
  }, [
    targetPeople,
    heritage,
    horizontal,
    upward,
    gap,
    printShowStatus,
    nodes,
    names,
    family,
  ]);
  return (
    <>
      <button
        className="button secondary"
        onClick={() => {
          setError("");
          setPrintStatus(status);
          setPrintShowStatus(showStatus);
          setOpen(true);
        }}
      >
        <Printer size={16} /> تصدير وطباعة
      </button>
      {open && (
        <Dialog onClose={() => setOpen(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-title"
          >
            <div className="section-header">
              <h2 id="export-title">تصدير الشجرة والطباعة</h2>
              <button
                aria-label="إغلاق خيارات التصدير"
                onClick={() => setOpen(false)}
              >
                <X />
              </button>
            </div>
            <div className="form-grid">
              <label>
                حالة الأفراد للطباعة
                <select
                  aria-label="حالة الأفراد للطباعة"
                  value={printStatus}
                  onChange={(e) =>
                    setPrintStatus(e.target.value as StatusFilter)
                  }
                >
                  <option value="all">الكل</option>
                  <option value="1">الأحياء</option>
                  <option value="2">المتوفون</option>
                </select>
              </label>
              <label className="status-toggle">
                <input
                  type="checkbox"
                  checked={printShowStatus}
                  onChange={(e) => setPrintShowStatus(e.target.checked)}
                />{" "}
                إظهار نص الحالة في الطباعة
              </label>
              <label>
                نطاق التصدير
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                >
                  <option value="visible">
                    الأفراد الظاهرون فقط ({nodes.length})
                  </option>
                  <option value="all">
                    جميع أفراد العائلة ({people.length})
                  </option>
                </select>
              </label>
              <label>
                من الجيل للطباعة
                <select
                  aria-label="من الجيل للطباعة"
                  value={fromGeneration}
                  onChange={(e) => {
                    setFromGeneration(Number(e.target.value));
                    setToGeneration(0);
                  }}
                >
                  {family.generations.map((_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                إلى الجيل للطباعة
                <select
                  aria-label="إلى الجيل للطباعة"
                  value={toGeneration}
                  onChange={(e) => setToGeneration(Number(e.target.value))}
                >
                  <option value={0}>كل الأجيال</option>
                  {family.generations.map((_, i) =>
                    i + 1 >= fromGeneration ? (
                      <option key={i} value={i + 1}>
                        {i + 1}
                      </option>
                    ) : null,
                  )}
                </select>
              </label>
              <label>
                حجم الورق
                <select
                  value={options.paper}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      paper: e.target.value as PrintOptions["paper"],
                    })
                  }
                >
                  {Object.keys(paperSizes).map((p) => (
                    <option key={p} value={p}>
                      {p === "poster"
                        ? "لوحة 100 × 200 سم"
                        : p === "custom"
                          ? "مقاس مخصص (مم)"
                          : p}
                    </option>
                  ))}
                </select>
              </label>
              {options.paper === "custom" && (
                <>
                  <label>
                    عرض الورق (مم)
                    <input
                      aria-label="عرض الورق (مم)"
                      type="number"
                      min="100"
                      max="5000"
                      value={options.customWidth ?? 1000}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          customWidth: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    ارتفاع الورق (مم)
                    <input
                      aria-label="ارتفاع الورق (مم)"
                      type="number"
                      min="100"
                      max="5000"
                      value={options.customHeight ?? 2000}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          customHeight: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </>
              )}
              <label>
                اتجاه الورقة
                <select
                  value={options.landscape ? "landscape" : "portrait"}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      landscape: e.target.value === "landscape",
                    })
                  }
                >
                  <option value="landscape">أفقي</option>
                  <option value="portrait">عمودي</option>
                </select>
              </label>
              <label>
                توزيع الشجرة
                <select
                  value={options.mode}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      mode: e.target.value as PrintOptions["mode"],
                    })
                  }
                >
                  <option value="tiles">صفحات عائلية دون تقسيم البطاقات</option>
                  <option value="fit">الشجرة كاملة في صفحة واحدة</option>
                </select>
              </label>
              {options.mode === "tiles" && (
                <label>
                  عرض بطاقة الشخص على الورق
                  <select
                    value={options.cardWidth}
                    onChange={(e) =>
                      setOptions({
                        ...options,
                        cardWidth: Number(e.target.value),
                      })
                    }
                  >
                    <option value={50}>50 مم — متوسط</option>
                    <option value={65}>65 مم — واضح</option>
                    <option value={80}>80 مم — كبير</option>
                  </select>
                </label>
              )}
            </div>
            <p className="notice">
              المحاذاة تلقائيًا لليمين للشجرة الأفقية، وللأعلى للعمودية وللأسفل
              للشجرة الصاعدة. الصفحات العائلية تجمع الأب مع أبنائه المباشرين دون
              قص البطاقات؛ عند كثرة الأبناء يتكرر الأب على صفحات المتابعة، وتظهر
              الأحفاد في صفحات آبائهم. استخدم ورقًا أكبر أو نطاق أجيال أصغر لجمع
              فرع أكبر في ورقة واحدة.
            </p>
            <p className="muted">
              PDF يحفظ الرسم بخطوط ونصوص قابلة للتكبير. بعد فتح المعاينة اختر
              «طباعة / حفظ PDF»، ثم «حفظ بتنسيق PDF» أو طابعتك. Excel يحفظ
              البيانات وترتيب الإخوة والحقول المخصصة؛ ولا يحفظ رسم الشجرة.
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="export-actions">
              <button
                className="button primary"
                disabled={!targetPeople.length}
                onClick={() => {
                  setError("");
                  try {
                    const { html } = buildPrintDocument(
                      printData.nodes,
                      printData.edges,
                      horizontal,
                      {
                        ...options,
                        design: heritage ? "heritage" : "classic",
                        generationLabel: `الأجيال ${fromGeneration} إلى ${toGeneration || family.generations.length}`,
                      },
                      upward,
                    );
                    const popup = window.open("", "_blank");
                    if (!popup)
                      throw new Error(
                        "اسمح بالنوافذ المنبثقة لهذا الموقع ثم أعد المحاولة.",
                      );
                    popup.opener = null;
                    popup.document.open();
                    popup.document.write(html);
                    popup.document.close();
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "تعذر إعداد الطباعة",
                    );
                  }
                }}
              >
                <Printer size={17} /> فتح معاينة الطباعة / PDF
              </button>
              <button
                className="button secondary"
                disabled={busy || !targetPeople.length}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const { exportPeople } = await import("../import/excel");
                    exportPeople(targetPeople);
                  } catch {
                    setError("تعذر تصدير Excel. أعد المحاولة.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Download size={17} />
                {busy ? "جارٍ التصدير…" : "تنزيل Excel"}
              </button>
            </div>
          </section>
        </Dialog>
      )}
    </>
  );
}
