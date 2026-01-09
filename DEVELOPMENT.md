# Development Guide

This guide explains how to work with this project in **development mode** vs **production mode**.

## Quick Start

### Development Mode (Recommended for Development)

```bash
# Start all services in development mode with hot reload
npm run docker:dev

# Your changes to code will reflect immediately at http://localhost:3000
# No need to rebuild Docker images!
```

### Production Mode (For Deployment)

```bash
# Start all services in production mode (optimized build)
npm run docker:up

# Access at http://localhost:3000
# Requires rebuild when code changes
```

---

## Development Mode vs Production Mode

### Development Mode 🔧

**When to use:** Daily development, testing features, iterating on UI/UX

**Advantages:**
- ✅ **Instant hot reload** - Changes appear immediately
- ✅ **No image rebuilds** - Source code mounted as volumes
- ✅ **Faster iteration** - Edit → Save → See changes instantly
- ✅ **Better debugging** - Full Next.js dev mode with stack traces
- ✅ **Live logs** - See console.log output in real-time

**How it works:**
- Next.js runs in dev mode (`npm run dev`)
- Source code mounted from your local filesystem
- Changes to `.tsx`, `.ts`, `.css` files reflect immediately
- Uses separate containers and volumes (no conflict with production)

**Commands:**
```bash
# Start development (with logs in foreground)
npm run docker:dev

# Start development (in background)
npm run docker:dev:detached

# View Next.js logs
npm run docker:dev:logs

# Stop development containers
npm run docker:dev:down

# Restart Next.js container
npm run docker:dev:restart

# Check container status
npm run docker:dev:ps

# Clean up (removes volumes)
npm run docker:dev:clean
```

### Production Mode 🚀

**When to use:** Final testing before deployment, production deployment on VPS

**Advantages:**
- ✅ **Optimized build** - Minified, tree-shaken, production-ready
- ✅ **Better performance** - Faster page loads, smaller bundle size
- ✅ **Standalone mode** - Minimal dependencies, smaller image
- ✅ **Production-ready** - What users will actually use

**Disadvantages:**
- ❌ **No hot reload** - Must rebuild image for code changes
- ❌ **Slower iteration** - Rebuild takes 2-5 minutes

**How it works:**
- Next.js built as optimized production bundle
- Source code baked into Docker image
- Changes require image rebuild (`npm run docker:rebuild`)

**Commands:**
```bash
# Start production (recommended for first time)
npm run docker:up

# Stop production containers
npm run docker:down

# View all logs
npm run docker:logs

# Check container status
npm run docker:ps

# Restart containers
npm run docker:restart

# Rebuild Next.js image (when code changes)
npm run docker:rebuild

# Clean up (removes volumes)
npm run docker:clean
```

---

## Typical Development Workflow

### Daily Development

```bash
# 1. Start development mode (first time or after docker:dev:down)
npm run docker:dev

# 2. Edit your code in VS Code
#    - Changes appear immediately at http://localhost:3000
#    - Hot reload works for React components, styles, etc.

# 3. View logs (optional, in another terminal)
npm run docker:dev:logs

# 4. When done for the day
npm run docker:dev:down
```

### Testing Production Build

Before deploying or sharing with others, test the production build:

```bash
# 1. Stop development mode
npm run docker:dev:down

# 2. Build and start production mode
npm run docker:up

# 3. Test at http://localhost:3000

# 4. If code changes needed
npm run docker:rebuild

# 5. Switch back to development
npm run docker:down
npm run docker:dev
```

### Switching Between Modes

Development and production use **separate containers and volumes**, so you can switch freely:

```bash
# From development to production
npm run docker:dev:down
npm run docker:up

# From production to development
npm run docker:down
npm run docker:dev
```

Both can even run simultaneously (though not recommended):
- Development: `localhost:3000` (port can be changed)
- Production: `localhost:3000` (port can be changed)

---

## What Changes Trigger Rebuild?

### Development Mode ✅ No Rebuild Needed

These changes reflect **immediately** in development mode:
- React components (`.tsx`, `.jsx`)
- TypeScript files (`.ts`)
- Stylesheets (`.css`, Tailwind classes)
- Client components (`'use client'`)
- Server components
- API routes (`app/api/**`)
- Layout files
- Page files
- Configuration changes (most)

### Production Mode ❌ Rebuild Required

In production mode, **ANY code change** requires rebuild:
```bash
npm run docker:rebuild
```

This includes:
- All source code changes
- Configuration changes
- Environment variable changes (some)
- Package dependency changes

---

## Troubleshooting

### "I made changes but don't see them in development mode"

1. **Check if container is running:**
   ```bash
   npm run docker:dev:ps
   ```

2. **Check Next.js logs for errors:**
   ```bash
   npm run docker:dev:logs
   ```

3. **Hard refresh browser:** `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

4. **Restart Next.js container:**
   ```bash
   npm run docker:dev:restart
   ```

5. **Full restart:**
   ```bash
   npm run docker:dev:down
   npm run docker:dev
   ```

### "Hot reload not working"

Development mode has polling enabled (`WATCHPACK_POLLING=true`) which should work on all systems. If it still doesn't work:

1. Check if you're running the dev compose file:
   ```bash
   docker ps --filter "name=whatsapp_nextjs_dev"
   ```

2. Try manual restart:
   ```bash
   npm run docker:dev:restart
   ```

### "Port 3000 already in use"

Stop any running Next.js or other services on port 3000:

```bash
# Stop all containers
npm run docker:dev:down
npm run docker:down

# Check what's using port 3000
# Windows:
netstat -ano | findstr :3000

# Linux/Mac:
lsof -i :3000
```

### "Can't access database from local dev"

In development mode with Docker, database runs inside container. To access:

**Option 1: Use pgAdmin** (Recommended)
- http://localhost:4000
- Email: `admin@admin.com`
- Password: (from your `.env` file)

**Option 2: Connect directly**
- Host: `localhost`
- Port: `5432`
- User: `postgres`
- Password: (from your `.env` file)

---

## Environment Variables

Both modes use the same `.env` file. No changes needed when switching between development and production.

The main difference:
- **Development:** `NODE_ENV=development` (set automatically)
- **Production:** `NODE_ENV=production` (set automatically)

---

## Performance Comparison

| Operation | Development Mode | Production Mode |
|-----------|------------------|-----------------|
| First start | ~30s | ~2-5 min (build) |
| Code change | Instant (hot reload) | ~2-5 min (rebuild) |
| Page load | Slower (dev bundles) | Faster (optimized) |
| Bundle size | Larger (unminified) | Smaller (minified) |
| Error messages | Detailed | Minimal |

---

## Best Practices

1. **Use development mode for daily work**
   - Faster feedback loop
   - Better debugging experience

2. **Test production builds before deploying**
   - Catch production-only issues
   - Verify optimizations work

3. **Clean up volumes periodically**
   ```bash
   npm run docker:dev:clean
   npm run docker:clean
   ```

4. **Don't commit `.env` file**
   - Already in `.gitignore`
   - Use `.env.example` as template

5. **Keep both modes in sync**
   - Same `.env` file
   - Same docker network configuration

---

## FAQ

**Q: Can I run both development and production at the same time?**
A: Yes, they use different containers, but it's not recommended (resource intensive).

**Q: Will my database data persist between modes?**
A: No, development and production use separate volumes. Use `pgAdmin` to export/import if needed.

**Q: Do I need to stop development mode before building production?**
A: No, but recommended to avoid confusion about which version you're testing.

**Q: How do I deploy to production?**
A: Use production mode (`npm run docker:up`). See `CLAUDE.md` for full deployment guide.

**Q: What about n8n, Evolution API, etc.?**
A: They use the same configuration in both modes. Only Next.js differs (dev vs production build).

---

## Summary

| Task | Command | Mode |
|------|---------|------|
| Daily development | `npm run docker:dev` | Development |
| View live logs | `npm run docker:dev:logs` | Development |
| Stop dev containers | `npm run docker:dev:down` | Development |
| Production build | `npm run docker:up` | Production |
| Rebuild after changes | `npm run docker:rebuild` | Production |
| Stop prod containers | `npm run docker:down` | Production |

**Remember:** Development mode = instant changes, Production mode = optimized build
