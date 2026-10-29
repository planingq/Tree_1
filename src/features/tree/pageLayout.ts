import type { PrintNode } from "./export";
export type PageLayoutResult = {
  nodes: PrintNode[];
  routes: Map<string, string>;
  width: number;
  height: number;
  scale: number;
  columns: number;
  rows: number;
};
export function spreadArtworkToPage(
  nodes: PrintNode[],
  pageWidth: number,
  pageHeight: number,
  widthOf: (n: PrintNode) => number,
  heightOf: (n: PrintNode) => number,
): PageLayoutResult {
  const pad = 18,
    minX = Math.min(...nodes.map((n) => n.position.x)),
    minY = Math.min(...nodes.map((n) => n.position.y)),
    maxX = Math.max(...nodes.map((n) => n.position.x)),
    maxY = Math.max(...nodes.map((n) => n.position.y)),
    W = Math.max(...nodes.map(widthOf)),
    H = Math.max(...nodes.map(heightOf));
  const width = maxX - minX + W + 2 * pad,
    height = maxY - minY + H + 2 * pad,
    scale = Math.min(pageWidth / width, pageHeight / height),
    targetW = pageWidth / scale,
    targetH = pageHeight / scale;
  return {
    nodes: nodes.map((n) => ({
      ...n,
      position: {
        x:
          maxX > minX
            ? pad +
              ((n.position.x - minX) / (maxX - minX)) * (targetW - W - 2 * pad)
            : (targetW - widthOf(n)) / 2,
        y:
          maxY > minY
            ? pad +
              ((n.position.y - minY) / (maxY - minY)) * (targetH - H - 2 * pad)
            : (targetH - heightOf(n)) / 2,
      },
    })),
    routes: new Map(),
    width: targetW,
    height: targetH,
    scale,
    columns: 0,
    rows: 0,
  };
}
