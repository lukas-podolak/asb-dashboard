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
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  TrainingPlan,
  UpsertTrainingPlan,
  TrainingPlanStats,
} from '../types/trainingPlan';
import { TrainingStatus } from '../types/trainingPlan';
import { getTrainingGroup, getGroupsByTrainer } from './trainingGroupService';

const COLLECTION_NAME = 'trainingPlans';

// Převod Firestore dat na TypeScript typ
const mapFirestoreToTrainingPlan = (id: string, data: any): TrainingPlan => {
  return {
    id,
    name: data.name,
    description: data.description,
    type: data.type,
    date: data.date?.toDate() || new Date(),
    groupId: data.groupId,
    groupName: data.groupName,
    status: data.status || TrainingStatus.PLANNED,
    executionNote: data.executionNote,
    executedAt: data.executedAt?.toDate(),
    executedBy: data.executedBy,
    raceProposalsUrl: data.raceProposalsUrl,
    excludeFromStats: data.excludeFromStats || false,
    individualAccessMembers: data.individualAccessMembers || [],
    memberNotes: data.memberNotes ? data.memberNotes.map((note: any) => ({
      memberId: note.memberId,
      memberName: note.memberName,
      note: note.note,
      completed: note.completed,
      createdAt: note.createdAt?.toDate() || new Date(),
      createdBy: note.createdBy,
      updatedAt: note.updatedAt?.toDate(),
      updatedBy: note.updatedBy,
    })) : undefined,
    createdAt: data.createdAt?.toDate() || new Date(),
    createdBy: data.createdBy,
    updatedAt: data.updatedAt?.toDate() || new Date(),
    updatedBy: data.updatedBy,
  };
};

// Získat všechny plány
export const getAllTrainingPlans = async (): Promise<TrainingPlan[]> => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => mapFirestoreToTrainingPlan(doc.id, doc.data()));
};

// Získat plány podle skupiny
export const getPlansByGroup = async (groupId: string): Promise<TrainingPlan[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('groupId', '==', groupId)
  );
  const snapshot = await getDocs(q);
  const plans = snapshot.docs.map(doc => mapFirestoreToTrainingPlan(doc.id, doc.data()));
  // Řadit na klientovi
  return plans.sort((a, b) => b.date.getTime() - a.date.getTime());
};

// Získat plány podle trenéra (všechny skupiny trenéra)
export const getPlansByTrainer = async (trainerId: string): Promise<TrainingPlan[]> => {
  // Najít všechny skupiny trenéra
  const groups = await getGroupsByTrainer(trainerId);
  const groupIds = groups.map(g => g.id);
  
  if (groupIds.length === 0) {
    return [];
  }
  
  // Firestore má limit 10 hodnot pro 'in' operátor
  // Pokud má trenér více než 10 skupin, musíme dotazy rozdělit
  const chunks: string[][] = [];
  for (let i = 0; i < groupIds.length; i += 10) {
    chunks.push(groupIds.slice(i, i + 10));
  }
  
  const allPlans: TrainingPlan[] = [];
  for (const chunk of chunks) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('groupId', 'in', chunk)
    );
    const snapshot = await getDocs(q);
    allPlans.push(...snapshot.docs.map(doc => mapFirestoreToTrainingPlan(doc.id, doc.data())));
  }
  
  // Seřadit všechny plány podle data na klientovi
  return allPlans.sort((a, b) => b.date.getTime() - a.date.getTime());
};

// Získat nadcházející plány (budoucnost)
export const getUpcomingPlans = async (trainerId?: string): Promise<TrainingPlan[]> => {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Začátek dnešního dne
  
  let plans: TrainingPlan[];
  
  if (trainerId) {
    plans = await getPlansByTrainer(trainerId);
  } else {
    plans = await getAllTrainingPlans();
  }
  
  return plans
    .filter(plan => plan.date >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime()); // Vzestupně pro nadcházející
};

// Získat historické plány (minulost)
export const getHistoricalPlans = async (
  trainerId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<TrainingPlan[]> => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  let plans: TrainingPlan[];
  
  if (trainerId) {
    plans = await getPlansByTrainer(trainerId);
  } else {
    plans = await getAllTrainingPlans();
  }
  
  return plans
    .filter(plan => {
      if (plan.date >= now) return false;
      if (startDate && plan.date < startDate) return false;
      if (endDate && plan.date > endDate) return false;
      return true;
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sestupně pro historii
};

// Získat jeden plán
export const getTrainingPlan = async (id: string): Promise<TrainingPlan | null> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return mapFirestoreToTrainingPlan(docSnap.id, docSnap.data());
};

// Vytvořit nový plán
export const createTrainingPlan = async (
  data: UpsertTrainingPlan,
  createdBy: string
): Promise<string> => {
  // Ověřit, že skupina existuje
  const group = await getTrainingGroup(data.groupId);
  if (!group) {
    throw new Error('Skupina nenalezena');
  }
  
  // Normalizovat datum na půlnoc
  const normalizedDate = new Date(data.date);
  normalizedDate.setHours(12, 0, 0, 0); // Nastavit na poledne aby se vyhnuli timezone problémům
  
  const now = Timestamp.now();
  const newPlan: any = {
    name: data.name.trim(),
    description: data.description.trim(),
    type: data.type,
    date: Timestamp.fromDate(normalizedDate),
    groupId: data.groupId,
    groupName: group.name,
    status: TrainingStatus.PLANNED,
    executionNote: null,
    executedAt: null,
    executedBy: null,
    createdAt: now,
    createdBy,
    updatedAt: now,
    updatedBy: createdBy,
  };
  
  // Přidat odkaz na propozice pro závody
  if (data.raceProposalsUrl) {
    newPlan.raceProposalsUrl = data.raceProposalsUrl.trim();
  }
  
  // Přidat příznak vyloučení ze statistik (pouze pro závody)
  if (data.excludeFromStats !== undefined) {
    newPlan.excludeFromStats = data.excludeFromStats;
  }
  
  // Přidat individuální přístup pro vybrané členy (pouze pro společné tréninky)
  if (data.individualAccessMembers && data.individualAccessMembers.length > 0) {
    newPlan.individualAccessMembers = data.individualAccessMembers;
  }
  
  const docRef = await addDoc(collection(db, COLLECTION_NAME), newPlan);
  return docRef.id;
};

// Aktualizovat plán
export const updateTrainingPlan = async (
  id: string,
  data: Partial<UpsertTrainingPlan>,
  updatedBy: string
): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  
  const existing = await getTrainingPlan(id);
  if (!existing) {
    throw new Error('Plán nenalezen');
  }
  
  const updateData: any = {
    updatedAt: Timestamp.now(),
    updatedBy,
  };
  
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.description !== undefined) updateData.description = data.description.trim();
  if (data.type !== undefined) updateData.type = data.type;
  if (data.raceProposalsUrl !== undefined) {
    updateData.raceProposalsUrl = data.raceProposalsUrl ? data.raceProposalsUrl.trim() : null;
  }
  if (data.excludeFromStats !== undefined) {
    updateData.excludeFromStats = data.excludeFromStats;
  }
  if (data.individualAccessMembers !== undefined) {
    updateData.individualAccessMembers = data.individualAccessMembers.length > 0 ? data.individualAccessMembers : null;
  }
  if (data.date !== undefined) {
    // Normalizovat datum na poledne aby se vyhnuli timezone problémům
    const normalizedDate = new Date(data.date);
    normalizedDate.setHours(12, 0, 0, 0);
    updateData.date = Timestamp.fromDate(normalizedDate);
  }
  
  // Pokud se mění skupina, aktualizovat název
  if (data.groupId !== undefined && data.groupId !== existing.groupId) {
    const group = await getTrainingGroup(data.groupId);
    if (!group) {
      throw new Error('Skupina nenalezena');
    }
    updateData.groupId = data.groupId;
    updateData.groupName = group.name;
  }
  
  await updateDoc(docRef, updateData);
};

// Aktualizovat poznámku o provedení
export const updateExecutionNote = async (
  id: string,
  note: string,
  updatedBy: string
): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  
  const existing = await getTrainingPlan(id);
  if (!existing) {
    throw new Error('Plán nenalezen');
  }
  
  await updateDoc(docRef, {
    executionNote: note.trim() || null,
    executedAt: note.trim() ? Timestamp.now() : null,
    executedBy: note.trim() ? updatedBy : null,
    updatedAt: Timestamp.now(),
    updatedBy,
  });
};

// Aktualizovat status tréninku
export const updateTrainingStatus = async (
  id: string,
  status: TrainingStatus,
  updatedBy: string
): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  
  const existing = await getTrainingPlan(id);
  if (!existing) {
    throw new Error('Plán nenalezen');
  }
  
  await updateDoc(docRef, {
    status,
    updatedAt: Timestamp.now(),
    updatedBy,
  });
};

// Smazat plán
export const deleteTrainingPlan = async (id: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
};

// Získat statistiky
export const getTrainingPlanStats = async (trainerId?: string): Promise<TrainingPlanStats> => {
  let plans: TrainingPlan[];
  
  if (trainerId) {
    plans = await getPlansByTrainer(trainerId);
  } else {
    plans = await getAllTrainingPlans();
  }
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Neděle
  
  const monthStart = new Date(now);
  monthStart.setDate(1);
  
  const stats: TrainingPlanStats = {
    totalPlans: plans.length,
    upcomingPlans: plans.filter(p => p.date >= now).length,
    completedPlans: plans.filter(p => p.executionNote).length,
    plansThisWeek: plans.filter(p => p.date >= weekStart && p.date < now).length,
    plansThisMonth: plans.filter(p => p.date >= monthStart).length,
  };
  
  return stats;
};

// Duplikovat plán (pro opakující se tréninky)
export const duplicateTrainingPlan = async (
  id: string,
  newDate: Date,
  createdBy: string
): Promise<string> => {
  const original = await getTrainingPlan(id);
  if (!original) {
    throw new Error('Plán nenalezen');
  }
  
  // Normalizovat datum na poledne aby se vyhnuli timezone problémům
  const normalizedDate = new Date(newDate);
  normalizedDate.setHours(12, 0, 0, 0);
  
  const now = Timestamp.now();
  const newPlan: any = {
    name: original.name,
    description: original.description,
    type: original.type,
    date: Timestamp.fromDate(normalizedDate),
    groupId: original.groupId,
    groupName: original.groupName,
    executionNote: null,
    executedAt: null,
    executedBy: null,
    createdAt: now,
    createdBy,
    updatedAt: now,
    updatedBy: createdBy,
  };
  
  // Zkopírovat odkaz na propozice pro závody
  if (original.raceProposalsUrl) {
    newPlan.raceProposalsUrl = original.raceProposalsUrl;
  }
  
  // Zkopírovat příznak vyloučení ze statistik
  if (original.excludeFromStats) {
    newPlan.excludeFromStats = original.excludeFromStats;
  }
  
  // Zkopírovat individuální přístup členů
  if (original.individualAccessMembers && original.individualAccessMembers.length > 0) {
    newPlan.individualAccessMembers = original.individualAccessMembers;
  }
  
  const docRef = await addDoc(collection(db, COLLECTION_NAME), newPlan);
  return docRef.id;
};
