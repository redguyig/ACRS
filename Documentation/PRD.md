# Product Requirements Document — Academic Code Review System

**Version:** 1.0  
**Date:** July 2026  
**Status:** Approved for development  
**Project Type:** B.Tech. CSE Minor Project — 7th Semester

---

## 1. Problem Statement

Faculty in CSE departments currently receive code submissions through email, WhatsApp, or LMS portals (e.g. Moodle). None of these support:

- Inline comments on specific lines of code
- Syntax highlighting during review
- Automated similarity checks across submissions for the same assignment
- A structured rubric-based grading workflow
- A single place for students to view feedback and grades

The result is slow, inconsistent review cycles and no scalable mechanism to detect plagiarism at submission time.

---

## 2. Goal

Build a purpose-built web platform for academic code review — not a general-purpose Git host, not a stripped-down GitHub. A structured workflow tool that fits the way faculty and students actually operate in a college department.

**Success means:** A faculty member can take a batch of student submissions from "received" to "graded with feedback" entirely within this platform, faster and more consistently than the current email/WhatsApp workflow.

---

## 3. Users

### 3.1 Student

A B.Tech. CSE student submitting code assignments. Expects a simple submission interface and a clear view of their feedback once reviewed.

**Core needs:**
- Know what assignments are due and when
- Submit code without friction (paste or upload)
- See exactly what the faculty commented on and why they got their score

### 3.2 Faculty

A professor or teaching assistant managing a batch of student submissions. Needs to review efficiently — not one tab per student, not stitching comments into an email.

**Core needs:**
- A clean way to open any submission and leave comments tied to specific lines
- A rubric that auto-totals the grade
- Confidence that suspicious similarities between submissions are surfaced automatically
- Ability to release all feedback at once when ready

### 3.3 Admin

Department staff or the project owner. Manages accounts and system configuration.

**Core needs:**
- Create and manage student and faculty accounts
- Assign students to courses/batches
- No accidental access to submission content or grades

---

## 4. User Stories

### Student

| ID | Story | Priority |
|---|---|---|
| S1 | As a student, I want to see all my active assignments and their deadlines in one view | Must |
| S2 | As a student, I want to paste or upload my code to submit an assignment | Must |
| S3 | As a student, I want to know my submission was received and when | Must |
| S4 | As a student, I want to resubmit before the deadline if I made a mistake | Must |
| S5 | As a student, I want to see my faculty's inline comments on specific lines of my code | Must |
| S6 | As a student, I want to see my score per rubric criterion, not just a total | Must |
| S7 | As a student, I want to download my feedback as a PDF | Should |
| S8 | As a student, I want to submit anonymously when the faculty has enabled it | Should |

### Faculty

| ID | Story | Priority |
|---|---|---|
| F1 | As a faculty, I want to create an assignment with a description, deadline, and rubric | Must |
| F2 | As a faculty, I want to see a list of who has and hasn't submitted for each assignment | Must |
| F3 | As a faculty, I want to open any submission and see the code with syntax highlighting | Must |
| F4 | As a faculty, I want to click a line number to leave a comment on that specific line | Must |
| F5 | As a faculty, I want to write comments in Markdown so I can include corrected code | Must |
| F6 | As a faculty, I want to score each rubric criterion and have the total calculated automatically | Must |
| F7 | As a faculty, I want to publish feedback when I'm ready — not have it visible during review | Must |
| F8 | As a faculty, I want to trigger a plagiarism check after the submission deadline | Must |
| F9 | As a faculty, I want to see which pairs of submissions are most similar, with a threshold highlight | Must |
| F10 | As a faculty, I want to mark suspicious pairs as reviewed or escalated | Must |
| F11 | As a faculty, I want student names hidden during review when I've set a submission to anonymous mode | Should |
| F12 | As a faculty, I want to save my review progress without publishing it | Should |

### Admin

| ID | Story | Priority |
|---|---|---|
| A1 | As an admin, I want to create student and faculty accounts | Must |
| A2 | As an admin, I want to assign students to a course/batch | Must |
| A3 | As an admin, I want to view all users and their roles | Must |

---

## 5. Feature Specification

### 5.1 Authentication

- Email + password login
- Two roles at login: Student and Faculty (Admin accessed separately)
- JWT stored in `httpOnly` cookie — not accessible to JavaScript
- Session expires after 24 hours; user is redirected to login
- Role-based routing: wrong role hitting the wrong URL gets a 403 page, not a blank screen

**Out of scope:** OAuth, SSO, password reset flow (admin resets manually for v1)

---

### 5.2 Assignment Management

**Faculty creates an assignment with:**
- Title and description
- Programming language (C++, Python, JavaScript, Java)
- Submission deadline (date + time)
- Rubric — one or more criteria, each with a name and max score (e.g. "Correctness — 40 pts")
- Anonymous mode toggle — hides student identities during review
- Course/batch assignment

**Student sees:**
- A list of all assignments for their course, sorted by deadline
- Status badge per assignment: Pending / Submitted / Reviewed
- Assignment description and deadline (countdown if < 48 hours away)

**Submission deadline enforcement:**
- Submission page shows a "Deadline passed" state after the deadline
- API rejects submissions after deadline with a clear error message

---

### 5.3 Code Submission

**Student can:**
- Paste code directly into a Monaco editor (syntax highlighted, language-aware)
- Upload a single source file or a `.zip` archive (server extracts the relevant file)
- See a confirmation screen with their submission timestamp

**Constraints:**
- Max file size: 100 KB
- Only latest submission is kept (resubmission replaces previous before deadline)
- Submission locked after deadline

**Language support:** C++, Python, JavaScript, Java (matches Moss support)

---

### 5.4 Code Review (Faculty)

The core of the platform.

**Left panel — code viewer:**
- Read-only Monaco editor with the student's submitted code
- Syntax highlighting for the submission's language
- Line numbers visible; clicking a line number opens a comment box
- Lines with existing comments are highlighted in the gutter

**Comment box:**
- Opens inline when a line number is clicked
- Markdown-enabled textarea — faculty can paste corrected code in a code fence
- Submit adds the comment; it appears as a glyph on that line
- Comments can be edited or deleted before publishing

**Right panel — rubric:**
- Lists each criterion from the assignment rubric
- Number input for each criterion (0 to max score for that criterion)
- Total grade auto-calculates and displays as a running sum
- General feedback textarea for a summary comment

**Actions:**
- **Save Draft** — saves rubric scores and comments without publishing to the student
- **Publish** — releases all feedback and grade to the student; cannot be unpublished in v1

**Behaviour:**
- Faculty can review submissions in any order
- Multiple faculty can review different submissions simultaneously (no locking in v1)

---

### 5.5 Plagiarism Detection

**Trigger:** Faculty manually triggers a check per assignment after the deadline. Checks cannot run while submissions are still open (enforced in the UI and API).

**Process (invisible to faculty — just wait for results):**
1. All submissions for the assignment are sent to Moss
2. Moss returns pairwise similarity percentages
3. Results are stored and displayed in the platform

**Similarity Report page shows:**
- A matrix of all student pairs with their similarity percentage
- Pairs at or above the threshold (default 70%) are highlighted
- A link to the Moss HTML report for detailed line-by-line comparison per pair
- Status column per pair: Flagged / Reviewed / Escalated

**Faculty actions:**
- Click any pair to open the Moss detailed report
- Mark a pair as "Reviewed" (inspected, no further action) or "Escalated" (referred to academic committee)

**Timing:** Moss checks run asynchronously. Page shows a loading state while the check runs (typically 30–120 seconds). Faculty can leave and come back — results are saved.

---

### 5.6 Student Feedback View

Unlocked for a student only after faculty publishes their review.

**Shows:**
- Their submitted code in read-only Monaco, with all faculty inline comments visible on the relevant lines
- Rubric breakdown — score awarded vs max for each criterion
- Total grade
- Faculty's general feedback
- Download as PDF button

**What students cannot see:**
- Other students' submissions or grades
- Plagiarism report or similarity scores
- Unpublished reviews (draft state is invisible)

---

## 6. Role & Permission Matrix

| Action | Student | Faculty | Admin |
|---|---|---|---|
| View own assignments | ✓ | ✓ | ✓ |
| Submit code | ✓ | ✗ | ✗ |
| View own feedback (published only) | ✓ | ✗ | ✗ |
| View all submissions for an assignment | ✗ | ✓ | ✓ |
| Leave inline comments | ✗ | ✓ | ✗ |
| Score via rubric | ✗ | ✓ | ✗ |
| Publish feedback | ✗ | ✓ | ✗ |
| Create / edit assignments | ✗ | ✓ | ✗ |
| Trigger plagiarism check | ✗ | ✓ | ✗ |
| View plagiarism report | ✗ | ✓ | ✗ |
| Manage user accounts | ✗ | ✗ | ✓ |
| Manage courses / batches | ✗ | ✗ | ✓ |

---

## 7. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Page load time (code review page) | < 3 seconds on a 10 MB/s connection |
| Concurrent users | 50 simultaneous users without degradation |
| Plagiarism check turnaround | < 3 minutes for a 30-student assignment |
| Uptime | Best-effort (academic tool, not 24/7 production SLA) |
| Data retention | Submissions and grades persisted for the duration of the academic year |
| Browser support | Latest Chrome, Firefox, Edge (Monaco Editor requirement) |
| Mobile | Not supported in v1 — desktop browser only |

---

## 8. Out of Scope (v1)

These are documented here so they are not accidentally built or expected by stakeholders.

| Feature | Notes |
|---|---|
| Email notifications | Students check the platform; no email integration in v1 |
| GitHub / VCS integration | Not a Git host; submissions are self-contained |
| Peer review (student ↔ student) | Faculty-only review in v1 |
| Batch assignment (multiple courses) | One course per assignment in v1 |
| Grade export (CSV / LMS) | Copy-paste from the platform for v1 |
| Appeal / regrade workflow | Faculty-student communication outside the platform for v1 |
| Assignment templates | Faculty recreates rubric per assignment |
| Real-time collaboration on reviews | Only one faculty member reviews a submission at a time |
| Auto-grading / test runners | Manual rubric scoring only |
| Custom plagiarism engine | Moss only; no local algorithm |

---

## 9. Acceptance Criteria (MVP)

The MVP is complete when all of the following are true:

- [ ] A student can log in, see their assignments, and submit code before the deadline
- [ ] Submitting after the deadline is rejected with a clear error
- [ ] Faculty can log in, open any submission, and see the code with syntax highlighting
- [ ] Faculty can click a line and leave a Markdown comment; the comment persists on reload
- [ ] Faculty can fill in rubric scores; the total grade auto-calculates correctly
- [ ] Faculty can publish — after which the student can see their feedback and grade
- [ ] Faculty can trigger a plagiarism check; the similarity matrix loads with correct percentages
- [ ] Pairs above 70% are highlighted; faculty can mark them as reviewed or escalated
- [ ] A student cannot see another student's feedback or grade
- [ ] A faculty member cannot access admin routes; a student cannot access faculty review routes

---

## 10. Timeline

| Phase | Scope | Estimated Duration |
|---|---|---|
| Phase 1 | Project setup, Docker, database | 2 days |
| Phase 2 | Auth — JWT, roles, middleware | 3–4 days |
| Phase 3 | Assignment creation and listing | 3–4 days |
| Phase 4 | Code submission (Monaco + file upload) | 4–5 days |
| Phase 5 | Code review page (inline comments + rubric + publish) | 6–8 days |
| Phase 6 | Plagiarism microservice + report page | 4–5 days |
| Phase 7 | Student feedback page | 2–3 days |
| Phase 8 | AWS deployment (EC2 + RDS + Nginx) | 3–4 days |
| Phase 9 | Testing, bug fixes, documentation | 3–4 days |
| **Total** | | **5–7 weeks (part-time)** |
