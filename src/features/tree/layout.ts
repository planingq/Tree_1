import type { Person } from "../../types";
import { CARD_WIDTH, cardHeight, firstName } from "./presentation";
// Contiguous leaf slots keep siblings together; iterative passes also support deep branches.
export function compactTreeLayout(
  people: Person[],
  horizontal: boolean,
  upward: boolean,
  gap: number,
  showStatus = false,
) {
  const byId = new Map(people.map((p) => [p.id, p])),
    children = new Map(people.map((p) => [p.id, [] as Person[]]));
  const roots: Person[] = [];
  people.forEach((p) => {
    if (byId.has(p.parentId)) children.get(p.parentId)!.push(p);
    else roots.push(p);
  });
  children.forEach((list) =>
    list.sort(
      (a, b) => a.siblingOrder - b.siblingOrder || a.id.localeCompare(b.id),
    ),
  );
  const order = [...roots],
    depth = new Map(roots.map((p) => [p.id, 0])),
    maxDepthSize: number[] = [];
  for (let i = 0; i < order.length; i++) {
    const p = order[i],
      d = depth.get(p.id)!;
    maxDepthSize[d] = Math.max(
      maxDepthSize[d] || 0,
      horizontal ? CARD_WIDTH : cardHeight(firstName(p.name), showStatus),
    );
    for (const child of children.get(p.id)!) {
      depth.set(child.id, d + 1);
      order.push(child);
    }
  }
  const span = new Map<string, number>();
  for (let i = order.length - 1; i >= 0; i--) {
    const p = order[i];
    span.set(
      p.id,
      Math.max(
        1,
        children.get(p.id)!.reduce((s, c) => s + span.get(c.id)!, 0),
      ),
    );
  }
  const crossStep =
    (horizontal
      ? Math.max(
          0,
          ...people.map((p) => cardHeight(firstName(p.name), showStatus)),
        )
      : CARD_WIDTH) + 12;
  const axis: number[] = [0];
  for (let d = 1; d < maxDepthSize.length; d++)
    axis[d] = axis[d - 1] + maxDepthSize[d - 1] + gap;
  const starts = new Map<string, number>();
  let cursor = 0;
  roots.forEach((p) => {
    starts.set(p.id, cursor);
    cursor += span.get(p.id)!;
  });
  const positions = new Map<string, { x: number; y: number }>();
  const totalHeight = (axis.at(-1) ?? 0) + (maxDepthSize.at(-1) ?? 0);
  for (const p of order) {
    const start = starts.get(p.id)!,
      s = span.get(p.id)!,
      height = cardHeight(firstName(p.name), showStatus),
      cross = (start + s / 2) * crossStep;
    let childStart = start;
    for (const child of children.get(p.id)!) {
      starts.set(child.id, childStart);
      childStart += span.get(child.id)!;
    }
    const rank = axis[depth.get(p.id)!];
    positions.set(
      p.id,
      horizontal
        ? { x: -rank - CARD_WIDTH, y: cross - height / 2 }
        : {
            x: cross - CARD_WIDTH / 2,
            y: upward ? totalHeight - rank - height : rank,
          },
    );
  }
  return positions;
}
