# V1Portal — App Store & Google Play Submission Checklist

Complete every step in order before submitting for the first time.

---

## 1. Accounts & Identifiers

- [ ] Apple Developer account active ($99/yr) — developer.apple.com
- [ ] Google Play Developer account active ($25 one-time) — play.google.com/console
- [ ] Apple Team ID noted (found in Membership tab of developer.apple.com)
- [ ] Apple ID email confirmed (the one used to sign in to App Store Connect)
- [ ] App Store Connect app record created — App ID: `com.varsityone.v1portal`
- [ ] ASC App ID noted (numeric ID from App Store Connect URL)
- [ ] Google Play app created — package: `com.varsityone.v1portal`
- [ ] Google service account JSON created and path set in `eas.json` → `submit.production.android.serviceAccountKeyPath`

---

## 2. EAS Setup

- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Log in: `eas login`
- [ ] Initialize project: `eas init` (populates `extra.eas.projectId` in `app.json`)
- [ ] Verify `app.json` → `extra.eas.projectId` is set (not empty string)
- [ ] Set production env vars in EAS dashboard or fill in `eas.json` → `build.production.env`

---

## 3. Production Assets (replace placeholders in assets/images/)

- [ ] **App icon** — `assets/images/icon.png` — 1024×1024 px, no transparency, no rounded corners (Apple adds them), PNG
- [ ] **Splash screen** — `assets/images/splash.png` — 1284×2778 px, dark background (#0A0A0A), centered V1Portal wordmark
- [ ] **Android adaptive icon** — `assets/images/adaptive-icon.png` — 1024×1024 px foreground (safe zone: center 66%), transparent background
- [ ] **Android background** — `assets/android-icon-background.png` — solid #0A0A0A, 1024×1024 px
- [ ] **Android monochrome** — `assets/android-icon-monochrome.png` — single-color version for Android 13+ themed icons
- [ ] **Favicon** — `assets/favicon.png` — 196×196 px for web

---

## 4. App Store Connect — iOS

- [ ] App name set: "V1Portal"
- [ ] Subtitle (30 chars max): e.g. "College Football Recruiting"
- [ ] Privacy policy URL set: `https://v1portal.com/privacy`
- [ ] Support URL set: `https://v1portal.com/support` (or `support@v1portal.com`)
- [ ] Category: Sports (primary), Education (secondary)
- [ ] Age rating questionnaire completed (no mature content → 4+)
- [ ] App description written (4000 chars max) — explain V1 Score, phases, outreach
- [ ] Promotional text written (170 chars max, can be updated without new build)
- [ ] Keywords entered (100 chars total, comma-separated) — e.g. "football,recruiting,college,athlete,v1 score,coach"
- [ ] Screenshots uploaded for all required device sizes:
  - [ ] iPhone 6.9" (iPhone 16 Pro Max) — 1320×2868 or 1290×2796 px, minimum 3 required
  - [ ] iPhone 6.5" (iPhone 14 Plus / 15 Plus) — 1284×2778 px
  - [ ] iPad 12.9" (if supportsTablet is ever enabled)
- [ ] In-app purchases / subscriptions registered (Pro $97/mo, Elite $197/mo) if using Apple IAP
- [ ] Export compliance: does the app use encryption? (HTTPS = yes) — mark "Standard encryption, exempt from EAR"
- [ ] Content rights: confirm you own or have rights to all content
- [ ] IDFA: does the app use advertising identifier? (No → mark accordingly)

---

## 5. Google Play Console — Android

- [ ] App name: "V1Portal"
- [ ] Short description (80 chars): "College football recruiting platform powered by your V1 Score"
- [ ] Full description (4000 chars)
- [ ] Privacy policy URL: `https://v1portal.com/privacy`
- [ ] Category: Sports
- [ ] Content rating questionnaire completed (ESRB → Everyone)
- [ ] Target audience: 13+ (athletes in high school / college)
- [ ] Data safety form completed:
  - [ ] Collected: name, email, location, performance data (V1 Score)
  - [ ] Shared: none sold to third parties
  - [ ] Security practices: data encrypted in transit (Supabase/HTTPS)
- [ ] Graphics uploaded:
  - [ ] Feature graphic — 1024×500 px (required for Play Store listing)
  - [ ] Phone screenshots — minimum 2, max 8 (16:9 or 9:16)
  - [ ] Tablet screenshots — optional but recommended
- [ ] App signing: opt in to Play App Signing (recommended)
- [ ] Release track: start with Internal → Closed testing → Production

---

## 6. Stripe / Payments

- [ ] Stripe account live mode enabled
- [ ] Pro plan product created in Stripe ($97/mo recurring)
- [ ] Elite plan product created in Stripe ($197/mo recurring)
- [ ] Checkout URLs tested end-to-end:
  - `https://v1portal.com/api/checkout?plan=pro`
  - `https://v1portal.com/api/checkout?plan=elite`
- [ ] Webhook configured to update `subscriptions` table in Supabase on payment events
- [ ] **Apple review note**: Apple requires IAP for digital subscriptions on iOS. Stripe web checkout is allowed only if the product is also purchasable outside the app. Consider adding RevenueCat + StoreKit IAP before iOS submission, or document the web-only purchase flow for review.

---

## 7. Supabase / Backend

- [ ] Production Supabase project URL set in EAS env vars (not dev project)
- [ ] Production anon key set in EAS env vars
- [ ] Row-Level Security (RLS) enabled and policies tested on all tables:
  - `athletes`, `assessments`, `program_matches`, `coach_outreach`, `recruiting_tasks`, `subscriptions`
- [ ] `expo_push_token` column exists on `athletes` table (text, nullable)
- [ ] `email_notifications` column exists on `athletes` table (boolean, default false)
- [ ] Edge functions deployed (if any)
- [ ] Database backups enabled

---

## 8. Push Notifications

- [ ] EAS project ID set in `app.json` → `extra.eas.projectId` (required for Expo push tokens)
- [ ] APNs key or certificate uploaded to Expo dashboard (for iOS push)
- [ ] FCM server key configured in Expo dashboard (for Android push)
- [ ] Test push notification sent to a physical device and received correctly

---

## 9. Deep Links

- [ ] URL scheme `v1portal://` tested — auth callback redirects work after email confirmation
- [ ] Associated Domains entitlement added in Apple Developer portal if using universal links
- [ ] Android App Links configured in Google Play Console if needed

---

## 10. Build & Submit

- [ ] Run production build:
  ```
  eas build --platform ios --profile production
  eas build --platform android --profile production
  ```
- [ ] Download and manually test the iOS `.ipa` on a real device (via TestFlight)
- [ ] Download and manually test the Android `.aab` / `.apk` on a real device
- [ ] TestFlight internal testing completed (at least 1 build cycle)
- [ ] TestFlight external testing completed (optional but recommended)
- [ ] Submit to App Store:
  ```
  eas submit --platform ios --profile production
  ```
- [ ] Submit to Google Play:
  ```
  eas submit --platform android --profile production
  ```
- [ ] App Store review submitted (typical review time: 24–48 hours)
- [ ] Google Play review submitted (typical review time: 1–7 days for first submission)

---

## 11. Post-Launch

- [ ] Monitor crash reports in Expo dashboard / Sentry
- [ ] Verify push tokens are being saved to Supabase from live devices
- [ ] Verify Stripe webhooks firing correctly in live mode
- [ ] Respond to App Store / Google Play review feedback within 24 hours if rejected
- [ ] Plan first OTA update via `eas update` for non-native hotfixes
