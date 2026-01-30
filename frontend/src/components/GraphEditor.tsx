// frontend/src/components/GraphEditor.tsx
'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactFlow, { 
  Background, Controls, MiniMap, applyEdgeChanges, applyNodeChanges, 
  Node, Edge, OnNodesChange, OnEdgesChange, MarkerType, useReactFlow, ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toPng } from 'html-to-image';
import { getLayoutedElements } from '../utils/layout'; 
import { 
  ArrowLeft, Box, GitBranch, Network, Share2, Terminal, 
  Activity, BookOpen, PlayCircle, Layers, Code, Copy, Check, Zap, 
  Globe, Mic, Download, ChevronDown, MessageSquare, Send, Paperclip, 
  PanelRightClose, PanelRightOpen 
} from 'lucide-react';
import CustomNode from '../components/CustomNode';
import LoadingCore from './LoadingCore'; 
import HolographicScene from './HolographicScene';

interface EditorProps { onBack: () => void; }

// --- FIXED CSS FOR GLASS BUTTONS ---
const glassControlsStyle = `
  /* Force Glass Effect on the Container */
  .react-flow__panel .react-flow__controls {
    background: rgba(15, 23, 42, 0.6) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
    overflow: hidden !important;
  }
  
  /* Force Transparent Buttons */
  .react-flow__controls-button {
    background: transparent !important;
    border: none !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
    width: 30px !important;
    height: 30px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: background 0.2s ease !important;
  }
  
  .react-flow__controls-button:last-child {
    border-bottom: none !important;
  }

  .react-flow__controls-button:hover {
    background: rgba(255, 255, 255, 0.2) !important;
  }

  /* Force SVG Color */
  .react-flow__controls-button svg {
    fill: rgba(255, 255, 255, 0.8) !important;
    max-width: 14px !important;
    max-height: 14px !important;
  }
  
  .react-flow__controls-button:hover svg {
    fill: #3b82f6 !important;
  }
`;

const SystemLogs = () => {
  const [logs, setLogs] = useState<string[]>(["> INITIALIZING VISUALAIZE CORE..."]);
  
  useEffect(() => {
    const messages = [
      "LOADING NEURAL MODULES...",
      "CONNECTING TO SATELLITE...",
      "FETCHING GLOBAL CONTEXT...",
      "OPTIMIZING RENDERING ENGINE...",
      "SYSTEM READY.",
      "AWAITING INPUT..."
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < messages.length) {
        setLogs(prev => [...prev.slice(-4), `> ${messages[i]}`]);
        i++;
      }
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute bottom-6 left-6 z-0 pointer-events-none font-mono text-[10px] text-emerald-500/60 leading-relaxed tracking-wider">
      {logs.map((log, i) => (
        <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-300">
           {log}<span className="animate-pulse">_</span>
        </div>
      ))}
    </div>
  );
};

const ZeroState = ({ onSelect }: { onSelect: (text: string) => void }) => {
  const suggestions = [
    { icon: GitBranch, label: "Binary DFA", desc: "Automaton Logic", prompt: "DFA that accepts binary strings ending in 101" },
    { icon: Network, label: "Neural Network", desc: "Architecture", prompt: "Diagram of a Transformer neural network architecture" },
    { icon: Box, label: "System Flow", desc: "Process Map", prompt: "Flowchart for a secure user authentication system" },
    { icon: Share2, label: "Mind Map", desc: "Knowledge Graph", prompt: "Mind map of the history of Space Exploration" },
  ];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
      <div className="text-center p-8 max-w-5xl w-full animate-in fade-in zoom-in duration-500">
        <div className="mb-12 relative">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full -z-10" />
             <h2 className="text-6xl font-black text-white mb-2 tracking-tighter drop-shadow-2xl">
                VISUAL<span className="text-blue-500">AI</span>ZE
             </h2>
             <p className="text-blue-200/60 font-mono text-sm tracking-[0.3em]">SYSTEM READY // AWAITING INPUT</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pointer-events-auto">
          {suggestions.map((item, i) => (
            <button key={i} onClick={() => onSelect(item.prompt)} className="group relative p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md hover:bg-blue-900/20 hover:border-blue-500/50 transition-all text-left hover:-translate-y-2 shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 mb-4 p-3 w-fit rounded-lg bg-white/5 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <item.icon size={24} />
              </div>
              <h3 className="relative z-10 text-lg font-bold text-white mb-1">{item.label}</h3>
              <p className="relative z-10 text-xs text-slate-400 uppercase tracking-wider group-hover:text-blue-300">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

function EditorContent({ onBack }: EditorProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'ANALYSIS' | 'CODE' | 'CHAT'>('ANALYSIS');
  const [copied, setCopied] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('Python');
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const reactFlowWrapper = useRef(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const { getNodes } = useReactFlow(); 

  const nodeTypes = useMemo(() => ({ default: CustomNode, input: CustomNode, output: CustomNode }), []);
  const onNodesChange: OnNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange: OnEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  const generateGraph = async (text: string) => {
    if (!text) return;
    setLoading(true);
    setPrompt(text);
    setGraphData(null);
    setActiveTab('ANALYSIS'); 
    setCodeLanguage('Python');
    setChatHistory([]);
    setIsSidebarOpen(false);

    try {
      const res = await fetch('http://127.0.0.1:8000/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: text }),
      });
      if (!res.ok) throw new Error("Backend Error");
      const data = await res.json();
      setGraphData(data);
      
      const rawNodes: Node[] = data.nodes.map((n: any) => ({
        id: n.id, type: 'default', data: { label: n.label }, position: { x: 0, y: 0 },
        style: { background: 'transparent', border: 'none', boxShadow: 'none', width: 'auto' },
      }));
      const rawEdges: Edge[] = data.edges.map((e: any, i: number) => ({
        id: `e-${i}`, source: e.source, target: e.target, label: e.label, type: 'bezier', animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' },
        style: { stroke: '#3b82f6', strokeWidth: 2, filter: 'drop-shadow(0 0 3px #3b82f6)' },
        labelStyle: { fill: '#93c5fd', fontWeight: 700 }
      }));
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setIsSidebarOpen(true); 

    } catch (err) {
      alert("System Busy. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (newLang: string) => {
    if (newLang === codeLanguage || !graphData) return;
    setCodeLanguage(newLang);
    setIsRegeneratingCode(true);
    try {
      const res = await fetch('https://visualaize-backend.onrender.com/regenerate_code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt, language: newLang }),
      });
      const data = await res.json();
      setGraphData((prev: any) => ({ ...prev, code_snippet: data.code_snippet, code_explanation: data.code_explanation }));
    } catch (err) { alert("Failed to rewrite code."); } finally { setIsRegeneratingCode(false); }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !graphData) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatting(true);
    try {
        const res = await fetch('http://127.0.0.1:8000/chat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMsg, context: `Title: ${graphData.title}. Explanation: ${graphData.explanation}` }),
        });
        const data = await res.json();
        setChatHistory(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (err) {
        setChatHistory(prev => [...prev, { role: 'ai', text: "I'm having trouble connecting right now." }]);
    } finally { setIsChatting(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        if(text) { setPrompt(text.substring(0, 100)); generateGraph(text); }
    };
    reader.readAsText(file);
  };

  const startListening = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false; recognition.lang = 'en-US'; setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setPrompt(transcript); generateGraph(transcript); setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false); recognition.onend = () => setIsListening(false); recognition.start();
    } else { alert("Voice control requires Chrome/Edge."); }
  };

  const handleExport = () => {
    if (reactFlowWrapper.current === null) return;
    toPng(reactFlowWrapper.current, { backgroundColor: '#020617' }).then((dataUrl) => {
        const link = document.createElement('a'); link.download = 'visualaize-graph.png'; link.href = dataUrl; link.click();
    });
  };

  const handleCopyCode = () => {
    if (graphData?.code_snippet) {
      navigator.clipboard.writeText(graphData.code_snippet); setCopied(true); setTimeout(() => setCopied(false), 2000);
    }
  };

  const showBackground = nodes.length === 0;

  return (
    <div className="relative flex h-screen w-screen bg-black overflow-hidden font-sans text-slate-200">
      
      {/* 0. INJECT CSS FOR CONTROLS */}
      <style>{glassControlsStyle}</style>

      {/* 1. THE 3D HOLOGRAPHIC BACKGROUND */}
      <div className={`absolute inset-0 transition-opacity duration-1000 z-0 ${showBackground ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <HolographicScene />
      </div>

      <div className="absolute inset-0 bg-slate-950/20 pointer-events-none z-0" />
      {loading && <LoadingCore />}

      {/* 4. MAIN UI LAYER */}
      <div className="relative flex-1 h-full flex flex-col z-10" ref={reactFlowWrapper}>
        
        {/* TOP BAR */}
        <div className="absolute top-0 left-0 w-full p-6 z-40 flex justify-between items-center pointer-events-none">
          <button onClick={onBack} className="pointer-events-auto flex items-center gap-2 text-slate-400 hover:text-white transition-colors px-4 py-2 rounded-full hover:bg-white/10 backdrop-blur-md border border-white/5 hover:border-white/20">
            <ArrowLeft className="w-4 h-4" /> <span className="font-mono text-xs tracking-widest">TERMINAL</span>
          </button>
          
          <div className="flex gap-4 pointer-events-auto">
             <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 text-xs font-mono text-emerald-400 shadow-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> ONLINE
             </div>
             
             {graphData && (
                 <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 backdrop-blur-md border border-white/10 text-xs text-slate-300 hover:bg-blue-600 hover:text-white transition-all shadow-lg"
                 >
                    {isSidebarOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                    {isSidebarOpen ? 'CLOSE PANEL' : 'OPEN PANEL'}
                 </button>
             )}
          </div>
        </div>

        {nodes.length === 0 && !loading && <ZeroState onSelect={generateGraph} />}
        {nodes.length === 0 && !loading && <SystemLogs />}

        {/* MAIN GRAPH AREA */}
        <div className="flex-1 w-full h-full">
            <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView minZoom={0.1}>
                <Background color="#94a3b8" gap={40} size={1} variant={("dots" as any)} className="opacity-[0.1]" />
                <Controls /> 
                <MiniMap className="!bg-slate-900/80 !backdrop-blur-md !border-slate-800 rounded-lg" nodeColor="#3b82f6" maskColor="rgba(15, 23, 42, 0.6)" />
            </ReactFlow>
        </div>

        {/* INPUT BAR */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[600px] z-50">
            <form onSubmit={(e) => { e.preventDefault(); generateGraph(prompt); }} className="relative group flex items-center gap-3 p-2 pl-4 rounded-full border border-white/10 bg-black/60 backdrop-blur-xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
                <Terminal size={18} className="text-blue-400" />
                <input type="text" placeholder="Describe a system..." value={prompt} onChange={(e) => setPrompt(e.target.value)} className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm font-medium outline-none font-mono"/>
                
                <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.json,.js,.py" onChange={handleFileUpload} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Upload Problem File">
                    <Paperclip size={18} />
                </button>

                <button type="button" onClick={startListening} className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>
                   <Mic size={18} />
                </button>

                <button type="submit" disabled={loading} className="px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-widest transition-all shadow-lg shadow-blue-500/20">
                    {loading ? <span className="animate-pulse">PROCESSING</span> : "GENERATE"}
                </button>
            </form>
        </div>
      </div>

      {/* RIGHT: SLIDING SIDEBAR */}
      <div 
        className={`border-l border-white/10 bg-slate-900/60 backdrop-blur-2xl flex flex-col shadow-2xl z-40 transition-all duration-500 ease-in-out overflow-hidden`}
        style={{ width: isSidebarOpen && graphData ? '450px' : '0px', opacity: isSidebarOpen && graphData ? 1 : 0 }}
      >
        {graphData && (
            <>
            <div className="p-6 border-b border-white/10 bg-slate-900/40 flex justify-between items-start min-w-[450px]">
                <div>
                   <div className="flex items-center gap-2 mb-2 text-xs font-bold tracking-widest text-blue-500 uppercase"><Layers size={12} /> Analysis Complete</div>
                   <h2 className="text-xl font-bold text-white leading-tight">{graphData.title}</h2>
                </div>
                <button onClick={handleExport} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Export Image">
                    <Download size={18} />
                </button>
            </div>

            <div className="flex border-b border-white/10 min-w-[450px]">
                <button onClick={() => setActiveTab('ANALYSIS')} className={`flex-1 py-3 text-xs font-bold tracking-wider hover:bg-white/5 transition-colors ${activeTab === 'ANALYSIS' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500'}`}>ANALYSIS</button>
                <button onClick={() => setActiveTab('CODE')} className={`flex-1 py-3 text-xs font-bold tracking-wider hover:bg-white/5 transition-colors flex items-center justify-center gap-2 ${activeTab === 'CODE' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-500'}`}><Code size={14} /> CODE</button>
                <button onClick={() => setActiveTab('CHAT')} className={`flex-1 py-3 text-xs font-bold tracking-wider hover:bg-white/5 transition-colors flex items-center justify-center gap-2 ${activeTab === 'CHAT' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500'}`}><MessageSquare size={14} /> AI TUTOR</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 min-w-[450px]">
                {activeTab === 'ANALYSIS' && (
                  <>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-white"><Activity size={16} className="text-emerald-400" /> Executive Summary</div>
                        <p className="text-sm text-slate-300 leading-relaxed">{graphData.summary}</p>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-white border-b border-white/5 pb-2"><BookOpen size={16} className="text-purple-400" /> System Logic</div>
                        <div className="text-sm text-slate-400 leading-relaxed space-y-4">{graphData.explanation}</div>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40">
                        <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex justify-between items-center">
                            <span className="text-xs font-mono text-slate-500">EXECUTION TRACE</span>
                            <PlayCircle size={14} className="text-emerald-500" />
                        </div>
                        <div className="p-4 font-mono text-xs space-y-3">
                            <div className="flex gap-4"><span className="text-slate-600">INPUT</span><span className="text-emerald-400 tracking-widest">{graphData.example_input}</span></div>
                            <div className="h-px bg-white/10 w-full" />
                            <p className="text-slate-400 leading-6">{graphData.execution_trace}</p>
                        </div>
                    </div>
                  </>
                )}

                {activeTab === 'CODE' && (
                  <div className="h-full flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <div className="relative group">
                          <button className="flex items-center gap-2 text-xs font-bold text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-white/10 hover:border-blue-500/50 transition-colors">
                              {codeLanguage} <ChevronDown size={12} />
                          </button>
                          <div className="absolute top-full left-0 mt-2 w-32 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden hidden group-hover:block z-50">
                              {['Python', 'JavaScript', 'C++', 'Java'].map(lang => (
                                  <button key={lang} onClick={() => handleLanguageChange(lang)} className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-blue-600 hover:text-white transition-colors">
                                      {lang}
                                  </button>
                              ))}
                          </div>
                      </div>
                      <button onClick={handleCopyCode} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-colors">
                        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'COPIED' : 'COPY'}
                      </button>
                    </div>
                    <div className="flex-1 rounded-xl bg-black/50 border border-white/10 p-4 overflow-x-auto relative">
                        {isRegeneratingCode && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-blue-400 text-xs font-bold animate-pulse z-10">REWRITING...</div>}
                      <pre className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{graphData.code_snippet}</pre>
                    </div>
                  </div>
                )}

                {activeTab === 'CHAT' && (
                    <div className="h-full flex flex-col">
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                            {chatHistory.length === 0 && (
                                <div className="text-center text-slate-500 mt-10 text-sm">
                                    <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>Ask me anything about this graph!</p>
                                </div>
                            )}
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-white/10 rounded-bl-none'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isChatting && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800 p-3 rounded-xl rounded-bl-none border border-white/10">
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
                                            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-100" />
                                            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-200" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <form onSubmit={handleChatSubmit} className="mt-4 pt-4 border-t border-white/10 relative">
                            <input 
                                type="text" 
                                placeholder="Type your question..." 
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-lg pl-4 pr-10 py-3 text-xs text-white focus:border-blue-500 outline-none"
                            />
                            <button type="submit" disabled={isChatting} className="absolute right-2 top-6 text-blue-400 hover:text-white transition-colors">
                                <Send size={16} />
                            </button>
                        </form>
                    </div>
                )}
            </div>
            
            <div className="p-6 border-t border-white/10 bg-slate-900/40 min-w-[450px]">
                <div className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider">Pro Capabilities</div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors group"><div className="p-2 rounded-lg bg-white/5 group-hover:bg-blue-500/20"><Zap size={14} className="group-hover:text-blue-400" /></div><span className="text-xs font-medium">Real-time</span></div>
                    <div className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors group"><div className="p-2 rounded-lg bg-white/5 group-hover:bg-emerald-500/20"><Globe size={14} className="group-hover:text-emerald-400" /></div><span className="text-xs font-medium">Multi-Region</span></div>
                </div>
            </div>
            </>
        )}
      </div>
    </div>
  );
}

export default function GraphEditor(props: EditorProps) {
    return (
        <ReactFlowProvider>
            <EditorContent {...props} />
        </ReactFlowProvider>
    );
}