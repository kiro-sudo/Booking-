# Irrawaddy Horizon Boat Trips — Setup & Deployment Guide

## 1. Environment Variables Setup

Configure the following environment variables in **Settings -> Secrets** (or `.env.local` for local development):

```bash
# Required for Admin Login (/admin)
ADMIN_USERNAME="your-admin-username"
ADMIN_PASSWORD="your-strong-admin-password"

# Optional: Custom HMAC session signing key (auto-generated in memory if omitted)
ADMIN_SESSION_SECRET="32-plus-char-random-secret"

# Standard runtime variables
APP_URL="https://your-deployed-url.run.app"
```

> **Preview First-Run Setup**: If `ADMIN_USERNAME` and `ADMIN_PASSWORD` are not yet set, visiting `/admin` presents a one-time setup form to create your initial Admin username and password (hashed with `scrypt`). Configuring `ADMIN_USERNAME` and `ADMIN_PASSWORD` in environment secrets always overrides the fallback credential.

## 2. Database & Security Rules (Firebase Firestore)

1. `firebase-applet-config.json` links the application to the provisioned Firestore database (`firestoreDatabaseId` must always be passed to `getFirestore(app, firebaseConfig.firestoreDatabaseId)`).
2. Security rules are defined in `firestore.rules` and schema contracts in `firebase-blueprint.json`.
3. Validate rules before deploying:
   ```bash
   npx eslint --max-warnings 0 firestore.rules
   ```
4. To authorize a different Google account as an Admin in `firestore.rules`, update `isAdmin()` or add the operator's Firebase Auth UID to the `/admins/{uid}` collection.

## 3. Build & Production Deployment

```bash
npm install
npm run lint
npm run build
npm run start
```

## 4. Database Backups

- **Manual Snapshot Export**: Authenticated admins can download complete JSON backups or CSV spreadsheets directly from `/admin`.
- **Automated Cloud Backups**: In Google Cloud / Firebase Console, enable scheduled Firestore exports (`gcloud firestore backups schedules create`) to a Cloud Storage bucket for daily automated disaster recovery.
