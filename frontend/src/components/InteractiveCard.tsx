"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface InteractiveCardProps {
  icon: LucideIcon;
  title: string;
  desc: string;
  /** Optional click handler. When provided, the card exposes button semantics
   *  to assistive technologies and becomes keyboard-activatable via Enter/Space.
   *  When omitted the card renders as a presentational element (no role/tabIndex). */
  onClick?: () => void;
}

const InteractiveCard = ({ icon: Icon, title, desc, onClick }: InteractiveCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  // Only expose interactive semantics when there is a meaningful action to trigger.
  const isInteractive = !!onClick;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isInteractive) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault(); // Prevent Space from scrolling the page
      onClick?.();
    }
  };

  return (
    <motion.div
      layout
      // Conditionally apply button role/tabIndex only when truly interactive
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={handleKeyDown}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      className={`${isInteractive ? "focus-ring" : ""} relative p-8 rounded-2xl border transition-colors overflow-hidden ${
        isInteractive ? "cursor-pointer" : "cursor-default"
      } ${
        isHovered
          ? "bg-blue-900/20 border-blue-500/50" // Active Styles
          : "bg-slate-900 border-white/5"       // Idle Styles
      }`}
      initial={{ borderRadius: 16 }}
    >
      {/* Background Glow Effect */}
      {isHovered && (
        <motion.div
          layoutId="hover-glow"
          className="absolute inset-0 bg-blue-500/5 blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}

      <motion.div layout className="relative z-10 flex flex-col items-start">
        {/* ICON */}
        <motion.div
          layout
          className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors ${
            isHovered ? "bg-blue-500 text-white" : "bg-blue-500/10 text-blue-400"
          }`}
        >
          <Icon size={24} />
        </motion.div>

        {/* TITLE */}
        <motion.h3
          layout
          className={`text-2xl font-bold mb-2 transition-colors ${
            isHovered ? "text-white" : "text-slate-200"
          }`}
        >
          {title}
        </motion.h3>

        {/* HIDDEN DESCRIPTION (Reveals on Hover / Focus) */}
        <AnimatePresence>
          {isHovered && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-slate-300 leading-relaxed overflow-hidden"
            >
              {desc}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default InteractiveCard;