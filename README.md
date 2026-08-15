<div align="center">

# JobMatch RAG

### A job search that is allowed to return fewer results.

Natural-language search over scraped remote listings. A metadata prefilter
narrows the field, vector ranking orders what's left, and matches stream back as
structured cards rather than a paragraph about them.

**[→ Live demo](https://job-rag-drab.vercel.app)**

![Next.js](https://img.shields.io/badge/next.js-app%20router-1B2632?labelColor=0B1016)
![TypeScript](https://img.shields.io/badge/typescript-5-1B2632?labelColor=0B1016)
![Gemini](https://img.shields.io/badge/gemini-embeddings%20%2B%20flash-1B2632?labelColor=0B1016)
![No vector DB](https://img.shields.io/badge/vector%20db-none%20required-3FD0C9?labelColor=0B1016)

</div>

---

## What it refuses to do

**It won't serve a stale listing.** Every job carries a `lastSeen` stamp, and
anything past 48 hours is pruned from the index on ingest:

```ts
export const STALE_MS = 48 * 60 * 60 * 1000;
```

A job board that returns filled roles is worse than no job board, so the index
is allowed to shrink. Recall is not the goal; not wasting an application is.

## Two decisions worth explaining

**No vector database.** The index is a plain JSON file — whole-job embedding
documents, one per listing — committed to the repo and read at request time.
A managed vector store for a few thousand rows is an operational dependency, a
bill, and a cold-start penalty bought to avoid a linear scan that finishes in
milliseconds. It also means the whole thing deploys to Vercel with no
provisioning.

**It degrades instead of failing.** With `GOOGLE_GENERATIVE_AI_API_KEY` set,
ranking is cosine similarity over Gemini embeddings. Without one, the same
retrieval path falls back to keyword scoring and the app still runs. You can
clone this and see it work before you have credentials.

## How retrieval works

```
query → extractFilters()  tags · sources · location · remote-only
      → matchesFilters()  metadata prefilter over the index
      → cosineSimilarity() over embeddings, or keywordScore() as fallback
      → show_jobs tool call → streamed JobCard components
```

Filtering before ranking, rather than ranking then filtering, means the
similarity pass only ever sees rows that already satisfy the hard constraints in
the question. "Remote Python roles" resolves the two structured parts
structurally and spends the vector budget on the rest.

Results come back through Vercel AI SDK tool calling, so the model returns
`show_jobs` with real records and the UI renders `JobCard`s. The listings on
screen are rows from the index, not text the model produced.

## Setup

```bash
cp .env.local.example .env.local
npm install
npm run seed
npm run dev
```

`seed` scrapes listings into `data/jobs-index.json` and needs no API key. To
attach embeddings and prune anything older than 48 hours:

```bash
npm run ingest
```

Put `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local` first. Bulk ingest runs as a
CLI rather than in a route to avoid serverless timeouts.

## Deploying

1. Set `GOOGLE_GENERATIVE_AI_API_KEY` in the Vercel project environment.
2. Optionally set `INGEST_SECRET` to enable the protected `/api/ingest` re-seed.
3. Deploy from GitHub.

Re-index locally with `npm run ingest`, commit `data/jobs-index.json`, and push —
or call the protected ingest endpoint.

## Sources

RemoteOK and Remotive public APIs, plus a Cheerio HTML path for boards without
one. Sites whose terms forbid automated access are not scraped.

## Structure

| Path | Role |
| --- | --- |
| `src/lib/scraper/` | RemoteOK, Remotive, Cheerio HTML |
| `src/lib/rag/chunk.ts` | Whole-job embedding documents |
| `src/lib/rag/store.ts` | JSON index upsert, `lastSeen` prune |
| `src/lib/rag/retrieve.ts` | Filter extraction, hybrid retrieve |
| `scripts/ingest.ts` | Bulk ingest CLI |
| `scripts/seed-index.ts` | Scrape-only seed, no API key |
| `src/app/api/chat/route.ts` | Streaming RAG + `show_jobs` tool |
| `src/components/JobCard.tsx` | Structured job UI |

## Elsewhere

Part of [my portfolio](https://portfolio-website-eight-kappa-iwtiz3w2ef.vercel.app),
which introduces each project by the thing it refuses to do.

Related: [job-autopilot](https://github.com/JamesKevinJones/job-autopilot) takes
the opposite end of the same problem — scoring and queueing roles for approval
rather than searching them conversationally.
