# Academic Code Review System

A platform for academic code review with inline comments, rubric-based grading, and plagiarism detection.

## Features

- **Student**: Submit code assignments, view feedback with inline comments and rubric breakdown
- **Faculty**: Create assignments with rubrics, review submissions with inline comments, trigger plagiarism checks
- **Admin**: Manage users and courses

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Material UI, Monaco Editor
- **Backend**: Express.js, TypeScript, Prisma ORM, SQLite (local), JWT authentication
- **Plagiarism**: Python Flask microservice with Moss integration (mock mode for dev)
- **Containerization**: Docker Compose (nginx, web, api, moss-worker)
- **No external dependencies**: No AWS, no Redis - uses SQLite and in-memory job queue

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development without Docker)

### Using Docker Compose (Recommended)

```bash
# Clone and navigate to project
cd E:\Documents\Project\New_proj

# Copy environment file
cp .env.example .env

# Edit .env with your settings (optional for local dev)
# MOSS_USER_ID=your_moss_id  # Optional - uses mock if not set

# Start all services
docker compose up --build

# Access the application
# Frontend: http://localhost
# API: http://localhost/api
```

### Local Development (without Docker)

```bash
# Terminal 1 - API
cd api
cp ../.env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev

# Terminal 2 - Web
cd web
npm install
npm run dev

# Terminal 3 - Moss Worker (optional)
cd moss-worker
pip install -r requirements.txt
python app.py
```

## Demo Accounts

After seeding, these accounts are available:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | admin123 |
| Faculty | faculty@demo.com | faculty123 |
| Student | student1@demo.com | student123 |
| Student | student2@demo.com | student123 |
| Student | student3@demo.com | student123 |

## Project Structure

```
New_proj/
├── docker-compose.yml
├── nginx/nginx.conf
├── .env.example
├── web/                    # Next.js frontend
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   │   ├── (auth)/    # Login page
│   │   │   ├── (student)/ # Student pages
│   │   │   ├── (faculty)/ # Faculty pages
│   │   │   └── (admin)/   # Admin pages
│   │   ├── lib/           # API client, auth context
│   │   ├── middleware.ts  # Role-based routing
│   │   └── types/         # TypeScript types
│   └── Dockerfile
├── api/                    # Express backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth, validation, errors
│   │   ├── lib/           # Prisma, JWT utilities
│   │   └── index.ts       # Entry point
│   ├── prisma/
│   │   ├── schema.prisma  # Database schema
│   │   └── seed.ts        # Seed data
│   └── Dockerfile
├── moss-worker/            # Python plagiarism service
│   ├── app.py
│   ├── requirements.txt
│   └── Dockerfile
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user

### Assignments
- `GET /api/assignments` - List assignments
- `POST /api/assignments` - Create assignment (faculty)
- `GET /api/assignments/:id` - Get assignment
- `PATCH /api/assignments/:id` - Update assignment (faculty)
- `GET /api/assignments/:id/submissions` - List submissions (faculty)

### Submissions
- `POST /api/submissions` - Submit code (student)
- `GET /api/submissions/:id` - Get submission (faculty)
- `PATCH /api/submissions/:id/rubric` - Save rubric scores (faculty)
- `PATCH /api/submissions/:id/publish` - Publish feedback (faculty)

### Comments
- `POST /api/comments` - Add inline comment (faculty)
- `PATCH /api/comments/:id` - Edit comment (faculty)
- `DELETE /api/comments/:id` - Delete comment (faculty)

### Plagiarism
- `POST /api/plagiarism/run` - Run check (faculty)
- `GET /api/plagiarism/status/:assignmentId` - Check status
- `GET /api/plagiarism/:assignmentId` - Get results
- `PATCH /api/plagiarism/:id/status` - Update pair status

### Feedback
- `GET /api/feedback/:submissionId` - Get feedback (student)
- `GET /api/feedback/:submissionId/pdf` - Download PDF (student)

### Admin
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `PATCH /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/courses` - List courses
- `POST /api/admin/courses` - Create course

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database path | `file:./dev.db` |
| `JWT_SECRET` | JWT signing secret | (required) |
| `MOSS_USER_ID` | Moss account ID | `0` (mock mode) |
| `MOSS_MICROSERVICE_URL` | Moss worker URL | `http://moss-worker:5000` |
| `NODE_ENV` | Environment | `development` |
| `PORT` | API port | `4000` |
| `NEXT_PUBLIC_API_URL` | Frontend API URL | `http://localhost/api` |

## Plagiarism Detection

The system uses **Moss (Measure of Software Similarity)** from Stanford for plagiarism detection.

### For Production:
1. Register at https://moss.stanford.edu/
2. Get your `MOSS_USER_ID`
3. Set `MOSS_USER_ID` in `.env`
4. The moss-worker will use real Moss

### For Development:
- Runs in **mock mode** without Moss account
- Uses simple string similarity (difflib)
- Sufficient for testing the workflow

## Database

Uses **SQLite** for local development (file-based, no server needed).

### Schema Highlights:
- Users with roles (student, faculty, admin)
- Courses and assignments with JSON rubrics
- Submissions with code content
- Inline comments tied to line numbers
- Rubric scores per criterion
- Published feedback with grades
- Plagiarism pairwise results

### Prisma Commands:
```bash
cd api
npx prisma generate        # Generate client
npx prisma migrate dev     # Run migrations
npx prisma studio          # Visual database editor
npx prisma db seed         # Run seed script
```

## Development Notes

### Role-based Access Control
- Middleware enforces role-based routing on frontend
- API middleware validates JWT and roles
- Students can only access `/student/*`
- Faculty can only access `/faculty/*`
- Admins can only access `/admin/*`

### File Upload
- Max 100 KB
- Supports `.txt`, `.cpp`, `.py`, `.js`, `.java`, `.zip`
- Zip files are extracted server-side

### Monaco Editor
- Used for code submission and review
- Syntax highlighting for C++, Python, JavaScript, Java
- Read-only mode for review with comment decorations
- Line number click to add comments

### Job Queue
- Simple in-database job queue (no Redis needed)
- Plagiarism checks run asynchronously
- Frontend polls for status

## Production Deployment

For production, consider:
1. Use PostgreSQL (AWS RDS) instead of SQLite
2. Use Redis for job queue (Bull)
3. Set up proper SSL with Let's Encrypt
4. Use AWS ECS/EKS or similar for container orchestration
5. Configure secrets management (AWS Secrets Manager)
6. Set up monitoring and logging

## License

MIT License - Academic project for B.Tech CSE Minor Project