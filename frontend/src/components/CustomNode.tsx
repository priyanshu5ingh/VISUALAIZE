import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Cpu, Database, Activity, ArrowRightCircle, FolderOpen } from 'lucide-react';

interface CustomNodeProps {
  data: { label?: string; hasSubgraph?: boolean };
  selected?: boolean;
}

const CustomNode = ({ data, selected }: CustomNodeProps) => {
  let Icon = Activity;
  let glowColor = "shadow-blue-500/50";
  let borderColor = "border-blue-400/30";

  const label = (data?.label || "").toLowerCase();
  
  if (label.includes('start')) {
    Icon = ArrowRightCircle;
    glowColor = "shadow-emerald-500/50";
    borderColor = "border-emerald-400/50";
  } else if (label.includes('end') || label.includes('accept') || label.includes('final')) {
    Icon = Database;
    glowColor = "shadow-purple-500/50";
    borderColor = "border-purple-400/50";
  }

  return (
    <div 
      className={`
        relative min-w-[160px] px-4 py-3 rounded-xl 
        backdrop-blur-2xl transition-all duration-300
        border hover:border-white/50
        ${data?.hasSubgraph ? 'border-dashed border-amber-500/40' : ''}
        ${selected 
          ? `bg-slate-950/90 border-white ${glowColor} shadow-[0_8px_32px_rgba(0,0,0,0.5)] scale-105` 
          : `bg-slate-900/60 ${borderColor} hover:bg-slate-800/80 hover:shadow-lg hover:-translate-y-0.5`
        }
      `}
      onDoubleClick={data?.hasSubgraph ? (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('expand-subgraph', { detail: data?.label })); } : undefined}
      style={data?.hasSubgraph ? { cursor: 'pointer' } : undefined}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        aria-label="Input connection"
        className="!w-3 !h-3 !bg-slate-200 !border-2 !border-slate-900 shadow-[0_0_10px_white]" 
      />

      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className={`p-2 rounded-lg bg-white/5 border border-white/10 ${selected ? 'text-white' : 'text-slate-300'}`}
        >
          {data?.hasSubgraph ? <FolderOpen size={18} strokeWidth={1.5} className="text-amber-400" /> : <Icon size={18} strokeWidth={1.5} />}
        </div>
        
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
            {data?.hasSubgraph ? 'Sub-Graph' : 'State'}
          </span>
          <span className={`text-sm font-semibold tracking-wide ${selected ? 'text-white' : 'text-slate-100'}`}>
            {data?.label || "Unknown Node"}
          </span>
        </div>
      </div>

      {data?.hasSubgraph && (
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-[10px] font-bold text-black shadow-lg">
          +
        </div>
      )}

      <Handle 
        type="source" 
        position={Position.Right} 
        aria-label="Output connection"
        className="!w-3 !h-3 !bg-slate-200 !border-2 !border-slate-900 shadow-[0_0_10px_white]" 
      />
      
      <div className={`absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent ${selected ? 'via-white' : 'via-slate-600'} to-transparent opacity-50`} />
    </div>
  );
};

export default memo(CustomNode);