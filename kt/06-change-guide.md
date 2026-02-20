# Change Guide (How to Extend Safely)

## Common extension points

### 1) Add backend endpoint
1. Implement route in `backend/main.py`.
2. Reuse `require_shop(...)` for protected paths.
3. Add client wrapper in `mobile/lib/api.ts`.
4. Wire UI action in relevant screen.

### 2) Change AI prompt behavior
- Prompt templates live in:
  - `backend/main.py` (default prompt composition)
  - `backend/gemini_image.py` (detailed instruction block)

### 3) Add/modify mobile screens
1. Create screen in `mobile/app/<name>.tsx`.
2. Register route in `mobile/app/_layout.tsx` if needed.
3. Add navigation entry point (e.g., from `home.tsx`).

### 4) Add new object type in storage
- Use `kind` parameter in `/upload` and update any list endpoint needed for retrieval.

## Regression checklist before merge
- Auth works (`/auth/shop`, `/me`)
- Upload supports expected media types
- Generate returns valid output URL and mime
- History shows records and image opens
- Heroes list/upload works
- Download to gallery works on target platform

## Technical debt to prioritize
- Replace MVP token with signed JWT.
- Add pagination over `/history` and `/heroes` (currently single list_objects call).
- Add ownership checks for `fabric_key` and `hero_key` in `/generate`.
- Add tests (backend route tests + API client integration smoke tests).
