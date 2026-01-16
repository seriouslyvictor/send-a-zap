# Hot Reload Fix for Docker on Windows

## The Problem

Next.js hot reload fails in Docker containers on Windows due to **WSL2's filesystem event propagation issues**. When files are mounted from Windows filesystem (`/mnt/c/...`) into a Linux container, inotify events don't propagate properly, causing Next.js to miss file changes.

## Root Cause

- **WSL2 Limitation**: Native Linux `inotify` filesystem events don't work reliably on Windows-mounted volumes
- **Cross-boundary**: Changes made on Windows filesystem aren't detected by Linux container's file watcher
- **Default Behavior**: Next.js relies on native file watching, which doesn't work across this boundary

---

## Solutions (from Best to Quick Fix)

### ✅ Solution 1: Move Project to WSL2 Filesystem (RECOMMENDED)

**Why this works**: Files live in native Linux filesystem where inotify works perfectly.

**How to do it**:

```powershell
# 1. Open WSL2 terminal
wsl

# 2. Create project directory in Linux filesystem
cd ~
mkdir projects
cd projects

# 3. Clone/move your project here
git clone <your-repo> whatsapp9002
# OR move existing: cp -r /mnt/d/Whatsapp9002 ~/projects/

# 4. Work from here - hot reload will work perfectly!
cd whatsapp9002
npm run docker:dev
```

**Access from Windows**:
- Via network path: `\\wsl$\Ubuntu\home\<username>\projects\whatsapp9002`
- VS Code: Install "Remote - WSL" extension, open folder directly in WSL

**Pros**:
- ✅ Native hot reload, no polling needed
- ✅ Faster file operations
- ✅ No workarounds required
- ✅ Best practice for Docker on Windows

**Cons**:
- ⚠️ Requires moving project
- ⚠️ Need to access files via network path or WSL

---

### ✅ Solution 2: Turbopack + Webpack Polling (IMPLEMENTED)

**Status**: Already configured in `next.config.ts`

This forces both Turbopack (default) and Webpack (fallback) to use polling mode for file change detection.

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  // Turbopack configuration (Next.js 16 default)
  experimental: {
    turbo: {
      // Relies on environment variables for polling:
      // WATCHPACK_POLLING=true, CHOKIDAR_USEPOLLING=true
    },
  },

  // Webpack configuration (for --webpack mode)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.watchOptions = {
        poll: 1000,           // Check every second
        aggregateTimeout: 300, // Wait 300ms after change
        ignored: ['**/node_modules', '**/.next'],
      };
    }
    return config;
  },
};
```

**Pros**:
- ✅ Works with files on Windows filesystem
- ✅ No project relocation needed
- ✅ Works with both Turbopack and Webpack
- ✅ Reliable detection

**Cons**:
- ⚠️ Slightly slower (1 second delay)
- ⚠️ Increased CPU usage (polling overhead)

---

### ✅ Solution 3: Use Webpack Instead of Turbopack

Next.js 16 uses Turbopack by default, which has different polling behavior.

**If hot reload still doesn't work**, switch to webpack:

```bash
# Edit docker-compose.dev.yml, change the command to:
command: sh -c "npm install && npm run dev:webpack"
```

Or run locally:
```bash
npm run dev:webpack
```

**Pros**:
- ✅ More mature file watching
- ✅ Webpack polling configuration works reliably

**Cons**:
- ⚠️ Slower build times than Turbopack
- ⚠️ Turbopack is the future of Next.js

---

### ✅ Solution 4: Environment Variables (IMPLEMENTED)

**Status**: Already configured in `docker-compose.dev.yml`

```yaml
environment:
  - WATCHPACK_POLLING=true
  - CHOKIDAR_USEPOLLING=true
  - CHOKIDAR_INTERVAL=1000
  - TURBOPACK_USE_POLLING=true
```

These force all watchers to use polling mode.

---

### ✅ Solution 5: Clear Cache When Stuck

Sometimes Next.js cache gets corrupted:

```bash
# Clear .next cache and restart
npm run docker:dev:clear-cache
npm run docker:dev:restart
```

---

## Quick Diagnosis

### Test if Hot Reload Works:

1. Start dev server:
   ```bash
   npm run docker:dev
   ```

2. Edit a file (e.g., `app/page.tsx`):
   ```tsx
   // Add this line
   console.log('Testing hot reload');
   ```

3. Watch container logs:
   ```bash
   npm run docker:dev:logs
   ```

4. **If you see**: `○ Compiling /...` within 1-2 seconds → **Working! ✅**
5. **If nothing happens** → **Not working ❌**

---

## Recommended Setup

### For Best Performance:
1. **Move project to WSL2** (`~/projects/whatsapp9002`)
2. Remove polling from `next.config.ts` (not needed)
3. Use Turbopack (default `npm run dev`)

### For Keep-on-Windows:
1. **Use current setup** (polling enabled)
2. If issues persist, switch to webpack: `npm run dev:webpack`
3. Accept 1-second delay as trade-off

---

## Troubleshooting

### Hot reload not working at all?

```bash
# 1. Clear cache
npm run docker:dev:clear-cache

# 2. Stop containers
npm run docker:dev:down

# 3. Start fresh
npm run docker:dev

# 4. Watch logs
npm run docker:dev:logs
```

### Still not working?

```bash
# Try webpack mode
# Edit docker-compose.dev.yml line 281:
command: sh -c "npm install && npm run dev:webpack"

# Restart
npm run docker:dev:down
npm run docker:dev
```

### Works but slow (2-5 second delay)?

This is expected with polling. Options:
- **Accept it** - 1-2 second delay is normal
- **Move to WSL2** - instant hot reload

### Only some files trigger hot reload?

```bash
# Check file is not in ignored patterns
# Ensure file is inside mounted volume (not in node_modules/.next)
```

---

## References

- [WSL2 Hot Reload Issues](https://github.com/microsoft/WSL/issues/4739)
- [Docker Desktop WSL2 Backend](https://docs.docker.com/desktop/wsl/)
- [Next.js Webpack Configuration](https://nextjs.org/docs/app/api-reference/next-config-js/webpack)
- [Chokidar Polling](https://github.com/paulmillr/chokidar#performance)

---

## Summary

| Solution | Reliability | Performance | Setup Effort |
|----------|-------------|-------------|--------------|
| **WSL2 Filesystem** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 🔧🔧🔧 |
| **Webpack Polling** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ Done |
| **Switch to Webpack** | ⭐⭐⭐⭐ | ⭐⭐⭐ | 🔧 |
| **Env Variables** | ⭐⭐⭐ | ⭐⭐⭐ | ✅ Done |
| **Clear Cache** | ⭐⭐ | ⭐⭐⭐⭐ | ✅ Easy |

**Current Status**: Solutions 2, 4, and 5 are implemented. Hot reload should work with ~1 second delay.

**For zero-delay**: Move project to WSL2 filesystem (Solution 1).
