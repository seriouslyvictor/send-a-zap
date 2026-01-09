# XLS Campaign Upload & Batch Messaging - Implementation Plan

## Overview

Implement a complete WhatsApp campaign system: XLS upload with flexible column mapping, database persistence with Prisma, n8n workflow for batch sending, and real-time dashboard updates via polling.

---

## Architecture Summary

```
User uploads XLS → Client parses (SheetJS) → User maps columns → Create campaign (Prisma)
    → Trigger n8n workflow → Batch send via Evolution API → Status webhooks update DB
    → Dashboard polls for updates
```

---

## Phase 1: Database Foundation

**Install and configure Prisma ORM**

### Files to Create:
- `prisma/schema.prisma` - Database models
- `lib/prisma.ts` - Prisma client singleton

### Database Schema:

```prisma
model Campaign {
  id              String         @id @default(uuid())
  name            String
  messageTemplate String         @db.Text
  status          CampaignStatus @default(DRAFT)  // DRAFT|PENDING|RUNNING|PAUSED|COMPLETED|CANCELLED|FAILED

  // Config
  batchSize       Int            @default(50)
  messageDelay    Int            @default(2)      // seconds between messages
  batchDelay      Int            @default(30)     // seconds between batches
  autoRetry       Boolean        @default(false)
  maxRetries      Int            @default(3)

  // Stats
  totalContacts   Int            @default(0)
  sentCount       Int            @default(0)
  deliveredCount  Int            @default(0)
  readCount       Int            @default(0)
  failedCount     Int            @default(0)

  // Meta
  columnMapping   Json?          // Stores XLS column mapping
  n8nExecutionId  String?
  createdAt       DateTime       @default(now())
  startedAt       DateTime?
  completedAt     DateTime?

  messages        Message[]
}

model Message {
  id              String        @id @default(uuid())
  campaignId      String
  phone           String
  name            String?
  customData      Json?         // Dynamic fields from XLS
  renderedMessage String?       // Message with placeholders replaced
  status          MessageStatus @default(PENDING)  // PENDING|QUEUED|SENT|DELIVERED|READ|FAILED
  messageId       String?       // Evolution API message ID
  errorMessage    String?
  retryCount      Int           @default(0)
  sentAt          DateTime?
  deliveredAt     DateTime?
  readAt          DateTime?

  campaign        Campaign      @relation(...)
}

model Blocklist {
  id    String  @id @default(uuid())
  phone String  @unique
  name  String?
}
```

### Commands:
```bash
npm install prisma @prisma/client
npx prisma init
npx prisma migrate dev --name init
npx prisma generate
```

---

## Phase 2: XLS Upload & Parsing

**Client-side parsing with flexible column mapping**

### Files to Create:
- `lib/xlsx-parser.ts` - SheetJS wrapper
- `lib/phone-validator.ts` - Phone validation logic
- `components/column-mapper.tsx` - Column mapping UI

### Files to Modify:
- `components/modals/campaign-wizard/step1-upload.tsx`

### Key Implementation:

```typescript
// lib/xlsx-parser.ts
import * as XLSX from 'xlsx';

export function parseXLSX(file: File): Promise<{ headers: string[], data: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const workbook = XLSX.read(e.target?.result, { type: 'binary' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const headers = jsonData[0] as string[];
      const data = jsonData.slice(1).map(row => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => obj[h] = row[i] || '');
        return obj;
      });

      resolve({ headers, data });
    };
    reader.readAsBinaryString(file);
  });
}
```

### Column Mapper UI:
- Dropdowns to select: Phone column (required), Name column (optional)
- Ability to add custom field mappings
- Preview table updates based on mapping
- Validation summary (X valid phones, Y invalid, Z blocked)

### Phone Number Normalization:

Users will enter various formats like:
- `(11) 99999-8888`
- `011-99999-8888`
- `+55 11 99999-8888`
- `5511999998888`

The system should normalize all to: `5511999998888` (Brazilian format for Evolution API)

```typescript
// lib/phone-validator.ts
export function normalizePhone(phone: string): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');

  // Handle common Brazilian formats
  if (digits.length === 11 && digits.startsWith('0')) {
    // 011999998888 -> 5511999998888
    digits = '55' + digits.slice(1);
  } else if (digits.length === 11) {
    // 11999998888 -> 5511999998888
    digits = '55' + digits;
  } else if (digits.length === 10) {
    // 1199998888 -> 551199998888 (8-digit number, add 9)
    digits = '55' + digits.slice(0, 2) + '9' + digits.slice(2);
  }
  // Already has country code: 5511999998888

  return digits;
}

export function isValidBrazilianPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  // Brazilian mobile: 55 + 2-digit area code + 9-digit number = 13 digits
  return /^55\d{10,11}$/.test(normalized);
}
```

### Install:
```bash
npm install xlsx
```

---

## Phase 3: API Routes

**Campaign CRUD and webhook receivers**

### Files to Create:

| Route | Method | Purpose |
|-------|--------|---------|
| `app/api/campaigns/route.ts` | GET, POST | List/Create campaigns |
| `app/api/campaigns/[id]/route.ts` | GET, DELETE | Get/Delete campaign |
| `app/api/campaigns/[id]/start/route.ts` | POST | Start campaign (trigger n8n) |
| `app/api/campaigns/[id]/pause/route.ts` | POST | Pause campaign |
| `app/api/campaigns/[id]/resume/route.ts` | POST | Resume campaign |
| `app/api/webhooks/evolution/route.ts` | POST | Receive delivery/read status |

### POST /api/campaigns Flow:
1. Validate request body
2. Filter contacts against blocklist
3. Render messages (replace placeholders)
4. Create campaign with Prisma
5. Bulk insert messages
6. Return campaignId

### POST /api/campaigns/[id]/start Flow:
1. Update campaign status to RUNNING
2. Call n8n webhook: `POST ${N8N_WEBHOOK_URL}/campaign-executor`
3. Store n8n execution ID
4. Return success

### POST /api/webhooks/evolution Flow:
1. Validate webhook signature
2. Parse event type (SENT, DELIVERED, READ)
3. Find message by Evolution messageId
4. Update message status and timestamp
5. Increment campaign counter

---

## Phase 4: n8n Workflow

**Batch message sender with status tracking**

### Workflow: campaign-executor.json

```
[Webhook Trigger] campaignId
        │
        ▼
[Postgres] Get campaign + pending messages
        │
        ▼
[Code] Split messages into batches of batchSize
        │
        ▼
[Loop] For each batch ─────────────────────────────┐
        │                                          │
        ▼                                          │
   [Loop] For each message in batch ───────┐       │
        │                                  │       │
        ▼                                  │       │
   [HTTP] POST Evolution API               │       │
          /message/sendText/{instance}     │       │
          { number, text }                 │       │
        │                                  │       │
        ▼                                  │       │
   [Postgres] UPDATE message               │       │
              SET status='SENT'            │       │
        │                                  │       │
        ▼                                  │       │
   [Wait] messageDelay seconds ────────────┘       │
        │                                          │
        ▼                                          │
   [Postgres] UPDATE campaign sent_count           │
        │                                          │
        ▼                                          │
   [Wait] batchDelay seconds ──────────────────────┘
        │
        ▼
[Postgres] UPDATE campaign SET status='COMPLETED'
```

### n8n Environment Variables:
```
EVOLUTION_API_URL=http://evolution-api:8080
EVOLUTION_API_KEY=${EVOLUTION_API_KEY}
```

### Configure Evolution API Webhooks:
Set Evolution to POST status updates to: `http://nextjs:3000/api/webhooks/evolution`

---

## Phase 5: Frontend Integration

**Connect UI to real data with polling**

### Files to Modify:
- `components/modals/campaign-wizard/index.tsx` - Use real API
- `components/modals/campaign-details-modal.tsx` - Add polling, real actions
- `app/page.tsx` - Fetch real campaigns and stats

### Files to Create:
- `hooks/use-campaign-polling.ts`
- `hooks/use-dashboard-stats.ts`

### Polling Hook:
```typescript
export function useCampaignPolling(campaignId: string, interval = 5000) {
  const [campaign, setCampaign] = useState(null);

  useEffect(() => {
    if (!campaignId) return;

    const fetch = async () => {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      setCampaign(await res.json());
    };

    fetch();
    const timer = setInterval(fetch, interval);
    return () => clearInterval(timer);
  }, [campaignId, interval]);

  return campaign;
}
```

---

## Implementation Order

1. **Database**: Install Prisma, create schema, run migrations
2. **Utilities**: Create xlsx-parser.ts, phone-validator.ts
3. **API Routes**: campaigns CRUD, start, webhooks
4. **Upload UI**: Update step1-upload with real parsing + column mapper
5. **Wizard Integration**: Connect wizard to API
6. **n8n Workflow**: Create campaign-executor in n8n UI, export JSON
7. **Dashboard**: Add polling, connect to real data
8. **Testing**: End-to-end with real WhatsApp

---

## Key Files Summary

### Create New:
- `prisma/schema.prisma`
- `lib/prisma.ts`
- `lib/xlsx-parser.ts`
- `lib/phone-validator.ts`
- `components/column-mapper.tsx`
- `app/api/campaigns/route.ts`
- `app/api/campaigns/[id]/route.ts`
- `app/api/campaigns/[id]/start/route.ts`
- `app/api/webhooks/evolution/route.ts`
- `hooks/use-campaign-polling.ts`
- `workflows/n8n/campaign-executor.json`

### Modify Existing:
- `components/modals/campaign-wizard/step1-upload.tsx`
- `components/modals/campaign-wizard/index.tsx`
- `components/modals/campaign-details-modal.tsx`
- `app/page.tsx`
- `.env` (add DATABASE_URL)

---

## Verification Checklist

1. [ ] Upload XLS file with 10 contacts
2. [ ] Map columns correctly (phone, name, custom)
3. [ ] See preview with validation summary
4. [ ] Create campaign via API
5. [ ] Verify campaign + messages in database
6. [ ] Start campaign, n8n triggered
7. [ ] Messages sent with correct delays
8. [ ] Status webhooks update message status
9. [ ] Dashboard shows real-time progress
10. [ ] Campaign completes, marked as COMPLETED

---

## Dependencies

```bash
npm install prisma @prisma/client xlsx
```

## Environment Variables

```env
# Add to .env
DATABASE_URL="postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/whatsapp_automation?schema=public"
```
