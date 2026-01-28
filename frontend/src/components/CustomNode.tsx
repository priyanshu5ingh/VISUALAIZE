import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Cpu, Database, Activity, ArrowRightCircle } from 'lucide-react';

const CustomNode = ({ data, selected }: any) => {
  // 1. Auto-detect the icon based on the text label
  let Icon = Activity;
  let glowColor = "shadow-blue-500/50";
  let borderColor = "border-blue-400/30";

  const label = data.label.toLowerCase();
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
        backdrop-blur-xl transition-all duration-300
        border hover:border-white/40
        ${selected 
          ? `bg-slate-900/80 border-white ${glowColor} shadow-[0_0_30px_rgba(0,0,0,0.5)] scale-105` 
          : `bg-slate-900/40 ${borderColor} hover:bg-slate-800/60`
        }
      `}
    >
      {/* Input Connector (Left) */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-3 !h-3 !bg-slate-200 !border-2 !border-slate-900 shadow-[0_0_10px_white]" 
      />

      {/* The Node Content */}
      <div className="flex items-center gap-3">
        {/* Glowing Icon Container */}
        <div className={`p-2 rounded-lg bg-white/5 border border-white/10 ${selected ? 'text-white' : 'text-slate-400'}`}>
          <Icon size={18} strokeWidth={1.5} />
        </div>
        
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">State</span>
          <span className={`text-sm font-semibold tracking-wide ${selected ? 'text-white' : 'text-slate-200'}`}>
            {data.label}
          </span>
        </div>
      </div>

      {/* Output Connector (Right) */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-3 !h-3 !bg-slate-200 !border-2 !border-slate-900 shadow-[0_0_10px_white]" 
      />
      
      {/* Cyberpunk "Scanline" decoration at the bottom */}
      <div className={`absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent ${selected ? 'via-white' : 'via-slate-600'} to-transparent opacity-50`} />
    </div>
  );
};

export default memo(CustomNode);