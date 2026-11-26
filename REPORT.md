# Rehearsal report: experiment 617

Flagsmith numbers as of 2026-11-26T11:11Z. Understudy sessions since 2026-11-26T11:00:00Z: 120 (118 enrolled).

## Flagsmith (Bayesian engine)

| Variant | Exposures | Conversions | Rate |
|---|---|---|---|
| signup_first | 64 | 10 | 15.6% |
| preview_first | 52 | 7 | 13.5% |

Lift of preview_first vs control: **-13.8%**, 95% credible interval [-91.6%, 63.9%]. Chance preview_first beats control: **36.0%**.

## Decision (pre-registered rule, applied in code)

`understudy/decision.json`: ship preview_first above 95.0%, keep control below 5.0%, otherwise inconclusive.

**Verdict: inconclusive.** 36% is between 5% and 95%: keep control and re-test on real traffic.

## Does Flagsmith agree with the transcripts?

| Variant | Understudy sessions | Flagsmith exposures | Understudy sign-ups | Flagsmith conversions |
|---|---|---|---|---|
| signup_first | 65 | 64 | 10 | 10 |
| preview_first | 53 | 52 | 7 | 7 |

Sessions that ended in an error (the persona never acted, usually a network drop) still count as exposures in Flagsmith: signup_first 4, preview_first 1. Excluding them, the sign-up rates are signup_first 16.4%, preview_first 13.5%.

## Who each version helped or hurt (directional, small cells)

| Persona | signup_first | preview_first |
|---|---|---|
| at-68-percent | 2/10 | 1/2 |
| between-classes | 0/5 | 0/7 |
| burned-before | 0/8 | 0/4 |
| club-lead | 0/7 | 0/5 |
| fresher-anxious | 5/8 | 2/4 |
| idle-scroller | 0/6 | 0/5 |
| lateral-entry | 2/5 | 3/6 |
| privacy-guarded | 0/3 | 0/9 |
| spreadsheet-senior | 0/6 | 0/6 |
| topper-95 | 1/7 | 1/5 |

## Why personas left

**signup_first**

- No time before lecture and I'm not making an account for this.
- Don't want to give my name, college email and roll number to an unknown attendance app — I'll just work it out myself.
- Asks for college email and roll number before showing any actual functionality; too much personal info to hand over without knowing if it's legit.
- Not worth creating an account while just bored-scrolling
- I already have good attendance, so this app isn't worth sharing more personal details like my roll number.
- Wants account signup before showing anything useful, not handing over my details to an unknown site.

**preview_first**

- My Google Sheet already does this and I don't want another account to manage.
- Wants my college email and roll number — too much personal info for an unknown site.
- Wary of signing up after being spammed before; the sample demo was enough to see what it does.
- Does nothing my Google Sheet doesn't already do, and I'm not signing up for another app.
- No time to sign up before lecture, and I only wanted a quick look.
- Not ready to create an account before understanding how it actually works
