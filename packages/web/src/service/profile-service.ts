import { db } from "@/firebase";
import { UserSchema, type User, type UserData } from "@uno/shared";
import {
  doc,
  onSnapshot,
  QueryDocumentSnapshot,
  setDoc,
  type Firestore,
  type FirestoreDataConverter,
} from "firebase/firestore";

class ProfileService {
  constructor(private db: Firestore) {}

  createProfile = async (uid: string, userData: UserData) => {
    const userDoc = this.ref(uid);
    await setDoc(userDoc, userData);
  };

  updateProfile = async (uid: string, userData: Partial<UserData>) => {
    const userDoc = this.ref(uid);
    await setDoc(userDoc, userData, { merge: true });
  };

  onProfileChange = (
    uid: string,
    callback: (data: User | null) => void,
  ): (() => void) => {
    const userDoc = this.ref(uid);
    return onSnapshot(userDoc, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      } else {
        callback(null);
      }
    });
  };

  private ref = (uid: string) =>
    doc(this.db, "users", uid).withConverter(profileConverter);
}

export const profileService = new ProfileService(db);

const profileConverter: FirestoreDataConverter<User, UserData> = {
  toFirestore: (user: User): UserData => {
    return user;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot<UserData>): User => {
    return UserSchema.parse({ id: snapshot.id, ...snapshot.data() });
  },
};
