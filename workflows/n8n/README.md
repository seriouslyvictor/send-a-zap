# n8n Workflows

This folder contains exported n8n workflows for the WhatsApp Automation system.

## Workflow Files

| File | Description | Status |
|------|-------------|--------|
| `campaign-executor.json` | Main campaign execution workflow | **Ready** |
| `message-sender.json` | Individual message sending with retry logic | Planned |
| `status-webhook.json` | Receives delivery/read status from Evolution API | Not needed (handled by Next.js API) |

## How to Import Workflows

1. Open n8n at `http://localhost:5678`
2. Go to **Workflows** > **Add Workflow** > **Import from File**
3. Select the `.json` file from this folder
4. Update any credentials (Evolution API key, etc.)
5. Activate the workflow

## How to Export Workflows

1. Open the workflow in n8n
2. Click the **...** menu (top right)
3. Select **Download**
4. Save to this folder with a descriptive name
    5. Commit the changes

    ## Workflow Architecture

    ```
    ┌─────────────────────────────────────────────────────────────┐
    │                     Next.js Frontend                         │
    │                                                              │
    │  POST /api/campaigns/create                                  │
    │    └─→ Triggers n8n webhook with campaign data              │
    └──────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                   campaign-executor.json                     │
    │                                                              │
    │  1. Receive campaign data (contacts, message, config)       │
│  2. Split contacts into batches                             │
│  3. For each batch:                                         │
│     - Call message-sender for each contact                  │
│     - Wait batch delay                                      │
│  4. Update campaign status in database                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    message-sender.json                       │
│                                                              │
│  1. Replace placeholders in message template                │
│  2. Call Evolution API to send message                      │
│  3. Handle errors and retry logic                           │
│  4. Log result to database                                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Evolution API                           │
│                                                              │
│  POST /message/sendText/{instance}                          │
│  POST /message/sendMedia/{instance}                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   status-webhook.json                        │
│                                                              │
│  1. Receive delivery/read webhooks from Evolution API       │
│  2. Update message status in database                       │
│  3. Update campaign statistics                              │
└─────────────────────────────────────────────────────────────┘
```

## Environment Variables

Workflows may reference these credentials/variables:

- `EVOLUTION_API_URL` - Evolution API base URL
- `EVOLUTION_API_KEY` - Evolution API key
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTJS_WEBHOOK_URL` - Callback URL for status updates

## Naming Convention

- `*.json` - Workflow export files
- Use kebab-case for file names
- Include version in filename for major changes (e.g., `campaign-executor-v2.json`)

---

## Campaign Executor Setup Guide

### Prerequisites

1. n8n instance running (http://localhost:5678)
2. PostgreSQL database with campaign schema (see `prisma/schema.prisma`)
3. Evolution API configured and running

### Step 1: Configure PostgreSQL Credentials

1. In n8n, go to **Settings** > **Credentials**
2. Create new **PostgreSQL** credential with:
   - Name: `PostgreSQL`
   - Host: `postgres` (or your database host)
   - Database: `whatsapp_automation`
   - User: `postgres`
   - Password: Your PostgreSQL password
   - Port: `5432`
   - SSL: Disable (for local development)

### Step 2: Create Evolution API Credential

1. In n8n, go to **Settings** > **Credentials**
2. Click **Add Credential**
3. Search for **Header Auth**
4. Configure:
   - Name: `Evolution API Key`
   - Header Name: `apikey`
   - Header Value: Your Evolution API key (from `.env` file)
5. Click **Save**

### Step 3: Import the Workflow

1. Open n8n at `http://localhost:5678`
2. Go to **Workflows** > **Add Workflow** > **Import from File**
3. Select `campaign-executor.json`
4. Click **Save**

### Step 4: Update Credentials

After import, you'll see credential errors:
1. Open each **PostgreSQL node** → Select your `PostgreSQL` credential
2. Open the **Send Message** HTTP node → Select your `Evolution API Key` credential
3. Save the workflow

### Step 5: Activate the Workflow

1. Toggle the **Active** switch (top right)
2. The webhook is now available at: `http://n8n:5678/webhook/campaign-executor`

### Webhook Endpoint

**URL**: `POST /webhook/campaign-executor`

**Request Body**:
```json
{
  "campaignId": "uuid-of-campaign",
  "instanceName": "whatsapp-main",
  "batchSize": 50,
  "messageDelay": 2,
  "batchDelay": 30,
  "autoRetry": false,
  "maxRetries": 3
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Campaign started",
  "executionId": "n8n-execution-id",
  "campaignId": "uuid-of-campaign"
}
```

### Workflow Flow

```
1. Webhook receives campaignId
        │
        ▼
2. Get campaign from database
        │
        ▼
3. Check if status is RUNNING
        │
        ├─ No → Return error, stop
        │
        ▼ Yes
4. Respond to webhook (async continue)
        │
        ▼
5. Get pending messages from database
        │
        ▼
6. Split messages into batches
        │
        ├─ No messages → Mark campaign COMPLETED
        │
        ▼ Has messages
7. Loop through each batch
        │
        ├─ All batches done → Mark campaign COMPLETED
        │
        ▼
8. Check campaign status (pause detection)
        │
        ├─ Not RUNNING → Stop execution
        │
        ▼ Still RUNNING
9. Loop through messages in batch
        │
        ▼
10. Send message via Evolution API
        │
        ├─ Success → Update message status SENT
        │
        ├─ Failed → Update message status FAILED
        │
        ▼
11. Wait messageDelay seconds
        │
        ▼
12. Next message (back to step 9)
        │
        ▼ (batch complete)
13. Wait batchDelay seconds
        │
        ▼
14. Next batch (back to step 7)
```

### Pause/Resume Support

The workflow checks campaign status before processing each batch. If the campaign status changes from `RUNNING` to `PAUSED` or `CANCELLED`, the workflow stops gracefully.

To resume a paused campaign, the Next.js API triggers a new execution of this webhook with the same campaignId.

### Error Handling

- **Individual message failures**: Logged to database, workflow continues
- **Database connection errors**: Workflow fails, manual retry needed
- **Evolution API errors**: Message marked as FAILED, workflow continues

### Troubleshooting

1. **Webhook not responding**: Check workflow is active
2. **Messages not sending**: Verify Evolution API credentials
3. **Database errors**: Check PostgreSQL credentials and connection
4. **Campaign stuck in RUNNING**: Check n8n execution logs for errors
