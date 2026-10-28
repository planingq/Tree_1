import type { Person } from "../../types";
import type { FamilyAnalysis } from "../../utils/family";
export const CARD_WIDTH = 280;
export function wrapName(name: string, limit = 26) {
  const lines: string[] = [""];
  for (const word of name.split(/\s+/)) {
    const last = lines.length - 1;
    if (lines[last] && lines[last].length + word.length + 1 > limit)
      lines.push(word);
    else lines[last] += (lines[last] ? " " : "") + word;
  }
  return lines;
}
export function cardHeight(name: string) {
  return Math.max(172, wrapName(name).length * 24 + 100);
}
export function familyNames(family: FamilyAnalysis) {
  const names = new Map<string, string>(),
    queue = [...family.roots];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i],
      parent = names.get(p.parentId);
    let words = p.name.trim().split(/\s+/);
    if (parent) {
      const ancestor = parent.split(/\s+/);
      let overlap = 0;
      for (let n = 1; n <= Math.min(words.length - 1, ancestor.length); n++)
        if (words.slice(-n).join(" ") === ancestor.slice(0, n).join(" "))
          overlap = n;
      if (!overlap && words.length > 1 && words.at(-1) === ancestor.at(-1))
        words = words.slice(0, -1);
      names.set(p.id, [...words, ...ancestor.slice(overlap)].join(" "));
    } else names.set(p.id, p.name);
    queue.push(...family.children.get(p.id)!);
  }
  return names;
}
export function generationRange(
  people: Person[],
  family: FamilyAnalysis,
  from: number,
  to: number,
) {
  return people.filter((p) => {
    const generation = (family.depth.get(p.id) ?? 0) + 1;
    return generation >= from && generation <= to;
  });
}
