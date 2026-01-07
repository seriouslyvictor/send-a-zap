# Quick Start Guide - Docker Setup

Get the entire WhatsApp Automation stack running in 5 minutes!

## Prerequisites

- **Docker Desktop** installed and running
- **Git** (if cloning the repo)

## Steps

### 1. Review Environment Variables

The `.env` file has been created with default Docker settings. **You need to change the passwords!**

Open `.env` and update these values:

```bash
# Generate random keys (use a password generator or run these commands):

# Linux/Mac:
openssl rand -hex 32

# Windows PowerShell:
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Update these in `.env`:
```bash
N8N_API_KEY=your-generated-key-here
EVOLUTION_API_KEY=your-generated-key-here
N8N_PASSWORD=your-secure-password-here
POSTGRES_PASSWORD=your-postgres-password-here
```

### 2. Start the Docker Stack

#### Option A: Development Mode (Recommended for local development)

```bash
npm run docker:dev
```

This starts all services with hot reload for the Next.js app.

#### Option B: Production Mode (Closer to VPS setup)

```bash
npm run docker:prod
```

This starts all services in production mode with optimized builds.

### 3. Wait for Services to Start

Check the logs:
```bash
npm run docker:dev:logs
```

Wait until you see:
- ✅ PostgreSQL: "database system is ready to accept connections"
- ✅ n8n: "Editor is now accessible via"
- ✅ Evolution API: "Server started on port 8080"
- ✅ Next.js: "Ready in X ms"

This usually takes **1-2 minutes** on first run (downloading images).

### 4. Access the Services

Open in your browser:

| Service | URL | Login |
|---------|-----|-------|
| **Next.js App** | http://localhost:3000 | None |
| **n8n** | http://localhost:5678 | Username: `admin`<br>Password: (from `.env`) |
| **Evolution API** | http://localhost:8080 | API Key: (from `.env`) |

### 5. Test the Setup

1. **Open Next.js**: http://localhost:3000
   - You should see the default Next.js page

2. **Login to n8n**: http://localhost:5678
   - Username: `admin`
   - Password: (what you set in `.env`)

3. **Test Evolution API**:
   ```bash
   curl -H "apikey: your-api-key" http://localhost:8080/
   ```
   Should return API information.

## Common Commands

```bash
# Start development stack
npm run docker:dev

# View logs
npm run docker:dev:logs

# Stop everything
npm run docker:dev:stop

# Rebuild after code changes
npm run docker:rebuild

# Clean everything (removes all data!)
npm run docker:clean
```

## Troubleshooting

### "Port already in use"

Something is already using ports 3000, 5678, 8080, or 5432.

**Solution:**
```bash
# Windows - Check what's using port 3000:
netstat -ano | findstr :3000

# Mac/Linux - Check what's using port 3000:
lsof -i :3000

# Kill the process or stop that service
```

### Services won't start

```bash
# Check logs for errors
npm run docker:dev:logs

# Try rebuilding
npm run docker:rebuild
```

### "Database connection failed"

Wait longer - PostgreSQL takes 30-60 seconds to initialize on first run.

```bash
# Watch postgres logs
docker logs whatsapp-postgres-dev -f
```

### Reset Everything

If things are broken, start fresh:

```bash
# Stop and remove everything (including data!)
npm run docker:clean

# Wait a moment, then start again
npm run docker:dev
```

## What's Running?

After successful startup, you have:

- **Next.js App** on port 3000
  - Frontend UI
  - API routes at `/api/*`
  - Hot reload enabled (dev mode)

- **n8n** on port 5678
  - Workflow automation engine
  - Connected to PostgreSQL
  - Accessible at http://localhost:5678

- **Evolution API** on port 8080
  - WhatsApp Web integration
  - Connected to PostgreSQL
  - API endpoint for WhatsApp operations

- **PostgreSQL** on port 5432
  - Shared database
  - 3 databases: `whatsapp_automation`, `n8n`, `evolution`
  - Persistent storage via Docker volumes

## Next Steps

1. **Build your first workflow in n8n**:
   - Go to http://localhost:5678
   - Login with admin credentials
   - Create a new workflow

2. **Create API routes in Next.js**:
   - Add files in `app/api/` directory
   - Use environment variables for API keys
   - Call n8n or Evolution API from server-side

3. **Test WhatsApp integration**:
   - Use Evolution API to create a WhatsApp instance
   - Connect your phone via QR code
   - Send test messages through n8n workflows

## Production Deployment

When ready to deploy to your VPS:

1. Copy the entire project to your VPS
2. Update `.env` with production values
3. Run `docker-compose up -d` (production mode)
4. Set up Nginx reverse proxy (see README-DOCKER.md)
5. Set up SSL with Let's Encrypt

See **README-DOCKER.md** for complete production deployment guide.

## Need Help?

- **Docker issues**: See README-DOCKER.md
- **Next.js issues**: See claude.md
- **Architecture questions**: See claude.md
- **Logs**: `npm run docker:dev:logs`
