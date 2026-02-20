# Environment & Setup Guide

## Repository layout
- `backend/` — FastAPI service
- `mobile/` — Expo React Native app

## Backend environment variables
Required for `backend/main.py` + `backend/gemini_image.py`:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `SHOP_SECRET` (optional fallback exists; set explicitly)
- `GEMINI_API_KEY`
- `GEMINI_IMAGE_MODEL` (optional; default in code)

## Backend local run (example)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn boto3 python-dotenv pillow google-genai python-multipart
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Mobile setup
```bash
cd mobile
npm install
```

Set backend URL:
```bash
export EXPO_PUBLIC_API_BASE_URL="http://<your-host>:8000"
```

Run app:
```bash
npm run start
```

## Seed users
Shop credentials are loaded from `backend/shops.json` for `/auth/shop`.
Ensure at least one valid `shop_code` + `pin` entry is present.

## Sanity checklist
1. `GET /health` returns ok
2. Login works from mobile
3. Upload succeeds (`/upload`)
4. Generate returns output URL (`/generate`)
5. `/history` and `/heroes` return data with signed URLs
