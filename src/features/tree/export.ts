import {
  PRINT_CARD_WIDTH,
  printNameHeight,
  printNameLines,
  printTreeLayout,
} from "./printTree";
import { spreadArtworkToPage } from "./pageLayout";
import {
  heritageNodeSize,
  HERITAGE_ANCHOR_X,
  HERITAGE_ANCHOR_Y,
  leafOrnament,
  trunkOrnament,
  woodBranch,
} from "./heritage";
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
  design?: "classic" | "heritage";
  autoCardSize?: boolean;
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
    options.cardWidth < 8 ||
    options.cardWidth > 80
  )
    throw new Error(
      "أبعاد الورق يجب أن تكون بين 100 و5000 مم وعرض البطاقة بين 8 و80 مم",
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
      : options.cardWidth /
        (options.design === "heritage" ? 240 : PRINT_CARD_WIDTH);
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
    showStatus?: boolean;
    heritage?: boolean;
    root?: boolean;
    instanceKey?: string;
    generation?: number;
    printParentLabel?: string;
    printBus?: number;
    leafSide?: number;
  };
};
const nameOf = (n: PrintNode) =>
  n.data.displayName ?? n.data.fullName ?? n.data.person.name;
const nodeH = (n: PrintNode) =>
  n.data.heritage
    ? heritageNodeSize(!!n.data.root, n.data.showStatus ?? false).height
    : printNameHeight(n);
const nodeW = (n: PrintNode) =>
  n.data.heritage
    ? heritageNodeSize(!!n.data.root, n.data.showStatus ?? false).width
    : PRINT_CARD_WIDTH;
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
  children.forEach((list) =>
    list.sort(
      (a, b) =>
        a.data.person.siblingOrder - b.data.person.siblingOrder ||
        a.id.localeCompare(b.id),
    ),
  );
  const W = Math.max(...nodes.map(nodeW));
  const maxH = Math.max(...nodes.map(nodeH)),
    gap = 20;
  const capacity = horizontal
    ? Math.max(1, Math.floor((viewH + gap) / (maxH + gap)))
    : Math.max(1, Math.floor((viewW + gap) / (W + gap)));
  const pages: FamilyPrintPage[] = [];
  let current: FamilyPrintPage = {
      nodes: [],
      edges: [],
      label: "",
      viewX: 0,
      viewY: 0,
    },
    usedX = 0,
    usedY = 0,
    rowH = 0,
    groupId = 0;
  const finish = () => {
    if (!current.nodes.length) return;
    pages.push(current);
    if (pages.length > 200)
      throw new Error(
        "يتجاوز التصدير 200 صفحة. اختر نطاقًا أصغر أو ورقًا أكبر.",
      );
    current = { nodes: [], edges: [], label: "", viewX: 0, viewY: 0 };
    usedX = 0;
    usedY = 0;
    rowH = 0;
  };
  const childIds = new Set(
    edges
      .filter((e) => byId.has(e.source) && byId.has(e.target))
      .map((e) => e.target),
  );
  for (const parent of nodes) {
    const kids = children.get(parent.id)!;
    if (!kids.length && childIds.has(parent.id)) continue;
    for (let start = 0; start < Math.max(1, kids.length); start += capacity) {
      const chunk = kids.slice(start, start + capacity);
      const groupW = horizontal
        ? chunk.length
          ? 2 * W + gap
          : W
        : Math.max(W, chunk.length * (W + gap) - gap);
      const groupH = horizontal
        ? Math.max(maxH, chunk.length * (maxH + gap) - gap)
        : chunk.length
          ? 2 * maxH + gap
          : maxH;
      if (usedX + groupW > viewW + 0.001) {
        usedY += rowH + gap;
        usedX = 0;
        rowH = 0;
      }
      if (usedY + groupH > viewH + 0.001) finish();
      const shiftX = viewW - usedX - groupW,
        shiftY = usedY,
        token = `group-${groupId++}:`;
      const local = [
        {
          ...parent,
          position: horizontal
            ? { x: groupW - W, y: (groupH - nodeH(parent)) / 2 }
            : { x: (groupW - W) / 2, y: 0 },
        },
        ...chunk.map((n, i) => ({
          ...n,
          position: horizontal
            ? { x: 0, y: i * (maxH + gap) }
            : {
                x: groupW - W - i * (W + gap),
                y: maxH + gap,
              },
        })),
      ];
      current.nodes.push(
        ...local.map((n) => ({
          ...n,
          data: { ...n.data, instanceKey: token + n.id, printBus: undefined },
          position: { x: n.position.x + shiftX, y: n.position.y + shiftY },
        })),
      );
      current.edges.push(
        ...chunk.map((n) => ({
          source: token + parent.id,
          target: token + n.id,
        })),
      );
      const title =
        parent.data.person.name +
        (kids.length > capacity
          ? ` — متابعة ${Math.floor(start / capacity) + 1}`
          : "");
      current.label = (current.label ? current.label + "، " : "") + title;
      usedX += groupW + gap;
      rowH = Math.max(rowH, groupH);
    }
  }
  finish();
  if (upward && !horizontal)
    for (const page of pages)
      page.nodes = page.nodes.map((n) => ({
        ...n,
        position: { x: n.position.x, y: viewH - n.position.y - nodeH(n) },
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
  heritage = false,
  lineWidth = 1.7,
) {
  const byId = new Map(nodes.map((n) => [n.data.instanceKey ?? n.id, n]));
  const lines = edges
    .map((e) => {
      const a = byId.get(e.source),
        b = byId.get(e.target);
      if (!a || !b) return "";
      const x1 =
          a.position.x +
          (heritage
            ? HERITAGE_ANCHOR_X
            : horizontal
              ? 0
              : PRINT_CARD_WIDTH / 2),
        y1 =
          a.position.y +
          (heritage
            ? HERITAGE_ANCHOR_Y
            : horizontal
              ? nodeH(a) / 2
              : upward
                ? 0
                : nodeH(a)),
        x2 =
          b.position.x +
          (heritage
            ? HERITAGE_ANCHOR_X
            : horizontal
              ? PRINT_CARD_WIDTH
              : PRINT_CARD_WIDTH / 2),
        y2 =
          b.position.y +
          (heritage
            ? HERITAGE_ANCHOR_Y
            : horizontal
              ? nodeH(b) / 2
              : upward
                ? nodeH(b)
                : 0);
      if (heritage) {
        const path = `M${x1},${y1} C${x1},${a.data.printBus ?? (y1 + y2) / 2} ${x2},${a.data.printBus ?? (y1 + y2) / 2} ${x2},${y2}`;
        return woodBranch(
          path,
          a.data.root ? 22 : 9,
          nodes.length <= 80 ? 4 : 1,
        );
      }
      return `<path data-source="${escape(e.source)}" data-target="${escape(e.target)}" d="M${x1},${y1} ${upward ? `C${x1},${a.data.printBus ?? (y1 + y2) / 2} ${x2},${a.data.printBus ?? (y1 + y2) / 2} ${x2},${y2}` : horizontal ? `H${a.data.printBus ?? (x1 + x2) / 2} V${y2} H${x2}` : `V${a.data.printBus ?? (y1 + y2) / 2} H${x2} V${y2}`}" fill="none" stroke="#304e3c" stroke-width="${lineWidth}" stroke-linejoin="round"/>`;
    })
    .join("");
  const cards = nodes
    .map((n) => {
      const p = n.data.person,
        h = nodeH(n),
        lines = wrapName(nameOf(n));
      if (heritage) {
        const root = !!n.data.root,
          side = n.data.leafSide ?? 1,
          center = root ? 120 : side > 0 ? 170 : 70;
        return `<g data-person="${escape(n.id)}" transform="translate(${n.position.x} ${n.position.y})">${root ? trunkOrnament() + `<rect x="45" y="197" width="150" height="${n.data.showStatus ? 75 : 58}" rx="3" fill="${p.status === 2 ? "#c5bca5" : "#e9dfc3"}" stroke="#665c43" stroke-width="2"/>` : `<path d="M120 130 Q120 101 ${side > 0 ? 105 : 135} 77" fill="none" stroke="#665d46" stroke-width="2"/><g transform="translate(${side > 0 ? 100 : 0} 3) scale(.875 .9)"><g transform="${side > 0 ? "" : "translate(160 0) scale(-1 1)"}">${leafOrnament(p.status === 2, n.data.selected)}</g></g>`}<text x="${center}" y="${root ? 228 : 47}" text-anchor="middle" direction="rtl" font-size="${nameOf(n).length > 8 ? 18 : 22}" font-weight="bold" fill="#39382d">${escape(nameOf(n))}</text>${n.data.showStatus ? `<text x="${center}" y="${root ? 248 : 64}" text-anchor="middle" direction="rtl" font-size="9">${p.status === 1 ? "حي" : "متوفى — رحمه الله"}</text>` : ""}</g>`;
      }
      const nameLines = printNameLines(nameOf(n));
      const nameY =
        (h - (n.data.showStatus ? 14 : 0) - nameLines.length * 19) / 2 + 15;
      return `<g data-person="${escape(n.id)}" transform="translate(${n.position.x} ${n.position.y})"><rect width="${PRINT_CARD_WIDTH}" height="${h}" rx="4" fill="${p.status === 2 ? "#e1e3dc" : "#fff"}" stroke="#446950" stroke-width="1.1"/><text x="${PRINT_CARD_WIDTH / 2}" y="${nameY}" text-anchor="middle" direction="rtl" font-size="16" font-weight="600" fill="#1d3526">${nameLines.map((line, i) => `<tspan x="${PRINT_CARD_WIDTH / 2}" dy="${i ? 19 : 0}">${escape(line)}</tspan>`).join("")}</text>${n.data.showStatus ? `<text x="${PRINT_CARD_WIDTH / 2}" y="${h - 5}" text-anchor="middle" direction="rtl" font-size="9">${p.status === 1 ? "حي" : "متوفى — رحمه الله"}</text>` : ""}</g>`;
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
  if (options.design !== "heritage")
    nodes = printTreeLayout(nodes, edges, horizontal, upward);
  const minX = Math.min(...nodes.map((n) => n.position.x)) - 8,
    minY = Math.min(...nodes.map((n) => n.position.y)) - 8,
    width = Math.max(...nodes.map((n) => n.position.x + nodeW(n))) - minX + 8,
    height = Math.max(...nodes.map((n) => n.position.y + nodeH(n))) - minY + 8;
  const plan = printPlan(width, height, options);
  const requestedWidth =
    options.autoCardSize === true
      ? Math.max(12, Math.min(28, Math.min(plan.usableW, plan.usableH) / 12))
      : options.cardWidth;
  if (options.design !== "heritage") {
    const cardScale = requestedWidth / PRINT_CARD_WIDTH;
    plan.scale =
      options.mode === "fit" ? Math.min(plan.scale, cardScale) : cardScale;
  }
  if (options.mode === "tiles") {
    const maxH = Math.max(...nodes.map((n) => nodeH(n)));
    plan.scale = Math.min(
      plan.scale,
      plan.usableW /
        (horizontal
          ? 2 * Math.max(...nodes.map(nodeW)) + 28
          : Math.max(...nodes.map(nodeW))),
      plan.usableH / (horizontal ? maxH : 2 * maxH + 28),
    );
  }
  const balanced =
    options.mode === "fit" && options.design === "heritage"
      ? spreadArtworkToPage(nodes, plan.usableW, plan.usableH, nodeW, nodeH)
      : null;
  if (balanced) plan.scale = balanced.scale;
  const viewW = balanced?.width ?? plan.usableW / plan.scale,
    viewH = balanced?.height ?? plan.usableH / plan.scale;
  const pages: FamilyPrintPage[] = balanced
    ? [
        {
          nodes: balanced.nodes,
          edges,
          label: "توزيع متوازن حسب الورقة",
          viewX: 0,
          viewY: 0,
        },
      ]
    : options.mode === "tiles"
      ? familyPrintPages(nodes, edges, horizontal, viewW, viewH, upward)
      : [
          {
            nodes,
            edges,
            label: "شجرة متصلة — الاسم فقط",
            viewX: minX - (viewW - width) / 2,
            viewY: minY - (viewH - height) / 2,
          },
        ];
  plan.pages = pages.length;
  plan.cols = 1;
  plan.rows = pages.length;
  const content = pages
    .map(
      (page, i) =>
        `<section class="sheet"><header><span>${options.design === "heritage" ? "الشجرة التراثية" : "شجرة العائلة"} · ${escape(page.label)} · ${escape(options.generationLabel ?? "كل الأجيال")}</span><small>صفحة ${i + 1}/${pages.length} · ${balanced ? `احتواء كامل · ${horizontal ? "أفقي" : upward ? "شجرة صاعدة" : "عمودي"}` : horizontal ? "شجرة أفقية متصلة" : upward ? "شجرة صاعدة متصلة" : "شجرة عمودية متصلة"}</small></header><svg xmlns="http://www.w3.org/2000/svg" width="${plan.usableW}mm" height="${plan.usableH}mm" viewBox="${page.viewX} ${page.viewY} ${viewW} ${viewH}" style="font-family:Tahoma,Arial,sans-serif;${options.design === "heritage" ? "background:#eee3c7" : ""}">${drawing(page.nodes, page.edges, horizontal, upward, options.design === "heritage", Math.max(1, 0.18 / plan.scale))}</svg></section>`,
    )
    .join("");
  return {
    plan,
    pages,
    balanced,
    html: `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>طباعة شجرة العائلة</title><style>@page{size:${plan.pw}mm ${plan.ph}mm;margin:10mm}*{box-sizing:border-box}body{margin:0;color:#254735;font-family:Tahoma,Arial,sans-serif}.sheet{width:${plan.usableW}mm;break-after:page;break-inside:avoid}.sheet:last-child{break-after:auto}header span{max-width:80%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}header{height:15mm;display:flex;justify-content:space-between;font-size:13px}small{font-size:10px}svg{display:block;direction:ltr}aside{padding:15px;background:#eff5ec;margin-bottom:15px}button{padding:10px 20px;cursor:pointer}@media print{aside{display:none}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}@media screen{.sheet{margin:20px auto;box-shadow:0 0 0 1px #ddd}}</style></head><body><aside>اختر «حفظ بتنسيق PDF» من الطابعات. اضبط المقياس 100٪ والهوامش 10 مم وأوقف رؤوس وتذييلات المتصفح. ${options.mode === "tiles" ? "كل بطاقة كاملة في صفحة، والأب مع أبنائه المباشرين. إذا كثر الأبناء يتكرر الأب في صفحات المتابعة؛ تستكمل الأحفاد في صفحات آبائهم." : "شجرة متصلة ببطاقات أسماء فقط؛ لا تتغير مجموعات الأبناء أو العلاقات لملء الفراغ. يمكن اختيار ورق أكبر أو صفحات فروع لزيادة وضوح العائلات الكبيرة."} عدد الصفحات: ${pages.length}. عرض البطاقة الفعلي: ${(plan.scale * (options.design === "heritage" ? 240 : PRINT_CARD_WIDTH)).toFixed(1)} مم.${options.mode === "fit" ? ` حجم خط الاسم التقريبي: ${((16 * plan.scale * 72) / 25.4).toFixed(1)} نقطة.${(16 * plan.scale * 72) / 25.4 < 7 ? " لقراءة أوضح اختر ورقًا أكبر أو نطاق أفراد أقل." : ""}` : ""}<br><button onclick="window.print()">طباعة / حفظ PDF</button></aside>${content}</body></html>`,
  };
}
