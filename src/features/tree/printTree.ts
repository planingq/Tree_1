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
// An ordered tree: each family owns one contiguous subtree interval, so unrelated families never share a connector bus.
export function printTreeLayout(
  nodes: PrintNode[],
  edges: { source: string; target: string }[],
  horizontal: boolean,
  upward: boolean,
) {
  const byId = new Map(nodes.map((n) => [n.id, n])),
    children = new Map(nodes.map((n) => [n.id, [] as PrintNode[]])),
    parent = new Map<string, string>();
  edges.forEach((e) => {
    if (byId.has(e.source) && byId.has(e.target)) {
      if (parent.has(e.target)) throw new Error("علاقة أبوة غير صالحة");
      parent.set(e.target, e.source);
      children.get(e.source)!.push(byId.get(e.target)!);
    }
  });
  children.forEach((list) =>
    list.sort(
      (a, b) =>
        a.data.person.siblingOrder - b.data.person.siblingOrder ||
        a.id.localeCompare(b.id),
    ),
  );
  const roots = nodes.filter((n) => !parent.has(n.id)),
    order = [...roots],
    depth = new Map(roots.map((n) => [n.id, 0])),
    sizes: number[] = [];
  for (let i = 0; i < order.length; i++) {
    const n = order[i],
      d = depth.get(n.id)!;
    sizes[d] = Math.max(
      sizes[d] ?? 0,
      horizontal ? PRINT_CARD_WIDTH : printNameHeight(n),
    );
    for (const c of children.get(n.id)!) {
      depth.set(c.id, d + 1);
      order.push(c);
    }
  }
  if (order.length !== nodes.length)
    throw new Error("علاقات دائرية غير صالحة للطباعة");
  const crossStep =
      (horizontal
        ? Math.max(...nodes.map(printNameHeight))
        : PRINT_CARD_WIDTH) + 10,
    spans = new Map<string, number>();
  for (let i = order.length - 1; i >= 0; i--) {
    const n = order[i];
    spans.set(
      n.id,
      Math.max(
        1,
        children.get(n.id)!.reduce((s, c) => s + spans.get(c.id)!, 0),
      ),
    );
  }
  const axis = [0];
  for (let d = 1; d < sizes.length; d++)
    axis[d] = axis[d - 1] + sizes[d - 1] + 28;
  const starts = new Map<string, number>();
  let count = 0;
  roots.forEach((n) => {
    starts.set(n.id, count);
    count += spans.get(n.id)!;
  });
  const bottom = (axis.at(-1) ?? 0) + (sizes.at(-1) ?? 0),
    positions = new Map<string, { x: number; y: number }>();
  for (const n of order) {
    const start = starts.get(n.id)!,
      span = spans.get(n.id)!,
      d = depth.get(n.id)!,
      center = (start + span / 2) * crossStep;
    let cursor = start;
    for (const c of children.get(n.id)!) {
      starts.set(c.id, cursor);
      cursor += spans.get(c.id)!;
    }
    positions.set(
      n.id,
      horizontal
        ? { x: -axis[d] - PRINT_CARD_WIDTH, y: center - printNameHeight(n) / 2 }
        : {
            x: (count - start - span / 2) * crossStep - PRINT_CARD_WIDTH / 2,
            y: upward ? bottom - axis[d] - printNameHeight(n) : axis[d],
          },
    );
  }
  return nodes.map((n) => ({
    ...n,
    position: positions.get(n.id)!,
    data: {
      ...n.data,
      printParentLabel: undefined,
      printBus: horizontal
        ? -axis[depth.get(n.id)!] - PRINT_CARD_WIDTH - 14
        : upward
          ? bottom - axis[depth.get(n.id)!] - sizes[depth.get(n.id)!] - 14
          : axis[depth.get(n.id)!] + sizes[depth.get(n.id)!] + 14,
    },
  }));
}
