// frontend/src/utils/storage.ts
import { Node, Edge } from 'reactflow';

export interface SavedDiagram {
  id: string;
  prompt: string;
  data: any;
  nodes: Node[];
  edges: Edge[];
  timestamp: number;
}

const STORAGE_KEY = 'visualaize_diagram_history';
const MAX_HISTORY = 20;

export const getHistory = (): SavedDiagram[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn("Failed to load history from localStorage:", error);
    return []; // Degrade gracefully instead of crashing
  }
};

export const saveToHistory = (
  prompt: string,
  data: any,
  nodes: Node[],
  edges: Edge[]
): SavedDiagram | null => {
  if (typeof window === 'undefined') return null;

  try {
    const history = getHistory();
    
    const newEntry: SavedDiagram = {
      id: crypto.randomUUID(),
      prompt,
      data,
      nodes,
      edges,
      timestamp: Date.now(),
    };

    // Keep only the most recent 20
    const updatedHistory = [newEntry, ...history].slice(0, MAX_HISTORY);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    return newEntry;
  } catch (error) {
    console.warn("Failed to save diagram to localStorage:", error);
    return null;
  }
};

export const deleteFromHistory = (id: string): SavedDiagram[] | null => {
  if (typeof window === 'undefined') return null;

  try {
    const history = getHistory();
    const updatedHistory = history.filter(item => item.id !== id);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    return updatedHistory;
  } catch (error) {
    console.warn("Failed to delete diagram from localStorage:", error);
    return null;
  }
};