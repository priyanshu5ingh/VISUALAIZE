# How to Add a New Diagram Template

Templates are defined in `frontend/src/utils/templates.ts`.
Each template provides pre-built `nodes` and `edges` that load instantly
into the ReactFlow canvas — no Gemini API call required.

## Adding a New Template

Open `frontend/src/utils/templates.ts` and add a new object to the `TEMPLATES` array:

```typescript
{
  id: "my-template",          // Must be unique across all templates
  name: "My Template Name",   // Shown in the template card
  description: "...",         // One sentence explaining the skeleton
  category: "Flowchart",      // One of: DFA | Flowchart | SystemArch | MindMap | SequenceDiagram
  nodes: [
    {
      id: "node-1",
      type: "default",
      data: { label: "My Node" },
      position: { x: 0, y: 0 },  // Position is auto-arranged by Dagre — approximate values are fine
    },
  ],
  edges: [
    {
      id: "edge-1",
      source: "node-1",
      target: "node-2",
      label: "optional label",
    },
  ],
}
```

## Guidelines

- Keep templates to **6 nodes or fewer** — they're skeletons, not complete diagrams
- Use `position: { x: 0, y: 0 }` for all nodes if unsure — Dagre will auto-arrange on load
- Use meaningful `label` values so users understand the skeleton immediately
- Add a new `TemplateCategory` to the type if you need a new category