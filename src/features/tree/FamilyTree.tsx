import { lockBodyScroll } from "../../utils/scrollLock";
import { HeritageCard, HeritageEdge } from "./HeritageElements";
import {
  heritageTreeLayout,
  heritageNodeSize,
  HERITAGE_ANCHOR_X,
  HERITAGE_ANCHOR_Y,
} from "./heritage";
import { compactTreeLayout } from "./layout";
import { filterStatus } from "./presentation";
import type { StatusFilter } from "./presentation";
import {
  CARD_WIDTH,
  cardHeight,
  generationRange,
  firstName,
} from "./presentation";
import ExportControls from "./ExportControls";
import { ancestorPath } from "./export";
import { memo, useEffect, useMemo, useState, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useReactFlow,
} from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import type { Person } from "../../types";
import type { FamilyAnalysis } from "../../utils/family";
import {
  Search,
  Rows3,
  Columns3,
  Maximize,
  ChevronDown,
  ChevronUp,
  Sprout,
} from "lucide-react";
import "@xyflow/react/dist/style.css";
type CardData = {
  person: Person;
  fullName: string;
  heritage: boolean;
  leafSide: number;
  showStatus: boolean;
  displayName: string;
  upward: boolean;
  root: boolean;
  direct: number;
  total: number;
  horizontal: boolean;
  collapsed: boolean;
  canCollapse: boolean;
  selected: boolean;
  toggle: () => void;
  details: () => void;
};
const PersonCard = memo(function PersonCard({
  data,
}: NodeProps<Node<CardData>>) {
  if (data.heritage)
    return (
      <HeritageCard
        side={data.leafSide}
        person={data.person}
        displayName={data.displayName}
        selected={data.selected}
        root={data.root}
        showStatus={data.showStatus}
        direct={data.direct}
        total={data.total}
        collapsed={data.collapsed}
        canCollapse={data.canCollapse}
        onDetails={data.details}
        onToggle={data.toggle}
      />
    );
  return (
    <div
      style={{
        width: CARD_WIDTH,
        height: cardHeight(data.displayName, data.showStatus),
      }}
      className={`person-card ${data.upward ? "upward-card" : ""} ${data.selected ? "highlight" : ""} ${data.person.status === 2 ? "deceased" : ""}`}
    >
      <Handle
        type="target"
        position={
          data.horizontal
            ? Position.Right
            : data.upward
              ? Position.Bottom
              : Position.Top
        }
      />
      <button className="person-main" onClick={data.details}>
        <span>
          <strong>{data.displayName}</strong>
          {data.showStatus && (
            <small>
              <span className={data.person.status === 1 ? "alive-label" : ""}>
                {data.person.status === 1 ? "على قيد الحياة" : "رحمه الله"}
              </span>
            </small>
          )}
        </span>
      </button>
      <div className="person-counts">
        <span>
          <b>{data.direct}</b> أبناء مباشرين
        </span>
        <span>
          <b>{data.total}</b> إجمالي الذرية
        </span>
      </div>
      {data.direct > 0 && data.canCollapse && (
        <button
          className="collapse-button nodrag"
          aria-label={`${data.collapsed ? "فتح" : "إغلاق"} فرع ${data.person.name}`}
          onClick={data.toggle}
        >
          {data.collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      )}
      {data.upward && data.root && (
        <span className="root-sprout" aria-hidden="true">
          <Sprout size={48} />
        </span>
      )}
      <Handle
        type="source"
        position={
          data.horizontal
            ? Position.Left
            : data.upward
              ? Position.Top
              : Position.Bottom
        }
      />
    </div>
  );
});
const nodeTypes = { person: PersonCard };
const edgeTypes = { heritage: HeritageEdge };
function Canvas({
  people,
  family,
  onSelect,
  ancestorId,
  onAncestorChange,
  names,
}: {
  people: Person[];
  family: FamilyAnalysis;
  onSelect: (p: Person) => void;
  ancestorId: string;
  onAncestorChange: (id: string) => void;
  names: Map<string, string>;
}) {
  const [horizontal, setHorizontal] = useState(false),
    [upward, setUpward] = useState(false),
    [heritage, setHeritage] = useState(false),
    [collapsed, setCollapsed] = useState<Set<string>>(new Set()),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState(""),
    [notice, setNotice] = useState(""),
    [fromGeneration, setFromGeneration] = useState(1),
    [toGeneration, setToGeneration] = useState(0),
    [gap, setGap] = useState(28),
    [status, setStatus] = useState<StatusFilter>("all"),
    [showStatus, setShowStatus] = useState(false),
    [mouseMode, setMouseMode] = useState<"pan" | "zoom">("pan");
  const screenRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const flow = useReactFlow();
  const savedViewport = useRef<ReturnType<typeof flow.getViewport> | null>(
    null,
  );
  async function toggleFullscreen() {
    if (expanded) {
      if (document.fullscreenElement)
        await document.exitFullscreen().catch(() => {});
      setExpanded(false);
      return;
    }
    savedViewport.current = flow.getViewport();
    setExpanded(true);
    if (document.documentElement.requestFullscreen)
      await document.documentElement.requestFullscreen().catch(() => {});
  }
  useEffect(() => {
    const change = () => {
      if (!document.fullscreenElement) setExpanded(false);
    };
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const unlock = lockBodyScroll();
    const close = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        !document.querySelector('[role="dialog"],[role="alertdialog"]')
      ) {
        setExpanded(false);
        if (document.fullscreenElement)
          void document.exitFullscreen().catch(() => {});
      }
    };
    document.addEventListener("keydown", close);
    const timer = setTimeout(
      () => void flow.fitView({ duration: 250, padding: 0.12 }),
      150,
    );
    return () => {
      clearTimeout(timer);
      unlock();
      if (document.fullscreenElement === document.documentElement)
        void document.exitFullscreen().catch(() => {});
      document.removeEventListener("keydown", close);
      if (savedViewport.current) {
        const viewport = savedViewport.current;
        setTimeout(
          () => void flow.setViewport(viewport, { duration: 100 }),
          100,
        );
      }
    };
  }, [expanded, flow]);
  useEffect(() => {
    setFromGeneration(1);
    setToGeneration(0);
    setStatus("all");
  }, [ancestorId, people]);
  const ancestors = useMemo(
    () => ancestorPath(ancestorId, family),
    [ancestorId, family],
  );
  const ancestorIds = useMemo(
    () => new Set(ancestors.map((p) => p.id)),
    [ancestors],
  );
  const layout = useMemo(() => {
    const visible: Person[] = [],
      queue = ancestorId ? ancestors.slice(0, 1) : [...family.roots];
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i];
      visible.push(p);
      if (ancestorId)
        queue.push(
          ...family.children
            .get(p.id)!
            .filter((child) => ancestorIds.has(child.id)),
        );
      else if (!collapsed.has(p.id)) queue.push(...family.children.get(p.id)!);
    }
    const filtered = filterStatus(
      generationRange(
        visible,
        family,
        fromGeneration,
        toGeneration || family.generations.length,
      ),
      status,
    );
    const positions = heritage
      ? heritageTreeLayout(filtered, gap, showStatus)
      : compactTreeLayout(filtered, horizontal, upward, gap, showStatus);
    const ids = new Set(filtered.map((p) => p.id));
    const edges = filtered
      .filter((p) => ids.has(p.parentId))
      .map((p) => ({
        id: `${p.parentId}-${p.id}`,
        source: p.parentId,
        target: p.id,
        type: heritage ? "heritage" : upward ? "default" : "smoothstep",
        data: {
          ornaments:
            filtered.length <= 80
              ? Math.min(
                  8,
                  Math.max(
                    2,
                    Math.floor(
                      Math.hypot(
                        positions.get(p.id)!.x - positions.get(p.parentId)!.x,
                        positions.get(p.id)!.y - positions.get(p.parentId)!.y,
                      ) / 220,
                    ),
                  ) * 2,
                )
              : 1,
          width: Math.max(
            2,
            Math.min(
              42,
              Math.sqrt((family.stats.get(p.id)?.total ?? 0) + 1) * 8,
            ),
          ),
        },
        pathOptions: { borderRadius: 18, offset: Math.min(14, gap / 3) },
        style: {
          stroke: upward ? "#67874c" : "#6b927b",
          strokeWidth: upward
            ? Math.max(2, 5 - (family.depth.get(p.id) ?? 0) * 0.6)
            : 2.1,
        },
      }));
    const nodes = filtered.map((p) => {
      const pos = positions.get(p.id)!,
        stat = family.stats.get(p.id)!;
      return {
        id: p.id,
        type: "person",
        position: pos,
        width: heritage
          ? heritageNodeSize(!ids.has(p.parentId), showStatus).width
          : CARD_WIDTH,
        height: heritage
          ? heritageNodeSize(!ids.has(p.parentId), showStatus).height
          : cardHeight(firstName(p.name), showStatus),
        data: {
          person: p,
          fullName: names.get(p.id) ?? p.name,
          heritage,
          leafSide: 1,
          displayName: firstName(p.name),
          showStatus,
          upward,
          root: !ids.has(p.parentId),
          ...stat,
          horizontal,
          collapsed: !ancestorId && collapsed.has(p.id),
          canCollapse: !ancestorId,
          selected: false,
          toggle: () => {
            setSelected(p.id);
            setCollapsed((old) => {
              const next = new Set(old);
              next.has(p.id) ? next.delete(p.id) : next.add(p.id);
              return next;
            });
          },
          details: () => {
            setSelected(p.id);
            onSelect(p);
          },
        },
      };
    });
    return { nodes, edges };
  }, [
    family,
    collapsed,
    horizontal,
    upward,
    heritage,
    onSelect,
    ancestorId,
    ancestors,
    ancestorIds,
    fromGeneration,
    toGeneration,
    gap,
    names,
    status,
    showStatus,
  ]);
  const edges = layout.edges;
  const nodes = useMemo(
    () =>
      layout.nodes.map((n) => ({
        ...n,
        data: { ...n.data, selected: n.id === selected },
      })),
    [layout, selected],
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      if (heritage && !selected) {
        void flow.fitView({ padding: 0.18, maxZoom: 1, duration: 300 });
        return;
      }
      const first =
        layout.nodes.find((n) => n.id === selected) ?? layout.nodes[0];
      if (first)
        void flow.setCenter(
          first.position.x + (heritage ? HERITAGE_ANCHOR_X : CARD_WIDTH / 2),
          first.position.y +
            (heritage
              ? HERITAGE_ANCHOR_Y
              : cardHeight(first.data.displayName, showStatus) / 2),
          {
            zoom: 1,
            duration: 250,
          },
        );
    }, 100);
    return () => clearTimeout(timer);
  }, [
    horizontal,
    upward,
    heritage,
    people,
    ancestorId,
    selected,
    fromGeneration,
    toGeneration,
    gap,
    status,
    showStatus,
    flow,
  ]);
  function search() {
    const match =
      family.byId.get(query.trim()) ??
      people.find((p) => p.name.includes(query.trim()));
    if (!query.trim() || !match) {
      setNotice("لم يتم العثور على شخص مطابق");
      return;
    }
    setNotice("");
    onAncestorChange("");
    setSelected(match.id);
    setStatus("all");
    setFromGeneration(1);
    setToGeneration(0);
    setCollapsed((old) => {
      const next = new Set(old);
      let parent = match.parentId;
      while (parent) {
        next.delete(parent);
        parent = family.byId.get(parent)?.parentId ?? "";
      }
      return next;
    });
  }
  useEffect(() => {
    if (!selected) return;
    const n = nodes.find((n) => n.id === selected);
    if (n)
      void flow.setCenter(
        n.position.x + (heritage ? HERITAGE_ANCHOR_X : CARD_WIDTH / 2),
        n.position.y +
          (heritage
            ? HERITAGE_ANCHOR_Y
            : cardHeight(n.data.displayName, showStatus) / 2),
        {
          zoom: 1,
          duration: 450,
        },
      );
  }, [selected, nodes, flow]);
  return (
    <div
      ref={screenRef}
      className={`tree-workspace ${expanded ? "tree-fullscreen" : ""}`}
    >
      <div className="tree-toolbar">
        <form
          className="search-box"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <Search size={18} />
          <input
            aria-label="البحث في الشجرة"
            placeholder="ابحث بالاسم أو المعرّف…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit">بحث</button>
        </form>
        <div className="toolbar-actions">
          <button
            onClick={() => void toggleFullscreen()}
            aria-pressed={expanded}
            aria-label={expanded ? "الخروج من ملء الشاشة" : "ملء الشاشة"}
          >
            <Maximize size={17} />
            {expanded ? "الخروج من ملء الشاشة" : "ملء الشاشة"}
          </button>
          <button
            className={!horizontal && !upward ? "active" : ""}
            onClick={() => {
              setHorizontal(false);
              setUpward(false);
              setHeritage(false);
            }}
          >
            <Rows3 size={16} /> عمودي
          </button>
          <button
            className={horizontal ? "active" : ""}
            onClick={() => {
              setHorizontal(true);
              setUpward(false);
              setHeritage(false);
            }}
          >
            <Columns3 size={16} /> أفقي
          </button>
          <button
            className={upward && !heritage ? "active" : ""}
            onClick={() => {
              setHorizontal(false);
              setUpward(true);
              setHeritage(false);
            }}
          >
            <Sprout size={17} /> شجرة صاعدة
          </button>
          <button
            className={heritage ? "active" : ""}
            onClick={() => {
              setHeritage(true);
              setUpward(true);
              setHorizontal(false);
            }}
          >
            <Sprout size={17} /> الشجرة التراثية
          </button>
          <button
            onClick={() => {
              const first = nodes.find((n) => n.id === selected) ?? nodes[0];
              if (first)
                void flow.setCenter(
                  first.position.x +
                    (heritage ? HERITAGE_ANCHOR_X : CARD_WIDTH / 2),
                  first.position.y +
                    (heritage
                      ? HERITAGE_ANCHOR_Y
                      : cardHeight(first.data.displayName, showStatus) / 2),
                  { zoom: 1, duration: 250 },
                );
            }}
          >
            حجم مقروء 100٪
          </button>
          <button
            title="إعادة ضبط العرض"
            aria-label="إعادة ضبط العرض"
            onClick={() => void flow.fitView({ duration: 300, padding: 0.15 })}
          >
            <Maximize size={17} /> عرض الكل
          </button>
        </div>
      </div>
      <div className="tree-view-options">
        <label>
          الحالة
          <select
            aria-label="تصفية حالة الشجرة"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="all">الكل</option>
            <option value="1">الأحياء</option>
            <option value="2">المتوفون</option>
          </select>
        </label>
        <label className="status-toggle">
          <input
            type="checkbox"
            checked={showStatus}
            onChange={(e) => setShowStatus(e.target.checked)}
          />{" "}
          إظهار نص الحالة
        </label>
        <label>
          من الجيل
          <select
            aria-label="من الجيل"
            value={fromGeneration}
            onChange={(e) => {
              setFromGeneration(Number(e.target.value));
              setToGeneration(0);
            }}
          >
            {family.generations.map((_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
        <label>
          إلى الجيل
          <select
            aria-label="إلى الجيل"
            value={toGeneration}
            onChange={(e) => setToGeneration(Number(e.target.value))}
          >
            <option value={0}>كل الأجيال</option>
            {family.generations.map((_, i) =>
              i + 1 >= fromGeneration ? (
                <option key={i} value={i + 1}>
                  {i + 1}
                </option>
              ) : null,
            )}
          </select>
        </label>
        <label>
          امتداد الخطوط
          <input
            aria-label="امتداد الخطوط"
            type="range"
            min="24"
            max="120"
            step="4"
            value={gap}
            onChange={(e) => setGap(Number(e.target.value))}
          />
        </label>
        <div className="toolbar-actions">
          <button
            className={mouseMode === "pan" ? "active" : ""}
            onClick={() => setMouseMode("pan")}
          >
            وضع التحريك
          </button>
          <button
            className={mouseMode === "zoom" ? "active" : ""}
            onClick={() => setMouseMode("zoom")}
          >
            وضع الزوم
          </button>
        </div>
        <small>
          {mouseMode === "pan"
            ? "اسحب بالماوس في أي اتجاه؛ عجلة الماوس للتحريك وShift للحركة الأفقية. أزرار + و− متاحة دائمًا."
            : "عجلة الماوس للتكبير والتصغير، والسحب للتحريك. اللمس بإصبعين متاح."}
        </small>
      </div>
      <div className="tree-extra-toolbar">
        <span className="muted">
          {nodes.length} فردًا ظاهرًا · حرّك الرسم لاستكشاف الفروع أو استخدم عرض
          الكل
        </span>
        <ExportControls
          nodes={nodes}
          edges={edges}
          people={people}
          family={family}
          horizontal={horizontal}
          upward={upward}
          heritage={heritage}
          showStatus={showStatus}
          status={status}
          names={names}
          gap={gap}
        />
      </div>
      {ancestorId && (
        <div className="notice ancestor-banner">
          <div>
            <strong>مسار أسلاف {family.byId.get(ancestorId)?.name}</strong>
            <p>
              من الجيل {(family.depth.get(ancestorId) ?? 0) + 1} إلى الجيل 1 ·
              الشخص المختار وآباؤه فقط؛ الجذر{" "}
              {upward ? "أسفل الرسم" : horizontal ? "يمين الرسم" : "أعلى الرسم"}
              .
            </p>
          </div>
          <button
            className="button secondary"
            onClick={() => onAncestorChange("")}
          >
            العودة إلى العائلة كاملة
          </button>
        </div>
      )}
      {nodes.length === 0 && (
        <p className="notice" role="status">
          لا توجد أفراد تطابق الأجيال والحالة المختارة.
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <div
        className={`tree-canvas ${heritage ? "heritage-canvas" : upward ? "upward-canvas" : ""}`}
        dir="ltr"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          panOnDrag
          panOnScroll={mouseMode === "pan"}
          zoomOnScroll={mouseMode === "zoom"}
          zoomOnPinch
          zoomOnDoubleClick={false}
          preventScrolling
          minZoom={0.01}
          maxZoom={1.8}
          onlyRenderVisibleElements
          nodesDraggable={false}
        >
          {!heritage && <Background color="#c8d8cd" gap={22} />}
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            nodeColor={heritage ? "#b5a17e" : "#7da48d"}
          />
        </ReactFlow>
        <div className="canvas-legend" dir="rtl">
          {showStatus && (
            <>
              <span>
                <i /> على قيد الحياة
              </span>
              <span>
                <i className="gray" /> متوفى
              </span>
            </>
          )}
          <span>اضغط على البطاقة لعرض التفاصيل</span>
        </div>
      </div>
    </div>
  );
}
export default function FamilyTree(props: {
  people: Person[];
  family: FamilyAnalysis;
  onSelect: (p: Person) => void;
  ancestorId: string;
  onAncestorChange: (id: string) => void;
  names: Map<string, string>;
}) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
