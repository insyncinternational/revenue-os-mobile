# Mobile app: agency portal and customer portal plan

Written 2026-11-04. Status (same day): agency mode built and checked on the emulator; customer mode screens built, waiting on the customer backend (BC1–BC3) for a full check. Built in the current look; the new "Mono" design is being applied by another session through the shared ui/ components.

## 1. Where we are today

The app has one mode: **a client workspace** (Today, Inbox, Contacts, Pipeline, More).

| Who signs in | What they get now | What's missing |
| --- | --- | --- |
| Client owner / client team | Their workspace | Nothing major |
| Agency owner / agency staff | A "pick a client" screen, then that client's workspace | The whole agency portal |
| Customer of a client (e.g. a clinic's patient) | Can't sign in at all | The whole customer portal |

## 2. The idea in one picture

One app, three modes. The app picks the mode after sign-in; people who have more than one can switch.

```
Sign in
 ├─ Agency member?   → AGENCY mode   (agency tabs)  ──"Open client"──► CLIENT mode
 ├─ Workspace user?  → CLIENT mode   (today's app)
 └─ Customer?        → CUSTOMER mode (branded with the business's logo and colours)
```

- Agency people land on the **agency home**, not the client picker. "Open client" takes them into that
  client's workspace, and a bar at the top ("Viewing Bloom Physio · Back to agency") takes them back.
- An agency person who belongs to several agencies gets an agency switcher (`GET /agencies/mine`).
- Customers use a **separate sign-in entry** ("I'm a customer"), because their accounts and sessions are
  separate from staff accounts in the backend.

## 3. Agency portal: modules to add

Rule used: on the phone go the daily, on-the-go jobs. One-time setup and heavy desk work stay on the web.

### Agency tabs

**Home · Clients · Credits · Alerts · More**

### Modules (v1)

| # | Module | What it does on the phone | Backend (already exists) |
| --- | --- | --- | --- |
| A1 | **Agency home** | KPIs with 7/30/90 days and trend: clients, leads, messages, replies, meetings, deals won. Results chart, client health, top clients, credit pool, recent clients. Quick actions: Add client, Give credits, Invite client, Invite team | `GET /:id/dashboard`, `/reports`, `/usage`, `/credits` |
| A2 | **Clients list** | Search, filters (active / suspended / paused), and per client: leads, open deals, won value, credits left, last active | `GET /:id/clients` |
| A3 | **Client detail** | Overview, usage log and notes, plus everyday actions: **Open client**, edit details, notes, give or take back credits, resend invite, resend verification, password reset email, sign out everywhere, suspend / unsuspend | `/:id/clients/:cid/...` (all exist) |
| A4 | **Client's team and portal customers** | See the client's team, resend or cancel invites, turn access off. See portal customers, block / unblock | `/team`, `/workspaces/:wid/members`, `/customers` |
| A5 | **Add client and invite client** | Create a client quickly. Make an invite link and share it through WhatsApp, SMS or email (phone share sheet) | `POST /:id/clients`, `/:id/client-invites` |
| A6 | **Credits** | Pool balance, history, give credits to a client | `GET /:id/credits`, `POST /credits/allocate` |
| A7 | **Buy credits and billing status** | Plan and status banners (trial days left, payment failed, on hold). Buy credits with the saved card after one "Charge AED X?" confirm. "Manage card / invoices" opens the Stripe portal in the browser | `GET /:id/billing`, `POST /credits/buy`, `POST /billing/portal` |
| A8 | **Reports and usage** | Read-only results and credit spend per client | `GET /:id/reports`, `/usage` |
| A9 | **Team** | Members and pending invites, invite by email, change role, remove, assign clients | `/:id/team/...` |
| A10 | **Alerts** | Push and in-app list for the 7 agency events: new client signed up, payment failed, plan ended, trial ended, agency on hold, auto top-up failed, credit pool ran out. Each opens the right screen | `notifyAgencyAdmins` already sends mobile push |
| A11 | **Activity** (admins) | Read-only team audit feed with search | `GET /:id/activity` |

### Later (v2)

- **Lea for agencies:** the agency AI chat on the phone (`POST /:id/lea/chat`).
- Accept a team invite from the email link straight in the app (deep link to `/agency/invite`).

### Stays on the web

White-label, custom domain, SSO, phone and email providers, API keys and webhooks, SaaS mode, snapshots,
client modules, calling setup, seats, platform keys, delete to Trash, onboarding wizard, first plan checkout
and plan changes.

### Roles (must match the web)

- `agency_admin` gets everything above.
- `agency_user` sees only the clients assigned to them. Every action is hidden unless they have the scope
  (`create_clients`, `manage_credits`, `manage_billing`, `open_clients`, ...). Credits are read-only for them,
  and they never see Activity or the agency alerts (those go to admins only).
- "Log in as owner" is **not** in the app: the backend only gives that session as a browser cookie. "Open
  client" covers the same need.

### Backend work for the agency side (small)

- **BA1:** Add `metadata.agency_id` and the target screen to every agency notification. Mostly there; check
  all 7 so each push opens the right screen.
- **BA2:** One "agency summary" call for the home screen (dashboard + reports + credits in one), so the
  phone makes one request instead of four. Optional, for speed.
- **BA3:** Add the agency endpoints the app uses to `npm run contract`, so API changes are caught.

## 4. Customer portal: modules to add

Today's web portal (`/portal/<business>`) has **appointments, messages, invoices and documents**. The app
should do the same, with the business's own logo and colours, plus push notifications (the web has none).

### Customer tabs

**Home · Appointments · Messages · Invoices · Me**

### Modules (v1)

| # | Module | What it does on the phone | Backend |
| --- | --- | --- | --- |
| C1 | **Sign-in** | Opens from the invite or sign-in email link straight into the app. Email + password for people who set one. "Email me a sign-in link" for everyone else. Choose or change password | Exists, but **cookie only** → needs BC1 and BC2 |
| C2 | **Business branding** | Logo, name and colours of the business on every screen | `GET /portal/:slug` (exists) |
| C3 | **Home** | Next appointment with Join or Reschedule, unread messages, unpaid invoices, quick actions | Built from the calls below |
| C4 | **Appointments** | Upcoming and past, book from free slots, reschedule, cancel, add to phone calendar, join video link | `/portal/session/meetings`, `/slots` (exist) |
| C5 | **Messages** | Chat with the business; their replies come from the business's normal Inbox | `/portal/session/messages` (exists) |
| C6 | **Invoices** | List with status, view, **Pay** (opens the existing secure pay page in an in-app browser), PDF | `/portal/session/invoices` (exists) |
| C7 | **Documents** | Files the business shared; open or save | `/portal/session/documents` (exists) |
| C8 | **Me** | Name and email, password, notification settings, sign out. If the same email is a customer of several businesses, a list to switch between them | Small additions (BC4) |
| C9 | **Push notifications** | Business replied, booking confirmed or changed, appointment reminder, new invoice | **New** (BC3) |

### Not in v1 (the web portal doesn't have these either)

Contracts to sign, quotes, reviews, loyalty, editing the profile. Add them to the web portal first, then the
app.

### Backend work for the customer side (this is the real work)

- **BC1, phone sign-in for customers:** the portal session is cookie-only today, and the code ignores the
  `Authorization` header on purpose. Add `/api/mobile/portal/...` sign-in endpoints that return a portal token
  for the app. Keep the same rules: separate "portal" audience, server-side revoke, 7-day session with
  refresh, and old tokens die when the password changes.
- **BC2, email links open the app:** sign-in and invite links (`/portal/:slug/verify?token=`) open the app
  when it's installed (Android App Links / iOS Universal Links), and the web otherwise.
- **BC3, customer push:** a devices table for portal customers, plus pushes for: business reply (hook in
  `replyToPortalThread`), booking confirmed or changed, appointment reminder (new job, e.g. 24 h and 1 h
  before), and new invoice sent.
- **BC4, several businesses:** after sign-in, list the other businesses the same email is a customer of, so the
  app can keep one session per business. Never before sign-in, so nobody can check which emails exist.
- **BC5:** add portal endpoints to `npm run contract`.

## 5. Build order

Each step ends with typecheck, lint, tests, contract check and a click-through on the emulator.

| Step | What | Size |
| --- | --- | --- |
| 1 | **Mode shell:** pick agency or client mode after sign-in, agency switcher, "Viewing client · Back to agency" bar, agency tab bar | M |
| 2 | **Agency home + clients list + client detail (read)** (A1, A2, A3 read) | M |
| 3 | **Client actions + team + portal customers + add/invite client** (A3–A5), with role and scope checks | L |
| 4 | **Credits, buy credits, billing status, reports, usage** (A6–A8) | M |
| 5 | **Team, alerts with push deep links, activity** (A9–A11, BA1–BA3) | M |
| 6 | **Customer backend** (BC1–BC5) | L |
| 7 | **Customer sign-in, branding, home, appointments** (C1–C4) | M |
| 8 | **Messages, invoices, documents, Me, push** (C5–C9) | M |

Agency first: those people already have accounts and already open the app. The customer side needs the backend
work before any screen can be used.

## 6. Decisions for the owner

1. **Customers in this app, or in a separate branded app?** **Decided 2026-11-04: same app.** Customers get a
   "customer" mode inside this app with the business's branding. A white-label branded app (the web's "Mobile
   app: coming soon" page) can come later from the same code.
2. **New design first?** The new mobile style (4 directions on the Design canvas) is still waiting for a pick.
   Recommended: pick it before step 2, so the new screens are built once in the new look.
3. **How do customers find their business?** Recommended: through the email link (it opens the app on the
   right business) or by scanning a QR or code the business shares. No public search of businesses.
