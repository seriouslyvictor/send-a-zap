# WhatsApp Automation API Documentation

**Version:** 1.0.0
**Base URL:** `http://localhost:3000` (development)

---

## Table of Contents

- [Authentication](#authentication)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Evolution API - WhatsApp Connection](#evolution-api---whatsapp-connection)
  - [POST /api/evolution/connect](#post-apievolutionconnect)
  - [GET /api/evolution/connect](#get-apievolutionconnect)
  - [GET /api/evolution/status](#get-apievolutionstatus)
  - [POST /api/evolution/disconnect](#post-apievolutiondisconnect)
  - [DELETE /api/evolution/disconnect](#delete-apievolutiondisconnect)
- [Campaigns API - Bulk Messaging](#campaigns-api---bulk-messaging)
  - [GET /api/campaigns](#get-apicampaigns)
  - [POST /api/campaigns](#post-apicampaigns)
  - [GET /api/campaigns/:id](#get-apicampaignsid)
  - [PATCH /api/campaigns/:id](#patch-apicampaignsid)
  - [DELETE /api/campaigns/:id](#delete-apicampaignsid)
  - [POST /api/campaigns/:id/start](#post-apicampaignsidstart)
  - [POST /api/campaigns/:id/pause](#post-apicampaignsidpause)
  - [POST /api/campaigns/:id/resume](#post-apicampaignsidresume)
- [Webhooks API](#webhooks-api)
  - [POST /api/webhooks/evolution](#post-apiwebhooksevolution)
  - [GET /api/webhooks/evolution](#get-apiwebhooksevolution)
- [Data Models](#data-models)
- [Status Enums](#status-enums)

---

## Authentication

Currently, the API does not implement authentication. All endpoints are accessible without credentials.

> **Security Note:** In production, implement proper authentication using NextAuth.js or similar.

---

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Invalid request body or parameters |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Server-side error |

### Common Error Scenarios

- **Invalid phone numbers:** Returns 400 with details about invalid contacts
- **Campaign not found:** Returns 404
- **Invalid status transition:** Returns 400 with explanation
- **Evolution API errors:** Returns 500 with error details

---

## Evolution API - WhatsApp Connection

Endpoints for managing WhatsApp Web connection via Evolution API.

### POST /api/evolution/connect

Creates a new WhatsApp instance or retrieves QR code for existing disconnected instance.

**Instance Name:** Fixed as `whatsapp-main` (single-session mode)

#### Request

```http
POST /api/evolution/connect
Content-Type: application/json
```

No request body required.

#### Response

**Case 1: Already Connected**
```json
{
  "success": true,
  "instanceName": "whatsapp-main",
  "alreadyConnected": true,
  "message": "Instance is already connected"
}
```

**Case 2: QR Code Generated**
```json
{
  "success": true,
  "instanceName": "whatsapp-main",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "pairingCode": null
}
```

#### Flow

1. Check if instance exists
2. If exists and connected (`status: "open"`) → return already connected
3. If exists but disconnected (`status: "close"`) → get QR code
4. If not exists → create instance and get QR code

#### Status Codes

- `200 OK` - Success
- `500 Internal Server Error` - Evolution API error

---

### GET /api/evolution/connect

Retrieves current QR code for the main instance (for refresh/retry).

#### Request

```http
GET /api/evolution/connect
```

#### Response

```json
{
  "success": true,
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "pairingCode": null
}
```

#### Use Case

- Refresh QR code if it expires (QR codes expire after ~60 seconds)
- Retry connection after failed scan

#### Status Codes

- `200 OK` - Success
- `500 Internal Server Error` - Failed to retrieve QR code

---

### GET /api/evolution/status

Retrieves connection status of the WhatsApp instance.

#### Request

```http
GET /api/evolution/status
```

#### Response

**Case 1: Connected**
```json
{
  "success": true,
  "connected": true,
  "status": "open",
  "state": "open",
  "instanceName": "whatsapp-main",
  "instanceId": "12345",
  "profileName": "John Doe",
  "profilePictureUrl": "https://...",
  "profileStatus": "Available",
  "owner": "5511999999999"
}
```

**Case 2: Not Connected**
```json
{
  "success": true,
  "connected": false,
  "status": "not_found",
  "message": "Instance not created yet"
}
```

**Case 3: Disconnected**
```json
{
  "success": true,
  "connected": false,
  "status": "close",
  "instanceName": "whatsapp-main"
}
```

#### Status Values

- `open` - Connected and ready
- `close` - Disconnected
- `not_found` - Instance not created yet

#### Status Codes

- `200 OK` - Success (even if not connected)
- `500 Internal Server Error` - Failed to fetch status

---

### POST /api/evolution/disconnect

Disconnects and deletes the WhatsApp instance.

#### Request

```http
POST /api/evolution/disconnect
```

No request body required.

#### Response

```json
{
  "success": true,
  "message": "Instance disconnected successfully",
  "status": "deleted"
}
```

#### Note

This endpoint **deletes** the instance completely (logout is unreliable in Evolution API). The connect flow will recreate the instance when user reconnects.

#### Status Codes

- `200 OK` - Success
- `500 Internal Server Error` - Failed to disconnect

---

### DELETE /api/evolution/disconnect

Completely deletes the WhatsApp instance (alternative to POST).

#### Request

```http
DELETE /api/evolution/disconnect
```

#### Response

```json
{
  "success": true,
  "message": "Instance deleted successfully",
  "status": "deleted"
}
```

#### Status Codes

- `200 OK` - Success
- `500 Internal Server Error` - Failed to delete

---

## Campaigns API - Bulk Messaging

Endpoints for managing WhatsApp bulk messaging campaigns.

### GET /api/campaigns

List all campaigns with pagination and optional filtering.

#### Request

```http
GET /api/campaigns?page=1&limit=20&status=RUNNING
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (min: 1) |
| `limit` | integer | 20 | Items per page (min: 1, max: 100) |
| `status` | string | - | Filter by status (optional) |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "cm123abc",
      "name": "Holiday Promotion",
      "messageTemplate": "Hi {{name}}, check our offer!",
      "status": "RUNNING",
      "totalContacts": 150,
      "sentCount": 45,
      "deliveredCount": 40,
      "readCount": 32,
      "failedCount": 2,
      "createdAt": "2024-01-09T10:00:00Z",
      "startedAt": "2024-01-09T10:30:00Z",
      "_count": {
        "messages": 150
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

#### Status Codes

- `200 OK` - Success
- `500 Internal Server Error` - Database error

---

### POST /api/campaigns

Create a new campaign with contacts and messages.

#### Request

```http
POST /api/campaigns
Content-Type: application/json
```

```json
{
  "name": "Holiday Promotion",
  "messageTemplate": "Hi {{name}}, check our {{product}} offer!",
  "imageUrl": "https://example.com/banner.jpg",
  "contacts": [
    {
      "phone": "+5511999999999",
      "name": "John Doe",
      "customData": {
        "product": "iPhone 15",
        "discount": "20%"
      }
    }
  ],
  "columnMapping": {
    "phone": "Phone",
    "name": "Name",
    "product": "Product"
  },
  "config": {
    "batchSize": 50,
    "messageDelay": 2,
    "batchDelay": 30,
    "autoRetry": false,
    "maxRetries": 3,
    "retryDelay": 5,
    "instanceName": "whatsapp-main"
  }
}
```

#### Request Body Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Campaign name |
| `messageTemplate` | string | ✅ | Message template with placeholders (`{{variable}}`) |
| `imageUrl` | string | ❌ | Optional image URL |
| `contacts` | array | ✅ | List of contacts (min: 1) |
| `contacts[].phone` | string | ✅ | Phone number (E.164 format recommended) |
| `contacts[].name` | string | ❌ | Contact name |
| `contacts[].customData` | object | ❌ | Custom variables for template |
| `columnMapping` | object | ❌ | Column name mapping |
| `config` | object | ❌ | Campaign configuration |
| `config.batchSize` | integer | ❌ | Messages per batch (default: 50) |
| `config.messageDelay` | integer | ❌ | Seconds between messages (default: 2) |
| `config.batchDelay` | integer | ❌ | Seconds between batches (default: 30) |
| `config.autoRetry` | boolean | ❌ | Auto-retry failed messages (default: false) |
| `config.maxRetries` | integer | ❌ | Max retry attempts (default: 3) |
| `config.retryDelay` | integer | ❌ | Seconds between retries (default: 5) |
| `config.instanceName` | string | ❌ | WhatsApp instance (default: "whatsapp-main") |

#### Response

**Success:**
```json
{
  "success": true,
  "data": {
    "id": "cm123abc",
    "name": "Holiday Promotion",
    "status": "DRAFT",
    "totalContacts": 150,
    "createdAt": "2024-01-09T10:00:00Z"
  },
  "summary": {
    "total": 152,
    "valid": 150,
    "invalid": 1,
    "blocked": 1
  }
}
```

**Validation Error:**
```json
{
  "success": false,
  "error": "No valid contacts after validation and blocklist filtering",
  "details": {
    "total": 10,
    "invalid": 5,
    "blocked": 5,
    "invalidContacts": [
      {
        "phone": "invalid",
        "status": "invalid",
        "error": "Invalid phone number format"
      }
    ],
    "blockedContacts": [
      {
        "phone": "+5511999999999",
        "status": "blocked",
        "error": "Phone is in blocklist"
      }
    ]
  }
}
```

#### Flow

1. Validate required fields
2. Fetch blocklist from database
3. Validate and normalize phone numbers
4. Filter contacts against blocklist
5. Render messages (replace placeholders)
6. Create campaign in database
7. Bulk insert messages
8. Return campaign ID and summary

#### Phone Validation

- Automatically normalizes to E.164 format
- Validates country code and length
- Removes invalid characters
- Checks against blocklist

#### Placeholder Syntax

Use `{{variable}}` syntax in message template:
- `{{name}}` - Contact name
- `{{phone}}` - Contact phone
- Any custom field from `customData`

Example: `"Hi {{name}}, your {{product}} discount is {{discount}}!"`

#### Status Codes

- `200 OK` - Campaign created
- `400 Bad Request` - Validation error
- `500 Internal Server Error` - Database error

---

### GET /api/campaigns/:id

Get detailed campaign information with optional message inclusion.

#### Request

```http
GET /api/campaigns/cm123abc?includeMessages=true&messageStatus=SENT&messagePage=1&messageLimit=50
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeMessages` | boolean | false | Include messages in response |
| `messageStatus` | string | - | Filter messages by status |
| `messagePage` | integer | 1 | Message pagination page |
| `messageLimit` | integer | 50 | Messages per page (max: 100) |

#### Response

```json
{
  "success": true,
  "data": {
    "id": "cm123abc",
    "name": "Holiday Promotion",
    "messageTemplate": "Hi {{name}}, check our offer!",
    "imageUrl": null,
    "status": "RUNNING",
    "totalContacts": 150,
    "sentCount": 45,
    "deliveredCount": 40,
    "readCount": 32,
    "failedCount": 2,
    "batchSize": 50,
    "messageDelay": 2,
    "batchDelay": 30,
    "autoRetry": false,
    "maxRetries": 3,
    "retryDelay": 5,
    "instanceName": "whatsapp-main",
    "n8nExecutionId": "12345",
    "createdAt": "2024-01-09T10:00:00Z",
    "startedAt": "2024-01-09T10:30:00Z",
    "completedAt": null,
    "messages": [
      {
        "id": "msg123",
        "phone": "+5511999999999",
        "name": "John Doe",
        "renderedMessage": "Hi John, check our offer!",
        "status": "SENT",
        "sentAt": "2024-01-09T10:31:00Z",
        "messageId": "3EB0ABC123"
      }
    ],
    "_count": {
      "messages": 150
    },
    "messageStats": {
      "PENDING": 100,
      "SENT": 45,
      "DELIVERED": 40,
      "READ": 32,
      "FAILED": 2
    },
    "progress": {
      "percent": 78,
      "processed": 117,
      "total": 150
    }
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

#### Status Codes

- `200 OK` - Success
- `404 Not Found` - Campaign not found
- `500 Internal Server Error` - Database error

---

### PATCH /api/campaigns/:id

Update campaign settings (only for DRAFT campaigns).

#### Request

```http
PATCH /api/campaigns/cm123abc
Content-Type: application/json
```

```json
{
  "name": "Updated Campaign Name",
  "messageTemplate": "New message: {{name}}",
  "batchSize": 100,
  "messageDelay": 3
}
```

#### Allowed Fields

- `name`
- `messageTemplate`
- `imageUrl`
- `batchSize`
- `messageDelay`
- `batchDelay`
- `autoRetry`
- `maxRetries`
- `retryDelay`
- `instanceName`

#### Response

```json
{
  "success": true,
  "data": {
    "id": "cm123abc",
    "name": "Updated Campaign Name",
    "messageTemplate": "New message: {{name}}",
    "batchSize": 100,
    "messageDelay": 3
  }
}
```

#### Restrictions

- **Only DRAFT campaigns** can be edited
- Cannot edit running, completed, or cancelled campaigns

#### Status Codes

- `200 OK` - Campaign updated
- `400 Bad Request` - Invalid status or no valid fields
- `404 Not Found` - Campaign not found
- `500 Internal Server Error` - Database error

---

### DELETE /api/campaigns/:id

Delete a campaign and all its messages.

#### Request

```http
DELETE /api/campaigns/cm123abc
```

#### Response

```json
{
  "success": true,
  "message": "Campaign \"Holiday Promotion\" deleted successfully"
}
```

#### Restrictions

Cannot delete campaigns with status:
- `PENDING`
- `RUNNING`
- `PAUSED`

**Can delete:**
- `DRAFT`
- `COMPLETED`
- `CANCELLED`
- `FAILED`

#### Cascade Behavior

Deleting a campaign automatically deletes all associated messages (database cascade).

#### Status Codes

- `200 OK` - Campaign deleted
- `400 Bad Request` - Cannot delete active campaign
- `404 Not Found` - Campaign not found
- `500 Internal Server Error` - Database error

---

### POST /api/campaigns/:id/start

Start a campaign by triggering the n8n workflow.

#### Request

```http
POST /api/campaigns/cm123abc/start
```

No request body required.

#### Response

```json
{
  "success": true,
  "data": {
    "id": "cm123abc",
    "name": "Holiday Promotion",
    "status": "RUNNING",
    "n8nExecutionId": "67890",
    "startedAt": "2024-01-09T10:30:00Z",
    "pendingMessages": 150
  },
  "message": "Campaign started successfully"
}
```

#### Flow

1. Validate campaign exists and is in valid state
2. Check for pending messages
3. Update campaign status to `RUNNING`
4. Trigger n8n webhook (`/campaign-executor`)
5. Store n8n execution ID
6. Update messages from `PENDING` to `QUEUED`

#### n8n Webhook Payload

```json
{
  "campaignId": "cm123abc",
  "instanceName": "whatsapp-main",
  "batchSize": 50,
  "messageDelay": 2,
  "batchDelay": 30,
  "autoRetry": false,
  "maxRetries": 3
}
```

#### Requirements

- Environment variable `N8N_WEBHOOK_URL` must be configured
- Campaign must be in `DRAFT` or `FAILED` status
- Must have at least one `PENDING` or `FAILED` message

#### Status Codes

- `200 OK` - Campaign started
- `400 Bad Request` - Invalid status or no pending messages
- `404 Not Found` - Campaign not found
- `500 Internal Server Error` - n8n webhook failed

---

### POST /api/campaigns/:id/pause

Pause a running campaign.

#### Request

```http
POST /api/campaigns/cm123abc/pause
```

No request body required.

#### Response

```json
{
  "success": true,
  "data": {
    "id": "cm123abc",
    "name": "Holiday Promotion",
    "status": "PAUSED",
    "messagesReverted": 105
  },
  "message": "Campaign paused successfully"
}
```

#### Behavior

- Sets campaign status to `PAUSED`
- Reverts `QUEUED` messages back to `PENDING`
- n8n workflow checks status before processing batches and stops if `PAUSED`

#### Requirements

Campaign must be in `RUNNING` or `PENDING` status.

#### Status Codes

- `200 OK` - Campaign paused
- `400 Bad Request` - Cannot pause campaign with current status
- `404 Not Found` - Campaign not found
- `500 Internal Server Error` - Database error

---

### POST /api/campaigns/:id/resume

Resume a paused campaign by triggering the n8n workflow again.

#### Request

```http
POST /api/campaigns/cm123abc/resume
```

No request body required.

#### Response

**Case 1: Resumed Successfully**
```json
{
  "success": true,
  "data": {
    "id": "cm123abc",
    "name": "Holiday Promotion",
    "status": "RUNNING",
    "n8nExecutionId": "67891",
    "pendingMessages": 105
  },
  "message": "Campaign resumed successfully"
}
```

**Case 2: No Pending Messages (Auto-completed)**
```json
{
  "success": true,
  "message": "Campaign has no pending messages and was marked as completed",
  "data": {
    "id": "cm123abc",
    "name": "Holiday Promotion",
    "status": "COMPLETED"
  }
}
```

#### Flow

1. Validate campaign is `PAUSED`
2. Check for remaining `PENDING` messages
3. If no pending messages → mark as `COMPLETED`
4. Otherwise → trigger n8n workflow
5. Update campaign to `RUNNING`
6. Update messages from `PENDING` to `QUEUED`

#### n8n Webhook Payload

```json
{
  "campaignId": "cm123abc",
  "instanceName": "whatsapp-main",
  "batchSize": 50,
  "messageDelay": 2,
  "batchDelay": 30,
  "autoRetry": false,
  "maxRetries": 3,
  "resuming": true
}
```

#### Requirements

- Campaign must be in `PAUSED` status
- Environment variable `N8N_WEBHOOK_URL` must be configured

#### Status Codes

- `200 OK` - Campaign resumed or completed
- `400 Bad Request` - Cannot resume campaign with current status
- `404 Not Found` - Campaign not found
- `500 Internal Server Error` - n8n webhook failed

---

## Webhooks API

Endpoints for receiving webhook events from Evolution Go.

### POST /api/webhooks/evolution

Receive authenticated message status events from Evolution Go. The Connection
route registers a callback URL containing the shared secret. A caller may also
provide the same value in the `x-evolution-webhook-secret` header for
diagnostics.

#### Request

```http
POST /api/webhooks/evolution?secret={EVOLUTION_WEBHOOK_SECRET}
Content-Type: application/json
```

#### Evolution Event Types

| Event | Description |
|-------|-------------|
| `Message` | Sent or received WhatsApp message; only outbound (`Info.IsFromMe`) updates campaign status |
| `SendMessage` | Message accepted by Evolution Go's send endpoint |
| `Receipt` | Delivery/read confirmation; root `state` is `Delivered`, `Read`, or `ReadSelf` |

#### Request Body Examples

**SendMessage (Message Sent)**
```json
{
  "event": "SendMessage",
  "data": {
    "Info": {
      "ID": "3EB0ABC123",
      "Chat": "5511999999999@s.whatsapp.net",
      "IsFromMe": true,
      "Timestamp": "2026-07-19T16:29:00-03:00"
    },
    "Message": {
      "conversation": "Hello!"
    }
  },
  "instanceId": "demo-instance-uuid",
  "instanceName": "send-a-zap-demo",
  "instanceToken": "provider-instance-token"
}
```

**Receipt (Delivery or Read)**
```json
{
  "event": "Receipt",
  "state": "Delivered",
  "data": {
    "Chat": "5511999999999@s.whatsapp.net",
    "Sender": "5511000000000:1@s.whatsapp.net",
    "IsFromMe": false,
    "MessageIDs": ["3EB0ABC123"],
    "Timestamp": "2026-07-19T16:31:00-03:00",
    "Type": "delivered"
  },
  "instanceId": "demo-instance-uuid",
  "instanceToken": "provider-instance-token"
}
```

#### Receipt States

| Evolution Go state | Message status |
|--------------------|----------------|
| `SendMessage`, outbound `Message` | `SENT` |
| `Receipt` / `Delivered` | `DELIVERED` |
| `Receipt` / `Read` or `ReadSelf` | `READ` |

#### Response

```json
{
  "success": true,
  "data": {
    "messageIds": ["3EB0ABC123"],
    "status": "DELIVERED"
  }
}
```

#### Processing Logic

1. Reject a missing or incorrect shared secret before reading the payload.
2. Normalize Evolution Go's wire shape and canonicalize `@lid` chats to their
   phone-number JID when `SenderAlt` or `RecipientAlt` is available.
3. Ignore events from any instance other than the persisted Send-a-Zap demo.
4. Advance each Message monotonically with compare-and-set retries.
5. Increment crossed campaign counters in the same transaction, exactly once.
6. Check whether the campaign is complete.

#### Auto-completion

If a campaign is `RUNNING` and all messages are processed (no `PENDING` or `QUEUED` messages remain), the campaign is automatically marked as `COMPLETED`.

#### Status Codes

- `200 OK` - Event processed (even if ignored)
- `400 Bad Request` - Body is not valid JSON
- `401 Unauthorized` - Shared secret is missing or incorrect
- `503 Service Unavailable` - Server has no webhook secret configured
- `500 Internal Server Error` - Processing error

---

### GET /api/webhooks/evolution

Health check endpoint for webhook configuration.

#### Request

```http
GET /api/webhooks/evolution
```

#### Response

```json
{
  "success": true,
  "message": "Evolution webhook endpoint is active",
  "timestamp": "2024-01-09T12:00:00.000Z"
}
```

#### Use Case

Verify webhook endpoint is accessible before configuring in Evolution API.

#### Status Codes

- `200 OK` - Webhook endpoint is active

---

## Data Models

### Campaign

```typescript
{
  id: string                    // Unique campaign ID
  name: string                  // Campaign name
  messageTemplate: string       // Message template with {{placeholders}}
  imageUrl?: string            // Optional image URL
  status: CampaignStatus       // Current status
  totalContacts: number        // Total number of contacts
  sentCount: number            // Messages sent
  deliveredCount: number       // Messages delivered
  readCount: number            // Messages read
  failedCount: number          // Messages failed
  batchSize: number            // Messages per batch (default: 50)
  messageDelay: number         // Seconds between messages (default: 2)
  batchDelay: number           // Seconds between batches (default: 30)
  autoRetry: boolean           // Auto-retry failed messages (default: false)
  maxRetries: number           // Max retry attempts (default: 3)
  retryDelay: number           // Seconds between retries (default: 5)
  instanceName: string         // WhatsApp instance name
  n8nExecutionId?: string      // n8n workflow execution ID
  columnMapping?: object       // CSV column mapping
  createdAt: DateTime          // Creation timestamp
  startedAt?: DateTime         // Start timestamp
  completedAt?: DateTime       // Completion timestamp
}
```

### Message

```typescript
{
  id: string                    // Unique message ID
  campaignId: string           // Parent campaign ID
  phone: string                // Recipient phone (E.164 format)
  name?: string                // Recipient name
  customData?: object          // Custom template variables
  renderedMessage: string      // Final message (placeholders replaced)
  status: MessageStatus        // Current status
  messageId?: string           // Evolution API message ID
  sentAt?: DateTime            // Sent timestamp
  deliveredAt?: DateTime       // Delivered timestamp
  readAt?: DateTime            // Read timestamp
  errorMessage?: string        // Error details if failed
  retryCount: number           // Number of retry attempts
  createdAt: DateTime          // Creation timestamp
}
```

---

## Status Enums

### CampaignStatus

| Status | Description |
|--------|-------------|
| `DRAFT` | Campaign created but not started |
| `PENDING` | Campaign queued for execution |
| `RUNNING` | Campaign actively sending messages |
| `PAUSED` | Campaign temporarily stopped |
| `COMPLETED` | All messages processed |
| `CANCELLED` | Campaign cancelled by user |
| `FAILED` | Campaign failed (n8n error) |

### Valid Status Transitions

```
DRAFT → RUNNING → COMPLETED
  ↓       ↓           ↑
FAILED  PAUSED -------+
```

- Start: `DRAFT` or `FAILED` → `RUNNING`
- Pause: `RUNNING` or `PENDING` → `PAUSED`
- Resume: `PAUSED` → `RUNNING` (or `COMPLETED` if no pending messages)
- Auto-complete: `RUNNING` → `COMPLETED` (when all messages processed)

### MessageStatus

| Status | Description |
|--------|-------------|
| `PENDING` | Message created, not yet queued |
| `QUEUED` | Message queued in n8n workflow |
| `SENT` | Message sent to WhatsApp |
| `DELIVERED` | Message delivered to recipient's device |
| `READ` | Message read by recipient |
| `FAILED` | Message failed to send |

### Status Progression

```
PENDING → QUEUED → SENT → DELIVERED → READ
           ↓        ↓         ↓
        FAILED   FAILED   FAILED
```

Messages can only progress forward (except to `FAILED` at any point).

---

## Configuration

### Environment Variables

Required environment variables for API functionality:

```bash
# Evolution Go Configuration
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=your-evolution-api-key
EVOLUTION_WEBHOOK_URL=http://host.docker.internal:3000/api/webhooks/evolution
EVOLUTION_WEBHOOK_SECRET=replace-with-an-independent-random-secret

# n8n Webhook Configuration
N8N_WEBHOOK_URL=http://localhost:5678/webhook

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_automation
```

### Evolution Go Webhook Setup

The application registers the authenticated webhook when the Operator starts a
Connection. Evolution Go 0.7.2 cannot attach a custom header, so the route adds
`?secret={EVOLUTION_WEBHOOK_SECRET}` to `EVOLUTION_WEBHOOK_URL`. The secret must
not be written directly into the configured base URL.

```json
{
  "webhookUrl": "http://host.docker.internal:3000/api/webhooks/evolution?secret=...",
  "subscribe": [
    "MESSAGE",
    "SEND_MESSAGE",
    "CONNECTION",
    "QRCODE",
    "READ_RECEIPT"
  ],
  "immediate": true
}
```

---

## Example Workflows

### 1. Connect WhatsApp

```bash
# Step 1: Connect instance
curl -X POST http://localhost:3000/api/evolution/connect

# Response includes QR code:
# { "qrCode": "data:image/png;base64,..." }

# Step 2: Scan QR code with WhatsApp app

# Step 3: Check connection status
curl http://localhost:3000/api/evolution/status

# Response when connected:
# { "connected": true, "status": "open", "profileName": "John Doe" }
```

### 2. Create and Run Campaign

```bash
# Step 1: Create campaign
curl -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Holiday Sale",
    "messageTemplate": "Hi {{name}}, special {{discount}} off!",
    "contacts": [
      {"phone": "+5511999999999", "name": "John", "customData": {"discount": "20%"}},
      {"phone": "+5511888888888", "name": "Jane", "customData": {"discount": "25%"}}
    ]
  }'

# Response:
# { "data": { "id": "cm123abc", "status": "DRAFT" } }

# Step 2: Start campaign
curl -X POST http://localhost:3000/api/campaigns/cm123abc/start

# Response:
# { "status": "RUNNING", "n8nExecutionId": "67890" }

# Step 3: Monitor progress
curl http://localhost:3000/api/campaigns/cm123abc

# Response includes progress:
# { "progress": { "percent": 45, "processed": 90, "total": 200 } }
```

### 3. Pause and Resume Campaign

```bash
# Pause campaign
curl -X POST http://localhost:3000/api/campaigns/cm123abc/pause

# Do something...

# Resume campaign
curl -X POST http://localhost:3000/api/campaigns/cm123abc/resume
```

---

## Rate Limits

Currently, no rate limiting is implemented. Consider adding rate limiting in production:

- Use `express-rate-limit` or similar
- Recommended: 100 requests per 15 minutes per IP
- Webhook endpoints should have separate limits

---

## Changelog

### Version 1.0.0 (2024-01-09)

- Initial API release
- Evolution API integration (connect, status, disconnect)
- Campaign management (CRUD operations)
- Campaign lifecycle (start, pause, resume)
- Webhook receiver for message status updates
- Phone validation and blocklist filtering
- Message templating with placeholders
- Automatic campaign completion

---

## Support

For issues or questions:

- Check Evolution API documentation: https://doc.evolution-api.com/
- Check n8n documentation: https://docs.n8n.io/
- Review CLAUDE.md for architecture details

---

**Last Updated:** 2024-01-09
