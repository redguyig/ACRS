# ENV — Academic Code Review System

All environment variables across every service. Copy into `.env` at the project root.

---

## `.env`

```env
# ─── PostgreSQL (AWS RDS) ───────────────────────────────────────
DATABASE_URL=postgresql://postgres:yourpassword@your-rds-endpoint.rds.amazonaws.com:5432/acrs

# ─── Redis ──────────────────────────────────────────────────────
REDIS_URL=redis://redis:6379

# ─── JWT ────────────────────────────────────────────────────────
JWT_SECRET=replace_with_a_long_random_string_at_least_64_chars

# ─── Moss ───────────────────────────────────────────────────────
MOSS_USER_ID=your_moss_numeric_user_id
MOSS_MICROSERVICE_URL=http://moss-worker:5000

# ─── Puppeteer / Performance ────────────────────────────────────
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
PUPPETEER_ARGS="--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu"

# ─── App ────────────────────────────────────────────────────────
NODE_ENV=production
PORT=4000

# ─── Next.js (public — exposed to browser) ──────────────────────
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

---

## Local Development Overrides

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/acrs
REDIS_URL=redis://redis:6379
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost/api
```

---

## Variable Reference

| Variable | Used By | What It Is |
|---|---|---|
| `DATABASE_URL` | `api`, `moss-worker` | Full PostgreSQL connection string |
| `REDIS_URL` | `api` | Redis connection string for Bull queue |
| `JWT_SECRET` | `api` | Secret for signing JWTs — never expose |
| `MOSS_USER_ID` | `moss-worker` | Numeric ID from your Moss account |
| `MOSS_MICROSERVICE_URL` | `api` | Internal Docker URL for the Flask service |
| `PUPPETEER_EXECUTABLE_PATH` | `api` | Path to Chromium binary inside api container |
| `NODE_ENV` | `api`, `web` | `development` locally, `production` on EC2 |
| `PORT` | `api` | Port Express listens on inside the container |
| `NEXT_PUBLIC_API_URL` | `web` | Public API base URL used by the browser |

---

## Notes

- Never commit `.env` to Git — add it to `.gitignore`
- `NEXT_PUBLIC_*` variables are bundled into the browser build — no secrets here
- To get `MOSS_USER_ID`: email `moss@moss.stanford.edu` with subject and body both set to `registeruser` — you'll get a script back, your ID is the number in the `$userid` line
- `JWT_SECRET` rotation logs out all users — plan accordingly
