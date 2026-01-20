import { db } from "@/firebase";
import { UserSchema, type User, type UserData } from "@uno/shared";
import {
  doc,
  onSnapshot,
  QueryDocumentSnapshot,
  setDoc,
  type FirestoreDataConverter,
} from "firebase/firestore";

const profileConverter: FirestoreDataConverter<User, UserData> = {
  toFirestore: (user: User): UserData => user,
  fromFirestore: (snapshot: QueryDocumentSnapshot<UserData>): User =>
    UserSchema.parse({ id: snapshot.id, ...snapshot.data() }),
};

const userRef = (uid: string) =>
  doc(db, "users", uid).withConverter(profileConverter);

export const createProfile = async (uid: string, userData: UserData) => {
  const userDoc = userRef(uid);
  await setDoc(userDoc, userData);
};

export const updateProfile = async (
  uid: string,
  userData: Partial<UserData>,
) => {
  const userDoc = userRef(uid);
  await setDoc(userDoc, userData, { merge: true });
};

export const onProfileChange = (
  uid: string,
  callback: (data: User | null) => void,
): (() => void) => {
  const userDoc = userRef(uid);
  return onSnapshot(userDoc, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    } else {
      callback(null);
    }
  });
};
