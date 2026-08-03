"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { CoChangeEdge, CollaborationEdge, ContributorStats } from "@/lib/types/analysis";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

type Mode = "cochange" | "collab";

export function GraphsView({
  coChange,
  collaboration,
  contributors,
}: {
  coChange: { nodes: string[]; edges: CoChangeEdge[] };
  collaboration: { nodes: string[]; edges: CollaborationEdge[] };
  contributors: ContributorStats[];
}) {
  const [mode, setMode] = useState<Mode>("cochange");
  const [minWeight, setMinWeight] = useState(2);
  const [selected, setSelected] = useState<string | null>(null);

  const nameById = useMemo(() => {
    const m = new Map(contributors.map((c) => [c.id, c.name]));
    return m;
  }, [contributors]);

  const { nodes, edges } = useMemo(() => {
    if (mode === "cochange") {
      const filteredEdges = coChange.edges.filter((e) => e.weight >= minWeight);
      const used = new Set<string>();
      for (const e of filteredEdges) {
        used.add(e.source);
        used.add(e.target);
      }
      const nodeList = coChange.nodes.filter((n) => used.has(n)).slice(0, 80);
      return layoutGraph(
        nodeList,
        filteredEdges.filter(
          (e) => nodeList.includes(e.source) && nodeList.includes(e.target)
        ),
        (id) => id.split("/").pop() ?? id
      );
    }
    const filteredEdges = collaboration.edges.filter((e) => e.weight >= minWeight);
    const used = new Set<string>();
    for (const e of filteredEdges) {
      used.add(e.source);
      used.add(e.target);
    }
    const nodeList = collaboration.nodes.filter((n) => used.has(n));
    return layoutGraph(
      nodeList,
      filteredEdges,
      (id) => nameById.get(id) ?? id
    );
  }, [mode, minWeight, coChange, collaboration, nameById]);

  const onNodeClick: NodeMouseHandler = useCallback((_e, node) => {
    setSelected(String(node.id));
  }, []);

  const detail =
    mode === "cochange"
      ? selected
      : selected
        ? nameById.get(selected) ?? selected
        : null;

  const related =
    selected &&
    (mode === "cochange" ? coChange.edges : collaboration.edges)
      .filter((e) => e.source === selected || e.target === selected)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 12);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ButtonToggle
          active={mode === "cochange"}
          onClick={() => {
            setMode("cochange");
            setSelected(null);
          }}
        >
          Co-change
        </ButtonToggle>
        <ButtonToggle
          active={mode === "collab"}
          onClick={() => {
            setMode("collab");
            setSelected(null);
          }}
        >
          Collaboration
        </ButtonToggle>
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          Min weight
          <input
            type="number"
            min={1}
            max={50}
            value={minWeight}
            onChange={(e) => setMinWeight(Number(e.target.value) || 1)}
            className="h-8 w-16 rounded-md border border-input bg-background px-2"
          />
        </label>
        <Badge variant="secondary">
          {nodes.length} nodes · {edges.length} edges
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="h-[480px] overflow-hidden rounded-xl border border-border bg-card">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodeClick={onNodeClick}
            fitView
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={18} size={1} color="var(--border)" />
            <Controls />
            <MiniMap
              pannable
              zoomable
              style={{ background: "var(--muted)" }}
            />
          </ReactFlow>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!selected && (
              <p className="text-muted-foreground">
                Select a node to inspect relationships. Graphs are capped at
                analysis time for performance.
              </p>
            )}
            {selected && (
              <>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">
                    Selected
                  </div>
                  <div className="mt-1 break-all font-medium">{detail}</div>
                </div>
                <div>
                  <div className="mb-1 text-xs uppercase text-muted-foreground">
                    Strongest links
                  </div>
                  <ul className="space-y-1">
                    {(related || []).map((e) => {
                      const other =
                        e.source === selected ? e.target : e.source;
                      const label =
                        mode === "collab"
                          ? nameById.get(other) ?? other
                          : other;
                      return (
                        <li
                          key={`${e.source}-${e.target}`}
                          className="flex justify-between gap-2 text-xs"
                        >
                          <span className="truncate">{label}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {e.weight}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ButtonToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          : "rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent"
      }
    >
      {children}
    </button>
  );
}

function layoutGraph(
  nodeIds: string[],
  edgesIn: { source: string; target: string; weight: number }[],
  label: (id: string) => string
): { nodes: Node[]; edges: Edge[] } {
  const n = nodeIds.length || 1;
  const cols = Math.ceil(Math.sqrt(n));
  const nodes: Node[] = nodeIds.map((id, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      id,
      position: { x: col * 180, y: row * 100 },
      data: { label: label(id) },
      style: {
        fontSize: 11,
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "var(--card)",
        color: "var(--card-foreground)",
        maxWidth: 140,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      },
    };
  });
  const maxW = Math.max(1, ...edgesIn.map((e) => e.weight));
  const edges: Edge[] = edgesIn.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    label: String(e.weight),
    style: {
      stroke: "var(--primary)",
      strokeWidth: 1 + (e.weight / maxW) * 3,
      opacity: 0.7,
    },
    labelStyle: { fontSize: 10, fill: "var(--muted-foreground)" },
  }));
  return { nodes, edges };
}
