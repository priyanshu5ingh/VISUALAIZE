import React, { useState, useCallback } from 'react';

const Graph = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [viewState, setViewState] = useState({ zoom: 1, x: 0, y: 0 });

  // Add new node
  const addNode = useCallback((node) => {
    setNodes(prev => [...prev, { 
      id: node.id || Date.now(), 
      label: node.label || `Node ${nodes.length + 1}`,
      type: node.type || 'default',
      x: node.x || 100 + Math.random() * 200,
      y: node.y || 100 + Math.random() * 200,
      ...node 
    }]);
  }, [nodes.length]);

  // Remove node
  const removeNode = useCallback((nodeId) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    setEdges(prev => prev.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
  }, []);

  // Add edge
  const addEdge = useCallback((edge) => {
    setEdges(prev => [...prev, { 
      id: edge.id || Date.now(), 
      source: edge.source, 
      target: edge.target,
      label: edge.label || '',
      ...edge 
    }]);
  }, []);

  // Remove edge
  const removeEdge = useCallback((edgeId) => {
    setEdges(prev => prev.filter(edge => edge.id !== edgeId));
  }, []);

  // Clear graph
  const clearGraph = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, []);

  // Restore graph from data
  const restoreGraph = useCallback((data) => {
    // Clear current graph
    clearGraph();
    
    // Restore nodes
    if (data.nodes && Array.isArray(data.nodes)) {
      setNodes(data.nodes);
    }
    
    // Restore edges
    if (data.edges && Array.isArray(data.edges)) {
      setEdges(data.edges);
    }
    
    // Restore view state
    if (data.viewState) {
      setViewState(data.viewState);
    }
  }, [clearGraph]);

  // Export graph data
  const exportGraph = useCallback(() => {
    return {
      nodes,
      edges,
      viewState,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  }, [nodes, edges, viewState]);

  return (
    <div className="graph-container">
      {/* Render nodes */}
      <div className="graph-nodes">
        {nodes.map(node => (
          <div 
            key={node.id}
            className="graph-node"
            style={{ 
              position: 'absolute',
              left: node.x,
              top: node.y,
              padding: '10px 16px',
              background: node.type === 'start' ? '#4CAF50' : '#2196F3',
              color: 'white',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              userSelect: 'none'
            }}
            onClick={() => console.log('Node clicked:', node)}
            onDoubleClick={() => removeNode(node.id)}
          >
            {node.label}
            <span style={{ fontSize: '10px', marginLeft: '8px', opacity: 0.7 }}>
              ({node.id})
            </span>
          </div>
        ))}
      </div>

      {/* Render edges (simplified) */}
      <div className="graph-edges" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {edges.map(edge => {
          const sourceNode = nodes.find(n => n.id === edge.source);
          const targetNode = nodes.find(n => n.id === edge.target);
          
          if (!sourceNode || !targetNode) return null;
          
          return (
            <svg key={edge.id} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
              <line
                x1={sourceNode.x + 40}
                y1={sourceNode.y + 20}
                x2={targetNode.x + 40}
                y2={targetNode.y + 20}
                stroke="#666"
                strokeWidth="2"
                strokeDasharray={edge.type === 'dashed' ? '5,5' : ''}
              />
              {edge.label && (
                <text
                  x={(sourceNode.x + targetNode.x) / 2 + 40}
                  y={(sourceNode.y + targetNode.y) / 2 + 20}
                  fill="#666"
                  fontSize="12"
                  textAnchor="middle"
                >
                  {edge.label}
                </text>
              )}
            </svg>
          );
        })}
      </div>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#999'
        }}>
          <h3>📊 No Graph Data</h3>
          <p>Add nodes or import a JSON file to get started</p>
        </div>
      )}

      {/* Node count */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        background: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        fontSize: '12px',
        color: '#666'
      }}>
        {nodes.length} nodes • {edges.length} edges
      </div>
    </div>
  );
};

// Export functions and component
export { Graph, addNode, removeNode, addEdge, removeEdge, clearGraph, restoreGraph, exportGraph };
export default Graph;