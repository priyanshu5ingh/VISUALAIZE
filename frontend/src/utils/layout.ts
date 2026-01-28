// frontend/src/utils/layout.ts
import dagre from 'dagre';
import { Node, Edge, Position } from 'reactflow';

// We increase these values to prevent overlap
const PAGE_WIDTH = 250; 
const PAGE_HEIGHT = 80;

export const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ 
    rankdir: 'LR',    // Left-to-Right layout
    ranksep: 150,     // INCREASED: Horizontal gap between nodes (was too small)
    nodesep: 80       // INCREASED: Vertical gap between parallel nodes
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: PAGE_WIDTH, height: PAGE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    return {
      ...node,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      position: {
        x: nodeWithPosition.x - PAGE_WIDTH / 2,
        y: nodeWithPosition.y - PAGE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};