# Expense Tracker

## Setup
1. Firebase console: create project, enable **Firestore** (production mode) and **Hosting**. No Auth needed.
2. Project settings > Your apps > Web app: copy the config into `.env` (see `.env.example`).
3. `npm install`
4. `npm run dev`

## Deploy
```
npm i -g firebase-tools
firebase login
firebase use --add        # pick your project
firebase deploy --only firestore:rules,firestore:indexes
npm run build
firebase deploy --only hosting
```

## Reset a forgotten PIN
Delete the user doc in Firestore console (users/{username}) and re-register
(note: this keeps their sub-collections, so re-registering the same username restores access to data).
