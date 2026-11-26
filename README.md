# Understudy

**Rehearse a Flagsmith experiment on AI personas before real traffic arrives.**

> 🎥 Demo video: _link coming_ · 🌐 Live page under test: _link coming_

## Why

The Toggle Wars brief says it plainly: *"You only have four days of data."* Most new features and small apps are in the same spot. There isn't enough traffic to learn anything in a few days, and the first real visitors are the ones who find the broken button.

Understudy is a dress rehearsal for a [Flagsmith Experimentation](https://docs.flagsmith.com/experimentation) test. AI personas open the real page in a real browser, Flagsmith splits them between variants, and the page's own SDK records every exposure and conversion. When real traffic arrives, the experiment has already been debugged, and you know what to watch for.

It works like this:

- **The result isn't hard-coded.** There are no conversion rates typed into a script. Each persona reads the page and decides what to do, one tap at a time.
- **The events are real.** Understudy never calls Flagsmith. All Flagsmith traffic comes from the page under test, exactly as it would for a human.
- **You get the *why*, not just the *what*.** Every session leaves a transcript with the persona's thoughts and why it left.

## Caught before launch

Understudy's first run found a real bug. In `src/style.css`, the rule `button { display: block }` beat the `hidden` attribute, so the "Create your account" button never disappeared after a tap. Every persona kept tapping it and never reached the form. It was fixed in [`1634250`](../../commit/1634250) before any experiment launched.

The first run on a real model found a second one. A persona typed their roll number as `22CS1047`, got *"Roll number is 6–10 digits"* three times, and left: *"Roll number field rejects my real ID with an unclear format rule… not worth the hassle."* Plenty of colleges put letters in roll numbers, so the rule now accepts 5–12 letters or digits.

Both are the kind of mistake you want an understudy to hit instead of your first real visitors.

## The experiment

**Classmate** is a one-page student attendance app ("know exactly how many classes you can skip and stay above 75%"). It's the subject under test.

| | |
|---|---|
| **Decision it informs** | Should Classmate show a working sample dashboard before asking students to sign up? |
| **Hypothesis** | Showing a sample dashboard first increases the share of visitors who create an account, because they see the value before paying the cost. The risk: the extra step loses impatient visitors. |
| **Flag** | Multivariate `onboarding_flow`. Control `signup_first` goes straight to the signup form. Variation `preview_first` shows the sample dashboard, then the same form. |
| **Metric** | `signup_completed`, Occurrence, Up. It fires within the visit, as the brief recommends. |
| **Split** | 100% of visitors, 50/50 |
| **Decision rule** | Written down before launch in [`understudy/decision.json`](understudy/decision.json). Ship `preview_first` if Flagsmith's chance to beat control is above 95%. Keep control if it's below 5%. Otherwise the result is inconclusive: keep control and re-test on real traffic. |
| **Pre-registration** | Hypothesis, metric, decision rule, personas and prompt are frozen at git tag `prereg`, before launch. _commit hash coming_ |

## How Flagsmith is used

All experiment wiring lives in [`src/experiment.js`](src/experiment.js), so it can be removed cleanly once the experiment ends.

| Step | Where |
|---|---|
| Identify the visitor (anonymous UUID in localStorage) and init with events on | [`src/main.js:16`](src/main.js#L16) |
| **Exposure:** `getExperimentFlag('onboarding_flow')` records which version this visitor saw | [`src/main.js:17`](src/main.js#L17) |
| Flush right away, so visitors who bounce in 3 seconds still count | [`src/main.js:18`](src/main.js#L18) |
| Fall back to control after 2.5 s if Flagsmith is slow or blocked | [`src/main.js:15`](src/main.js#L15), [`src/experiment.js:26`](src/experiment.js#L26) |
| **Conversion:** `trackEvent('signup_completed')` | [`src/main.js:66`](src/main.js#L66) |
| Bayesian results, the decision rule and the persona breakdown | `understudy/report.js` _(coming)_ |
| Ship the winner with the same flag, then delete the losing code | _see "Shipping the winner"_ |

## How Understudy works

```
for each session:
  fresh browser context            → a brand-new visitor (localStorage id "us-<uuid>")
  open the page                    → Flagsmith assigns a variant and records exposure
  loop (≤ 12 steps):
    snapshot: page text + numbered buttons and fields
    ask the model, as the persona  → {"thought", "action": click | type | leave, ...}
    act in the browser             → conversion fires if the persona signs up
  write the transcript             → runs/<run>.jsonl
```

- **Personas** ([`understudy/personas.json`](understudy/personas.json)): 10 students, from an anxious first-year to someone who once got spammed by a "free" app. They're written in second person and say nothing about either version.
- **Model:** every persona runs on `deepseek-v4.1-flash:cloud` through Ollama Cloud. It's pinned in [`understudy/agent.js`](understudy/agent.js) and checked by a test, so all sessions in an experiment use exactly the same model.
- **Robust to messy model output:** JSON inside fences or chatter is parsed, invalid actions are recorded and skipped, and three invalid actions in a row end the session as an error. See [`understudy/actions.js`](understudy/actions.js).
- **Agent identities are prefixed `us-`**, so they're easy to tell apart from humans in Flagsmith.

## Run it

```bash
npm ci
npx playwright install chromium
cp .env.example .env    # VITE_FLAGSMITH_ENV_ID (client-side key) + OLLAMA_API_KEY
npm test                # 12 tests
npm run dev             # Classmate on http://localhost:5173
npm run understudy -- --sessions 20 --url http://localhost:5173            # rehearse
npm run understudy -- --sessions 2 --url http://localhost:5173 --headed    # watch them
```

In Flagsmith, create a multivariate flag `onboarding_flow` with value `signup_first` and a variation `preview_first`, plus a metric on the event `signup_completed`. Then start an experiment on the flag. See the [Flagsmith Experimentation docs](https://docs.flagsmith.com/experimentation).

## Results

_Coming after the run: Flagsmith's numbers, the credible interval and chance to beat control in plain English, the verdict from the pre-registered rule, which personas each version helped or hurt, and the reasons they left._

## Shipping the winner

_Coming: the flag change in Flagsmith and the cleanup commit that deletes the losing variant._

## Limitations

- **Personas aren't people.** This is a rehearsal. It catches broken flows, mis-wired metrics and large effects before you spend real traffic. It doesn't replace a test on real users.
- One model family, one metric, four days.
- The persona × variant breakdown has small cells. It shows direction, not proof.
