# Business Logic Refactoring Plan

## Overview

This document outlines all business logic currently implemented in Next.js API routes that should be moved to n8n workflows. Each section is organized by route for easier mapping to n8n workflows.

**Architecture Principle:** n8n owns all business logic and state transitions. Next.js API routes should only:
- Validate input
- Trigger n8n workflows
- Return results to UI

---

## 🚨 CRITICAL PRIORITY

### 1. Evolution API Webhook Handler

**File:** `app/api/webhooks/evolution/route.ts`

**Current Problem:** The webhook directly updates the database with extensive business logic instead of delegating to n8n.

#### Business Logic to Move to n8n:

##### A. Message Status Mapping (Lines 83-98)

**What it does:** Maps Evolution ACK codes (0-5) to MessageStatus enum

**Why it's wrong:** Business rule about status mapping lives in frontend

**Move to n8n:** Create n8n function/mapping node that handles ACK → status conversion

##### B. Message Status Update on Send (Lines 191-215)

**What it does:** When Evolution confirms message sent, updates message status and increments campaign counter

**Why it's wrong:** State transition and counter aggregation are business logic

**Move to n8n:** Evolution webhook should trigger n8n workflow that:
1. Receives Evolution event
2. Updates message status in DB
3. Increments campaign counters
4. Checks if campaign should complete

##### C. Status Progression Rules (Lines 267-289)

**What it does:** Defines valid message status transitions (prevents backwards updates)

**Why it's wrong:** This is a state machine rule that belongs in n8n

**Move to n8n:** n8n workflow should validate status transitions before DB update

##### D. Delivery/Read Receipt Processing (Lines 291-313)

**What it does:** Based on status, sets timestamps and increments campaign counters

**Why it's wrong:** Business logic determining what constitutes "delivered" or "read"

**Move to n8n:** n8n should orchestrate all status updates and counter increments atomically

##### E. Campaign Completion Detection (Lines 401-435)

**What it does:** Autonomously marks campaigns as COMPLETED when no messages remain

**Why it's wrong:** Campaign state transition is business logic, creates race conditions

**Move to n8n:** n8n workflow should:
1. Check completion criteria
2. Transition campaign status
3. Trigger any post-completion actions (notifications, cleanup, etc.)

#### Recommended n8n Workflow Architecture:

**Option 1: Evolution Webhook → n8n → Database**
```
Evolution API → n8n webhook endpoint
                ↓
            n8n workflow:
            1. Receive Evolution event
            2. Apply status mapping logic
            3. Validate status transition
            4. Update message in DB
            5. Update campaign counters
            6. Check campaign completion
            7. Transition campaign status if needed
```

**Option 2: Evolution Webhook → Next.js → n8n → Database**
```
Evolution API → Next.js webhook (lightweight)
                ↓
            Forward to n8n workflow
                ↓
            n8n workflow (same as Option 1)
```

**Recommendation:** Use Option 1 (direct to n8n) to eliminate Next.js from the critical path.

---

### 2. Start Campaign Route

**File:** `app/api/campaigns/[id]/start/route.ts`

**Current Problem:** API route manages campaign state transition and message status updates before triggering n8n.

#### Business Logic to Move to n8n:

##### A. Campaign Status Transition (Lines 81-86)

**What it does:** Updates campaign from DRAFT → RUNNING before n8n trigger

**Why it's wrong:** State transition happens in API, not n8n

**Move to n8n:** n8n workflow should transition status as first step

##### B. Message Status Transition (Lines 169-177)

**What it does:** Updates all PENDING messages to QUEUED

**Why it's wrong:** Message state transition in API creates race condition

**Move to n8n:** n8n should queue messages as it processes them

##### C. n8n Execution ID Storage (Lines 161-166)

**What it does:** Stores n8n execution ID after webhook trigger

**Why it's wrong:** This is actually OK, but creates temporal coupling

**Consider:** Let n8n update its own execution ID in the DB

##### D. Rollback Logic on n8n Failure (Lines 144-149)

**What it does:** If n8n webhook fails, rollback campaign to FAILED

**Why it's wrong:** This logic exists because state transition happened too early

**Move to n8n:** If n8n does state transition first, no rollback needed in API

#### Recommended n8n Workflow:

**New "Start Campaign" Workflow:**
```
Next.js API (trigger only)
    ↓
n8n workflow:
1. Validate campaign is in DRAFT status
2. Transition campaign to RUNNING
3. Load all PENDING messages
4. Begin message processing loop:
   - Transition message to QUEUED
   - Send via Evolution API
   - Wait for delivery confirmation (webhook)
5. Handle completion when no messages remain
```

#### Simplified API Route:
- Only validates campaign exists and is in DRAFT status
- Triggers n8n workflow
- Returns result

---

### 3. Resume Campaign Route

**File:** `app/api/campaigns/[id]/resume/route.ts`

**Current Problem:** Nearly identical to start route, but also includes completion check logic.

#### Business Logic to Move to n8n:

##### A. Campaign Completion Check (Lines 68-74)

**What it does:** **CRITICAL BUSINESS RULE** - If no pending messages, mark campaign complete

**Why it's wrong:** Campaign completion logic in API route, duplicates webhook logic

**Move to n8n:** n8n should be sole owner of completion detection

##### B. Campaign Status Transition (Lines 102-107)

**What it does:** Updates campaign to RUNNING

**Why it's wrong:** Same as start route - state transition in API

**Move to n8n:** n8n should transition status

##### C. Message Status Transition (Lines 110-118)

**What it does:** Queues pending messages

**Why it's wrong:** Same race condition as start route

**Move to n8n:** n8n should queue messages

##### D. Rollback Logic (Lines 157-172)

**What it does:** Rollback to PAUSED if n8n fails

**Why it's wrong:** Exists because state transition happens too early

**Move to n8n:** n8n owns state, no rollback needed

#### Recommended n8n Workflow:

**Option A: Separate Resume Workflow**
- Check if any PENDING messages exist
- If none: mark COMPLETED and exit
- If yes: transition to RUNNING and process messages

**Option B: Unified Start/Resume Workflow**
- Check campaign status (DRAFT or PAUSED)
- Check for PENDING messages
- If none: mark COMPLETED and exit
- If yes: transition to RUNNING and process

**Recommendation:** Option B - less duplication, single source of truth.

---

### 4. Pause Campaign Route

**File:** `app/api/campaigns/[id]/pause/route.ts`

**Current Problem:** API route manages campaign pause and message state reversal.

#### Business Logic to Move to n8n:

##### A. Campaign Status Transition (Lines 53-58)

**What it does:** Updates campaign to PAUSED

**Why it's wrong:** State transition in API

**Move to n8n:** n8n should handle pause logic

##### B. Message State Reversal (Lines 61-68)

**What it does:** Reverts QUEUED messages back to PENDING

**Why it's wrong:** **Race condition** - if n8n is processing QUEUED messages, reverting them causes inconsistency

**Move to n8n:** n8n should pause processing and manage message state

#### Recommended n8n Workflow:

**Pause Campaign Workflow:**
```
Next.js API → n8n "Pause Campaign" webhook
                ↓
            n8n workflow:
            1. Receive pause request
            2. Signal running campaign workflow to stop
            3. Wait for in-flight messages to complete
            4. Revert QUEUED messages to PENDING
            5. Transition campaign to PAUSED
            6. Return success
```

**Challenge:** Requires n8n workflow coordination/signaling mechanism.

**Alternative Approach:**
```
Use n8n workflow variables or database flag:
1. API sets campaign.pauseRequested = true
2. Running workflow checks flag on each message
3. When flag detected, workflow pauses itself
4. Workflow handles state cleanup
```

---

### 5. Cancel Campaign Route

**File:** `app/api/campaigns/[id]/cancel/route.ts`

**Current Problem:** Similar to pause, but marks campaign as CANCELLED.

#### Business Logic to Move to n8n:

##### A. Campaign Status Transition (Lines 51-56)

**What it does:** Updates campaign to CANCELLED

**Why it's wrong:** State transition in API

**Move to n8n:** n8n should handle cancellation

##### B. Message State Reversal (Lines 60-68)

**What it does:** Reverts QUEUED and PENDING messages

**Why it's wrong:** Same race condition as pause

**Move to n8n:** n8n should manage cancellation cleanup

#### Recommended n8n Workflow:

**Cancel Campaign Workflow:**
```
n8n "Cancel Campaign" workflow:
1. Signal running workflow to stop immediately
2. Mark all QUEUED/PENDING messages as CANCELLED (or FAILED)
3. Transition campaign to CANCELLED
4. Trigger cleanup actions (notifications, logging)
```

**Note:** Cancellation is more aggressive than pause - may not wait for in-flight messages.

---

## 🟡 MEDIUM PRIORITY

### 6. Create Campaign Route - Business Rule Constants

**File:** `app/api/campaigns/route.ts`

**Current Problem:** Default configuration values hardcoded in API (Lines 259-292).

**Hardcoded defaults:**
- batchSize: 50
- messageDelay: 2
- batchDelay: 30
- maxRetries: 3
- instanceName: "whatsapp-main"

#### Recommendation:

**Option 1: Database Configuration Table**
- Create campaign_config table
- Store default values as key-value pairs
- API loads from database

**Option 2: n8n Environment Variables**
- Store defaults in n8n environment
- API fetches defaults from n8n API on campaign creation

**Option 3: Configuration File in n8n**
- n8n workflow exposes config endpoint
- API fetches defaults from n8n config workflow

**Recommendation:** Option 1 (database) - simplest, no extra API calls.

---

### 7. Contact Validation & Blocklist - Business Rules

**File:** `app/api/campaigns/route.ts` (Lines 157-238)

**Current Problem:** Phone validation and blocklist filtering in API route.

#### Assessment:

**What's OK in API:**
- Input validation (checking phone format)
- Rendering message preview for UI

**What Could Move to n8n:**
- Blocklist filtering (business rule about who can receive messages)
- "Reject if no valid contacts" rule (business logic)
- Message rendering (could be done in n8n for consistency)

#### Recommendation:

**Keep in API for now** - This is reasonable input validation.

**Consider Later:** If blocklist rules become complex (e.g., time-based blocks, conditional blocks), move to n8n.

---

### 8. Phone Validation Business Rules

**File:** `lib/phone-validator.ts`

**Current Problem:** Business rules about valid phone numbers hardcoded in library.

#### Business Rules Defined:

**A. Valid Area Codes (Lines 36-58)**
- Business rule: Only Brazilian phone numbers with valid area codes allowed
- Recommendation: Move to database table for easier updates

**B. Blocked Patterns (Lines 63-70)**
- Business rule: Block emergency/service numbers
- Recommendation: Move to database or n8n for flexibility

**C. Fake Pattern Detection (Lines 290-324)**
- Business rule: What constitutes a "fake" number
- Recommendation: Move to n8n for easier adjustment

#### Recommended Changes:

**Short-term:** Keep validation in API (it's input validation)

**Long-term:**
1. Move VALID_AREA_CODES to database table
2. Move BLOCKED_PATTERNS to database table
3. Move fake pattern rules to n8n or database
4. API calls validation service/n8n for validation

---

## 🟢 LOW PRIORITY

### 9. Campaign Deletion Rules

**File:** `app/api/campaigns/[id]/route.ts` (Lines 145-150)

**Rule:** Cannot delete campaigns that are PENDING, RUNNING, or PAUSED

**Assessment:** This is reasonable data integrity protection. OK to keep in API.

**Alternative:** Add database constraint to prevent deletion.

---

### 10. Campaign Edit Rules

**File:** `app/api/campaigns/[id]/route.ts` (Lines 206, 217-228)

**Rules:**
- Only DRAFT campaigns can be edited
- Whitelist of allowed fields to edit

**Assessment:** This is reasonable data integrity protection. OK to keep in API.

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Critical Webhook Refactoring
- [ ] Create n8n workflow to receive Evolution webhooks directly
- [ ] Move message status update logic to n8n
- [ ] Move campaign counter aggregation to n8n
- [ ] Move campaign completion detection to n8n
- [ ] Update Evolution API webhook configuration to point to n8n
- [ ] Remove business logic from `app/api/webhooks/evolution/route.ts`

### Phase 2: Campaign State Transitions
- [ ] Create n8n "Start Campaign" workflow
- [ ] Move DRAFT → RUNNING transition to n8n
- [ ] Move message PENDING → QUEUED transition to n8n
- [ ] Simplify `app/api/campaigns/[id]/start/route.ts` to just trigger n8n

### Phase 3: Resume Campaign
- [ ] Create or merge into unified "Start/Resume Campaign" workflow
- [ ] Move completion check logic to n8n
- [ ] Simplify `app/api/campaigns/[id]/resume/route.ts`

### Phase 4: Pause Campaign
- [ ] Create n8n "Pause Campaign" workflow
- [ ] Implement workflow coordination mechanism
- [ ] Move message state reversal to n8n
- [ ] Simplify `app/api/campaigns/[id]/pause/route.ts`

### Phase 5: Cancel Campaign
- [ ] Create n8n "Cancel Campaign" workflow
- [ ] Move cancellation logic to n8n
- [ ] Simplify `app/api/campaigns/[id]/cancel/route.ts`

### Phase 6: Configuration Externalization
- [ ] Create campaign_config database table
- [ ] Move default values to configuration
- [ ] Update create campaign route to load config
- [ ] Create admin UI for config management (optional)

### Phase 7: Validation Rules (Optional)
- [ ] Create database tables for validation rules
- [ ] Move VALID_AREA_CODES to database
- [ ] Move BLOCKED_PATTERNS to database
- [ ] Create n8n validation workflow
- [ ] Update API to call validation workflow

---

## 🎯 SUCCESS CRITERIA

### After refactoring, Next.js API routes should:

✅ **Only** validate user input (authentication, format checking)
✅ **Only** trigger n8n workflows
✅ **Only** read data from database for UI display
✅ **Never** update campaign or message status directly
✅ **Never** implement state transition logic
✅ **Never** aggregate or compute business metrics

### After refactoring, n8n workflows should:

✅ Own all campaign state transitions (DRAFT → RUNNING → PAUSED → COMPLETED)
✅ Own all message state transitions (PENDING → QUEUED → SENT → DELIVERED → READ)
✅ Own all business rules (completion detection, validation, status progression)
✅ Own all counter aggregation (sentCount, deliveredCount, etc.)
✅ Be the single source of truth for campaign lifecycle

---

## ⚠️ RISKS & CONSIDERATIONS

### Race Conditions
- **Current:** API and webhook both update campaign status independently
- **After refactoring:** Only n8n updates status, eliminates race conditions

### Performance
- **Concern:** Adding n8n hop adds latency
- **Mitigation:** n8n workflows are fast; correctness > speed for state transitions

### Error Handling
- **Current:** API rollback logic exists because state updates happen too early
- **After refactoring:** If n8n fails, state never changed - no rollback needed

### Testing
- **Challenge:** Testing n8n workflows is different from testing API routes
- **Recommendation:** Use n8n's test workflow feature and integration tests

### Migration Strategy
- **Recommendation:** Run old and new systems in parallel initially
- Use feature flag to route to old or new workflow
- Gradually migrate campaigns to new workflow
- Monitor for issues before full cutover

---

## 📞 QUESTIONS TO ANSWER BEFORE STARTING

1. **Webhook Routing:** Should Evolution webhooks go directly to n8n, or through Next.js first?
   - Direct to n8n = simpler, faster
   - Through Next.js = more control, easier debugging

2. **Workflow Structure:** Separate workflows for each action, or unified workflows?
   - Separate = simpler individual workflows
   - Unified = less duplication, better coordination

3. **State Coordination:** How should pause/cancel signal running workflows?
   - Database flag approach
   - n8n workflow variables
   - Message queue

4. **Migration Strategy:** Big bang or gradual?
   - Big bang = all at once, risky but fast
   - Gradual = feature flag, safer but more complex

5. **Configuration Management:** Where should defaults live?
   - Database table
   - n8n environment variables
   - Configuration service

---

**Last Updated:** 2026-01-13
**Status:** Ready for review and prioritization
