# Firebase Setup Guide

This guide connects LazyTopper to Firebase so student progress, subscriptions, and
mistake history are saved to the cloud and survive device switches or cleared storage.

---

## Required Replit Secrets

Add all of the following in Replit → Secrets:

| Secret name | Where to get it |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project settings → Your apps → Web app → SDK Config |
| `VITE_FIREBASE_AUTH_DOMAIN` | same |
| `VITE_FIREBASE_PROJECT_ID` | same |
| `VITE_FIREBASE_APP_ID` | same |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | same |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Project settings → Service accounts → Generate new private key → copy entire JSON |

After adding secrets, restart both:
- **LazyTopper Gateway** workflow
- **artifacts/lazytopper-app: web** workflow

---

## Firebase Console setup checklist

1. **Create project** at [console.firebase.google.com](https://console.firebase.google.com)
2. **Enable Firestore Database** → Build → Firestore → Create database → Production mode → Region: `asia-south1 (Mumbai)`
3. **Enable Authentication** → Build → Authentication → Get started (no specific sign-in method needed — custom tokens work automatically)
4. **Register Web App** → Project Overview → Web icon (`</>`) → copy the SDK config
5. **Generate Service Account key** → Project settings → Service accounts → Generate new private key

---

## Deploy Firestore security rules and indexes

Once you have the Firebase CLI installed:

```bash
npm install -g firebase-tools
firebase login
firebase use --add                # select your project (or: firebase use lazzyy-topper)
firebase deploy --only firestore
```

> **Note on `.firebaserc`**: The repo includes `.firebaserc` pre-set to `lazzyy-topper`. If you are deploying to a different Firebase project (e.g. a staging project), run `firebase use --add` to add it and switch to it before deploying, or edit `.firebaserc` accordingly.

This deploys both `firestore.rules` and `firestore.indexes.json` from the repo root.

---

## Firestore collections used by LazyTopper

| Collection | Contents |
|---|---|
| `learnerProfiles/{uid}` | Student profile (grade, hours/day, target %) |
| `learnerProfiles/{uid}/mistakeLogs` | Per-check mistake entries (28-day window) |
| `learnerProfiles/{uid}/sessions` | AI tutor session messages |
| `dashboardPrefs/{uid}` | Dashboard widget preferences, exam date override |
| `learnerProgress/{uid}` | Chapter stats, practice attempts, topic mastery, streak, badges |
| `subscriptions/{uid}` | Trial / premium subscription status |
| `practiceInsights/{uid}` | Practice attempt analytics |
| `weakAreaSummary/{uid}` | Computed weak area list |
| `topicMastery/{uid}` | Topic mastery percentages |
| `srSchedules/{uid}` | Spaced repetition schedule (FSRS algorithm) |
| `mockScoreHistory/{uid}` | Mock exam scores |
| `learningPaths/{uid}` | AI-generated personalised learning path |

All documents are keyed by the user's Firebase UID. Security rules enforce that only
the authenticated user can read or write their own documents.

---

## Authentication flow

1. Student signs in directly with Firebase Auth (Google / Email+Password; Phone/SMS-OTP)
2. Firebase Auth holds the student's identity (`onAuthStateChanged` in `AuthContext`)
3. The frontend gets a Firebase ID token via `currentUser.getIdToken()` for backend calls
4. The api-server edge verifies that ID token with `requireFirebaseAuth` (`verifyIdToken`)
5. All Firestore read/write calls succeed under the `isOwner(uid)` security rules

(There is no longer a Clerk-to-Firebase token bridge — that was removed in the auth
migration. Admin routes authorize via `ADMIN_FIREBASE_UIDS`.)

The gateway startup log confirms Admin SDK status:
```
Firebase Admin initialized (projectId=lazzyy-topper, credentials=explicit)
```

If you see "Firebase Admin not initialized" instead, the secrets are not set correctly.
