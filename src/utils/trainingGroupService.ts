import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  TrainingGroup,
  UpsertTrainingGroup,
  GroupMember,
  GroupTrainer,
  TrainingGroupStats,
  TrainingSpecialization,
} from '../types/trainingGroup';

const COLLECTION_NAME = 'trainingGroups';

// Převod Firestore dat na TypeScript typ
const mapFirestoreToTrainingGroup = (id: string, data: any): TrainingGroup => {
  return {
    id,
    name: data.name,
    alias: data.alias,
    specialization: data.specialization,
    description: data.description,
    members: data.members?.map((m: any) => ({
      ...m,
      addedAt: m.addedAt?.toDate() || new Date(),
    })) || [],
    trainers: data.trainers?.map((t: any) => ({
      ...t,
      addedAt: t.addedAt?.toDate() || new Date(),
    })) || [],
    active: data.active ?? true,
    createdAt: data.createdAt?.toDate() || new Date(),
    createdBy: data.createdBy,
    updatedAt: data.updatedAt?.toDate() || new Date(),
    updatedBy: data.updatedBy,
  };
};

// Získat všechny skupiny
export const getAllTrainingGroups = async (): Promise<TrainingGroup[]> => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => mapFirestoreToTrainingGroup(doc.id, doc.data()));
};

// Získat aktivní skupiny
export const getActiveTrainingGroups = async (): Promise<TrainingGroup[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('active', '==', true),
    orderBy('name')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => mapFirestoreToTrainingGroup(doc.id, doc.data()));
};

// Získat skupiny podle specializace
export const getGroupsBySpecialization = async (
  specialization: TrainingSpecialization
): Promise<TrainingGroup[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('specialization', '==', specialization),
    orderBy('name')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => mapFirestoreToTrainingGroup(doc.id, doc.data()));
};

// Získat skupiny podle trenéra
export const getGroupsByTrainer = async (trainerUid: string): Promise<TrainingGroup[]> => {
  const allGroups = await getAllTrainingGroups();
  return allGroups.filter(group =>
    group.trainers.some(trainer => trainer.uid === trainerUid)
  );
};

// Získat jednu skupinu
export const getTrainingGroup = async (id: string): Promise<TrainingGroup | null> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return mapFirestoreToTrainingGroup(docSnap.id, docSnap.data());
};

// Vytvořit novou skupinu
export const createTrainingGroup = async (
  data: UpsertTrainingGroup,
  createdBy: string
): Promise<string> => {
  // Kontrola duplicitního názvu
  const existingGroups = await getAllTrainingGroups();
  const duplicateName = existingGroups.find(
    g => g.name.toLowerCase() === data.name.toLowerCase()
  );
  
  if (duplicateName) {
    throw new Error(`Skupina s názvem "${data.name}" již existuje`);
  }
  
  // Kontrola duplicitního aliasu
  if (data.alias) {
    const duplicateAlias = existingGroups.find(
      g => g.alias && g.alias.toLowerCase() === data.alias!.toLowerCase()
    );
    
    if (duplicateAlias) {
      throw new Error(`Skupina s aliasem "${data.alias}" již existuje`);
    }
  }
  
  const now = Timestamp.now();
  const newGroup = {
    name: data.name.trim(),
    alias: data.alias?.trim() || null,
    specialization: data.specialization,
    description: data.description?.trim() || null,
    members: [],
    trainers: [],
    active: data.active ?? true,
    createdAt: now,
    createdBy,
    updatedAt: now,
    updatedBy: createdBy,
  };
  
  const docRef = await addDoc(collection(db, COLLECTION_NAME), newGroup);
  return docRef.id;
};

// Aktualizovat skupinu
export const updateTrainingGroup = async (
  id: string,
  data: Partial<UpsertTrainingGroup>,
  updatedBy: string
): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  
  // Kontrola existence
  const existing = await getTrainingGroup(id);
  if (!existing) {
    throw new Error('Skupina nenalezena');
  }
  
  // Kontrola duplicitního názvu
  if (data.name && data.name !== existing.name) {
    const allGroups = await getAllTrainingGroups();
    const duplicateName = allGroups.find(
      g => g.id !== id && g.name.toLowerCase() === data.name!.toLowerCase()
    );
    
    if (duplicateName) {
      throw new Error(`Skupina s názvem "${data.name}" již existuje`);
    }
  }
  
  // Kontrola duplicitního aliasu
  if (data.alias !== undefined && data.alias !== existing.alias) {
    const allGroups = await getAllTrainingGroups();
    const duplicateAlias = allGroups.find(
      g => g.id !== id && g.alias && g.alias.toLowerCase() === data.alias?.toLowerCase()
    );
    
    if (duplicateAlias) {
      throw new Error(`Skupina s aliasem "${data.alias}" již existuje`);
    }
  }
  
  const updateData: any = {
    updatedAt: Timestamp.now(),
    updatedBy,
  };
  
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.alias !== undefined) updateData.alias = data.alias?.trim() || null;
  if (data.specialization !== undefined) updateData.specialization = data.specialization;
  if (data.description !== undefined) updateData.description = data.description?.trim() || null;
  if (data.active !== undefined) updateData.active = data.active;
  
  await updateDoc(docRef, updateData);
};

// Smazat skupinu
export const deleteTrainingGroup = async (id: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
};

// Přidat člena do skupiny
export const addMemberToGroup = async (
  groupId: string,
  member: GroupMember,
  updatedBy: string
): Promise<void> => {
  const group = await getTrainingGroup(groupId);
  if (!group) {
    throw new Error('Skupina nenalezena');
  }
  
  // Kontrola, zda člen už není ve skupině
  const exists = group.members.find(
    m => m.id === member.id && m.type === member.type
  );
  
  if (exists) {
    throw new Error('Tento člen je již ve skupině');
  }
  
  const docRef = doc(db, COLLECTION_NAME, groupId);
  await updateDoc(docRef, {
    members: arrayUnion({
      ...member,
      addedAt: Timestamp.now(),
      addedBy: updatedBy,
    }),
    updatedAt: Timestamp.now(),
    updatedBy,
  });
};

// Odebrat člena ze skupiny
export const removeMemberFromGroup = async (
  groupId: string,
  memberId: number | string,
  memberType: string,
  updatedBy: string
): Promise<void> => {
  const group = await getTrainingGroup(groupId);
  if (!group) {
    throw new Error('Skupina nenalezena');
  }
  
  const memberToRemove = group.members.find(
    m => m.id === memberId && m.type === memberType
  );
  
  if (!memberToRemove) {
    throw new Error('Člen není ve skupině');
  }
  
  const docRef = doc(db, COLLECTION_NAME, groupId);
  
  // Firestore arrayRemove vyžaduje přesnou shodu objektu
  await updateDoc(docRef, {
    members: arrayRemove(memberToRemove),
    updatedAt: Timestamp.now(),
    updatedBy,
  });
};

// Přidat trenéra do skupiny
export const addTrainerToGroup = async (
  groupId: string,
  trainer: GroupTrainer,
  updatedBy: string
): Promise<void> => {
  const group = await getTrainingGroup(groupId);
  if (!group) {
    throw new Error('Skupina nenalezena');
  }
  
  // Kontrola, zda trenér už není ve skupině
  const exists = group.trainers.find(t => t.uid === trainer.uid);
  
  if (exists) {
    throw new Error('Tento trenér je již ve skupině');
  }
  
  const docRef = doc(db, COLLECTION_NAME, groupId);
  await updateDoc(docRef, {
    trainers: arrayUnion({
      ...trainer,
      addedAt: Timestamp.now(),
    }),
    updatedAt: Timestamp.now(),
    updatedBy,
  });
};

// Odebrat trenéra ze skupiny
export const removeTrainerFromGroup = async (
  groupId: string,
  trainerUid: string,
  updatedBy: string
): Promise<void> => {
  const group = await getTrainingGroup(groupId);
  if (!group) {
    throw new Error('Skupina nenalezena');
  }
  
  const trainerToRemove = group.trainers.find(t => t.uid === trainerUid);
  
  if (!trainerToRemove) {
    throw new Error('Trenér není ve skupině');
  }
  
  // Kontrola, že neodebíráme posledního trenéra
  if (group.trainers.length === 1) {
    throw new Error('Nemůžete odebrat posledního trenéra ze skupiny');
  }
  
  const docRef = doc(db, COLLECTION_NAME, groupId);
  
  await updateDoc(docRef, {
    trainers: arrayRemove(trainerToRemove),
    updatedAt: Timestamp.now(),
    updatedBy,
  });
};

// Nastavit hlavního trenéra
export const setPrimaryTrainer = async (
  groupId: string,
  trainerUid: string,
  updatedBy: string
): Promise<void> => {
  const group = await getTrainingGroup(groupId);
  if (!group) {
    throw new Error('Skupina nenalezena');
  }
  
  const trainer = group.trainers.find(t => t.uid === trainerUid);
  if (!trainer) {
    throw new Error('Trenér není ve skupině');
  }
  
  // Aktualizace všech trenérů - pouze jeden může být primary
  const updatedTrainers = group.trainers.map(t => ({
    ...t,
    isPrimary: t.uid === trainerUid,
  }));
  
  const docRef = doc(db, COLLECTION_NAME, groupId);
  await updateDoc(docRef, {
    trainers: updatedTrainers,
    updatedAt: Timestamp.now(),
    updatedBy,
  });
};

// Získat statistiky
export const getTrainingGroupStats = async (): Promise<TrainingGroupStats> => {
  const groups = await getAllTrainingGroups();
  
  const stats: TrainingGroupStats = {
    totalGroups: groups.length,
    activeGroups: groups.filter(g => g.active).length,
    totalMembers: groups.reduce((sum, g) => sum + g.members.length, 0),
    totalTrainers: new Set(groups.flatMap(g => g.trainers.map(t => t.uid))).size,
    groupsBySpecialization: {} as Record<any, number>,
  };
  
  // Počet skupin podle specializace
  groups.forEach(group => {
    stats.groupsBySpecialization[group.specialization] = 
      (stats.groupsBySpecialization[group.specialization] || 0) + 1;
  });
  
  return stats;
};
