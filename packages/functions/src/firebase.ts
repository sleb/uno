// Use CommonJS require for compatibility with Bun test runner
// This works because the build marks firebase-admin as external
const admin = require("firebase-admin") as typeof import("firebase-admin");

// Only initialize if not already initialized
let app: import("firebase-admin").app.App;
try {
  app = admin.app(); // Get default app if it exists
} catch (_e) {
  // Initialize with project ID if provided (for tests)
  const projectId =
    process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
  app = admin.initializeApp(projectId ? { projectId } : undefined);
}

// Export db directly
export const db = admin.firestore(app);
