export default function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      
      {/* Glass container */}
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-white/10 border border-white/20 shadow-2xl">
        
        {/* Spinner */}
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 rounded-full border-4 border-t-transparent border-white animate-spin"></div>
        </div>

        {/* Text */}
        <p className="mt-6 text-white text-lg font-medium tracking-wide">
          Neuro-Symbolic Engine Processing...
        </p>

        {/* Sub text */}
        <p className="mt-2 text-gray-300 text-sm animate-pulse">
          Generating optimal graph structure using Gemini AI
        </p>

      </div>
    </div>
  );
}