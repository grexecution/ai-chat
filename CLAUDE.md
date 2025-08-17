# AI Chat App - Development Guide

## Project Overview

A minimal, private AI chat application with authentication, chat interface for Ollama, and full conversation persistence. Built with Next.js, NextAuth, and Prisma.

### ✅ Implemented Features
- **Authentication**: Email/password login via NextAuth Credentials
- **Account Management**: Edit display name, view email (read-only)
- **Chat Interface**: 
  - Multiple conversations with auto-naming from user queries
  - Streaming responses from Ollama
  - Conversation list with rename/delete
  - Model selection (LLaMA 3.2, LLaMA 3.1 8B, TinyLLaMA)
  - Copy-to-clipboard for messages
  - Background processing (responses save even if you navigate away)
- **Database**: Full persistence with PostgreSQL + Prisma
- **Security**: 
  - Model endpoints never exposed to browser
  - All Ollama calls through Next.js server
  - Military-grade UI theme with security badges
- **UI/UX**:
  - Dark mode with emerald/green security theme
  - German server badges (🇩🇪) and EU compliance indicators (🇪🇺)
  - Smooth animations and glassmorphism effects
  - Perfect viewport handling (100vh)

## 📁 Project Structure

```
/app
  /api
    /auth/[...nextauth]/route.ts    # NextAuth configuration
    /v1/chat/completions/route.ts   # OpenAI-compatible chat endpoint
    /conversations/                  # CRUD for conversations
    /account/update/route.ts         # Account update endpoint
  /account/page.tsx                  # Account management
  /chat/page.tsx                     # Main chat interface
  /layout.tsx                        # Root layout with Navbar
  /page.tsx                          # Landing/login page
  /globals.css                       # Global styles with dark theme

/components
  ChatComposer.tsx                   # Message input with model selector (memoized)
  ChatThread.tsx                     # Message display with copy button (memoized)
  ConversationList.tsx               # Sidebar with conversations (memoized)
  Navbar.tsx                         # Top navigation
  SecurityBadges.tsx                 # Security indicators
  ErrorBoundary.tsx                  # React error boundary for graceful error handling
  /ui
    ErrorMessage.tsx                 # Reusable error message component
    LoadingSpinner.tsx               # Reusable loading spinner component

/hooks
  useChat.ts                         # Custom hook for chat functionality
  useErrorHandler.ts                 # Custom hook for consistent error handling

/lib
  auth.ts                            # NextAuth configuration with JWT
  prisma.ts                          # Prisma client singleton
  stream.ts                          # Ollama to OpenAI stream conversion
  logger.ts                          # Professional logging utility
  constants.ts                       # Application-wide constants
  utils.ts                           # Utility functions

/types
  index.ts                           # Centralized TypeScript type definitions
  
/prisma
  schema.prisma                      # Database schema
  /migrations                        # Database migrations

/docker
  docker-compose.ollama.yml          # Ollama container
  docker-compose.postgres.yml        # PostgreSQL container

# Configuration Files
.eslintrc.json                       # ESLint configuration
tsconfig.json                        # TypeScript configuration
next.config.ts                       # Next.js configuration
```

## 🔧 Environment Variables

```env
# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_chat?schema=public"

# Ollama
OLLAMA_URL=http://localhost:11434

# Optional: Default model
DEFAULT_MODEL=llama3.2
```

## 🚀 Quick Start

1. **Clone and install**:
```bash
git clone [repo]
cd gibby-chat-next
npm install
```

2. **Set up environment**:
```bash
cp .env.example .env
# Edit .env with your values
```

3. **Start services**:
```bash
# PostgreSQL
docker compose -f docker/docker-compose.postgres.yml up -d

# Ollama
docker compose -f docker/docker-compose.ollama.yml up -d

# Pull models
docker exec -it ollama ollama pull llama3.2
docker exec -it ollama ollama pull llama3.1:8b
docker exec -it ollama ollama pull tinyllama
```

4. **Initialize database**:
```bash
npx prisma migrate dev
npx prisma db seed  # Creates demo@example.com / demo1234
```

5. **Run the app**:
```bash
npm run dev
# Open http://localhost:3000
```

## 🏗️ Architecture & Coding Standards

### Code Organization Principles

1. **Component Structure**:
   - All components use React.memo for performance optimization
   - Callbacks are wrapped in useCallback to prevent unnecessary re-renders
   - Complex computations use useMemo
   - Components are kept small and focused on single responsibilities

2. **Type Safety**:
   - Centralized type definitions in `/types/index.ts`
   - No `any` types - use `unknown` and proper type guards
   - Interfaces for all component props
   - Strict null checks enabled

3. **Error Handling**:
   - ErrorBoundary component wraps main app sections
   - useErrorHandler hook for consistent error handling
   - All async operations wrapped in try-catch blocks
   - User-friendly error messages with retry options

4. **Performance Optimizations**:
   - React.memo on all presentational components
   - useCallback for event handlers and functions passed as props
   - useMemo for expensive computations and derived state
   - Proper dependency arrays to prevent infinite loops

5. **Code Style**:
   - ESLint configuration enforces consistent style
   - Unused variables prefixed with underscore (_error, _session)
   - JSDoc comments for complex functions
   - Descriptive variable and function names

### Next.js 15 Compatibility

**IMPORTANT**: This project uses Next.js 15.4.6, which has breaking changes:

1. **Async Route Params**:
   ```typescript
   // ❌ OLD (Next.js 14)
   export async function GET(req: Request, { params }: { params: { id: string } }) {
     const id = params.id
   }
   
   // ✅ NEW (Next.js 15)
   export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
     const { id } = await params
   }
   ```

2. **NextAuth Type Compatibility**:
   ```typescript
   // Convert null to undefined for NextAuth
   return {
     id: user.id,
     email: user.email,
     name: user.name || undefined // NOT null
   }
   ```

### Constants & Configuration

All hardcoded values should be in `/lib/constants.ts`:

```typescript
export const API_ENDPOINTS = {
  CHAT: '/api/v1/chat/completions',
  CONVERSATIONS: '/api/conversations',
  ACCOUNT_UPDATE: '/api/account/update',
}

export const UI_CONFIG = {
  ANIMATION_DELAY: { SHORT: 200, MEDIUM: 400, LONG: 600 },
  MESSAGE: { MAX_LENGTH: 2000, WARNING_THRESHOLD: 1800 },
  TITLE: { MAX_LENGTH: 50, PREVIEW_WORDS: 4 },
  COPY_FEEDBACK_DURATION: 2000,
}

export const MODEL_CONFIG = {
  DEFAULT: 'llama3.2:latest',
  TEMPERATURE: 0.7,
  TOP_P: 0.9,
}
```

### Logging Standards

Use the centralized logger instead of console.log:

```typescript
import { logger } from '@/lib/logger'

// ❌ BAD
console.log('Something happened')

// ✅ GOOD
logger.info('Something happened')
logger.error('Error occurred', error)
logger.warn('Warning', data)
logger.debug('Debug info', details)
```

### Custom Hooks

1. **useChat**: Manages chat state and streaming
   - Handles message sending and receiving
   - Manages streaming state
   - Auto-creates conversations

2. **useErrorHandler**: Consistent error handling
   - Provides error state management
   - Logging integration
   - User-friendly error messages

### Component Patterns

```typescript
// Standard component structure
import { memo, useCallback, useMemo } from 'react'

interface ComponentProps {
  // Props interface
}

function Component({ prop1, prop2 }: ComponentProps) {
  // State hooks
  const [state, setState] = useState()
  
  // Memoized values
  const memoizedValue = useMemo(() => {
    return expensiveComputation()
  }, [dependency])
  
  // Callbacks
  const handleClick = useCallback(() => {
    // Handler logic
  }, [dependency])
  
  // Effects
  useEffect(() => {
    // Effect logic
  }, [dependency])
  
  // Render
  return <div>...</div>
}

export default memo(Component)
```

## 🎯 Key Implementation Details

### Authentication Flow
- Uses NextAuth with Credentials provider
- Passwords hashed with bcrypt
- Session includes user ID, email, and name
- Protected routes use `requireUser()` helper

### Chat Streaming
- OpenAI-compatible API at `/api/v1/chat/completions`
- Converts Ollama's format to OpenAI's SSE format
- Background processing ensures messages save even if user navigates away
- Auto-renames conversations based on first user message (3-4 words)

### Database Schema
```prisma
User -> Conversation -> Message
User -> Usage (monthly tracking)
```

### Model Management
- Supports multiple Ollama models
- Model stored per conversation
- Easy to add new models in `availableModels` array

## 📚 Resources

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [NextAuth Documentation](https://next-auth.js.org/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [React Performance](https://react.dev/reference/react/memo)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

## 🤝 Contributing & Development Guidelines

### Pre-Development Checklist

1. **Read this entire CLAUDE.md file**
2. **Check TypeScript compilation**: `npx tsc --noEmit`
3. **Run ESLint**: `npm run lint`
4. **Test build**: `npm run build`

### When Adding Features

1. **Follow Architecture Standards**:
   - Use centralized types from `/types/index.ts`
   - Add constants to `/lib/constants.ts`
   - Use logger instead of console.log
   - Wrap components in React.memo
   - Use useCallback and useMemo appropriately

2. **Component Development**:
   - Create reusable UI components in `/components/ui/`
   - Use custom hooks for complex logic
   - Add proper TypeScript interfaces
   - Include JSDoc comments for complex functions
   - Handle errors with try-catch and useErrorHandler

3. **API Route Development**:
   - Follow Next.js 15 async params pattern
   - Validate session with getServerSession
   - Return proper HTTP status codes
   - Log errors with logger utility
   - Never expose Ollama directly to client

4. **Testing Requirements**:
   - Run `npx tsc --noEmit` - must pass
   - Run `npm run lint` - should only have underscore warnings
   - Run `npm run build` - must succeed
   - Test all affected functionality manually

5. **Code Review Checklist**:
   - [ ] No hardcoded values (use constants)
   - [ ] No console.log (use logger)
   - [ ] Proper error handling
   - [ ] Components are memoized
   - [ ] Callbacks use useCallback
   - [ ] Complex calculations use useMemo
   - [ ] TypeScript types are properly defined
   - [ ] Dependencies arrays are correct
   - [ ] No ESLint errors (warnings for _vars are OK)
   - [ ] Build passes successfully

### Common Pitfalls to Avoid

1. **Next.js 15 Issues**:
   - Don't forget to await params in API routes
   - Don't return null from NextAuth (use undefined)

2. **Performance Issues**:
   - Don't pass inline functions as props
   - Don't forget dependency arrays
   - Don't create new objects/arrays in render

3. **Type Safety Issues**:
   - Don't use `any` type
   - Don't use non-null assertions (!)
   - Don't ignore TypeScript errors

4. **Security Issues**:
   - Never expose Ollama URL to client
   - Always validate user sessions
   - Never log sensitive data
   - Sanitize user inputs

## 🔮 Future Enhancements

### Priority 1: Web Search Integration
- [ ] Integrate web search API (Brave, DuckDuckGo, etc.)
- [ ] Add source citations in UI
- [ ] Implement search result caching

### Priority 2: Enhanced Features
- [ ] Real password change functionality
- [ ] Two-factor authentication
- [ ] Export/import conversations
- [ ] Markdown rendering with syntax highlighting
- [ ] Image upload support
- [ ] Voice input/output

### Priority 3: Performance & Monitoring
- [ ] Implement proper caching strategies
- [ ] Add rate limiting middleware
- [ ] Optimize database queries with indexes
- [ ] Add telemetry with OpenTelemetry
- [ ] Implement request/response logging

### Priority 4: Developer Experience
- [ ] Add unit tests with Jest
- [ ] Add E2E tests with Playwright
- [ ] Set up CI/CD pipeline
- [ ] Add Storybook for component development
- [ ] Create developer setup script

## 📝 License

Private project - see LICENSE file for details.