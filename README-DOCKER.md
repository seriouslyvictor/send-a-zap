# Docker Setup Guide

Complete guide for running the WhatsApp Automation stack in Docker containers.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development vs Production](#development-vs-production)
- [Environment Configuration](#environment-configuration)
- [Starting the Stack](#starting-the-stack)
- [Accessing Services](#accessing-services)
- [Common Commands](#common-commands)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)

## Prerequisites

1. **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
   - Download: https://docs.docker.com/get-docker/
   - Minimum version: Docker 20.10+, Docker Compose 2.0+

2. **Git** (to clone the repository)

3. **At least 4GB RAM** available for Docker

## Quick Start

### 1. Clone Repository (if not already done)
```bash
git clone <your-repo-url>
cd whatsapp9002
```

### 2. Set Up Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Edit .env and fill in your actual values
# Windows: notepad .env
# Mac/Linux: nano .env
```

**Required values to change in `.env`:**
```bash
N8N_API_KEY=generate-a-random-key-here
EVOLUTION_API_KEY=generate-another-random-key-here
N8N_PASSWORD=your-secure-password
POSTGRES_PASSWORD=your-postgres-password
```

**Generate random API keys:**
```bash
# On Linux/Mac:
openssl rand -hex 32

# On Windows (PowerShell):
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# Or just use a password generator
```

### 3. Start the Stack

**Development mode (with hot reload):**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

**Production mode:**
```bash
docker-compose up -d
```

### 4. Wait for Services to Start
```bash
# Check status
docker-compose ps

# Watch logs
docker-compose logs -f
```

All services should show as "healthy" or "running" after 1-2 minutes.

## Development vs Production

### Development Mode (`docker-compose.dev.yml`)
- **Hot reload** - Code changes reflect immediately
- **Volume mounts** - Local code synced to container
- **Debug mode** - More verbose logging
- **Use case**: Local development

```bash
# Start development stack
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f nextjs

# Stop
docker-compose -f docker-compose.dev.yml down
```

### Production Mode (`docker-compose.yml`)
- **Optimized build** - Multi-stage Docker build
- **Minimal image** - Smaller container size
- **Production settings** - Better performance
- **Use case**: VPS deployment

```bash
# Start production stack
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Environment Configuration

### Local Development (Without Docker)

Use `.env.local`:
```bash
N8N_API_URL=http://localhost:5678
EVOLUTION_API_URL=http://localhost:8080
```

### Docker Development

Use `.env` with Docker service names:
```bash
N8N_API_URL=http://n8n:5678
EVOLUTION_API_URL=http://evolution-api:8080
```

Docker containers communicate via internal network using **service names** (n8n, evolution-api) instead of localhost.

## Starting the Stack

### First Time Setup

1. **Create `.env` file:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

2. **Start containers:**
   ```bash
   # Development
   docker-compose -f docker-compose.dev.yml up -d

   # OR Production
   docker-compose up -d
   ```

3. **Initialize databases** (automatic via `init-db.sql`)
   - Creates `n8n` database
   - Creates `evolution` database
   - Creates `whatsapp_automation` database

4. **Wait for health checks:**
   ```bash
   docker-compose ps
   ```

All services should show "healthy" status.

## Accessing Services

Once running, access services at:

| Service | URL | Credentials |
|---------|-----|-------------|
| **Next.js App** | http://localhost:3000 | None (for now) |
| **n8n** | http://localhost:5678 | Username: `admin`<br>Password: from `.env` (N8N_PASSWORD) |
| **Evolution API** | http://localhost:8080 | API Key: from `.env` (EVOLUTION_API_KEY) |
| **PostgreSQL** | localhost:5432 | User: `postgres`<br>Password: from `.env` |

### Testing Connections

**1. Test Next.js:**
```bash
curl http://localhost:3000
```

**2. Test n8n:**
```bash
curl -u admin:your-password http://localhost:5678/healthz
```

**3. Test Evolution API:**
```bash
curl -H "apikey: your-api-key" http://localhost:8080/
```

**4. Test PostgreSQL:**
```bash
# Connect with psql client
docker exec -it whatsapp-postgres psql -U postgres -d whatsapp_automation

# List databases
\l

# Exit
\q
```

## Common Commands

### Container Management

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart nextjs

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f nextjs

# Check service status
docker-compose ps

# Rebuild containers (after code changes)
docker-compose up -d --build
```

### Database Management

```bash
# Access PostgreSQL shell
docker exec -it whatsapp-postgres psql -U postgres

# Backup database
docker exec whatsapp-postgres pg_dump -U postgres whatsapp_automation > backup.sql

# Restore database
docker exec -i whatsapp-postgres psql -U postgres whatsapp_automation < backup.sql

# View database size
docker exec whatsapp-postgres psql -U postgres -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) FROM pg_database;"
```

### Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect whatsapp_postgres_data

# Remove all volumes (WARNING: Deletes all data!)
docker-compose down -v

# Backup volume
docker run --rm -v whatsapp_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# Restore volume
docker run --rm -v whatsapp_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

### Debugging

```bash
# Enter container shell
docker exec -it whatsapp-nextjs sh

# View container logs
docker logs whatsapp-nextjs

# Inspect container
docker inspect whatsapp-nextjs

# Check resource usage
docker stats

# View network
docker network inspect whatsapp-network
```

## Troubleshooting

### Services Won't Start

**Check logs:**
```bash
docker-compose logs
```

**Common issues:**
1. **Port already in use:**
   ```bash
   # Check what's using the port
   # Windows:
   netstat -ano | findstr :3000
   # Linux/Mac:
   lsof -i :3000
   ```

2. **Missing environment variables:**
   - Ensure `.env` file exists and has all required values
   - Check for typos in variable names

3. **Database connection failed:**
   ```bash
   # Wait for postgres to be ready
   docker-compose logs postgres
   ```

### Next.js Build Fails

```bash
# Check build logs
docker-compose logs nextjs

# Rebuild from scratch
docker-compose build --no-cache nextjs
docker-compose up -d nextjs
```

### Evolution API Not Connecting

1. **Check API key:**
   - Ensure `EVOLUTION_API_KEY` in `.env` matches the key you're using

2. **Check database:**
   ```bash
   docker exec -it whatsapp-postgres psql -U postgres -c "\l"
   # Should see 'evolution' database
   ```

### n8n Can't Connect to Database

```bash
# Check n8n logs
docker-compose logs n8n

# Verify database exists
docker exec -it whatsapp-postgres psql -U postgres -c "\l"

# Check n8n database connection
docker exec whatsapp-n8n env | grep DB_
```

### Reset Everything

**WARNING: This deletes all data!**

```bash
# Stop containers
docker-compose down

# Remove volumes (deletes databases!)
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Start fresh
docker-compose up -d
```

## Production Deployment

### On VPS (Ubuntu/Debian)

1. **Install Docker:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   # Log out and back in
   ```

2. **Clone repository:**
   ```bash
   git clone <your-repo-url>
   cd whatsapp9002
   ```

3. **Set up environment:**
   ```bash
   cp .env.example .env
   nano .env
   # Fill in production values with Docker service names
   ```

4. **Update URLs in `.env` for production:**
   ```bash
   N8N_API_URL=http://n8n:5678
   EVOLUTION_API_URL=http://evolution-api:8080
   ```

5. **Start production stack:**
   ```bash
   docker-compose up -d
   ```

6. **Set up reverse proxy (Nginx):**
   ```bash
   sudo apt install nginx
   ```

   Create `/etc/nginx/sites-available/whatsapp`:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Enable and restart:
   ```bash
   sudo ln -s /etc/nginx/sites-available/whatsapp /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

7. **Set up SSL (Let's Encrypt):**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

8. **Set up automatic updates:**
   ```bash
   # Create update script
   nano update.sh
   ```

   Add:
   ```bash
   #!/bin/bash
   cd /path/to/whatsapp9002
   git pull
   docker-compose down
   docker-compose up -d --build
   docker-compose logs -f
   ```

   Make executable:
   ```bash
   chmod +x update.sh
   ```

### Monitoring

```bash
# Check container health
docker-compose ps

# View resource usage
docker stats

# Set up auto-restart on failure
# (already configured with: restart: unless-stopped)
```

## Docker Compose File Reference

- `docker-compose.yml` - Production configuration
- `docker-compose.dev.yml` - Development configuration with hot reload
- `Dockerfile` - Production build (multi-stage)
- `Dockerfile.dev` - Development build (simpler, faster)

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [n8n Documentation](https://docs.n8n.io/)
- [Evolution API Documentation](https://doc.evolution-api.com/)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)

## Support

For issues:
1. Check logs: `docker-compose logs`
2. Check container status: `docker-compose ps`
3. Review this troubleshooting guide
4. Check the main README.md and claude.md files
