import { Handle, Position, getBezierPath } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import {
  heritageNodeSize,
  HERITAGE_ANCHOR_X,
  HERITAGE_ANCHOR_Y,
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
  side = 1,
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
  side?: number;
}) {
  const size = heritageNodeSize(root, showStatus),
    port = {
      left: HERITAGE_ANCHOR_X,
      top: HERITAGE_ANCHOR_Y,
      bottom: "auto",
      width: 0,
      height: 0,
      opacity: 0,
    };
  return (
    <div
      className={`heritage-person heritage-v2 ${root ? "heritage-root" : ""} ${selected ? "heritage-selected" : ""} ${person.status === 2 ? "heritage-deceased" : ""} ${showStatus ? "heritage-show-status" : ""}`}
      style={{ width: size.width, height: size.height }}
    >
      <Handle type="target" position={Position.Bottom} style={port} />
      <svg
        className="heritage-engraving"
        viewBox={`0 0 ${size.width} ${size.height}`}
        aria-hidden="true"
      >
        {root ? (
          <g dangerouslySetInnerHTML={{ __html: trunkOrnament() }} />
        ) : (
          <>
            <path
              d={`M120 130 Q120 101 ${side > 0 ? 105 : 135} 77`}
              fill="none"
              stroke="#665d46"
              strokeWidth="2"
            />
            <g transform={`translate(${side > 0 ? 100 : 0} 3) scale(.875 .9)`}>
              <g
                transform={
                  side > 0 ? undefined : "translate(160 0) scale(-1 1)"
                }
                dangerouslySetInnerHTML={{
                  __html: leafOrnament(person.status === 2, selected),
                }}
              />
            </g>
          </>
        )}
      </svg>
      <button
        className={`heritage-name nodrag ${root ? "heritage-plaque" : ""}`}
        style={
          root
            ? { left: 45, top: 197, width: 150, height: showStatus ? 75 : 58 }
            : {
                left: side > 0 ? 116 : 16,
                top: 24,
                width: 108,
                height: showStatus ? 53 : 45,
              }
        }
        onClick={onDetails}
        title={`الأبناء: ${direct} · الذرية: ${total}`}
      >
        <strong style={{ fontSize: displayName.length > 8 ? 18 : 22 }}>
          {displayName}
        </strong>
        {showStatus && (
          <small>{person.status === 1 ? "حي" : "متوفى — رحمه الله"}</small>
        )}
      </button>
      {direct > 0 && canCollapse && (
        <button
          className="heritage-collapse nodrag"
          style={{ left: 110, top: 135 }}
          aria-label={`${collapsed ? "فتح" : "إغلاق"} فرع ${person.name}`}
          onClick={onToggle}
        >
          {collapsed ? "+" : "−"}
        </button>
      )}
      <Handle type="source" position={Position.Top} style={port} />
    </div>
  );
}
export function HeritageEdge(props: EdgeProps) {
  const [path] = getBezierPath({ ...props, curvature: 0.48 });
  const width = typeof props.data?.width === "number" ? props.data.width : 5;
  return (
    <g
      className="heritage-branch"
      dangerouslySetInnerHTML={{
        __html: woodBranch(
          path,
          width,
          typeof props.data?.ornaments === "number" ? props.data.ornaments : 2,
        ),
      }}
    />
  );
}
