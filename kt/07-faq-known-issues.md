# FAQ & Known Issues

## FAQ

### Where is auth managed?
- Backend validates shop code/PIN from `backend/shops.json` and issues a simple token.
- Mobile stores token in `expo-secure-store`.

### Where are generated outputs saved?
- In R2 under `shops/{shop_id}/output/{date}/{job_id}.{ext}`.

### Why do image links sometimes stop working?
- URLs are presigned and time-bound; fetch fresh URLs via `/history` or `/heroes`.

### What happens if session expires/is invalid?
- Mobile `me()` check on home redirects user back to login.

## Known issues / MVP constraints
- Token mechanism is simplistic and not production-grade.
- CORS is open for development.
- History/heroes list use one-shot listing without cursor pagination.
- Some earlier commit history indicates recurring fixes around download and visualize flow—validate those paths in regression testing.

## Useful git history context
Recent commits are centered around:
- download fixes
- visualize flow fixes
- generate wiring and prompt tuning
- mime/ext handling improvements
