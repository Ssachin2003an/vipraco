# VipraCo — AI-Driven Multi-Tenant HR Assistant

Built for the **Hack-The-Work** hackathon. React + Express + Mongoose + MongoDB, chat interface with regex/keyword NLP intent engine (optional Gemini/OpenAI fallback for unknown queries).

## Structure
```
vipraco/
├── backend/     Express API, Mongoose models, NLP engine
└── frontend/    React + Tailwind chat UI
```

## Setup

### 1. Database
Local MongoDB or Atlas — either works. Default connects to `mongodb://localhost:27017/vipraco`.
For Atlas, just drop your connection string into `MONGO_URI` in `.env`.

### 2. Backend
```bash
cd backend
cp .env.example .env
# edit .env: set MONGO_URI, JWT_SECRET
# optional: set GEMINI_API_KEY for LLM fallback on unrecognized questions
npm install
npm run seed      # clears + seeds collections (3 orgs, 6 users)
npm run dev        # starts on http://localhost:5000
```

**Demo login:** any seeded email below, password `password123`
- `rahul.verma@techcorp.com` — TechCorp Innovations, Employee
- `ananya.sharma@techcorp.com` — TechCorp Innovations, Manager
- `geeta.devi@mgfab.com` — Muzaffarpur Global Fabricators, Employee
- `suresh.kumar@mgfab.com` — Muzaffarpur Global Fabricators, Manager

### 3. Frontend
```bash
cd frontend
npm install
npm run dev         # starts on http://localhost:5173, proxies /api to :5000
```

Open http://localhost:5173, log in, and chat.

## Multi-tenancy demo
Log in as `rahul.verma@techcorp.com` (TechCorp) → ask "What is my CTC?" → then sign out, log in as `geeta.devi@mgfab.com` (Muzaffarpur) → ask the same question. Every query in `queryController.js` filters strictly by `req.user.organization_id` taken from the JWT — never from client input — so each org only ever sees its own data.

## What VipraCo can answer
- Profile: employee ID, role, manager, email, join date, department
- Leave: balance by type, leaves taken, pending approval
- Policies: WFH, travel & expense, holidays, safety, attendance
- Payroll: base salary, CTC, PF, HRA, professional tax
- Cross-employee lookup within same org: "Who is Rahul Verma's manager?"

## Architecture notes
- **Auth**: JWT carries `user_id` + `organization_id` + `role`. `middleware/auth.js` verifies it; every controller trusts only the token, never the request body, for tenant scoping.
- **NLP**: `utils/nlpEngine.js` does regex/keyword intent detection (no external calls, works offline). Unmatched queries optionally fall back to `utils/llmClient.js` (Gemini or OpenAI) grounded strictly in the caller's own retrieved DB records.
- **Schema**: matches the hackathon spec exactly — Organizations, Users (self-referencing `manager_id`), LeaveBalances, CompanyPolicies, PayrollData — five Mongoose collections, each carrying `organization_id` for isolation. No formal joins; relationships (e.g. manager lookup) are resolved with a second scoped `find()` in application code.

## Extending
- Add more intents in `nlpEngine.js` + a matching case in `queryController.js`.
- Swap the seed demo password check for full bcrypt-only in production.
- Add rate limiting / refresh tokens for production hardening.
- For scale, add indexes on `{ organization_id, user_id }` (already indexed) and consider MongoDB's schema validation or a discriminator pattern if HR modules grow.
