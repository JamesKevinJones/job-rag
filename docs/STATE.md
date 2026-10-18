# State

## 2026-10-18: plain-text answer fix shipped

`9e1d5bb` is live: pushed to `main` (fast-forward, `79fb0f2`) at Kevin's go-ahead, and
Vercel deployed it from the push in about a minute. Confirmed in the live chat bundle,
which now contains `toPlainText`'s `#{1,6}` pattern; the bundle served before the push
did not. Pushed with only 3 real samples because the `toPlainText` backstop strips `**`,
headings and bullets whatever the prompt does; the prompt change is still under-sampled.
Before push: `npx tsc --noEmit` and `npm run build` pass; the diff was security-reviewed
by hand (still text-only React output, no new deps or network calls). A real answer
could not be checked live after the deploy: the Gemini free-tier quota for the day was
already spent ("An error occurred."). It resets at 05:30 IST.

**Next step:** after the reset, run the suggested queries a few times on the live site
to sample the prompt change, then retake the portfolio's JobMatch screenshot uncropped.
Local `main` in the main checkout is still at `4a93a16`; `git pull` to catch up.

## 2026-10-17: answer text rendered raw Markdown

**Changed (branch `fix/plain-text-answer`, not pushed):**

- `src/lib/rag/prompt.ts`: the system prompt now asks for plain-text prose in
  one to three sentences, with no Markdown and no list of the jobs (the cards
  already show them).
- `src/components/ChatPanel.tsx`: `toPlainText()` strips `**`, leading `#`
  headings, and turns leading `*`/`-` bullets into `•` in assistant text, as a
  backstop when the model ignores the prompt. It stays text-only, so React still
  escapes it; no HTML rendering was added.

**Verified:**

- Reproduced before the fix: 1 of 8 `/api/chat` replies had Markdown, the
  exact `- **SuperPlane – Product Engineer**: ...` line from the report.
- After the fix, only 1 real reply came back (plain text). The rest hit the
  Gemini free-tier cap of 20 requests per day per model
  (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`), so the prompt change
  is not yet tested on a real sample.
- The render path was checked in the browser with a stubbed stream containing
  the reported line: it renders as `• Product Engineer at SuperPlane: ...`.
- `npx tsc --noEmit` and `npm run build` pass. `npm run lint` fails on
  pre-existing issues in untouched files (`src/lib/scraper/html.ts:75`
  prefer-const error, two unused-var warnings in `src/lib/rag/store.ts`).

**2026-10-18 re-check:** 2 more real replies, both plain text (3 in total
since the fix, none with Markdown). The quota ran out again after that. The
Gemini free-tier day resets at 00:00 UTC (05:30 IST), not midnight Pacific.
Only about 4 of the day's 20 requests came from this check, so the live demo
probably shares the Google project and uses the rest. Not pushed: 3 samples is
too few against a 1-in-8 failure rate.

**Open:**

- The project has no `docs/VERIFY.md` and no `/security-review` command. The
  checks above are the `package.json` scripts.
- Pre-existing lint error in `src/lib/scraper/html.ts`.

**Next step:** after the Gemini quota resets, run the four suggested queries a
few times against the dev server and confirm no Markdown comes back. Then push
the branch (Kevin's go-ahead), merge, and retake the uncropped portfolio
screenshot (`portfolio-website/public/images/work/job-rag.jpg`).
