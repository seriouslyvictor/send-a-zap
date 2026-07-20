# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

WhatsApp automation system built with Next.js 16, integrating n8n workflows and Evolution API for bulk messaging campaigns. The architecture follows a secure server-side pattern where API keys never reach the browser.

## Architecture

```
Browser → Next.js (Client Components + API Routes) → n8n/Evolution API
         └─ API routes hold secrets (server-side only)
         └─ Client components never touch external APIs directly
```

**Critical Security Pattern**: Client components call `/api/*` routes, which then communicate with n8n and Evolution API. API keys live exclusively in API routes (server-side).

## Development Commands

```bash
# Next.js Development
npm run dev              # Start dev server (http://localhost:3000)
npm run dev:webpack      # Use webpack instead of Turbopack (better for Docker hot reload)
npm run build            # Production build (includes Prisma generation)
npm run start            # Start production server
npm run lint             # Run ESLint

# Testing
npm test                 # Run Vitest in watch mode
npm run test:ui          # Run Vitest with UI
npm run test:run         # Run tests once (CI mode)

# Database (Prisma)
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Create and apply migration (dev)
npm run db:migrate:deploy # Apply migrations (production)
npm run db:push          # Push schema without migration (dev only)
npm run db:studio        # Open Prisma Studio GUI

# Docker - Development (with hot reload)
npm run docker:dev       # Start Next.js dev mode in Docker
npm run docker:dev:detached # Start in background
npm run docker:dev:down  # Stop dev containers
npm run docker:dev:logs  # View Next.js logs
npm run docker:dev:restart # Restart Next.js container
npm run docker:dev:clear-cache # Clear .next cache (fixes hot reload issues)

# Docker - Production Stack (all services)
npm run docker:up        # Start entire stack (Next.js, n8n, Evolution, PostgreSQL, Redis, pgAdmin)
npm run docker:down      # Stop all containers
npm run docker:logs      # View all logs
npm run docker:ps        # Check container status
npm run docker:restart   # Restart all services
npm run docker:rebuild   # Rebuild Next.js container
npm run docker:clean     # Remove everything including volumes (destructive!)
```

## Tech Stack

- **Next.js 16** with App Router (React 19, TypeScript 5)
- **Shadcn/ui** + Tailwind CSS 4 for UI
- **Prisma** with PostgreSQL for database
- **Vitest** for testing
- **Evolution API** for WhatsApp Web integration
- **n8n** for workflow orchestration (Docker only)

## Project Structure

```
app/
├── api/                        # Server-side API routes (API keys safe here)
│   ├── campaigns/              # Campaign CRUD + start/pause/resume/cancel
│   ├── evolution/              # Evolution API proxy (connect/status/disconnect)
│   ├── webhooks/evolution/     # Webhook handler for Evolution events
│   └── dashboard/stats/        # Dashboard statistics
├── campaigns/page.tsx          # Campaign management UI
└── page.tsx                    # Home page

lib/
├── evolution-api.ts            # Evolution API client (server-side only)
├── message-renderer.ts         # Template variable replacement
├── phone-validator.ts          # Brazilian phone validation
├── xlsx-parser.ts              # Excel file parsing for contacts
├── phone-column-detector.ts    # Auto-detect phone column in Excel
└── prisma.ts                   # Prisma client singleton

prisma/
└── schema.prisma               # Database schema (Campaign, Message, Template, Blocklist)

workflows/n8n/                  # n8n workflow JSON exports
├── Disparador de Mensagens.json    # Main message sender
├── Disparador Convocação.json      # Campaign dispatcher
├── Iniciar Convocação.json         # Campaign starter
└── Receber Status.json             # Status update receiver

deployment/
├── docker-compose.yml          # Production stack (all 6 services)
├── docker-compose.dev.yml      # Dev mode (Next.js with hot reload)
└── init-db.sql                 # Database initialization
```

## Key Architecture Patterns

### 1. Security: API Keys Never in Client
```typescript
// ❌ WRONG - Client component calling external API
'use client';
export function Component() {
  fetch('http://evolution:8080/instance/...', {
    headers: { apikey: process.env.EVOLUTION_API_KEY } // ❌ Undefined! Exposed!
  });
}

// ✅ CORRECT - Client calls API route, API route calls external API
'use client';
export function Component() {
  fetch('/api/evolution/status'); // ✅ API route handles auth server-side
}
```

### 2. Database Access: Prisma Singleton Pattern
Always use the shared Prisma client from `lib/prisma.ts`:
```typescript
import { getPrisma } from '@/lib/prisma';

export async function GET() {
  const prisma = getPrisma();
  const campaigns = await prisma.campaign.findMany();
  return Response.json(campaigns);
}
```

### 3. Evolution API: Use EvolutionAPI Class
```typescript
import { getEvolutionAPI } from '@/lib/evolution-api';

export async function POST() {
  const api = getEvolutionAPI();
  const instances = await api.fetchInstances();
  return Response.json(instances);
}
```

### 4. Message Rendering: Template Variables
```typescript
import { renderMessage } from '@/lib/message-renderer';

const template = "Olá {{nome}}, seu pedido {{pedido_id}} está pronto!";
const data = { nome: "João", pedido_id: "12345" };
const rendered = renderMessage(template, data);
// Result: "Olá João, seu pedido 12345 está pronto!"
```

### 5. Phone Validation: Brazilian Format
```typescript
import { validatePhone } from '@/lib/phone-validator';

const result = validatePhone("11987654321");
// result.isValid, result.formatted, result.error
```

## Database Schema

**Core Models**:
- `Campaign` - Campaign configuration, status, stats, n8n execution tracking
- `Message` - Individual messages with status (PENDING → SENT → DELIVERED → READ)
- `Template` - Reusable message templates
- `Blocklist` - Phones that should not receive messages

**Campaign Status Flow**: DRAFT → PENDING → RUNNING → PAUSED/COMPLETED/CANCELLED/FAILED
**Message Status Flow**: PENDING → QUEUED → SENT → DELIVERED → READ (or FAILED)

## Environment Variables

**Server-side (safe for secrets)**:
- `EVOLUTION_API_URL` - Evolution API base URL
- `EVOLUTION_API_KEY` - Evolution API authentication key
- `N8N_API_KEY` - n8n API key (if needed)
- `DATABASE_URL` - PostgreSQL connection string
- `POSTGRES_USER`, `POSTGRES_PASSWORD` - Database credentials

**Client-side (exposed to browser, use only for non-sensitive config)**:
- `NEXT_PUBLIC_*` - Any variable with this prefix is visible in browser

**Rule**: Never use `NEXT_PUBLIC_` prefix for API keys or secrets!

## Docker Stack

Two compose files:
1. **docker-compose.dev.yml** - Next.js only, hot reload, local dev
2. **docker-compose.yml** - Full stack: Next.js + n8n + Evolution API + PostgreSQL + Redis + pgAdmin

Services run on:
- Next.js: 3000
- n8n: 5678
- Evolution API: 8080
- PostgreSQL: 5432
- Redis: 6379
- pgAdmin: 4000

## n8n Workflows

Four main workflows orchestrate campaigns:
1. **Iniciar Convocação** - Starts campaign, creates messages in DB
2. **Disparador Convocação** - Batches messages based on campaign config
3. **Disparador de Mensagens** - Sends individual messages via Evolution API
4. **Receber Status** - Receives webhooks and updates message status

Workflows call Next.js API routes to read/update campaign data in database.

## Development Workflow

### Local Development (without Docker)
1. Set up `.env.local` with database connection
2. Run `npm run db:push` to sync schema
3. Run `npm run dev` to start Next.js
4. Access http://localhost:3000

### Docker Development (with hot reload)
1. Configure `.env` file
2. Run `npm run docker:dev`
3. Edit code - changes reflect immediately
4. View logs with `npm run docker:dev:logs`

### Full Stack (n8n + Evolution + Everything)
1. Configure `.env` file
2. Run `npm run docker:up`
3. Access services at their respective ports
4. Import n8n workflows from `workflows/n8n/`
5. Configure Evolution API webhook to point to Next.js `/api/webhooks/evolution`

## Testing

Uses Vitest with happy-dom for DOM simulation:
- Tests are co-located with source files: `*.test.ts`
- Example: `lib/phone-validator.test.ts` tests `lib/phone-validator.ts`
- Run `npm test` for watch mode during development
- Run `npm run test:run` for CI

## Important Patterns

### Campaign Creation Flow
1. Frontend uploads Excel with contacts
2. `xlsx-parser.ts` detects phone column and parses data
3. `phone-validator.ts` validates and formats phones (Brazilian)
4. Create campaign via POST `/api/campaigns`
5. Campaign stored with DRAFT status
6. Frontend calls POST `/api/campaigns/[id]/start`
7. n8n workflows take over execution

### Message Status Updates
1. Evolution API sends webhook to `/api/webhooks/evolution`
2. Webhook handler updates message status in database
3. Campaign stats (sentCount, deliveredCount, readCount) auto-updated
4. Frontend polls campaign status for UI updates

### Server-side Only Code
These must ONLY run in API routes (never client components):
- `lib/evolution-api.ts` - Uses API keys
- `lib/prisma.ts` - Database access
- Any code that reads non-`NEXT_PUBLIC_` env vars

### Component Patterns
- Use `'use client'` for interactive components
- Server Components by default (no directive = server)
- Keep server components for data fetching when possible
- Use Shadcn components for UI consistency

## Common Gotchas

1. **Prisma Client in Development**: Run `npm run db:generate` after schema changes
2. **Docker Build**: `build` script includes `prisma generate` automatically
3. **Hot Reload in Docker**: Use `docker:dev` commands, not `docker:up`
4. **API Keys**: Double-check they're in `.env`, not `.env.local` for Docker
5. **Phone Format**: Evolution API expects format `5511987654321` (country + area + number)
6. **Next.js Hot Reload Not Working (Docker + Windows)**:
   - **Root Cause**: WSL2 filesystem event propagation issues between Windows and Linux container
   - **Quick Fix**: `npm run docker:dev:clear-cache` then `npm run docker:dev:restart`
   - **Turbopack + Webpack polling** configured in `next.config.ts` (1 second delay expected)
   - **Already configured**: Environment variables force polling mode for both bundlers
   - **If still broken**: Switch to webpack mode (edit `docker-compose.dev.yml` line 281 to use `dev:webpack`)
   - **Best Solution**: Move project to WSL2 filesystem (`~/projects/`) for native hot reload
   - **Full Guide**: See `docs/HOT-RELOAD-FIX.md` for comprehensive solutions
7. **Static Mode Message**: If Next.js shows "static mode", clear cache and restart (see #6)

## Why This Architecture?

**Next.js (not Vite + BFF)**:
- Single service = simpler deployment
- Built-in API routes = no separate BFF needed
- Hot reload for both frontend and API routes
- Perfect for VPS hosting

**n8n (not in Next.js)**:
- Complex workflow logic separate from UI
- Visual workflow editor
- Easy to modify automations without code changes

**Prisma (not raw SQL)**:
- Type-safe database access
- Migration management
- Development-friendly with Prisma Studio

## Agent skills

### Issue tracker

Issues live in GitHub Issues (seriouslyvictor/send-a-zap) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: `CONTEXT.md` at the root, ADRs in `docs/adr/`. See `docs/agents/domain.md`.
