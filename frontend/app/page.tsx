'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link'; // <--- IMPORT LINK
import Hero3D from '../src/components/Hero3D';
import GraphEditor from '../src/components/GraphEditor';
import { ArrowRight, Cpu, Share2, Zap } from 'lucide-react';

export default function LandingPage() {
  const [appState, setAppState] = useState<'LANDING' | 'TRANSITION' | 'APP'>('LANDING');

  const handleLaunch = () => {
    setAppState('TRANSITION');
    
    // Wait 1.5s for the "Warp Speed" animation to finish, then show App
    setTimeout(() => {
      setAppState('APP');
    }, 1500);
  };

  if (appState === 'APP') {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 1 }}
      >
        {/* Pass a function to go back to Landing */}
        <GraphEditor onBack={() => setAppState('LANDING')} />
      </motion.div>
    );
  }

  return (
    <main
      className="relative w-full h-screen overflow-hidden text-white font-sans bg-slate-950"
      aria-label="VisualAIze landing page"
    >
      
      {/* 1. 3D Background (Controlled by state) */}
      <Hero3D isZooming={appState === 'TRANSITION'} />

      {/* 2. Glass Overlay Content */}
      <AnimatePresence>
        {appState === 'LANDING' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
            
            {/* Main Content Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ 
                opacity: 0, 
                scale: 2, // Text flies AT the camera
                filter: "blur(20px)", 
                transition: { duration: 0.8, ease: "easeInOut" } 
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-center z-20 pointer-events-auto"
            >
              {/* Badge */}
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-indigo-200 uppercase bg-indigo-500/10 rounded-full border border-indigo-500/30 backdrop-blur-md shadow-[0_0_25px_rgba(99,102,241,0.4)]"
              >
                Gemini 2.5 Neural Engine
              </motion.div>
              
              {/* Title */}
              <h1 className="text-8xl font-black tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-br from-white via-indigo-200 to-fuchsia-500 drop-shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                VisualAIze
              </h1>
              
              {/* Subtitle */}
              <p className="max-w-2xl mx-auto text-xl text-slate-300 mb-12 leading-relaxed font-light">
                Visualize logic at the speed of thought. <br/>
                <span className="text-indigo-400 font-medium">No drag. No drop. Just dream.</span>
              </p>

              {/* BUTTON GROUP */}
              <div className="flex items-center justify-center gap-6">
                  
                  {/* EXISTING LAUNCH BUTTON (Primary) */}
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(168, 85, 247, 0.6)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLaunch}
                    aria-label="Enter the VisualAIze studio"
                    className="focus-ring group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white font-bold rounded-full text-lg shadow-[0_0_40px_-10px_rgba(168,85,247,0.5)] border border-white/10 hover:from-indigo-500 hover:to-fuchsia-500 transition-all flex items-center gap-3 overflow-hidden"
                  >
                    <span className="relative z-10">Enter Studio</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  </motion.button>

                  {/* NEW "ABOUT" BUTTON (Secondary) */}
                  <Link href="/about">
                    <motion.button
                      whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                      whileTap={{ scale: 0.95 }}
                      className="focus-ring px-8 py-4 bg-transparent border border-white/20 text-white font-semibold rounded-full text-lg hover:border-white/50 transition-all flex items-center gap-2 backdrop-blur-sm"
                    >
                      <span className="relative z-10">Learn More</span>
                    </motion.button>
                  </Link>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Feature Icons (Bottom) - Only show in Landing */}
      <AnimatePresence>
        {appState === 'LANDING' && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100, transition: { duration: 0.5 } }}
            transition={{ delay: 0.5, duration: 1 }}
            className="absolute bottom-4 w-full px-10 z-20 flex justify-center gap-16 text-slate-400 pointer-events-none"
          >
            <div className="flex flex-col items-center gap-2 group pointer-events-auto">
              <div className="p-3 rounded-full bg-slate-900/60 backdrop-blur-md border border-slate-700/50 group-hover:border-yellow-500/50 group-hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all">
                <Zap className="w-6 h-6 text-yellow-400" />
              </div>
              <span className="text-xs font-semibold tracking-wider uppercase">Instant</span>
            </div>
            <div className="flex flex-col items-center gap-2 group pointer-events-auto">
              <div className="p-3 rounded-full bg-slate-900/60 backdrop-blur-md border border-slate-700/50 group-hover:border-indigo-500/50 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all">
                <Cpu className="w-6 h-6 text-indigo-400" />
              </div>
              <span className="text-xs font-semibold tracking-wider uppercase">Neural</span>
            </div>
            <div className="flex flex-col items-center gap-2 group pointer-events-auto">
              <div className="p-3 rounded-full bg-slate-900/60 backdrop-blur-md border border-slate-700/50 group-hover:border-fuchsia-500/50 group-hover:shadow-[0_0_20px_rgba(217,70,239,0.3)] transition-all">
                <Share2 className="w-6 h-6 text-fuchsia-400" />
              </div>
              <span className="text-xs font-semibold tracking-wider uppercase">Export</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}