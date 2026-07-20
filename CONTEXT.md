# Send-a-Zap

WhatsApp campaign orchestrator, deployed as a live portfolio demo: an authenticated visitor connects their own WhatsApp account and runs real, capped messaging campaigns against it.

## Language

### Campaign machinery

**Campaign**:
A bulk send of a rendered Template to a list of contacts, moving through DRAFT → PENDING → RUNNING → PAUSED/COMPLETED/CANCELLED/FAILED.
_Avoid_: blast, broadcast, convocação (UI copy may translate, the model term is Campaign)

**Message**:
A single send to one recipient within a Campaign, tracked PENDING → QUEUED → SENT → DELIVERED → READ (or FAILED).

**Template**:
Reusable message text with `{{variable}}` placeholders rendered per recipient.

**Blocklist**:
Phone numbers that must never receive a Message, regardless of what a Campaign requests.
_Avoid_: blacklist

### Demo operation

**Operator**:
The authenticated person driving the demo — whoever holds the shared demo credentials (you, or the recruiter).
_Avoid_: user, visitor, admin

**Connection**:
The live pairing between the app and the Operator's own WhatsApp account, established by QR scan. The app never owns a phone number; every send goes out from the Operator's connected account.
_Avoid_: instance (Evolution implementation term), session

**Consent Warning**:
The unmissable notice shown before a Connection is made: messages are real, send only to yourself or consenting known numbers, and never connect a personal WhatsApp number.

**Sending Cap**:
The server-enforced ceiling on real sends — a per-Campaign recipient limit and a global daily send limit. Checked when a Campaign starts; the sole guard between a leaked credential and abuse.
_Avoid_: rate limit (that's pacing; this is a budget)

**Idle Disconnect**:
Automatic termination of a Connection after a period of Operator inactivity, so no one's WhatsApp account stays paired to the server after they walk away.
