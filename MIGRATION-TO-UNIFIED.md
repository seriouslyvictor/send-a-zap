# Migration Guide: Separate Stacks → Unified Stack

This guide helps you migrate from your current setup (separate docker-compose files) to the new unified stack.

## Current Setup (Before Migration)

You currently have **4 separate docker-compose files**:
- `postgres/docker-compose.yaml` - PostgreSQL + pgAdmin
- `redis/docker-compose.yaml` - Redis cache
- `n8n/docker-compose.yml` - n8n + separate n8n-postgres
- `api/docker-compose.yml` - Evolution API

**Problems with this setup:**
- ❌ **Two PostgreSQL instances** (wasteful!)
- ❌ Four separate stacks to manage
- ❌ Manual network coordination
- ❌ No clear dependency order
- ❌ Complex Portainer management

## New Setup (After Migration)

**ONE unified docker-compose.yml** in the project root:
- ✅ Single PostgreSQL with 3 databases (whatsapp_automation, n8n, evolution)
- ✅ All services in one stack
- ✅ Automatic dependency management
- ✅ One command to start everything
- ✅ Perfect for Portainer

## Migration Steps

### Step 1: Stop All Current Containers

```bash
# Stop each service separately
cd D:\Whatsapp9002\postgres
docker-compose down

cd D:\Whatsapp9002\redis
docker-compose down

cd D:\Whatsapp9002\n8n
docker-compose down

cd D:\Whatsapp9002\api
docker-compose down
```

### Step 2: Backup Your Data (IMPORTANT!)

```bash
# Backup Evolution API instances
docker run --rm -v evolution_instances:/data -v D:\Whatsapp9002\backups:/backup alpine tar czf /backup/evolution_instances_backup.tar.gz -C /data .

# Backup n8n data
docker run --rm -v n8n_storage:/data -v D:\Whatsapp9002\backups:/backup alpine tar czf /backup/n8n_backup.tar.gz -C /data .

# Backup PostgreSQL data (if you have important data)
docker run --rm -v postgres_data:/data -v D:\Whatsapp9002\backups:/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .
```

### Step 3: Copy Evolution API Config

The unified stack reads Evolution API's .env from `./api/.env`:

```bash
# Your existing api/.env is already in place - no action needed!
# Just make sure it exists and has the correct EVOLUTION_API_KEY
```

### Step 4: Update Root .env File

```bash
# Go to project root
cd D:\Whatsapp9002

# Edit .env and update these values:
```

**Copy values from your existing configs:**

1. **PostgreSQL password** (from `postgres/.env` or `n8n/.env`):
   ```bash
   POSTGRES_PASSWORD=your-actual-password
   ```

2. **pgAdmin password** (from `postgres/docker-compose.yaml`):
   ```bash
   PGADMIN_PASSWORD=your-actual-password
   ```

3. **n8n password** (from `n8n/.env` if you had one):
   ```bash
   N8N_PASSWORD=your-actual-password
   ```

4. **Evolution API key** (from `api/.env`):
   ```bash
   EVOLUTION_API_KEY=your-actual-key
   ```

5. **Generate new n8n API key**:
   ```powershell
   # PowerShell
   [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
   ```
   ```bash
   N8N_API_KEY=generated-key-here
   ```

### Step 5: Start the Unified Stack

```bash
# From project root (D:\Whatsapp9002)
docker-compose up -d
```

This will:
- ✅ Create ONE PostgreSQL container with 3 databases
- ✅ Migrate your existing volumes (data preserved!)
- ✅ Start all services in correct order
- ✅ Connect everything via evolution-net

### Step 6: Verify Everything Works

```bash
# Check all services are running
docker-compose ps

# Check logs
docker-compose logs -f

# Access services:
# - Next.js:        http://localhost:3000
# - n8n:            http://localhost:5678
# - Evolution API:  http://localhost:8080
# - pgAdmin:        http://localhost:4000
```

### Step 7: Test Evolution API

```bash
# Test Evolution API connection
curl -H "apikey: your-api-key" http://localhost:8080/

# Check if your instances are still there
# They should be preserved in the evolution_instances volume
```

### Step 8: Test n8n

1. Open http://localhost:5678
2. Your workflows should still be there (from n8n_storage volume)
3. Database connection should work (now using unified postgres)

### Step 9: Clean Up Old Directories (Optional)

Once everything works, you can archive old configs:

```bash
# Create backup folder
mkdir old_configs

# Move old docker-compose files
move postgres old_configs\
move redis old_configs\
move n8n old_configs\

# Keep api/ directory - still needed for Evolution API .env!
```

## Volume Mapping

Your existing Docker volumes will be reused:

| Old Volume | New Volume | Data Preserved |
|------------|------------|----------------|
| `evolution_instances` | `whatsapp_evolution_instances` | ✅ Yes |
| `n8n_storage` | `whatsapp_n8n_data` | ✅ Yes |
| `evolution_redis` | `whatsapp_redis_data` | ⚠️ New (Redis data is cache, safe to lose) |
| `postgres_data` | `whatsapp_postgres_data` | ⚠️ New PostgreSQL |
| `n8n_db_storage` | ❌ Not used | n8n data migrates to unified postgres |

**Important Notes:**
- Evolution API instances: **Preserved** in volume
- n8n workflows: **Preserved** in volume
- n8n database: Will be **recreated** in unified PostgreSQL (workflows safe)

## Rollback (If Something Goes Wrong)

If you need to go back to the old setup:

```bash
# Stop unified stack
docker-compose down

# Start old stacks
cd D:\Whatsapp9002\postgres
docker-compose up -d

cd D:\Whatsapp9002\redis
docker-compose up -d

cd D:\Whatsapp9002\n8n
docker-compose up -d

cd D:\Whatsapp9002\api
docker-compose up -d
```

## Benefits After Migration

1. **Single Command**:
   ```bash
   docker-compose up -d    # Start everything
   docker-compose down     # Stop everything
   docker-compose logs -f  # View all logs
   ```

2. **Portainer Integration**:
   - One stack in Portainer UI
   - Easy to manage and monitor
   - One-click updates

3. **Resource Efficiency**:
   - ONE PostgreSQL instead of TWO
   - Shared network, better communication
   - Lower memory usage

4. **VPS Ready**:
   - Copy one docker-compose.yml to VPS
   - Run `docker-compose up -d`
   - Done!

## Portainer Deployment

### On Hostinger VPS with Portainer:

1. **Copy project to VPS**:
   ```bash
   scp -r D:\Whatsapp9002 user@your-vps:/home/user/
   ```

2. **In Portainer**:
   - Go to "Stacks" → "Add Stack"
   - Name: "whatsapp-automation"
   - Upload `docker-compose.yml`
   - Add environment variables from `.env`
   - Click "Deploy"

3. **Access via domain**:
   - Set up Nginx reverse proxy
   - Point to localhost:3000 (Next.js)
   - All services accessible internally

## Troubleshooting

### "Port already in use"

```bash
# Check what's using ports
netstat -ano | findstr :8080
netstat -ano | findstr :5678
netstat -ano | findstr :5432

# Make sure old containers are stopped
docker ps -a
docker stop <container-id>
```

### "Database connection failed"

```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify databases were created
docker exec -it whatsapp_postgres psql -U postgres -c "\l"

# Should see: whatsapp_automation, n8n, evolution
```

### "Evolution API won't start"

```bash
# Check Evolution API logs
docker-compose logs evolution-api

# Verify api/.env exists and has correct EVOLUTION_API_KEY
cat api/.env
```

### "n8n can't find workflows"

```bash
# Check if n8n_data volume is mounted
docker inspect whatsapp_n8n | grep -A 10 Mounts

# Verify volume exists
docker volume ls | grep n8n
```

## Need Help?

- Check logs: `docker-compose logs -f`
- Check container status: `docker-compose ps`
- View README-DOCKER.md for more details
- View QUICKSTART.md for fresh setup guide

## Summary

**Before**: 4 separate stacks, 2 PostgreSQL instances, manual management
**After**: 1 unified stack, 1 PostgreSQL instance, automatic everything

**Migration time**: ~15 minutes
**Downtime**: ~5 minutes
**Data loss**: None (if you backup first!)
