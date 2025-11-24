import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { UserProfile, UpdateUserData } from '../types/user';
import { UserRole } from '../types/user';

const USERS_COLLECTION = 'users';

export const createUserProfile = async (
  uid: string,
  email: string,
  displayName?: string,
  roles: UserRole[] = []
): Promise<void> => {
  const userProfile: UserProfile = {
    uid,
    email,
    displayName,
    roles,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await setDoc(doc(db, USERS_COLLECTION, uid), {
    ...userProfile,
    createdAt: Timestamp.fromDate(userProfile.createdAt),
    updatedAt: Timestamp.fromDate(userProfile.updatedAt),
  });
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const docRef = doc(db, USERS_COLLECTION, uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    uid: docSnap.id,
    email: data.email,
    displayName: data.displayName,
    roles: data.roles || [],
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
};

export const updateUserProfile = async (
  uid: string,
  updates: UpdateUserData
): Promise<void> => {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

export const deleteUserProfile = async (uid: string): Promise<void> => {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await deleteDoc(docRef);
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      uid: doc.id,
      email: data.email,
      displayName: data.displayName,
      roles: data.roles || [],
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
};

export const getUsersByRole = async (role: UserRole): Promise<UserProfile[]> => {
  const q = query(
    collection(db, USERS_COLLECTION),
    where('roles', 'array-contains', role)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      uid: doc.id,
      email: data.email,
      displayName: data.displayName,
      roles: data.roles || [],
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
};

export const hasRole = (userProfile: UserProfile | null, role: UserRole): boolean => {
  if (!userProfile) return false;
  return userProfile.roles.includes(role);
};

export const isAdmin = (userProfile: UserProfile | null): boolean => {
  return hasRole(userProfile, UserRole.ASB_ADMIN);
};

export const isFunkcionar = (userProfile: UserProfile | null): boolean => {
  return hasRole(userProfile, UserRole.ASB_FUNKCIONAR);
};
