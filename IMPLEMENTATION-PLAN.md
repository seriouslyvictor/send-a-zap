# Implementation Plan - Hybrid Dashboard (Option 5)

## Executive Summary

**Target Users**: Experienced operators (junior to senior skill levels)
**Primary Use Case**: Fire-and-forget campaign execution with initial real-time monitoring
**Platform**: Desktop-first (responsive secondary)
**Architecture**: Hybrid dashboard + modal workflows

---

## Phase 1: Foundation & Dashboard Shell

### 1.1 Project Structure

```
app/
├── (dashboard)/              # Dashboard route group
│   ├── layout.tsx            # Dashboard layout with header
│   ├── page.tsx              # Main dashboard page
│   ├── connect/
│   │   └── page.tsx          # Connection management (if needed as page)
│   └── reports/
│       └── page.tsx          # Full reports page
├── api/                      # Next.js API routes
│   ├── evolution/
│   │   ├── connect/
│   │   │   └── route.ts      # POST - initiate QR connection
│   │   ├── status/
│   │   │   └── route.ts      # GET - connection status
│   │   ├── disconnect/
│   │   │   └── route.ts      # POST - disconnect session
│   │   └── qr/
│   │       └── route.ts      # GET - fetch QR code
│   ├── contacts/
│   │   ├── upload/
│   │   │   └── route.ts      # POST - upload & parse XLSX
│   │   ├── validate/
│   │   │   └── route.ts      # POST - validate contacts
│   │   └── blocklist/
│   │       └── route.ts      # GET/POST/DELETE - manage blocklist
│   ├── campaigns/
│   │   ├── create/
│   │   │   └── route.ts      # POST - create campaign
│   │   ├── [id]/
│   │   │   ├── route.ts      # GET - campaign details
│   │   │   ├── pause/
│   │   │   │   └── route.ts  # POST - pause campaign
│   │   │   ├── resume/
│   │   │   │   └── route.ts  # POST - resume campaign
│   │   │   └── cancel/
│   │   │       └── route.ts  # POST - cancel campaign
│   │   ├── active/
│   │   │   └── route.ts      # GET - list active campaigns
│   │   └── history/
│   │       └── route.ts      # GET - campaign history
│   ├── templates/
│   │   └── route.ts          # GET/POST/DELETE - message templates
│   ├── n8n/
│   │   ├── trigger/
│   │   │   └── route.ts      # POST - trigger n8n workflow
│   │   └── status/
│   │       └── route.ts      # GET - n8n workflow status
│   └── llm/
│       └── enhance/
│           └── route.ts      # POST - enhance message with LLM
├── components/
│   ├── dashboard/
│   │   ├── header.tsx        # Top header with tabs & status
│   │   ├── stats-cards.tsx   # 4 stat cards (sent, delivered, read, failed)
│   │   ├── connection-status.tsx  # Connection status banner
│   │   ├── quick-actions.tsx      # Quick action buttons
│   │   ├── active-campaigns.tsx   # Active campaigns table
│   │   └── recent-campaigns.tsx   # Recent campaigns table
│   ├── modals/
│   │   ├── connect-modal.tsx      # QR code scanning dialog
│   │   ├── upload-contacts-modal.tsx  # Contact upload wizard
│   │   ├── blocklist-modal.tsx    # Blocklist management
│   │   ├── campaign-wizard/
│   │   │   ├── index.tsx          # Main wizard dialog
│   │   │   ├── step1-upload.tsx   # Upload contacts
│   │   │   ├── step2-compose.tsx  # Compose message
│   │   │   ├── step3-configure.tsx # Batch config
│   │   │   └── step4-review.tsx   # Review & send
│   │   ├── campaign-details-modal.tsx  # View campaign details
│   │   └── template-manager-modal.tsx  # Manage templates
│   ├── ui/                   # Shadcn components (auto-generated)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── progress.tsx
│   │   ├── tabs.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── select.tsx
│   │   ├── form.tsx
│   │   ├── alert.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── sheet.tsx
│   │   ├── separator.tsx
│   │   └── ... (others as needed)
│   └── shared/
│       ├── loading-spinner.tsx
│       ├── error-boundary.tsx
│       └── toast-provider.tsx
├── lib/
│   ├── api-client.ts        # Centralized API client
│   ├── evolution-api.ts     # Evolution API wrapper
│   ├── n8n-client.ts        # n8n API wrapper
│   ├── xlsx-parser.ts       # XLSX file parsing
│   ├── message-parser.ts    # Placeholder replacement logic
│   ├── validators.ts        # Phone number, contact validation
│   └── utils.ts             # Utilities (cn, etc.)
├── hooks/
│   ├── use-connection-status.ts   # Polling for connection status
│   ├── use-campaigns.ts           # Campaign data fetching
│   ├── use-stats.ts               # Dashboard stats
│   ├── use-blocklist.ts           # Blocklist management
│   └── use-templates.ts           # Template management
└── types/
    ├── campaign.ts          # Campaign types
    ├── contact.ts           # Contact types
    ├── message.ts           # Message types
    └── api.ts               # API response types
```

### 1.2 Shadcn Components to Install

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add table
npx shadcn@latest add badge
npx shadcn@latest add progress
npx shadcn@latest add tabs
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add select
npx shadcn@latest add form
npx shadcn@latest add alert
npx shadcn@latest add dropdown-menu
npx shadcn@latest add sheet
npx shadcn@latest add separator
npx shadcn@latest add checkbox
npx shadcn@latest add label
npx shadcn@latest add scroll-area
npx shadcn@latest add toast
npx shadcn@latest add avatar
npx shadcn@latest add popover
npx shadcn@latest add command
```

---

## Phase 2: Main Dashboard Layout

### 2.1 Dashboard Page Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│ [WhatsApp Logo] WhatsApp Automation                                 │
│                                                                      │
│ 📊 Dashboard  💬 New Campaign  📋 Templates    [🟢 Connected] [👤] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ┌───────────────┬───────────────┬───────────────┬──────────────┐   │
│ │ 📨 Sent Today │ ✅ Delivered  │ 📖 Read       │ ❌ Failed   │   │
│ │ 1,234         │ 1,156 (94%)   │ 892 (72%)     │ 78 (6%)     │   │
│ │ ↑ 12% vs yday │ ↑ 3% vs yday  │ → same        │ ↓ 2%        │   │
│ └───────────────┴───────────────┴───────────────┴──────────────┘   │
│                                                                      │
│ ┌─ Connection Status ──────────────────────────────────────────┐   │
│ │ 🟢 Connected as +55 11 98765-4321                             │   │
│ │ Session active for 2h 15m • Auto-disconnect in 28 minutes    │   │
│ │                            [Extend Session] [Disconnect Now] │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ ┌─ Quick Actions ──────────────────────────────────────────────┐   │
│ │ [📤 Upload Contacts] [✏️ New Campaign] [📊 View Reports]     │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ ┌─ Active Campaigns (2) ───────────────────────────────────────┐   │
│ │ Name            Status    Progress              Actions       │   │
│ │ Summer Sale     Running   [▓▓▓▓▓▓▓░] 856/1000  [⏸][✖][👁]  │   │
│ │ Welcome Series  Running   [▓▓░░░░░░] 145/500   [⏸][✖][👁]  │   │
│ │                                                 ↑  ↑  ↑        │   │
│ │                                              Pause Cancel View│   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ ┌─ Recent Campaigns (Last 30 days) ───────────────────────────┐   │
│ │ Campaign Name      Sent  Delivered  Read  Failed  Date   […]│   │
│ │ Black Friday 2026  1,234  1,156     892   78      Jan 5   📊│   │
│ │ New Year Promo       567    545     423   22      Jan 1   📊│   │
│ │ Holiday Special      892    870     654   22      Dec 28  📊│   │
│ │ ... (show 10, then "View All" link)                         │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Key Features

**Header Navigation:**
- "Dashboard" tab (current page) - always returns to overview
- "New Campaign" button - opens Campaign Wizard modal
- "Templates" button - opens Template Manager modal
- Connection status badge (green/yellow/red) - clickable to show details
- Profile dropdown - settings, logout

**Stats Cards (Row 1):**
- Total messages sent (today)
- Delivery rate percentage
- Read rate percentage
- Failed messages count
- Trend indicators vs. yesterday

**Connection Status Banner:**
- Current phone number
- Session duration
- Auto-disconnect countdown
- Action buttons: Extend, Disconnect

**Quick Actions:**
- Upload Contacts - opens Upload Modal
- New Campaign - opens Campaign Wizard
- View Reports - navigates to `/reports` page

**Active Campaigns Table:**
- Real-time progress bars
- Status indicators
- Quick actions: Pause, Cancel, View Details
- Auto-refreshes every 5 seconds

**Recent Campaigns Table:**
- Sortable columns
- Click row to open Campaign Details modal
- "View All" link to `/reports` page

---

## Phase 3: Modal Workflows

### 3.1 Connect Modal (QR Code Scanning)

**US-01, US-02, US-03, US-04**

```
┌─────────────────────────────────────────────────────┐
│ Connect WhatsApp                                [×] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Status: Waiting for QR scan...                    │
│                                                     │
│  ┌───────────────────────────────────────────┐     │
│  │                                           │     │
│  │         [QR CODE IMAGE 300x300]           │     │
│  │                                           │     │
│  └───────────────────────────────────────────┘     │
│                                                     │
│  Instructions:                                      │
│  1. Open WhatsApp on your phone                    │
│  2. Go to Settings > Linked Devices                │
│  3. Tap "Link a Device"                            │
│  4. Scan this QR code                              │
│                                                     │
│  ⚙️ Settings:                                       │
│  Auto-disconnect after: [30 mins ▼]                │
│  □ Keep session alive indefinitely                 │
│                                                     │
│                    [Refresh QR] [Cancel]           │
└─────────────────────────────────────────────────────┘
```

**Implementation Notes:**
- Use `Dialog` component
- Poll Evolution API every 2s for QR code updates
- Show spinner while loading QR
- WebSocket connection for instant status updates (optional)
- Success state: Show checkmark, auto-close after 2s

---

### 3.2 Upload Contacts Modal

**US-05, US-06, US-07**

```
┌──────────────────────────────────────────────────────┐
│ Upload Contacts                                  [×] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Drag & drop XLSX file here, or click to browse     │
│  ┌────────────────────────────────────────────────┐ │
│  │                                                │ │
│  │              📄 Click or Drop                  │ │
│  │                                                │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ✅ contacts_list.xlsx uploaded (567 rows)          │
│                                                      │
│  Preview:                                            │
│  ┌────────────────────────────────────────────────┐ │
│  │ Phone        │ Name      │ Custom1  │ Custom2 │ │
│  │ 5511987654321│ João      │ Course A │ SP      │ │
│  │ 5521987654321│ Maria     │ Course B │ RJ      │ │
│  │ ... (show first 5 rows)                        │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ⚠️ 12 contacts are on the blocklist                │
│     [View Blocklist] [Remove from Upload]           │
│                                                      │
│  ✅ 555 contacts ready to send                      │
│                                                      │
│              [Cancel] [Use These Contacts]          │
└──────────────────────────────────────────────────────┘
```

**Implementation Notes:**
- Use `Dialog` component
- File drop zone with validation
- Parse XLSX client-side (xlsx library)
- Send to API for validation
- Show blocklist conflicts with option to exclude
- Returns contact array to campaign wizard

---

### 3.3 Blocklist Management Modal

**US-08**

```
┌──────────────────────────────────────────────────────┐
│ Blocklist Management                             [×] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  🚫 Global Opt-Out List (12 contacts)               │
│                                                      │
│  [Search contacts...]                    [+ Add]    │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ Phone         │ Name    │ Added On   │ Actions │ │
│  │ 5511987654321 │ João    │ Jan 5 2026 │ [🗑]   │ │
│  │ 5521987654321 │ Maria   │ Jan 3 2026 │ [🗑]   │ │
│  │ ...                                            │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Bulk Actions:                                       │
│  [Import from CSV] [Export to CSV]                  │
│                                                      │
│                              [Close]                 │
└──────────────────────────────────────────────────────┘
```

**Implementation Notes:**
- Use `Dialog` component
- Table with search/filter
- Add/remove contacts
- Import/export CSV functionality
- Confirmation dialog before deletion

---

### 3.4 Campaign Wizard Modal (Multi-Step)

**US-09 to US-18**

**Step Indicator:**
```
● ────── ○ ────── ○ ────── ○
Upload   Compose  Configure Review
```

#### Step 1: Upload Contacts
```
┌──────────────────────────────────────────────────────┐
│ New Campaign - Step 1: Upload Contacts           [×] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ● ────── ○ ────── ○ ────── ○                       │
│  Upload   Compose  Configure Review                 │
│                                                      │
│  [Same as Upload Contacts Modal]                    │
│                                                      │
│                         [Cancel] [Next: Compose →]  │
└──────────────────────────────────────────────────────┘
```

#### Step 2: Compose Message
```
┌──────────────────────────────────────────────────────┐
│ New Campaign - Step 2: Compose Message           [×] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ○ ────── ● ────── ○ ────── ○                       │
│  Upload   Compose  Configure Review                 │
│                                                      │
│  Message:                                            │
│  ┌────────────────────────────────────────────────┐ │
│  │ Olá {{name}}!                                  │ │
│  │                                                │ │
│  │ Temos novidades sobre o curso {{course}}.     │ │
│  │ Venha nos visitar em {{address}}!             │ │
│  │                                     [🤖 AI]   │ │
│  └────────────────────────────────────────────────┘ │
│  Characters: 145 | Placeholders detected: 3         │
│                                                      │
│  Available placeholders from your upload:            │
│  {{name}} {{course}} {{address}}                    │
│                                                      │
│  Image (optional):                                   │
│  [📎 Attach Image] or [No Image]                    │
│                                                      │
│  Templates:                                          │
│  [Load Template ▼] [Save as Template]               │
│                                                      │
│  Preview with sample data:                           │
│  ┌────────────────────────────────────────────────┐ │
│  │ Olá João!                                      │ │
│  │                                                │ │
│  │ Temos novidades sobre o curso Course A.       │ │
│  │ Venha nos visitar em Rua ABC, 123!            │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│              [← Back] [Next: Configure →]           │
└──────────────────────────────────────────────────────┘
```

**LLM Enhancement Dialog (nested):**
```
┌────────────────────────────────────────┐
│ AI Message Enhancement             [×] │
├────────────────────────────────────────┤
│                                        │
│  Current message:                      │
│  "Olá {{name}}! Temos novidades..."   │
│                                        │
│  How would you like to improve it?    │
│  ○ Make it more professional          │
│  ○ Make it more friendly              │
│  ○ Make it shorter                    │
│  ○ Make it more persuasive            │
│  ○ Custom prompt: ___________________│
│                                        │
│  [🔄 Generating...]                   │
│                                        │
│  Suggested version:                    │
│  "Olá {{name}}! Temos ótimas..."      │
│                                        │
│       [Cancel] [Use This Version]     │
└────────────────────────────────────────┘
```

#### Step 3: Configure Sending
```
┌──────────────────────────────────────────────────────┐
│ New Campaign - Step 3: Configure Sending         [×] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ○ ────── ○ ────── ● ────── ○                       │
│  Upload   Compose  Configure Review                 │
│                                                      │
│  Campaign Name:                                      │
│  [Summer Sale Campaign________________]             │
│                                                      │
│  Batch Settings:                                     │
│  Messages per batch: [50 ▼]                         │
│  (Max 50 messages per batch)                        │
│                                                      │
│  Delay between messages: [2 seconds ▼]              │
│  (Recommended: 1-3 seconds)                         │
│                                                      │
│  Delay between batches: [30 seconds ▼]              │
│  (Recommended: 30-60 seconds)                       │
│                                                      │
│  Retry Settings:                                     │
│  □ Auto-retry failed messages                       │
│  Max retries: [3 ▼]                                 │
│  Retry delay: [5 minutes ▼]                         │
│                                                      │
│  Estimated completion time: ~45 minutes              │
│  (555 contacts, 12 batches)                         │
│                                                      │
│              [← Back] [Next: Review →]              │
└──────────────────────────────────────────────────────┘
```

#### Step 4: Review & Send
```
┌──────────────────────────────────────────────────────┐
│ New Campaign - Step 4: Review & Send             [×] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ○ ────── ○ ────── ○ ────── ●                       │
│  Upload   Compose  Configure Review                 │
│                                                      │
│  Campaign Summary:                                   │
│                                                      │
│  📋 Name: Summer Sale Campaign                      │
│  👥 Recipients: 555 contacts                        │
│  📨 Message: "Olá {{name}}! Temos..."               │
│  🖼️ Image: summer-sale.jpg (245 KB)                 │
│  ⚙️ Batch size: 50 messages                         │
│  ⏱️ Delays: 2s per message, 30s per batch           │
│  🔄 Retries: Enabled (max 3)                        │
│  ⏰ Est. completion: 45 minutes                     │
│                                                      │
│  ⚠️ Important:                                       │
│  • 555 messages will be sent                        │
│  • You'll be charged for 555 messages              │
│  • Campaign cannot be fully stopped once started   │
│    (only paused)                                    │
│                                                      │
│  [Test Send to My Number]                           │
│                                                      │
│              [← Back] [🚀 Start Campaign]           │
└──────────────────────────────────────────────────────┘
```

**Implementation Notes:**
- Use `Dialog` with internal state management
- Progress indicator at top
- Each step validates before proceeding
- "Back" button preserves data
- Final step shows complete summary
- "Test Send" button for safety

---

### 3.5 Campaign Details Modal

**US-15, US-16, US-17, US-20**

```
┌──────────────────────────────────────────────────────┐
│ Campaign Details: Summer Sale                    [×] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Status: Running                                     │
│  Started: Jan 7, 2026 at 14:30                      │
│  Est. completion: 15:15 (in 32 minutes)             │
│                                                      │
│  Progress:                                           │
│  [▓▓▓▓▓▓▓░░░░] 856 / 1,000 (86%)                    │
│                                                      │
│  📊 Statistics:                                      │
│  • Sent: 856                                         │
│  • Delivered: 798 (93%)                             │
│  • Read: 512 (60%)                                  │
│  • Failed: 58 (7%)                                  │
│                                                      │
│  ⚙️ Configuration:                                   │
│  • Batch size: 50 messages                          │
│  • Delay: 2s per message, 30s per batch             │
│  • Retries: Enabled (max 3)                         │
│                                                      │
│  📝 Message:                                         │
│  "Olá {{name}}! Temos novidades sobre o curso..."  │
│                                                      │
│  Failed Messages (58):                               │
│  ┌────────────────────────────────────────────────┐ │
│  │ Phone         │ Name  │ Error         │ Action │ │
│  │ 5511987654321 │ João  │ Invalid #     │ [Retry]│ │
│  │ ...                                            │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Actions:                                            │
│  [⏸ Pause Campaign] [❌ Cancel & Delete Messages]   │
│  [📊 Export Report]                                  │
│                                                      │
│                                        [Close]       │
└──────────────────────────────────────────────────────┘
```

**Implementation Notes:**
- Use `Dialog` component
- Real-time updates via polling or WebSocket
- Show detailed stats
- Failed messages table with retry option
- Pause/Cancel actions with confirmation
- Export report as CSV

---

### 3.6 Template Manager Modal

**US-13**

```
┌──────────────────────────────────────────────────────┐
│ Message Templates                                [×] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  [Search templates...]                   [+ New]    │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ Template Name    │ Preview        │ Actions    │ │
│  │ Welcome Message  │ "Olá {{name}}" │ [✏][🗑]  │ │
│  │ Course Reminder  │ "Oi {{name}}"  │ [✏][🗑]  │ │
│  │ ...                                            │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Selected: Welcome Message                           │
│  ┌────────────────────────────────────────────────┐ │
│  │ Olá {{name}}!                                  │ │
│  │                                                │ │
│  │ Bem-vindo ao nosso curso sobre {{course}}.    │ │
│  │ Estamos felizes em tê-lo conosco!             │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Placeholders: {{name}}, {{course}}                 │
│                                                      │
│                    [Edit] [Use Template] [Close]    │
└──────────────────────────────────────────────────────┘
```

**Implementation Notes:**
- Use `Dialog` component
- List of saved templates
- Preview selected template
- Edit/delete actions
- "Use Template" populates campaign wizard

---

## Phase 4: API Integration

### 4.1 Evolution API Integration

**Endpoints to implement:**

```typescript
// lib/evolution-api.ts

export class EvolutionAPI {
  // US-01: Connect WhatsApp
  async createInstance(instanceName: string): Promise<QRResponse>
  async getQRCode(instanceName: string): Promise<QRCode>

  // US-02: Connection status
  async getConnectionStatus(instanceName: string): Promise<ConnectionStatus>

  // US-04: Disconnect
  async disconnectInstance(instanceName: string): Promise<void>

  // Send messages
  async sendTextMessage(instanceName: string, to: string, message: string): Promise<MessageResponse>
  async sendMediaMessage(instanceName: string, to: string, message: string, media: string): Promise<MessageResponse>

  // Get message status
  async getMessageStatus(messageId: string): Promise<MessageStatus>
}
```

### 4.2 n8n Integration

**Webhook-based campaign execution:**

```typescript
// lib/n8n-client.ts

export class N8nClient {
  // Trigger campaign workflow
  async triggerCampaign(payload: {
    campaignId: string
    contacts: Contact[]
    message: string
    imageUrl?: string
    batchSize: number
    messageDelay: number
    batchDelay: number
    retryConfig: RetryConfig
  }): Promise<WorkflowResponse>

  // Get campaign status
  async getCampaignStatus(campaignId: string): Promise<CampaignStatus>

  // Pause campaign
  async pauseCampaign(campaignId: string): Promise<void>

  // Resume campaign
  async resumeCampaign(campaignId: string): Promise<void>

  // Cancel campaign
  async cancelCampaign(campaignId: string, deleteMessages: boolean): Promise<void>
}
```

### 4.3 Database Schema (PostgreSQL)

**Tables needed:**

```sql
-- Campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  message_template TEXT NOT NULL,
  image_url VARCHAR(500),
  batch_size INTEGER DEFAULT 50,
  message_delay INTEGER DEFAULT 2,
  batch_delay INTEGER DEFAULT 30,
  retry_enabled BOOLEAN DEFAULT true,
  max_retries INTEGER DEFAULT 3,
  status VARCHAR(50) DEFAULT 'draft', -- draft, running, paused, completed, cancelled
  total_contacts INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  user_id UUID REFERENCES users(id)
);

-- Campaign Contacts
CREATE TABLE campaign_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  custom_data JSONB, -- Store dynamic fields
  message_status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, read, failed
  message_id VARCHAR(255),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);

-- Blocklist
CREATE TABLE blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255),
  added_at TIMESTAMP DEFAULT NOW(),
  added_by UUID REFERENCES users(id)
);

-- Message Templates
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  placeholders TEXT[], -- Array of placeholder names
  created_at TIMESTAMP DEFAULT NOW(),
  user_id UUID REFERENCES users(id)
);

-- Users (for future auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_campaigns_user ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaign_contacts_campaign ON campaign_contacts(campaign_id);
CREATE INDEX idx_campaign_contacts_status ON campaign_contacts(message_status);
CREATE INDEX idx_blocklist_phone ON blocklist(phone);
```

---

## Phase 5: Real-Time Updates

### 5.1 Polling Strategy (Simple, Fire-and-Forget)

```typescript
// hooks/use-campaigns.ts

export function useActiveCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  useEffect(() => {
    // Poll every 5 seconds for active campaigns
    const interval = setInterval(async () => {
      const active = await fetch('/api/campaigns/active').then(r => r.json())
      setCampaigns(active)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return campaigns
}
```

### 5.2 WebSocket Option (Advanced, Real-Time)

```typescript
// lib/websocket-client.ts

export class CampaignWebSocket {
  private ws: WebSocket

  connect(campaignId: string) {
    this.ws = new WebSocket(`ws://localhost:3000/api/campaigns/${campaignId}/stream`)

    this.ws.onmessage = (event) => {
      const update = JSON.parse(event.data)
      // Update UI with real-time progress
    }
  }
}
```

**Recommendation**: Start with polling (simpler), add WebSocket later if needed.

---

## Phase 6: Implementation Order

### Week 1: Foundation
1. ✅ Docker stack (DONE)
2. Install all Shadcn components
3. Create base dashboard layout
4. Implement header with tabs
5. Create stats cards (mock data)

### Week 2: Connection & Contacts
6. Evolution API integration (lib/evolution-api.ts)
7. Connect modal with QR code
8. Connection status polling hook
9. Upload contacts modal
10. XLSX parsing functionality
11. Blocklist modal & API

### Week 3: Campaign Wizard
12. Campaign wizard modal structure
13. Step 1: Upload (reuse upload modal)
14. Step 2: Compose message
15. Step 3: Configure batch settings
16. Step 4: Review & send
17. Template management modal

### Week 4: Campaign Execution
18. n8n workflow for campaign execution
19. API routes for campaign CRUD
20. Active campaigns table with real-time updates
21. Campaign details modal
22. Pause/Resume/Cancel functionality

### Week 5: Analytics & Polish
23. Recent campaigns table
24. Dashboard stats calculation
25. Export reports functionality
26. LLM message enhancement
27. Error handling & validation
28. Loading states & animations

---

## Key Design Decisions

### 1. Fire-and-Forget UX
- Dashboard shows real-time updates for active campaigns
- Users can close browser, campaign continues
- Email/webhook notifications when campaign completes (future)
- Minimize clicks to start campaign (goal: 3-4 clicks)

### 2. Desktop-First
- No mobile hamburger menu
- Wide tables and forms
- Keyboard shortcuts (future)
- Multi-column layouts

### 3. Experienced Users
- Minimal hand-holding
- Advanced options visible (not hidden in "Advanced" sections)
- Bulk actions readily available
- Keyboard navigation support

### 4. Shadcn Only
- All UI from Shadcn
- Custom components built on Shadcn primitives
- Consistent styling via Tailwind
- Dark mode support (future)

---

## Technical Stack Summary

**Frontend:**
- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Shadcn/ui
- Tailwind CSS 4

**Backend:**
- Next.js API routes (server-side)
- PostgreSQL (via whatsapp_postgres container)
- Evolution API (via whatsapp_evolution container)
- n8n (via whatsapp_n8n container)

**Libraries:**
- `xlsx` - Excel file parsing
- `zod` - Validation
- `react-hook-form` - Form management
- `@tanstack/react-query` - Data fetching (optional)
- `date-fns` - Date formatting

---

## Next Steps (After Context Clear + Shadcn MCP)

1. Install all Shadcn components
2. Create dashboard page shell
3. Implement header component
4. Build stats cards with mock data
5. Get your approval on visual design
6. Then proceed with modals

---

**This plan provides a complete blueprint for Option 5 implementation. Ready to proceed after context clear and Shadcn MCP setup!** 🚀
