# FoodBridge 🌱

> Connecting food donors with recipients in real time, turning surplus into sustenance.

![Status](https://img.shields.io/badge/status-in%20development-orange)
![Node](https://img.shields.io/badge/node-v22-green)
![React](https://img.shields.io/badge/react-v18-blue)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

---

## About

FoodBridge is a community food sharing platform that addresses two parallel crises,
preventable food waste and food insecurity. Donors (restaurants, households, grocery
stores) post surplus food listings in real time. Recipients discover nearby donations
on an interactive map and claim them instantly, subject to a fair-distribution limit
that ensures equitable access across the community.

Built by **Team ShareBite** as a capstone project for SWDV 1014 Software Project
at Red Deer Polytechnic.

---

## Team

| Name | Student ID | Role | GitHub |
|------|-----------|------|--------|
| Lucky Nkwor | 000XXXXXX | Team Leader / Backend Dev | [@lucky-blessed](https://github.com/lucky-blessed) |
| Yi Zhang | 000XXXXXX | Recorder / Backend Dev | [@MonsterEdward](https://github.com/MonsterEdward) |
| Upashana Khanal | 000XXXXXX | Developer (Frontend) | [@upashanakhanal](https://github.com/upashanakhanal) |
| Kartic Bavoria | 000XXXXXX | Designer / QA | [@karticbavoria](https://github.com/karticbavoria) |

> **Instructor:** Ezra Mallo &nbsp;|&nbsp; **Course:** SWDV 1014 &nbsp;|&nbsp; **Institution:** Red Deer Polytechnic

---

## Features

- 🔐 **Role-based authentication** — separate flows for Donors, Recipients, and Admins
- 📍 **Geospatial discovery** — find food listings within a configurable radius using MongoDB 2dsphere index
- ⚡ **Real-time updates** — Socket.io broadcasts listing changes instantly to all connected clients
- ⚖️ **Fair distribution** — configurable 7-day rolling claim window prevents monopolisation
- 🚩 **Admin moderation** — flag, hide, or delete listings; manage users; generate distribution reports
- 📊 **Impact dashboard** — community stats, donor badges, leaderboard, and environmental impact metrics
- 📷 **Photo uploads** — Cloudinary CDN for food listing images with automatic resizing
- 📧 **Email notifications** — SendGrid integration for claim confirmations and pickup reminders

---

## Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js v22 |
| Framework | Express.js |
| Relational DB | PostgreSQL (Render) |
| Document DB | MongoDB Atlas |
| Cache / Pub-Sub | Redis (Upstash) |
| Real-time | Socket.io |
| Auth | JWT + bcrypt |
| File storage | Cloudinary |
| Email | SendGrid |
| Scheduler | node-cron |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| HTTP client | Axios |
| Maps | Google Maps JavaScript API |
| Real-time | Socket.io client |

### DevOps
| Tool | Purpose |
|------|---------|
| GitHub Actions | CI/CD pipeline |
| Render.com | Backend deployment |
| Vercel | Frontend deployment |

---

## Project Structure
```
foodbridge/                     ← monorepo root
├── backend/                    ← Node.js + Express API
│   ├── src/
│   │   ├── services/
│   │   │   ├── auth/           ← register, login, JWT
│   │   │   ├── listing/        ← CRUD + geospatial search
│   │   │   ├── claim/          ← fair distribution engine
│   │   │   ├── notification/   ← email + push events
│   │   │   └── admin/          ← moderation + reports
│   │   ├── middleware/         ← JWT auth, error handling
│   │   ├── models/             ← PostgreSQL + Mongoose schemas
│   │   ├── config/             ← database connections
│   │   ├── app.js              ← Express setup
│   │   └── server.js           ← entry point
│   └── tests/                  ← Jest + Supertest
└── frontend/                   ← React + Vite SPA
    └── src/
        ├── pages/              ← one folder per screen
        ├── components/         ← reusable UI components
        ├── hooks/              ← custom React hooks
        ├── services/           ← Axios API calls
        └── context/            ← React context (auth state)
```

---

## Getting Started

### Prerequisites

Make sure you have these installed:
```bash
node --version    # v18 or higher
npm --version     # v9 or higher
git --version     # v2 or higher
```

### 1. Clone the repository
```bash
git clone https://github.com/YOUR-USERNAME/foodbridge.git
cd foodbridge
```

### 2. Set up the backend
```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in your values (see [Environment Variables](#environment-variables) below).
```bash
npm run dev
# Server starts at http://localhost:3000
# Test it: http://localhost:3000/health
```

### 3. Set up the frontend
```bash
cd ../frontend
npm install
cp .env.example .env
```
```bash
npm run dev
# App starts at http://localhost:5173
```

---

## Environment Variables

Create a `.env` file in the `backend/` folder. A template is provided in `.env.example`.

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `PORT` | Server port | Default: `3000` |
| `NODE_ENV` | Environment | `development` or `production` |
| `DATABASE_URL` | PostgreSQL connection string | [Render.com](https://render.com) |
| `MONGODB_URI` | MongoDB connection string | [MongoDB Atlas](https://cloud.mongodb.com) |
| `JWT_SECRET` | Secret for signing tokens | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Token lifetime | Default: `7d` |
| `REDIS_URL` | Redis connection string | [Upstash](https://upstash.com) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | [Cloudinary](https://cloudinary.com) |
| `CLOUDINARY_API_KEY` | Cloudinary API key | [Cloudinary](https://cloudinary.com) |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | [Cloudinary](https://cloudinary.com) |
| `SENDGRID_API_KEY` | SendGrid API key | [SendGrid](https://sendgrid.com) |
| `CLIENT_URL` | Frontend URL for CORS | Default: `http://localhost:5173` |

---

## API Reference

Base URL: `http://localhost:3000`

### Health
```
GET /health           → server status check
```

### Auth
```
POST /auth/register   → create account
POST /auth/login      → login and receive JWT
```

### Listings
```
GET    /listings      → discover nearby food (geo-query)
POST   /listings      → post a donation [donor]
PATCH  /listings/:id  → update a listing [donor]
DELETE /listings/:id  → remove a listing [donor]
```

### Claims
```
POST /claims          → claim a listing [recipient]
GET  /claims/me       → my claim history [recipient]
```

### Admin
```
GET   /admin/listings           → all listings [admin]
PATCH /admin/listings/:id/flag  → flag a listing [admin]
GET   /admin/reports/distribution → claim distribution report [admin]
```

> Full API documentation with request/response examples: _coming soon_

---

## Database Schema

### PostgreSQL Tables
```sql
users           → id, email, password_hash, first_name, last_name, role, created_at
claim_records   → id, recipient_id, listing_id, claimed_at, status
audit_log       → id, admin_id, action, target_id, reason, created_at
```

### MongoDB Collections
```
listings        → title, category, quantity, unit, condition, description,
                  photo_url, location (2dsphere), pickup_start, pickup_end,
                  status, donor_id, created_at
```

---

## Running Tests
```bash
cd backend
npm test              # run all tests once
npm run test:watch    # run tests on every file save
```

Test coverage targets:
- [ ] T-01 to T-16 defined in project documentation
- [ ] All auth routes covered
- [ ] Claim limit enforcement tested
- [ ] Geospatial query tested

---

## Deployment

### Backend — Render.com
1. Connect your GitHub repo to Render
2. Set all environment variables in the Render dashboard
3. Deploy command: `npm start`

### Frontend — Vercel
1. Connect your GitHub repo to Vercel
2. Set `VITE_API_BASE_URL` to your Render backend URL
3. Framework preset: Vite

Live URLs:
- Frontend: _coming soon_
- Backend API: _coming soon_

---

## Development Workflow
```bash
# Start a new feature
git checkout -b feature/your-feature-name

# Work, commit often
git add .
git commit -m "feat: describe what you built"

# Push and open a Pull Request
git push origin feature/your-feature-name
# → open PR on GitHub → get 1 approval → merge to main
```

**Commit message prefixes:**
- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation
- `refactor:` — code restructuring
- `test:` — adding tests

---

## Project Status

| Milestone | Status |
|-----------|--------|
| Project documentation (SRS, use cases, ERD) | ✅ Complete |
| Wireframes + interactive prototype | ✅ Complete |
| Figma design specification | ✅ Complete |
| System architecture design | ✅ Complete |
| Backend scaffold + health check | ✅ Complete |
| Database setup (PostgreSQL + MongoDB) | 🔄 In Progress |
| Auth service (register + login) | ⏳ Pending |
| Listing service (CRUD + geo-search) | ⏳ Pending |
| Claim service (fair distribution) | ⏳ Pending |
| React frontend — all 6 screens | ⏳ Pending |
| Real-time Socket.io integration | ⏳ Pending |
| Testing (T-01 to T-16) | ⏳ Pending |
| Deployment (Render + Vercel) | ⏳ Pending |

---

## License

MIT © 2026 Team ShareBite — Red Deer Polytechnic
