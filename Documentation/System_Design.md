# System Design — Academic Code Review System

## 1. Goals & Constraints

### Functional Goals
- Students submit code; faculty review it inline with comments and rubric scoring
- Plagiarism detection runs automatically via Moss after the deadline
- Faculty publish feedback; students view grade + inline comments in one place
- Anonymous mode hides student identity during review

### Non-Functional Goals
- **Concurrency:** College-scale — tens of concurrent users, not thousands
- **Correctness over speed:** A wrong grade or missed plagiarism flag is worse than a slow page load
- **Low infra cost:** AWS Free Tier (EC2 t2.micro + RDS t3.micro)
- **Maintainability:** Small team (2–3 developers), needs to be easy to onboard and extend

### Constraints
- Moss is an external Stanford service — we have no SLA on its availability or response time
- t2.micro has 1 GB RAM; all containers must stay within that budget
- Academic calendar drives usage spikes (submission deadlines = burst load)

---

## 2. Database Design

### Schema

```sql
-- Users (students, faculty, admin)
users (
  id            UUID PRIMARY KEY,
  name          TEXT,
  email         TEXT UNIQUE,
  password_hash TEXT,
  role          ENUM('student', 'faculty', 'admin'),
  course_id     UUID REFERENCES courses(id),
  created_at    TIMESTAMPTZ DEFAULT now()
)

-- Courses / batches
courses (
  id          UUID PRIMARY KEY,
  name        TEXT,
  department  TEXT,
  batch_year  INT
)

-- Assignments created by faculty
assignments (
  id          UUID PRIMARY KEY,
  title       TEXT,
  description TEXT,
  language    ENUM('cpp', 'python', 'javascript', 'java'),
  deadline    TIMESTAMPTZ,
  rubric_json JSONB,     -- [{ criterion, max_score }]
  anonymous   BOOLEAN DEFAULT false,
  created_by  UUID REFERENCES users(id),
  course_id   UUID REFERENCES courses(id)
)

-- Student code submissions
submissions (
  id            UUID PRIMARY KEY,
  assignment_id UUID REFERENCES assignments(id),
  student_id    UUID REFERENCES users(id),
  code_content  TEXT,
  language      TEXT,
  submitted_at  TIMESTAMPTZ DEFAULT now(),
  status        ENUM('pending', 'submitted', 'reviewed') DEFAULT 'submitted',
  UNIQUE(assignment_id, student_id)
)

-- Faculty inline comments
comments (
  id            UUID PRIMARY KEY,
  submission_id UUID REFERENCES submissions(id),
  faculty_id    UUID REFERENCES users(id),
  line_number   INT,
  content       TEXT,         -- Markdown supported
  created_at    TIMESTAMPTZ DEFAULT now()
)

-- Per-criterion rubric scores
rubric_scores (
  id            UUID PRIMARY KEY,
  submission_id UUID REFERENCES submissions(id),
  criterion     TEXT,
  max_score     INT,
  awarded_score INT
)

-- Published feedback + overall grade
feedback (
  id              UUID PRIMARY KEY,
  submission_id   UUID REFERENCES submissions(id) UNIQUE,
  general_comment TEXT,
  total_grade     NUMERIC,
  published_at    TIMESTAMPTZ
)

-- Plagiarism pairwise results
plagiarism (
  id             UUID PRIMARY KEY,
  assignment_id  UUID REFERENCES assignments(id),
  student_a_id   UUID REFERENCES users(id),
  student_b_id   UUID REFERENCES users(id),
  similarity_pct NUMERIC,
  status         ENUM('flagged', 'reviewed', 'escalated') DEFAULT 'flagged',
  moss_report_url TEXT
)
```

### Key Design Decisions

**`rubric_json` on assignments (not a separate rubric table)**
The rubric schema varies per assignment. Storing it as JSONB on the assignment row keeps it flexible — a separate rubric table would require joins for no benefit at this scale.

**`code_content TEXT` on submissions (not file storage)**
Code files are small (rarely > 100 KB). Storing inline in Postgres avoids S3 dependency and keeps the data model simple. Zip uploads are extracted server-side and stored as text.

**`feedback` as a separate table (not columns on submissions)**
Separating feedback from submissions makes the publish action atomic — you insert into `feedback` in one transaction rather than updating multiple nullable columns across `submissions`, `rubric_scores`, and a general comment field.

---

## 3. API Design

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Email + password → JWT cookie |
| POST | `/api/auth/logout` | Any | Clears JWT cookie |
| GET | `/api/auth/me` | Any | Returns current user profile |

### Assignments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/assignments` | Any | List assignments for current user's course |
| POST | `/api/assignments` | Faculty | Create assignment |
| GET | `/api/assignments/:id` | Any | Get assignment details |
| PATCH | `/api/assignments/:id` | Faculty | Update assignment |

### Submissions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/submissions` | Student | Submit code for an assignment |
| GET | `/api/submissions/:id` | Faculty/Admin | Get submission + comments + rubric |
| GET | `/api/assignments/:id/submissions` | Faculty | List all submissions for an assignment |
| PATCH | `/api/submissions/:id/rubric` | Faculty | Save rubric scores (draft) |
| PATCH | `/api/submissions/:id/publish` | Faculty | Publish feedback to student |

### Comments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/comments` | Faculty | Add inline comment to a line |
| PATCH | `/api/comments/:id` | Faculty | Edit comment |
| DELETE | `/api/comments/:id` | Faculty | Delete comment |

### Plagiarism

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/plagiarism/run` | Faculty | Queue Moss check for an assignment |
| GET | `/api/plagiarism/status/:assignmentId` | Faculty | Poll job status |
| GET | `/api/plagiarism/:assignmentId` | Faculty | Get similarity results |
| PATCH | `/api/plagiarism/:id/status` | Faculty | Mark pair as reviewed / escalated |

### Feedback (Student)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/feedback/:submissionId` | Student | Get published feedback + grade |
| GET | `/api/feedback/:submissionId/pdf` | Student | Render and download feedback PDF |

---

## 4. Frontend Page Structure (Next.js App Router)

```
app/
├── (auth)/
│   └── login/page.tsx
├── (student)/
│   ├── assignments/page.tsx            — list of assignments + status
│   ├── assignments/[id]/submit/page.tsx — Monaco editor, file upload
│   └── feedback/[submissionId]/page.tsx — published review view
├── (faculty)/
│   ├── assignments/page.tsx
│   ├── assignments/[id]/submissions/page.tsx
│   ├── review/[submissionId]/page.tsx   — core review page
│   └── plagiarism/[assignmentId]/page.tsx
└── (admin)/
    └── users/page.tsx
```

Middleware (`middleware.ts`) reads the JWT cookie and redirects unauthenticated users to `/login`. Role mismatches get a 403 page.

---

## 5. Plagiarism Detection Design

### Why Moss?

Moss (Measure of Software Similarity, Stanford) is the standard tool for academic code plagiarism detection. It handles the difficult cases: variable renaming, reordering of blocks, and reformatting — things that naive string comparison misses. It natively supports C++, Python, Java, and JavaScript.

### Python Microservice Design

The Moss service is a small Flask app (`moss-worker` container). It exposes a single endpoint:

```
POST /run-moss
Body: { assignment_id: string }
```

Internally:

```python
1. Query PostgreSQL for all submissions where assignment_id = X
2. Write each submission's code_content to /tmp/<student_id>.<ext>
3. Call mosspy.Moss(user_id, language)
4. m.addFile(path) for each file
5. m.send() → returns Moss report URL
6. Parse HTML report → extract pairwise (student_a, student_b, similarity_pct)
7. Write results to plagiarism table via psycopg2
8. Delete all temp files
9. Return { status: "complete", results: [...] }
```

### Job Queue (Bull + Redis)

The Moss check can take 30–120 seconds depending on submission count. It is never handled synchronously in an HTTP request.

```
Express POST /api/plagiarism/run
  → adds job to Bull queue
  → returns 202 Accepted { jobId }

Bull worker (Node.js, same api container)
  → picks up job
  → calls moss-worker: POST :5000/run-moss
  → on completion: updates plagiarism rows + job status in Redis

Frontend polls GET /api/plagiarism/status/:assignmentId
  → returns { status: 'queued' | 'running' | 'complete' | 'error' }
```

### Similarity Threshold

Default flagging threshold is 70% similarity. Faculty can adjust this per assignment. Pairs above the threshold appear highlighted in the similarity matrix. Faculty can mark each pair as:

- `flagged` (default — needs review)
- `reviewed` (inspected, no action)
- `escalated` (referred to academic integrity process)

### Concurrency & Job Locking
To prevent duplicate submissions to Moss servers and memory exhaustion, Express acquires a Redis lock (`plagiarism:lock:<assignment_id>`) with a TTL of 300 seconds before pushing jobs to the Bull queue.

---

## 6. PDF Export Design

Faculty publish feedback → student can download it as a PDF.

Implementation: Puppeteer (server-side, runs in the `api` container) renders the feedback page (`/feedback/:submissionId`) to PDF.

```
GET /api/feedback/:submissionId/pdf
  → Express calls Puppeteer
  → Puppeteer loads the rendered feedback HTML (Next.js SSR)
  → Generates PDF buffer
  → Returns as application/pdf
```

Puppeteer requires Chromium. The `api` Docker image installs `chromium` and sets `PUPPETEER_EXECUTABLE_PATH`. On t2.micro, PDF generation is the most memory-intensive operation — it is always run on demand, never batched.

---

## 7. Error Handling Strategy

| Layer | Approach |
|---|---|
| Express | Central error middleware (`errorHandler.ts`) — catches all unhandled errors, maps to HTTP status + JSON body |
| Prisma | PrismaClientKnownRequestError caught and translated (e.g. unique constraint → 409 Conflict) |
| Bull jobs | Failed jobs are retried up to 3 times with exponential backoff; permanent failures stored in Bull's failed queue |
| Moss timeouts | `mosspy.send()` has a 90s timeout; on timeout, job fails and student is notified via job status |
| Next.js | `error.tsx` boundary per route segment; API errors surface a toast via React Query's `onError` |

---

## 8. Security Considerations

| Concern | Mitigation |
|---|---|
| JWT theft via XSS | JWT stored in `httpOnly` cookie — not accessible to JavaScript |
| CSRF | SameSite=Strict on cookie; API only accepts `application/json` content-type |
| SQL injection | All queries through Prisma parameterized queries |
| Code upload abuse | File size limit (100 KB), only `.zip` and text files accepted; zip extracted with path traversal check |
| Anonymous mode bypass | `student_id` never sent to faculty-facing API responses when `anonymous=true` on the assignment |
| Moss data exposure | Temp files deleted immediately after Moss submission; code is not persisted on the EC2 filesystem |
| Zip Slip / Path Traversal | Verify extracted archive entry paths stay strictly within the target directory before writing to disk |
| Resubmission Comment Drift | Resubmitting code invalidates/deletes any unpublished draft comments to prevent line-number offset mismatch |
