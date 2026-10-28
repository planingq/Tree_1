import type { FamilyAnalysis } from "../../utils/family";
import Dialog from "../../components/Dialog";
import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, X } from "lucide-react";
import type { Person } from "../../types";
import { validatePeople } from "../../utils/family";
const blank: Person = {
  id: "",
  name: "",
  status: 1,
  parentId: "",
  fatherName: "",
  siblingOrder: 1,
  customFields: {},
};
export default function PeoplePage({
  people,
  family,
  onChange,
  canEdit,
}: {
  people: Person[];
  family: FamilyAnalysis;
  onChange: (p: Person[]) => void;
  canEdit: boolean;
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [sort, setSort] = useState("name"),
    [editing, setEditing] = useState<Person | null>(null),
    [original, setOriginal] = useState<string | null>(null),
    [error, setError] = useState(""),
    [customName, setCustomName] = useState(""),
    [message, setMessage] = useState(""),
    [deleting, setDeleting] = useState<Person | null>(null),
    [page, setPage] = useState(0);
  const filtered = useMemo(
    () =>
      people
        .filter(
          (p) =>
            (p.name.includes(query) || p.id.includes(query)) &&
            (filter === "all" || String(p.status) === filter),
        )
        .sort((a, b) =>
          sort === "order"
            ? a.siblingOrder - b.siblingOrder
            : sort === "id"
              ? a.id.localeCompare(b.id)
              : a.name.localeCompare(b.name, "ar"),
        ),
    [people, query, filter, sort],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 25)),
    safePage = Math.min(page, pages - 1);
  function open(p: Person | null) {
    setEditing(
      p
        ? { ...p, customFields: { ...p.customFields } }
        : { ...blank, customFields: {} },
    );
    setOriginal(p?.id ?? null);
    setError("");
    setCustomName("");
  }
  function save() {
    if (!editing || !canEdit) return;
    const normalized = {
      ...editing,
      id: editing.id.trim(),
      name: editing.name.trim(),
      fatherName: editing.fatherName.trim(),
    };
    const next = original
      ? people.map((p) => (p.id === original ? normalized : p))
      : [...people, normalized];
    const errors = validatePeople(next).filter((i) => i.level === "error");
    if (errors.length) {
      setError(errors.map((i) => i.message).join("، "));
      return;
    }
    onChange(next);
    setEditing(null);
    setMessage("تم حفظ بيانات الفرد وتحديث العلاقات.");
  }
  return (
    <div className="space-y-5">
      <div className="section-header">
        <div>
          <h2>سجل أفراد العائلة</h2>
          <p>كل اسم يحمل حكاية، وكل حكاية جزء من جذورنا.</p>
        </div>
        {canEdit && (
          <button className="button primary" onClick={() => open(null)}>
            <Plus size={18} /> إضافة فرد
          </button>
        )}
      </div>
      {message && (
        <p
          className={message.startsWith("لا يمكن") ? "notice" : "success"}
          role="status"
        >
          {message}
        </p>
      )}
      <div className="panel">
        <div className="people-filters">
          <div className="search-box">
            <Search size={18} />
            <input
              aria-label="البحث عن فرد"
              placeholder="ابحث بالاسم أو المعرّف"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <select
            aria-label="تصفية الحالة"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">جميع الحالات</option>
            <option value="1">الأحياء</option>
            <option value="2">المتوفون</option>
          </select>
          <select
            aria-label="ترتيب الأفراد"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="name">ترتيب بالاسم</option>
            <option value="id">ترتيب بالمعرّف</option>
            <option value="order">ترتيب الإخوة</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الفرد</th>
                <th>المعرّف</th>
                <th>الحالة</th>
                <th>الأب</th>
                <th>الأبناء / الذرية</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(safePage * 25, safePage * 25 + 25).map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  <td>
                    <code>{p.id}</code>
                  </td>
                  <td>
                    <span
                      className={`badge ${p.status === 2 ? "neutral" : ""}`}
                    >
                      {p.status === 1 ? "حي" : "متوفى"}
                    </span>
                  </td>
                  <td>{family.byId.get(p.parentId)?.name || "جذر العائلة"}</td>
                  <td>
                    {family.stats.get(p.id)?.direct} /{" "}
                    {family.stats.get(p.id)?.total}
                  </td>
                  <td>
                    <div className="row-actions">
                      {canEdit ? (
                        <>
                          <button
                            aria-label={`تعديل ${p.name}`}
                            onClick={() => open(p)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            aria-label={`حذف ${p.name}`}
                            onClick={() => {
                              if (family.children.get(p.id)!.length) {
                                setMessage(
                                  "لا يمكن حذف أب لديه ذرية. انقل أبناءه إلى أب آخر أولًا عبر نموذج التعديل.",
                                );
                                return;
                              }
                              setDeleting(p);
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <span className="muted">للاطلاع</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="empty-state">لا توجد نتائج مطابقة.</div>
          )}
        </div>
        <div className="pagination">
          <span>
            {filtered.length} فردًا · صفحة {safePage + 1} من {pages}
          </span>
          <button
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            السابق
          </button>
          <button
            disabled={safePage + 1 >= pages}
            onClick={() => setPage(safePage + 1)}
          >
            التالي
          </button>
        </div>
      </div>
      {editing && (
        <Dialog onClose={() => setEditing(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="person-form-title"
            className="modal"
          >
            <div className="section-header">
              <h2 id="person-form-title">
                {original ? "تعديل بيانات الفرد" : "إضافة فرد جديد"}
              </h2>
              <button aria-label="إغلاق" onClick={() => setEditing(null)}>
                <X />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <div className="form-grid">
                <label>
                  المعرّف الفريد
                  <input
                    required
                    value={editing.id}
                    disabled={!!original}
                    onChange={(e) =>
                      setEditing({ ...editing, id: e.target.value })
                    }
                  />
                </label>
                <label>
                  الاسم الكامل
                  <input
                    required
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  الحالة
                  <select
                    value={editing.status}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        status: Number(e.target.value) as 1 | 2,
                      })
                    }
                  >
                    <option value="1">حي</option>
                    <option value="2">متوفى</option>
                  </select>
                </label>
                <label>
                  ترتيب الشخص بين إخوته (1 للأكبر)
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={
                      Number.isNaN(editing.siblingOrder)
                        ? ""
                        : editing.siblingOrder
                    }
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        siblingOrder:
                          e.target.value === "" ? NaN : Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  الأب المرتبط
                  <select
                    value={editing.parentId}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        parentId: e.target.value,
                        fatherName: family.byId.get(e.target.value)?.name ?? "",
                      })
                    }
                  >
                    <option value="">بدون أب — جذر</option>
                    {people
                      .filter((p) => p.id !== editing.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (#{p.id})
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  اسم الأب للعرض
                  <input
                    value={editing.fatherName}
                    onChange={(e) =>
                      setEditing({ ...editing, fatherName: e.target.value })
                    }
                  />
                </label>
              </div>
              <h3>حقول مخصصة</h3>
              {Object.entries(editing.customFields).map(([key, value]) => (
                <label key={key}>
                  {key}
                  <div className="custom-row">
                    <input
                      value={value}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          customFields: {
                            ...editing.customFields,
                            [key]: e.target.value,
                          },
                        })
                      }
                    />
                    <button
                      type="button"
                      aria-label={`حذف حقل ${key}`}
                      onClick={() => {
                        const fields = { ...editing.customFields };
                        delete fields[key];
                        setEditing({ ...editing, customFields: fields });
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </label>
              ))}
              <div className="custom-row">
                <input
                  aria-label="اسم الحقل المخصص"
                  placeholder="اسم الحقل الجديد"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    const key = customName.trim();
                    if (key && !Object.hasOwn(editing.customFields, key)) {
                      setEditing({
                        ...editing,
                        customFields: { ...editing.customFields, [key]: "" },
                      });
                      setCustomName("");
                    }
                  }}
                >
                  إضافة حقل
                </button>
              </div>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <p className="muted">
                ترتيب الإخوة مستقل عن عمق الجيل. يُمنع إنشاء علاقات دائرية
                تلقائيًا.
              </p>
              <button className="button primary" type="submit">
                حفظ الفرد
              </button>
            </form>
          </section>
        </Dialog>
      )}
      {deleting && (
        <Dialog onClose={() => setDeleting(null)}>
          <section
            className="modal small-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <h2 id="delete-title">حذف {deleting.name}؟</h2>
            <p>سيتم حذف هذا الفرد من البيانات المحلية.</p>
            <div className="toolbar-actions">
              <button
                className="button danger"
                onClick={() => {
                  onChange(people.filter((p) => p.id !== deleting.id));
                  setDeleting(null);
                  setMessage("تم حذف الفرد.");
                }}
              >
                تأكيد الحذف
              </button>
              <button
                className="button secondary"
                onClick={() => setDeleting(null)}
              >
                إلغاء
              </button>
            </div>
          </section>
        </Dialog>
      )}
    </div>
  );
}
