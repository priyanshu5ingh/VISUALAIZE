// frontend/src/utils/layout.ts
import dagre from 'dagre';
import { Node, Edge, Position, MarkerType } from 'reactflow';

const getNodeWidth = (label: string): number => {
  const len = label.length;
  if (len > 30) return 300;
  if (len > 20) return 260;
  return 220;
};
const PAGE_HEIGHT = 80;

export const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const complexity = Math.max(1, (nodeCount + edgeCount) / 10);

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const rankSep = Math.round(180 + complexity * 30);
  const nodeSep = Math.round(120 + complexity * 20);
  const edgeSep = Math.round(40 + complexity * 10);

  dagreGraph.setGraph({
    rankdir: 'TB',
    nodesep: nodeSep,
    ranksep: rankSep,
    edgesep: edgeSep,
    ranker: 'network-simplex',
    acyclicer: 'greedy',
  });

  nodes.forEach((node) => {
    const w = getNodeWidth((node.data?.label as string) || '');
    dagreGraph.setNode(node.id, { width: w, height: PAGE_HEIGHT });
  });

  const getLayer = (label: string): number => {
    const lower = label.toLowerCase();
    if (lower.match(/client|admin|user|web|frontend|app|browser|ui|dashboard/)) return 0;
    if (lower.match(/gateway|proxy|balancer|nginx|api|lb/)) return 1;
    if (lower.match(/db|database|redis|cache|queue|kafka|mongo|postgres|sql|storage|bucket/)) return 3;
    return 2;
  };

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target, { weight: 1 });
  });

  dagre.layout(dagreGraph);

  const layers: Record<number, { node: Node; dagreX: number }[]> = { 0: [], 1: [], 2: [], 3: [] };

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const layerIdx = getLayer((node.data?.label as string) || '');
    layers[layerIdx].push({
      node: {
        ...node,
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
        position: { x: nodeWithPosition.x, y: 0 },
      },
      dagreX: nodeWithPosition.x,
    });
  });

  const layoutedNodes: Node[] = [];
  const LAYER_SPACING_Y = rankSep + 40;

  let activeRowIndex = 0;
  Object.keys(layers).forEach((key) => {
    const layerIndex = parseInt(key);
    const layerEntries = layers[layerIndex];
    if (layerEntries.length === 0) return;

    layerEntries.sort((a, b) => a.dagreX - b.dagreX);

    const nodeWidths = layerEntries.map(e => getNodeWidth((e.node.data?.label as string) || ''));
    const totalWidth = nodeWidths.reduce((s, w) => s + w, 0) + (layerEntries.length - 1) * nodeSep;
    let currentX = -(totalWidth / 2) + nodeWidths[0] / 2;

    layerEntries.forEach((entry, i) => {
      const w = nodeWidths[i];
      layoutedNodes.push({
        ...entry.node,
        position: {
          x: currentX,
          y: activeRowIndex * LAYER_SPACING_Y,
        }
      });
      currentX += w + nodeSep;
    });
    activeRowIndex++;
  });

  // Build edge routing paths from dagre's edge points
  const layoutedEdges: Edge[] = edges.map((edge, i) => {
    const edgePoints: { x: number; y: number }[] = [];
    try {
      const dagreEdge = dagreGraph.edge(edge.source, edge.target);
      if (dagreEdge?.points && dagreEdge.points.length > 1) {
        const srcNode = dagreGraph.node(edge.source);
        const tgtNode = dagreGraph.node(edge.target);
        const srcPos = layoutedNodes.find(n => n.id === edge.source)?.position || { x: 0, y: 0 };
        const tgtPos = layoutedNodes.find(n => n.id === edge.target)?.position || { x: 0, y: 0 };

        dagreEdge.points.forEach((p: { x: number; y: number }) => {
          edgePoints.push({
            x: p.x - (srcNode?.x || 0) + srcPos.x,
            y: p.y - (srcNode?.y || 0) + srcPos.y,
          });
        });
      }
    } catch {
      // dagre may throw for edges with missing nodes — fall through
    }

    return {
      ...edge,
      id: edge.id || `e-${i}`,
      type: 'smoothstep',
      markerEnd: edge.markerEnd || {
        type: MarkerType.ArrowClosed,
        color: 'rgba(59, 130, 246, 0.7)',
        width: 12,
        height: 12,
      },
      style: edge.style || {
        stroke: 'rgba(59, 130, 246, 0.4)',
        strokeWidth: 1.5,
      },
      labelStyle: edge.labelStyle || {
        fill: '#93c5fd',
        fontWeight: 600,
        fontSize: 10,
        letterSpacing: '0.5px',
      },
      labelBgPadding: [8, 4] as [number, number],
      labelBgBorderRadius: 6,
      labelBgStyle: {
        fill: 'rgba(15, 23, 42, 0.9)',
        stroke: 'rgba(59, 130, 246, 0.2)',
        strokeWidth: 1,
      },
    };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
};