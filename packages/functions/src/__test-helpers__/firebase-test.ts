// Test helper for Firebase Admin SDK
// Uses CommonJS require to avoid ESM/CJS interop issues in Bun
const admin = require("firebase-admin");

// Initialize before ANY imports of game-service
export function initTestFirebaseEarly() {
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  process.env.FIREBASE_PROJECT_ID = "test-project";
}

export function getFirebaseForTest() {
  initTestFirebaseEarly();
  const app = admin.app();
  const db = admin.firestore(app);
  return { app, db, admin };
}
