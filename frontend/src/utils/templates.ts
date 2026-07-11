// frontend/src/utils/templates.ts
// Issue #291: Diagram Template Library
// Provides pre-built diagram skeletons that load instantly without calling Gemini.
// Each template uses the same Node/Edge shape that ReactFlow + GraphEditor already use.

import type { Node, Edge } from "@xyflow/react";
// Note: if the project uses the older import path, use:
// import type { Node, Edge } from "reactflow";
// Check your package.json to confirm — run: cat frontend/package.json | grep reactflow

// ─── Template Types ───────────────────────────────────────────────────────────

export type TemplateCategory =
  | "DFA"
  | "Flowchart"
  | "SystemArch"
  | "MindMap"
  | "SequenceDiagram";

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  nodes: Node[];
  edges: Edge[];
}

// ─── Template Registry ────────────────────────────────────────────────────────

export const TEMPLATES: DiagramTemplate[] = [

  // ── 1. Basic 2-State DFA ──────────────────────────────────────────────────
  {
    id: "dfa-2state",
    name: "Basic 2-State DFA",
    description: "Start state q0 and a single accept state q1 with a transition on '1'",
    category: "DFA",
    nodes: [
      {
        id: "q0",
        type: "default",
        data: { label: "q0 (start)" },
        position: { x: 100, y: 150 },
      },
      {
        id: "q1",
        type: "default",
        data: { label: "q1 (accept)" },
        position: { x: 350, y: 150 },
      },
    ],
    edges: [
      {
        id: "e-q0-q1",
        source: "q0",
        target: "q1",
        label: "1",
        type: "default",
        animated: false,
      },
    ],
  },

  // ── 2. Yes/No Flowchart ───────────────────────────────────────────────────
  {
    id: "flowchart-yesno",
    name: "Yes / No Decision Flowchart",
    description: "Start → Decision diamond → two branches (Yes / No) → End",
    category: "Flowchart",
    nodes: [
      {
        id: "start",
        type: "default",
        data: { label: "Start" },
        position: { x: 200, y: 0 },
      },
      {
        id: "decision",
        type: "default",
        data: { label: "Decision?" },
        position: { x: 200, y: 100 },
      },
      {
        id: "yes-path",
        type: "default",
        data: { label: "Yes Path" },
        position: { x: 50, y: 230 },
      },
      {
        id: "no-path",
        type: "default",
        data: { label: "No Path" },
        position: { x: 350, y: 230 },
      },
      {
        id: "end",
        type: "default",
        data: { label: "End" },
        position: { x: 200, y: 360 },
      },
    ],
    edges: [
      { id: "e1", source: "start", target: "decision", label: "" },
      { id: "e2", source: "decision", target: "yes-path", label: "Yes" },
      { id: "e3", source: "decision", target: "no-path", label: "No" },
      { id: "e4", source: "yes-path", target: "end", label: "" },
      { id: "e5", source: "no-path", target: "end", label: "" },
    ],
  },

  // ── 3. 3-Tier System Architecture ─────────────────────────────────────────
  {
    id: "sysarch-3tier",
    name: "3-Tier System Architecture",
    description: "Frontend → Backend API → Database — the classic web architecture skeleton",
    category: "SystemArch",
    nodes: [
      {
        id: "client",
        type: "default",
        data: { label: "🖥️ Frontend (React/Vue)" },
        position: { x: 200, y: 0 },
      },
      {
        id: "api",
        type: "default",
        data: { label: "⚙️ Backend API (FastAPI/Node)" },
        position: { x: 200, y: 130 },
      },
      {
        id: "db",
        type: "default",
        data: { label: "🗄️ Database (PostgreSQL/MongoDB)" },
        position: { x: 200, y: 260 },
      },
      {
        id: "cache",
        type: "default",
        data: { label: "⚡ Cache (Redis)" },
        position: { x: 450, y: 130 },
      },
    ],
    edges: [
      { id: "e1", source: "client", target: "api", label: "HTTP / REST" },
      { id: "e2", source: "api", target: "db", label: "SQL / Query" },
      { id: "e3", source: "api", target: "cache", label: "Cache read/write" },
    ],
  },

  // ── 4. Mind Map Skeleton ──────────────────────────────────────────────────
  {
    id: "mindmap-basic",
    name: "Basic Mind Map",
    description: "Central topic with 4 subtopics branching outward",
    category: "MindMap",
    nodes: [
      {
        id: "center",
        type: "default",
        data: { label: "Central Topic" },
        position: { x: 250, y: 200 },
      },
      {
        id: "topic-1",
        type: "default",
        data: { label: "Subtopic 1" },
        position: { x: 0, y: 100 },
      },
      {
        id: "topic-2",
        type: "default",
        data: { label: "Subtopic 2" },
        position: { x: 500, y: 100 },
      },
      {
        id: "topic-3",
        type: "default",
        data: { label: "Subtopic 3" },
        position: { x: 0, y: 300 },
      },
      {
        id: "topic-4",
        type: "default",
        data: { label: "Subtopic 4" },
        position: { x: 500, y: 300 },
      },
    ],
    edges: [
      { id: "e1", source: "center", target: "topic-1" },
      { id: "e2", source: "center", target: "topic-2" },
      { id: "e3", source: "center", target: "topic-3" },
      { id: "e4", source: "center", target: "topic-4" },
    ],
  },

  // ── 5. Client-Server Sequence ─────────────────────────────────────────────
  {
    id: "seq-client-server",
    name: "Client → Server Request Sequence",
    description: "Simple 4-step request/response cycle between Client and Server",
    category: "SequenceDiagram",
    nodes: [
      {
        id: "client",
        type: "default",
        data: { label: "Client" },
        position: { x: 50, y: 100 },
      },
      {
        id: "server",
        type: "default",
        data: { label: "Server" },
        position: { x: 400, y: 100 },
      },
      {
        id: "step1",
        type: "default",
        data: { label: "1. Send Request" },
        position: { x: 200, y: 50 },
      },
      {
        id: "step2",
        type: "default",
        data: { label: "2. Process" },
        position: { x: 350, y: 200 },
      },
      {
        id: "step3",
        type: "default",
        data: { label: "3. Send Response" },
        position: { x: 200, y: 320 },
      },
      {
        id: "step4",
        type: "default",
        data: { label: "4. Render" },
        position: { x: 50, y: 250 },
      },
    ],
    edges: [
      { id: "e1", source: "client", target: "step1" },
      { id: "e2", source: "step1", target: "server" },
      { id: "e3", source: "server", target: "step2" },
      { id: "e4", source: "step2", target: "step3" },
      { id: "e5", source: "step3", target: "client" },
      { id: "e6", source: "client", target: "step4" },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get all templates for a specific category */
export function getTemplatesByCategory(
  category: TemplateCategory
): DiagramTemplate[] {
  return TEMPLATES.filter((t) => t.category === category);
}

/** Get a template by its ID */
export function getTemplateById(id: string): DiagramTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** Get all unique categories that have at least one template */
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  ...new Set(TEMPLATES.map((t) => t.category)),
];