# Roomify V2 — Development Plan

This document outlines the step-by-step tasks for building Roomify V2, based on the architecture and implementation blueprint. Each phase includes a checklist of tasks and subtasks to ensure a structured and efficient development process.

---

## Phase 0: Project Setup & Foundation (1–2 days)

- [ ] **1. Initialize Project Repository**
    - [ ] Initialize `git` repository.
    - [ ] Create a `README.md` file with a project summary.
    - [ ] Create a `.gitignore` file with standard Node.js and Next.js ignores.

- [ ] **2. Set Up Monorepo with `pnpm`**
    - [ ] Initialize `pnpm` workspace.
    - [ ] Create `packages` directory for `app` and `worker`.

- [ ] **3. Scaffold Next.js Application**
    - [ ] Create a new Next.js app in `packages/app`.
    - [ ] Configure TypeScript, ESLint, and Prettier.
    - [ ] Set up Husky for pre-commit hooks (linting and formatting).

- [ ] **4. Set Up Database with Prisma**
    - [ ] Initialize Prisma in `packages/app`.
    - [ ] Create `schema.prisma` file with the defined data model.
    - [ ] Set up a local PostgreSQL instance using Docker.
    - [ ] Connect Prisma to the local database.
    - [ ] Run initial Prisma migration to create the database schema.

---

## Phase 1: Core Models & Authentication (3–5 days)

- [ ] **1. Implement Prisma Models & Migrations**
    - [ ] Translate the full Prisma schema from `IDEA.md` into `schema.prisma`.
    - [ ] Generate Prisma Client.
    - [ ] Create initial migration and apply it to the database.

- [ ] **2. Implement Authentication & Session Management**
    - [ ] Set up NextAuth.js.
    - [ ] Implement `Credentials` provider for email/password authentication.
    - [ ] Create sign-up, sign-in, and sign-out API routes.
    - [ ] Implement JWT with refresh tokens in HttpOnly cookies.
    - [ ] Create middleware to protect routes and manage sessions.

- [ ] **3. Implement House & Membership Flows**
    - [ ] Create API routes for creating and managing houses.
    - [ ] Implement logic for inviting and accepting members.
    - [ ] Create UI components for house creation and management.

---

## Phase 2: Expenses & Balances (3–5 days)

- [ ] **1. Implement Expenses CRUD**
    - [ ] Create API routes for creating, reading, and updating expenses.
    - [ ] Implement expense splitting logic (equal and by shares).
    - [ ] Create UI components for adding and viewing expenses.

- [ ] **2. Implement Balance Calculation**
    - [ ] Develop logic to calculate per-user balances.
    - [ ] Create API endpoint to retrieve user balances.
    - [ ] Display balances on the user dashboard.

- [ ] **3. Implement Receipt Uploads**
    - [ ] Set up Supabase Storage for file uploads.
    - [ ] Create API route for uploading receipts.
    - [ ] Connect receipt uploads to the expense creation form.

---

## Phase 3: Chore Rotation & Notifications (3–5 days)

- [ ] **1. Implement Chore Management**
    - [ ] Create API routes for creating and managing chores.
    - [ ] Implement UI for chore creation and viewing.

- [ ] **2. Set Up Background Worker**
    - [ ] Create a new Node.js project in `packages/worker`.
    - [ ] Set up BullMQ with Redis for background jobs.
    - [ ] Dockerize the worker for deployment.

- [ ] **3. Implement Chore Rotation**
    - [ ] Create a background job to rotate chore assignments weekly.
    - [ ] Schedule the job using a cron expression.

- [ ] **4. Implement Notification System**
    - [ ] Create API routes for sending and receiving notifications.
    - [ ] Implement in-app and email notifications for bills and chores.
    - [ ] Set up SendGrid for transactional emails.

---

## Phase 4: UI Polish & PWA (2–4 days)

- [ ] **1. Enhance UI/UX**
    - [ ] Implement responsive design for all pages.
    - [ ] Add animations and transitions with Framer Motion.
    - [ ] Refine the dashboard with a card-based layout.

- [ ] **2. Implement PWA Features**
    - [ ] Create a `manifest.json` file.
    - [ ] Set up a service worker for offline caching.
    - [ ] Implement "add to home screen" functionality.

---

## Phase 5: Testing, CI/CD, & Deployment (2–4 days)

- [ ] **1. Write Tests**
    - [ ] Write unit tests with Vitest for critical functions.
    - [ ] Write integration tests for API routes.
    - [ ] Write E2E tests with Playwright for key user flows.

- [ ] **2. Set Up CI/CD**
    - [ ] Create GitHub Actions workflows for linting, testing, and building.
    - [ ] Configure a deployment pipeline for Vercel and Render.

- [ ] **3. Deploy to Production**
    - [ ] Deploy the Next.js app to Vercel.
    - [ ] Deploy the worker to Render.
    - [ ] Set up a production PostgreSQL database.

- [ ] **4. Set Up Monitoring**
    - [ ] Integrate Sentry for error tracking.
    - [ ] Set up a logging provider for structured logs.

---

## Phase 6: Extras (Optional)

- [ ] **1. Implement CSV/PDF Export**
    - [ ] Add functionality to export monthly expense reports.

- [ ] **2. Develop Advanced Analytics**
    - [ ] Create a dashboard for house admins with spending trends.

- [ ] **3. Enhance Multi-House Management**
    - [ ] Allow users to be members of multiple houses simultaneously.

---

## Documentation & Handoffs

- [ ] **1. Create API Documentation**
    - [ ] Generate an `API.md` file with request/response examples.
    - [ ] Create a Postman/Insomnia collection for the API.

- [ ] **2. Maintain a Changelog**
    - [ ] Keep a `CHANGELOG.md` file with updates for each release.
