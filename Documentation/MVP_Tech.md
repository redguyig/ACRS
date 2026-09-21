# MVP Tech Spec — Academic Code Review System

This document defines exactly what gets built for the MVP, the order to build it in, and the technical decisions that apply to each module. Scope decisions are explicit: things that are intentionally left out of v1 are listed.

---

## What MVP Means Here

A working end-to-end flow for one assignment:

1. Admin creates a student and faculty account
2. Faculty creates an assignment with a rubric
3. Student submits code via Monaco editor
4. Faculty reviews inline, scores the rubric, publishes
5. Student sees their feedback and grade
6. Faculty can trigger a plagiarism check and see the similarity report

Everything else (PDF export, anonymous mode, batch user import, email notifications) ships after this core loop is solid.

---

## Build Order (Sequential — Each Phase Unblocks the Next)

### Phase 1 — Project Scaffold (Days 1–2)

**Goal:** Local dev environment running, all containers talking to each other.

```bash
project-root/
├── web/          # Next.js 14 (TypeScript)
├── api/          # Node.js + Express (TypeScript)
├── moss-worker/  # Python Flask
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
└── .env
```

**docker-compose.yml services:**

```yaml
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80"]
    volumes: ["./nginx/nginx.conf:/etc/nginx/nginx.conf"]

  web:
    build: ./web
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost/api

  api:
    build: ./api
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - MOSS_MICROSERVICE_URL=http://moss-worker:5000

  moss-worker:
    build: ./moss-worker
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - MOSS_USER_ID=${MOSS_USER_ID}

  redis:
    image: redis:7-alpine
```

**Prisma setup:**

```bash
cd api
npx prisma init
# define schema → run:
npx prisma migrate dev --name init
npx prisma generate
```

**Done when:** `docker compose up` starts all containers without errors and `GET /api/health` returns 200.

---

### Phase 2 — Auth (Days 3–4)

**Goal:** Login works. JWT cookie set. Role-based middleware blocks wrong-role requests.

**Files to create:**

```
api/src/
├── middleware/
│   ├── authenticate.ts    # verifies JWT from cookie, attaches req.user
│   └── requireRole.ts     # requireRole('faculty') → 403 if wrong role
├── routes/
│   └── auth.ts            # POST /login, POST /logout, GET /me
└── lib/
    └── jwt.ts             # sign + verify helpers
```

**JWT payload:**

```typescript
interface JwtPayload {
  userId: string;
  role: 'student' | 'faculty' | 'admin';
  courseId: string;
}
```

**Cookie config:**

```typescript
res.cookie('token', jwt, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000   // 24 hours
});
```

**Next.js middleware (`web/middleware.ts`):**

Reads the `token` cookie. If missing → redirect to `/login`. If present, decode (no verify — Express verifies on API calls) and redirect if the role doesn't match the route prefix (`/faculty/*`, `/student/*`).

**Done when:** Login sets a cookie, `/api/auth/me` returns the user, and a student trying to hit `/api/assignments` (faculty route) gets a 403.

---

### Phase 3 — Assignments (Days 5–7)

**Goal:** Faculty can create an assignment with a rubric. Students can see it.

**Rubric JSON shape:**

```typescript
type Rubric = Array<{
  criterion: string;    // e.g. "Correctness"
  maxScore: number;     // e.g. 40
}>;
```

Stored as JSONB in `assignments.rubric_json`. No schema enforcement at DB level — validation happens in the Express route with Zod.

**Zod schema (assignment creation):**

```typescript
const createAssignmentSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  language: z.enum(['cpp', 'python', 'javascript', 'java']),
  deadline: z.string().datetime(),
  rubric: z.array(z.object({
    criterion: z.string(),
    maxScore: z.number().int().positive()
  })).min(1),
  anonymous: z.boolean().default(false),
  courseId: z.string().uuid()
});
```

**Routes:**

```
POST   /api/assignments          Faculty only
GET    /api/assignments          Filtered by req.user.courseId
GET    /api/assignments/:id      Any authenticated user
PATCH  /api/assignments/:id      Faculty only (before deadline)
```

**Done when:** Faculty creates an assignment via the UI, student logs in and sees it in their list with a "Pending" status badge.

---

### Phase 4 — Code Submission (Days 8–11)

**Goal:** Student can submit code. Deadline enforcement works. Resubmission replaces previous.

**Monaco Editor setup:**

```bash
cd web
npm install @monaco-editor/react
```

```tsx
import Editor from '@monaco-editor/react';

<Editor
  height="500px"
  language={assignment.language}   // 'cpp', 'python', etc.
  value={code}
  onChange={(val) => setCode(val ?? '')}
  options={{ readOnly: false, minimap: { enabled: false } }}
/>
```

**Submission endpoint:**

```
POST /api/submissions
Content-Type: application/json

{
  assignmentId: string,
  code: string,
  language: string
}
```

**File upload support:**

Accept `.zip` or plain text files. On the server:

1. `multer` handles multipart upload (memory storage, 100 KB limit)
2. If `.zip`: extract with `adm-zip`, take the first `.cpp`/`.py`/etc. file found
3. Store extracted text as `code_content`

**Deadline check (Express middleware):**

```typescript
const assignment = await prisma.assignment.findUnique({ where: { id } });
if (new Date() > assignment.deadline) {
  return res.status(400).json({ error: 'Submission deadline has passed' });
}
```

**Resubmission:** `upsert` on `(assignment_id, student_id)` unique pair. Resubmission deletes any existing unpublished draft comments in `comments` table to avoid line-drift bugs.

**Done when:** Student submits code, the submission appears in the faculty's submission list, and submitting after the deadline returns an error.

---

### Phase 5 — Code Review Page (Days 12–17)

**Goal:** Faculty can read a submission, leave inline comments, score the rubric, and publish.

This is the most complex page. Build it in three sub-steps:

**5a — Read-only Monaco with existing comments**

```tsx
<Editor
  value={submission.codeContent}
  options={{ readOnly: true }}
  onMount={(editor, monaco) => {
    // Add comment decorations on lines with existing comments
    const decorations = comments.map(c => ({
      range: new monaco.Range(c.lineNumber, 1, c.lineNumber, 1),
      options: {
        isWholeLine: true,
        className: 'commented-line',
        glyphMarginClassName: 'comment-glyph'
      }
    }));
    editor.deltaDecorations([], decorations);
  }}
/>
```

**5b — Click-to-comment**

```tsx
editor.onMouseDown((e) => {
  if (e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS) {
    const lineNumber = e.target.position?.lineNumber;
    if (lineNumber) openCommentBox(lineNumber);
  }
});
```

The comment box is a `<textarea>` that supports Markdown. On submit: `POST /api/comments { submissionId, lineNumber, content }`.

**5c — Rubric panel + publish**

Right panel renders the rubric criteria from `assignment.rubric_json`. Each criterion gets a number input (0 to maxScore). Total auto-calculates client-side.

```typescript
const total = rubricScores.reduce((sum, s) => sum + s.awardedScore, 0);
const maxTotal = rubric.reduce((sum, r) => sum + r.maxScore, 0);
```

Publish button:

```
PATCH /api/submissions/:id/publish
Body: { rubricScores: [...], generalComment: string }
```

Sets `submissions.status = 'reviewed'` and inserts into `feedback` table. Atomic — done in a Prisma transaction.

**Done when:** Faculty opens a submission, clicks a line to comment, fills rubric, publishes, and the student's assignment list shows "Reviewed" status.

---

### Phase 6 — Plagiarism (Days 18–21)

**Goal:** Faculty triggers a check, sees a similarity matrix, can flag/escalate pairs.

**moss-worker Flask app:**

```python
# moss_worker/app.py
from flask import Flask, request, jsonify
import mosspy, psycopg2, tempfile, os

app = Flask(__name__)

@app.route('/run-moss', methods=['POST'])
def run_moss():
    assignment_id = request.json['assignment_id']
    submissions = fetch_submissions(assignment_id)   # from PostgreSQL

    m = mosspy.Moss(os.environ['MOSS_USER_ID'], get_language(assignment_id))

    tmpdir = tempfile.mkdtemp()
    for sub in submissions:
        path = os.path.join(tmpdir, f"{sub['student_id']}.{sub['ext']}")
        with open(path, 'w') as f:
            f.write(sub['code_content'])
        m.addFile(path)

    url = m.send()   # blocks until Moss returns
    results = parse_moss_report(url)   # fetch + parse HTML

    store_results(assignment_id, results)   # write to plagiarism table
    cleanup(tmpdir)

    return jsonify({ 'status': 'complete', 'reportUrl': url })
```

**Bull job in Express:**

```typescript
// api/src/jobs/plagiarismQueue.ts
import Bull from 'bull';
const plagiarismQueue = new Bull('plagiarism', process.env.REDIS_URL);

plagiarismQueue.process(async (job) => {
  const { assignmentId } = job.data;
  await fetch(`${process.env.MOSS_MICROSERVICE_URL}/run-moss`, {
    method: 'POST',
    body: JSON.stringify({ assignment_id: assignmentId }),
    headers: { 'Content-Type': 'application/json' }
  });
});

export const enqueuePlagiarismCheck = (assignmentId: string) =>
  plagiarismQueue.add({ assignmentId });
```

**Similarity matrix UI:**

A table where rows and columns are student names (or IDs in anonymous mode), and cells show the similarity %. Cells above threshold are highlighted red.

**Done when:** Faculty triggers check, waits for job to complete, sees the matrix with flagged pairs.

---

### Phase 7 — Student Feedback Page (Days 22–24)

**Goal:** Student sees their published feedback — inline comments, rubric breakdown, total grade.

This is largely a read-only version of the review page. Reuse Monaco in read-only mode with the same comment decoration logic from Phase 5a. Add rubric breakdown table below.

**Done when:** After faculty publishes, student navigates to the assignment and sees their grade and all inline comments.

---

## MVP Out of Scope (v2+)

These are explicitly deferred — do not implement in MVP:

| Feature | Reason deferred |
|---|---|
| PDF export of feedback | Puppeteer is memory-heavy on t2.micro; polish feature |
| Email notifications | Requires email provider setup; students can just check the platform |
| Anonymous mode | Adds complexity to API responses; core flow works without it |
| Batch user import (CSV) | Admin can create users manually for now |
| Assignment draft mode | Faculty publish in one session for MVP |
| Review draft save | Faculty complete review in one session for MVP |
| Plagiarism threshold config | Hardcode 70% for MVP |
| Real-time updates (WebSocket) | Polling is fine at this scale |
| Mobile responsive UI | Desktop-first for MVP (faculty review page needs screen space) |

---

## Tech Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| ORM | Prisma | Type-safe, good migration tooling, TS-first |
| Validation | Zod | Shares types between runtime validation and TypeScript |
| Job queue | Bull | Simple Redis-backed queue, well-documented |
| Code editor | Monaco | Same engine as VS Code; best syntax highlighting + line events |
| PDF export | Puppeteer | Renders the actual feedback HTML — no separate PDF template |
| Plagiarism | Moss (mosspy) | Industry standard for academic code; free |
| Container orchestration | Docker Compose | Sufficient for single-machine deploy; no need for K8s |
| State management (frontend) | React Query (TanStack Query) | Server state only; no Redux needed |
| Form handling | React Hook Form + Zod | Lightweight, integrates with Zod schemas |
