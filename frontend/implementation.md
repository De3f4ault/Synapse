# Vercel AI SDK Integration with Search Grounding

## Overview

This document outlines how to integrate the Vercel AI SDK with search grounding capabilities into the Synapse frontend. The integration will replace much of the existing search infrastructure with simpler, more powerful AI-driven search capabilities.

## Current Architecture vs. Proposed Changes

### Current Search System
- Custom-built search engine with text indexing
- Manual search result processing
- Limited grounding capabilities

### Proposed Vercel AI SDK Integration
- Leverage `@ai-sdk/react` for AI interactions
- Use `useChat` hook with data streaming
- Implement search grounding with RAG capabilities
- Simplified search UI components

## Key Files to Modify/Replace

### 1. Chat Message Component (`src/pages/chat/core/components/ChatMessage.tsx`)

Replace the current grounding implementation with Vercel AI SDK's built-in tools:

```tsx
// BEFORE: Manual grounding implementation
<SourcesFooter sources={message.grounding_sources as GroundingSource[]} />

// AFTER: Using Vercel AI SDK tools
import { useChat } from '@ai-sdk/react';

const { messages, append, data } = useChat({
  api: '/api/chat',
  body: {
    // Pass context for grounding
    context: searchResults, // From unified search
  },
});

// Access grounding data from the response
const groundingData = data?.groundingSources;
```

### 2. Search Hook (`src/pages/chat/search/hooks/useConversationSearch.ts`)

Replace with a simpler implementation using Vercel AI SDK:

```tsx
// New simplified search hook using Vercel AI SDK
import { useCompletion } from '@ai-sdk/react';

export function useAISearch() {
  const { complete, completion, isLoading } = useCompletion({
    api: '/api/search',
  });

  const search = async (query: string) => {
    // The AI will handle search and grounding automatically
    return complete(query);
  };

  return {
    search,
    results: completion,
    isLoading,
  };
}
```

### 3. Unified Search Client (`src/api/unified-search/client.ts`)

Simplify with Vercel AI SDK integration:

```tsx
// Simplified unified search with Vercel AI SDK
import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function unifiedSearchWithGrounding(query: string) {
  const result = await streamText({
    model: openai('gpt-4-turbo'),
    messages: [
      {
        role: 'user',
        content: `Search for information about: ${query}`,
      },
    ],
    tools: {
      search: tool({
        description: 'Search the knowledge base',
        parameters: z.object({
          query: z.string(),
        }),
        execute: async ({ query }) => {
          // Your existing search logic here
          return searchKnowledgeBase(query);
        },
      }),
    },
  });

  return result;
}
```

## Implementation Steps

### Step 1: Install Dependencies

```bash
npm install @ai-sdk/react @ai-sdk/openai ai zod
```

### Step 2: Configure Providers

Create `src/lib/ai-config.ts`:

```typescript
import { createOpenAI } from '@ai-sdk/openai';

// Configure OpenAI provider
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? '',
  compatibility: 'strict',
});

// Configure other providers as needed
```

### Step 3: Replace Chat Hook

Replace `src/pages/chat/core/hooks/useSynapseChat.ts`:

```typescript
import { useChat } from '@ai-sdk/react';
import { openai } from '@/lib/ai-config';

export function useSynapseChat({ sessionId }: { sessionId: number }) {
  const {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    data, // Contains grounding information
    error,
  } = useChat({
    api: `/api/chat/sessions/${sessionId}/stream`,
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: {
      mode: 'rag', // Enable RAG mode
    },
  });

  return {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    groundingSources: data?.groundingSources,
    error,
  };
}
```

### Step 4: Simplify Search Components

Replace search components with Vercel AI SDK powered versions:

```tsx
// src/components/search/AISearchBar.tsx
import { useCompletion } from '@ai-sdk/react';

export function AISearchBar() {
  const { complete, completion, isLoading } = useCompletion({
    api: '/api/search',
  });

  return (
    <div>
      <input
        placeholder="Ask anything..."
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            complete(e.currentTarget.value);
          }
        }}
      />
      {isLoading && <div>Searching...</div>}
      {completion && (
        <div className="search-results">
          {/* Render AI-generated search results */}
          <MarkdownRenderer content={completion} />
        </div>
      )}
    </div>
  );
}
```

### Step 5: Backend API Endpoint

Create a new API endpoint for search:

```typescript
// src/pages/api/search.ts
import { streamText, tool } from 'ai';
import { openai } from '@/lib/ai-config';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4-turbo'),
    messages,
    tools: {
      search_documents: tool({
        description: 'Search through documents and knowledge base',
        parameters: z.object({
          query: z.string().describe('Search query'),
        }),
        execute: async ({ query }) => {
          // Your existing search logic
          const results = await searchDocuments(query);
          return {
            results: results.map(doc => ({
              title: doc.title,
              content: doc.snippet,
              url: doc.url,
              confidence: doc.score,
            })),
          };
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
```

## Benefits of This Approach

1. **Reduced Code Complexity**: Eliminate custom search indexing and result processing
2. **Better Grounding**: Leverage Vercel AI SDK's built-in grounding capabilities
3. **Improved Performance**: AI-powered search is more relevant and faster
4. **Enhanced UX**: Better search results with proper citations and sources
5. **Future-Proof**: Built on industry-standard AI SDK

## Migration Path

1. Start with chat message components
2. Replace search hooks incrementally
3. Update backend API endpoints
4. Remove deprecated search infrastructure
5. Test and optimize

## Code Removal Opportunities

After implementing Vercel AI SDK:

- Remove `src/pages/chat/search/engine/` directory
- Remove custom search indexing logic
- Remove manual grounding source handling
- Simplify search result processing
- Eliminate search state management complexity

The Vercel AI SDK handles all these concerns automatically with better performance and reliability.