// frontend/src/components/MyDiagramsPanel.tsx
// Issue #292: Sidebar panel listing saved diagrams

import { useState } from "react";
import {
  listDiagrams,
  deleteDiagram,
  clearAllDiagrams,
  truncatePrompt,
  formatTimestamp,
  type SavedDiagram,
} from "../utils/diagramStorage";

interface MyDiagramsPanelProps {
  /** Called when user clicks a saved diagram to restore it */
  onLoadDiagram: (diagram: SavedDiagram) => void;
  /** Refresh trigger — increment this after saving to re-render the list */
  refreshKey: number;
}

export function MyDiagramsPanel({
  onLoadDiagram,
  refreshKey,
}: MyDiagramsPanelProps) {
  // Load diagrams from localStorage
  const diagrams = listDiagrams();
  const [confirmClear, setConfirmClear] = useState(false);

  if (diagrams.length === 0) {
    return (
      <div className="my-diagrams-panel my-diagrams-panel--empty">
        <p>No saved diagrams yet.</p>
        <p className="text-muted">Click "Save" after generating a diagram.</p>
      </div>
    );
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Don't trigger onLoadDiagram
    deleteDiagram(id);
    // Force re-render by calling onLoadDiagram with undefined signals refresh
    // In practice, the parent should increment refreshKey after deletion too
    window.dispatchEvent(new Event("visualaize:storage-change"));
  };

  const handleClearAll = () => {
    if (confirmClear) {
      clearAllDiagrams();
      setConfirmClear(false);
      window.dispatchEvent(new Event("visualaize:storage-change"));
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  return (
    <div className="my-diagrams-panel">
      {/* Header */}
      <div className="my-diagrams-panel__header">
        <h3>💾 My Diagrams ({diagrams.length})</h3>
        <button
          className="my-diagrams-panel__clear-btn"
          onClick={handleClearAll}
          title="Clear all saved diagrams"
        >
          {confirmClear ? "⚠️ Confirm Clear" : "Clear All"}
        </button>
      </div>

      {/* Diagram list */}
      <ul className="my-diagrams-panel__list">
        {diagrams.map((diagram) => (
          <li
            key={diagram.id}
            className="my-diagrams-panel__item"
            onClick={() => onLoadDiagram(diagram)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") onLoadDiagram(diagram);
            }}
          >
            <div className="my-diagrams-panel__item-title">
              {truncatePrompt(diagram.prompt)}
            </div>
            <div className="my-diagrams-panel__item-meta">
              <span>{formatTimestamp(diagram.createdAt)}</span>
              <span>
                {diagram.nodes.length}N · {diagram.edges.length}E
              </span>
            </div>
            {/* Delete button */}
            <button
              className="my-diagrams-panel__delete-btn"
              onClick={(e) => handleDelete(e, diagram.id)}
              title="Delete this diagram"
              aria-label={`Delete: ${truncatePrompt(diagram.prompt)}`}
            >
              🗑
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}