# API Quick Reference

Quick reference guide for common API operations. See [API.md](./API.md) for full documentation.

---

## Base URL

```
http://localhost:3000
```

---

## Evolution API (WhatsApp Connection)

### Connect WhatsApp
```bash
POST /api/evolution/connect
# Returns QR code (base64 image)
```

### Check Connection Status
```bash
GET /api/evolution/status
# Returns: { connected: true/false, status: "open"/"close", profileName: "..." }
```

### Disconnect WhatsApp
```bash
POST /api/evolution/disconnect
# Deletes instance completely
```

---

## Campaign Management

### List Campaigns
```bash
GET /api/campaigns?page=1&limit=20&status=RUNNING
```

### Create Campaign
```bash
POST /api/campaigns
Content-Type: application/json

{
  "name": "Campaign Name",
  "messageTemplate": "Hi {{name}}, check our {{product}}!",
  "contacts": [
    {
      "phone": "+5511999999999",
      "name": "John",
      "customData": { "product": "iPhone" }
    }
  ]
}
```

### Get Campaign Details
```bash
GET /api/campaigns/:id?includeMessages=true
```

### Start Campaign
```bash
POST /api/campaigns/:id/start
# Triggers n8n workflow
```

### Pause Campaign
```bash
POST /api/campaigns/:id/pause
```

### Resume Campaign
```bash
POST /api/campaigns/:id/resume
```

### Delete Campaign
```bash
DELETE /api/campaigns/:id
# Only works for DRAFT, COMPLETED, CANCELLED, FAILED
```

---

## Campaign Status Flow

```
DRAFT → RUNNING → COMPLETED
  ↓       ↓
FAILED  PAUSED
```

**Valid Operations:**
- Start: `DRAFT` or `FAILED` → `RUNNING`
- Pause: `RUNNING` → `PAUSED`
- Resume: `PAUSED` → `RUNNING`
- Edit: Only `DRAFT` campaigns
- Delete: Only `DRAFT`, `COMPLETED`, `CANCELLED`, `FAILED`

---

## Message Statuses

```
PENDING → QUEUED → SENT → DELIVERED → READ
           ↓        ↓         ↓
        FAILED   FAILED   FAILED
```

---

## Common Response Format

**Success:**
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Message Template Syntax

Use `{{variable}}` for placeholders:

```
"Hi {{name}}, your order #{{orderId}} is ready! Total: {{amount}}"
```

Variables come from:
- `name` - Contact name
- `phone` - Contact phone
- `customData` object fields

---

## Phone Number Format

**Recommended:** E.164 format

```
✅ +5511999999999
✅ +1234567890
❌ (55) 11 99999-9999
❌ 11999999999
```

The API auto-normalizes most formats, but E.164 is safest.

---

## Environment Variables

```bash
# Evolution API
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=your-api-key

# n8n
N8N_WEBHOOK_URL=http://localhost:5678/webhook

# Database
DATABASE_URL=postgresql://...
```

---

## Webhooks

Evolution API sends events to:
```
POST /api/webhooks/evolution
```

**Events:**
- `messages.upsert` - Message sent
- `messages.update` - Delivery/read receipt
- `message.ack` - Status change
- `connection.update` - Connection status

**ACK Codes:**
- `-1` = Failed
- `0` = Pending
- `1` = Server received
- `2` = Delivered
- `3` = Read
- `4` = Played (voice)

---

## Example: Full Campaign Flow

```bash
# 1. Connect WhatsApp
curl -X POST http://localhost:3000/api/evolution/connect
# Scan QR code

# 2. Verify connection
curl http://localhost:3000/api/evolution/status

# 3. Create campaign
curl -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "messageTemplate": "Hi {{name}}!",
    "contacts": [{"phone": "+5511999999999", "name": "John"}]
  }'
# Returns: { "data": { "id": "cm123abc" } }

# 4. Start campaign
curl -X POST http://localhost:3000/api/campaigns/cm123abc/start

# 5. Monitor progress
curl http://localhost:3000/api/campaigns/cm123abc

# 6. Pause if needed
curl -X POST http://localhost:3000/api/campaigns/cm123abc/pause

# 7. Resume
curl -X POST http://localhost:3000/api/campaigns/cm123abc/resume
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (validation error) |
| 404 | Not found |
| 500 | Server error |

---

## Tips

1. **Always check connection status** before starting campaigns
2. **Test with small batches** first (set `batchSize: 5`)
3. **Use blocklist** to avoid spamming (`blocklist` table)
4. **Monitor n8n logs** if campaigns don't start
5. **QR codes expire** after ~60 seconds - use `GET /api/evolution/connect` to refresh
6. **Campaigns auto-complete** when all messages are processed
7. **Phone validation** happens automatically - check the summary for invalid/blocked contacts

---

## Troubleshooting

### Campaign won't start
- Check `N8N_WEBHOOK_URL` is configured
- Verify n8n workflow is active
- Check campaign status (must be DRAFT or FAILED)
- Ensure there are PENDING messages

### Messages not sending
- Check WhatsApp connection status
- Verify Evolution API is running
- Check n8n workflow logs
- Verify webhook is configured in Evolution API

### QR code not loading
- Check `EVOLUTION_API_URL` is correct
- Verify Evolution API is accessible
- Try `GET /api/evolution/connect` to refresh

---

For complete documentation, see [API.md](./API.md)
