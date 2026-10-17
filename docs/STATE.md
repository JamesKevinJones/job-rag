# State

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

**Open:**

- The project has no `docs/VERIFY.md` and no `/security-review` command. The
  checks above are the `package.json` scripts.
- Pre-existing lint error in `src/lib/scraper/html.ts`.

**Next step:** after the Gemini quota resets, run the four suggested queries a
few times against the dev server and confirm no Markdown comes back. Then push
the branch (Kevin's go-ahead), merge, and retake the uncropped portfolio
screenshot (`portfolio-website/public/images/work/job-rag.jpg`).
