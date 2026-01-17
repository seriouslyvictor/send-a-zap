# Testing Plan for CI/CD Improvements

This document outlines how to test all the improvements made to the codebase.

## Changes Made

1. ✅ Fixed MessageStatus type errors in API routes
2. ✅ Kept Prisma 7.2.0 (secure version)
3. ✅ Added `typecheck` npm script
4. ✅ Added `@types/canvas-confetti` type definitions
5. ✅ Created comprehensive CI workflow with PostgreSQL service
6. ✅ Created Docker publish workflow with security scanning
7. ✅ Updated Dockerfile with build args support

---

## Phase 1: Local Testing (5-10 minutes)

Run these tests on your local machine to verify code quality.

### 1.1 Install Dependencies

```bash
# Install new type definitions
npm install

# Verify Prisma client is up to date
npx prisma generate
```

**Expected Output**:
```
✔ Generated Prisma Client (v7.2.0)
```

### 1.2 Type Checking

```bash
npm run typecheck
```

**Expected Output**:
- ✅ **0 errors** in `app/api/**` (all API routes)
- ⚠️ **10 warnings** in UI components (pre-existing, non-blocking):
  - `app/page.tsx` - Campaign details modal prop type
  - `components/ui/glow-menu.tsx` - Framer Motion types
  - `components/client-layout.tsx` - Icon className props
  - `lib/evolution-api.ts` - Instance property type
  - Test files - Minor type assertions

**Status**: ✅ PASS if no errors in API routes

### 1.3 Linting

```bash
npm run lint
```

**Expected Output**:
```
✓ No ESLint warnings or errors
```

**Status**: ✅ PASS if no errors

### 1.4 Run Tests

```bash
npm run test:run
```

**Expected Output**:
```
✓ lib/phone-validator.test.ts (XX tests)
✓ lib/message-renderer.test.ts (XX tests)
✓ lib/xlsx-parser.test.ts (XX tests)

Test Files  3 passed (3)
Tests  XX passed (XX)
```

**Status**: ✅ PASS if all tests pass

### 1.5 Production Build

```bash
# Set a temporary DATABASE_URL for build
$env:DATABASE_URL="postgresql://test:test@localhost:5432/test?schema=public"

npm run build
```

**Expected Output**:
```
✓ Generating Prisma Client...
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                    XXX kB        XXX kB
└ ○ /campaigns                           XXX kB        XXX kB
...
```

**Status**: ✅ PASS if build completes without errors

---

## Phase 2: Docker Build Testing (10-15 minutes)

Test the Docker build locally to ensure it works before pushing.

### 2.1 Test Docker Build (Without Cache)

```bash
docker build \
  --build-arg DATABASE_URL=postgresql://build:build@localhost:5432/build?schema=public \
  --no-cache \
  -t whatsapp-nextjs:test \
  .
```

**Expected Output**:
```
[+] Building XXXs (3/3) FINISHED
 => [deps 1/3] WORKDIR /app
 => [deps 2/3] COPY package.json package-lock.json ./
 => [deps 3/3] RUN npm ci && npm cache clean --force
 => [builder 1/5] WORKDIR /app
 => [builder 2/5] COPY --from=deps /app/node_modules ./node_modules
 => [builder 3/5] COPY . .
 => [builder 4/5] RUN npm run build
 => [runner 1/4] WORKDIR /app
 => exporting to image
 => => writing image sha256:...
 => => naming to docker.io/library/whatsapp-nextjs:test
```

**Status**: ✅ PASS if build completes successfully

### 2.2 Test Docker Build (With Cache - Fast)

```bash
docker build \
  --build-arg DATABASE_URL=postgresql://build:build@localhost:5432/build?schema=public \
  -t whatsapp-nextjs:test-cached \
  .
```

**Expected Output**: Should complete in ~30-60 seconds (vs 3-5 minutes without cache)

**Status**: ✅ PASS if build is significantly faster

### 2.3 Run Docker Container (Smoke Test)

```bash
# Start container
docker run -d \
  --name whatsapp-test \
  -p 3001:3000 \
  -e DATABASE_URL=postgresql://test:test@localhost:5432/test?schema=public \
  -e EVOLUTION_API_URL=http://localhost:8080 \
  -e EVOLUTION_API_KEY=test_key \
  -e N8N_WEBHOOK_URL=http://localhost:5678 \
  whatsapp-nextjs:test

# Wait for startup
timeout /t 5

# Check if container is running
docker ps | findstr whatsapp-test

# Test health (should return HTML)
curl http://localhost:3001

# Check logs
docker logs whatsapp-test

# Cleanup
docker stop whatsapp-test
docker rm whatsapp-test
```

**Expected Output**:
- Container starts without errors
- Port 3001 responds with Next.js HTML
- No crash logs in `docker logs`

**Status**: ✅ PASS if container runs and responds

---

## Phase 3: CI Workflow Testing (15-20 minutes)

Test the CI workflow before merging to main.

### Option A: Test with GitHub Actions (Recommended)

```bash
# Create a test branch
git checkout -b test/ci-pipeline

# Stage all changes
git add .

# Commit changes
git commit -m "test: verify CI/CD pipeline

- Fix MessageStatus type errors
- Add comprehensive CI workflow with Prisma validation
- Add Docker publish workflow with security scanning
- Update Dockerfile with build args support
"

# Push to GitHub (triggers CI workflow)
git push -u origin test/ci-pipeline
```

**What Will Happen**:
1. GitHub Actions will start CI workflow automatically
2. You'll see the workflow at: `https://github.com/YOUR_USERNAME/whatsapp9002/actions`

**Expected CI Steps** (all should pass):
```
✓ Checkout code
✓ Use Node.js (with npm cache)
✓ Cache Next.js build
✓ Install dependencies (npm ci)
✓ Generate Prisma Client
✓ Validate Prisma schema
✓ Run database migrations
✓ Type check
✓ Lint
✓ Run tests
✓ Build (production)
```

**Timing**: ~3-5 minutes first run, ~2-3 minutes with cache

**Status**: ✅ PASS if all steps complete successfully

### Option B: Test Locally with Act (Advanced)

Install Act to run GitHub Actions locally:

```bash
# Install Act: https://github.com/nektos/act
# Windows: choco install act-cli
# Or download from: https://github.com/nektos/act/releases

# Run CI workflow locally
act pull_request --container-architecture linux/amd64
```

**Note**: This requires Docker and can be slow. Option A is recommended.

---

## Phase 4: Docker Publish Workflow Testing (After CI Passes)

### 4.1 Verify Workflow Won't Run Without CI

After pushing to your test branch, check that:
- ❌ Docker publish workflow **does NOT run** (because it's not the main branch)
- ✅ Only CI workflow runs

**This is correct behavior!** Docker publish only runs on `main` branch after CI passes.

### 4.2 Test Docker Publish (When Ready to Merge)

**Before merging to main, ensure**:
1. ✅ CI workflow passed on test branch
2. ✅ Docker Hub secrets are configured:
   - Go to: `https://github.com/YOUR_USERNAME/whatsapp9002/settings/secrets/actions`
   - Verify: `DOCKERHUB_USERNAME` exists
   - Verify: `DOCKERHUB_TOKEN` exists

**Then create a Pull Request**:
```bash
# Create PR from test branch to main
# GitHub UI: Compare & pull request button

# Or use GitHub CLI:
gh pr create \
  --title "Fix CI/CD pipeline and add quality gates" \
  --body "
## Changes
- Fixed MessageStatus type errors in API routes
- Added comprehensive CI workflow with database validation
- Added Docker publish workflow with security scanning
- Updated Dockerfile to support build arguments

## Testing
- ✅ Local tests pass
- ✅ Docker build succeeds
- ✅ CI workflow passes

## Deployment
This will trigger Docker image build and publish to Docker Hub after merge.
"
```

**After Merging PR to Main**:

1. **CI Workflow Runs First** (~3-5 min)
   ```
   ✓ All CI checks (type check, lint, tests, build)
   ```

2. **Docker Workflow Runs After CI Passes** (~5-10 min)
   ```
   ✓ Checkout repository
   ✓ Set up Docker Buildx
   ✓ Log in to Docker Hub
   ✓ Extract Docker metadata
   ✓ Build and push Docker image (AMD64 + ARM64)
   ✓ Run Trivy vulnerability scanner
   ✓ Upload Trivy scan results
   ```

3. **New Docker Image Published**:
   - `seriouslyvictor/whatsapp-nextjs:main`
   - `seriouslyvictor/whatsapp-nextjs:latest`
   - `seriouslyvictor/whatsapp-nextjs:main-<commit-sha>`

**Verify Published Image**:
```bash
docker pull seriouslyvictor/whatsapp-nextjs:latest
docker run -p 3000:3000 seriouslyvictor/whatsapp-nextjs:latest
```

---

## Phase 5: Manual Deployment Testing (Optional)

Test the published Docker image in your deployment environment.

```bash
# On your VPS/server
docker pull seriouslyvictor/whatsapp-nextjs:latest

# Stop old container
docker-compose down nextjs

# Update docker-compose.yml to use :latest tag
# Then restart
docker-compose up -d

# Check logs
docker-compose logs -f nextjs
```

---

## Expected Results Summary

### ✅ Success Criteria

| Test Phase | Expected Result | Status |
|------------|----------------|--------|
| **Local - Typecheck** | 0 errors in API routes | ⏳ Pending |
| **Local - Lint** | No ESLint errors | ⏳ Pending |
| **Local - Tests** | All tests pass | ⏳ Pending |
| **Local - Build** | Production build succeeds | ⏳ Pending |
| **Docker - Build** | Image builds successfully | ⏳ Pending |
| **Docker - Run** | Container starts and responds | ⏳ Pending |
| **CI - Workflow** | All steps pass on test branch | ⏳ Pending |
| **Docker Publish** | Image published to Docker Hub | ⏳ Pending |

### ⚠️ Known Non-Blocking Issues

These are **expected** and won't block deployment:

1. **TypeScript warnings in UI components** (10 warnings)
   - Location: `components/ui/glow-menu.tsx`, `app/page.tsx`
   - Reason: Framer Motion type compatibility issues
   - Impact: None (Next.js builds successfully despite warnings)

2. **Trivy may report vulnerabilities**
   - First run might find issues in Node.js base image or npm packages
   - Options:
     - Update packages with `npm audit fix`
     - Temporarily lower severity threshold
     - Accept risk if non-exploitable

---

## Troubleshooting

### Issue: "DATABASE_URL not found" during build

**Solution**:
```bash
# For local build:
$env:DATABASE_URL="postgresql://test:test@localhost:5432/test?schema=public"
npm run build

# For Docker build:
# Already handled by build-args in workflow ✓
```

### Issue: Prisma Client version mismatch

**Solution**:
```bash
npm install
npx prisma generate
```

### Issue: CI workflow doesn't start

**Solution**:
- Check `.github/workflows/ci.yml` is in the repository
- Verify you pushed to a branch (PR or main)
- Check GitHub Actions tab for any errors

### Issue: Docker publish workflow runs without CI

**Solution**:
- Check workflow file has `workflow_run` trigger
- Verify conditional `if` statement is present
- This should not happen with our configuration ✓

### Issue: Trivy scan fails with vulnerabilities

**Solution**:
```bash
# Check what vulnerabilities were found
# Go to: Actions → Failed workflow → Trivy step → View details

# Option 1: Update packages
npm audit fix
npm install

# Option 2: Lower severity (temporary)
# Edit .github/workflows/docker-publish.yml:82
severity: 'CRITICAL'  # Only fail on CRITICAL
```

---

## Quick Test Script

Run this to test everything locally in one go:

```bash
# test-all.ps1 (PowerShell)
Write-Host "=== Testing WhatsApp Automation CI/CD ===" -ForegroundColor Cyan

Write-Host "`n1. Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "`n2. Running type check..." -ForegroundColor Yellow
npm run typecheck
if ($LASTEXITCODE -ne 0) { Write-Host "FAILED: Type check" -ForegroundColor Red; exit 1 }

Write-Host "`n3. Running linter..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) { Write-Host "FAILED: Lint" -ForegroundColor Red; exit 1 }

Write-Host "`n4. Running tests..." -ForegroundColor Yellow
npm run test:run
if ($LASTEXITCODE -ne 0) { Write-Host "FAILED: Tests" -ForegroundColor Red; exit 1 }

Write-Host "`n5. Building production..." -ForegroundColor Yellow
$env:DATABASE_URL = "postgresql://test:test@localhost:5432/test?schema=public"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "FAILED: Build" -ForegroundColor Red; exit 1 }

Write-Host "`n✅ ALL TESTS PASSED!" -ForegroundColor Green
Write-Host "Ready to push to GitHub!" -ForegroundColor Cyan
```

Save this as `test-all.ps1` and run:
```bash
.\test-all.ps1
```

---

## Next Steps

After all tests pass:

1. **Commit and push to test branch**:
   ```bash
   git add .
   git commit -m "feat: add comprehensive CI/CD pipeline"
   git push -u origin test/ci-pipeline
   ```

2. **Verify CI passes on GitHub**:
   - Check Actions tab
   - Ensure all steps are green

3. **Create Pull Request**:
   - Review changes
   - Ensure CI is green
   - Merge to main

4. **Monitor Docker publish**:
   - Watch Actions tab
   - Verify image is published to Docker Hub
   - Check Trivy scan results

5. **Deploy to production**:
   - Pull latest image
   - Update docker-compose
   - Restart services

---

## Success Metrics

You'll know everything is working when:

- ✅ No TypeScript errors in API routes
- ✅ All tests passing
- ✅ Production build succeeds
- ✅ Docker image builds without errors
- ✅ CI workflow passes on GitHub
- ✅ Docker images published to Docker Hub
- ✅ No critical vulnerabilities in Trivy scan
- ✅ Application runs in Docker container

**Estimated Total Testing Time**: 30-45 minutes

Good luck! 🚀
