# Demo sends real messages from the Operator's own WhatsApp account

This project is deployed publicly as a portfolio demo. Instead of simulating sends or connecting an app-owned number, the authenticated Operator pairs their *own* WhatsApp account via QR code, and campaigns really deliver. We chose this because real delivery is the most credible demonstration of the system, while putting the connected account under the Operator's own control means no app-owned number can be banned or abused.

## Considered Options

- **Simulated/demo mode** — safest, but the "your phone actually buzzes" moment is the whole pitch.
- **App-owned dedicated number** — real sending, but the app's number absorbs WhatsApp bans and any abuse happens under our identity.
- **Operator-connected account (chosen)** — real sending, liability stays with the person who consented to it.

## Consequences

Real sending with zero allowlist demands compensating machinery: a login gate (shared demo credentials), a Consent Warning before every Connection, Sending Caps (per-campaign + daily global) enforced server-side at campaign start — before n8n is triggered — and an Idle Disconnect so no Operator's account stays paired after they leave.
