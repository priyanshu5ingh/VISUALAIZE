import React, { useRef } from 'react';

const Toolbar = ({ onImport, onExport, onClear, onAddNode }) => {
  const fileInputRef = useRef(null);

  // Handle Import JSON
  const handleImportJSON = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if file is JSON
    if (!file.name.endsWith('.json')) {
      alert('❌ Please select a .json file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        
        // Validate JSON structure
        if (!jsonData.nodes && !jsonData.edges) {
          alert('❌ Invalid JSON format. Missing nodes or edges.');
          return;
        }
        
        // Call onImport callback
        if (onImport) {
          onImport(jsonData);
        }
        alert('✅ Session restored successfully!');
        
      } catch (error) {
        alert('❌ Invalid JSON file. Please check the file format.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  // Handle Export JSON
  const handleExport = () => {
    if (onExport) {
      onExport();
    }
  };

  // Handle Clear Graph
  const handleClear = () => {
    if (onClear) {
      onClear();
    }
  };

  return (
    <div className="toolbar">
      {/* Add Node Button */}
      <button onClick={onAddNode} className="toolbar-btn">
        ➕ Add Node
      </button>

      {/* Export JSON Button */}
      <button onClick={handleExport} className="toolbar-btn">
        💾 Export JSON
      </button>

      {/* Import JSON Button */}
      <input
        type="file"
        accept=".json"
        onChange={handleImportJSON}
        style={{ display: 'none' }}
        ref={fileInputRef}
        id="import-json-input"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="toolbar-btn import-btn"
        title="Import JSON to restore session"
      >
        📂 Import JSON
      </button>

      {/* Clear Graph Button */}
      <button onClick={handleClear} className="toolbar-btn clear-btn">
        🗑️ Clear
      </button>
    </div>
  );
};

export default Toolbar;