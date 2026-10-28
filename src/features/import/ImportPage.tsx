import { useMemo, useState } from "react";
import {
  UploadCloud,
  Download,
  FileSpreadsheet,
  CircleCheck,
} from "lucide-react";
import {
  convertRows,
  detectColumns,
  downloadTemplate,
  fields,
  labels,
  readExcel,
} from "./excel";
import type { RawSheet, Field } from "./excel";
import type { Person } from "../../types";
export default function ImportPage({
  onImport,
  canEdit,
}: {
  onImport: (p: Person[]) => void;
  canEdit: boolean;
}) {
  const [sheet, setSheet] = useState<RawSheet | null>(null),
    [mapping, setMapping] = useState<Record<Field, string>>({
      id: "",
      status: "",
      siblingOrder: "",
      name: "",
      fatherName: "",
      parentId: "",
    }),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false),
    [success, setSuccess] = useState(false);
  const result = useMemo(
    () => (sheet ? convertRows(sheet, mapping) : null),
    [sheet, mapping],
  );
  return (
    <div className="space-y-6">
      <div className="section-header">
        <div>
          <h2>استيراد أفراد العائلة</h2>
          <p>من ملفك إلى شجرتك، بخطوات واضحة وآمنة.</p>
        </div>
        <button className="button secondary" onClick={downloadTemplate}>
          <Download size={17} /> تنزيل النموذج
        </button>
      </div>
      <div className="notice">
        تُقرأ الملفات على جهازك فقط. استخدم بيانات تجريبية؛ الحفظ المحلي ليس
        مناسبًا للبيانات العائلية الحساسة.
      </div>
      <label className="upload-zone">
        <UploadCloud size={42} />
        <h3>اختر ملف Excel للبدء</h3>
        <p>XLSX أو XLS · حتى 10 ميجابايت · أول ورقة عمل</p>
        <input
          type="file"
          accept=".xlsx,.xls"
          disabled={loading || !canEdit}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setLoading(true);
            setError("");
            setSuccess(false);
            setSheet(null);
            setConfirm(false);
            try {
              const s = await readExcel(file);
              setSheet(s);
              setMapping(detectColumns(s.headers));
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "تعذرت قراءة الملف",
              );
            } finally {
              setLoading(false);
              e.target.value = "";
            }
          }}
        />
        <span className="button primary">
          {loading ? "جارٍ قراءة الملف…" : "اختيار ملف"}
        </span>
      </label>
      {!canEdit && (
        <p className="notice">دور المشاهد يتيح الاطلاع فقط في هذه التجربة.</p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="success" role="status">
          <CircleCheck size={18} /> تم اعتماد البيانات وتحديث الشجرة
          والإحصائيات.
        </p>
      )}
      {sheet && result && (
        <div className="panel">
          <h3>
            <FileSpreadsheet size={20} /> مطابقة الأعمدة ومعاينة البيانات
          </h3>
          <div className="mapping-grid">
            {fields.map((f) => (
              <label key={f}>
                {labels[f]}
                <select
                  value={mapping[f]}
                  onChange={(e) => {
                    setMapping({ ...mapping, [f]: e.target.value });
                    setConfirm(false);
                  }}
                >
                  <option value="">اختر العمود</option>
                  {sheet.headers.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <p>
            {sheet.rows.length} صف ·{" "}
            {result.issues.filter((i) => i.level === "error").length} أخطاء ·{" "}
            {result.issues.filter((i) => i.level === "warning").length} تحذيرات
          </p>
          <div className="issue-list">
            {result.issues.map((issue, i) => (
              <p
                className={issue.level === "error" ? "error" : "notice"}
                key={i}
              >
                {issue.row ? `الصف ${issue.row}: ` : ""}
                {issue.message}
              </p>
            ))}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {sheet.headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.rows.slice(0, 8).map((row, i) => (
                  <tr key={i}>
                    {sheet.headers.map((h) => (
                      <td key={h}>{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            معاينة أول 8 صفوف. تُحفظ الأعمدة الإضافية كحقول مخصصة. احفظ
            المعرّفات كنص في Excel للحفاظ على الأصفار الأصلية.
          </p>
          {confirm ? (
            <div className="confirmation">
              <strong>
                سيتم استبدال جميع البيانات الحالية بـ{result.people.length}{" "}
                فردًا. هل تريد المتابعة؟
              </strong>
              <button
                className="button primary"
                onClick={() => {
                  onImport(result.people);
                  setSheet(null);
                  setConfirm(false);
                  setSuccess(true);
                }}
              >
                تأكيد استبدال البيانات
              </button>
              <button
                className="button secondary"
                onClick={() => setConfirm(false)}
              >
                إلغاء
              </button>
            </div>
          ) : (
            <button
              className="button primary"
              disabled={
                !canEdit || result.issues.some((i) => i.level === "error")
              }
              onClick={() => setConfirm(true)}
            >
              مراجعة واعتماد الاستيراد
            </button>
          )}
        </div>
      )}
    </div>
  );
}
