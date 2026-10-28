import type { Person } from "../../types";
import type { FamilyAnalysis } from "../../utils/family";
export function ancestorPath(id: string, family: FamilyAnalysis): Person[] {
  const result: Person[] = [],
    seen = new Set<string>();
  let p = family.byId.get(id);
  while (p && !seen.has(p.id)) {
    seen.add(p.id);
    result.push(p);
    p = family.byId.get(p.parentId);
  }
  return result.reverse();
}
export const paperSizes = {
  A4: [210, 297],
  A3: [297, 420],
  A2: [420, 594],
  A1: [594, 841],
  A0: [841, 1189],
} as const;
export type PrintOptions = {
  paper: keyof typeof paperSizes;
  landscape: boolean;
  mode: "fit" | "tiles";
  cardWidth: number;
};
export function printPlan(
  width: number,
  height: number,
  options: PrintOptions,
) {
  const size = paperSizes[options.paper],
    pw = options.landscape ? size[1] : size[0],
    ph = options.landscape ? size[0] : size[1];
  const usableW = pw - 20,
    usableH = ph - 35;
  const scale =
    options.mode === "fit"
      ? Math.min(usableW / width, usableH / height)
      : options.cardWidth / 240;
  const cols = Math.max(1, Math.ceil((width * scale) / usableW - 1e-8)),
    rows = Math.max(1, Math.ceil((height * scale) / usableH - 1e-8));
  return { pw, ph, usableW, usableH, scale, cols, rows, pages: cols * rows };
}
export type PrintNode = {
  id: string;
  position: { x: number; y: number };
  data: { person: Person; direct: number; total: number };
};
const escape = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function buildPrintDocument(
  nodes: PrintNode[],
  edges: { source: string; target: string }[],
  horizontal: boolean,
  options: PrintOptions,
) {
  if (!nodes.length) throw new Error("لا توجد أسماء ظاهرة للطباعة");
  const minX = Math.min(...nodes.map((n) => n.position.x)) - 15,
    minY = Math.min(...nodes.map((n) => n.position.y)) - 15;
  const width = Math.max(...nodes.map((n) => n.position.x + 240)) - minX + 15,
    height = Math.max(...nodes.map((n) => n.position.y + 126)) - minY + 15;
  const plan = printPlan(width, height, options);
  if (plan.pages > 200)
    throw new Error(
      `تحتاج الشجرة ${plan.pages} صفحة. اختر ورقًا أكبر أو مسار أسلاف محددًا أو وضع ملاءمة الصفحة (الحد 200 صفحة).`,
    );
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const lines = edges
    .map((e) => {
      const a = byId.get(e.source),
        b = byId.get(e.target);
      if (!a || !b) return "";
      const x1 = a.position.x + (horizontal ? 0 : 120),
        y1 = a.position.y + (horizontal ? 63 : 126),
        x2 = b.position.x + (horizontal ? 240 : 120),
        y2 = b.position.y + (horizontal ? 63 : 0);
      return `<path d="M${x1},${y1} ${horizontal ? `H${(x1 + x2) / 2} V${y2} H${x2}` : `V${(y1 + y2) / 2} H${x2} V${y2}`}" fill="none" stroke="#648871" stroke-width="1.5"/>`;
    })
    .join("");
  const cards = nodes
    .map((n) => {
      const p = n.data.person;
      const words = p.name.split(/\s+/),
        nameLines: string[] = [""];
      words.forEach((word) => {
        const i = nameLines.length - 1;
        if (nameLines[i].length + word.length > 24 && nameLines[i])
          nameLines.push(word);
        else nameLines[i] += (nameLines[i] ? " " : "") + word;
      });
      return `<g transform="translate(${n.position.x} ${n.position.y})"><rect width="240" height="126" rx="9" fill="white" stroke="#8ca891"/><path d="M10 2H230" stroke="${p.status === 1 ? "#618c62" : "#aaa48e"}" stroke-width="3"/><text x="225" y="26" direction="rtl" text-anchor="start" font-size="${Math.min(13, 42 / nameLines.length)}" font-weight="bold">${nameLines
        .map(
          (line, i) =>
            `<tspan x="225" dy="${i ? Math.min(19, 42 / nameLines.length) : 0}">${escape(line)}</tspan>`,
        )
        .join(
          "",
        )}</text><text x="225" y="73" direction="rtl" text-anchor="start" font-size="10">${escape(p.id)} · ${p.status === 1 ? "حي" : "متوفى — رحمه الله"}</text><text x="225" y="99" direction="rtl" text-anchor="start" font-size="10">الأبناء: ${n.data.direct} · إجمالي الذرية: ${n.data.total}</text></g>`;
    })
    .join("");
  let pages = "";
  for (let row = 0; row < plan.rows; row++)
    for (let col = 0; col < plan.cols; col++) {
      const viewW = plan.usableW / plan.scale,
        viewH = plan.usableH / plan.scale;
      pages += `<section class="sheet"><header>شجرة العائلة · ${nodes.length} فردًا · ${horizontal ? "أفقي" : "عمودي"} <small>صف ${row + 1}، عمود ${col + 1} · صفحة ${row * plan.cols + col + 1}/${plan.pages}</small></header><svg xmlns="http://www.w3.org/2000/svg" width="${plan.usableW}mm" height="${plan.usableH}mm" viewBox="${minX + col * viewW} ${minY + row * viewH} ${viewW} ${viewH}" style="font-family:Tahoma,Arial,sans-serif"><use href="#family-drawing"/></svg></section>`;
    }
  return {
    plan,
    html: `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>طباعة شجرة العائلة</title><style>@page{size:${plan.pw}mm ${plan.ph}mm;margin:10mm}*{box-sizing:border-box}body{margin:0;color:#254735;font-family:Tahoma,Arial,sans-serif}.sheet{width:${plan.usableW}mm;break-after:page}.sheet:last-child{break-after:auto}header{height:15mm;display:flex;justify-content:space-between;font-size:14px}small{font-size:10px}svg{display:block;direction:ltr}aside{padding:15px;background:#eff5ec;margin-bottom:15px}button{padding:10px 20px;cursor:pointer}@media print{aside{display:none}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}@media screen{.sheet{margin:20px auto;box-shadow:0 0 0 1px #ddd}}</style></head><body><aside>اختر «حفظ بتنسيق PDF» من قائمة الطابعات لتنزيل PDF. اضبط الهوامش على 10 مم، والمقياس 100٪، وأوقف رؤوس وتذييلات المتصفح. عدد الصفحات: ${plan.pages}.<br><button onclick="window.print()">طباعة / حفظ PDF</button></aside><svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs><g id="family-drawing">${lines}${cards}</g></defs></svg>${pages}</body></html>`,
  };
}
