# V1Portal Mobile — Complete Priority Roadmap
**ALL GAPS. ALL CRACKS. EVERYTHING.**

---

## PHASE 0: DATABASE & SCHEMA VERIFICATION (BLOCKING)

Must complete before ANY code in later phases.

### 0.1 Schema Verification (Supabase MCP)
- [ ] Verify `coach_message_templates` table has `name` + `category` columns
  - If missing: `ALTER TABLE coach_message_templates ADD COLUMN name TEXT, ADD COLUMN category TEXT`
- [ ] Verify `recruiting_calendar_events.athlete_id` is nullable (NOT NULL constraint removed)
  - If NOT NULL: `ALTER TABLE recruiting_calendar_events ALTER COLUMN athlete_id DROP NOT NULL`
- [ ] Verify `coach_notification_settings` table exists
  - If missing: Create table with columns: coach_id (FK), email_matches (bool), email_messages (bool), push_matches (bool), push_messages (bool)
- [ ] Verify `get_score_percentile(p_score)` RPC exists and returns numeric
  - If missing: Create RPC `SELECT COUNT(*) * 100.0 / (SELECT COUNT(*) FROM athletes WHERE v1_score IS NOT NULL) FROM athletes WHERE v1_score <= p_score`
- [ ] Verify `coach_athlete_conversations` RLS allows athlete INSERT (for creating conversation from match context)
- [ ] Verify `coach_notification_settings` RLS has INSERT policy for coaches (self-healing insert)

### 0.2 New RPC Creation
- [ ] `send_coach_message(p_conversation_id UUID, p_coach_id UUID, p_athlete_id UUID, p_content TEXT)`
  - Wraps: INSERT into coach_athlete_messages + UPDATE coach_athlete_conversations last_message_at/last_message_from
  - Returns: message id + success flag
  - Purpose: Atomic send (fixes non-atomic 2-call risk)

### 0.3 Data Migration Check
- [ ] Pull list of all applied migrations from `information_schema.applied_migrations` or similar
  - Flag any gaps between local `supabase/migrations/` and production

---

## PHASE 1: UI PRIMITIVES & SHARED CODE (Foundation)

Build once, use across all screens.

### 1.1 Components (if not already exist)
- [ ] `components/ui/Card.tsx` — basic wrapper with padding + border radius + background
- [ ] `components/ui/Avatar.tsx` — photo-or-initials, reuse logic from `CoachDrawer.tsx`
- [ ] `components/ui/Badge.tsx` / `Pill.tsx` — colored status badges
- [ ] `components/ui/ListRow.tsx` — reusable row layout (image | name + meta | action)
- [ ] `components/ui/SearchBar.tsx` — input + clear button, modeled on `AuthInput.tsx`
- [ ] `components/ui/FilterChips.tsx` — multi-select pill buttons / segmented control
- [ ] `components/ui/EmptyState.tsx` — "nothing here" / "couldn't load" with icon
- [ ] `components/ui/BottomSheetModal.tsx` — modal sheet for detail views (model on `UpgradeSheet.tsx`)
- [ ] `components/ui/SmoothLineChart.tsx` — Catmull-Rom line chart for athlete score history + coach analytics (extract from existing `(tabs)/analytics.tsx`)

### 1.2 Utility Libraries
- [ ] `lib/recruitingLevels.ts` — Port from web `lib/recruitingLevels.js`:
  - `RECRUITING_LEVEL_BANDS` (the 6-tier band definitions)
  - `getRecruitingLevelBand(score: number)` (returns band object)
  - `STAR_RATING_MAP` (copied from web coach search: text → star count)
  - `starsForScore(score: number)` (returns star count 0-5)
  - `floorFromLevels(levels: string[]): number | null` (derives min_score from selected levels)

- [ ] `lib/subscription.ts` — Canonical premium check:
  ```ts
  export function isAthletePremium(athlete: Athlete): boolean {
    return athlete?.subscription_status === 'active' 
      || athlete?.is_admin 
      || athlete?.manual_access 
      || false;
  }
  ```
  (Web's Results page formula; NOT the 3 inconsistent implementations elsewhere)

- [ ] `lib/positionColors.ts` — Already exists? Verify colors for 12 positions (QB, RB, WR, TE, OL, DL, LB, CB, S, K, P, LS)

- [ ] `lib/states.ts` — All 50 US states + DC with codes + names (for Recruiting map)

- [ ] `constants/CoachSetupDefaults.ts`:
  - 17 title options (Director of Football Operations, etc.)
  - Division enum (NCAA D1, D1 FCS, D2, D3, NAIA, NJCAA)
  - Position array (same 12 as above)
  - Region enum by division (only for NJCAA)

### 1.3 Hook Extensions
- [ ] Extend `hooks/useAthleteData.ts` — add to `.select()`:
  - `recruiting_level` (string or object, same flexible handling as web)
  - Confirm returns full athlete object with all fields (v1_score, full_name, profile_photo_url, etc.)

- [ ] New `hooks/useCoachSearch.ts`:
  - Input: `{positions, gradYears, states, minScore, verifiedOnly, searchTerm, limit}`
  - Returns: `{prospects, totalCount, loading, error}`
  - Debounce 300ms on text input
  - Query: `athletes` where `(name ilike '%term%') AND (position in positions OR positions=[]) AND (graduation_year in years OR years=[]) AND (state in states OR states=[]) AND (v1_score >= minScore) AND (v1_score IS NOT NULL if verifiedOnly)`
  - Sort: score DESC, name ASC

- [ ] New `hooks/useCoachSaved.ts`:
  - Query: `coach_saved_prospects` joined to `athletes(...)`
  - Return: `{prospects, loading, error, sortBy, setSortBy}`
  - Support sort by `saved_at DESC` or `v1_score DESC`
  - CRUD: save, remove, update notes

- [ ] New `hooks/useCoachPipeline.ts`:
  - Query: `coach_recruit_pipeline` with status + athlete details
  - CRUD: create (auto-set created_at), update status (auto-set committed_at/signed_at), no delete
  - Enforce: no delete in this hook (RLS blocks it server-side)

- [ ] New `hooks/useCoachTemplates.ts`:
  - Query: `coach_message_templates` for logged-in coach
  - CRUD: create, update, delete
  - Schema: name, category, body

- [ ] New `hooks/useCoachBulkMessage.ts`:
  - Input: `{recipientAthleteIds[], templateId?, body, progressCallback}`
  - Logic: Loop recipient list, find-or-create conversation for each, send via `send_coach_message` RPC
  - Return: `{succeeded, failed, progress}`

- [ ] New `hooks/useCoachNotificationSettings.ts`:
  - Query: `coach_notification_settings` for logged-in coach
  - Auto-create if missing (self-heal)
  - CRUD: update toggles
  - Schema: email_matches, email_messages, push_matches, push_messages

- [ ] New `hooks/useCoachTargeting.ts`:
  - Query: `coach_targeting` for logged-in coach (states[])
  - CRUD: save selected states
  - Query prospects by state: `athletes WHERE state in selected_states AND v1_score >= coach.min_score`

- [ ] New `hooks/useCoachAnalytics.ts`:
  - Queries: counts of (swipes sent, mutual matches, messages sent, athletes saved)
  - Timeframe: week / month / all
  - **FIX N+1:** Batch load athletes instead of one query per swipe

- [ ] New `hooks/useAthleteScoreHistory.ts`:
  - Query: `athlete_score_history` for athlete
  - Append-only table (no write path on mobile)

---

## PHASE 2: ATHLETE SIDE (High-Impact Rebuild)

### 2.1 Dashboard (CRITICAL — Currently 110/1109 lines)
**File:** `app/(tabs)/index.tsx`

**Add these sections in order:**

1. **Phase Unlock Animation Banner** (lines 254-277 from web)
   - Fixed toast at top
   - Appears when athlete unlocks new phase
   - Auto-dismiss after 6.4s
   - Requires: `PHASES` constant, `getGameplanPhaseStates()` helper

2. **Gameplan Hero Card** (lines 346-401 from web) — **HIGHEST PRIORITY**
   - Background gradient (orange-to-red)
   - Title: "Your Gameplan"
   - Subtitle: "Where new athletes start..."
   - Progress bar + % + phase counter
   - 3-phase accordion with:
     - Phase node (circle with number or checkmark or lock)
     - Phase title + description
     - Status badge (Completed / In Progress / Locked / Up Next)
     - Connector line between phases
   - CTA button: "Continue: Next Step" or completion badge
   - Requires: `PHASES` array with phase metadata, `getGameplanPhaseStates()` for completion calc

3. **After-Completion KPI Cards** (lines 404-447 from web)
   - Grid layout, 3 cards + score card
   - Profile Views (with tier bar)
   - Programs Reviewed (with tier bar)
   - Programs Liked (with tier bar)
   - Requires: `/api/analytics` call or direct queries to `swipes` table

4. **V1 Score Animator Card** (line 408 from web)
   - Component: `ScoreAnimator` (animate from 0 to final score over 2s)
   - Display recruiting level below score
   - Requires: `ScoreAnimator.tsx` component (or port from web)

5. **Top Fit Programs Section** (lines 462-662 from web)
   - Spotlight best-fit program (large card + tier badge)
   - Carousel of remaining programs (marquee animation)
   - "View All" link to /dashboard/match
   - Requires: `getTopFitPrograms()` utility call

6. **Upgrade Banner** (lines 450-459 from web)
   - Show only if NOT premium (subscription_status !== 'active' && !is_admin && !manual_access)
   - Gradient background
   - CTA: "See Plans →" goes to /dashboard/upgrade

7. **Onboarding Tour** (lines 669-675 from web)
   - Reuse existing `OnboardingTour` component
   - Gate: `localStorage.getItem('v1portal_tour_seen')`
   - Show on first visit only

**Data Queries Needed:**
- Gameplan phase state: `swipes` table (count mutual matches), assessment completion
- KPI stats: `/api/analytics` endpoint (already on web)
- Top fit programs: `getTopFitPrograms()` utility (already exists on web, port to mobile)
- Mutual matches: `swipes` WHERE athlete_id = ? AND mutual_match = true
- Unread messages: `coach_athlete_messages` WHERE athlete_id = ? AND read = false

**Status Now:** Minimal. Needs 90% of web's 1,109-line component ported to RN + LinearGradient styling.

---

### 2.2 Results Screen (Athlete Score Breakdown)
**File:** `app/(tabs)/results.tsx`

**Current State:** Likely stub or missing V1 Score breakdown details.

**Add these components (ported from web `components/results/*`):**
- [ ] `ScoreBreakdownCard` — Pie chart or bar chart showing Production 45%, Physical 25%, Academics 15%, Intangibles 15%
- [ ] `PercentileCard` — "You're in the top X% of all athletes"
- [ ] `ScoreHistoryCard` — Line chart of athlete_score_history over time (uses shared `SmoothLineChart.tsx` from 1.1)
- [ ] `RecruitingGapCard` — "X more programs would match if you hit Y score"
- [ ] `RealityCheckCard` — Honest self-assessment vs. data
- [ ] `RetakeCard` — "Retake assessment to improve score" + upsell if needed
- [ ] `UpsellCard` — Premium features available at higher tier
- [ ] `CompleteBanner` — Confetti/celebration if assessment complete

**Data Queries:**
- Athlete assessment: `assessments` WHERE athlete_id = ? ORDER BY completed_at DESC LIMIT 1
- Score history: `athlete_score_history` WHERE athlete_id = ? ORDER BY created_at ASC
- Percentile: Call `get_score_percentile(athlete.v1_score)` RPC

**Premium Gate:**
- Use `lib/subscription.ts::isAthletePremium()` (NOT `useAthleteData().isPremium`)
- Full breakdown shown only to premium users
- Free users see teaser + upsell

**Survey Modal:**
- Gate: `AsyncStorage` (shown once, then every 7 days)
- Prompt: "How are we doing? Rate your experience"

**Status Now:** Unknown (verify current state). Likely needs 80%+ rebuild.

---

### 2.3 Outreach Screen (Content & Data Binding)
**File:** `app/(tabs)/outreach.tsx`

**Current State:** Placeholder "Videos, transcripts coming soon"

**Add:**
- [ ] Athlete's own video upload (if applicable)
- [ ] Link to Hudl profile (if hudl_link exists on athlete)
- [ ] Communication tips / templates (static content)
- [ ] Transcripts of coach messages (if available on coach_athlete_messages)
- [ ] Call-to-action: "Record a highlight video" or "Add your Hudl link"

**Data Queries:**
- Athlete hudl_link: `athletes.hudl_link`
- Message transcripts: `coach_athlete_messages` WHERE athlete_id = ? ORDER BY created_at DESC

**Status Now:** Stub. Needs UX design + content.

---

### 2.4 Messages Screen (Athlete Inbox)
**File:** `app/(tabs)/messages.tsx`

**Current State:** Placeholder "Coach communications and messages appear here"

**Add:**
- [ ] Inbox list: `coach_athlete_conversations` WHERE athlete_id = ? + joined athlete info
  - Sort by `last_message_at DESC`
  - Show coach name, program, last message snippet, unread badge
- [ ] Tap to thread: Route to `/messages/[conversationId]`
- [ ] Empty state: "No messages yet. Match with coaches to get started."

**Data Queries:**
- Conversations: `coach_athlete_conversations` + `coach_accounts` + `athletes` (coach details)
- Unread count: `coach_athlete_messages` WHERE conversation_id = ? AND athlete_id = ? AND read = false

**Status Now:** Stub. Needs inbox list + navigation.

---

### 2.5 Help Screen
**File:** `app/(tabs)/help.tsx`

**Current State:** Placeholder "Support resources coming soon"

**Add:**
- [ ] FAQ accordion (collapsed/expanded)
- [ ] Contact support button: `mailto:support@v1portal.com` or open support form
- [ ] Knowledge base links (recruiting timeline, V1 Score explained, etc.)
- [ ] Video tutorials (if available)

**Status Now:** Stub. Needs content + UX.

---

### 2.6 Settings Screen (Verify Data Binding)
**File:** `app/(tabs)/settings.tsx`

**Current State:** Built, structure exists

**Verify:**
- [ ] Password change screen (uses `supabase.auth.updateUser()`)
- [ ] Email visibility toggle (athlete.phone_public, athlete.email_public if columns exist)
- [ ] Account deletion route (links to `/delete-account` or shows confirmation)
- [ ] Sign out button (calls `supabase.auth.signOut()`)
- [ ] Profile photo display
- [ ] All input changes persist to `athletes` table

**Status Now:** Needs verification + missing fields check.

---

### 2.7 Notifications Settings (Already Built)
**File:** `app/(tabs)/settings/notifications.tsx`

**Status:** Built in last session. Verify toggles persist to DB.

---

### 2.8 Upgrade Screen (Verify Pricing Display)
**File:** `app/(tabs)/upgrade.tsx`

**Current State:** Built, basic structure

**Verify:**
- [ ] Pricing tiers display (Free / Plus — per current strategy)
- [ ] Feature comparison table
- [ ] CTA button routes to `/checkout` or RevenueCat purchase flow
- [ ] Correct pricing amounts (check memory or Foundation doc for current prices)

**Status Now:** Needs verification of current pricing + RevenueCat integration.

---

### 2.9 Profile Screen (Verify Data Display)
**File:** `app/(tabs)/profile.tsx`

**Current State:** Built, structure exists

**Verify:**
- [ ] Photo display (or initials fallback)
- [ ] Full name, position, state, graduation year
- [ ] Bio display
- [ ] V1 Score + recruiting level display
- [ ] Edit button links to `/edit-profile`

**Status Now:** Needs verification of all fields.

---

### 2.10 Calendar Screen (Verify Events Display)
**File:** `app/(tabs)/calendar.tsx`

**Current State:** Built, basic structure

**Verify:**
- [ ] Month grid hand-built (no date library dependency)
- [ ] Query `recruiting_calendar_events` WHERE athlete_id = ? OR athlete_id IS NULL (program-wide events)
- [ ] Tap date to see events
- [ ] Color-code by event type (game, visit, commitment deadline, etc.)

**Status Now:** Needs verification + event type colors.

---

### 2.11 Analytics Screen (Verify Data + Fix N+1)
**File:** `app/(tabs)/analytics.tsx`

**Current State:** Built, basic structure

**Verify & Fix:**
- [ ] KPI tiles: profile views, matches sent, messages sent
- [ ] Timeframe selector: week / month / all
- [ ] Source: `/api/analytics` endpoint (same as Dashboard)
- [ ] Line chart for trends (uses shared `SmoothLineChart.tsx`)
- [ ] Ensure no N+1 queries (batch load athletes if pulling match details)

**Status Now:** Needs verification + potential N+1 fix.

---

## PHASE 3: COACH SIDE (Core Workflow — Many Missing Features)

### 3.1 Search Screen (DOES NOT EXIST — CRITICAL BLOCKER)
**File:** `app/(coach)/search.tsx` — **CREATE NEW**

**Complexity:** 661 lines on web. This is THE core coach feature.

**Must Include:**

1. **Filter UI** (collapsible section or separate screen):
   - Positions: 12-button grid (QB, RB, WR, TE, OL, DL, LB, CB, S, K, P, LS)
   - Graduation Years: 5-chip select (2025–2029)
   - States: 50-state picker (tap to multi-select or scrollable list)
   - Min Score: Slider (0–100)
   - Verified Only: Toggle (v1_score IS NOT NULL)

2. **Search Bar**:
   - Debounced text input (300ms delay)
   - Clear button
   - Shows/hides as filters applied

3. **Prospect Grid**:
   - Card per prospect: photo | initials | name + stats + stars
   - Stats: position, state, graduation year, height/weight, V1 score
   - Stars: 0–5 stars (via `starsForScore()`)
   - Actions per card: Save | Message | Add to Pipeline (3-button row or menu)

4. **Multi-Select Mode**:
   - Checkbox per card
   - "Select All" button
   - Bulk actions: Save All | Message All | Add to Pipeline

5. **View Toggle**:
   - Grid (default) vs. List view
   - Persist selection to `AsyncStorage`

6. **Pagination**:
   - "Load More" button (raise limit by 24, not cursor-based)
   - Total count display

7. **Saved/Messaged Tracking**:
   - Badge if already saved
   - Badge if already messaged
   - Update UI when action completes

8. **Compliance Warning** (optional on search):
   - If coach's division in dead/quiet period, show banner
   - Don't block search, but warn before messaging

**Data Queries:**
- `useCoachSearch()` hook (built in Phase 1.3)
- `coach_saved_prospects` to check if saved
- `coach_athlete_conversations` to check if messaged

**Actions:**
- Save: INSERT into `coach_saved_prospects` (catch unique-violation as "already saved")
- Message: Find or create `coach_athlete_conversations`, route to thread
- Add to Pipeline: INSERT into `coach_recruit_pipeline` with status 'interested'

**Status Now:** Screen does not exist. **CRITICAL PRIORITY.**

---

### 3.2 Saved Prospects Screen (Data Binding + Notes Editor)
**File:** `app/(coach)/saved.tsx`

**Current State:** Built, basic structure

**Add/Verify:**

1. **Prospect List**:
   - Query via `useCoachSaved()` hook
   - Sort toggle: Recent vs. Score (descending)
   - Tap to detail sheet

2. **Detail Sheet** (Bottom Modal):
   - Reuse for Search / Saved / Pipeline
   - Show: photo, name, position, state, V1 score, stars, height/weight, bio
   - **Notes Editor** (NEW — this column exists on web, zero UI):
     - Text input bound to `coach_saved_prospects.notes`
     - Save on blur
   - Action buttons: Add to Pipeline | Message | Remove

3. **Remove Action**:
   - Delete row from `coach_saved_prospects`
   - Confirm dialog

4. **Empty State**:
   - "No saved prospects yet. Find athletes in Search."
   - Button: "Go to Search"

**Status Now:** Needs notes editor + detail sheet.

---

### 3.3 Recruit Detail Sheet (Shared Across Search/Saved/Pipeline)
**File:** `components/coach/RecruitDetailSheet.tsx` — **CREATE NEW**

**Reused By:** Search, Saved, Pipeline screens

**Props:**
- `athleteId: string`
- `onAction: (action: 'add-pipeline' | 'message' | 'remove-saved') => void`
- `isSaved: boolean`
- `isInPipeline: boolean`

**Display:**
- Photo (or initials)
- Name, position, state, grad year
- V1 Score + stars
- Height, weight
- Recruiting level / band
- Bio
- Hudl link (tap to open)
- GPA, SAT/ACT scores (if filled)

**Actions:**
- "Add to Pipeline" button (or hide if already in pipeline)
- "Message Coach" button (opens message composer or navigates to thread)
- "Remove from Saved" button (if viewing from Saved screen)
- "View Full Profile" link (if public profiles supported)

**Notes Editor:**
- Multi-line text input
- Placeholder: "Add internal notes"
- Shown only if viewing from Saved screen
- Bound to `coach_saved_prospects.notes`

**Status Now:** Does not exist. Create as reusable sheet component.

---

### 3.4 Profile (Read-Only) Screen (Verify Display)
**File:** `app/(coach)/profile/index.tsx`

**Current State:** Built, basic structure

**Verify:**
- [ ] Display all fields: title, division, region, position needs, level bands, years coaching, bio, phone, twitter, message_to_recruits, photo
- [ ] "Preview public profile" button → `/coach/profile/preview`
- [ ] "Edit" button → `/coach/profile/edit`

**Status Now:** Needs verification of all field display.

---

### 3.5 Profile Edit Screen (MAJOR BUILD — Form + Photo Upload + Logic)
**File:** `app/(coach)/profile/edit.tsx`

**Current State:** Stub

**Add:**

1. **Form Fields**:
   - Title: Dropdown (17 options: Director of Football Operations, Head Coach, etc.)
   - Division: Dropdown (NCAA D1, D1 FCS, D2, D3, NAIA, NJCAA)
   - Region: Dropdown (ONLY IF division === 'NJCAA', else hidden + null on save)
   - Position Needs: Multi-select chips (same 12 positions)
   - Level Bands: Multi-select chips (4-5 star, 3 star, 2 star, Unrated)
   - Min Score: Read-only field (computed from level bands via `floorFromLevels()`)
   - Phone: Text input
   - Phone Public: Toggle (privacy flag)
   - Years Coaching: Number input
   - Previous Stops: Text area
   - Bio: Text area
   - Message to Recruits: Text area
   - Photo: Photo picker + upload

2. **Photo Upload**:
   - Requires: `expo-image-picker` (NEW DEPENDENCY — add to package.json)
   - Tap button → `ImagePicker.launchImageLibraryAsync()`
   - Compress/optimize before upload
   - Upload to: `athletes` bucket, path `coach-photos/{user.id}-{timestamp}.png`
   - Save URL to `coach_accounts.photo_url`

3. **Form Logic**:
   - Load existing coach data via `useCoachData()`
   - Region: Automatically null if division ≠ 'NJCAA' (copy web's exact logic)
   - Min Score: Auto-compute when level_bands change via `floorFromLevels()`
   - Save: `supabase.from('coach_accounts').update({...}).eq('id', coachId)`
   - Success toast, then navigate back

4. **Validation**:
   - Required fields: title, division, position_needs (≥1), level_bands (≥1)
   - Phone format (optional but validate if filled)

5. **Empty State**:
   - If new coach, show onboarding message: "Complete your profile so athletes can find you."

**Dependencies:**
- `expo-image-picker` (must add to package.json)
- `lib/recruitingLevels.ts::floorFromLevels()`
- `constants/CoachSetupDefaults.ts` (titles, divisions, positions)

**Status Now:** Stub. Needs 300+ lines of form logic, photo upload, validation.

---

### 3.6 Coach Public Profile (Preview)
**File:** `app/(coach)/profile/preview.tsx`

**Current State:** Likely missing

**Add:**
- [ ] Display coach info as it appears to athletes
- [ ] Call `/api/coach-profile/[[...slug]]` endpoint (fetch, not RLS — service role)
- [ ] Read-only view
- [ ] "Back to Edit" button

**Verify:**
- [ ] Proper permissions check (only show if user owns this coach account)

**Status Now:** Missing or stub. Needs verification.

---

### 3.7 Setup / Onboarding (Guided Profile Creation)
**File:** `app/(coach)/setup.tsx`

**Current State:** Stub

**Add:**
- [ ] Step-by-step guide (same fields as Profile Edit, but guided)
- [ ] Progress indicator (Step 1/3, 2/3, 3/3)
- [ ] Back/Next buttons
- [ ] "Complete Setup" CTA at end
- [ ] Redirect to Dashboard after completion

**Steps:**
1. Basic info (title, division, region, years coaching)
2. Recruiting needs (positions, level bands, phone)
3. Additional info (bio, photo, message to recruits)

**Status Now:** Stub. Needs onboarding UX.

---

### 3.8 Messages (Inbox + Thread) — Verify Send Logic
**Files:** `app/(coach)/messages/index.tsx` + `[conversationId].tsx`

**Current State:** Built, needs verification

**Verify:**

1. **Inbox** (`messages/index.tsx`):
   - Query: `coach_athlete_conversations` WHERE coach_id = ? + joined athlete
   - Sort by `last_message_at DESC`
   - Show unread badge
   - Tap to thread

2. **Thread** (`messages/[conversationId].tsx`):
   - Query: `coach_athlete_messages` WHERE conversation_id = ? ORDER BY created_at ASC
   - Bubbles: coach message on right (blue), athlete reply on left (gray)
   - Input: text field + send button
   - Send Logic (CRITICAL):
     - Call `send_coach_message()` RPC (atomic: insert message + update conversation last_message_at/last_message_from)
     - If RPC doesn't exist (Phase 0 not done), fall back to: insert message, then update conversation (non-atomic, document this)
   - Mark read: On mount, zero all unread messages in this conversation
   - Compliance check: Before allowing send, check `/api/compliance/check` (if dead/quiet period, block or queue)

3. **Contact Info Regex Nudge**:
   - Port from web's match thread: if message contains `CONTACT_INFO_PATTERN`, show warning
   - Pattern: phone numbers, emails, social handles
   - Message: "Be careful sharing contact info. Keep conversations in V1Portal."
   - Allow send anyway (warning, not block)

**Status Now:** Built but send pattern unclear, compliance check missing, regex nudge missing.

---

### 3.9 Bulk Message Screen (Template System + Batch Send)
**File:** `app/(coach)/bulk-message.tsx`

**Current State:** Stub

**Add:**

1. **Recipient Picker**:
   - Multi-select from saved prospects + pipeline
   - "Select All" button
   - Shows count: "X athletes selected"

2. **Template Picker** (NEW):
   - Dropdown: "Choose a template..."
   - Or: "Write custom message"
   - If template selected, pre-fill body

3. **Message Composer**:
   - Text area for custom message (or template + optional edits)
   - Character count (optional)
   - Placeholder: "Write your message..."

4. **Compliance Pre-Check**:
   - Before send: call `/api/compliance/check` once
   - If coach in dead/quiet period: show confirmation dialog or queue for later
   - Don't block, but warn

5. **Contact Info Regex Nudge** (Backport from Match Thread):
   - If message contains phone/email/social, show warning
   - Allow send anyway

6. **Batch Send**:
   - Loop recipients
   - For each: find or create `coach_athlete_conversations`, send via `send_coach_message()` RPC
   - Show progress UI: "Sending to X of Y..."
   - On complete: show summary (X sent, Y failed)
   - Option: "View Conversations" button

**Dependencies:**
- `useCoachSaved()` (for saved prospects)
- `useCoachPipeline()` (for pipeline athletes)
- `useCoachTemplates()` (for template picker)
- `useCoachBulkMessage()` (for batch send logic)
- `send_coach_message()` RPC

**Status Now:** Stub. Needs recipient picker, template integration, batch progress UI.

---

### 3.10 Templates Screen (CRUD)
**File:** `app/(coach)/templates.tsx`

**Current State:** Stub

**Add:**

1. **Template List**:
   - Query via `useCoachTemplates()`
   - Show: name, category (chip), body preview
   - Tap to edit
   - Swipe/long-press to delete

2. **Create/Edit Modal**:
   - Name input
   - Category dropdown or multi-select
   - Body textarea
   - Save / Delete buttons
   - Auto-save on blur (optional)

3. **Empty State**:
   - "No templates yet. Create one to speed up messaging."
   - "Create Template" button

**Schema Verification** (Phase 0):
- [ ] `coach_message_templates` has columns: name, category (if missing, migrate in Phase 0)

**Status Now:** Stub. Needs full CRUD UI.

---

### 3.11 Pipeline Screen (Status Transitions + No Delete)
**File:** `app/(coach)/pipeline.tsx`

**Current State:** Stub

**Add:**

1. **Pipeline List**:
   - Query via `useCoachPipeline()`
   - Group or filter by status: Interested → Committed → Signed
   - Show: prospect name, position, state, stars, current status

2. **Status Transition** (Card tap → action menu):
   - Interested: Move to Committed (auto-stamp `committed_at`)
   - Committed: Move to Signed (auto-stamp `signed_at`) or back to Interested
   - Signed: Mark as signed (final state, read-only after)
   - NO delete option (RLS enforces this server-side, but don't offer in UI)

3. **Detail Sheet**:
   - Reuse `RecruitDetailSheet` from 3.3
   - Show current status + action button to transition

4. **Empty State**:
   - "No prospects in your pipeline yet. Find athletes in Search, then add to Pipeline."
   - Button: "Go to Search"

**Dependencies:**
- `useCoachPipeline()` hook
- `RecruitDetailSheet` component

**Status Now:** Stub. Needs status transitions + UI.

---

### 3.12 Recruiting (Geographic Targeting with SVG Map)
**File:** `app/(coach)/recruiting.tsx`

**Current State:** Stub

**Add:**

1. **Interactive US State Map** (SVG-based, per user's requirement):
   - 50 states + DC as tappable SVG paths
   - Tap state to toggle selection
   - Selected states: highlighted (different color/opacity)
   - Show count: "X states selected"
   - Save selection to `coach_targeting`

2. **State Selection Summary**:
   - List of selected states (chips or rows)
   - Tap chip to deselect

3. **Prospect Count by State**:
   - Below map, show: State | Count of Prospects | Matches
   - Query: `athletes WHERE state = 'XX' AND v1_score >= coach.min_score`
   - Show matches: `swipes WHERE athlete_id IN (...) AND coach_id = ? AND mutual_match = true`

4. **Top Prospects by Division**:
   - Grid or list: FBS | FCS | D2 | D3
   - Top 3 prospects per division (sorted by score)
   - Tap to detail sheet

**Dependencies:**
- `useCoachTargeting()` hook
- SVG state map component (new, no react-native-maps dependency)
- `lib/states.ts` (50 states + coords)

**Styling:**
- Light mode: states gray, selected states blue
- Dark mode: states light gray, selected states brand color
- Touch feedback (opacity change)

**Status Now:** Stub. Needs SVG map + state selection logic.

---

### 3.13 Calendar Screen (Hand-Built Month Grid + Event CRUD)
**File:** `app/(coach)/calendar.tsx`

**Current State:** Stub

**Add:**

1. **Month Grid** (hand-built, no date library):
   - Display current month (or month picker)
   - 7-day week rows
   - Days show events count (badge)
   - Tap date to see/add events

2. **Event List Modal**:
   - Show events for selected date
   - Event details: title, type, description
   - Type: Game | Visit | Commitment Deadline | Other
   - Color-code by type

3. **Create/Edit Event Modal**:
   - Title input
   - Type dropdown
   - Date picker (pre-filled if tapped from grid)
   - Athlete Picker (multi-select OR leave empty for program-wide event)
     - Show saved/pipeline athletes
     - Or "Program-wide event" option (athlete_id = NULL, requires Phase 0 migration)
   - Description textarea
   - Save / Delete buttons

4. **Recurring Events** (optional):
   - Toggle: "Repeat"
   - Repeat: Once / Weekly / Monthly
   - Repeat until date (optional)

5. **Compliance Gating** (optional):
   - If event is recruiting deadline during dead period, show warning

**Data Queries:**
- `recruiting_calendar_events` WHERE coach_id = ? AND (athlete_id = coach.created_by OR athlete_id IS NULL)
- Phase 0 ensures `athlete_id` is nullable

**Status Now:** Stub. Needs month grid, event CRUD, athlete picker.

---

### 3.14 Analytics Screen (Fix N+1 + Verify Charts)
**File:** `app/(coach)/analytics.tsx`

**Current State:** Stub

**Verify & Fix:**

1. **KPI Tiles**:
   - Prospects searched (count of unique coach_search_logs or just cache count)
   - Matches sent (count of `swipes` WHERE coach_id = ?)
   - Messages sent (count of `coach_athlete_messages` WHERE coach_id = ?)
   - Athletes saved (count of `coach_saved_prospects` WHERE coach_id = ?)

2. **Funnel Chart**:
   - Prospects Searched → Saved → Matched → Messaged
   - Show as waterfall or horizontal bar chart

3. **Top Positions**:
   - Bar chart: position | count of athletes searched
   - Query: Count distinct athlete positions in searches

4. **Top States**:
   - Bar chart: state | count of athletes searched
   - Query: Count distinct athlete states in searches

5. **Timeframe Selector**:
   - Week / Month / All
   - Filter all queries by date range

6. **Chart Library**:
   - Use shared `SmoothLineChart.tsx` for line trends
   - For bar charts: render custom via SVG or `react-native-svg` (already a dependency)

7. **N+1 Fix**:
   - DO NOT: query 1 athlete per match row
   - DO: batch load athletes by id via `athletes.select(...).in('id', ids)`

**Status Now:** Stub. Needs KPI queries, funnel math, N+1 fix.

---

### 3.15 Compliance Screen (Verify API Call + Copy to Match Thread)
**File:** `app/(coach)/compliance.tsx`

**Current State:** Stub or built

**Verify:**
- [ ] Call `/api/compliance/check` on mount
- [ ] If coach in dead/quiet period: show red banner "Recruiting quiet period through [date]"
- [ ] Show allowed contact methods (if applicable)
- [ ] Show NCAA calendar link
- [ ] "View Full Calendar" button

**Backport to Match Thread:**
- [ ] `app/(coach)/match/[matchId].tsx` must also check compliance before showing message send
- [ ] Same warning banner + block if needed

**Status Now:** Needs verification of API call + match thread backport.

---

### 3.16 Settings Screen (Links Hub)
**File:** `app/(coach)/settings.tsx`

**Current State:** Stub

**Add:**
- [ ] Link: "Edit Profile" → `/coach/profile/edit`
- [ ] Link: "Notification Settings" → `/coach/notifications-settings`
- [ ] Link: "Compliance" → `/coach/compliance`
- [ ] Button: "Sign Out" → `supabase.auth.signOut()` + navigate to `/login`

**Status Now:** Stub. Simple links + signout.

---

### 3.17 Notifications Settings (Verify Self-Heal + Schema)
**File:** `app/(coach)/notifications-settings.tsx`

**Current State:** Stub

**Add:**

1. **Toggles** (via `useCoachNotificationSettings()`):
   - Email Matches
   - Email Messages
   - Push Matches
   - Push Messages

2. **Self-Heal**:
   - On mount: if no row in `coach_notification_settings`, insert default row (all true)
   - Requires: INSERT policy in RLS (Phase 0 verifies this)

3. **Persist**:
   - On toggle change, UPDATE `coach_notification_settings`

**Schema Verification** (Phase 0):
- [ ] `coach_notification_settings` exists with INSERT policy

**Status Now:** Stub. Needs toggle UI + self-heal.

---

### 3.18 Help Screen
**File:** `app/(coach)/help.tsx`

**Current State:** Stub

**Add:**
- [ ] FAQ for coaches (how to search, message, use pipeline, etc.)
- [ ] Contact support button
- [ ] Video tutorials (if available)
- [ ] Link to compliance resources

**Status Now:** Stub. Needs content.

---

## PHASE 4: NAVIGATION & DRAWER WIRING

### 4.1 Athlete Drawer
**File:** `components/AppDrawer.tsx`

**Verify:**
- [ ] All 14 tabs routed (dashboard, results, gameplan, match, tracker, targeting, outreach, messages, calendar, analytics, help, settings, settings/notifications, upgrade)
- [ ] Correct icons
- [ ] No stubs hidden from drawer (all should be visible)

---

### 4.2 Coach Drawer
**File:** `components/CoachDrawer.tsx`

**Add Grouping** (replace flat NAV_ITEMS):
```
- Overview
  - Dashboard
- Find Talent
  - Search (new)
  - Saved
  - Matches
- Pipeline
  - Pipeline
  - Recruiting
- Outreach
  - Messages
  - Bulk Message
  - Templates
  - Calendar
- Insights
  - Analytics
- Account
  - Profile
  - Settings
  - Notifications Settings
  - Compliance
  - Help
```

**Verify:**
- [ ] All 17 screens routed
- [ ] Icons for each section

---

### 4.3 Layout Registration
**File:** `app/(coach)/_layout.tsx`

**Add/Verify:**
- [ ] `<Drawer.Screen>` for each coach route (messages, profile, recruits, public)
- [ ] Sub-layouts for multi-screen flows:
  - `messages/_layout.tsx` (Stack, headerShown: false)
  - `profile/_layout.tsx` (Stack, headerShown: false)

---

## PHASE 5: DEPENDENCY & VERSION UPDATES

### 5.1 Package Additions
- [ ] `expo-image-picker` (for coach profile photo upload)
  - Add to `package.json`: `"expo-image-picker": "^15.0.0"`
  - Import: `import * as ImagePicker from 'expo-image-picker';`

### 5.2 Version Bump (After All Changes)
- [ ] `app.json`: `expo.version`: `3.4.5` → `3.4.6` (or next patch)
- [ ] `app.json`: iOS `buildNumber`: `35` → `36` (or next)

---

## PHASE 6: TESTING & VERIFICATION

### 6.1 Golden Path Testing (Per Screen)
For each of 30+ screens:
- [ ] Load screen, verify data displays
- [ ] Execute primary action (search, save, send, edit, etc.)
- [ ] Verify DB row created/updated via `execute_sql`

### 6.2 Edge Cases
- [ ] Empty states: fresh coach, zero saved, zero pipeline, zero messages
- [ ] Gating: unverified coach in search, free vs. premium athlete in Results
- [ ] Compliance: coach in dead period, try bulk message
- [ ] Offline: airplane mode on search, messages, profile edit
- [ ] Photo upload: test with large file, test error handling

### 6.3 Navigation Pass
- [ ] Every drawer link navigates correctly
- [ ] Back button returns to drawer
- [ ] Deep links work (if any exist)

### 6.4 UI/UX Pass
- [ ] All text readable (font sizes, contrast)
- [ ] All buttons/inputs tappable (min 44dp)
- [ ] No layout shifts or overflow
- [ ] Keyboard doesn't hide inputs (on forms)

### 6.5 Compliance Spot-Check
- [ ] Message send blocked if coach in quiet period
- [ ] Contact info regex warning shows
- [ ] NCAA calendar accurate

---

## SUMMARY OF ALL GAPS

| Area | Count | Items |
|------|-------|-------|
| **Athlete Screens** | 11 | Dashboard (gameplan hero), Results (breakdown), Outreach (data), Messages (data), Help (content), Analytics (verify), Profile (verify), Settings (verify), Calendar (verify), Upgrade (verify), Notifications (verify) |
| **Coach Screens** | 17 | Search (CREATE), Saved (notes editor), Recruits (detail sheet), Profile Edit (form + photo), Setup (onboarding), Messages (verify send), Bulk Message (template + batch), Templates (CRUD), Pipeline (transitions), Recruiting (SVG map), Calendar (CRUD), Analytics (N+1 fix), Compliance (verify), Settings (links), Notifications (verify), Help (content), Public Profile (verify) |
| **Shared Components** | 9 | Card, Avatar, Badge, ListRow, SearchBar, FilterChips, EmptyState, BottomSheetModal, SmoothLineChart |
| **Utility Libraries** | 6 | recruitingLevels, subscription, positionColors, states, CoachSetupDefaults, scores history |
| **Hooks** | 11 | useCoachSearch, useCoachSaved, useCoachPipeline, useCoachTemplates, useCoachBulkMessage, useCoachNotificationSettings, useCoachTargeting, useCoachAnalytics, useAthleteScoreHistory, extend useCoachData/useAthleteData |
| **Database** | 4 | Schema verification (templates columns), nullable athlete_id, notification INSERT policy, send_coach_message RPC |
| **Navigation** | 2 | Athlete drawer (verify), Coach drawer (add grouping) |
| **Dependencies** | 1 | expo-image-picker |

**Total Gaps:** ~60+ items across screens, components, hooks, and DB.

---

## EXECUTION STRATEGY

1. **Start Phase 0** (DB verification) — blocks everything
2. **Build Phase 1** (components + hooks) — foundation for all screens
3. **Phase 2 & 3 in parallel** (athlete dashboard + coach search are both high-impact; can assign to 2 devs)
4. **Phase 4** (navigation) — quick, does after main screens
5. **Phase 5** (dependencies) — add expo-image-picker before profile/edit
6. **Phase 6** (testing) — final verification before build

**Critical Path (must do first):**
- Phase 0: DB schema + RPC
- Phase 1.1 & 1.3: Core components + hooks
- Phase 2.1: Athlete dashboard (gameplan hero)
- Phase 3.1: Coach search (CREATE screen)
- Phase 3.5: Coach profile/edit (form + photo)

Everything else flows from these 5 items.

