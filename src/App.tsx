import { familyNames } from "./features/tree/presentation";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import {
  GitFork,
  Home,
  UsersRound,
  FileSpreadsheet,
  ChartNoAxesCombined,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Leaf,
  ArrowUpLeft,
  Download,
  Sprout,
  Heart,
  Layers3,
  UserRound,
  ArrowLeft,
  LockKeyhole,
} from "lucide-react";
import type { Person, AuthSession, Role } from "./types";
import { demoPeople } from "./data/demo";
import { analyzeFamily } from "./utils/family";
import { loadFamily, saveFamily } from "./utils/storage";
import { demoAuth } from "./services/auth";
import Dialog from "./components/Dialog";
const FamilyTree = lazy(() => import("./features/tree/FamilyTree"));
import PeoplePage from "./features/people/PeoplePage";
const ImportPage = lazy(() => import("./features/import/ImportPage"));
import StatisticsPage from "./features/statistics/StatisticsPage";
const downloadTemplate = () =>
  void import("./features/import/excel").then((m) => m.downloadTemplate());
const navigation = [
  { id: "home", label: "الرئيسية", icon: Home },
  { id: "tree", label: "شجرة العائلة", icon: GitFork },
  { id: "people", label: "الأفراد", icon: UsersRound },
  { id: "import", label: "استيراد Excel", icon: FileSpreadsheet },
  { id: "statistics", label: "الإحصائيات", icon: ChartNoAxesCombined },
  { id: "settings", label: "الإعدادات", icon: Settings },
];
function Login({ onLogin }: { onLogin: (s: AuthSession) => void }) {
  const [role, setRole] = useState<Role>("admin"),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark">
          <GitFork size={32} />
        </div>
        <span className="eyebrow">كل عائلة تبدأ بجذر</span>
        <h1>أهلًا بك في جذور</h1>
        <p>مساحة تجمع حكايات العائلة، وتصل الأجيال ببعضها.</p>
        <div className="notice">
          <LockKeyhole size={20} />
          <span>
            نسخة تطوير محلية ببيانات خيالية. هذه الواجهة ليست تسجيل دخول آمنًا
            ولا توفر حماية إنتاجية.
          </span>
        </div>
        <label>
          الدور في التجربة
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="admin">مدير — إضافة وتعديل واستيراد</option>
            <option value="viewer">مشاهد — اطلاع فقط</option>
          </select>
        </label>
        <button
          className="button primary wide"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              onLogin(await demoAuth.login(role));
            } catch {
              setError("تعذر بدء الجلسة التجريبية");
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "جارٍ الدخول…" : "الدخول إلى النسخة التجريبية"}
          <ArrowLeft size={18} />
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <small>لا تُدخل بيانات عائلية حقيقية قبل إعداد خادم آمن.</small>
      </section>
      <p className="login-footer">جذور · ذاكرة العائلة، للأجيال القادمة</p>
    </main>
  );
}
export default function App() {
  const [initial] = useState(loadFamily);
  const [people, setPeople] = useState<Person[]>(initial.people ?? demoPeople),
    [storageError, setStorageError] = useState(initial.error),
    [session, setSession] = useState<AuthSession | null>(null),
    [page, setPage] = useState("home"),
    [menu, setMenu] = useState(false),
    [selected, setSelected] = useState<Person | null>(null),
    [ancestorId, setAncestorId] = useState(""),
    [reset, setReset] = useState(false);
  const family = useMemo(() => analyzeFamily(people), [people]);
  const names = useMemo(() => familyNames(family), [family]);
  const selectPerson = useCallback((p: Person) => setSelected(p), []);
  const update = useCallback((next: Person[]) => {
    setPeople(next);
    setStorageError(saveFamily(next));
    setSelected(null);
    setAncestorId("");
  }, []);
  if (!session) return <Login onLogin={setSession} />;
  const canEdit = session.role === "admin",
    current = navigation.find((n) => n.id === page)!;
  function navigate(id: string) {
    setPage(id);
    setMenu(false);
  }
  const statCards = [
    {
      label: "إجمالي أفراد العائلة",
      value: family.total,
      icon: UsersRound,
      detail: "أسماء تجمعنا، وروابط تصلنا",
      color: "green",
    },
    {
      label: "على قيد الحياة",
      value: family.living,
      icon: Heart,
      detail: `${family.total ? Math.round((family.living / family.total) * 100) : 0}٪ من أفراد العائلة`,
      color: "sage",
    },
    {
      label: "المتوفون",
      value: family.total - family.living,
      icon: Leaf,
      detail: "باقون في ذاكرتنا ودعائنا",
      color: "sand",
    },
    {
      label: "أجيال متصلة",
      value: family.generations.length,
      icon: Layers3,
      detail: `${family.roots.length} جذر · ${family.branches.length} فروع رئيسية`,
      color: "blue",
    },
  ];
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("home");
          }}
        >
          <span className="brand-mark">
            <GitFork size={28} />
          </span>
          <span>
            <b>جذور</b>
            <small>حكاية عائلة، عبر الأجيال</small>
          </span>
        </a>
        <button
          className="mobile-close"
          aria-label="إغلاق القائمة"
          onClick={() => setMenu(false)}
        >
          <X />
        </button>
        <div className="sidebar-family">
          <span className="family-emblem">
            <Sprout size={25} />
          </span>
          <div>
            <strong>عائلة السالم</strong>
            <small>مساحة العائلة التجريبية</small>
          </div>
          <span className="tiny-dot" />
        </div>
        <p className="nav-caption">مساحة العائلة</p>
        <nav aria-label="القائمة الرئيسية">
          {navigation.map((item) => (
            <button
              className={page === item.id ? "nav-item active" : "nav-item"}
              key={item.id}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {item.id === "people" && (
                <span className="nav-count">{people.length}</span>
              )}
              {item.id === page && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <ShieldCheck size={21} />
            <strong>خصوصيتكم أولًا</strong>
            <p>بيانات هذه التجربة محفوظة في هذا المتصفح فقط.</p>
            <small>الحماية الفعلية تتطلب خادمًا آمنًا.</small>
          </div>
          <button
            className="profile"
            onClick={() =>
              void demoAuth.logout().then(() => {
                setMenu(false);
                setSession(null);
              })
            }
          >
            <span className="profile-avatar">
              {session.role === "admin" ? "م" : "ش"}
            </span>
            <span>
              <strong>{session.displayName}</strong>
              <small>جلسة محلية تجريبية</small>
            </span>
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      {menu && (
        <div className="sidebar-overlay" onClick={() => setMenu(false)} />
      )}
      <div className="main-area">
        <Suspense
          fallback={
            <div className="loading-state" role="status">
              جارٍ تحميل مساحة العائلة…
            </div>
          }
        >
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="mobile-menu"
                aria-label="فتح القائمة"
                onClick={() => setMenu(true)}
              >
                <Menu />
              </button>
              <span>مساحة العائلة</span>
              <span className="crumb-separator">/</span>
              <strong>{current.label}</strong>
            </div>
            <div className="topbar-end">
              <span className="local-badge">
                <i /> بيانات تجريبية محلية
              </span>
              <span className="header-avatar">س</span>
            </div>
          </header>
          <main className="main-content">
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  <span /> أهلًا بك في مساحة عائلتك
                </div>
                <h1>
                  {page === "home"
                    ? "جذورنا تجمعنا، وأجيالنا تمتد"
                    : current.label}
                </h1>
                <p>
                  {page === "home"
                    ? "كل اسم حكاية، وكل فرع امتداد. اكتشف شجرة عائلتك وحافظ على إرثها للأجيال القادمة."
                    : "روابط نعتز بها، وحكايات نحتفظ بها للأجيال القادمة."}
                </p>
              </div>
              {page === "home" && (
                <button
                  className="button primary"
                  onClick={() => navigate("people")}
                >
                  <PlusIcon />
                  إدارة الأفراد
                </button>
              )}
            </div>
            <div className="demo-strip">
              <ShieldCheck size={16} />
              <span>
                مساحة عرض تجريبية — بيانات خيالية، دون مصادقة إنتاجية. لا تستخدم
                بيانات شخصية حقيقية.
              </span>
              <button onClick={() => navigate("settings")}>
                اعرف المزيد <ArrowUpLeft size={14} />
              </button>
            </div>
            {storageError && (
              <p className="error" role="alert">
                {storageError}
              </p>
            )}
            {(page === "home" || page === "statistics") && (
              <div className="stats-grid">
                {statCards.map((stat) => (
                  <div className="stat-card" key={stat.label}>
                    <div className="stat-top">
                      <span>{stat.label}</span>
                      <span className={`stat-icon ${stat.color}`}>
                        <stat.icon size={20} />
                      </span>
                    </div>
                    <strong className="stat-number">
                      {stat.value.toLocaleString("ar-SA")}
                    </strong>
                    <small>{stat.detail}</small>
                  </div>
                ))}
              </div>
            )}
            {(page === "home" || page === "tree") && (
              <>
                <section className="tree-panel">
                  <div className="section-header">
                    <div className="tree-title">
                      <span className="section-icon">
                        <GitFork size={21} />
                      </span>
                      <div>
                        <h2>شجرة عائلة السالم</h2>
                        <p>
                          حكايتنا تبدأ هنا… وتمتد عبر{" "}
                          {family.generations.length} أجيال
                        </p>
                      </div>
                    </div>
                    <span className="badge">
                      <span className="tiny-dot" /> {people.length} فردًا في
                      الشجرة
                    </span>
                  </div>
                  <FamilyTree
                    names={names}
                    ancestorId={ancestorId}
                    onAncestorChange={setAncestorId}
                    family={family}
                    people={people}
                    onSelect={selectPerson}
                  />
                </section>
                {page === "home" && (
                  <div className="bottom-grid">
                    <section className="memory-card">
                      <span className="memory-art">
                        <Sprout size={75} strokeWidth={1} />
                      </span>
                      <div>
                        <span className="eyebrow">
                          لأن الذاكرة تستحق أن تبقى
                        </span>
                        <h2>كل جيل يضيف فصلًا جديدًا</h2>
                        <p>
                          أضف أفراد العائلة، واحفظ الروابط التي تجعل قصتنا
                          واحدة.
                        </p>
                        <button onClick={() => navigate("people")}>
                          استعرض سجل العائلة <ArrowLeft size={16} />
                        </button>
                      </div>
                    </section>
                    <section className="panel quick-import">
                      <span className="section-icon">
                        <FileSpreadsheet size={23} />
                      </span>
                      <h3>شجرتك جاهزة في ملف؟</h3>
                      <p>
                        استورد أفراد العائلة من Excel، وراجع البيانات قبل
                        إضافتها.
                      </p>
                      <div>
                        <button
                          className="button secondary"
                          onClick={() => navigate("import")}
                        >
                          استيراد ملف <ArrowUpLeft size={16} />
                        </button>
                        <button
                          className="text-button"
                          onClick={downloadTemplate}
                        >
                          <Download size={15} /> النموذج
                        </button>
                      </div>
                    </section>
                  </div>
                )}
              </>
            )}
            {page === "people" && (
              <PeoplePage
                family={family}
                people={people}
                onChange={update}
                canEdit={canEdit}
              />
            )}
            {page === "import" && (
              <ImportPage onImport={update} canEdit={canEdit} />
            )}
            {page === "statistics" && (
              <StatisticsPage family={family} people={people} />
            )}
            {page === "settings" && (
              <section className="panel settings-panel">
                <h2>الخصوصية وإعدادات التجربة</h2>
                <div className="notice">
                  <ShieldCheck size={24} />
                  <span>
                    الدور الحالي: {session.role === "admin" ? "مدير" : "مشاهد"}.
                    اختيار الدور محلي وقابل للتغيير، ولا يمثل تفويضًا أمنيًا.
                  </span>
                </div>
                <h3>قبل استخدام بيانات حقيقية</h3>
                <p>
                  يجب إضافة Backend وقاعدة بيانات، ومصادقة آمنة بجلسات خادم،
                  والتحقق من صلاحيات admin وviewer على كل طلب. يلزم كذلك تشفير
                  النقل وسياسات وصول ونسخ احتياطية وسياسة احتفاظ وحذف.
                </p>
                <h3>الحفظ المحلي</h3>
                <p>
                  تُحفظ التعديلات والاستيراد في localStorage لهذا المتصفح دون
                  إرسال أي بيانات لخدمة خارجية. يمكن لأي مستخدم للجهاز الاطلاع
                  عليها. لا تُخزّن كلمات مرور أو أسرار هنا.
                </p>
                <h3>بيانات العرض</h3>
                <p>
                  يمكنك استعادة العائلة الخيالية وحذف التعديلات المحلية الحالية.
                </p>
                {canEdit && (
                  <button
                    className="button secondary"
                    onClick={() => setReset(true)}
                  >
                    استعادة البيانات التجريبية
                  </button>
                )}
              </section>
            )}
            <footer className="app-footer">
              <span>
                <Sprout size={15} /> جذور · ذاكرة العائلة للأجيال القادمة
              </span>
              <span>
                صُنع ليجمعنا <Heart size={13} />
              </span>
            </footer>
          </main>
        </Suspense>
      </div>
      {selected && (
        <Dialog onClose={() => setSelected(null)}>
          <section
            className="modal small-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
          >
            <div className="section-header">
              <span className="avatar">
                <UserRound />
              </span>
              <button
                aria-label="إغلاق التفاصيل"
                onClick={() => setSelected(null)}
              >
                <X />
              </button>
            </div>
            <span className="eyebrow">بطاقة فرد العائلة</span>
            <h2 id="detail-title">{names.get(selected.id) ?? selected.name}</h2>
            <span className={`badge ${selected.status === 2 ? "neutral" : ""}`}>
              {selected.status === 1 ? "على قيد الحياة" : "متوفى — رحمه الله"}
            </span>
            <button
              className="button primary ancestor-action"
              onClick={() => {
                setAncestorId(selected.id);
                setPage("tree");
                setSelected(null);
              }}
            >
              عرض المختار وأسلافه إلى الجيل 1
            </button>
            <dl className="detail-grid">
              <dt>الأب</dt>
              <dd>
                {family.byId.get(selected.parentId)?.name || "جذر العائلة"}
              </dd>
              <dt>الجيل الفعلي</dt>
              <dd>{(family.depth.get(selected.id) ?? 0) + 1}</dd>
              {Object.entries(family.stats.get(selected.id) ?? {}).map(
                ([key, value]) => (
                  <div className="detail-pair" key={key}>
                    <dt>
                      {
                        {
                          direct: "الأبناء المباشرون",
                          total: "إجمالي الذرية",
                          living: "الأحياء ضمن الذرية",
                          deceased: "المتوفون ضمن الذرية",
                        }[key]
                      }
                    </dt>
                    <dd>{value}</dd>
                  </div>
                ),
              )}
              {Object.entries(selected.customFields).map(([key, value]) => (
                <div className="detail-pair" key={key}>
                  <dt>{key}</dt>
                  <dd>{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </section>
        </Dialog>
      )}
      {reset && (
        <Dialog onClose={() => setReset(false)}>
          <section
            className="modal small-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <h2 id="reset-title">استعادة بيانات العرض؟</h2>
            <p>ستُستبدل جميع التعديلات المحلية بالبيانات التجريبية.</p>
            <div className="toolbar-actions">
              <button
                className="button primary"
                onClick={() => {
                  update(demoPeople);
                  setReset(false);
                }}
              >
                تأكيد الاستعادة
              </button>
              <button
                className="button secondary"
                onClick={() => setReset(false)}
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
function PlusIcon() {
  return (
    <span aria-hidden="true" className="plus-icon">
      +
    </span>
  );
}
