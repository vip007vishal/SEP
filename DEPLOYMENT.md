# KWS one-instance deployment

Use one KWS instance with:

- backend on port `5000`
- frontend on port `8080`

## backend/.env example
Copy from `backend/.env.example` and fill SMTP + Gemini values.

## frontend/.env example
```env
VITE_API_BASE_URL=https://smart-exam-planner-api.kwscloud.in/api
```

## Install and build

### Backend
```bash
cd backend
npm install
npm run build
```

### Frontend
```bash
cd frontend
npm install
npm run build
npm install serve
```

## Run in PM2
```bash
npm install -g pm2

pm2 start "npm start" --name sep-backend --cwd /home/Vishal_krish/PROJECT/backend
pm2 start "npx serve -s dist -l 8080" --name sep-frontend --cwd /home/Vishal_krish/PROJECT/frontend

pm2 save
```

## KWS public mappings
- `smart-exam-planner.kwscloud.in` -> port `8080`
- `smart-exam-planner-api.kwscloud.in` -> port `5000`
