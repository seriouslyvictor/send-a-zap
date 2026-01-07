# WhatsApp Automation - Professional Stack

Complete WhatsApp automation system with Next.js frontend, n8n workflows, and Evolution API.

## 🚀 Quick Start

```bash
# 1. Update passwords in .env
# 2. Run one command:
npm run docker:up
```

**Access your services:**
- 🌐 Next.js: http://localhost:3000
- ⚙️ n8n: http://localhost:5678
- 📱 Evolution API: http://localhost:8080
- 🗄️ pgAdmin: http://localhost:4000

## 📁 Professional Structure

```
whatsapp-automation/
├── app/                        # Next.js App Router
│   ├── api/                    # API Routes (server-side)
│   ├── layout.tsx
│   └── page.tsx
├── components/                 # React components
│   └── ui/                    # Shadcn UI components
├── lib/                        # Utility functions
├── public/                     # Static assets
├── deployment/                 # 🎯 All Docker & deployment files
│   ├── docker-compose.yml     # Production stack
│   ├── evolution-api.env      # Evolution API configuration
│   └── init-db.sql            # Database initialization
├── Dockerfile                  # Next.js production build
├── .env                        # Main environment config
├── .env.example                # Environment template
├── package.json                # Dependencies & scripts
└── README.md                   # This file
```

**Why this structure?**
- ✅ Clean root directory - standard Next.js layout
- ✅ All deployment files organized in `deployment/`
- ✅ Easy to navigate and understand
- ✅ Professional and scalable
- ✅ Perfect for Portainer deployment

## 📦 What's Included

**6 services in one unified stack:**

| Service | Port | Description |
|---------|------|-------------|
| **Next.js** | 3000 | Frontend UI with secure API routes |
| **n8n** | 5678 | Workflow automation engine |
| **Evolution API** | 8080 | WhatsApp Web integration |
| **PostgreSQL** | 5432 | Shared database (3 DBs: whatsapp_automation, n8n, evolution) |
| **Redis** | 6379 | Cache & message queue |
| **pgAdmin** | 4000 | Database management UI |

**Key Benefits:**
- ✅ **ONE command** starts everything
- ✅ **ONE PostgreSQL** (not multiple instances!)
- ✅ **ONE deployment folder** - easy to manage
- ✅ **Automatic dependencies** - correct startup order
- ✅ **Production-ready** - VPS & Portainer optimized

## 🔧 Setup Instructions

### Step 1: Configure Environment

Update passwords in `.env`:
```bash
POSTGRES_PASSWORD=your-strong-password
PGADMIN_PASSWORD=your-pgadmin-password
N8N_PASSWORD=your-n8n-password
N8N_API_KEY=generate-random-key
EVOLUTION_API_KEY=your-evolution-key
```

**Generate random keys:**
```powershell
# Windows PowerShell
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

### Step 2: Review Evolution API Config

Check `deployment/evolution-api.env` - all Evolution API settings are here.

### Step 3: Start the Stack

```bash
npm run docker:up
```

Wait 1-2 minutes. Watch logs:
```bash
npm run docker:logs
```

### Step 4: Verify Services

```bash
npm run docker:ps
```

You should see 6 running containers.

## 💻 Commands

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# View logs
npm run docker:logs

# Check status
npm run docker:ps

# Restart services
npm run docker:restart

# Rebuild (after code changes)
npm run docker:rebuild

# Remove everything (including data!)
npm run docker:clean
```

## 🌐 Production Deployment

### Portainer (Recommended for Hostinger VPS)

1. **Install Portainer**:
   ```bash
   docker volume create portainer_data
   docker run -d -p 9000:9000 --name=portainer --restart=always \
     -v /var/run/docker.sock:/var/run/docker.sock \
     -v portainer_data:/data portainer/portainer-ce
   ```

2. **Access Portainer**: http://your-vps-ip:9000

3. **Deploy Stack**:
   - Go to "Stacks" → "Add Stack"
   - Name: `whatsapp-automation`
   - Upload: `deployment/docker-compose.yml`
   - Add environment variables from `.env`
   - Click "Deploy the stack"

4. **Done!** Manage everything via Portainer UI.

### Direct Docker Compose

```bash
# On your VPS
cd whatsapp-automation
docker-compose -f deployment/docker-compose.yml up -d
```

## 🔒 Security

**Environment Variables:**

```bash
# Server-side only (SAFE for API keys)
N8N_API_KEY=secret              # ✅ Safe in Next.js API routes
EVOLUTION_API_KEY=secret        # ✅ Safe in Next.js API routes

# Client-side (exposed to browser)
NEXT_PUBLIC_APP_NAME=MyApp      # ⚠️ Visible in browser
```

**Best Practices:**
- ✅ API keys stay in Next.js API routes (server-side)
- ✅ Never use `NEXT_PUBLIC_` for secrets
- ✅ Never commit `.env` to git
- ✅ Use strong passwords (32+ characters)

## 🐛 Troubleshooting

### Services won't start
```bash
npm run docker:logs
```

### Port conflicts
```bash
netstat -ano | findstr :3000
netstat -ano | findstr :5678
netstat -ano | findstr :8080
```

### Database issues
```bash
docker exec -it whatsapp_postgres psql -U postgres -c "\l"
# Should see: whatsapp_automation, n8n, evolution
```

### Reset everything
```bash
npm run docker:clean    # Deletes all data!
npm run docker:up
```

## 📚 Documentation

- **claude.md** - Full architecture & development guide
- **QUICKSTART.md** - 5-minute quick reference
- **deployment/docker-compose.yml** - Stack configuration

## 🎯 Next Steps

1. ✅ Start stack: `npm run docker:up`
2. ✅ Access n8n: Create workflows at http://localhost:5678
3. ✅ Access Evolution API: Connect WhatsApp at http://localhost:8080
4. ✅ Build frontend: Add components in `app/`
5. ✅ Deploy to VPS: Use Portainer or direct deployment

---

**Clean. Professional. Production-ready.**
