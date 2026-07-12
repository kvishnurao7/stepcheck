# StepCheck

A CBSE Class 10 maths **step-verifier** for your son. He photographs or types his own working; StepCheck finds the **first wrong step**, explains the concept, shows which **board-exam marks** are at risk, and **never gives the answer**. It also runs full sample papers (with child / parent / teacher views) and brings mistakes back for spaced revision.

---

## What you need (once)
1. A free **GitHub** account and a free **Vercel** account (Vercel hosts the app).
2. An **Anthropic API key** from https://console.anthropic.com (this is what your son's checks bill against).
3. **Claude Code** open in this folder (you're on the Max plan, so it's included).

---

## Fastest path — let Claude Code do it
Open Claude Code in this folder and say:

> Deploy this to Vercel. Then tell me exactly where to paste my ANTHROPIC_API_KEY and set APP_PIN.

Claude Code will run the steps below for you. If you'd rather do it by hand:

## Manual deploy (about 10 minutes)
1. **Install dependencies and test locally**
   ```bash
   npm install
   npm run dev
   ```
   Open the local URL. You'll see the PIN screen (it can't check answers yet until the key is set on a deploy — that's expected).

2. **Put the code on GitHub**
   ```bash
   git init && git add -A && git commit -m "StepCheck v1"
   ```
   Create a new empty repo on GitHub and follow its "push an existing repository" lines.

3. **Import into Vercel**
   - Go to vercel.com → Add New → Project → import your GitHub repo.
   - Framework preset: **Vite**. Leave build settings as detected.
   - Before deploying, open **Environment Variables** and add three:
     | Name | Value |
     |------|-------|
     | `ANTHROPIC_API_KEY` | your key from console.anthropic.com |
     | `APP_PIN` | any short PIN you choose, e.g. `4271` |
     | `ANTHROPIC_MODEL` | `claude-sonnet-5` (optional) |
   - Click **Deploy**.

4. **Open it on your son's phone**
   - Visit the Vercel URL, enter the family PIN once.
   - In the browser menu choose **Add to Home Screen** — it now behaves like an app.

---

## Everyday use
- **Check** — photograph tonight's sum, get the first wrong step and a hint ladder (answer never shown).
- **Revise** — saved mistakes come back on day 1, 3, 7, 21; tap "Practice a similar sum" for a fresh question.
- **Papers** — paste a full CBSE sample paper, attempt it, get a report card out of 80.
- **Progress** — mastery per chapter and where the marks leak. Switch to **Parent** view for a no-maths summary.

## Changing anything later
Just tell Claude Code in plain English — "add Class 9 chapters", "make the parent view email me a weekly summary", "switch to a cheaper model". See `CLAUDE.md` for how the project is organised.

## Notes
- The API key never reaches the browser — all AI calls run on Vercel's server.
- v1 stores the error log on the device. To sync across phones later, see "Upgrading storage" in `CLAUDE.md`.
