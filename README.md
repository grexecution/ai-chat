# Gibby Chat

A minimal, private AI chat application with authentication, chat interface for Ollama, and full conversation persistence. Built with Next.js, NextAuth, and Prisma.

## Features

- **Authentication**: Email/password login via NextAuth Credentials
- **Account Management**: Edit display name, view email (read-only)
- **Chat Interface**: 
  - Multiple conversations with auto-naming from user queries
  - Streaming responses from Ollama
  - Conversation list with rename/delete
  - Model selection (LLaMA 3.2, LLaMA 3.1 8B, TinyLLaMA)
  - Copy-to-clipboard for messages
  - Background processing (responses save even if you navigate away)
- **Database**: Full persistence with SQLite + Prisma
- **Security**: 
  - Model endpoints never exposed to browser
  - All Ollama calls through Next.js server
  - Military-grade UI theme with security badges
- **UI/UX**:
  - Dark mode with emerald/green security theme
  - German server badges (🇩🇪) and EU compliance indicators (🇪🇺)
  - Smooth animations and glassmorphism effects
  - Perfect viewport handling (100vh)

## Quick Start

1. **Clone and install**:
```bash
git clone [repo]
cd gibby-chat-next
npm install
```

2. **Set up environment**:
```bash
cp .env.example .env
# Edit .env with your values if needed
```

3. **Initialize database**:
```bash
npx prisma migrate dev
npx prisma db seed  # Creates demo@example.com / demo1234
```

4. **Start Ollama** (if not already running):
```bash
# Option 1: Docker
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
docker exec -it ollama ollama pull llama3.2
docker exec -it ollama ollama pull llama3.1:8b
docker exec -it ollama ollama pull tinyllama

# Option 2: Native install
# Follow instructions at https://ollama.ai/
ollama pull llama3.2
ollama pull llama3.1:8b
ollama pull tinyllama
```

5. **Run the app**:
```bash
npm run dev
# Open http://localhost:3000
```

6. **Login**:
- Email: demo@example.com
- Password: demo1234

## Environment Variables

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Ollama
OLLAMA_URL="http://localhost:11434"
```

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, NextAuth, Prisma
- **Database**: SQLite (via Prisma)
- **AI**: Ollama (local LLMs)
- **Styling**: Tailwind CSS with custom dark theme

## Project Structure

```
/app
  /api
    /auth/[...nextauth]/route.ts    # NextAuth configuration
    /v1/chat/completions/route.ts   # OpenAI-compatible chat endpoint
    /conversations/                 # CRUD for conversations
    /account/update/route.ts        # Account management
  /account/page.tsx                 # Account management
  /chat/page.tsx                    # Main chat interface
  /layout.tsx                       # Root layout with Navbar
  /globals.css                      # Global styles with dark theme
  /page.tsx                         # Home page with login

/components
  ChatComposer.tsx                  # Message input with model selector
  ChatThread.tsx                    # Message display with copy button
  ConversationList.tsx              # Sidebar with conversations
  Navbar.tsx                        # Top navigation
  SecurityBadges.tsx                # Security indicators
  SessionProvider.tsx               # NextAuth wrapper

/hooks
  useChat.ts                        # Chat functionality hook

/lib
  auth.ts                           # NextAuth configuration
  prisma.ts                         # Prisma client singleton
  stream.ts                         # Ollama to OpenAI stream conversion
  
/prisma
  schema.prisma                     # Database schema
  seed.ts                           # Database seed script

/types
  next-auth.d.ts                    # NextAuth type extensions

middleware.ts                       # Auth protection middleware
```

## Security Features

1. **Never expose Ollama directly**: All calls go through Next.js API routes
2. **Validate sessions**: Every API call checks authentication
3. **Sanitize inputs**: User messages should be sanitized
4. **Rate limiting**: Ready for implementation in production
5. **HTTPS only**: Use HTTPS in production

## License

Private project - see LICENSE file for details.