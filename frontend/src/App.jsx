import React, { useRef } from 'react';
import Toolbar from './components/Toolbar';
import Graph, { restoreGraph, exportGraph, clearGraph, addNode } from './components/Graph';
import './styles/graph.css';

function App() {
  const graphRef = useRef();

  const handleImport = (data) => {
    restoreGraph(data);
  };

  const handleExport = () => {
    const data = exportGraph();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'graph-session.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (window.confirm('Clear all nodes and edges?')) {
      clearGraph();
    }
  };

  const handleAddNode = () => {
    addNode({
      label: `Node ${Math.floor(Math.random() * 100)}`,
      type: 'default'
    });
  };

  return (
    <div className="app">
      <Toolbar
        onImport={handleImport}
        onExport={handleExport}
        onClear={handleClear}
        onAddNode={handleAddNode}
      />
      <Graph ref={graphRef} />
    </div>
  );
}

export default App;