import { familyLayout } from "./familyLayout";
import type { PrintNode } from "./export";
export const PRINT_CARD_WIDTH = 120;
export function printNameLines(name: string) {
  const lines: string[] = [""];
  for (const word of name.trim().split(/\s+/)) {
    const pieces = word.match(/.{1,14}/gu) ?? [""];
    for (const part of pieces) {
      const last = lines.length - 1;
      if (lines[last] && lines[last].length + part.length + 1 > 14)
        lines.push(part);
      else lines[last] += (lines[last] ? " " : "") + part;
    }
  }
  return lines;
}
export const printNameHeight = (n: PrintNode) =>
  Math.max(
    34,
    printNameLines(n.data.displayName ?? n.data.person.name).length * 19 + 12,
  ) + (n.data.showStatus ? 14 : 0);
export function printTreeLayout(
  nodes: PrintNode[],
  edges: { source: string; target: string }[],
  horizontal: boolean,
  upward: boolean,
  area?: { width: number; height: number },
  spread = !!area,
  gap = 28,
) {
  const parent = new Map<string, string>();
  for (const edge of edges) {
    if (parent.has(edge.target)) throw new Error("علاقة أبوة غير صالحة");
    parent.set(edge.target, edge.source);
  }
  const result = familyLayout(
    nodes.map((n) => ({
      id: n.id,
      parentId: parent.get(n.id) ?? "",
      order: n.data.person.siblingOrder,
      width: PRINT_CARD_WIDTH,
      height: printNameHeight(n),
    })),
    horizontal,
    upward,
    gap,
    area,
    spread,
  );
  return nodes.map((n) => ({
    ...n,
    position: result.positions.get(n.id)!,
    data: {
      ...n.data,
      printRoute: result.routes.get(n.id),
    },
  }));
}

// Spread an already chosen composition, including its reserved connector lanes.
// The same affine mapping moves card centres and paths; only whitespace grows.
export function printBounds(nodes: PrintNode[]) {
  const points = nodes.flatMap((n) => [
    { x: n.position.x, y: n.position.y },
    {
      x: n.position.x + PRINT_CARD_WIDTH,
      y: n.position.y + printNameHeight(n),
    },
    ...(n.data.printRoute ?? []),
  ]);
  const x = Math.min(...points.map((p) => p.x)),
    y = Math.min(...points.map((p) => p.y));
  return {
    x,
    y,
    width: Math.max(...points.map((p) => p.x)) - x,
    height: Math.max(...points.map((p) => p.y)) - y,
  };
}
export function spreadPrintNodes(
  nodes: PrintNode[],
  edges: { source: string; target: string }[],
  horizontal: boolean,
  upward: boolean,
  width: number,
  height: number,
  pad = 8,
) {
  const byId = new Map(nodes.map((n) => [n.data.instanceKey ?? n.id, n]));
  const incoming = new Map(edges.map((e) => [e.target, e.source]));
  const prepared = nodes.map((n) => {
    if (n.data.printRoute) return n;
    const a = byId.get(incoming.get(n.data.instanceKey ?? n.id) ?? "");
    if (!a) return n;
    const start = horizontal
      ? { x: a.position.x, y: a.position.y + printNameHeight(a) / 2 }
      : {
          x: a.position.x + 60,
          y: a.position.y + (upward ? 0 : printNameHeight(a)),
        };
    const end = horizontal
      ? { x: n.position.x + 120, y: n.position.y + printNameHeight(n) / 2 }
      : {
          x: n.position.x + 60,
          y: n.position.y + (upward ? printNameHeight(n) : 0),
        };
    return {
      ...n,
      data: {
        ...n.data,
        printRoute: horizontal
          ? [
              start,
              { x: (start.x + end.x) / 2, y: start.y },
              { x: (start.x + end.x) / 2, y: end.y },
              end,
            ]
          : [
              start,
              { x: start.x, y: (start.y + end.y) / 2 },
              { x: end.x, y: (start.y + end.y) / 2 },
              end,
            ],
      },
    };
  });
  const bounds = printBounds(prepared),
    sx = Math.max(1, (width - 2 * pad) / bounds.width),
    sy = Math.max(1, (height - 2 * pad) / bounds.height);
  const move = (p: { x: number; y: number }) => ({
    x: pad + (p.x - bounds.x) * sx,
    y: pad + (p.y - bounds.y) * sy,
  });
  const moved = prepared.map((n) => {
    const c = move({
      x: n.position.x + 60,
      y: n.position.y + printNameHeight(n) / 2,
    });
    return {
      ...n,
      position: { x: c.x - 60, y: c.y - printNameHeight(n) / 2 },
      data: { ...n.data, printRoute: n.data.printRoute?.map(move) },
    };
  });
  const movedById = new Map(moved.map((n) => [n.data.instanceKey ?? n.id, n]));
  for (const n of moved) {
    const a = movedById.get(incoming.get(n.data.instanceKey ?? n.id) ?? ""),
      points = n.data.printRoute;
    if (!a || !points) continue;
    points[0] = horizontal
      ? { x: a.position.x, y: a.position.y + printNameHeight(a) / 2 }
      : {
          x: a.position.x + 60,
          y: a.position.y + (upward ? 0 : printNameHeight(a)),
        };
    points[points.length - 1] = horizontal
      ? { x: n.position.x + 120, y: n.position.y + printNameHeight(n) / 2 }
      : {
          x: n.position.x + 60,
          y: n.position.y + (upward ? printNameHeight(n) : 0),
        };
    if (horizontal) {
      points[1].y = points[0].y;
      points[points.length - 2].y = points.at(-1)!.y;
    } else {
      points[1].x = points[0].x;
      points[points.length - 2].x = points.at(-1)!.x;
    }
  }
  return moved;
}
