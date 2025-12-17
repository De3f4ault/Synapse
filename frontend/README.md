# Synapse Frontend

The immersive interface for the Synapse study environment. Built for focus, speed, and visual delight.

## Tech Stack

- **Core**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, CSS Modules
- **State**: Zustand (Global Store), TanStack Query (Server State)
- **Routing**: React Router DOM 6
- **Interaction**: Framer Motion (Animations), Lucide React (Icons)
- **UI Libs**: Radix UI (Primitives), Sonner (Toasts)

## Architectural Concepts

### 1. "Paper-Glass" Aesthetic
A design language that combines the tactile feel of physical study materials with the futuristic glassmorphism of modern interfaces.
- **Semantic Colors**: Theme-aware tokens (`bg-card`, `text-foreground`).
- **Micro-Interactions**: Hover glows, spring animations, and smooth transitions.

### 2. Agentic Components
Components that aren't just display layers but have built-in intelligence.
- **AIInsightsPanel**: A non-destructive sidecar for AI assistance.
- **NoteTree**: A recursive, animated file structure visualizer.

### 3. Performance First
- **Masonry Layout**: CSS-driven responsive grids.
- **Virtualization**: Handling large lists of notes efficiently.
- **Optimized Assets**: WebP format and lazy loading.

## Development Setup

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create `.env` file:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```

3. **Start Dev Server**
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev`: Start development server
- `npm run build`: Production build
- `npm run lint`: Run ESLint
- `npm run preview`: Preview production build

## Directory Structure

```
src/
├── api/            # Generated API client
├── assets/         # Images, fonts, static files
├── components/     # Reusable UI components
│   ├── layout/     # Structural components (Header, Dock)
│   └── ui/         # Shadcn/Radix primitives
├── hooks/          # Custom React hooks
├── lib/            # Utilities & helpers
├── pages/          # Feature-based Page components
│   ├── notes/
│   ├── decks/
│   └── chat/
├── stores/         # Zustand stores
└── styles/         # Global styles & Tailwind layers
```
