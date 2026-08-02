# Security notes

## Secrets

- Never commit `.env.local`, API keys, or `*.tmp` key files.
- Production secrets live only in **Vercel → Project → Settings → Environment Variables**.
- Local secrets live only in `.env.local` (gitignored).

## If a key was shared in chat or committed

1. **Rotate it immediately** in Google AI Studio (revoke old key, create new).
2. Update `.env.local` and Vercel env vars with the new value.
3. Redeploy Vercel.

## Public endpoints

| Route | Risk | Mitigation |
|-------|------|------------|
| `POST /api/chat` | Unauthenticated Gemini usage / quota burn | Consider Vercel Firewall rate limits; rotate keys if abused |
| `POST /api/ingest` | Expensive scrape/embed | Disabled unless `INGEST_SECRET` is set; uses timing-safe Bearer check |
| `GET /api/ingest` | Index stats only | No secrets returned |
| `GET /api/jobs` | Public job listings | Intentional (scraped public jobs) |

## Checklist before each deploy

- [ ] `git status` shows no `.env*` except `.env.local.example`
- [ ] `git grep` finds no real key material
- [ ] Vercel has only `GOOGLE_GENERATIVE_AI_API_KEY` (and optional `INGEST_SECRET`)
- [ ] No stale `OPENAI_API_KEY` left in Vercel
