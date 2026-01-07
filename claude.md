# WhatsApp Automation Frontend

## Project Overview

This is a full-stack Next.js application for a WhatsApp automation system. It provides a user interface to manage and control WhatsApp operations that are orchestrated through n8n workflows and executed via the Evolution API.

## Architecture

```
┌─────────────────────────────┐
│       Next.js App           │
│  ┌─────────────────────┐   │  ← This Repository
│  │  Frontend (React)   │   │  ← Client Components
│  └──────────┬──────────┘   │
│             │               │
│  ┌──────────▼──────────┐   │
│  │  API Routes         │   │  ← Server-side (Holds secrets securely)
│  │  (Server-side)      │   │
│  └──────────┬──────────┘   │
└─────────────┼───────────────┘
              │ HTTP/REST (With API Keys)
              ├──────────────┐
              ▼              ▼
┌─────────────────┐   ┌─────────────────┐
│      n8n        │   │  Evolution API  │
│ (Core Logic)    │   │  (WhatsApp API) │
└─────────────────┘   └────────┬────────┘
                               │
                               ▼
                          WhatsApp Web
```

### Component Responsibilities

- **Next.js Frontend**: User interface for managing WhatsApp automation workflows, monitoring status, and configuring operations. Client components run in browser.
- **Next.js API Routes**: Server-side endpoints that securely store API keys and communicate with backend services. API keys never exposed to client.
- **n8n**: Core business logic provider and workflow orchestration engine. All automation logic lives here.
- **Evolution API**: WhatsApp communication layer that handles the actual WhatsApp Web integration.
- **PostgreSQL** (Optional): Shared database for n8n, Evolution API, and Next.js if persistent storage is needed.

## Security Architecture

### The Problem: API Keys in Client-Side Code
Pure frontend applications (SPA, Vite, Create React App) bundle all code into JavaScript files downloaded to browsers:
- Anyone can inspect the code and extract API keys
- Exposed API keys = unauthorized access to your services
- Client-side environment variables are NOT secret

### The Solution: Next.js Server-Side API Routes
Next.js solves this with built-in server-side capabilities:

1. **Client Components** → Make requests to Next.js API routes
2. **API Routes (Server)** → Securely store API keys and forward to n8n/Evolution API
3. **Backend Services** → Process requests and respond

```
Browser (Public)     │     Server (Private)
─────────────────────┼─────────────────────────
Client Components    │  API Routes
  ↓                  │    ↓
  Fetch('/api/...')  →  API Route Handler
  No API keys!       │    ✓ Has API keys
                     │    ✓ Calls n8n/Evolution
                     │    ✓ Returns safe data
```

**Key Security Principle**: API keys live in server-side API routes only, never in client components or environment variables prefixed with `NEXT_PUBLIC_`.

## Tech Stack

### Framework
- **Next.js 16** - Full-stack React framework with App Router
- **React 19** - UI library
- **TypeScript 5** - Type safety

### Styling
- **Tailwind CSS 4** - Utility-first CSS framework
- **Shadcn/ui** - Component library (designed for Next.js)
- **Lucide React** - Icons
- **tw-animate-css** - Animation utilities

### Development Tools
- **ESLint** - Code linting with Next.js config
- **PostCSS** - CSS processing for Tailwind

### Key Next.js Features Used
- **App Router** - Modern Next.js routing (app/ directory)
- **Server Components** - React Server Components by default
- **API Routes** - Server-side endpoints for secure backend communication
- **Server Actions** - Direct server-side mutations (optional)
- **Environment Variables** - Secure secret management

## Project Structure

```
whatsapp9002/
├── app/                     # Next.js App Router
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   ├── globals.css          # Global styles
│   ├── api/                 # API Routes (server-side)
│   │   ├── n8n/             # n8n proxy endpoints (to be added)
│   │   │   └── route.ts     # n8n API route handlers
│   │   └── evolution/       # Evolution API proxy endpoints (to be added)
│   │       └── route.ts     # Evolution API route handlers
│   ├── dashboard/           # Dashboard pages (to be added)
│   ├── workflows/           # Workflow management pages (to be added)
│   └── instances/           # WhatsApp instance management (to be added)
├── components/              # React components
│   └── ui/                  # Shadcn UI components
├── lib/                     # Utility functions
│   └── utils.ts             # Helper functions (cn, etc.)
├── hooks/                   # Custom React hooks (to be added)
├── types/                   # TypeScript type definitions (to be added)
├── config/                  # Configuration files (to be added)
│   └── env.ts               # Environment variable validation
├── public/                  # Static assets
├── .env.example             # Environment variables template
├── .env.local               # Local environment variables (gitignored)
├── .gitignore               # Git ignore (includes .env*)
├── components.json          # Shadcn configuration
├── next.config.ts           # Next.js configuration
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.ts       # Tailwind configuration
├── postcss.config.mjs       # PostCSS configuration
├── package.json             # Dependencies and scripts
└── claude.md                # This file
```

### Directory Explanations

- **app/** - Next.js App Router directory (routing based on file structure)
- **app/api/** - Server-side API routes (this is where secrets are safe)
- **components/** - Reusable React components (client and server components)
- **lib/** - Utility functions and helpers
- **public/** - Static files served from root URL

## Container Architecture

All components of this system are designed to run in Docker containers:

```yaml
# Planned container setup (docker-compose.yml - not yet implemented)
services:
  nextjs:
    # Next.js full-stack application
    build: .
    ports:
      - "3000:3000"
    environment:
      # Server-side only - API keys are SAFE here
      - N8N_API_URL=http://n8n:5678
      - N8N_API_KEY=${N8N_API_KEY}
      - EVOLUTION_API_URL=http://evolution-api:8080
      - EVOLUTION_API_KEY=${EVOLUTION_API_KEY}
      # Public variables (optional, for client-side config)
      # - NEXT_PUBLIC_APP_NAME=WhatsApp Automation
    depends_on:
      - n8n
      - evolution-api
    restart: unless-stopped

  n8n:
    # Workflow orchestration engine
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres
    restart: unless-stopped

  evolution-api:
    # WhatsApp Web integration
    image: atendai/evolution-api:latest
    ports:
      - "8080:8080"
    environment:
      - AUTHENTICATION_API_KEY=${EVOLUTION_API_KEY}
      - DATABASE_ENABLED=true
      - DATABASE_CONNECTION_URI=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/evolution
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    # Shared database
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=whatsapp_automation
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
  n8n_data:
```

### Container Communication
- All services communicate via internal Docker network
- **Next.js** (both frontend + API routes) calls:
  - n8n API (http://n8n:5678)
  - Evolution API (http://evolution-api:8080)
- n8n triggers Evolution API workflows
- Database connections use service names as hostnames
- External access only to Next.js on port 3000

### Secret Management in Containers
- API keys stored in `.env` file at project root (never committed to git)
- Docker Compose reads secrets from `.env` file
- **Only Next.js container** receives API keys (stored in server-side environment)
- API keys used exclusively in API routes (server-side), never in client components
- Client components call Next.js API routes at `/api/*` (no secrets needed)

## Integration Patterns

### Client Component → API Route → Backend Services

**CRITICAL**: Client components NEVER communicate directly with n8n or Evolution API. All requests go through Next.js API routes.

#### Client Component → API Route Communication

```typescript
// Client component (runs in browser)
// components/workflow-trigger.tsx
'use client';

export function WorkflowTrigger() {
  async function handleTrigger() {
    // Call Next.js API route, NOT external services
    const response = await fetch('/api/n8n/trigger-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId: 'abc123', data: {...} })
    });

    if (!response.ok) {
      throw new Error('Workflow trigger failed');
    }

    return response.json();
  }

  return <button onClick={handleTrigger}>Trigger Workflow</button>;
}
```

#### API Route → n8n Communication

```typescript
// app/api/n8n/trigger-workflow/route.ts
// Server-side API route (API keys are SAFE here)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // API keys from environment - server-side only!
  const n8nUrl = process.env.N8N_API_URL;
  const n8nApiKey = process.env.N8N_API_KEY;

  if (!n8nUrl || !n8nApiKey) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    // Call n8n with API key (secure!)
    const response = await fetch(`${n8nUrl}/webhook/${body.workflowId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey,
      },
      body: JSON.stringify(body.data),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('n8n API error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger workflow' },
      { status: 500 }
    );
  }
}
```

#### API Route → Evolution API Communication

```typescript
// app/api/evolution/instances/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const evolutionApiKey = process.env.EVOLUTION_API_KEY;

  if (!evolutionUrl || !evolutionApiKey) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
      headers: {
        'apikey': evolutionApiKey,
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Evolution API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch instances' },
      { status: 500 }
    );
  }
}
```

#### n8n → Evolution API Communication

n8n workflows use HTTP Request nodes to interact with Evolution API:
- Send messages
- Create instances
- Manage sessions
- Handle webhooks from Evolution API

## Development Guidelines

### Code Organization
- Keep components small and focused
- Use TypeScript for all new files
- Follow React hooks best practices
- Organize by feature when the app grows

### State Management
- Start with React's built-in state (useState, useContext)
- Add Zustand or similar if complex state management is needed later

### API Integration
- Create a services layer for all API calls
- Use environment variables for API endpoints
- Implement proper error handling and loading states
- Consider React Query for data fetching when needed

### Styling
- Use Tailwind utility classes
- Leverage Shadcn components for consistency
- Follow mobile-first responsive design
- Use Tailwind's built-in dark mode support

## Environment Variables

### Setting Up Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in actual values (NEVER commit `.env.local` to git):
   ```bash
   # .env.local (local development only)

   # Server-side secrets (SAFE - used only in API routes)
   N8N_API_URL=http://localhost:5678
   N8N_API_KEY=your-actual-n8n-api-key-here
   EVOLUTION_API_URL=http://localhost:8080
   EVOLUTION_API_KEY=your-actual-evolution-api-key-here

   # Client-side variables (optional - exposed to browser)
   # NEXT_PUBLIC_APP_NAME=WhatsApp Automation
   ```

### Environment Variable Rules

**CRITICAL SECURITY RULES:**

1. **NEXT_PUBLIC_ prefix exposes variables to browser** - Only use for non-sensitive configuration
   - ✅ `NEXT_PUBLIC_APP_NAME` - OK, just a name
   - ✅ `NEXT_PUBLIC_API_VERSION` - OK, public info
   - ❌ `NEXT_PUBLIC_N8N_API_KEY` - NEVER! Would be visible in browser

2. **Non-prefixed variables stay server-side** - Use for secrets
   - ✅ `N8N_API_KEY` - Safe in API routes
   - ✅ `EVOLUTION_API_KEY` - Safe in API routes
   - These are **only accessible in API routes** and server components

3. **Server-side variables** (SECRETS - used in API routes):
   - `N8N_API_URL` - n8n instance URL
   - `N8N_API_KEY` - n8n API key
   - `EVOLUTION_API_URL` - Evolution API URL
   - `EVOLUTION_API_KEY` - Evolution API key

4. **Client-side variables** (optional, public):
   - `NEXT_PUBLIC_APP_NAME` - Application name
   - `NEXT_PUBLIC_*` - Any public configuration

### Environment File Priority

Next.js loads environment variables in this order (highest priority first):
1. `.env.local` - Local overrides (gitignored, use for secrets)
2. `.env.development` / `.env.production` - Environment-specific
3. `.env` - Default values (can be committed if no secrets)

**Best Practice**: Use `.env.local` for all secrets during development.

## Development Commands

### Next.js Development

```bash
# Development server with hot reload (http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server (run after build)
npm start

# Run linter
npm run lint
```

### Key Development Features
- **Hot Module Replacement (HMR)** - Changes reflect instantly
- **Fast Refresh** - React components update without losing state
- **API Routes** - Server-side endpoints available at `/api/*`
- **TypeScript** - Automatic type checking
- **Single Command** - No need to run multiple services

## Future Considerations

### Features to Implement
- [ ] WhatsApp instance management UI
- [ ] Workflow trigger interface
- [ ] Message scheduling dashboard
- [ ] Contact management
- [ ] Analytics and reporting
- [ ] Real-time status updates (WebSocket/SSE)

### Technical Improvements
- [ ] Implement authentication/authorization (NextAuth.js recommended)
- [ ] Add state management library if needed (Zustand/Jotai for client state)
- [ ] Set up Docker configuration (Dockerfile + docker-compose.yml)
- [ ] Add E2E tests (Playwright recommended for Next.js)
- [ ] Implement error boundary components
- [ ] Add loading skeletons and Suspense boundaries
- [ ] Set up database ORM (Prisma/Drizzle if PostgreSQL is needed)
- [ ] Add API route middleware for auth/validation
- [ ] Implement rate limiting for API routes

## Database Schema (If Needed)

If PostgreSQL is added, potential shared tables:
- `users` - User accounts (shared across all services)
- `whatsapp_instances` - Evolution API instance metadata
- `workflow_configs` - Frontend-specific workflow configurations
- `execution_logs` - Workflow execution history (may be n8n-only)

n8n and Evolution API will have their own schema spaces.

## Security Best Practices

### Critical Security Rules

1. **NEVER expose API keys in client components**
   - All API keys live in API routes (server-side) only
   - Client components call `/api/*` routes, never external services directly
   - Use environment variables WITHOUT `NEXT_PUBLIC_` prefix for secrets

2. **Always use API routes for backend communication**
   - Client Components → Next.js API Routes → Backend services
   - Never call n8n or Evolution API directly from client components
   - API routes validate requests and add authentication

3. **Protect `.env.local` file**
   - `.env.local` is in `.gitignore` - NEVER commit it
   - Use `.env.example` for documentation
   - Share secrets securely (password manager, secure vault)

4. **Validate environment in API routes**
   - Check for required environment variables in API route handlers
   - Return 500 error if configuration is missing
   - Fail fast and provide clear error messages

5. **Container security**
   - Only Next.js container gets API key environment variables
   - Use Docker secrets in production
   - Never log API keys or sensitive data
   - API routes run server-side, secrets never reach browser

### Common Security Mistakes to Avoid

❌ **DON'T** - Call external APIs from client components:
```typescript
// Client component - WRONG!
'use client';

export function WorkflowList() {
  const apiKey = process.env.N8N_API_KEY; // ❌ Undefined in client!
  // Even if you use NEXT_PUBLIC_N8N_API_KEY, it's exposed in browser!

  fetch('http://n8n:5678/api/workflows', {
    headers: { 'X-N8N-API-KEY': apiKey }  // ❌ Exposed to browser!
  });
}
```

✅ **DO** - Call Next.js API routes:
```typescript
// Client component - CORRECT!
'use client';

export function WorkflowList() {
  // Call Next.js API route, NOT external service
  const response = await fetch('/api/n8n/workflows');
  // API route handles authentication server-side ✅
}
```

```typescript
// API route - CORRECT!
// app/api/n8n/workflows/route.ts

export async function GET() {
  // Server-side only - API key is SAFE here
  const apiKey = process.env.N8N_API_KEY;

  const response = await fetch('http://n8n:5678/api/workflows', {
    headers: { 'X-N8N-API-KEY': apiKey }  // ✅ Safe on server!
  });

  return Response.json(await response.json());
}
```

## Important Notes

1. **Security First**: API keys NEVER in client components - always use Next.js API routes (server-side)
2. **Separation of Concerns**: Business logic stays in n8n workflows, Next.js only handles UI/UX and API proxying
3. **Containerization**: All components must be containerizable for consistent deployment
4. **Server vs Client**: Understand Next.js Server Components vs Client Components distinction
5. **Minimal Database**: Avoid database usage unless absolutely necessary
6. **n8n as Brain**: n8n orchestrates everything, Next.js is just the interface
7. **Environment Validation**: Always validate required environment variables in API routes
8. **Single Service**: Next.js combines frontend and backend - simpler than separate BFF

## Why Next.js is Better Than Vite + BFF

This project originally considered using Vite (frontend) + separate BFF service. We chose Next.js instead because:

1. **Simpler Architecture** - One service instead of two
2. **Built-in Security** - API routes handle secrets server-side by default
3. **Less Code** - No need to maintain separate BFF service
4. **Easier Development** - Single `npm run dev` command
5. **VPS-Friendly** - Your VPS can host Next.js easily
6. **Still Uses Shadcn** - Shadcn works perfectly with Next.js (actually designed for it)
7. **Better DX** - Hot reload for both frontend and API routes

### Simplified Flow
```
Old (Vite + BFF):     Browser → Vite → BFF Service → n8n/Evolution
New (Next.js):        Browser → Next.js (Client + API Routes) → n8n/Evolution
                      ✓ One service instead of two
                      ✓ Secrets safe in API routes
                      ✓ Simpler deployment
```

## Related Repositories

- n8n Workflows: (To be created/documented)
- Evolution API Configuration: (To be created/documented)
- Docker Compose Setup: (To be created/documented)

## Contact & Support

This is an internal project. For questions about:
- Frontend issues: Check this repository
- Workflow logic: Check n8n documentation and workflows repository
- WhatsApp integration: Check Evolution API documentation
