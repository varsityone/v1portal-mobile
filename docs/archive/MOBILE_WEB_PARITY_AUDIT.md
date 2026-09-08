# Mobile ↔ Web Parity Audit
Date: 2026-09-06
Scope: athlete + coach product surfaces only (marketing pages, /admin, and auth/webhook/cron API plumbing excluded per instructions).

Method: every finding below was checked against the live Supabase schema (project `swsjuxsbvfdejeuilhzk`) via `information_schema.columns`, `pg_policies`, and `pg_proc` — not assumed from either codebase's field names. File:line citations are given for both sides wherever a finding is code-level.

---

## 1. CRITICAL

### 1.1 Coach "Recruiting" (targeting) screen is built against a schema that does not exist — read AND write both fail
- **Mobile:** `hooks/useCoachTargeting.ts` (all lines) — reads `tgt.target_states` (array) and `tgt.min_score` from `coach_targeting`, and on save does `.insert([{ coach_id, target_states: [...], min_score }])` / `.update(payload)`.
- **Live schema (`coach_targeting`):** columns are `id, coach_id, state (text, NOT NULL — one row per state), created_at, updated_at`. There is **no `target_states` column and no `min_score` column** on this table. (`min_score` actually lives on `coach_accounts`.)
- **Web's real pattern**, confirmed in `/Users/wesstarke/Desktop/v1portal/components/RecruitingMap.tsx:100-110`: one row per `(coach_id, state)`, inserted/deleted per toggle — `supabase.from('coach_targeting').insert({ coach_id: coachId, state })` / `.delete()...eq('state', state)`. No `min_score` column is ever touched on this table by web.
- **Effect:** Mobile's `.select('*').eq('coach_id', coach.id).single()` will error (`PGRST116`, multiple rows) for any coach who has ever targeted more than one state via web, and the `.insert`/`.update` payload writes to two columns that don't exist — PostgREST rejects it, `error` is never checked, so it fails silently and nothing saves. The entire coach targeting/recruiting screen (`app/(coach)/recruiting.tsx`) is non-functional against production data in both directions.
- **Fix direction:** Rewrite `useCoachTargeting` to treat `coach_targeting` as one-row-per-state (mirror `RecruitingMap.tsx`'s insert/delete-per-toggle), and read/write `min_score` from `coach_accounts` instead.

### 1.2 Coach bulk-message: compliance check always fails → feature can never send
- **Mobile:** `hooks/useCoachBulkMessage.ts:28` — `fetch('/api/compliance/check', {...})` uses a **relative URL**. React Native's `fetch` has no document origin to resolve a relative path against; every other mobile screen that calls this same Next.js API route prefixes it with `const API_BASE = 'https://v1portal.com'` (see `app/(tabs)/match/index.tsx:28`, `app/(coach)/match/[matchId].tsx:23`, `app/(coach)/match/index.tsx:21`, `app/(tabs)/match/[matchId].tsx:23`) — this hook is the only caller that omits it.
- **Effect:** the fetch throws, the `catch` block returns `false` for `allowed` (line 40-43), and `send()` always shows "Messaging is blocked during a dead or quiet period" (line 55) and aborts before sending anything. **Every bulk-message attempt fails, 100% of the time**, regardless of actual NCAA period.
- **Secondary bug, same file, lines 71-79:** the conversation lookup is find-only (`.select('id')...single()`), and if no `coach_athlete_conversations` row exists yet for that athlete it throws `'Conversation creation failed'` instead of creating one — contrast with `app/(coach)/search.tsx:150-156`, which correctly finds-or-creates. Even if bug #1 is fixed, a coach can only bulk-message athletes they've already 1:1-messaged before.
- **Fix direction:** prefix the fetch with the same `API_BASE` constant used elsewhere; add an insert-if-missing branch for the conversation lookup.

### 1.3 Coach recruit detail page is an empty stub (web: 590 lines of real detail)
- **Mobile:** `app/(coach)/recruits/[id].tsx` (33 lines total) — destructures `id` from params and never uses it; no Supabase call of any kind; renders a static `EmptyState` placeholder ("Prospect information and history displayed here.").
- **Web:** `/Users/wesstarke/Desktop/v1portal/app/coach/recruits/[id]/page.tsx` (590 lines) — real prospect profile, pipeline status control, contact log (`coach_prospect_contact_log`), and private notes (`coach_prospect_notes`).
- Currently unreachable from mobile nav (the pipeline screen's row tap is also broken — see 1.4), so it isn't yet hit by real users, but it must be built before pipeline drill-down is wired up.
- **Fix direction:** port web's recruit-detail data fetch (athlete + pipeline status + contact log + notes) into this screen.

### 1.4 Coach pipeline status change is a `console.log` placeholder — the whole point of the CRM board doesn't work
- **Mobile:** `app/(coach)/pipeline.tsx:88-104` — the chevron on every prospect row calls `showStatusMenu(prospect.id, group.value)`, and that function's entire body is `console.log('Show status menu for', ...)`. There is no way to advance a prospect from Interested → Pursuing → Committed → Signed on mobile.
- `coach_recruit_pipeline` has working RLS UPDATE/INSERT policies (`Coaches can update their pipeline`, confirmed via `pg_policies`) — this is purely a missing UI, not a permissions issue.
- **Fix direction:** wire the chevron/row tap to an actual status-change action sheet that calls `supabase.from('coach_recruit_pipeline').update({ status })`.

### 1.5 Coach side has zero reachable help/support screen
- **Mobile:** `app/(coach)/help.tsx` is a static "Support resources for coaches coming soon" stub, AND it is not even registered in `app/(coach)/_layout.tsx`'s `Drawer.Screen` list, nor linked from `components/CoachDrawer.tsx` (`grep` for "help"/"Help" in that file returns nothing). A coach on mobile has no in-app path to FAQs or a support ticket at all.
- **Web:** `/Users/wesstarke/Desktop/v1portal/app/coach/help/page.tsx` — full FAQ accordion + support-ticket form posting to `/api/support`.
- Note: the athlete side is fine — the drawer's Help button (`app/(tabs)/_layout.tsx:67`) correctly routes to the real, fully-built `app/help.tsx` (FAQ + ticket form), not the dead `app/(tabs)/help.tsx` stub sitting next to it (that one is hidden from the drawer and unreferenced, same as 1.6 below).
- **Fix direction:** build a coach equivalent of `app/help.tsx` and link it from `CoachDrawer.tsx`.

### 1.6 Coach recruiting-swipe has no NCAA compliance gate (messaging does; swiping doesn't)
- **Mobile:** `app/(coach)/match/index.tsx` — no reference to `compliance` anywhere in the file (verified by grep); a coach can "like" any athlete card with no dead-period/quiet-period check.
- **Mobile (for contrast, correctly gated):** `app/(coach)/match/[matchId].tsx:141-163` — coach *messaging* does call `/api/compliance/check` and blocks/queues correctly.
- **Web:** `/Users/wesstarke/Desktop/v1portal/app/dashboard/match/page.tsx:404-416` — a coach's swipe/like also runs through `useCompliance().check({..., action: 'swipe', ...})` before `recordSwipe` and shows `ComplianceAlert` (queue or cancel) if blocked.
- Given the standing NCAA-compliance priority for this product, an unguarded "like" action from a coach during a dead/quiet period is a real compliance exposure, not just a UX gap.
- **Fix direction:** call the same `/api/compliance/check` (with `action: 'swipe'`) before `recordSwipe` in `(coach)/match/index.tsx`, mirroring the pattern already built for `(coach)/match/[matchId].tsx`.

---

## 2. HIGH

### 2.1 Mobile gives away two Match+ (paid) features for free — calendar and recruiting-intelligence analytics
- **Calendar:** Web (`/Users/wesstarke/Desktop/v1portal/app/dashboard/calendar/page.tsx:182-186, 264-283`) hard-gates the *entire* calendar page behind `isPremium` (`subscription_status === 'active' || is_admin || manual_access`) with a "Requires Match+" paywall. Mobile's `app/(tabs)/calendar.tsx` has no premium check anywhere (confirmed by grep for `isPremium`/`subscription`/`manual_access` — zero hits) — full custom-event CRUD is open to every free athlete.
- **Analytics:** Web (`/Users/wesstarke/Desktop/v1portal/app/dashboard/analytics/page.tsx:143-144, 235-263`) gates the "Recruiting Intelligence" block (conversion funnel by division, coach reply-time, most-engaged-coaches) behind the same `isPremium` check, showing an upsell CTA otherwise. Mobile's `app/(tabs)/analytics.tsx:397-477` renders the identical, faithfully-ported logic (division funnel, response time, coach momentum) unconditionally for every user — no `isPremium` destructured from `useAthleteData` at all in this file.
- Both are clear regressions, not stylistic choices: `useAthleteData` already exposes `isPremium` and `app/(tabs)/results.tsx:94-110` correctly uses it to gate detailed score breakdown, so the pattern exists on mobile — these two screens just never applied it.
- **Fix direction:** wrap the calendar screen's body and the analytics screen's Recruiting Intelligence block in the same `isPremium` check used in `results.tsx`, with an upgrade CTA to `/(tabs)/upgrade`.

### 2.2 Swipe-deck "your level" and "reach" threshold use the wrong constant table on mobile
- **Web** deliberately keeps two separate tables (see comment at `/Users/wesstarke/Desktop/v1portal/lib/recruitingLevels.js:62-67`): `DIVISION_BAND_FLOOR` (85/75/65/55/55/0, via `getBandFloorForDivision`/`getPrimaryDivisionForScore`) for "what division fits this athlete," and `DIVISION_MIN_SCORE_DEFAULT` (80/75/70/60/60/50) *only* for coach-setup defaults. Web's swipe deck (`app/dashboard/match/page.tsx:327, 397`) correctly uses the band-floor function for both the athlete's level tag and the reach threshold (preferring `coachCard.min_score` first).
- **Mobile:** `constants/RecruitingLevels.ts` only defines `DIVISION_MIN_SCORE_DEFAULT` and derives `getAthleteLevel()` from *that* table (line 26-28); `app/(tabs)/match/index.tsx:106, 169` uses `getAthleteLevel()` for the athlete's level and hardcoded `DIVISION_MIN_SCORE_DEFAULT[div]` for the reach warning — it never reads the coach's actual `min_score` (fetched into `CoachCard.min_score` but unused).
- **Concrete effect:** an athlete scoring 65 is told their level is **D2** on web (floor 65) but **D3** on mobile (65 < D2's 70, ≥ D3's 60) — different free-tier division lock, different "your level" badge, different reach warnings, for the identical V1 Score, on the same account.
- **Fix direction:** port `DIVISION_BAND_FLOOR`/`getBandFloorForDivision`/`getPrimaryDivisionForScore` into `constants/RecruitingLevels.ts` and use them the same way web does; use `current.min_score ?? getBandFloorForDivision(...)` for the reach check.

---

## 3. MEDIUM

### 3.1 Two dead/orphaned screens showing fabricated data, hidden from nav but still routable
- `app/(tabs)/targeting.tsx` — entirely hardcoded fake numbers (`{ division: 'FBS', schools: 15, match: 2 }`, etc.), not backed by any query. Web retired this exact feature (`/Users/wesstarke/Desktop/v1portal/app/dashboard/targeting/page.tsx` is just a redirect to `/dashboard/match`). Mobile's version is hidden from the drawer (`drawerItemStyle: { display: 'none' }` in `app/(tabs)/_layout.tsx:104`) and unlinked from anywhere, but Expo Router still serves it at a direct route if ever hit.
- `app/(tabs)/outreach.tsx` — similarly orphaned/hidden ("coming soon" stub); web's `/dashboard/outreach` is also just a redirect to `/dashboard/match`. Low risk since unreachable, but should be deleted rather than left in the tree with placeholder copy.
- **Fix direction:** delete both files and their hidden `Drawer.Screen` entries, matching web's decision to retire these features outright.

### 3.2 Web's comprehensive NCAA/NAIA/NJCAA dated-events list is missing from mobile's calendar
- Web's calendar (`/Users/wesstarke/Desktop/v1portal/app/dashboard/calendar/page.tsx:19-64`) includes a large, division-specific `RECRUITING_DATES` table (dead periods, evaluation windows, signing days by NCAA/NAIA/NJCAA) rendered under "Recruiting Calendar," in addition to the generic milestone timeline. Mobile's `app/(tabs)/calendar.tsx` only has the generic milestone timeline (`getMilestones`), which is otherwise an exact port of web's — the division-specific dates section has no mobile equivalent at all.
- **Fix direction:** port `RECRUITING_DATES`/`getUpcomingDatesByDivision` into the mobile calendar screen (this is a secondary content block, not core functionality — hence Medium, not High).

---

## 4. VERIFIED CLEAN

These were checked line-by-line against both the counterpart web code and the live schema/RLS, and found at genuine parity:

- **Coach message templates** (`coach_message_templates`) — both platforms now correctly use `title`/`content`/`category` columns (the `name`-column bug noted in prior session context is fixed on both sides).
- **Coach 1:1 messaging** — `app/(coach)/messages/[conversationId].tsx:89-92` now correctly passes the real `athleteId` to `send_coach_message` (previously empty string; confirmed fixed).
- **Athlete inbox + thread** (`hooks/useAthleteInbox.ts`, `app/(tabs)/messages/index.tsx`, `app/(tabs)/messages/[conversationId].tsx`) — columns (`athlete_unread_count`, `coach_unread_count`, `last_message_at`, `last_message_from`) and RLS (`athlete_id IN athletes WHERE user_id/linked_user_id = auth.uid()`) all match; direct insert into `coach_athlete_messages` with `sender_type: 'athlete'` satisfies the real INSERT policy.
- **Profile completeness gate** — mobile's `isProfileComplete()` (`app/(tabs)/match/index.tsx:42-53`) is a field-for-field match of web's `lib/profileCompleteness.ts` (same 17 fields, including the guardian fields and `test_scores_not_taken` fallback).
- **Free-tier swipe cap** — `FREE_ATHLETE_CARD_LIMIT = 3` is identical on both sides (`app/(tabs)/match/index.tsx:29` vs. web's `app/dashboard/match/page.tsx:26`), including the matching comment about "a real taste."
- **Analytics: profile views + match activity stat block** — mobile's `app/(tabs)/analytics.tsx:158-242` computation (reviewed/liked/matched/messagesSent/coachesWhoReplied from `swipes`+`mutual_matches`+`match_messages`) is functionally identical to web's `/api/analytics` route and to `components/recruiting-analytics-section.tsx`'s funnel/response-time/coach-momentum math — only the premium gate is missing (see 2.1), the algorithm itself is a correct 1:1 port.
- **Coach saved prospects** (`hooks/useCoachSaved.ts`, `app/(coach)/search.tsx`) — correct columns and correct find-or-create pattern for `coach_athlete_conversations` (contrast with the bulk-message hook's missing create step in 1.2).
- **Coach compliance calendar view** (`app/(coach)/compliance.tsx`) — reads `recruiting_calendars` directly with correct columns; this page is display-only on web too (the actual gate/log write happens in the swipe/message flows, tracked separately above).
- **Dashboard/tracker** — no premium gate on either side (both free), consistent.
- **coach-setup flow** — `app/coach-setup.tsx` (223 lines, actively linked from `(coach)/index.tsx`, `compliance.tsx`, `matches.tsx`, `match/index.tsx`) is the real flow; the unlinked `(coach)/setup.tsx` (56 lines) is dead code, same pattern as 3.1 — low-risk since unreachable, but worth deleting for cleanliness.

---

## Note on scope decisions
- **`athlete/[slug]` and `coach/[slug]` public profiles, `claim/[token]`:** not flagged as missing. These are inherently share-link/email-link surfaces meant to be opened by non-app-installed recipients in a browser; there's no natural "in-app" equivalent to build, and nothing in the mobile codebase suggests these were ever planned as native screens. Flagged here only so it's clear this was a deliberate scope call, not an oversight.
