# 🎨 VisualAIze Pro

<div align="center">
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
  [![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?logo=next.js&logoColor=white)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
  [![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

  > **Visualize logic at the speed of thought. No drag. No drop. Just dream.**
  
  A cutting-edge AI-powered graph visualization platform powered by **Google Gemini 2.5**, designed for creating beautiful, interactive diagrams from natural language descriptions.
  
  [Demo](#-features) • [Getting Started](#-getting-started) • [Architecture](#-architecture) • [Tech Stack](#-tech-stack)

</div>

---

## 🌟 Features

<table>
  <tr>
    <td align="center" width="50%">
      <h3>🤖 AI-Powered Generation</h3>
      <p>Describe any diagram in natural language and watch it come to life with Gemini 2.5 intelligence</p>
    </td>
    <td align="center" width="50%">
      <h3>✨ Interactive Visualization</h3>
      <p>Pan, zoom, and manipulate graphs with smooth animations and real-time updates</p>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <h3>⚡ Viewport-Based Rendering</h3>
      <p>Only renders nodes and edges visible in the current viewport, improving performance for large graphs and ensuring smooth interaction even with thousands of elements</p>
    </td>
    <td align="center" width="50%">
      <h3>🎭 3D Holographic Interface</h3>
      <p>Immersive 3D background with animated core and cinematic lighting effects</p>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <h3>📊 Multiple Diagram Types</h3>
      <p>DFA, Neural Networks, Flowcharts, Mind Maps, System Architectures & More</p>
    </td>
    <td align="center" width="50%">
      <h3>🎬 Smooth Animations</h3>
      <p>Frame-motion powered transitions and holographic loading effects</p>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <h3>💾 Export Options</h3>
      <p>Download your diagrams as PNG images for presentations and documentation</p>
    </td>
  </tr>
</table>

---

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   VisualAIze Pro Platform                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend (Next.js 16 + React 19 + TypeScript)              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Landing Page (Hero3D)                               │  │
│  │    ↓                                                  │  │
│  │  Graph Editor (Interactive Visualization)            │  │
│  │    • ReactFlow for node-edge rendering               │  │
│  │    • Three.js for 3D scenes                          │  │
│  │    • Framer Motion for animations                    │  │
│  │    • TailwindCSS for styling                         │  │
│  └──────────────────────────────────────────────────────┘  │
│              ↕ (REST API Calls)                              │
│  Backend (Python + FastAPI)                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Endpoints                                       │  │
│  │    • POST /api/generate → Gemini 2.5 Integration    │  │
│  │    • GET /api/models → List available models        │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │ Google Gemini 2.5 API                          │ │  │
│  │  │ (Natural Language → Graph JSON Conversion)      │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
VisualAIze/
├── frontend/                          # Next.js Application
│   ├── app/
│   │   ├── layout.tsx                # Root Layout
│   │   ├── page.tsx                  # Landing Page with Hero3D
│   │   └── about/
│   │       └── page.tsx              # About Page
│   ├── src/
│   │   ├── components/
│   │   │   ├── Hero3D.tsx            # 3D Background Animation
│   │   │   ├── HolographicScene.tsx  # 3D Core Model Renderer
│   │   │   ├── GraphEditor.tsx       # Main Editor (422 lines)
│   │   │   ├── CustomNode.tsx        # Graph Node Component
│   │   │   ├── ProductDemo.tsx       # Feature Showcase
│   │   │   ├── InteractiveCard.tsx   # Card Component
│   │   │   ├── LoadingCore.tsx       # Loading Animation
│   │   └── utils/
│   │       └── layout.ts             # Dagre Layout Engine
│   ├── public/
│   │   └── assets/
│   │       └── core.glb              # 3D Model
│   ├── package.json                  # Dependencies
│   └── next.config.ts                # Next.js Config
│
└── backend/                           # Python Backend
    ├── test_key.py                   # Gemini API Key Validation
    └── venv/                         # Virtual Environment

  ---

  ## 🖼️ Diagrams

  Visual diagrams for the architecture and data flow are available in the `docs/` folder.

  ![Architecture Diagram](docs/architecture.svg)

  ![Data Flow](docs/data-flow.svg)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm/yarn
- **Python** 3.10+
- **Google Gemini API Key** (Get one [here](https://makersuite.google.com/app/apikey))

### Installation

#### 1. **Clone the repository**

```bash
git clone https://github.com/priyanshu5ingh/VISUALAIZE.git
cd VISUALAIZE
```

#### 2. **Frontend Setup**

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Frontend Quick Start (expanded)**

This project contains a focused frontend guide in `frontend/README.md`. Key steps are:

```bash
cd frontend
npm install
npm run dev
```

Helpful scripts:

- `npm run dev` — Start Next.js dev server
- `npm run build` — Build for production
- `npm start` — Start the production server (after `build`)
- `npm run lint` — Run ESLint

Environment:

Create a `.env.local` file in the `frontend/` folder for runtime overrides. At minimum:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

If you prefer a dedicated reference, see: [frontend/README.md](frontend/README.md)

#### 3. **Backend Setup**

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env and add your GEMINI_API_KEY
cp .env.example .env
```

#### 4. **Configure API Key**

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

And in `backend/`, update the API key in your backend service configuration.

---

## 📊 Data Flow Diagram

```
User Input (Natural Language)
        ↓
   ┌────────────────────────┐
   │  GraphEditor Component │
   │  - Accepts prompt      │
   │  - Shows loading state │
   └────────────────────────┘
        ↓
   ┌────────────────────────────────┐
   │  Send to Gemini 2.5 Backend    │
   │  POST /api/generate-diagram    │
   └────────────────────────────────┘
        ↓
   ┌────────────────────────────────┐
   │  Gemini AI Processing          │
   │  - Parse prompt                │
   │  - Generate JSON structure     │
   │  - Create nodes & edges        │
   └────────────────────────────────┘
        ↓
   ┌────────────────────────────────┐
   │  Layout Engine (Dagre)         │
   │  - Auto-arrange nodes          │
   │  - Calculate positions         │
   │  - Optimize spacing            │
   └────────────────────────────────┘
        ↓
   ┌────────────────────────────────┐
   │  ReactFlow Rendering           │
   │  - Display graph               │
   │  - Handle interactions         │
   │  - Animate transitions         │
   └────────────────────────────────┘
        ↓
   Beautiful Interactive Diagram ✨
```

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose | Version |
|-----------|---------|---------|
| **Next.js** | React framework with SSR & routing | 16.1.4 |
| **React** | UI library | 19.2.3 |
| **TypeScript** | Type safety | 5.x |
| **ReactFlow** | Graph visualization library | 11.11.4 |
| **Three.js** | 3D rendering | 0.182.0 |
| **React Three Fiber** | React renderer for Three.js | 9.5.0 |
| **React Three Drei** | Useful helpers for R3F | 10.7.7 |
| **Framer Motion** | Animation library | 12.29.0 |
| **TailwindCSS** | Utility-first CSS framework | 4.x |
| **Dagre** | Graph layout library | 0.8.5 |
| **Lucide React** | Icon library | 0.563.0 |
| **html-to-image** | Export diagrams to PNG | 1.11.13 |

### Backend

| Technology | Purpose |
|-----------|---------|
| **Python** | Backend language |
| **FastAPI** | Modern API framework |
| **Google Generative AI** | Gemini 2.5 API integration |
| **Uvicorn** | ASGI server |

---

## 🎯 Use Cases

### 1. **Education**
- Generate DFAs, NFAs, and state machines
- Create algorithm flowcharts
- Visualize data structures

### 2. **System Design**
- Design system architectures
- Create deployment diagrams
- Map service dependencies

### 3. **Knowledge Management**
- Build mind maps
- Create concept networks
- Visualize learning paths

### 4. **Business**
- Process flow diagrams
- Organization charts
- Workflow visualizations

---

## 💡 Example Prompts

Try these prompts in the application:

```
✨ "DFA that accepts binary strings ending in 101"
✨ "Diagram of a Transformer neural network architecture"
✨ "Flowchart for a secure user authentication system"
✨ "Mind map of the history of Space Exploration"
✨ "System architecture for a microservices e-commerce platform"
```

---

## 🎨 UI Components

### Landing Page
- **Hero3D**: Stunning 3D background with animated core
- **Badge**: Technology showcase (Gemini 2.5)
- **CTA Buttons**: "Enter Studio" and "Learn More"

### Graph Editor
- **Zero State**: Suggestion cards for quick starts
- **Input Area**: Text prompt input with voice support
- **Graph Canvas**: Interactive ReactFlow visualization
- **System Logs**: Monospace terminal-style feedback
- **Controls**: Pan, zoom, mini-map, download, share

### 3D Components
- **HolographicScene**: Renders 3D core model with:
  - Cinematic lighting
  - Contact shadows
  - Starfield background
  - Floating animation
  - Environment reflections

---

## ⚙️ Configuration

### Next.js Config (`next.config.ts`)
```typescript
export default {
  // Your Next.js configuration
}
```

### Tailwind Config (`tailwind.config.ts`)
- Custom colors and gradients
- Animation presets
- Glass morphism effects

### TypeScript Config (`tsconfig.json`)
- Strict mode enabled
- ES2020 target
- Module resolution optimized

---

## 📦 Key Dependencies

### Graph Visualization
- **ReactFlow**: Node-based graph editor
- **Dagre**: Automatic graph layout algorithm

### 3D Graphics
- **Three.js**: WebGL renderer
- **React Three Fiber**: React binding for Three.js
- **React Three Drei**: Helpers (models, lights, effects)

### Animations
- **Framer Motion**: Declarative animation library

### Utilities
- **html-to-image**: Export diagrams
- **clsx**: Conditional class names
- **tailwind-merge**: Merge Tailwind classes

---

## 🔒 Security

- **API Keys**: Store Gemini API key securely in backend
- **Environment Variables**: Use `.env.local` for sensitive data
- **CORS**: Configure properly for production
- **Input Validation**: All user inputs validated on backend

---

## 📈 Performance Optimizations

- **Code Splitting**: Next.js automatic route splitting
- **Image Optimization**: Next.js Image component
- **3D Optimization**: LOD (Level of Detail) for 3D models
- **Animation Performance**: GPU-accelerated Framer Motion
- **Lazy Loading**: React.lazy for heavy components

---

## 🤝 API Integration

### Generate Diagram Endpoint

```typescript
POST /api/generate
Content-Type: application/json

{
  "prompt": "DFA that accepts binary strings ending in 101"
}

Response:
{
  "nodes": [
    { "id": "q0", "label": "q0", "position": { "x": 0, "y": 0 } },
    { "id": "q1", "label": "q1", "position": { "x": 100, "y": 0 } },
    ...
  ],
  "edges": [
    { "id": "e1", "source": "q0", "target": "q1", "label": "1" },
    ...
  ]
}
```

---

## 📱 Responsive Design

- **Desktop**: Full feature set with optimized layout
- **Tablet**: Touch-friendly interactions
- **Mobile**: Responsive graph editor with simplified UI

---

## 🚦 Roadmap

- [ ] Voice-to-diagram conversion
- [ ] Real-time collaboration
- [ ] Diagram templates library
- [ ] Advanced styling options
- [ ] Mobile app (React Native)
- [ ] Database integration for saving diagrams
- [ ] Team workspace management
- [ ] Custom model support

---

## 🐛 Troubleshooting

### Issue: "API Key not found"
**Solution**: Ensure your Gemini API key is set in the backend configuration.

### Issue: "3D model not loading"
**Solution**: Check that `core.glb` exists in `public/assets/` directory.

### Issue: "localhost:3000 refused to connect"
**Solution**: Make sure `npm run dev` is running and no other app is using port 3000.

### Issue: "Gemini API errors"
**Solution**: Verify your API key is valid and has the right permissions.

---

## 📚 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [ReactFlow Guide](https://reactflow.dev/learn)
- [Three.js Tutorial](https://threejs.org/docs/index.html)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Google Gemini API](https://ai.google.dev/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)

---

### GSSOC 2026 Readiness 🚀

This repository is fully optimized for **GSSOC 2026** with:
- **AI-Powered Issue Assignment**: Mention "assign" to get auto-tagged and assigned.
- **Automated PR Reviews**: CodeRabbit AI reviews every PR line-by-line.
- **Smart Scoring**: Automatic labels for points (`level:beginner`, `level:intermediate`, etc.).

---

## 🤝 Contributing

Contributions are welcome and appreciated. Whether you're fixing a bug, improving the docs, or building a new feature, your help makes a difference.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to set up the project locally, the branching strategy, commit message conventions, and how to submit a pull request.

If you are participating in **GirlScript Summer of Code (GSSOC)**, look for issues labeled `gssoc` and `level:beginner` to get started.

---

## 💖 Contributors

Thanks to all the amazing people who contribute to **VISUALAIZE** 🚀

<p align="center">
  <a href="https://github.com/priyanshu5ingh/VISUALAIZE/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=priyanshu5ingh/VISUALAIZE" alt="Contributors"/>
  </a>
</p>

<br>

## ⭐ Project Support

<p align="center">
  <a href="https://github.com/priyanshu5ingh/VISUALAIZE/stargazers">
    <img src="https://img.shields.io/github/stars/priyanshu5ingh/VISUALAIZE?style=social" alt="Stars">
  </a>
  &nbsp;&nbsp;
  <a href="https://github.com/priyanshu5ingh/VISUALAIZE/network/members">
    <img src="https://img.shields.io/github/forks/priyanshu5ingh/VISUALAIZE?style=social" alt="Forks">
  </a>
</p>

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👨‍💻 Author

**Created with ❤️ by the VisualAIze Team**

---

## 🎉 Get Started Today!

```bash
# Clone the repo
git clone https://github.com/priyanshu5ingh/VISUALAIZE.git
cd VISUALAIZE

# Install and run
cd frontend && npm install && npm run dev

# Open your browser
# Visit http://localhost:3000
```

---

<div align="center">
  
  **[⬆ back to top](#-visualaize-pro)**
  
  <p>
    <a href="https://github.com/priyanshu5ingh/VISUALAIZE">GitHub</a> •
    <a href="#-getting-started">Documentation</a> •
    <a href="#-roadmap">Roadmap</a>
  </p>
  
  Made with 🚀 by developers, for developers
  
</div>
