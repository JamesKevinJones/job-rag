# Eval plan

There is no eval harness yet, so the README makes no quality claims beyond what the
tests pin. These are the three numbers worth measuring next, in order, and how.

## 1. Freshness of what the live site serves

The headline promise is that nothing older than 48 hours is shown. Pruning only
happens at ingest, so the real measure is how old the served index is.

- **Metric:** share of listings in `data/jobs-index.json` whose `lastSeen` is within
  48 hours of the moment a user queries, plus the index age (`now - updatedAt`).
- **How:** a script that reads the committed index and prints both, run in CI on a
  schedule. It needs no key. A red result means "re-run `npm run ingest`".
- **Target:** 100% within 48 hours. Today it is 0%: the index committed before
  this branch was built on 2 Aug 2026.

## 2. Retrieval quality

- **Metric:** hit rate and precision@6 over a labelled query set.
- **How:** freeze one ingested index as a fixture, write 20 to 30 queries (the four
  suggestion chips plus variants), and label which job ids are correct for each, by
  hand, from title and tags. Score `hybridRetrieve` against the labels for both
  paths: the embedded index (one Gemini embedding call per query, free tier) and
  the keyword fallback (no key). Report both, so the cost of losing embeddings is a
  number.
- **Target:** set after the first run; the point is a baseline that CI can hold.

## 3. Answer format and grounding

The 17 Oct bug was Markdown in answers: 1 of 8 replies before the prompt fix.

- **Metric:** share of answers that are plain text, and share whose job cards all
  come from the retrieved set (no invented listings).
- **How:** replay the labelled queries through `/api/chat`, about 3 Gemini requests
  each, so roughly 60 to 90 requests. That does not fit the free tier's 20 a day for
  one model, so spread it over several days or use a paid key. Count Markdown
  markers in the raw stream before `toPlainText`, and diff `show_jobs` ids against
  the retrieved ids.
- **Target:** 100% grounded cards; plain text in at least 19 of 20.
