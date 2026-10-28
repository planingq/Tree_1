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
}: {
  nodes: PrintNode[];
  edges: { source: string; target: string }[];
  people: Person[];
  family: FamilyAnalysis;
  horizontal: boolean;
}) {
  const [open, setOpen] = useState(false),
    [scope, setScope] = useState("visible"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<PrintOptions>({
    paper: "A3",
    landscape: true,
    mode: "tiles",
    cardWidth: 65,
  });
  const targetPeople =
    scope === "all" ? people : nodes.map((n) => n.data.person);
  const printData = useMemo(() => {
    if (scope === "visible") return { nodes, edges };
    const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    graph.setGraph({
      rankdir: horizontal ? "RL" : "TB",
      nodesep: 30,
      ranksep: 65,
    });
    const ordered = [...family.roots];
    for (let i = 0; i < ordered.length; i++)
      ordered.push(...family.children.get(ordered[i].id)!);
    ordered.forEach((p) => graph.setNode(p.id, { width: 240, height: 126 }));
    const allEdges = ordered
      .filter((p) => family.byId.has(p.parentId))
      .map((p) => ({ source: p.parentId, target: p.id }));
    allEdges.forEach((e) => graph.setEdge(e.source, e.target));
    dagre.layout(graph);
    return {
      nodes: ordered.map((p) => {
        const position = graph.node(p.id);
        return {
          id: p.id,
          position: { x: position.x - 120, y: position.y - 63 },
          data: { person: p, ...family.stats.get(p.id)! },
        };
      }),
      edges: allEdges,
    };
  }, [scope, nodes, edges, people, family, horizontal]);
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
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
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
                  <option value="tiles">حجم مقروء على صفحات متتابعة</option>
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
              للطباعة الكبيرة اختر A2 أو A1 أو A0. وضع الصفحات المتتابعة يحافظ
              على حجم الأسماء ويمكن جمع الصفحات حسب أرقام الصف والعمود. ملاءمة
              الصفحة قد تصغّر الأسماء عند كثرة الأفراد.
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
                      options,
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
