"use client";

import { useState } from "react";

const ProductDemo = () => {
  const [sliderPosition, setSliderPosition] = useState(50);

  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a] shadow-2xl">

      <img
        src="/assets/before.jpg"
        alt="Before"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          width: `${sliderPosition}%`,
        }}
      >
        <img
          src="/assets/after.jpg"
          alt="After"
          className="absolute inset-0 h-full w-full object-cover max-w-none"
        />
      </div>

      <div
        className="absolute top-0 bottom-0 z-20 w-1 bg-white"
        style={{
          left: `${sliderPosition}%`,
        }}
      >
        <div className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-black/70 text-white shadow-lg">
          ↔
        </div>
      </div>

      <input
        type="range"
        aria-label="Before and after image comparison slider"
        min="0"
        max="100"
        value={sliderPosition}
        onChange={(e) =>
          setSliderPosition(Number(e.target.value))
        }
       className="absolute bottom-6 left-1/2 z-30 w-2/3 -translate-x-1/2 cursor-ew-resize accent-cyan-400"
      />

      <div className="absolute left-4 top-4 z-30 rounded-md bg-black/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
        Before
      </div>

      <div className="absolute right-4 top-4 z-30 rounded-md bg-black/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
        After
      </div>

      <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1 backdrop-blur-md">
        <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />

        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
          Interactive Compare
        </span>
      </div>

      <div className="absolute -inset-1 -z-10 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 opacity-20 blur-xl" />
    </div>
  );
};

export default ProductDemo;