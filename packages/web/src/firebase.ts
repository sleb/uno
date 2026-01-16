import { connect } from "bun";
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const app = initializeApp({
  apiKey: process.env.UNO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.UNO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.UNO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.UNO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.UNO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.UNO_PUBLIC_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
export const db = getFirestore(app);

if (process.env.NODE_ENV !== "production") {
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFirestoreEmulator(db, "localhost", 8080);
}
