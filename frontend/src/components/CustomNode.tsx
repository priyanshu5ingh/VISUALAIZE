import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Cpu, Database, Activity, ArrowRightCircle, Plus, Minus } from 'lucide-react';

interface CustomNodeProps {
  data: { label?: string; _diffStatus?: 'added' | 'removed' | 'unchanged' };
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

  const diffStatus = data?._diffStatus;
  const isDiff = diffStatus === 'added' || diffStatus === 'removed';
  let diffBadgeIcon = null;
  let diffGlow = '';
  let diffBorderColor = '';
  if (diffStatus === 'added') {
    diffBadgeIcon = <Plus size={10} strokeWidth={3} />;
    diffGlow = 'shadow-emerald-500/40';
    diffBorderColor = 'border-emerald-400/60';
  } else if (diffStatus === 'removed') {
    diffBadgeIcon = <Minus size={10} strokeWidth={3} />;
    diffGlow = 'shadow-red-500/40';
    diffBorderColor = 'border-red-400/60';
  }

  return (
    <div 
      className={`
        relative min-w-[160px] px-4 py-3 rounded-xl 
        backdrop-blur-2xl transition-all duration-300
        border hover:border-white/50
        ${diffStatus === 'added' ? 'bg-emerald-950/40' : diffStatus === 'removed' ? 'bg-red-950/40' : ''}
        ${selected 
          ? `bg-slate-950/90 border-white ${glowColor} shadow-[0_8px_32px_rgba(0,0,0,0.5)] scale-105` 
          : isDiff ? `bg-slate-900/60 ${diffBorderColor} ${diffGlow}` : `bg-slate-900/60 ${borderColor} hover:bg-slate-800/80 hover:shadow-lg hover:-translate-y-0.5`
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
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
            {diffStatus === 'added' ? 'Added' : diffStatus === 'removed' ? 'Removed' : 'State'}
          </span>
          <span className={`text-sm font-semibold tracking-wide ${selected ? 'text-white' : 'text-slate-100'}`}>
            {data?.label || "Unknown Node"}
          </span>
        </div>
      </div>

      {isDiff && (
        <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black shadow-lg ${
          diffStatus === 'added' ? 'bg-emerald-400' : 'bg-red-400'
        }`}>
          {diffBadgeIcon}
        </div>
      )}

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