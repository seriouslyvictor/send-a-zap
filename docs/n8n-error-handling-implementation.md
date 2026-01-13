# n8n Campaign Executor - Error Handling Implementation

## Overview

This document describes the comprehensive error handling added to the `campaign-executor` workflow to address Issue #2 from the activity diagram analysis.

**Files:**
- Original: `workflows/n8n/campaign-executor.json`
- Backup: `workflows/n8n/campaign-executor.backup.json`
- With Error Handling: `workflows/n8n/campaign-executor-with-errors.json`

---

## What Was Added

### 1. Database Error Handling at Webhook Entry

**Node:** `Get Campaign`
- **Change:** Added `continueOnFail: true`
- **New Error Handler:** `Respond DB Error (Get Campaign)`
- **Behavior:**
  - If DB query fails, sends 500 response with error details
  - Workflow stops gracefully without crashing
  - User gets immediate feedback about DB issues

**Error Flow:**
```
Webhook → Get Campaign → [ERROR] → Respond DB Error (500) → END
```

---

### 2. Message Fetching Error Handling

**Node:** `Get Pending Messages`
- **Change:** Added `continueOnFail: true`
- **New Error Handler:** `Mark Failed (Messages Error)`
- **Behavior:**
  - If fetching messages fails, marks campaign as FAILED
  - Workflow stops gracefully
  - Campaign state is persisted (no stuck RUNNING campaigns)

**Error Flow:**
```
Get Pending Messages → [ERROR] → Mark Campaign FAILED → END
```

---

### 3. Status Check Error Handling (In Loop)

**Node:** `Check Status In Loop`
- **Change:** Added `continueOnFail: true`
- **New Error Handler:** `Handle Status Check Error`
- **New Failure Node:** `Mark Failed (Status Error)`
- **Behavior:**
  - If status check fails during batch processing
  - Logs error with campaign ID
  - Marks campaign as FAILED
  - Stops execution gracefully

**Error Flow:**
```
Check Status In Loop → [ERROR] → Handle Status Check Error → Mark Failed → END
```

**Code in Handler:**
```javascript
const campaignId = $('Webhook Trigger').item.json.campaignId;
const error = $json.error || 'Unknown DB error';

console.error(`[ERROR] Failed to check campaign status for ${campaignId}: ${error}`);

return [{ json: { campaignId, error: 'Database error during status check', stopExecution: true } }];
```

---

### 4. Message Update Error Handling

#### 4.1 Update Message SENT Error

**Node:** `Update Message Sent`
- **Change:** Added `continueOnFail: true`
- **New Error Handler:** `Log Sent DB Error`
- **Behavior:**
  - Message was successfully sent via Evolution API
  - DB update failed (connection issue, etc.)
  - **Logs for reconciliation** instead of stopping
  - Continues processing other messages

**Error Flow:**
```
Update Message SENT → [ERROR] → Log Sent DB Error → Continue
```

**Code in Handler:**
```javascript
const messageId = $('Loop Messages').item.json.id;
const error = $json.error || 'Unknown error';

console.error(`[RECONCILIATION] Message ${messageId} sent to Evolution API but DB update failed: ${error}`);
console.error(`[RECONCILIATION] Message data: ${JSON.stringify($('Send Message').item.json)}`);

return [$json]; // Continue execution
```

#### 4.2 Update Message FAILED Error

**Node:** `Update Message Failed`
- **Change:** Added `continueOnFail: true`
- **New Error Handler:** `Log Failed DB Error`
- **Behavior:**
  - Message failed to send
  - DB update failed
  - **Logs for reconciliation**
  - Continues processing

**Error Flow:**
```
Update Message FAILED → [ERROR] → Log Failed DB Error → Continue
```

---

### 5. Counter Update Error Handling

#### 5.1 Increment Sent Count

**Node:** `Increment Sent Count`
- **Change:** Added `continueOnFail: true`
- **Behavior:**
  - If counter increment fails, continues anyway
  - Eventual consistency approach
  - Counters can be recalculated from messages table

**Error Flow:**
```
Increment Sent Count → [ERROR] → Continue (silent failure)
```

#### 5.2 Increment Failed Count

**Node:** `Increment Failed Count`
- **Change:** Added `continueOnFail: true`
- **Behavior:**
  - Same as sent count
  - Eventual consistency
  - Non-blocking

---

### 6. Campaign Completion Error Handling

**Nodes:**
- `Mark Campaign Completed`
- `Mark Completed (No Messages)`

**Changes:**
- Added `continueOnFail: true` to both
- **Behavior:**
  - If marking as COMPLETED fails, workflow continues
  - Campaign will remain RUNNING (not ideal, but no crash)
  - Can be fixed manually or by retry

**Note:** These are less critical because they happen at the END of processing.

---

## Error Handling Strategy by Criticality

### Critical Errors (Stop Execution)

These errors indicate the workflow cannot proceed:

| Error | Action | Rationale |
|-------|--------|-----------|
| Get Campaign fails | Respond 500, END | Cannot proceed without campaign data |
| Get Pending Messages fails | Mark FAILED, END | Cannot send messages without message data |
| Status Check fails (in loop) | Mark FAILED, END | Cannot safely continue without knowing status |

### Non-Critical Errors (Log & Continue)

These errors should not stop message processing:

| Error | Action | Rationale |
|-------|--------|-----------|
| Update message status fails | Log for reconciliation | Message already sent/failed, DB is stale |
| Increment counters fails | Silent continue | Counters can be recalculated |
| Mark COMPLETED fails | Continue | Workflow finished, DB update is last step |

---

## Reconciliation Process

When message status updates fail, the workflow logs:

```
[RECONCILIATION] Message <id> sent to Evolution API but DB update failed: <error>
[RECONCILIATION] Message data: <full json>
```

**Manual Reconciliation:**
1. Search n8n logs for `[RECONCILIATION]`
2. Extract message IDs and data
3. Query Evolution API for actual message status
4. Update database manually

**Automated Reconciliation (Future):**
- Create a separate workflow that:
  - Queries Evolution API for message status
  - Compares with DB status
  - Updates mismatched records

---

## Key Differences from Original

### Before (Original Workflow)

```
DB Query → [ERROR] → ❌ Workflow crashes, no state saved
```

### After (With Error Handling)

```
DB Query → [ERROR] → Handler → Mark FAILED → ✓ Workflow ends gracefully
```

---

## Testing Checklist

- [ ] Test: DB connection lost during `Get Campaign`
  - Expected: 500 response, workflow stops
- [ ] Test: DB connection lost during `Get Pending Messages`
  - Expected: Campaign marked FAILED, workflow stops
- [ ] Test: DB connection lost during `Check Status In Loop`
  - Expected: Campaign marked FAILED, workflow stops
- [ ] Test: DB connection lost during `Update Message Sent`
  - Expected: Reconciliation log, workflow continues
- [ ] Test: DB connection lost during counter increment
  - Expected: Silent continue, workflow finishes
- [ ] Test: Campaign paused mid-execution
  - Expected: Graceful stop, no errors

---

## Remaining Issues (Not in This PR)

From the activity diagram analysis, these issues remain:

| # | Issue | Status | Note |
|---|-------|--------|------|
| 3 | Race condition in Resume | ⚠️ TODO | Separate PR needed (API route fix) |
| 4 | No retry mechanism | ⚠️ TODO | Requires workflow logic changes |
| 5 | Pause detection delay | ⚠️ TODO | Requires periodic status checks |
| 6 | No global error handler | ⚠️ TODO | Needs error workflow creation |

---

## How to Deploy

### Option 1: Import New Workflow (Recommended)

1. Go to n8n web interface
2. Click "Import from File"
3. Select `campaign-executor-with-errors.json`
4. Rename to "Campaign Executor"
5. Update webhook URL in your Next.js app

### Option 2: Manual Update (Not Recommended)

1. Open existing workflow in n8n
2. For each PostgreSQL node:
   - Go to Settings → Continue On Fail → Enable
3. Add new error handler nodes
4. Connect error outputs
5. Test thoroughly

### Option 3: Side-by-Side Comparison

1. Import new workflow as "Campaign Executor v2"
2. Test with a small campaign
3. Compare execution logs with old version
4. When confident, replace old workflow

---

## Monitoring & Alerts

**Search n8n logs for:**

```bash
# Critical errors
grep "\[ERROR\]" n8n.log

# Reconciliation needed
grep "\[RECONCILIATION\]" n8n.log

# Campaign failures
grep "Mark Failed" n8n.log
```

**Set up alerts (if using logging service):**
- Alert on: `[ERROR] Failed to check campaign status`
- Alert on: `[RECONCILIATION]` (weekly digest)
- Alert on: Campaign marked FAILED unexpectedly

---

## Additional Recommendations

### 1. Create Error Workflow (Issue #6)

n8n supports a global error workflow that catches ALL errors:

```javascript
// errorWorkflow: "global-error-handler"
```

**TODO:** Create `global-error-handler.json` that:
- Logs all errors to external service
- Sends Slack/email notifications
- Marks campaigns as FAILED if not already

### 2. Add Retry Logic (Issue #4)

For failed messages, implement retry:

```javascript
const retryCount = $json.retry_count || 0;
const maxRetries = $('Loop Messages').item.json.maxRetries || 3;

if (retryCount < maxRetries && $json.autoRetry) {
  // Retry after delay
  return "RETRY";
} else {
  return "FAILED";
}
```

### 3. Fix Resume Race Condition (Issue #3)

Update `app/api/campaigns/[id]/resume/route.ts`:

```typescript
// WRONG (current):
const n8nResponse = await fetch(webhookUrl, ...); // Triggers n8n
await prisma.campaign.update({ status: RUNNING }); // Updates DB after

// CORRECT:
await prisma.campaign.update({ status: RUNNING }); // Update DB first
const n8nResponse = await fetch(webhookUrl, ...); // Then trigger n8n
```

---

## Conclusion

This error handling implementation addresses **Issue #2** from the activity diagram analysis. The workflow now:

✅ Handles DB errors gracefully
✅ Logs reconciliation issues
✅ Marks campaigns as FAILED when appropriate
✅ Never crashes silently
✅ Provides detailed error information

**Next Steps:**
1. Import and test the new workflow
2. Monitor logs for `[RECONCILIATION]` entries
3. Create global error workflow (Issue #6)
4. Fix resume race condition (Issue #3)
5. Implement retry logic (Issue #4)
