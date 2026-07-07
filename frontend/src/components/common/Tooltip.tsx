import { ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip = ({ children, text, position = 'top' }: TooltipProps) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-block group">
      {children}
      <div className={`
        absolute ${positionClasses[position]}
        px-2 py-1 text-xs text-white bg-gray-800 rounded
        opacity-0 pointer-events-none transition-opacity duration-200
        group-hover:opacity-100 group-hover:pointer-events-auto
        whitespace-nowrap z-50 shadow-lg
      `}>
        {text}
      </div>
    </div>
  );
};

export default Tooltip;
