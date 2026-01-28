import React from "react";

const ProductDemo = () => {
  return (
    <div className="relative w-full aspect-video bg-[#0a0a0a] rounded-xl overflow-hidden border border-white/10 shadow-2xl group">
      {/* 1. The Video Player */}
      <video
        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
        autoPlay
        muted
        loop
        playsInline
      >
        {/* Make sure the file name matches exactly what you saved */}
        <source src="/assets/demo-video.mp4" type="video/mp4" />
      </video>

      {/* 2. Overlay: Top Bar Decoration */}
      <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-black/80 to-transparent flex items-center px-4 gap-2">
        <div className="w-2 h-2 rounded-full bg-red-500/50" />
        <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
        <div className="w-2 h-2 rounded-full bg-green-500/50" />
      </div>

      {/* 3. Overlay: "Live Preview" Badge */}
      <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[10px] font-bold tracking-widest text-white/80 uppercase">
          Live Demo
        </span>
      </div>
      
      {/* 4. Glow Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000 -z-10"></div>
    </div>
  );
};

export default ProductDemo;