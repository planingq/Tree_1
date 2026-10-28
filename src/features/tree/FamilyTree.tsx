import ExportControls from "./ExportControls";
import { ancestorPath } from "./export";
import { memo, useEffect, useMemo, useState } from "react";
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
import dagre from "@dagrejs/dagre";
import type { Person } from "../../types";
import type { FamilyAnalysis } from "../../utils/family";
import {
  Search,
  Rows3,
  Columns3,
  Maximize,
  ChevronDown,
  ChevronUp,
  UserRound,
} from "lucide-react";
import "@xyflow/react/dist/style.css";
type CardData = {
  person: Person;
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
  return (
    <div
      className={`person-card ${data.selected ? "highlight" : ""} ${data.person.status === 2 ? "deceased" : ""}`}
    >
      <Handle
        type="target"
        position={data.horizontal ? Position.Right : Position.Top}
      />
      <button className="person-main" onClick={data.details}>
        <span className="avatar">
          <UserRound size={21} />
        </span>
        <span>
          <strong>{data.person.name}</strong>
          <small>
            #{data.person.id} ·{" "}
            <span className={data.person.status === 1 ? "alive-label" : ""}>
              {data.person.status === 1 ? "على قيد الحياة" : "رحمه الله"}
            </span>
          </small>
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
      <Handle
        type="source"
        position={data.horizontal ? Position.Left : Position.Bottom}
      />
    </div>
  );
});
const nodeTypes = { person: PersonCard };
function Canvas({
  people,
  family,
  onSelect,
  ancestorId,
  onAncestorChange,
}: {
  people: Person[];
  family: FamilyAnalysis;
  onSelect: (p: Person) => void;
  ancestorId: string;
  onAncestorChange: (id: string) => void;
}) {
  const [horizontal, setHorizontal] = useState(false),
    [collapsed, setCollapsed] = useState<Set<string>>(new Set()),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState(""),
    [notice, setNotice] = useState("");
  const flow = useReactFlow();
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
    const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    graph.setGraph({
      rankdir: horizontal ? "RL" : "TB",
      nodesep: 30,
      ranksep: 65,
    });
    visible.forEach((p) => graph.setNode(p.id, { width: 240, height: 126 }));
    const ids = new Set(visible.map((p) => p.id));
    const edges = visible
      .filter((p) => ids.has(p.parentId))
      .map((p) => ({
        id: `${p.parentId}-${p.id}`,
        source: p.parentId,
        target: p.id,
        type: "smoothstep",
        style: { stroke: "#91ad9e", strokeWidth: 1.7 },
      }));
    edges.forEach((e) => graph.setEdge(e.source, e.target));
    dagre.layout(graph);
    const nodes = visible.map((p) => {
      const pos = graph.node(p.id),
        stat = family.stats.get(p.id)!;
      return {
        id: p.id,
        type: "person",
        position: { x: pos.x - 120, y: pos.y - 63 },
        data: {
          person: p,
          ...stat,
          horizontal,
          collapsed: !ancestorId && collapsed.has(p.id),
          canCollapse: !ancestorId,
          selected: false,
          toggle: () =>
            setCollapsed((old) => {
              const next = new Set(old);
              next.has(p.id) ? next.delete(p.id) : next.add(p.id);
              return next;
            }),
          details: () => onSelect(p),
        },
      };
    });
    return { nodes, edges };
  }, [
    family,
    collapsed,
    horizontal,
    onSelect,
    ancestorId,
    ancestors,
    ancestorIds,
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
      const first =
        layout.nodes.find((n) => n.id === selected) ?? layout.nodes[0];
      if (first)
        void flow.setCenter(first.position.x + 120, first.position.y + 100, {
          zoom: selected ? 1 : 0.9,
          duration: 250,
        });
    }, 100);
    return () => clearTimeout(timer);
  }, [horizontal, people, ancestorId, selected, flow]);
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
      void flow.setCenter(n.position.x + 120, n.position.y + 63, {
        zoom: 1,
        duration: 450,
      });
  }, [selected, nodes, flow]);
  return (
    <>
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
            className={!horizontal ? "active" : ""}
            onClick={() => setHorizontal(false)}
          >
            <Rows3 size={16} /> عمودي
          </button>
          <button
            className={horizontal ? "active" : ""}
            onClick={() => setHorizontal(true)}
          >
            <Columns3 size={16} /> أفقي
          </button>
          <button
            onClick={() => {
              const first = nodes.find((n) => n.id === selected) ?? nodes[0];
              if (first)
                void flow.setCenter(
                  first.position.x + 120,
                  first.position.y + 63,
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
        />
      </div>
      {ancestorId && (
        <div className="notice ancestor-banner">
          <div>
            <strong>مسار أسلاف {family.byId.get(ancestorId)?.name}</strong>
            <p>
              من الجيل {(family.depth.get(ancestorId) ?? 0) + 1} إلى الجيل 1 ·
              الشخص المختار وآباؤه فقط؛ يبقى الجذر في أعلى الرسم أو يمينه.
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
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <div className="tree-canvas" dir="ltr">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
          minZoom={0.08}
          maxZoom={1.8}
          onlyRenderVisibleElements
          nodesDraggable={false}
        >
          <Background color="#c8d8cd" gap={22} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor="#7da48d" />
        </ReactFlow>
        <div className="canvas-legend" dir="rtl">
          <span>
            <i /> على قيد الحياة
          </span>
          <span>
            <i className="gray" /> متوفى
          </span>
          <span>اضغط على البطاقة لعرض التفاصيل</span>
        </div>
      </div>
    </>
  );
}
export default function FamilyTree(props: {
  people: Person[];
  family: FamilyAnalysis;
  onSelect: (p: Person) => void;
  ancestorId: string;
  onAncestorChange: (id: string) => void;
}) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
