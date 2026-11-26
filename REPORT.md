# Rehearsal report: experiment 617

Flagsmith numbers as of 2026-11-26T11:38Z. Understudy sessions since 2026-11-26T11:00:00Z: 360 (358 enrolled).

## Flagsmith (Bayesian engine)

| Variant | Exposures | Conversions | Rate |
|---|---|---|---|
| signup_first | 171 | 40 | 23.4% |
| preview_first | 185 | 18 | 9.7% |

Lift of preview_first vs control: **-58.4%**, 95% credible interval [-79.9%, -36.9%]. Chance preview_first beats control: **< 1%**.

## Decision (pre-registered rule, applied in code)

`understudy/decision.json`: ship preview_first above 95.0%, keep control below 5.0%, otherwise inconclusive.

**Verdict: keep_control.** Flagsmith gives preview_first a < 1% chance of beating control (rule: ship above 95.0%, keep control below 5.0%).

## Does Flagsmith agree with the transcripts?

| Variant | Understudy sessions | Flagsmith exposures | Understudy sign-ups | Flagsmith conversions |
|---|---|---|---|---|
| signup_first | 172 | 171 | 40 | 40 |
| preview_first | 186 | 185 | 18 | 18 |

Sessions that ended in an error (the persona never acted, usually a network drop) still count as exposures in Flagsmith: signup_first 4, preview_first 1. Excluding them, the sign-up rates are signup_first 23.8%, preview_first 9.7%.

## Who each version helped or hurt (directional, small cells)

| Persona | signup_first | preview_first |
|---|---|---|
| at-68-percent | 5/22 | 2/14 |
| between-classes | 0/13 | 0/23 |
| burned-before | 0/23 | 0/13 |
| club-lead | 0/18 | 1/18 |
| fresher-anxious | 13/18 | 7/18 |
| idle-scroller | 0/12 | 0/23 |
| lateral-entry | 11/16 | 7/19 |
| privacy-guarded | 0/14 | 0/22 |
| spreadsheet-senior | 1/16 | 0/20 |
| topper-95 | 10/20 | 1/16 |

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
