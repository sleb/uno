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

export async function assertEmulatorAvailable(
  db: FirebaseFirestore.Firestore,
  timeoutMs = 2000,
): Promise<void> {
  const timeout = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      clearTimeout(timer);
      reject(
        new Error(
          "Firestore emulator is not responding. Start it with `firebase emulators:start`.",
        ),
      );
    }, timeoutMs);
  });

  await Promise.race([db.listCollections(), timeout]);
}

export async function cleanupTestData(
  db: FirebaseFirestore.Firestore,
): Promise<void> {
  await db.recursiveDelete(db.collection("games"));
  await db.recursiveDelete(db.collection("users"));
}
