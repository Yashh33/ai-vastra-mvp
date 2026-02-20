# Mobile App Flow & Screen Responsibilities

## Tech stack
- Expo + React Native + TypeScript
- `expo-router` file-based routing
- Session/token persistence with `expo-secure-store`

## Route map
Defined in `mobile/app/_layout.tsx`:
- `/` (`index`) — Login
- `/home` — Hub
- `/visualize` — Main generation flow
- `/heroes-pick` — Select hero from collection
- `/output` — View generated output
- `/history` — Browse previous outputs
- `/heroes` — Manage hero collection

## Screen-level behavior

### 1) Login (`index.tsx`)
- Attempts existing session lookup (`getToken`) on mount.
- Calls `authShop(shopCode, pin)`.
- Stores token/shop data via `saveSession`.
- Navigates to `/home`.

### 2) Home (`home.tsx`)
- Validates session with `me()`.
- Shows entry tiles to:
  - Visualize
  - Output History
  - Hero Image Collection
- Supports logout via `clearSession()`.

### 3) Visualize (`visualize.tsx`)
- Fabric source: gallery pick or camera capture.
- Converts selected image to JPEG.
- Opens hero picker and receives `hero_key`/`hero_url` via route params.
- On generate:
  1. Upload fabric (`uploadImage(..., "fabric")`)
  2. Call `generateReal(fabric_key, hero_key)`
  3. Navigate to `/output` with output params.

### 4) History (`history.tsx`)
- Calls `getHistory()`.
- Renders output thumbnails in grid.
- Full-screen modal viewer.
- Download action saves to gallery using Expo FileSystem + MediaLibrary.

### 5) Heroes (`heroes.tsx`)
- Calls `getHeroes()`.
- Uploads hero images via gallery selection + JPEG conversion + `uploadImage(..., "heroes")`.
- Provides full-screen viewer.

## API client layer (`mobile/lib/api.ts`)
Single source for backend interaction:
- Auth/session: `authShop`, `me`, `saveSession`, `getToken`, `clearSession`
- Core actions: `uploadImage`, `generateDummy`, `generateReal`, `getHistory`, `getHeroes`

## Configuration
`mobile/lib/config.ts`:
- `API_BASE_URL = EXPO_PUBLIC_API_BASE_URL || <default dev URL>`

Recommend setting `EXPO_PUBLIC_API_BASE_URL` explicitly per environment.
