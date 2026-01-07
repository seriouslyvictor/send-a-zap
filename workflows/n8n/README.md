# n8n Workflows

This folder contains exported n8n workflows for the WhatsApp Automation system.

## Workflow Files

| File | Description | Status |
|------|-------------|--------|
| `campaign-executor.json` | Main campaign execution workflow | Planned |
| `message-sender.json` | Individual message sending with retry logic | Planned |
| `status-webhook.json` | Receives delivery/read status from Evolution API | Planned |

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
