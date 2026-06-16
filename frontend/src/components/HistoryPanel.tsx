// frontend/src/components/HistoryPanel.tsx

import React from 'react';
import { History, X, Trash2, Clock } from 'lucide-react';
import { SavedDiagram } from '../utils/storage';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: SavedDiagram[];
  onLoad: (diagram: SavedDiagram) => void;
  onDelete: (id: string) => void;
}

export default function HistoryPanel({ isOpen, onClose, history, onLoad, onDelete }: HistoryPanelProps) {
  return (
    <div
      className={`absolute top-0 left-0 h-full border-r border-white/10 bg-slate-950/95 backdrop-blur-3xl shadow-2xl z-40 transition-all duration-500 ease-in-out flex flex-col`}
      style={{
        width: isOpen ? '350px' : '0px',
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      }}
    >
      {isOpen && (
        <>
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-900/50">
            <div className="flex items-center gap-2 text-white font-bold tracking-wider">
              <History size={18} className="text-blue-400" />
              HISTORY
            </div>
            <button
              onClick={onClose} aria-label="Close history panel"
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {history.length === 0 ? (
              <div className="text-center text-slate-500 mt-10 text-xs">
                No saved diagrams yet.
              </div>
            ) : (
              history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="group relative p-4 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-slate-800/80 transition-all cursor-pointer w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  onClick={() => onLoad(item)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-bold text-white line-clamp-1 pr-6">
                      {item.data.title || "Untitled"}
                    </h4>
                    
                    {/* Delete Button - Only visible on hover */}
                    <button
                      type="button"
                      aria-label="Delete saved diagram"
                      onClick={(e) => {
                        e.stopPropagation(); // Don't trigger the load event
                        onDelete(item.id);
                      }}
                      className="absolute top-4 right-4 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                    "{item.prompt}"
                  </p>
                  
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                    <Clock size={10} />
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}