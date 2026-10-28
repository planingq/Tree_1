import {
  CARD_WIDTH,
  cardHeight,
  generationRange,
  firstName,
  treeDirection,
} from "./presentation";
import { useMemo, useState } from "react";
import dagre from "@dagrejs/dagre";
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
}: {
  nodes: PrintNode[];
  edges: { source: string; target: string }[];
  people: Person[];
  family: FamilyAnalysis;
  horizontal: boolean;
  upward: boolean;
  names: Map<string, string>;
  gap: number;
}) {
  const [open, setOpen] = useState(false),
    [scope, setScope] = useState("visible"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [fromGeneration, setFromGeneration] = useState(1),
    [toGeneration, setToGeneration] = useState(0);
  const [options, setOptions] = useState<PrintOptions>({
    paper: "A3",
    landscape: true,
    mode: "tiles",
    cardWidth: 65,
  });
  const targetPeople = useMemo(
    () =>
      generationRange(
        scope === "all" ? people : nodes.map((n) => n.data.person),
        family,
        fromGeneration,
        toGeneration || family.generations.length,
      ),
    [scope, people, nodes, family, fromGeneration, toGeneration],
  );
  const printData = useMemo(() => {
    const ids = new Set(targetPeople.map((p) => p.id));
    if (scope === "visible")
      return {
        nodes: nodes.filter((n) => ids.has(n.id)),
        edges: edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
      };
    const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    graph.setGraph({
      rankdir: treeDirection(horizontal, upward),
      nodesep: Math.max(16, gap / 2),
      ranksep: gap,
    });
    const ordered = [...family.roots];
    for (let i = 0; i < ordered.length; i++)
      ordered.push(...family.children.get(ordered[i].id)!);
    const filtered = ordered.filter((p) => ids.has(p.id));
    filtered.forEach((p) =>
      graph.setNode(p.id, {
        width: CARD_WIDTH,
        height: cardHeight(firstName(p.name)),
      }),
    );
    const allEdges = filtered
      .filter((p) => ids.has(p.parentId))
      .map((p) => ({ source: p.parentId, target: p.id }));
    allEdges.forEach((e) => graph.setEdge(e.source, e.target));
    dagre.layout(graph);
    return {
      nodes: filtered.map((p) => {
        const position = graph.node(p.id);
        return {
          id: p.id,
          position: {
            x: position.x - CARD_WIDTH / 2,
            y: position.y - cardHeight(firstName(p.name)) / 2,
          },
          data: {
            person: p,
            fullName: names.get(p.id) ?? p.name,
            displayName: firstName(p.name),
            ...family.stats.get(p.id)!,
          },
        };
      }),
      edges: allEdges,
    };
  }, [
    scope,
    nodes,
    edges,
    family,
    horizontal,
    upward,
    targetPeople,
    names,
    gap,
  ]);
  return (
    <>
      <button
        className="button secondary"
        onClick={() => {
          setError("");
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
