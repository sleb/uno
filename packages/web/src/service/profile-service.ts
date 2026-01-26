import { type User, type UserData, UserSchema } from "@uno/shared";
import {
    doc,
    type FirestoreDataConverter,
    onSnapshot,
    type QueryDocumentSnapshot,
    setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

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
  errCallback: (error: Error) => void,
): (() => void) => {
  const userDoc = userRef(uid);
  return onSnapshot(
    userDoc,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      } else {
        callback(null);
      }
    },
    errCallback,
  );
};
