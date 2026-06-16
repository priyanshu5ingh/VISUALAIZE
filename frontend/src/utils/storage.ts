// frontend/src/utils/storage.ts

import { Node, Edge } from 'reactflow';

export interface SavedDiagram {
  id: string;
  prompt: string;
  timestamp: number;
  data: {
    title: string;
    summary: string;
    explanation: string;
    execution_trace: string;
    example_input?: string;
    code_snippet: string;
    code_explanation?: string;
    nodes: Node[];
    edges: Edge[];
  };
}

const STORAGE_KEY = 'visualaize_history';

// 1. Get all saved diagrams
export const getHistory = (): SavedDiagram[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

// 2. Save a new diagram
export const saveToHistory = (prompt: string, data: any, nodes: Node[], edges: Edge[]) => {
  if (typeof window === 'undefined') return;
  
  const history = getHistory();
  const newEntry: SavedDiagram = {
    id: crypto.randomUUID(),
    prompt,
    timestamp: Date.now(),
    data: {
      ...data,
      nodes,
      edges,
    },
  };

  // Add to beginning of array and keep only the last 20 to prevent filling storage
  const updatedHistory = [newEntry, ...history].slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  return newEntry;
};

// 3. Delete a diagram
export const deleteFromHistory = (id: string) => {
  if (typeof window === 'undefined') return;
  
  const history = getHistory();
  const updatedHistory = history.filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  return updatedHistory;
};