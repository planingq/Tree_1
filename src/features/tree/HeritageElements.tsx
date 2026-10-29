import { Handle, Position, getBezierPath } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import { CARD_WIDTH, cardHeight } from "./presentation";
import {
  HERITAGE_ROOT_EXTRA,
  leafOrnament,
  trunkOrnament,
  woodBranch,
} from "./heritage";
import type { Person } from "../../types";
export function HeritageCard({
  person,
  displayName,
  selected,
  root,
  showStatus,
  direct,
  total,
  canCollapse,
  collapsed,
  onDetails,
  onToggle,
}: {
  person: Person;
  displayName: string;
  selected: boolean;
  root: boolean;
  showStatus: boolean;
  direct: number;
  total: number;
  canCollapse: boolean;
  collapsed: boolean;
  onDetails: () => void;
  onToggle: () => void;
}) {
  const height = cardHeight(displayName, showStatus);
  return (
    <div
      className={`heritage-person ${root ? "heritage-root" : ""} ${selected ? "heritage-selected" : ""} ${person.status === 2 ? "heritage-deceased" : ""} ${showStatus ? "heritage-show-status" : ""}`}
      style={{
        width: CARD_WIDTH,
        height: height + (root ? HERITAGE_ROOT_EXTRA : 0),
      }}
    >
      <Handle
        type="target"
        position={Position.Bottom}
        style={{ top: height - 3, bottom: "auto" }}
      />
      <svg
        className={root ? "heritage-trunk" : "heritage-leaf"}
        viewBox={root ? "0 0 320 280" : "0 0 160 100"}
        aria-hidden="true"
        preserveAspectRatio="none"
        style={root ? undefined : { height }}
        dangerouslySetInnerHTML={{
          __html: root
            ? trunkOrnament()
            : leafOrnament(person.status === 2, selected),
        }}
      />
      <button
        className={`heritage-name nodrag ${root ? "heritage-plaque" : ""}`}
        onClick={onDetails}
        title={`الأبناء: ${direct} · الذرية: ${total}`}
        style={{ height: showStatus ? height - 25 : height - 15 }}
      >
        <strong>{displayName}</strong>
        {showStatus && (
          <small>{person.status === 1 ? "حي" : "متوفى — رحمه الله"}</small>
        )}
        <small className="heritage-counts">
          {direct} أبناء · {total} ذرية
        </small>
      </button>
      {direct > 0 && canCollapse && (
        <button
          className="heritage-collapse nodrag"
          aria-label={`${collapsed ? "فتح" : "إغلاق"} فرع ${person.name}`}
          onClick={onToggle}
        >
          {collapsed ? "+" : "−"}
        </button>
      )}
      <Handle type="source" position={Position.Top} />
    </div>
  );
}
export function HeritageEdge(props: EdgeProps) {
  const [path] = getBezierPath({ ...props, curvature: 0.4 });
  const width = typeof props.data?.width === "number" ? props.data.width : 4;
  return (
    <g
      className="heritage-branch"
      dangerouslySetInnerHTML={{ __html: woodBranch(path, width) }}
    />
  );
}
