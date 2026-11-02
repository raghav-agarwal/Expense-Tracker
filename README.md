# Expense Tracker

React + Vite + TypeScript + Tailwind PWA on Firebase (Firestore + Hosting). No Firebase Auth:
username + 6-digit PIN (PBKDF2-hashed in the browser), 30-day cached login.

## 1. Firebase setup (once)
1. https://console.firebase.google.com > Add project.
2. Build > **Firestore Database** > Create database (production mode, pick a region near you, e.g. asia-south1).
3. Build > **Hosting** > Get started.
4. Project settings > General > Your apps > add a **Web app**. Copy the config values.

## 2. Local setup
```
npm install
cp .env.example .env      # paste the config values
# edit .firebaserc and put your project id
npm run dev
```

## 3. Deploy
```
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes
npm run build
firebase deploy --only hosting
```
The first indexes build takes a few minutes; Home shows an error until it is ready.
Open the hosting URL on your phone and use "Add to Home Screen" to install the PWA.

## 4. Recommended hardening
- Google Cloud console > APIs & Services > Credentials > restrict the browser API key to your hosting domain(s) (HTTP referrers).
- Keep the hosting URL private (rules cannot identify callers, see below).
- Set a budget alert in Google Cloud Billing.
- Optional: enable Firebase App Check.

## Security model (read this)
There is no Firebase Auth, so Firestore rules cannot tell who is calling. Rules only
block listing all users, keep user docs immutable, and validate document shapes.
Anyone who knows your Firebase config and a username could read/write that user's data
directly through the API. The PIN check happens in the app. Fine for a private personal
tracker; if you ever share the app, add Firebase Auth (data model is unchanged).

## Forgot PIN
Firestore console > users/{username}: delete the user doc, then register the same
username again. Wallets/transactions are stored under that username and become accessible again.

## Money
Stored as integer paise, shown as INR (en-IN). Negative balances are allowed.
Transfers create two linked entries (`{id}_out`, `{id}_in`) atomically and are excluded from reports.

## Optional CI
`.github/workflows/deploy.yml` deploys hosting on push to main (needs repo secrets, see file).
