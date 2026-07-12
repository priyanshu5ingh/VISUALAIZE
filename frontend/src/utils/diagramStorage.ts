// frontend/src/utils/diagramStorage.ts
// Issue #292: localStorage-backed diagram persistence
//
// ARCHITECTURE DECISION:
// All diagram save/load logic goes through saveDiagram() and listDiagrams().
// When a real backend DB is added later, ONLY this file changes — the
// rest of the app (GraphEditor, MyDiagramsPanel) stays unchanged.

import type { Node, Edge } from "@xyflow/react";
// If the older import is used: import type { Node, Edge } from "reactflow";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SavedDiagram {
  id: string;             // UUID — unique per saved diagram
  prompt: string;         // The original prompt used to generate it
  nodes: Node[];
  edges: Edge[];
  createdAt: string;      // ISO timestamp string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "visualaize:diagrams";
const MAX_SAVED_DIAGRAMS = 50;  // Keep at most 50 diagrams in localStorage

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Save a diagram to localStorage.
 * New diagrams are prepended (most recent first).
 * If MAX_SAVED_DIAGRAMS is reached, the oldest entry is dropped.
 */
export function saveDiagram(
  prompt: string,
  nodes: Node[],
  edges: Edge[]
): SavedDiagram {
  const newDiagram: SavedDiagram = {
    id: crypto.randomUUID(),
    prompt,
    nodes,
    edges,
    createdAt: new Date().toISOString(),
  };

  const existing = listDiagrams();
  const updated = [newDiagram, ...existing].slice(0, MAX_SAVED_DIAGRAMS);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    // localStorage can throw QuotaExceededError on mobile devices with low storage
    console.warn("[VISUALAIZE] Could not save diagram to localStorage:", err);
    // Try saving a smaller set (last 10 diagrams)
    const reduced = [newDiagram, ...existing].slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced));
  }

  return newDiagram;
}

/**
 * Load all saved diagrams from localStorage (newest first).
 * Returns an empty array if nothing is saved or if the data is corrupted.
 */
export function listDiagrams(): SavedDiagram[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedDiagram[];
  } catch {
    console.warn("[VISUALAIZE] Corrupted diagram storage — resetting.");
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

/**
 * Get a single saved diagram by ID.
 */
export function getDiagramById(id: string): SavedDiagram | undefined {
  return listDiagrams().find((d) => d.id === id);
}

/**
 * Delete a saved diagram by ID.
 */
export function deleteDiagram(id: string): void {
  const updated = listDiagrams().filter((d) => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

/**
 * Clear all saved diagrams. Used for "Clear All" button.
 */
export function clearAllDiagrams(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Formatting Helpers ───────────────────────────────────────────────────────

/** Truncate the prompt to use as a display title */
export function truncatePrompt(prompt: string, maxLength = 50): string {
  if (!prompt) return "Untitled Diagram";
  return prompt.length > maxLength
    ? prompt.slice(0, maxLength).trimEnd() + "…"
    : prompt;
}

/** Format the ISO timestamp to a readable "Jul 15, 10:30 AM" string */
export function formatTimestamp(isoString: string): string {
  return new Date(isoString).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}