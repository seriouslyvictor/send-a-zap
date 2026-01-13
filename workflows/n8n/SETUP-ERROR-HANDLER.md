# Setup Instructions: Linking Campaign Executor to Error Handler

## Quick Start

After importing both workflows into n8n, you need to link them together.

---

## Step-by-Step Instructions

### 1. Import Global Error Handler

1. Open n8n web interface
2. Go to **Workflows**
3. Click **Import from File**
4. Select `global-error-handler.json`
5. Click **Import**
6. **Important:** Click **Activate** to enable it

### 2. Get Error Handler Workflow ID

1. Open the "Global Error Handler" workflow in n8n
2. Look at the URL in your browser:
   ```
   https://your-n8n-instance.com/workflow/<WORKFLOW_ID>
   ```
3. Copy the `<WORKFLOW_ID>` part

Example:
```
URL: https://n8n.example.com/workflow/abc123xyz
ID:  abc123xyz
```

### 3. Link Campaign Executor to Error Handler

#### Option A: Via n8n UI (Easiest)

1. Open "Campaign Executor" workflow
2. Click **Workflow** menu (top left)
3. Select **Settings**
4. Find **Error Workflow** field
5. Select **Global Error Handler** from dropdown
6. Click **Save**

#### Option B: Via JSON File

1. Open `campaign-executor-with-errors.json` in a text editor
2. Find the `settings` section (near the end):
   ```json
   "settings": {
     "executionOrder": "v1",
     "saveManualExecutions": true,
     "callerPolicy": "workflowsFromSameOwner",
     "errorWorkflow": ""
   }
   ```
3. Replace the empty `errorWorkflow` value with the ID you copied:
   ```json
   "settings": {
     "executionOrder": "v1",
     "saveManualExecutions": true,
     "callerPolicy": "workflowsFromSameOwner",
     "errorWorkflow": "abc123xyz"
   }
   ```
4. Save the file
5. Re-import the workflow or update it in n8n

---

## Verification

### Test That Error Handler is Linked

1. Open "Campaign Executor" workflow in n8n
2. Go to **Workflow** → **Settings**
3. Check **Error Workflow** field
4. It should show: **Global Error Handler**

### Test That Error Handler Works

#### Test 1: Simulate an Error

1. Edit "Campaign Executor" workflow
2. Add a temporary error node:
   - Add a **Code** node
   - Insert code: `throw new Error('Test error for error handler');`
   - Place it after "Respond Success" node
3. Start a test campaign
4. Check n8n execution logs
5. You should see:
   ```
   ========================================
   GLOBAL ERROR HANDLER TRIGGERED
   ========================================
   ```
6. Verify campaign marked as FAILED in database
7. Remove the test error node

#### Test 2: Database Error

1. Temporarily break a PostgreSQL node (invalid query)
2. Start a campaign
3. Let it error
4. Check logs for error handler activation
5. Verify campaign marked as FAILED
6. Fix the query

---

## Troubleshooting

### Error Handler Not Triggering

**Problem:** Workflow errors but error handler doesn't run

**Solutions:**
1. Ensure Global Error Handler is **Active** (not paused)
2. Verify `errorWorkflow` setting is correct
3. Check workflow ID is valid
4. Restart n8n if needed

### Wrong Workflow ID

**Problem:** Error shows "Error workflow not found"

**Solution:**
1. Double-check the workflow ID from the URL
2. Make sure you copied the ID, not the name
3. Verify Global Error Handler is active

### Still Getting Errors

**Problem:** Error handler triggers but still seeing issues

**Check:**
1. Database credentials are correct
2. Campaign ID is passed correctly
3. PostgreSQL is running
4. Review error handler logs

---

## Configuration Notes

### Original Campaign Executor

If you're using the original `campaign-executor.json` (without error handling), update it to `campaign-executor-with-errors.json` first, then add the error workflow setting.

### Multiple Campaign Workflows

If you have multiple campaign-related workflows, set the same error handler for all:

- Campaign Executor
- Campaign Scheduler (if exists)
- Campaign Analytics (if exists)

---

## Alternative: Bash Script to Update JSON

If you want to automate updating the JSON file:

```bash
#!/bin/bash

# Usage: ./update-error-workflow.sh <workflow-id>

WORKFLOW_ID=$1
FILE="campaign-executor-with-errors.json"

if [ -z "$WORKFLOW_ID" ]; then
  echo "Usage: $0 <workflow-id>"
  exit 1
fi

# Backup original
cp "$FILE" "$FILE.backup"

# Update errorWorkflow field
sed -i "s/\"errorWorkflow\": \"\"/\"errorWorkflow\": \"$WORKFLOW_ID\"/" "$FILE"

echo "Updated $FILE with errorWorkflow: $WORKFLOW_ID"
echo "Backup saved as $FILE.backup"
```

Run:
```bash
chmod +x update-error-workflow.sh
./update-error-workflow.sh abc123xyz
```

---

## Next Steps

After setup:

1. ✅ Verify error handler is linked
2. ✅ Test with simulated error
3. ✅ Monitor production errors
4. ✅ Configure notifications (optional)
5. ✅ Document your workflow ID for team

---

## Quick Reference

| Task | Action |
|------|--------|
| Get workflow ID | Copy from URL: `/workflow/<ID>` |
| Link workflows | Settings → Error Workflow → Select handler |
| Verify link | Check Settings shows correct handler |
| Test handler | Add test error node, trigger workflow |
| View logs | Search for "GLOBAL ERROR HANDLER TRIGGERED" |

---

For detailed documentation, see: `docs/global-error-handler-guide.md`
