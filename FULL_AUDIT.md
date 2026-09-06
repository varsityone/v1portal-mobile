# V1Portal Mobile — Complete Functional Audit
**Date:** 2026-09-06 | **Status:** Starting fresh with proper screen-by-screen comparison

---

## ATHLETE SIDE (Dashboard Routes)

| Screen | Web Features | Mobile Status | GAP |
|--------|--------------|--------------|-----|
| **Dashboard** (`/dashboard`) | 1. Gameplan hero (3 phases, lock/unlock states, completion %) 2. Welcome greeting w/ avatar + tier badge + recruiting level 3. After-completion KPI cards (Profile Views, Programs Reviewed, Programs Liked) 4. V1 Score animator card 5. Mutual matches count card 6. Unread messages count card 7. Top Fit Programs hero (best fit spotlight + carousel) 8. Phase unlock animation banner 9. Upgrade banner (free users) 10. Onboarding tour | Greeting card only, score card, mutual matches, unread messages (4 cards, minimal) | **CRITICAL:** Missing gameplan hero section, KPI cards, top fit programs, upgrade banner, animations, tour. Desktop is 1,109 lines, mobile is 110 lines. ~85% missing. |
| **Results** | 1. Score breakdown (physical/production/academics/intangibles %) 2. Percentile card 3. Score history chart 4. Reality-check card 5. Recruiting gap card 6. Retake card + upsell 7. Complete banner | Has basic `results.tsx` but likely stub | Need to verify if it has actual score breakdown, charts, percentile, cards |
| **Gameplan** | Phase detail expand/collapse, checklist items, locked state, unlock messaging | Exists, matches web | OK |
| **Match** | Swipe deck (program matching), match history grid | Exists, has swipe deck | OK |
| **Tracker** | Progress milestones (4 steps), progress bar, completion % | Built in last session | OK |
| **Targeting** | Division targeting (D1/FCS/D2/D3 filters), prospect count per division, geography filter | Built in last session | OK |
| **Outreach** | Videos, transcripts, communication templates to coaches | Built as placeholder | Needs implementation |
| **Messages** | Coach inbox + thread UI (1:1 messaging from coaches) | Built as placeholder | Needs implementation |
| **Calendar** | Recruiting timeline (game dates, visit events, commit/signing dates) | Built, basic structure | Needs verification of data binding |
| **Analytics** | Dashboard stats (profile views, matches, messages, timeframe selector) | Built, basic structure | Needs verification of data binding |
| **Help** | Support resources, FAQs, contact support | Built as placeholder | Needs implementation |
| **Settings** | Password, email, profile visibility, account deletion | Built, basic structure | Needs verification |
| **Notifications Settings** | Email/push toggles for matches, messages, achievements | Split screen created last session | OK |
| **Upgrade** | Pricing tiers, feature comparison, upsell CTAs | Built, basic structure | Needs verification |
| **Profile** | Profile display (read-only), edit photo, stats | Built, basic structure | Needs verification |

---

## COACH SIDE (Coach Routes)

| Screen | Web Features | Mobile Status | GAP |
|--------|--------------|--------------|-----|
| **Dashboard** | Stats tiles (searches run, matches sent, messages sent, athletes saved), activity feed, top positions/states | Built as stub | Need stats queries, activity |
| **Search** ⚠️ | 1. Prospect query (name ilike, position/grad-year/state IN, min-score GTE, verified-only) 2. Debounced search 3. Filters: positions (12), grad years (5), states (50), min score slider, verified toggle 4. Grid/List view toggle 5. Bulk select 6. Save/Message/Add to Pipeline per prospect 7. Saved count tracking 8. Messaged count tracking 9. View toggle (grid vs list) | **DOES NOT EXIST** | **CRITICAL:** This is a 661-line core feature. Requires: full filter UI, prospect cards with stars, save action, message action, pipeline action, multi-select, view modes |
| **Saved** | 1. Coach_saved_prospects query (joined to athletes) 2. Sort toggle (recent vs score) 3. Remove action 4. Notes editor (column exists on DB, zero UI on web) 5. Tap to detail | Built but check data binding | Check if notes editor works |
| **Recruits/[id]** | Shared detail sheet (reused by Search/Saved/Pipeline) with: core fields, star rating, notes editor, action buttons (Add to Pipeline, Message, Save) | Built as stub | Needs full implementation |
| **Matches** | Match requests sent to athletes (mutual_matches table view) | Built with basic structure | Needs data binding verification |
| **Messages** ⚠️ | Separate from match threads (coach_athlete_conversations table). 1. Inbox list (convo joined to athlete, sorted by last_message_at) 2. Thread UI (bubbles, timestamps) 3. Send via RPC (new `send_coach_message` per plan) 4. Mark read on mount 5. Photo/name display | Inbox built, thread screen exists | Need to verify: RPC call pattern, mark-read logic, atomic send |
| **Bulk Message** | 1. Athlete picker (multi-select from saved/pipeline) 2. Template picker (if templates exist) 3. Body editor 4. Compliance pre-check (dead/quiet period block) 5. Progress UI (batch status) 6. Contact info regex nudge (match thread has this, needs backport) | Built as stub | Need template system, compliance, batch progress, contact regex |
| **Templates** | 1. Coach_message_templates CRUD 2. Name + category (columns may not exist in live schema — Phase 0 checks this) 3. Body editor 4. Delete action | Built as stub | Needs schema verification (Phase 0), full CRUD |
| **Pipeline** | 1. Coach_recruit_pipeline CRUD (status enum) 2. Status transitions (interested → committed → signed, auto-stamp dates) 3. No delete (per RLS) 4. Filterable list by status 5. Tap to detail | Built as stub | Need status transitions, timestamp auto-stamping, no delete enforcement |
| **Recruiting** | Geographic targeting map (web uses `<RecruitingMap>` — plan specifies SVG map for mobile) with: tap-to-toggle states, prospect count by state, top prospects by division | Built as stub | Need SVG state map, tap interaction, prospect queries per state |
| **Calendar** | 1. Hand-built month grid 2. Event CRUD (title, date, athlete picker for athlete-specific) 3. Dead/quiet period events (program-wide, athlete_id nullable, Phase 0 adds this) 4. Color by event type | Built as stub | Need event CRUD, athlete picker, nullable athlete_id handling |
| **Analytics** | 1. KPI tiles (profile views, matches sent, messages, athletes saved) 2. Funnel (prospects → saved → matched → messaged) 3. Top positions / states lists 4. Timeframe selector (week/month/all) | Built as stub | Need N+1 fix (batch athlete queries), funnel math, top lists |
| **Profile** | Display coach info (title, division, region, position needs, level bands, years coaching, bio, phone, twitter, message_to_recruits, photo) + Edit link | Built, basic structure | Check if all fields render |
| **Profile/Edit** | 1. 17 title dropdown 2. Division dropdown 3. Region (forced to null when division ≠ NJCAA) 4. Position needs multi-select 5. Level bands multi-select (derived to min_score via floorFromLevels) 6. Phone + phone_public 7. Years coaching, previous stops, bio, message_to_recruits 8. Photo upload (storage path `coach-photos/{user.id}-{timestamp}.ext` in athletes bucket) | Built as stub | Need all form fields, region nulling logic, photo upload (requires expo-image-picker), min_score computation |
| **Setup** | Onboarding flow for new coaches (same as profile/edit but guided) | Built as stub | Needs onboarding UX |
| **Help** | Support resources | Built as placeholder | Needs content |
| **Compliance** | Dead/quiet period block, contact info regex nudge | Built as stub | Check if compliance API call works |
| **Settings** | Links hub (Profile Edit / Notifications / Compliance / Sign Out) | Built as stub | Check sign out, navigation |
| **Notifications Settings** | Email/push toggles (subscription_notifications table or coach_notification_settings?) | Built as stub | Schema verification (Phase 0), self-heal insert if missing |

---

## CRITICAL GAPS (Prioritized)

### ATHLETE SIDE
1. **Dashboard** — Gameplan hero section missing (1,000 lines of complexity: 3-phase accordion, unlock animation, progress bar)
2. **Results** — Full rebuild needed (score breakdown %, percentile, chart, retake/upsell cards, reality-check)
3. **Outreach/Messages/Help** — Stub implementations need real content/data binding

### COACH SIDE
1. **Search** ⚠️ **DOES NOT EXIST** — 661-line component with full filter UI, debounce, multi-actions. **Core feature for coach workflow.**
2. **Profile/Edit** — Photo upload (new dependency: expo-image-picker), full form (17 fields), region nulling logic, min_score computation
3. **Bulk Message** — Template system, compliance check, batch progress, contact regex nudge (needs backport to match thread too)
4. **Recruiting** — SVG state map (interactive, tappable paths), queries per state
5. **Calendar** — Event CRUD, athlete picker, nullable athlete_id (Phase 0 DB migration)
6. **Templates** — Schema verification (columns may not exist), full CRUD

### DATABASE/API (Phase 0)
- Confirm `coach_message_templates.name` / `.category` exist or migrate them in
- Confirm `recruiting_calendar_events.athlete_id` is nullable (Phase 0 migration needed)
- Confirm `coach_notification_settings` INSERT policy exists (Phase 0 migration if missing)
- Create `send_coach_message(p_conversation_id, p_coach_id, p_athlete_id, p_content)` RPC for atomic sends
- Verify `get_score_percentile(p_score)` RPC signature

---

## SCOPE SUMMARY

**Athlete Side:**
- 4 screens need significant work (Dashboard gameplan, Results breakdown, data binding for 3 stubs)
- **Estimated:** 40-60% feature parity gap

**Coach Side:**
- **7 screens do not exist or are stubs** (Search, Recruits detail, Profile/Edit, Bulk Message, Recruiting, Calendar, Templates)
- **Estimated:** 60-80% feature parity gap

**Overall:** Mobile is ~30-40% feature complete vs. web. Not production-ready for App Store yet.

---

## NEXT STEPS

1. Run Phase 0 (DB/RLS verification + migrations) first
2. Rebuild athlete dashboard gameplan hero section (highest impact)
3. Rebuild coach search (core workflow blocker)
4. Complete remaining coach screens (profile/edit, bulk message, recruiting, calendar, templates)
5. Data-bind all stubs (outreach, messages, help, analytics, etc.)
6. Full verification pass (golden path, empty states, gating, offline)

