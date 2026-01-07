# Docker Build & Deployment Fixes

## Issues Fixed

### 1. TypeScript Build Error (Next.js)

**Problem:**
```
Error: Cannot find module 'typescript'
```

**Root Cause:**
Dockerfile was using `npm ci --only=production` which skipped devDependencies like TypeScript. Next.js needs TypeScript to transpile `next.config.ts` during build.

**Fix:**
Changed `Dockerfile` line 12:
```diff
- RUN npm ci --only=production && \
+ RUN npm ci && \
```

**File:** `Dockerfile:12`

---

### 2. Environment Variables Not Found

**Problem:**
```
Error: Database is uninitialized and superuser password is not specified.
The "POSTGRES_PASSWORD" variable is not set. Defaulting to a blank string.
```

**Root Cause:**
Docker Compose looks for `.env` in the same directory as `docker-compose.yml`. Since our compose file is in `deployment/` but `.env` is in the root, variables weren't being loaded.

**Fix:**
Added two solutions:

1. **Added `env_file` directive to all services:**
```yaml
services:
  postgres:
    env_file:
      - ../.env  # Load .env from parent directory
```

2. **Updated npm scripts to use `--env-file` flag:**
```json
{
  "docker:up": "docker-compose --env-file .env -f deployment/docker-compose.yml up -d"
}
```

**Files Modified:**
- `deployment/docker-compose.yml` - Added `env_file: - ../.env` to postgres, pgadmin, n8n, nextjs services
- `package.json` - Updated all docker scripts with `--env-file .env` flag

---

### 3. Obsolete Docker Compose Version Attribute

**Problem:**
```
warning: the attribute `version` is obsolete, it will be ignored
```

**Fix:**
Removed `version: '3.9'` from `deployment/docker-compose.yml` (modern Docker Compose doesn't need it)

**File:** `deployment/docker-compose.yml:19`

---

## Verification

All 6 services now running successfully:

```bash
npm run docker:ps
```

```
NAME                 STATUS
whatsapp_postgres    Up (healthy)
whatsapp_redis       Up (healthy)
whatsapp_n8n         Up (healthy)
whatsapp_evolution   Up
whatsapp_pgadmin     Up
whatsapp_nextjs      Up
```

**Access URLs:**
- Next.js: http://localhost:3000
- n8n: http://localhost:5678
- Evolution API: http://localhost:8080
- pgAdmin: http://localhost:4000

---

## Files Changed

1. `Dockerfile` - Install all dependencies (not just production)
2. `deployment/docker-compose.yml` - Added env_file directives, removed version
3. `package.json` - Added --env-file flag to all docker scripts

---

**Status: ✅ All issues resolved - Stack running successfully!**
