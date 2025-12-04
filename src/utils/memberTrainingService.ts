import { doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { MemberTrainingNote, TrainingPlan } from '../types/trainingPlan';
import { recordBulkAttendance } from './attendanceService';
import { AttendanceStatus } from '../types/attendance';

const TRAINING_PLANS_COLLECTION = 'trainingPlans';

/**
 * Přidání poznámky člena k individuálnímu tréninku
 */
export const addMemberNoteToTraining = async (
  trainingPlanId: string,
  memberId: number,
  memberName: string,
  note: string,
  completed: boolean,
  userId: string
): Promise<void> => {
  try {
    // Načtení tréninku pro validaci
    const trainingRef = doc(db, TRAINING_PLANS_COLLECTION, trainingPlanId);
    const trainingSnap = await getDoc(trainingRef);
    
    if (!trainingSnap.exists()) {
      throw new Error('Trénink nebyl nalezen');
    }
    
    const training = trainingSnap.data() as TrainingPlan;
    
    // Validace: datum musí být dnes nebo v minulosti
    const trainingDate = training.date instanceof Date ? training.date : new Date(training.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (trainingDate > today) {
      throw new Error('Poznámku lze přidat pouze k tréninku, který již proběhl nebo probíhá dnes');
    }
    
    // Kontrola, zda člen již má poznámku - pokud ano, aktualizuj ji
    const existingNotes = training.memberNotes || [];
    const existingNoteIndex = existingNotes.findIndex(n => n.memberId === memberId);
    
    let updatedNotes;
    if (existingNoteIndex !== -1) {
      // Aktualizace existující poznámky
      updatedNotes = [...existingNotes];
      updatedNotes[existingNoteIndex] = {
        ...updatedNotes[existingNoteIndex],
        note,
        completed,
        updatedAt: Timestamp.fromDate(new Date()) as any,
        updatedBy: userId,
      };
    } else {
      // Přidání nové poznámky
      const memberNote: MemberTrainingNote = {
        memberId,
        memberName,
        note,
        completed,
        createdAt: Timestamp.fromDate(new Date()) as any,
        createdBy: userId,
      };
      updatedNotes = [...existingNotes, memberNote];
    }
    
    // Uložení poznámky
    await updateDoc(trainingRef, {
      memberNotes: updatedNotes,
      updatedAt: Timestamp.fromDate(new Date()),
      updatedBy: userId,
    });
    
    // Pokud je označeno jako dokončené a ještě nebyl vytvořen záznam docházky
    // (pouze když je to nová poznámka nebo se completed změnilo z false na true)
    const wasCompleted = existingNoteIndex !== -1 ? existingNotes[existingNoteIndex].completed : false;
    const shouldRecordAttendance = completed && !wasCompleted;
    
    if (shouldRecordAttendance) {
      const bulkInput = {
        trainingPlanId: trainingPlanId,
        groupId: training.groupId,
        attendances: [{ 
          memberId, 
          memberName,
          status: AttendanceStatus.PRESENT 
        }],
      };
      await recordBulkAttendance(bulkInput, userId);
    }
  } catch (error) {
    console.error('Chyba při přidávání poznámky člena:', error);
    throw error;
  }
};

/**
 * Kontrola, zda může člen přidat/upravit poznámku k tréninku
 */
export const canMemberAddNote = async (
  trainingPlanId: string,
  memberId: number
): Promise<{ canAdd: boolean; reason?: string; existingNote?: MemberTrainingNote }> => {
  try {
    const trainingRef = doc(db, TRAINING_PLANS_COLLECTION, trainingPlanId);
    const trainingSnap = await getDoc(trainingRef);
    
    if (!trainingSnap.exists()) {
      return { canAdd: false, reason: 'Trénink nebyl nalezen' };
    }
    
    const training = trainingSnap.data() as TrainingPlan;
    
    // Datum musí být dnes nebo v minulosti
    const trainingDate = training.date instanceof Date ? training.date : new Date(training.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (trainingDate > today) {
      return { canAdd: false, reason: 'Trénink ještě neproběhl' };
    }
    
    // Zkontroluj existující poznámku
    const existingNotes = training.memberNotes || [];
    const existingNote = existingNotes.find(n => n.memberId === memberId);
    
    return { canAdd: true, existingNote };
  } catch (error) {
    console.error('Chyba při kontrole oprávnění:', error);
    return { canAdd: false, reason: 'Chyba při kontrole' };
  }
};

/**
 * Získání poznámek členů pro trénink
 */
export const getMemberNotesForTraining = async (
  trainingPlanId: string
): Promise<MemberTrainingNote[]> => {
  try {
    const trainingRef = doc(db, TRAINING_PLANS_COLLECTION, trainingPlanId);
    const trainingSnap = await getDoc(trainingRef);
    
    if (!trainingSnap.exists()) {
      return [];
    }
    
    const training = trainingSnap.data() as TrainingPlan;
    return training.memberNotes || [];
  } catch (error) {
    console.error('Chyba při načítání poznámek členů:', error);
    return [];
  }
};
