# Smart Exam Planner (KWS-ready, PostgreSQL edition)

This package contains a KWS-ready full-stack deployment of Smart Exam Planner with:

- React + Vite frontend
- Node.js + Express backend
- PostgreSQL persistence
- real SMTP OTP verification
- Gemini API integration from the backend
- institute-scoped storage for hall templates, student set templates, exams, seating plans, and student seat assignments

## What is stored in PostgreSQL

The backend persists all operational data in tables created by `backend/db/schema.sql`:

- institutes
- users
- hall_templates
- student_set_templates
- exams
- seat_assignments
- audit_logs
- otp_store

## Data model notes

- Hall templates are stored per institute.
- Student set templates are stored per institute.
- Exams are stored per institute.
- Generated seating plans are saved in the `exams.seating_plan` column.
- Student-wise lookup rows are saved in `seat_assignments`, which makes student dashboard lookup stable and fast.
- Students are not created as persistent login users. Student login is roll-number + institute based, and the dashboard shows stored seating data if an assignment exists.

## Superadmin

The superadmin is created/updated from backend env values at startup.

Default env example:

- `SUPERADMIN_EMAIL=vishal15v2006@gmail.com`
- `SUPERADMIN_PASSWORD=password123`

## Local backend setup

```bash
cd backend
cp .env.example .env
npm install
npm run build
npm start
```

## Local frontend setup

```bash
cd frontend
cp .env.example .env
npm install
npm run build
npm install serve
npx serve -s dist -l 8080
```

## Database initialization

The backend automatically runs `backend/db/schema.sql` at startup, so no manual table creation is required once `DATABASE_URL` is set.

You can also explicitly initialize the schema with:

```bash
cd backend
npm install
npm run db:init
```

## KWS deployment

Use the exact one-instance deployment pattern from `DEPLOYMENT.md`:

- backend on port `5000`
- frontend on port `8080`
- website: `smart-exam-planner.kwscloud.in`
- API: `smart-exam-planner-api.kwscloud.in`
