import { initializeApp } from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const app = initializeApp();
export const db = getFirestore(app);
