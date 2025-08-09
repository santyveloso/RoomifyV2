# Roomify V2 — Architecture & Implementation Blueprint

**Audience:** Senior engineers, software architects, and developer-focused AI agents. Intended to be consumed by an AI CLI runner or used as a reproducible engineering specification.

---

# Executive summary

Roomify V2 is a polished, production-oriented full‑stack platform for managing student shared housing. V1 was a university project with a basic React front end and Django back end. V2 reimplements the platform using a single JavaScript/TypeScript stack (Next.js + Prisma + PostgreSQL) to achieve: maintainability, strong CV signal, fast iteration, and a deployable cloud architecture.

Goals for this blueprint:

* Provide a complete, actionable spec: DB schema (Prisma), API contract, Next.js app layout, CI/CD, infra recommendations, testing plan, security checklist and phased roadmap.
* Keep the scope intentionally MVP-focused: two roles (Admin, Roomie), expense splitting, recurring/rotating chores, shared bulletin, notifications, receipts, basic analytics, PWA support.
* No advanced AI or contract-signing in MVP.

---

# What Roomify V1 was

**Purpose:** a course project to manage houses and rooms for students.

**Core capabilities (V1)**

* User registration and login (basic).
* CRUD for houses and rooms.
* Associate users to rooms.
* Simple UI to view house state; limited UX polish.

**V1 stack**

* Frontend: React (no framework details available).
* Backend: Django (monolith), default SQLite/Postgres unclear.
* Auth: Django built‑in auth.
* Storage: local or Django-backed static file serving.
* Infra: academic, not production-ready.

**Limitations observed**

* Tight coupling between frontend and backend; no clear API contract.
* No formal migration/test strategy.
* Minimal security controls and no CI/CD.
* UX and product polish lacking.

---

# Roomify V2 — target product (MVP scope)

**Users & roles**

* `Admin` — creates/manages the House, invites Roomies, creates chores, configures recurring payments and expenses, reconciles debts.
* `Roomie` — accepts invite, sees dashboard, adds expenses, marks chores done, posts to bulletin.

**Core features (MVP)**

1. **House lifecycle**: create house, invite members, manage membership.
2. **Expense tracking**: add expense (photo optional), split equally or by shares, mark as paid, calculate per-user balance, month view with export CSV/PDF.
3. **Chore manager**: admin defines chores, system rotates assignment weekly, mark as completed; history preserved.
4. **Bulletin board**: ephemeral messages with reactions.
5. **Notifications**: in-app and email reminders for upcoming bills or missed chores.
6. **Receipts & files**: upload receipts to Supabase Storage / Cloudinary.
7. **Dashboard**: concise cards — next payment, outstanding balances, upcoming chores, latest messages.
8. **PWA basics**: add to home screen, offline read for last-synced data; write operations queue when offline.

**Non-functional requirements**

* Auth: secure, session-based with JWT refresh tokens managed by HttpOnly cookies.
* Performance: 200ms median API response under normal load; front-end hydration < 400ms on mobile 4G.
* Scalability: single-tenant design with easy horizontal scale for read-heavy workloads.
* Privacy & compliance: GDPR-aware defaults (data deletion workflow, minimal data retained).

---

# High-level architecture

**Primary stack**

* Next.js (App Router + Server Components) — full stack TypeScript.
* Node.js runtime (Vercel serverless functions for API routes or hybrid with dedicated Node service for background workers).
* PostgreSQL (managed via Supabase, Railway, or AWS RDS).
* Prisma ORM & `prisma migrate`.
* Redis for background job queue (BullMQ) and ephemeral locks.
* Storage: Supabase Storage or Cloudinary for receipts/images.
* Email provider: SendGrid (or Postmark) for transactional emails.
* CI: GitHub Actions; CD: Vercel for app + Render/Railway for workers if needed.
* Monitoring: Sentry for errors, Prometheus / Grafana optional for metrics (or a hosted alternative).

**Runtime components**

* **Next.js app** — UI + Server Components + API Routes for CRUD.
* **Worker process** — background queue for emails, notification scheduling, report generation, and periodic chores rotation.
* **Database** — Postgres primary; Redis for queues and locks.
* **Object storage** — receipt images and thumbnails.

**Deployment model**

* Frontend + API (Next.js) deployed to Vercel.
* Worker(s) deployed to Render / Railway as a long-running service connected to Redis & DB.
* DB hosted on managed Postgres provider (SSL required).
* Storage hosted on Supabase/Cloudinary.

---

# Data model (Prisma schema)

Below is a pragmatic schema designed for the MVP. It focuses on relational integrity and clear ownership semantics.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id             String    @id @default(uuid())
  email          String    @unique
  name           String?
  avatarUrl      String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  memberships    Membership[]
  messages       Message[]
  expenses       Expense[]  @relation("creator_expenses")
}

model House {
  id            String    @id @default(uuid())
  name          String
  address       String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  memberships   Membership[]
  chores        Chore[]
  expenses      Expense[]
}

model Membership {
  id        String   @id @default(uuid())
  user      User     @relation(fields: [userId], references: [id])
  userId    String
  house     House    @relation(fields: [houseId], references: [id])
  houseId   String
  role      Role     @default(ROOMIE)
  joinedAt  DateTime @default(now())
  active    Boolean  @default(true)

  @@unique([userId, houseId])
}

enum Role { ADMIN ROOMIE }

model Expense {
  id           String      @id @default(uuid())
  house        House       @relation(fields: [houseId], references: [id])
  houseId      String
  creator      User        @relation("creator_expenses", fields: [creatorId], references: [id])
  creatorId    String
  title        String
  amount       Decimal     @db.Decimal(10, 2)
  currency     String      @default("EUR")
  date         DateTime    @default(now())
  receiptUrl   String?
  splitEqual   Boolean     @default(true)
  paidByUserId String?     // optional, who paid
  status       ExpenseStatus @default(OPEN)
  shares       ExpenseShare[]
}

enum ExpenseStatus { OPEN SETTLED }

model ExpenseShare {
  id         String   @id @default(uuid())
  expense    Expense  @relation(fields: [expenseId], references: [id])
  expenseId  String
  user       User     @relation(fields: [userId], references: [id])
  userId     String
  amount     Decimal  @db.Decimal(10, 2)
  settled    Boolean  @default(false)
}

model Chore {
  id          String   @id @default(uuid())
  house       House    @relation(fields: [houseId], references: [id])
  houseId     String
  title       String
  description String?
  frequency   Frequency @default(WEEKLY)
  active      Boolean   @default(true)
  assignments ChoreAssignment[]
}

enum Frequency { WEEKLY MONTHLY }

model ChoreAssignment {
  id        String   @id @default(uuid())
  chore     Chore    @relation(fields: [choreId], references: [id])
  choreId   String
  user      User     @relation(fields: [userId], references: [id])
  userId    String
  dueDate   DateTime
  completed Boolean  @default(false)
  completedAt DateTime?
}

model Message {
  id        String   @id @default(uuid())
  house     House    @relation(fields: [houseId], references: [id])
  houseId   String
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  text      String
  createdAt DateTime @default(now())
}

model Notification {
  id         String   @id @default(uuid())
  user       User?    @relation(fields: [userId], references: [id])
  userId     String?
  house      House?   @relation(fields: [houseId], references: [id])
  houseId    String?
  type       String
  payload    Json
  sentAt     DateTime?
  read       Boolean  @default(false)
}
```

Notes:

* All monetary values use Decimal with 2 fractional digits.
* `ExpenseShare` exists so splitting logic lives in the DB and is auditable.
* `Membership` maps users to houses with roles.

---

# API surface (REST-style; GraphQL is a reasonable alternative but REST keeps the attack surface minimal for MVP)

All endpoints are under `/api/v1/` and enforce house scoping via middleware that validates membership.

**Auth & session**

* `POST /api/v1/auth/signup` — body: `{ name, email, password }` — returns session cookie and user.
* `POST /api/v1/auth/signin` — body: `{ email, password }`.
* `POST /api/v1/auth/signout` — clears cookie.
* `POST /api/v1/auth/invite` — Admin invites by email → create pending Membership + send email.
* `POST /api/v1/auth/accept-invite` — token flow for invite acceptance.

**House**

* `POST /api/v1/houses` — create house (Admin becomes owner role).
* `GET /api/v1/houses/:id` — house details + membership list.
* `PATCH /api/v1/houses/:id` — admin update.

**Memberships**

* `POST /api/v1/houses/:id/invite` — invite users.
* `POST /api/v1/houses/:id/members/:memberId/kick` — admin only.

**Expenses**

* `POST /api/v1/houses/:id/expenses` — body: `{ title, amount, currency, splitEqual, shares?: [{userId, amount}] }`.
* `GET /api/v1/houses/:id/expenses?month=YYYY-MM` — list.
* `POST /api/v1/houses/:id/expenses/:expenseId/mark-paid` — mark settled.

**Chores**

* `POST /api/v1/houses/:id/chores` — create chore.
* `GET /api/v1/houses/:id/chores` — list with next assignments.
* `POST /api/v1/houses/:id/chores/:choreId/complete` — mark complete (user).

**Messages**

* `GET /api/v1/houses/:id/messages` — list recent.
* `POST /api/v1/houses/:id/messages` — post message.

**Notifications**

* `GET /api/v1/users/:id/notifications` — list.
* `POST /api/v1/users/:id/notifications/:notifId/read` — mark read.

Each write operation emits events to the worker queue as needed (email, scheduled reminders, analytics aggregation).

---

# Next.js App layout (recommended)

```
/app
  /(auth)
    /signin/page.tsx
    /signup/page.tsx
  /house
    /[houseId]
      /dashboard/page.tsx
      /expenses/page.tsx
      /chores/page.tsx
      /messages/page.tsx
  /settings
    /profile/page.tsx
    /integrations/page.tsx
/lib
  /prisma.ts
  /auth.ts
  /mailer.ts
/components
  /ui
  /layout
  /cards
  /forms
/styles
/public
  /manifest.json
  /icons
/pages/api
  /v1
    /auth
    /houses
    /expenses
    /chores
/tests
  /e2e
  /unit

```

Notes:

* Prefer Server Components for data-heavy UI that is not highly interactive.
* Use client components for forms and real-time interactions.
* Centralize API fetch helpers and typed response shapes (use `zod` for runtime validation).

---

# Authentication & Authorization

**Strategy**

* Use NextAuth (with Email+Password via Credentials provider or custom API) or a custom JWT solution with refresh tokens in HttpOnly cookies.
* Server middleware enforces membership for house-scoped endpoints.
* Role-based checks: middleware or a policy layer that denies Admin-only routes to Roomies.

**Token/session rules**

* Access tokens short-lived (e.g. 15m). Refresh tokens long-lived (7d) rotated on use.
* Store tokens in secure, HttpOnly cookies with `SameSite=Lax`.

**Password policy**

* Minimum length 10, require at least two character classes.
* Rate-limit sign-in attempts and lock account on brute-force patterns.

---

# Background worker & scheduling

**Responsibilities**

* Send transactional emails (invites, reminders).
* Run chore rotation job (cron: daily at 02:00 UTC; check for houses needing rotation for next week).
* Generate aggregated monthly balance reports.
* Reconciliation tasks (detect unpaid shares > 30 days and notify admin/roomies).

**Implementation**

* Use BullMQ (NodeJS) + Redis. Worker code in `./worker` directory; Dockerfile and deploy separately.
* Jobs enqueued from Next.js API routes.

---

# Storage & file handling

* Use Supabase Storage or Cloudinary for receipt images.
* On upload: accept image, run server-side validations (max 5 MB, allowed MIME types), store original + generate thumbnail job in worker.
* Store `receiptUrl` as signed public URLs or proxied via server for access control.

---

# Observability and monitoring

* **Errors:** Sentry integration in Next.js and worker.
* **Logs:** structured JSON logs; push to a hosted log provider (Logflare / Papertrail / Datadog).
* **Metrics:** basic app-level metrics (requests, queue length, worker successes/failures).
* **Uptime:** health endpoints for Next.js and worker for platform checks.

---

# CI/CD example

**GitHub Actions (high level)**

* `on: push` to `main` branch → run `lint`, `type-check`, `test:unit`, `build`, then `deploy` to Vercel.
* PR checks run `lint`, `type-check`, `test:unit` and `e2e` where feasible.

*Snippet — deploy pipeline (conceptual)*

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm -w test
      - run: pnpm build
  deploy:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm build
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

# Testing strategy

* **Unit:** Vitest for UI and isolated functions; test Prisma client interactions with a test DB or `@prisma/client` testing helpers.
* **Integration:** API route tests using Supertest or direct fetch to a test instance.
* **E2E:** Playwright for critical flows (signup, house creation, expense lifecycle, chore completion).
* **Contract tests:** optional small suite for API shapes (OpenAPI validation).

---

# Security checklist

**Critical**

* Enforce TLS for all traffic, HSTS header.
* HttpOnly, Secure cookies for sessions.
* Server-side input validation (Zod) on all API routes.
* Rate limiting by IP and user on auth endpoints.
* CSRF protections on state-changing endpoints (cookie-based sessions).
* Validate file uploads: content-type and magic bytes, file size.

**Recommended**

* Content Security Policy (CSP) header tuned for your static asset host.
* Least privilege on DB credentials; separate read-only user for analytics queries.
* Periodic dependency audits (`npm audit` + Dependabot alerts).
* Secrets in GitHub Secrets / Vercel environment variables, not in repo.

---

# Roadmap & milestones (phased)

**Phase 0 — Setup (1–2 days)**

* Repo scaffolding, TypeScript, ESLint, Prettier, Husky, pnpm, basic Next.js layout, Prisma init, Postgres dev instance.

**Phase 1 — Core models & auth (3–5 days)**

* Implement Prisma models, migrations, NextAuth/credential auth, membership flows, create house flow.

**Phase 2 — Expenses & balances (3–5 days)**

* Expenses CRUD, splitting logic, per-user balances, receipt upload.

**Phase 3 — Chore rotation & notifications (3–5 days)**

* Chore definitions, assignment rotation worker, basic notification pipeline.

**Phase 4 — UI polish & PWA (2–4 days)**

* Responsive UI, animations (Framer Motion), offline basics, manifest + service worker.

**Phase 5 — Tests, CI/CD, deploy (2–4 days)**

* Add tests, GitHub Actions, Sentry, deploy to Vercel + worker host.

**Phase 6 — Extras (optional)**

* CSV/PDF export, advanced analytics, multi-house management enhancements.

---

# Developer handoffs & documentation

* Maintain an `API.md` with request/response examples and authentication details.
* Keep `prisma/schema.prisma` as the source of truth.
* Provide Postman/Insomnia collection for QA.
* Changelog and release notes in `CHANGELOG.md` (Keep a semantic versioning policy).

---

# Open decisions (items to finalize before coding)

* Email strategy: verify provider (SendGrid vs Postmark).
* Choice of object storage (Supabase Storage recommended for integrated developer UX).
* Deploy worker service: Render vs Railway vs a small EC2 container.

---

# Final notes

This spec is intended to be exact enough to seed implementation by a single developer or small team and machine-consumable by a prompt-driven code generator. It balances pragmatic MVP scope with enough complexity to be CV-worthy: full-stack TypeScript, DB migrations, background processing, deployment, and observability.

---

Q1: Do you want the Prisma schema expanded with seed data and SQL fixtures for tests?
Q2: Do you want a fully typed OpenAPI spec (YAML) for all routes so the CLI AI can auto-generate client/server stubs?
Q3: Do you want I produce the GitHub Actions full YAML files, Dockerfiles for worker, and a `terraform` skeleton for infra?
