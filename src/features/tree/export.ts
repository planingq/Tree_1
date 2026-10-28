import type { Person } from "../../types";
import type { FamilyAnalysis } from "../../utils/family";
import { CARD_WIDTH, cardHeight, wrapName } from "./presentation";
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
  "2A0": [1189, 1682],
  "4A0": [1682, 2378],
  poster: [1000, 2000],
  custom: [1000, 2000],
} as const;
export type PrintOptions = {
  paper: keyof typeof paperSizes;
  landscape: boolean;
  mode: "fit" | "tiles";
  cardWidth: number;
  customWidth?: number;
  customHeight?: number;
  generationLabel?: string;
};
export function printPlan(
  width: number,
  height: number,
  options: PrintOptions,
) {
  const size =
    options.paper === "custom"
      ? [options.customWidth ?? 1000, options.customHeight ?? 2000]
      : paperSizes[options.paper];
  if (
    !size ||
    size.some((n) => !Number.isFinite(n) || n < 100 || n > 5000) ||
    !Number.isFinite(options.cardWidth) ||
    options.cardWidth < 20 ||
    options.cardWidth > 200
  )
    throw new Error(
      "أبعاد الورق يجب أن تكون بين 100 و5000 مم وعرض البطاقة بين 20 و200 مم",
    );
  const small = Math.min(...size),
    large = Math.max(...size),
    pw = options.landscape ? large : small,
    ph = options.landscape ? small : large,
    usableW = pw - 20,
    usableH = ph - 35;
  const scale =
    options.mode === "fit"
      ? Math.min(usableW / width, usableH / height)
      : options.cardWidth / CARD_WIDTH;
  const cols = Math.max(1, Math.ceil((width * scale) / usableW - 1e-8)),
    rows = Math.max(1, Math.ceil((height * scale) / usableH - 1e-8));
  return { pw, ph, usableW, usableH, scale, cols, rows, pages: cols * rows };
}
export type PrintNode = {
  id: string;
  position: { x: number; y: number };
  data: {
    person: Person;
    direct: number;
    total: number;
    fullName?: string;
    displayName?: string;
    selected?: boolean;
  };
};
const nameOf = (n: PrintNode) =>
  n.data.displayName ?? n.data.fullName ?? n.data.person.name;
export type FamilyPrintPage = {
  nodes: PrintNode[];
  edges: { source: string; target: string }[];
  label: string;
  viewX: number;
  viewY: number;
};
// Keep each card whole. Every continuation repeats the parent so a child is never orphaned on another sheet.
export function familyPrintPages(
  nodes: PrintNode[],
  edges: { source: string; target: string }[],
  horizontal: boolean,
  viewW: number,
  viewH: number,
  upward = false,
): FamilyPrintPage[] {
  const byId = new Map(nodes.map((n) => [n.id, n])),
    children = new Map(nodes.map((n) => [n.id, [] as PrintNode[]]));
  edges.forEach((e) => {
    if (byId.has(e.source) && byId.has(e.target))
      children.get(e.source)!.push(byId.get(e.target)!);
  });
  const maxH = Math.max(...nodes.map((n) => cardHeight(nameOf(n)))),
    gap = 28;
  const cols = horizontal
    ? 1
    : Math.max(
        1,
        Math.floor(
          (viewW - (horizontal ? CARD_WIDTH + gap : 0) + gap) /
            (CARD_WIDTH + gap),
        ),
      );
  const rows = !horizontal
      ? 1
      : Math.max(
          1,
          Math.floor(
            (viewH - (horizontal ? 0 : maxH + gap) + gap) / (maxH + gap),
          ),
        ),
    capacity = cols * rows,
    pages: FamilyPrintPage[] = [];
  const childIds = new Set(edges.map((e) => e.target));
  for (const parent of nodes) {
    const kids = children.get(parent.id)!;
    if (!kids.length && childIds.has(parent.id)) continue;
    for (let start = 0; start < Math.max(1, kids.length); start += capacity) {
      const chunk = kids.slice(start, start + capacity),
        usedRows = Math.ceil(chunk.length / cols);
      const parentNode = {
        ...parent,
        position: horizontal
          ? {
              x: viewW - CARD_WIDTH,
              y: Math.max(0, (usedRows * (maxH + gap) - gap - maxH) / 2),
            }
          : { x: (viewW - CARD_WIDTH) / 2, y: 0 },
      };
      const pageNodes = [
        parentNode,
        ...chunk.map((child, i) => ({
          ...child,
          position: {
            x:
              viewW -
              CARD_WIDTH -
              (horizontal ? CARD_WIDTH + gap : 0) -
              (i % cols) * (CARD_WIDTH + gap),
            y:
              Math.floor(i / cols) * (maxH + gap) +
              (horizontal ? 0 : maxH + gap),
          },
        })),
      ];
      pages.push({
        nodes: pageNodes,
        edges: chunk.map((child) => ({ source: parent.id, target: child.id })),
        label: `${parent.data.person.name}${kids.length > capacity ? ` — متابعة ${Math.floor(start / capacity) + 1}/${Math.ceil(kids.length / capacity)}` : ""}`,
        viewX: 0,
        viewY: 0,
      });
      if (pages.length > 200)
        throw new Error(
          "يتجاوز التصدير 200 صفحة عائلية. اختر نطاق أجيال أصغر أو ورقًا أكبر.",
        );
    }
  }
  if (upward && !horizontal)
    for (const page of pages)
      page.nodes = page.nodes.map((n) => ({
        ...n,
        position: {
          x: n.position.x,
          y: viewH - n.position.y - cardHeight(nameOf(n)),
        },
      }));
  return pages;
}
const escape = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
function drawing(
  nodes: PrintNode[],
  edges: { source: string; target: string }[],
  horizontal: boolean,
  upward = false,
) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const lines = edges
    .map((e) => {
      const a = byId.get(e.source),
        b = byId.get(e.target);
      if (!a || !b) return "";
      const x1 = a.position.x + (horizontal ? 0 : CARD_WIDTH / 2),
        y1 =
          a.position.y +
          (horizontal
            ? cardHeight(nameOf(a)) / 2
            : upward
              ? 0
              : cardHeight(nameOf(a))),
        x2 = b.position.x + (horizontal ? CARD_WIDTH : CARD_WIDTH / 2),
        y2 =
          b.position.y +
          (horizontal
            ? cardHeight(nameOf(b)) / 2
            : upward
              ? cardHeight(nameOf(b))
              : 0);
      return `<path d="M${x1},${y1} ${upward ? `C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}` : horizontal ? `H${(x1 + x2) / 2} V${y2} H${x2}` : `V${(y1 + y2) / 2} H${x2} V${y2}`}" fill="none" stroke="#477a60" stroke-width="2" stroke-linejoin="round"/>`;
    })
    .join("");
  const cards = nodes
    .map((n) => {
      const p = n.data.person,
        h = cardHeight(nameOf(n)),
        lines = wrapName(nameOf(n));
      return `<g data-person="${escape(n.id)}" transform="translate(${n.position.x} ${n.position.y})"><rect width="${CARD_WIDTH}" height="${h}" rx="12" fill="${n.data.selected ? "#e8f3df" : "white"}" stroke="${n.data.selected ? "#22653d" : "#729781"}" stroke-width="${n.data.selected ? 3 : 1}"/><text x="${CARD_WIDTH / 2}" y="28" text-anchor="middle" direction="rtl" font-size="16" font-weight="bold">${lines.map((line, i) => `<tspan x="${CARD_WIDTH / 2}" dy="${i ? 24 : 0}">${escape(line)}</tspan>`).join("")}</text><text x="${CARD_WIDTH / 2}" y="${h - 45}" text-anchor="middle" direction="rtl" font-size="12">${p.status === 1 ? "حي" : "متوفى — رحمه الله"}</text><text x="${CARD_WIDTH / 2}" y="${h - 19}" text-anchor="middle" direction="rtl" font-size="11">الأبناء: ${n.data.direct} · إجمالي الذرية: ${n.data.total}</text></g>`;
    })
    .join("");
  return lines + cards;
}
export function buildPrintDocument(
  nodes: PrintNode[],
  edges: { source: string; target: string }[],
  horizontal: boolean,
  options: PrintOptions,
  upward = false,
) {
  if (!nodes.length)
    throw new Error("لا توجد أسماء ضمن الأجيال المختارة للطباعة");
  const minX = Math.min(...nodes.map((n) => n.position.x)) - 8,
    minY = Math.min(...nodes.map((n) => n.position.y)) - 8,
    width = Math.max(...nodes.map((n) => n.position.x + CARD_WIDTH)) - minX + 8,
    height =
      Math.max(...nodes.map((n) => n.position.y + cardHeight(nameOf(n)))) -
      minY +
      8;
  const plan = printPlan(width, height, options);
  if (options.mode === "tiles") {
    const maxH = Math.max(...nodes.map((n) => cardHeight(nameOf(n))));
    plan.scale = Math.min(
      plan.scale,
      plan.usableW / (horizontal ? 2 * CARD_WIDTH + 28 : CARD_WIDTH),
      plan.usableH / (horizontal ? maxH : 2 * maxH + 28),
    );
  }
  const viewW = plan.usableW / plan.scale,
    viewH = plan.usableH / plan.scale;
  const pages: FamilyPrintPage[] =
    options.mode === "tiles"
      ? familyPrintPages(nodes, edges, horizontal, viewW, viewH, upward)
      : [
          {
            nodes,
            edges,
            label: "الشجرة كاملة",
            viewX: horizontal ? minX + width - viewW : minX,
            viewY: upward ? minY + height - viewH : minY,
          },
        ];
  plan.pages = pages.length;
  plan.cols = 1;
  plan.rows = pages.length;
  const content = pages
    .map(
      (page, i) =>
        `<section class="sheet"><header><span>شجرة العائلة · ${escape(page.label)} · ${escape(options.generationLabel ?? "كل الأجيال")}</span><small>صفحة ${i + 1}/${pages.length} · ${horizontal ? "محاذاة لليمين" : upward ? "محاذاة للأسفل — شجرة صاعدة" : "محاذاة للأعلى"}</small></header><svg xmlns="http://www.w3.org/2000/svg" width="${plan.usableW}mm" height="${plan.usableH}mm" viewBox="${page.viewX} ${page.viewY} ${viewW} ${viewH}" style="font-family:Tahoma,Arial,sans-serif">${drawing(page.nodes, page.edges, horizontal, upward)}</svg></section>`,
    )
    .join("");
  return {
    plan,
    pages,
    html: `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>طباعة شجرة العائلة</title><style>@page{size:${plan.pw}mm ${plan.ph}mm;margin:10mm}*{box-sizing:border-box}body{margin:0;color:#254735;font-family:Tahoma,Arial,sans-serif}.sheet{width:${plan.usableW}mm;break-after:page;break-inside:avoid}.sheet:last-child{break-after:auto}header{height:15mm;display:flex;justify-content:space-between;font-size:13px}small{font-size:10px}svg{display:block;direction:ltr}aside{padding:15px;background:#eff5ec;margin-bottom:15px}button{padding:10px 20px;cursor:pointer}@media print{aside{display:none}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}@media screen{.sheet{margin:20px auto;box-shadow:0 0 0 1px #ddd}}</style></head><body><aside>اختر «حفظ بتنسيق PDF» من الطابعات. اضبط المقياس 100٪ والهوامش 10 مم وأوقف رؤوس وتذييلات المتصفح. ${options.mode === "tiles" ? "كل بطاقة كاملة في صفحة، والأب مع أبنائه المباشرين. إذا كثر الأبناء يتكرر الأب في صفحات المتابعة؛ تستكمل الأحفاد في صفحات آبائهم." : "ورقة واحدة؛ قد تصغر الأسماء للشجرة الكبيرة."} عدد الصفحات: ${pages.length}.<br><button onclick="window.print()">طباعة / حفظ PDF</button></aside>${content}</body></html>`,
  };
}
