# JobMatch RAG

Natural-language job search over scraped remote listings. Bulk ingest runs as a CLI. Chat streams structured **JobCard** results via Vercel AI SDK tool calling.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Cheerio HTML scrape + RemoteOK / Remotive public APIs
- OpenAI embeddings (`text-embedding-3-small`) + `gpt-4o-mini`
- Portable JSON vector index (`data/jobs-index.json`) — works on Vercel
- Hybrid metadata prefilter → vector (or keyword) ranking
- Vercel AI SDK tool calling → `JobCard` UI

## Setup

```bash
cd job-rag
cp .env.local.example .env.local
# put your OPENAI_API_KEY in .env.local
npm install
npm run seed    # scrape jobs into data/jobs-index.json
npm run ingest  # optional: attach OpenAI embeddings + prune >48h
npm run dev
```

## Deploy (Vercel)

1. Set `OPENAI_API_KEY` in the Vercel project environment variables.
2. Optionally set `INGEST_SECRET` to enable protected re-seed from `/api/ingest`.
3. Deploy from GitHub (`JamesKevinJones/job-rag`).

Re-index locally with `npm run ingest`, commit `data/jobs-index.json`, and push — or call the protected ingest endpoint.

## Features

- Whole-job embeddings (one document per listing)
- CLI bulk ingest (avoids serverless timeouts)
- Hybrid retrieve: metadata filters first, then similarity
- `lastSeen` refresh + prune jobs older than 48 hours
- Streaming chat with `show_jobs` tool → React `JobCard`s

## Project layout

| Path | Role |
|------|------|
| `src/lib/scraper/` | RemoteOK, Remotive, Cheerio HTML |
| `src/lib/rag/chunk.ts` | Whole-job embedding documents |
| `src/lib/rag/store.ts` | JSON index upsert + `lastSeen` prune |
| `src/lib/rag/retrieve.ts` | Hybrid metadata → vector/keyword retrieve |
| `scripts/ingest.ts` | Bulk ingest CLI |
| `scripts/seed-index.ts` | Scrape-only seed (no API key) |
| `src/app/api/chat/route.ts` | Streaming RAG + `show_jobs` tool |
| `src/components/JobCard.tsx` | Structured job UI |
