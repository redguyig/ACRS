# Architecture — Academic Code Review System

## Overview

The system is a multi-container web application deployed on a single AWS EC2 instance. Four Docker containers are orchestrated via Docker Compose and exposed to the internet through a single Nginx reverse proxy. PostgreSQL runs on AWS RDS (managed, outside the EC2 containers).

---

## Container Layout

```
[ Browser / Client ]
        |
        | HTTPS (port 443)
        ↓
[ Nginx Reverse Proxy ]          ← single entry point on EC2
        |           |
        ↓           ↓
[ Next.js :3000 ]  [ Express API :4000 ]
                         |           |
                         ↓           ↓
                  [ PostgreSQL ]   [ Redis ]
                  (AWS RDS)        (Bull Queue)
                                     |
                                     ↓
                        [ Python Moss Microservice :5000 ]
```

### Containers

| Container | Image / Runtime | Port | Role |
|---|---|---|---|
| `nginx` | nginx:alpine | 80 / 443 | Reverse proxy, SSL termination |
| `web` | node:20-alpine | 3000 | Next.js frontend (SSR + API routes) |
| `api` | node:20-alpine | 4000 | Express REST API |
| `moss-worker` | python:3.11-slim | 5000 | Plagiarism microservice (Flask + mosspy) |

PostgreSQL and Redis run outside the app containers:
- **PostgreSQL** → AWS RDS t3.micro (Free Tier)
- **Redis** → runs as a fifth Docker container on EC2 (or can be moved to ElastiCache later)

---

## Nginx Routing Rules

```nginx
# Frontend — all non-API traffic
location / {
    proxy_pass http://web:3000;
}

# Backend API
location /api/ {
    proxy_pass http://api:4000;
}
```

SSL is handled at the Nginx layer using Let's Encrypt (Certbot). The Express and Next.js services never see raw HTTPS.

---

## Request Flows

### Student Code Submission

```
Browser
  → POST /api/submissions          (multipart: code + metadata)
  → Express validates JWT, checks deadline
  → Prisma writes to submissions table (PostgreSQL)
  → 201 response with submission ID
```

### Faculty Code Review

```
Browser
  → GET /api/submissions/:id       (faculty JWT required)
  → Express fetches submission + comments + rubric_scores
  → Next.js renders Monaco (read-only) + comment overlays
  → Faculty clicks line → POST /api/comments
  → Faculty sets rubric → PATCH /api/submissions/:id/rubric
  → Faculty publishes → PATCH /api/submissions/:id/publish
      → status set to REVIEWED, feedback unlocked for student
```

### Plagiarism Check

```
Faculty triggers check
  → POST /api/plagiarism/run { assignment_id }
  → Express enqueues Bull job in Redis
  → Bull worker calls Python microservice: POST :5000/run-moss
  → moss-worker fetches all submissions from PostgreSQL
  → Writes code to temp files → submits to Moss (mosspy)
  → Moss returns report URL
  → moss-worker parses pairwise similarity scores
  → Scores written to plagiarism table in PostgreSQL
  → Temp files deleted
  → Job status updated → frontend polls or uses SSE
```

---

## Authentication Architecture

- JWT issued on login, stored in `httpOnly` cookie (not accessible to JS — prevents XSS theft)
- Token payload: `{ userId, role, courseId, iat, exp }`
- Token expiry: 24 hours; no refresh token in v1 (re-login required)
- Express middleware extracts and verifies JWT on every `/api/*` route
- Next.js middleware enforces role-based redirects on frontend routes before page render

Role hierarchy:

```
Admin > Faculty > Student
```

---

## Async Job Architecture (Plagiarism)

Bull (backed by Redis) handles the Moss job queue. This keeps the HTTP response fast — the faculty gets an immediate "check queued" response, and the report appears once the job completes.

```
Express → Bull Queue (Redis)
              ↓
         Bull Worker (Node.js)
              ↓
         Python Microservice (Flask)
              ↓
         Moss (external, Stanford)
              ↓
         PostgreSQL (results stored)
```

The frontend polls `GET /api/plagiarism/status/:assignmentId` every 5 seconds until status is `COMPLETE`.

---

## Deployment — AWS Free Tier

| Resource | Service | Spec | Notes |
|---|---|---|---|
| Compute | EC2 | t2.micro (1 vCPU, 1 GB RAM) | Requires 2 GB swap space configured to handle Next.js builds and Puppeteer |
| Database | RDS | db.t3.micro, PostgreSQL 15 | |
| Storage | EBS | 20 GB gp2 (EC2 root) | |
| DNS / SSL | Route 53 + Certbot | Custom domain + HTTPS | |

All four app containers share the t2.micro. Given the expected low concurrency (college-scale usage), this is sufficient for an academic tool.

---

## Environment Variables (Summary)

```env
# API
DATABASE_URL=postgresql://...
REDIS_URL=redis://redis:6379
JWT_SECRET=...
MOSS_MICROSERVICE_URL=http://moss-worker:5000
NODE_ENV=production

# Moss Worker
DATABASE_URL=postgresql://...
MOSS_USER_ID=...          # registered Moss account ID

# Next.js
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

Secrets are managed via a `.env` file on EC2 (not committed to the repo). Production should migrate to AWS Secrets Manager or SSM Parameter Store.
