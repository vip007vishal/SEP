# KWS deployment guide (same one-instance pattern as before)

This package is designed for the same KWS pattern used earlier:

- one KWS instance
- backend process on `5000`
- frontend process on `8080`
- frontend public mapping: `smart-exam-planner.kwscloud.in -> 8080`
- backend public mapping: `smart-exam-planner-api.kwscloud.in -> 5000`

## 1. Create PostgreSQL database and user in KWS

In the KWS PostgreSQL manager/dashboard create:

- database: `sep_db`
- user: `sep_user`
- password: `SepStrong123`

Grant `sep_user` access to `sep_db`.

If KWS shows a service IP such as `172.30.0.2` and port `5432`, your backend `DATABASE_URL` will look like:

```env
DATABASE_URL=postgresql://sep_user:SepStrong123@172.30.0.2:5432/sep_db
```

## 2. Gmail SMTP setup

Use a Gmail App Password, not the normal Gmail password.

Recommended backend env values:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=vishal15v2006@gmail.com
SMTP_PASS=your_gmail_app_password_without_spaces
SMTP_FROM=vishal15v2006@gmail.com
```

## 3. Gemini setup

Put your real Gemini API key in backend `.env`:

```env
GEMINI_API_KEY=your_real_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

## 4. Project folder on the KWS instance

This guide assumes the project folder is:

```text
/home/Vishal_krish/SEP
```

You can upload the ZIP and unzip it there, or clone the repository into that folder.

## 5. Backend env

Create:

```text
/home/Vishal_krish/SEP/backend/.env
```

Use this template:

```env
PORT=5000
FRONTEND_ORIGIN=https://smart-exam-planner.kwscloud.in
DATABASE_URL=postgresql://sep_user:SepStrong123@172.30.0.2:5432/sep_db

SUPERADMIN_NAME=Vishal Super Admin
SUPERADMIN_EMAIL=vishal15v2006@gmail.com
SUPERADMIN_PASSWORD=password123

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=vishal15v2006@gmail.com
SMTP_PASS=your_gmail_app_password_without_spaces
SMTP_FROM=vishal15v2006@gmail.com

GEMINI_API_KEY=your_real_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
OTP_EXPIRY_MINUTES=10
```

## 6. Frontend env

Create:

```text
/home/Vishal_krish/SEP/frontend/.env
```

Use:

```env
VITE_API_BASE_URL=https://smart-exam-planner-api.kwscloud.in/api
```

## 7. Backend install and build

```bash
cd /home/Vishal_krish/SEP/backend
npm install
npm run build
```

Optional explicit schema init:

```bash
npm run db:init
```

The backend automatically executes `backend/db/schema.sql` on startup as well.

## 8. Frontend install and build

```bash
cd /home/Vishal_krish/SEP/frontend
npm install
npm run build
npm install serve
```

## 9. Start both apps with PM2

```bash
npm install -g pm2

pm2 delete sep-backend
pm2 delete sep-frontend

pm2 start "npm start" --name sep-backend --cwd /home/Vishal_krish/SEP/backend
pm2 start "npx serve -s dist -l 8080" --name sep-frontend --cwd /home/Vishal_krish/SEP/frontend

pm2 save
pm2 list
```

## 10. Local verification inside the instance

Backend:

```bash
curl http://127.0.0.1:5000/api/health
```

Frontend:

```bash
curl -I http://127.0.0.1:8080
```

## 11. KWS public mappings

On the same KWS instance, configure:

- `smart-exam-planner.kwscloud.in -> 8080`
- `smart-exam-planner-api.kwscloud.in -> 5000`

## 12. Public verification

Open:

- `https://smart-exam-planner-api.kwscloud.in/api/health`
- `https://smart-exam-planner.kwscloud.in`

## 13. First login

Use the superadmin env values:

- email: `vishal15v2006@gmail.com`
- password: `password123`

Then verify the OTP sent by SMTP.

## 14. Persistence behavior in this package

- Hall templates are stored in PostgreSQL.
- Student set templates are stored in PostgreSQL.
- Exams are stored in PostgreSQL.
- Seating plans are stored in PostgreSQL.
- Student dashboard reads stored `seat_assignments` by institute + roll number.
- No student password accounts are created.

## 15. Updating later

Backend update:

```bash
cd /home/Vishal_krish/SEP/backend
npm install
npm run build
pm2 restart sep-backend
```

Frontend update:

```bash
cd /home/Vishal_krish/SEP/frontend
npm install
npm run build
pm2 restart sep-frontend
```
