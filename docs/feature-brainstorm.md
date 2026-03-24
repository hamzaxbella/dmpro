# DMPro — Feature Brainstorm

> Written 2026-03-24. Organized by implementation phase.

---

## Phase 1: Automation (Immediate)

The current system is manual — you drag cards, type every message, and rely on memory for follow-ups. These features make the pipeline work *for* you.

### 1.1 Auto-Status Progression

**Problem:** You manually drag cards when a lead replies or goes cold.

**Solution:** Automatically move leads through the pipeline based on events:
- Lead sends first reply → auto-move from `contacted` → `replied`
- You send a follow-up after their reply → auto-move to `interested` (configurable)
- No activity for X days → auto-move to `lost`
- Keyword detection: if a lead says "yes", "interested", "how much" → suggest or auto-move to `interested`

**What exists today:** The webhook already detects inbound vs outbound and creates events. The n8n `/api/crm/leads/reply` endpoint auto-upgrades `contacted` → `replied`. This feature extends that logic to cover the full pipeline.

**Implementation:** Add a rules engine (simple if/then config stored in settings table) that runs on every new event. No AI needed — just pattern matching and timers.

---

### 1.2 Message Templates & Quick Replies

**Problem:** You type the same first message, follow-up, and closing message repeatedly.

**Solution:** A template library with variable substitution.
- Create named templates: "First DM", "Follow-up Day 3", "Price Quote", "Closing"
- Variables: `{{username}}`, `{{full_name}}`, `{{days_since_last}}`
- One-click insert from the lead detail page conversation view
- Templates organized by pipeline stage

**New DB table:** `templates (id, name, body, stage, sort_order, created_at)`

**UI:** Template picker dropdown on the lead detail page. Settings page to manage templates.

---

### 1.3 Auto Follow-Up Sequences

**Problem:** Leads go stale because you forget to follow up.

**Solution:** Configurable drip sequences that fire automatically.
- Define a sequence: "Day 1: Send template A → Day 3: Send template B → Day 7: Send template C"
- Attach a sequence to a lead or to a pipeline stage (all `contacted` leads get sequence X)
- Auto-pause if the lead replies (hand off to human)
- Auto-cancel if lead is moved to `closed` or `lost` or `ignored`
- Dashboard showing active sequences and upcoming sends

**Depends on:** Message Templates (1.2), and the ability to *send* DMs via Instagram API (currently the system only *receives* — sending would need Meta's Send API via the existing page access token).

**New DB tables:** `sequences (id, name, steps JSON)`, `sequence_enrollments (id, lead_id, sequence_id, current_step, paused, started_at)`

---

### 1.4 Lead Scoring

**Problem:** Hard to know which leads to prioritize.

**Solution:** A numeric score (0-100) computed from signals:
- **Engagement signals:** replied (+20), multiple replies (+10 each), fast reply (+15), asked a question (+10)
- **Profile signals:** has profile pic (+5), has full name (+5), follower count if available (+5/+10/+15)
- **Recency signals:** active in last 24h (+15), last 3 days (+10), last week (+5)
- **Negative signals:** no reply after 7 days (-20), one-word replies (-10), ignored previously (-30)

**UI:** Score badge on LeadCard, sortable column on board, "Hot Leads" section on inbox.

**Implementation:** Compute on read (no stored score — recalculate from events + lead metadata). Add a `GET /api/leads?sort=score` option.

---

### 1.5 Smart Reminders (Upgrade Existing)

**Problem:** Current reminders are manual — you schedule each one by hand.

**Solution:** Enhance the existing reminder system:
- **Auto-schedule:** When a lead enters a stage, auto-create a follow-up reminder based on thresholds
- **Snooze:** "Remind me in 1h / tomorrow / next week" quick actions on any lead card
- **Escalation:** If a reminder fires and you don't act within X hours, send a second notification
- **Digest mode:** Instead of one webhook per reminder, send a daily/hourly summary: "You have 5 leads needing follow-up"

**What exists today:** Stale lead detection + scheduled reminders + webhook notifications. This builds directly on that foundation.

---

### 1.6 AI Response Suggestions

**Problem:** Even with templates, crafting personalized replies takes time.

**Solution:** When viewing a lead's conversation, show an AI-suggested reply:
- Analyze conversation history + lead profile
- Generate 2-3 reply options (casual, professional, closing)
- One-click to copy or insert into reply
- Learn from which suggestions you pick over time

**Implementation:** Call Claude API or OpenAI from a new `/api/leads/[id]/suggest` endpoint. Pass conversation history as context. Return suggested replies. Keep it optional — user can ignore suggestions.

**Cost consideration:** API calls per suggestion. Cache aggressively. Only generate on explicit button click, not automatically.

---

### 1.7 Bulk Actions

**Problem:** Managing leads one-by-one is slow when you have dozens.

**Solution:** Multi-select mode on the board and inbox:
- Select multiple leads via checkboxes
- Bulk actions: change status, ignore, delete, assign to sequence, add tag
- "Select all in column" for kanban
- "Select all stale" for reminders page

**UI:** Floating action bar appears when leads are selected, showing available bulk actions and count.

---

## Phase 2: SaaS Productization (Near Future)

Turn DMPro from a single-user tool into a multi-tenant SaaS product.

### 2.1 Authentication & User Accounts

- Email/password signup with email verification
- OAuth login (Google, optionally Apple)
- Password reset flow
- Session management with JWT or cookie-based auth
- "Remember me" / device trust

**Tech:** NextAuth.js (or Auth.js for Next.js 16) with a `users` table and `sessions` table.

---

### 2.2 Facebook/Instagram OAuth (Frictionless Connect)

- "Connect your Instagram" button using Facebook Login for Business
- OAuth flow: user grants `instagram_manage_messages`, `pages_messaging` permissions
- Store page access token per user (encrypted at rest)
- Auto-configure webhook subscription for their page
- Token refresh handling (Meta tokens expire)
- Disconnect/reconnect flow

**This is the key unlock** — currently the system uses a single hardcoded `META_ACCESS_TOKEN`. Multi-tenant means each user brings their own token.

**New DB tables:** `connections (id, user_id, platform, access_token_enc, page_id, page_name, connected_at, expires_at)`

---

### 2.3 Multi-Tenancy & Data Isolation

- Every table gets a `user_id` (or `workspace_id`) foreign key
- All queries scoped by tenant — no data leakage between accounts
- Row-level security or middleware-enforced scoping
- Webhook routing: incoming DMs routed to the correct tenant by `page_id`

**Migration strategy:** Add `user_id` column to `leads`, `events`, `reminders`, `templates`, `settings`. Create a `users` table. Backfill existing data to a default user.

---

### 2.4 Billing & Plans

- Free tier: up to 50 leads, 1 connected account, basic analytics
- Pro tier: unlimited leads, multiple accounts, sequences, AI suggestions, priority support
- Stripe integration for subscriptions
- Usage tracking and plan enforcement (middleware that checks limits)
- Trial period (14 days Pro, then downgrade)

**New DB tables:** `subscriptions (id, user_id, stripe_customer_id, plan, status, current_period_end)`

---

### 2.5 Onboarding Flow

- Step-by-step wizard after signup:
  1. Connect your Instagram account
  2. Import existing conversations (optional)
  3. Set up your first message template
  4. Configure reminder thresholds
- Progress indicator, skip options
- In-app tooltips for first-time users on each page

---

### 2.6 Security Hardening

- Encrypt stored access tokens (AES-256-GCM with per-tenant keys)
- Rate limiting on all API routes (per user, per IP)
- CSRF protection on mutations
- Audit log: who did what, when (important for team features later)
- Webhook signature verification per tenant (already exists for single-user)
- Content Security Policy headers
- The `/api/admin/clear` endpoint needs auth or removal in production

---

### 2.7 Team & Workspace Features

- Workspaces with multiple members
- Roles: Owner, Admin, Member
- Lead assignment: assign leads to specific team members
- Activity feed: "Alex moved @user to Interested", "Sam replied to @user"
- @mentions in notes
- Shared vs personal templates

---

## Phase 3: Multi-Channel Expansion (Future)

Extend beyond Instagram DMs to become a unified inbox.

### 3.1 Unified Conversation Model

Refactor the data model to be channel-agnostic:
- `channels` table: `(id, user_id, platform, credentials_enc, config)`
- `conversations` table replaces/extends `leads`: `(id, channel_id, contact_id, status, ...)`
- `contacts` table: `(id, user_id, name, email, phone, ig_username, wa_number, ...)`
- `messages` table replaces `events`: `(id, conversation_id, channel, direction, body, metadata, ...)`

A single contact can have conversations across multiple channels. The inbox shows all channels merged, filterable.

---

### 3.2 Facebook Messenger

- Shared OAuth with Instagram (same Facebook Login scope)
- Already uses the same Send/Receive API patterns
- Minimal new code — mostly a `channel = 'messenger'` flag on existing flows
- Likely the fastest channel to add after Instagram

---

### 3.3 WhatsApp Business

- WhatsApp Cloud API (also via Meta Business Platform)
- Shared Facebook OAuth can include WhatsApp permissions
- Template-based messaging (WhatsApp requires pre-approved templates for outbound)
- Rich media support: images, documents, buttons
- 24-hour messaging window rules (different from Instagram)

---

### 3.4 Email

- Connect via OAuth (Gmail, Outlook) or SMTP/IMAP credentials
- Email parsing: thread detection, signature stripping, HTML → text
- Email templates with rich formatting
- Open/click tracking (optional, with pixel or link wrapping)
- Very different UX from DMs — longer messages, attachments, CC/BCC

**Complexity note:** Email is significantly harder than chat platforms. Thread detection, HTML rendering, attachment handling, and deliverability are each non-trivial. Consider integrating an email API (SendGrid, Resend, Postmark) rather than building SMTP from scratch.

---

### 3.5 SMS (Optional)

- Twilio or similar provider
- Simple send/receive
- Short messages, no rich media
- Useful for follow-ups when leads don't respond on social

---

### 3.6 Unified Analytics

- Cross-channel metrics: "Which channel has the highest reply rate?"
- Attribution: "This lead came from Instagram but converted after a WhatsApp follow-up"
- Channel comparison dashboards
- Per-channel funnel breakdown

---

### 3.7 Channel-Aware Sequences

- Sequences that span channels: "Day 1: Instagram DM → Day 3: WhatsApp → Day 7: Email"
- Fallback logic: if DM not delivered, try next channel
- Per-channel templates (tone differs between IG DM and email)

---

## Quick Wins (Can Ship Anytime)

Small features that don't depend on a specific phase:

| Feature | Effort | Impact |
|---------|--------|--------|
| **Dark mode** | Low | Quality of life, looks professional |
| **Export to CSV** | Low | Users want their data portable |
| **Lead tags/labels** | Low | Better organization beyond 5 statuses |
| **Keyboard shortcuts** | Low | Power users move faster (J/K to navigate, S to change status) |
| **Search across messages** | Medium | Find that one conversation where they mentioned a price |
| **Notes with @timestamps** | Low | "Called on 3/20, said they'd decide by Friday" with linked dates |
| **Mobile-responsive layout** | Medium | Check pipeline from phone |
| **Notification sounds/badge** | Low | Know when a new DM arrives without watching the screen |
| **Undo on ignore/delete** | Low | Toast with "Undo" instead of immediate removal |
| **Duplicate detection** | Low | Flag leads with same igsid or similar usernames |
| **Pinned leads** | Low | Keep high-priority leads visible at top |

---

## Suggested Priority Order

```
NOW (Phase 1 — Automation)
├── 1.1 Auto-Status Progression ← extends existing webhook logic
├── 1.2 Message Templates ← new table + UI, no external deps
├── 1.5 Smart Reminders ← enhances existing system
├── 1.7 Bulk Actions ← pure UI
├── 1.4 Lead Scoring ← computed, no new tables
├── 1.3 Auto Follow-Up Sequences ← needs Send API
└── 1.6 AI Response Suggestions ← needs API key + cost model

NEXT (Phase 2 — SaaS)
├── 2.1 Auth & User Accounts
├── 2.2 Facebook/Instagram OAuth
├── 2.3 Multi-Tenancy
├── 2.6 Security Hardening
├── 2.5 Onboarding Flow
├── 2.4 Billing & Plans
└── 2.7 Team Features

LATER (Phase 3 — Multi-Channel)
├── 3.1 Unified Conversation Model (refactor first)
├── 3.2 Facebook Messenger (lowest friction)
├── 3.3 WhatsApp Business
├── 3.4 Email
├── 3.6 Unified Analytics
└── 3.7 Channel-Aware Sequences
```
