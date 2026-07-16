# StepCheck — project guide for Claude Code

StepCheck is a CBSE Class 10 (India) mathematics **step-verifier**. A student photographs or types their own working; the app finds the **first wrong step**, explains the concept, mirrors the **CBSE step-wise marking scheme**, and **never reveals the final answer**. It also runs full sample papers and tracks mistakes with spaced revision.

This file tells you (Claude Code) how the project fits together so you can extend it safely.

## The one rule that must never break
**The final answer to a student's question is never revealed** — not in feedback, not in a hint, not in paper marking. Two safeguards enforce this:
1. Every AI prompt (`api/_prompts.js`) states the no-reveal rule explicitly.
2. `api/check.js` and `api/mark-answer.js` run a **second "answer-leak guard" pass** (`guardUserText`) that rewrites any field that leaked the answer. If you add a new AI endpoint that produces student-facing feedback, route it through the same guard.

## Stack
- **Frontend:** Vite + React 18 (plain JS, no TypeScript). Inline style objects in `src/lib/styles.js` — there is no CSS framework. Aesthetic: Indian school exercise book (paper `#F2EFE7`, ink blue `#1B3A8C`, red pen `#C0392B`, green `#1B7A3D`, "Caveat" handwriting font for verdicts).
- **Backend:** Vercel serverless functions in `api/*.js` (Node, `export default handler(req,res)`). All Anthropic calls happen here.
- **Storage:** browser `localStorage` (see `src/lib/storage.js`). v1 is single-device.

## Secrets / environment (never hard-code these)
- `ANTHROPIC_API_KEY` — server-side only. Set in Vercel → Settings → Environment Variables.
- **There is no auth** (the family-PIN gate was removed by request). The API endpoints are open — anyone with a deployed URL can trigger Anthropic calls billed to the key. Keep deployed URLs private, or reintroduce protection (Vercel access controls / an auth gate) before sharing widely.
- `ANTHROPIC_MODEL` — optional; defaults to `claude-sonnet-5`. Change here to switch models.

## Layout
```
api/
  _lib.js          Anthropic fetch, JSON parse, method guard
  _prompts.js      ALL prompt text (the no-reveal rules live here)
  check.js         step check + answer-leak guard (chained)
  mark-answer.js   per-question CBSE marking for papers + guard
  explain.js       grades the student's self-explanation
  variant.js       generates a fresh practice question
  parse-paper.js   turns pasted paper text into structured questions
src/
  App.jsx          shell: header + view switch, tab bar, persistence
  lib/
    api.js         client wrapper for the serverless functions
    storage.js     localStorage: view mode, {checks, mistakes, papers, attempts}
    styles.js      style tokens, CHAPTERS (14), ERROR_TYPES (7)
    image.js       client-side photo downscale/compress
  components/
    Check.jsx      photograph/type working → verify → save mistake
    Revise.jsx     spaced repetition (day 1,3,7,21) + practice variants
    Progress.jsx   mastery bars, error-leak bars, parent summary
    Papers.jsx     paper library, add/parse, attempt, marking, report card
    Notebook.jsx   shared marked-notebook result panel (hint ladder, self-explain)
public/
  manifest.json, icon-192.png, icon-512.png   (PWA install)
```

## View modes (child / parent / teacher)
Set in the header, stored in `localStorage`, passed as a `view` prop.
- **child** (default): progressive disclosure — hints revealed one level at a time; full self-explanation loop.
- **parent**: word-light; hides raw maths and per-question detail, shows scores and plain-English diagnostics.
- **teacher**: dense; shows all hints/step-breakdowns up front; intended to be print-friendly.
When adding UI, branch on `view` the way the existing components do.

## Data shapes (localStorage `stepcheck.data.v1`)
- `checks[]`: `{date, chapter, verdict}` where verdict ∈ `all_correct|error_found|unclear`
- `mistakes[]`: `{id, date, chapter, errorType, concept, note, question, stage, nextReview}` — `nextReview` null means retired. Spacing gaps: `REVIEW_GAPS = [1,3,7,21]`.
- `papers[]`: `{id, title, total_marks, questions:[{number, section, marks, chapter, type, text, mcq_options?}]}`
- `attempts[]`: `{id, paperId, title, date, earned, total, answers:{[qnum]: {...}}}`

## Common tasks
- **Run locally:** `npm install`, then `npm run dev`. To exercise the API locally, install the Vercel CLI and run `vercel dev` (serves `/api`), or just deploy and test on the deployed URL.
- **Deploy:** push to GitHub and import into Vercel, or `vercel --prod`. Set the three env vars first.
- **Add a chapter/error type:** edit `CHAPTERS` / `ERROR_TYPES` in `src/lib/styles.js` (the prompts read the chapter list too — keep them in sync in `api/_prompts.js`).
- **Change marking behaviour:** edit `SYSTEM_MARK` / `markUserText` in `api/_prompts.js`.

## Upgrading storage to cross-device (future)
Replace `src/lib/storage.js` reads/writes with calls to a Supabase (or similar) table keyed by the family, and add a server function that authenticates the family before every DB read/write. Keep the same data shapes so the components don't change. Do not expose the DB directly to the browser.

## Guardrails when editing
- Keep all Anthropic calls server-side; never move the API key or model call into `src/`.
- Preserve the answer-leak guard on any student-facing AI output.
- Keep the exercise-book styling consistent (use tokens in `styles.js`).
