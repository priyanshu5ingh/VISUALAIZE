'use client';
import InteractiveCard from "../../src/components/InteractiveCard";
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Cpu, Globe, Mic, Code, Zap, Shield, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import ProductDemo from "../../src/components/ProductDemo";

// --- ANIMATION WRAPPER ---
const ScrollReveal = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, delay, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* --- NAVIGATION --- */}
      <nav className="fixed top-0 w-full z-50 p-6 flex justify-between items-center backdrop-blur-md bg-slate-950/50 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-mono text-sm tracking-wider">BACK TO TERMINAL</span>
        </Link>
        <div className="text-xl font-black tracking-tighter">VISUAL<span className="text-blue-500">AI</span>ZE</div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-48 pb-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full opacity-50 pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Powered by Gemini 2.5
            </div>
            <h1 className="text-7xl md:text-8xl font-black text-white mb-8 tracking-tight leading-tight">
              Logic at the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Speed of Thought.</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
              Stop drawing boxes manually. VisualAIze turns natural language into complex architecture, runnable code, and interactive diagrams instantly.
            </p>
          </motion.div>
        </div>
      </section>

      {/* --- FEATURE GRID (UPDATED) --- */}
      <section className="py-32 px-6 border-t border-white/5 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {[
              { 
                icon: Mic, 
                title: "Voice Command", 
                desc: "Speak naturally. 'Create a Neural Net with 5 layers.' The engine understands context and intent instantly." 
              },
              { 
                icon: Code, 
                title: "Polyglot Engine", 
                desc: "Generate implementation code in Python, C++, Java, or JavaScript automatically from your diagrams." 
              },
              { 
                icon: Cpu, 
                title: "AI Tutor", 
                desc: "Don't just see the graph. Chat with it. Ask questions about specific nodes, logic flows, and optimization." 
              },
            ].map((feature, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                 {/* Replaced static div with InteractiveCard */}
                 <InteractiveCard 
                    icon={feature.icon}
                    title={feature.title}
                    desc={feature.desc}
                 />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* --- DEEP DIVE SECTION --- */}
      <section className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1">
              <ScrollReveal>
                <h2 className="text-5xl font-bold text-white mb-6">Built for <span className="text-blue-500">Builders.</span></h2>
                <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                  Whether you are a student learning automata theory or an architect designing cloud infrastructure, VisualAIze eliminates the friction between "Thinking" and "Seeing".
                </p>
                <ul className="space-y-4 mb-8">
                  {['Instant Visualization', 'Export to High-Res PNG', 'Dark Mode Optimized', 'Real-time Latency < 50ms'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300">
                      <Zap size={18} className="text-yellow-400" /> {item}
                    </li>
                  ))}
                </ul>
              </ScrollReveal>
            </div>
            
            {/* --- VIDEO DEMO SECTION --- */}
            <div className="flex-1 relative">
              <ScrollReveal delay={0.3}>
                <div className="relative z-10 rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-blue-900/20 bg-slate-900">
                   
                   {/* ADDED PRODUCT DEMO COMPONENT HERE */}
                   <ProductDemo />

                </div>
                {/* Decoration Glow */}
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-600 opacity-20 blur-xl -z-10" />
              </ScrollReveal>
            </div>
            
          </div>
        </div>
      </section>

      {/* --- CTA FOOTER --- */}
      <section className="py-32 px-6 text-center border-t border-white/5 bg-gradient-to-b from-slate-950 to-slate-900">
        <ScrollReveal>
          <h2 className="text-4xl font-bold text-white mb-8">Ready to visualize the future?</h2>
          <Link href="/">
            <button className="px-10 py-4 bg-white text-slate-950 font-bold rounded-full text-lg hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.3)]">
              Launch Studio
            </button>
          </Link>
        </ScrollReveal>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-8 text-center text-slate-600 text-sm border-t border-white/5 font-mono">
        BUILT WITH GEMINI 2.5 • NEXT.JS • REACT FLOW • THREE.JS
      </footer>
    </div>
  );
}