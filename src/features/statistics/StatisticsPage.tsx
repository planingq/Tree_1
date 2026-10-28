import type { Person } from "../../types";
import type { FamilyAnalysis } from "../../utils/family";
export default function StatisticsPage({
  people,
  family,
}: {
  people: Person[];
  family: FamilyAnalysis;
}) {
  const max = Math.max(1, ...family.generations);
  return (
    <div className="space-y-6">
      <div className="section-header">
        <div>
          <h2>العائلة في أرقام</h2>
          <p>إحصائيات مشتقة من روابط الأبوة الفعلية، وليست من ترتيب الإخوة.</p>
        </div>
        <span className="badge">تتحدث تلقائيًا</span>
      </div>
      <div className="two-columns">
        <div className="panel">
          <h3>الأفراد حسب الجيل</h3>
          <p className="muted">الجذور هي الجيل الأول</p>
          <div className="bar-chart">
            {family.generations.map((count, i) => (
              <div className="bar-row" key={i}>
                <span>الجيل {i + 1}</span>
                <div className="bar-track">
                  <div style={{ width: `${(count / max) * 100}%` }} />
                </div>
                <b>{count}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h3>الفروع الرئيسية</h3>
          <p className="muted">
            أبناء كل جذر وذريتهم؛ الجذر المنفرد فرع مستقل. الجذور ذات الأبناء
            مستثناة من أحجام الفروع.
          </p>
          {family.branches.map((branch) => (
            <div className="branch-row" key={branch.id}>
              <span>
                {branch.name} <small>#{branch.id}</small>
              </span>
              <b>{branch.count} أفراد</b>
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <h3>تفاصيل الذرية لكل فرد</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الفرد</th>
                <th>الجيل الفعلي</th>
                <th>أبناء مباشرون</th>
                <th>إجمالي الذرية</th>
                <th>الأحياء ضمن الذرية</th>
                <th>المتوفون ضمن الذرية</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => {
                const s = family.stats.get(p.id)!;
                return (
                  <tr key={p.id}>
                    <td>
                      {p.name} <small>#{p.id}</small>
                    </td>
                    <td>{(family.depth.get(p.id) ?? 0) + 1}</td>
                    <td>{s.direct}</td>
                    <td>{s.total}</td>
                    <td>{s.living}</td>
                    <td>{s.deceased}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
