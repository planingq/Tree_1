import type { Person } from "../../types";
import { CARD_WIDTH, cardHeight, firstName } from "./presentation";
import { familyLayout } from "./familyLayout";
export function screenTreeLayout(
  people: Person[],
  horizontal: boolean,
  upward: boolean,
  gap: number,
  showStatus = false,
  area?: { width: number; height: number },
) {
  return familyLayout(
    people.map((p) => ({
      id: p.id,
      parentId: p.parentId,
      order: p.siblingOrder,
      width: CARD_WIDTH,
      height: cardHeight(firstName(p.name), showStatus),
    })),
    horizontal,
    upward,
    gap,
    area,
    !!area,
  );
}
// Compatibility for callers that need positions alone.
export function compactTreeLayout(
  people: Person[],
  horizontal: boolean,
  upward: boolean,
  gap: number,
  showStatus = false,
) {
  return screenTreeLayout(people, horizontal, upward, gap, showStatus)
    .positions;
}
