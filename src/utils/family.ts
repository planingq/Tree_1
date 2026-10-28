import type { Person, Issue } from "../types";
export function validatePeople(
  people: Person[],
  rows = people.map((_, i) => i + 2),
): Issue[] {
  const issues: Issue[] = [],
    ids = new Map<string, number>(),
    names = new Map<string, number>();
  const add = (i: number, message: string, level: Issue["level"] = "error") =>
    issues.push({ row: rows[i], message, level });
  people.forEach((p, i) => {
    if (!p.id) add(i, "المعرّف مطلوب");
    if (ids.has(p.id)) add(i, `معرّف مكرر: ${p.id}`);
    else ids.set(p.id, i);
    if (!p.name) add(i, "الاسم مطلوب");
    if (p.status !== 1 && p.status !== 2) add(i, "الحالة يجب أن تكون 1 أو 2");
    if (!Number.isInteger(p.siblingOrder) || p.siblingOrder < 1)
      add(
        i,
        "ترتيب الشخص بين إخوته يجب أن يكون عددًا صحيحًا يبدأ من 1 (الأكبر)",
      );
    if (names.has(p.name)) add(i, `اسم مكرر مسموح: ${p.name}`, "warning");
    else names.set(p.name, i);
  });
  people.forEach((p, i) => {
    if (p.parentId === p.id && p.id) add(i, "لا يمكن ربط الشخص بنفسه");
    if (p.parentId && !ids.has(p.parentId))
      add(i, `الأب غير موجود: ${p.parentId}`);
    const father = people[ids.get(p.parentId) ?? -1];
    if (father && p.fatherName && father.name !== p.fatherName)
      add(i, "اسم الأب لا يطابق اسم صاحب معرّف الأب", "warning");
  });
  // Iterative parent walks: every vertex becomes complete once; no recursion for deep families.
  const done = new Set<string>();
  people.forEach((p) => {
    const path = new Set<string>();
    let current: Person | undefined = p;
    while (current && !done.has(current.id)) {
      if (path.has(current.id)) {
        add(ids.get(current.id)!, "دورة في علاقات الأبوة");
        break;
      }
      path.add(current.id);
      current = people[ids.get(current.parentId) ?? -1];
    }
    path.forEach((id) => done.add(id));
  });
  if (people.filter((p) => !p.parentId).length > 1)
    issues.push({
      row: 0,
      level: "warning",
      message: "توجد جذور متعددة؛ ستُعرض كأشجار مستقلة",
    });
  return issues;
}
export function analyzeFamily(people: Person[]) {
  const byId = new Map(people.map((p) => [p.id, p]));
  const children = new Map<string, Person[]>(people.map((p) => [p.id, []]));
  const roots: Person[] = [];
  people.forEach((p) => {
    if (p.parentId && byId.has(p.parentId)) children.get(p.parentId)!.push(p);
    else roots.push(p);
  });
  children.forEach((list) =>
    list.sort(
      (a, b) => a.siblingOrder - b.siblingOrder || a.id.localeCompare(b.id),
    ),
  );
  const depth = new Map<string, number>(),
    order: Person[] = [],
    generations: number[] = [];
  const queue = roots.map((p) => ({ p, d: 0 }));
  for (let i = 0; i < queue.length; i++) {
    const { p, d } = queue[i];
    if (depth.has(p.id)) continue;
    depth.set(p.id, d);
    generations[d] = (generations[d] || 0) + 1;
    order.push(p);
    children.get(p.id)!.forEach((child) => queue.push({ p: child, d: d + 1 }));
  }
  const stats = new Map<
    string,
    { direct: number; total: number; living: number; deceased: number }
  >();
  for (let i = order.length - 1; i >= 0; i--) {
    const p = order[i],
      kids = children.get(p.id)!;
    const s = { direct: kids.length, total: 0, living: 0, deceased: 0 };
    kids.forEach((k) => {
      const t = stats.get(k.id)!;
      s.total += t.total + 1;
      s.living += t.living + (k.status === 1 ? 1 : 0);
      s.deceased += t.deceased + (k.status === 2 ? 1 : 0);
    });
    stats.set(p.id, s);
  }
  return {
    byId,
    children,
    roots,
    depth,
    generations,
    stats,
    total: people.length,
    living: people.filter((p) => p.status === 1).length,
    branches: roots.flatMap((root) =>
      (children.get(root.id)!.length ? children.get(root.id)! : [root]).map(
        (p) => ({
          id: p.id,
          name: p.name,
          count: (stats.get(p.id)?.total ?? 0) + 1,
        }),
      ),
    ),
  };
}

export type FamilyAnalysis = ReturnType<typeof analyzeFamily>;
