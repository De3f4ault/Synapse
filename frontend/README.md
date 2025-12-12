# Synapse Frontend

> Modern, AI-powered learning platform frontend built with React, TypeScript, and Vite.

## Tech Stack

- **Framework:** React 18.3 with TypeScript
- **Build Tool:** Vite 6.0
- **Routing:** React Router DOM 7.9
- **State Management:** Zustand 5.0 + TanStack Query 5.62
- **UI Components:** Radix UI + shadcn/ui
- **Styling:** Tailwind CSS 3.4 with custom design system
- **Animations:** Framer Motion 11.15
- **Rich Text Editor:** BlockNote 0.42
- **Real-time:** Socket.IO Client 4.8
- **Charts:** Recharts 2.15 + D3 7.9
- **Forms:** React Hook Form 7.54 + Zod validation

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+ or yarn 1.22+
- Backend API running (see backend README)

## Installation

### 1. Navigate to Frontend

```bash
cd frontend
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Configuration

Create a `.env` file in the frontend directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true

# Optional: Third-party services
VITE_GOOGLE_ANALYTICS_ID=
```

### 4. Start Development Server

```bash
npm run dev
# or
yarn dev
```

The app will be available at `http://localhost:3001`

## Project Structure

```
frontend/
├── public/               # Static assets
├── src/
│   ├── api/              # API client and generated types
│   │   ├── generated/    # Auto-generated from OpenAPI
│   │   ├── hooks/        # React Query hooks
│   │   └── websocket/    # WebSocket utilities
│   ├── components/       # Shared UI components
│   │   └── ui/           # shadcn/ui components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   ├── modules/          # Feature modules
│   │   ├── chat/         # AI Chat interface
│   │   ├── notes/        # Note-taking
│   │   └── study/        # Study tools
│   ├── pages/            # Page components
│   │   ├── auth/         # Login, Register
│   │   ├── chat/         # Chat layouts
│   │   ├── dashboard/    # Dashboard
│   │   ├── documents/    # Document management
│   │   ├── flashcards/   # Flashcard system
│   │   ├── notes/        # Notes interface
│   │   └── quizzes/      # Quiz interface
│   ├── services/         # Business logic services
│   ├── styles/           # Global styles and themes
│   │   ├── globals.css   # Tailwind base
│   │   └── synapse-theme.css  # Custom theme
│   ├── types/            # TypeScript type definitions
│   ├── App.tsx           # Root component
│   └── main.tsx          # Application entry point
├── components.json       # shadcn/ui configuration
├── tailwind.config.ts    # Tailwind configuration
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite configuration
└── package.json
```

## Design System

### Synapse Theme

The app uses a custom design system with:
- **Color Palette:** Cyan-based primary colors with dark mode support
- **Typography:** Inter font family with responsive sizing
- **Components:** Custom-styled Radix UI primitives
- **Animations:** Smooth transitions with Framer Motion

Key CSS variables are defined in `src/styles/synapse-theme.css`:

```css
--synapse-cyan: #00d4ff
--synapse-bg-primary: #020202
--synapse-text-primary: #ffffff
--synapse-text-secondary: #a0a0a0
```

### UI Components

All UI components are built with:
- **Radix UI:** Accessible, unstyled primitives
- **shadcn/ui:** Pre-styled component library
- **Custom styling:** Tailwind CSS + CSS variables

## API Integration

### Auto-Generated Client

The API client is auto-generated from the backend's OpenAPI spec:

```bash
# Regenerate API client (after backend changes)
npm run generate:api
```

This creates TypeScript types and service classes in `src/api/generated/`.

### React Query Hooks

Example usage:

```tsx
import { useQuery } from '@tanstack/react-query';
import { ChatService } from '@/api/generated';

function ChatHistory() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['chat', 'sessions'],
    queryFn: () => ChatService.getSessionsApiV1ChatSessionsGet(),
  });

  // ...
}
```

### WebSocket Connection

Real-time chat uses Socket.IO:

```tsx
import { useChatWebSocket } from '@/modules/chat/hooks/useChatWebSocket';

function Chat({ sessionId }) {
  const ws = useChatWebSocket({
    sessionId,
    onMessage: (message) => console.log(message),
    onChunk: (chunk) => console.log(chunk),
  });

  return <div>Connected: {ws.isConnected}</div>;
}
```

## Development

### Available Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run format       # Format with Prettier
npm run type-check   # TypeScript type checking
npm run clean        # Clean cache
```

### Code Quality

```bash
# Lint and fix
npm run lint -- --fix

# Format all files
npm run format

# Type check without emitting
npm run type-check
```

### Adding New Components

Use shadcn/ui CLI to add components:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
```

## 🏗️ Building for Production

```bash
# Build optimized bundle
npm run build

# Preview production build locally
npm run preview
```

The build output will be in the `dist/` directory.

### Environment Variables for Production

```env
VITE_API_BASE_URL=https://api.synapse.app
VITE_WS_URL=wss://api.synapse.app
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG=false
```

## Key Features

### AI Chat Interface
- **DeepSeek-inspired UI:** Clean, minimal design
- **Real-time streaming:** WebSocket-based responses
- **Session management:** Persistent conversation history
- **Retractable sidebar:** Collapsible chat history

### Note-Taking
- **Rich text editor:** BlockNote with Markdown support
- **Hierarchical organization:** Folder structure
- **Version history:** Track changes over time
- **AI assistance:** Generate summaries and insights

### Study Tools
- **Flashcards:** Spaced repetition system
- **Quizzes:** Multiple question types
- **Progress tracking:** Visual analytics
- **Heatmaps:** Study activity visualization

### Document Management
- **File upload:** PDF, DOCX, TXT support
- **Processing status:** Real-time updates
- **Chunking:** Automatic text segmentation
- **Search:** Vector similarity search

## Customization

### Theming

Edit `src/styles/synapse-theme.css` to customize:

```css
:root {
  --synapse-cyan: #your-color;
  --synapse-bg-primary: #your-bg;
  /* ... */
}
```

### Tailwind Configuration

Modify `tailwind.config.ts` for custom utilities:

```ts
export default {
  theme: {
    extend: {
      colors: {
        'custom-color': '#hexcode',
      },
    },
  },
};
```

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or use a different port
npm run dev -- --port 3002
```

### API Connection Issues

1. Verify backend is running at `http://localhost:8000`
2. Check CORS settings in backend `.env`
3. Ensure `VITE_API_BASE_URL` is correct

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules/.vite
rm -rf node_modules
npm install
```

### Type Errors After API Changes

```bash
# Regenerate API client
npm run generate:api

# Type check
npm run type-check
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Security

- **Authentication:** JWT tokens stored in memory (not localStorage)
- **CSRF Protection:** Token-based validation
- **XSS Prevention:** React's built-in escaping
- **Content Security Policy:** Configured in production

## License

Proprietary - All rights reserved

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linters and type checks
4. Submit a pull request

## Support

For issues or questions, please contact the development team.

---

**Happy coding!**
