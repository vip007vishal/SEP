# Smart Exam Planner Advanced - KWS Ready

This package keeps the advanced Smart Exam Planner app layout and workflow while converting it into a deployable backend/frontend project.

## Included changes

- real backend/frontend structure for deployment
- Gemini API moved from browser to backend
- real SMTP email OTP instead of static `123456`
- superadmin controlled from backend env
- no dummy seeded admin/teacher/student users
- no dummy exam/template data
- student login remains ephemeral and is not stored server-side
- admin, teacher, exam, template, and audit data are stored in the backend JSON datastore

## Important env values

### backend/.env
- `SUPERADMIN_NAME`
- `SUPERADMIN_EMAIL`
- `SUPERADMIN_PASSWORD`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `FRONTEND_ORIGIN`

### frontend/.env
- `VITE_API_BASE_URL`

## Default superadmin example

- email: `vishal15v2006@gmail.com`
- password: `password123`

Change them in `backend/.env`.
