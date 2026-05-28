// frontend/src/components/GraphEditor.tsx
'use client';

import { toPng } from 'html-to-image';
import { getLayoutedElements } from '../utils/layout'; 
import { 
  ArrowLeft, Box, GitBranch, Network, Share2, Terminal, 
  Activity, BookOpen, PlayCircle, Layers, Code, Copy, Check, Zap, 
  Globe, Mic, Download, ChevronDown, MessageSquare, Send, Paperclip, 
  PanelRightClose, PanelRightOpen, AlertTriangle, ArrowRight, X, RefreshCw
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  applyEdgeChanges, applyNodeChanges,
  Background, BackgroundVariant, Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowProvider,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from '../components/CustomNode';
import HolographicScene from './HolographicScene';
import ErrorModal from './ErrorModal';
import LoadingCore from './LoadingCore';
import LoadingOverlay from './LoadingOverlay';

interface EditorProps { onBack: () => void; }

// --- Graph data shape returned by the backend ---
interface GraphData {
  title: string;
  summary: string;
  explanation: string;
  execution_trace: string;
  example_input?: string;
  code_snippet: string;
  code_explanation?: string;
  nodes: { id: string; label: string }[];
  edges: { source: string; target: string; label: string }[];
}

interface codeObject {
  code_snippet: string;
  code_explanation: string;
}

// --- SpeechRecognition type shim (not in lib.dom.d.ts) ---
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface WebkitSpeechRecognition extends EventTarget {
  continuous: boolean;
  lang: string;
  start(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

interface WindowWithSpeech extends Window {
  webkitSpeechRecognition: new () => WebkitSpeechRecognition;
}

// --- 🔧 CONFIGURATION: SINGLE SOURCE OF TRUTH ---
// This ensures we ALWAYS talk to Render, avoiding localhost confusion.
const BACKEND_URL = "https://visualaize-backend.onrender.com";

const glassControlsStyle = `
  .react-flow__panel .react-flow__controls {
    background: rgba(15, 23, 42, 0.65) !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 12px !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
    overflow: hidden !important;
  }
  .react-flow__controls-button {
    background: transparent !important;
    border: none !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
    width: 32px !important;
    height: 32px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: background 0.2s ease, fill 0.2s ease !important;
  }
  .react-flow__controls-button:last-child {
    border-bottom: none !important;
  }
  .react-flow__controls-button:hover {
    background: rgba(99, 102, 241, 0.18) !important;
  }
  .react-flow__controls-button svg {
    fill: rgba(255, 255, 255, 0.95) !important;
    max-width: 14px !important;
    max-height: 14px !important;
  }
  .react-flow__controls-button:hover svg {
    fill: #818cf8 !important;
  }
  .react-flow__controls-button:focus-visible {
    position: relative !important;
    z-index: 10 !important;
    outline: 2px solid rgba(99, 102, 241, 0.85) !important;
    outline-offset: -2px !important;
    box-shadow: inset 0 0 0 2px rgba(99, 102, 241, 0.85) !important;
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
            <button key={i} onClick={() => onSelect(item.prompt)} className="focus-ring group relative p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-2xl hover:bg-indigo-900/20 hover:border-indigo-500/50 transition-all text-left hover:-translate-y-2 shadow-[0_8px_32px_rgba(0,0,0,0.37)] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 mb-4 p-3 w-fit rounded-lg bg-white/5 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
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
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [activeTab, setActiveTab] = useState<'ANALYSIS' | 'CODE' | 'CHAT'>('ANALYSIS');
  const [copied, setCopied] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('Python');
  const [showLanguageDropDown, setshowLanguageDropDown] = useState(false);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [users, setUsers] = useState<string[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const clientId = useRef(crypto.randomUUID());
  const roomId = useRef("room_1");
  const [errorState, setErrorState] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'missing_key' | 'invalid_key' | 'rate_limit' | 'bad_request' | 'generic';
    onRetry?: () => void;
  } | null>(null);

  const [cursors, setCursors] = useState<Record<string, { x: number; y: number }>>({});
  /**
   * Controls the fullscreen/focus mode for the ReactFlow canvas.
   * When `true`, the top navigation bar, bottom input bar, and right
   * analysis sidebar are hidden so the graph canvas occupies the
   * full viewport — giving the user an uncluttered editing experience.
   * The user can exit focus mode via the toggle button or the Escape key.
   */
  const [isFullscreen, setIsFullscreen] = useState(false);

  const codeCache = useRef(new Map<string, codeObject>());
  const reactFlowWrapper = useRef(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const { getViewport } = useReactFlow();

 const nodeTypes = useMemo(() => ({
  custom: CustomNode,
}), []);

  const edgeTypes = useMemo(() => ({}), []);
  const onNodesChange: OnNodesChange = useCallback((changes) => {
  setNodes((nds) => {
    const updatedNodes = applyNodeChanges(changes, nds);

    if (socketRef.current?.readyState === WebSocket.OPEN) {
  socketRef.current.send(JSON.stringify({
    type: "NODE_MOVE",
    clientId: clientId.current,
    nodes: updatedNodes
  }));
}
    return updatedNodes;
  });
}, [edges]);
  
  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
  setEdges((eds) => {
    const updatedEdges = applyEdgeChanges(changes, eds);

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "SYNC_GRAPH",
          nodes,
          edges: updatedEdges,
        })
      );
    }

    return updatedEdges;
  });
}, [nodes]);

  const rafRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const onMove = useCallback((_: any, vp: any) => {
  if (rafRef.current) cancelAnimationFrame(rafRef.current);

  rafRef.current = requestAnimationFrame(() => {
    setViewport(vp);
  });
}, []);

  const generateGraph = async (text: string) => {
    if (!text || isGenerating) return;
    setIsGenerating(true);
    setPrompt(text);
    setGraphData(null);
    setActiveTab('ANALYSIS'); 
    setCodeLanguage('Python');
    setChatHistory([]);
    setIsSidebarOpen(false);
    setshowLanguageDropDown(false);

    console.log("🚀 [FRONTEND] Connecting to Backend at:", BACKEND_URL);

    try {
      const res = await fetch(`${BACKEND_URL}/generate`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ prompt: text }),
      });
      
      if (!res.ok) {
        let errDetail = "";
        const bodyText = await res.text();
        try {
          const errJson = JSON.parse(bodyText);
          errDetail = errJson.detail || bodyText;
        } catch {
          errDetail = bodyText;
        }
        
        console.error("❌ [BACKEND ERROR]:", res.status, errDetail);

        let errorTitle = "System Error";
        let errorMsg = "An unexpected error occurred. Please try again.";
        let errorType: 'missing_key' | 'invalid_key' | 'rate_limit' | 'bad_request' | 'generic' = 'generic';

        if (errDetail.includes("GEMINI_API_KEY_MISSING") || (res.status === 401 && errDetail.toLowerCase().includes("missing"))) {
          errorTitle = "API Key Missing";
          errorMsg = "Please configure your Gemini API key in the backend .env file.";
          errorType = "missing_key";
        } else if (errDetail.includes("GEMINI_API_KEY_INVALID") || res.status === 403 || res.status === 401) {
          errorTitle = "Invalid API Key";
          errorMsg = "Please check your Gemini API key configuration. The current key is invalid or unauthorized.";
          errorType = "invalid_key";
        } else if (errDetail.includes("GEMINI_RATE_LIMIT_EXCEEDED") || res.status === 429) {
          errorTitle = "Rate Limit Exceeded";
          errorMsg = "Gemini API rate limit or quota exceeded. Please wait a moment and try again.";
          errorType = "rate_limit";
        } else if (errDetail.includes("GEMINI_BAD_REQUEST") || res.status === 400) {
          errorTitle = "Invalid Request";
          errorMsg = errDetail.replace("GEMINI_BAD_REQUEST: ", "") || "The AI model could not process this request.";
          errorType = "bad_request";
        } else {
          errorTitle = "Model Execution Failure";
          errorMsg = errDetail || "The models failed to process the request.";
          errorType = "generic";
        }

        throw { title: errorTitle, message: errorMsg, type: errorType };
      }
      
      const data = await res.json();
      console.log("✅ [SUCCESS] Data received:", data);
      
      setGraphData(data);
      codeCache.current.clear();
      codeCache.current.set(codeLanguage, {code_snippet: data.code_snippet ?? '', code_explanation: data.code_explanation ?? ''});
      
      const rawNodes: Node[] = data.nodes.map((n: { id: string; label: string }) => ({
        id: n.id, type: 'custom', data: { label: n.label }, position: { x: 0, y: 0 },
        style: { background: 'transparent', border: 'none', boxShadow: 'none', width: 'auto' },
      }));
      const rawEdges: Edge[] = data.edges.map((e: { source: string; target: string; label: string }, i: number) => ({
        id: `e-${i}`, source: e.source, target: e.target, label: e.label, type: 'default', animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' },
        style: { stroke: '#3b82f6', strokeWidth: 2, filter: 'drop-shadow(0 0 3px #3b82f6)' },
        labelStyle: { fill: '#93c5fd', fontWeight: 700 }
      }));
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      console.log("RAW BACKEND DATA:", data.nodes, data.edges);
      console.log("LAYOUTED NODES:", layoutedNodes.length);
      console.log("LAYOUTED EDGES:", layoutedEdges.length);
      setIsSidebarOpen(true); 

    } catch (err: any) {
      console.error("🚨 [CRITICAL ERROR]:", err);
      const title = err.title || "Connection Failed";
      const message = err.message || `Could not connect to the visualization server. Details: ${err}`;
      const type = err.type || "generic";

      setErrorState({
        show: true,
        title,
        message,
        type,
        onRetry: () => generateGraph(text)
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const EVENT_TYPES = {
  NODE_MOVE: "NODE_MOVE",
  NODE_ADD: "NODE_ADD",
  NODE_DELETE: "NODE_DELETE",
  EDGE_ADD: "EDGE_ADD",
  EDGE_DELETE: "EDGE_DELETE"
};

  const regenerateCode = async (newLang: string) => {
    setCodeLanguage(newLang);
    setIsRegeneratingCode(true);
    try {
      const res = await fetch(`${BACKEND_URL}/regenerate_code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt, language: newLang }),
      });
      if (!res.ok) {
        let errDetail = "";
        const bodyText = await res.text();
        try {
          const errJson = JSON.parse(bodyText);
          errDetail = errJson.detail || bodyText;
        } catch {
          errDetail = bodyText;
        }
        
        let errorTitle = "System Error";
        let errorMsg = "Failed to rewrite code.";
        let errorType: 'missing_key' | 'invalid_key' | 'rate_limit' | 'bad_request' | 'generic' = 'generic';

        if (errDetail.includes("GEMINI_API_KEY_MISSING") || (res.status === 401 && errDetail.toLowerCase().includes("missing"))) {
          errorTitle = "API Key Missing";
          errorMsg = "Please configure your Gemini API key in the backend .env file.";
          errorType = "missing_key";
        } else if (errDetail.includes("GEMINI_API_KEY_INVALID") || res.status === 403 || res.status === 401) {
          errorTitle = "Invalid API Key";
          errorMsg = "Please check your Gemini API key configuration. The current key is invalid or unauthorized.";
          errorType = "invalid_key";
        } else if (errDetail.includes("GEMINI_RATE_LIMIT_EXCEEDED") || res.status === 429) {
          errorTitle = "Rate Limit Exceeded";
          errorMsg = "Gemini API rate limit or quota exceeded. Please wait a moment and try again.";
          errorType = "rate_limit";
        }

        throw { title: errorTitle, message: errorMsg, type: errorType };
      }
      const data = await res.json();
      setGraphData((prev: GraphData | null) => prev ? ({ ...prev, code_snippet: data.code_snippet, code_explanation: data.code_explanation }) : prev);
    } catch (err: any) { 
      const title = err.title || "Rewriting Failed";
      const message = err.message || "Failed to rewrite code.";
      const type = err.type || "generic";
      setErrorState({
        show: true,
        title,
        message,
        type,
        onRetry: () => regenerateCode(newLang)
      });
    } finally { setIsRegeneratingCode(false); }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !graphData) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatting(true);
    try {
        const res = await fetch(`${BACKEND_URL}/chat`, {
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
      const recognition = new (window as WindowWithSpeech).webkitSpeechRecognition();
      recognition.continuous = false; recognition.lang = 'en-US'; setIsListening(true);
      recognition.onresult = (event: SpeechRecognitionEvent) => {
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
  console.log("REACT STATE CHECK -> nodes:", nodes.length, "edges:", edges.length);

  const { x, y, zoom } = getViewport();

  const buffer = 500;

  // Performance optimization: render only nodes within viewport bounds
// to reduce rendering cost for large graphs

const visibleNodes = useMemo(() => {
  const vp = getViewport();
  const { x, y, zoom } = vp;

  return nodes.filter((node) => {
    const screenX = node.position.x * zoom + x;
    const screenY = node.position.y * zoom + y;

    return (
      screenX > -buffer &&
      screenX < window.innerWidth + buffer &&
      screenY > -buffer &&
      screenY < window.innerHeight + buffer
    );
  });
}, [nodes, viewport]);

const visibleNodeIds = useMemo(() => {
  return new Set(visibleNodes.map(n => n.id));
}, [visibleNodes]);

const filteredEdges = useMemo(() => {
  return edges.filter(
    (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
  );
}, [edges, visibleNodeIds]);

console.log(
  "TOTAL:", nodes.length,
  "VISIBLE:", visibleNodes.length
);
  console.log("VISIBLE CHECK:", visibleNodes.length);

  console.log("VIEWPORT:", getViewport());

  /**
   * Registers a global `keydown` listener so pressing Escape exits
   * focus mode. The listener is added only while `isFullscreen` is
   * `true` and is cleaned up on unmount or when the flag changes,
   * preventing stale closures and unnecessary event handling.
   */

  useEffect(() => {
  const handleMouseMove = (e: MouseEvent) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return;

    socketRef.current.send(JSON.stringify({
      type: "CURSOR_MOVE",
      clientId: clientId.current,
      roomId: roomId.current,
      position: {
        x: e.clientX,
        y: e.clientY
      }
    }));
  };

  window.addEventListener("mousemove", handleMouseMove);

  return () => window.removeEventListener("mousemove", handleMouseMove);
}, []);

  useEffect(() => {
  const socket = new WebSocket("ws://localhost:8000/ws");

  socketRef.current = socket;

  socket.onopen = () => {
    console.log("Connected");

    socket.send(JSON.stringify({
  type: "USER_JOIN",
  roomId: roomId.current,
  clientId: clientId.current
}));
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("SOCKET EVENT:", event.data);

    if (data.type === "NODE_MOVE") {
      if (data.clientId === clientId.current) return;

      setNodes((nds) =>
        nds.map((node) =>
          node.id === data.nodeId
            ? { ...node, position: data.position }
            : node
        )
      );
    }

    if (data.type === "SYNC_GRAPH") {
      setNodes(data.nodes);
      setEdges(data.edges);
    }

    if (data.type === "ROOM_USERS") {
  setUsers(data.users);
}
  

    if (data.type === "CURSOR_MOVE") {
  const roomId = data.roomId;

  setCursors((prev) => ({
    ...prev,
    [data.clientId]: data.position
  }));
}

  };

  socket.onclose = () => {
    console.log("Disconnected");
  };

  return () => {
    socket.close();
  };
}, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  return (

    <div className="relative flex h-screen w-screen bg-black overflow-hidden font-sans text-slate-200">
      
      {/* 0. INJECT CSS FOR CONTROLS */}
      <style>{glassControlsStyle}</style>

      {/* 1. THE 3D HOLOGRAPHIC BACKGROUND */}
      <div className={`absolute inset-0 transition-opacity duration-1000 z-0 ${showBackground ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <HolographicScene />
      </div>

      <div className="absolute inset-0 bg-slate-950/20 pointer-events-none z-0" />
      {isGenerating && <LoadingOverlay />}

      {/* 4. MAIN UI LAYER */}
      <div className="relative flex-1 h-full flex flex-col z-10" ref={reactFlowWrapper}>
        
        {/* TOP BAR — hidden in focus mode to maximise canvas real-estate */}
        {!isFullscreen && (
        <div className="absolute top-0 left-0 w-full p-6 z-40 flex justify-between items-center pointer-events-none">
          <button
            onClick={onBack}
            aria-label="Go back to landing page"
            className="focus-ring pointer-events-auto flex items-center gap-2 text-slate-400 hover:text-white transition-colors px-4 py-2 rounded-full hover:bg-white/10 backdrop-blur-md border border-white/5 hover:border-white/20"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> <span className="font-mono text-xs tracking-widest">TERMINAL</span>
          </button>
          
          <div className="flex gap-4 pointer-events-auto">
             <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 text-xs font-mono text-emerald-400 shadow-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> ONLINE
             </div>

             {graphData && (
                 <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    aria-label={isSidebarOpen ? 'Close analysis panel' : 'Open analysis panel'}
                    aria-expanded={isSidebarOpen}
                    className="focus-ring flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 backdrop-blur-md border border-white/10 text-xs text-slate-300 hover:bg-blue-600 hover:text-white transition-all shadow-lg"
                 >
                    {isSidebarOpen ? <PanelRightClose size={14} aria-hidden="true" /> : <PanelRightOpen size={14} aria-hidden="true" />}
                    {isSidebarOpen ? 'CLOSE PANEL' : 'OPEN PANEL'}
                 </button>
             )}
          </div>
        </div>
        )}

        <div className="p-3 border-b border-white/10">
  <div className="text-xs font-bold text-slate-400 mb-2">
    ONLINE USERS
  </div>

  <div className="space-y-1">
    {users.map((u) => (
      <div
        key={u}
        className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded"
      >
        {u}
      </div>
    ))}
  </div>
</div>s

        {/*
          FULLSCREEN / FOCUS MODE TOGGLE
          Always visible (z-50) so the user can enter or exit focus mode
          regardless of the current UI state. Renders at the top-right
          corner of the canvas. The button label and icon swap between
          Maximize2 / Minimize2 to clearly communicate the current state.
          Keyboard shortcut: Escape (exit only) — handled by the
          useEffect hook above.
        */}
        <button
          onClick={() => setIsFullscreen(f => !f)}
          className="focus-ring absolute top-4 right-4 z-50 pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 text-xs font-mono text-slate-300 hover:bg-blue-600 hover:text-white hover:border-blue-500/50 transition-all shadow-lg"
          title={isFullscreen ? 'Exit Focus Mode (Esc)' : 'Focus Mode'}
          aria-label={isFullscreen ? 'Exit Focus Mode' : 'Enter Focus Mode'}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          {isFullscreen ? 'EXIT FOCUS' : 'FOCUS'}
        </button>

        {nodes.length === 0 && !isGenerating && <ZeroState onSelect={generateGraph} />}
        {nodes.length === 0 && !isGenerating && <SystemLogs />}

        {/* MAIN GRAPH AREA */}
        <div className="flex-1 w-full h-full">
            <ReactFlow
              nodes={visibleNodes}
              edges={filteredEdges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onMove={onMove}
              minZoom={0.1}
      >
                <Background
                    color="#94a3b8"
                    gap={40}
                    size={1}
                    variant={BackgroundVariant.Dots}
                    className="opacity-[0.1]"
                />

                {/* Show controls only after graph generation */}
                {nodes.length > 0 && <Controls />}

                {/* Show minimap only after graph generation */}
                {nodes.length > 0 && (
                    <MiniMap
                      className="!border-white/5"
                      nodeColor={(node) => {
                        const label = node.data?.label?.toLowerCase() || '';
                        if (label.includes('start')) return '#10b981'; // emerald-500
                        if (label.includes('end') || label.includes('accept') || label.includes('final')) return '#a855f7'; // purple-500
                        return '#6366f1'; // indigo-500
                      }}
                      maskColor="rgba(15, 23, 42, 0.7)"
                      style={{
                        backgroundColor: "rgba(15, 23, 42, 0.65)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "12px",
                      }}
                    />
                )}
            </ReactFlow>
        </div>

        {/* INPUT BAR — hidden in focus mode so the canvas extends to the bottom edge */}
        {!isFullscreen && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[600px] z-50">
            <form onSubmit={(e) => { e.preventDefault(); generateGraph(prompt); }} className="relative group flex items-center gap-3 p-2 pl-4 rounded-full border border-white/10 bg-black/40 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.37)] focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all">
                <Terminal size={18} className="text-indigo-400" />
                <input type="text" placeholder="Describe a system..." value={prompt} onChange={(e) => setPrompt(e.target.value)} className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm font-medium outline-none font-mono"/>
                
                <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.json,.js,.py" onChange={handleFileUpload} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="focus-ring p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Upload Problem File" aria-label="Upload problem file">
                    <Paperclip size={18} />
                </button>

                <button type="button" onClick={startListening} aria-label={isListening ? 'Stop voice input' : 'Start voice input'} className={`focus-ring p-2 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>
                    <Mic size={18} />
                </button>

                <button type="submit" disabled={isGenerating} className="px-6 py-2 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-bold text-xs tracking-widest transition-all shadow-lg shadow-indigo-500/30 border border-white/10">
                    {isGenerating ? <span className="animate-pulse">PROCESSING</span> : "GENERATE"}
                </button>
            </form>
        </div>
        )}
      </div>
      
    {Object.entries(cursors).map(([id, pos]) => (
  <div
    key={id}
    style={{
      position: "absolute",
      left: pos.x,
      top: pos.y,
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: "red",
      pointerEvents: "none",
      zIndex: 9999
    }}
  />
))}

      {/* RIGHT: SLIDING SIDEBAR — hidden in focus mode to give the canvas full width */}
      {!isFullscreen && (
      <div 
        className={`border-l border-white/10 bg-slate-950/70 backdrop-blur-2xl flex flex-col shadow-2xl z-40 transition-all duration-500 ease-in-out overflow-hidden`}
        style={{ width: isSidebarOpen && graphData ? '450px' : '0px', opacity: isSidebarOpen && graphData ? 1 : 0 }}
      >
        {graphData && (
            <>
            <div className="p-6 border-b border-white/10 bg-slate-900/40 flex justify-between items-start min-w-[450px]">
                <div>
                   <div className="flex items-center gap-2 mb-2 text-xs font-bold tracking-widest text-blue-500 uppercase"><Layers size={12} /> Analysis Complete</div>
                   <h2 className="text-xl font-bold text-white leading-tight">{graphData.title}</h2>
                </div>
                <button onClick={handleExport} className="focus-ring p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Export as PNG" aria-label="Export graph as PNG">
                    <Download size={18} />
                </button>
            </div>

            <div className="flex border-b border-white/10 min-w-[450px]">
                <button onClick={() => setActiveTab('ANALYSIS')} className={`focus-ring flex-1 py-3 text-xs font-bold tracking-wider hover:bg-white/5 transition-colors ${activeTab === 'ANALYSIS' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500'}`}>ANALYSIS</button>
                <button onClick={() => setActiveTab('CODE')} className={`focus-ring flex-1 py-3 text-xs font-bold tracking-wider hover:bg-white/5 transition-colors flex items-center justify-center gap-2 ${activeTab === 'CODE' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-500'}`}><Code size={14} /> CODE</button>
                <button onClick={() => setActiveTab('CHAT')} className={`focus-ring flex-1 py-3 text-xs font-bold tracking-wider hover:bg-white/5 transition-colors flex items-center justify-center gap-2 ${activeTab === 'CHAT' ? 'text-fuchsia-400 border-b-2 border-fuchsia-400' : 'text-slate-500'}`}><MessageSquare size={14} /> AI TUTOR</button>
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
                      <div className="relative flex gap-2">
                        <div className="">
                        <button className={`focus-ring flex items-center gap-2 text-xs font-bold text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-white/10 hover:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all ${isRegeneratingCode? 'opacity-50':'opacity-100'}`}
                          onClick={() => setshowLanguageDropDown(p => !p)}
                          disabled={isRegeneratingCode}
                        >
                          {codeLanguage} 
                          <ChevronDown size={12} className={`transition-transform ${showLanguageDropDown ? 'rotate-180' : ''}`} />
                          </button>
                        {showLanguageDropDown && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setshowLanguageDropDown(false)} 
                            />
                            
                            <div className="absolute top-full left-0 mt-2 w-32 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                              {['Python', 'JavaScript', 'C++', 'Java'].map(lang => (
                                <button 
                                  key={lang} 
                                  onClick={() => { regenerateCode(lang); setshowLanguageDropDown(false); }} 
                                  className="focus-ring w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-blue-600 hover:text-white transition-colors first:border-b-0"
                                >
                                      {lang}
                                  </button>
                              ))}
                          </div>
                          </>
                        )}
                      </div>
                            <button
                              className={`focus-ring flex items-center gap-2 text-xs font-bold text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-white/10 hover:border-blue-500/50 transition-colors ${isRegeneratingCode? 'opacity-50': 'opacity-100'}`}
                              disabled={isRegeneratingCode}
                              onClick={() => regenerateCode(codeLanguage)}
                              aria-label="Regenerate code"
                              title="Regenerate code"
                            >
                              <RefreshCw size={14}/>
                            </button>
                      </div>
                      <button onClick={handleCopyCode} className="focus-ring flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-colors">
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
                                className="focus-ring w-full bg-slate-900/50 border border-white/10 rounded-lg pl-4 pr-10 py-3 text-xs text-white focus:border-blue-500 outline-none"
                            />
                            <button type="submit" disabled={isChatting} aria-label="Send message" className="focus-ring absolute right-2 top-6 text-blue-400 hover:text-white transition-colors">
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
      {errorState && (
        <ErrorModal 
          show={errorState.show}
          title={errorState.title}
          message={errorState.message}
          type={errorState.type}
          onRetry={() => {
            const retryFn = errorState.onRetry;
            setErrorState(null);
            if (retryFn) retryFn();
          }}
          onClose={() => setErrorState(null)} 
        />
      )}
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