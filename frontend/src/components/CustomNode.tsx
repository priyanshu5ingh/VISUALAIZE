import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Cpu, Database, Activity, ArrowRightCircle } from 'lucide-react';

interface CustomNodeProps {
  data: { label?: string; nodeColor?: string };
  selected?: boolean;
}

const CustomNode = ({ data, selected }: CustomNodeProps) => {
  let Icon = Activity;

  const customColor = data?.nodeColor;
  const colorMap: Record<string, { border: string; glow: string; bg: string }> = {
    emerald: { border: 'border-emerald-400/50', glow: 'shadow-emerald-500/50', bg: 'bg-emerald-500/10' },
    purple: { border: 'border-purple-400/50', glow: 'shadow-purple-500/50', bg: 'bg-purple-500/10' },
    amber: { border: 'border-amber-400/50', glow: 'shadow-amber-500/50', bg: 'bg-amber-500/10' },
    rose: { border: 'border-rose-400/50', glow: 'shadow-rose-500/50', bg: 'bg-rose-500/10' },
    cyan: { border: 'border-cyan-400/50', glow: 'shadow-cyan-500/50', bg: 'bg-cyan-500/10' },
  };

  let glowColor = customColor && colorMap[customColor] ? colorMap[customColor].glow : "shadow-blue-500/50";
  let borderColor = customColor && colorMap[customColor] ? colorMap[customColor].border : "border-blue-400/30";
  let nodeBg = customColor && colorMap[customColor] ? colorMap[customColor].bg : '';

  const label = (data?.label || "").toLowerCase();
  
  if (label.includes('start')) {
    Icon = ArrowRightCircle;
    if (!customColor) {
      glowColor = "shadow-emerald-500/50";
      borderColor = "border-emerald-400/50";
    }
  } else if (label.includes('end') || label.includes('accept') || label.includes('final')) {
    Icon = Database;
    if (!customColor) {
      glowColor = "shadow-purple-500/50";
      borderColor = "border-purple-400/50";
    }
  }

  return (
    <div 
      className={`
        relative min-w-[160px] px-4 py-3 rounded-xl 
        backdrop-blur-2xl transition-all duration-300
        border hover:border-white/50
        ${selected 
          ? `bg-slate-950/90 border-white ${glowColor} shadow-[0_8px_32px_rgba(0,0,0,0.5)] scale-105` 
          : `bg-slate-900/60 ${borderColor} ${nodeBg} hover:bg-slate-800/80 hover:shadow-lg hover:-translate-y-0.5`
        }
      `}
    >
      {/* Input Connector (Top) */}
      <Handle 
        type="target" 
        position={Position.Top} 
        aria-label="Input connection"
        className="!w-3 !h-3 !bg-slate-200 !border-2 !border-slate-900 shadow-[0_0_10px_white]" 
      />

      {/* The Node Content */}
      <div className="flex items-center gap-3">
        {/* Glowing Icon Container */}
        <div
          aria-hidden="true"
          className={`p-2 rounded-lg bg-white/5 border border-white/10 ${selected ? 'text-white' : 'text-slate-300'}`}
        >
          <Icon size={18} strokeWidth={1.5} />
        </div>
        
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">State</span>
          <span className={`text-sm font-semibold tracking-wide ${selected ? 'text-white' : 'text-slate-100'}`}>
            {data?.label || "Unknown Node"}
          </span>
        </div>
      </div>

      {/* Output Connector (Bottom) */}
      <Handle 
        type="source" 
        position={Position.Right} 
        aria-label="Output connection"
        className="!w-3 !h-3 !bg-slate-200 !border-2 !border-slate-900 shadow-[0_0_10px_white]" 
      />
      
      {/* Cyberpunk "Scanline" decoration at the bottom */}
      <div className={`absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent ${selected ? 'via-white' : 'via-slate-600'} to-transparent opacity-50`} />
    </div>
  );
};

export default memo(CustomNode);