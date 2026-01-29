This directory contains the frontend application for VisualAIze Pro — a Next.js + React + TypeScript app that powers the interactive visualization studio.

For full project documentation (architecture, backend setup, API examples), see the root README: [README.md](../README.md).

## Quick Start (Frontend)

Requirements:

- Node.js 18+ and npm (or yarn / pnpm)

Install dependencies and run the dev server:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 in your browser. The app uses the Next.js `app/` router; edit `app/page.tsx` to change the landing page.

## Helpful Scripts

- `npm run dev` — Start Next.js dev server
- `npm run build` — Build for production
- `npm start` — Start the production server (after `build`)
- `npm run lint` — Run ESLint

## Environment

Create a `.env.local` in the `frontend/` folder for runtime overrides. At minimum you can set the backend API URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

The backend uses the Google Generative AI (Gemini) API key; keep keys in the backend and never commit them to source control.

## What to edit

- `app/page.tsx` — Landing + entry into the Graph Editor
- `src/components/GraphEditor.tsx` — Main editor UI and prompt flow
- `src/components/HolographicScene.tsx` — 3D background / model renderer
- `src/utils/layout.ts` — Dagre layout helper for node positioning

## Troubleshooting

- If the 3D model doesn't load, ensure `public/assets/core.glb` exists.
- If the frontend cannot call the backend, confirm `NEXT_PUBLIC_API_URL` is set and backend is running on that URL.

## Learn More

- Next.js docs: https://nextjs.org/docs
- ReactFlow: https://reactflow.dev
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber/getting-started/introduction

---

If you'd like, I can also merge this content into the root README or expand the frontend README with architecture diagrams and examples. 
