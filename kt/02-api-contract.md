# API Contract (Backend)

Base URL is configured on mobile by `EXPO_PUBLIC_API_BASE_URL`.
All protected endpoints require header: `X-Shop-Token: <token>`.

---

## 1) Health
### `GET /health`
- **Auth:** No
- **Response:** `{ "status": "ok" }`

## 2) Shop auth
### `POST /auth/shop`
- **Auth:** No
- **Body:**
```json
{ "shop_code": "RT001", "pin": "4827" }
```
- **Success:**
```json
{ "shop_id": "...", "shop_name": "...", "token": "<shop_id>:<secret>" }
```
- **Errors:**
  - `400` when fields missing
  - `401` invalid credentials

## 3) Session check
### `GET /me`
- **Auth:** Yes
- **Success:**
```json
{ "ok": true, "shop_id": "...", "issued_at": "..." }
```

## 4) Upload image
### `POST /upload?kind={fabric|hero|heroes|output|misc}`
- **Auth:** Yes
- **Multipart field:** `file`
- **Allowed ext:** `jpg`, `jpeg`, `png`, `webp`
- **Success:**
```json
{ "key": "shops/...", "url": "<signed_url>" }
```

## 5) File redirect
### `GET /file?key=<object-key>`
- **Auth:** Yes
- **Behavior:** validates `key` starts with `shops/{shop_id}/`, then redirects to signed URL.

## 6) Dummy generate
### `POST /generate-dummy`
- **Auth:** Yes
- **Body:**
```json
{ "fabric_key": "shops/...", "hero_key": "shops/..." }
```
- **Success:**
```json
{
  "job_id": "...",
  "output_key": "shops/.../output/...png",
  "output_url": "<signed_url>",
  "history_key": "shops/.../history/...json"
}
```

## 7) Real generate
### `POST /generate`
- **Auth:** Yes
- **Body:**
```json
{ "fabric_key": "shops/...", "hero_key": "shops/...", "prompt": "optional" }
```
- **Success:**
```json
{
  "job_id": "...",
  "output_key": "shops/.../output/...",
  "output_url": "<signed_url>",
  "history_key": "shops/.../history/...json",
  "output_mime": "image/png"
}
```

## 8) History
### `GET /history?limit=20`
- **Auth:** Yes
- **Behavior:** loads history JSON records, attaches fresh `output_url`.
- **Success:**
```json
{ "count": 2, "records": [ { "job_id": "...", "output_key": "...", "output_url": "..." } ] }
```

## 9) Heroes list
### `GET /heroes?limit=50`
- **Auth:** Yes
- **Success:**
```json
{
  "count": 2,
  "items": [
    { "key": "shops/.../heroes/...", "created_at": "...", "size_bytes": 12345, "url": "..." }
  ]
}
```

---

## Error handling conventions
- `401` for missing/invalid token.
- `400` for invalid payload/format.
- `403` for forbidden shop-file access checks.
- Most endpoint failures return JSON `detail` or plain text fallback.
