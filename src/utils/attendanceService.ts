import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  AttendanceRecord,
  BulkAttendanceInput,
  MemberAttendanceStats,
  GroupAttendanceStats,
  TrainingAttendanceSummary,
  AttendanceStatus,
} from '../types/attendance';
import { AttendanceStatus as AS } from '../types/attendance';
import { getTrainingGroup } from './trainingGroupService';
import { getHistoricalPlans } from './trainingPlanService';
import { fetchMembersFromAPI } from './memberService';

const COLLECTION_NAME = 'trainingAttendance';

// Mapování Firestore -> TypeScript
const mapFirestoreToAttendance = (id: string, data: any): AttendanceRecord => {
  return {
    id,
    trainingPlanId: data.trainingPlanId,
    groupId: data.groupId,
    memberId: data.memberId,
    memberName: data.memberName,
    status: data.status,
    note: data.note,
    arrivedAt: data.arrivedAt?.toDate(),
    leftAt: data.leftAt?.toDate(),
    recordedAt: data.recordedAt?.toDate() || new Date(),
    recordedBy: data.recordedBy,
    updatedAt: data.updatedAt?.toDate() || new Date(),
    updatedBy: data.updatedBy,
  };
};

// Hromadné zaznamenání docházky pro jeden trénink
export const recordBulkAttendance = async (
  input: BulkAttendanceInput,
  recordedBy: string
): Promise<void> => {
  const batch = writeBatch(db);
  const now = Timestamp.now();

  // Nejdřív smažeme existující záznamy pro tento trénink
  const existingQuery = query(
    collection(db, COLLECTION_NAME),
    where('trainingPlanId', '==', input.trainingPlanId)
  );
  const existingDocs = await getDocs(existingQuery);
  existingDocs.forEach(doc => batch.delete(doc.ref));

  // Vytvoříme nové záznamy
  for (const attendance of input.attendances) {
    const docRef = doc(collection(db, COLLECTION_NAME));
    batch.set(docRef, {
      trainingPlanId: input.trainingPlanId,
      groupId: input.groupId,
      memberId: attendance.memberId,
      memberName: attendance.memberName,
      status: attendance.status,
      note: attendance.note || null,
      arrivedAt: attendance.arrivedAt ? Timestamp.fromDate(attendance.arrivedAt) : null,
      leftAt: attendance.leftAt ? Timestamp.fromDate(attendance.leftAt) : null,
      recordedAt: now,
      recordedBy,
      updatedAt: now,
      updatedBy: recordedBy,
    });
  }

  await batch.commit();
};

// Získat docházku pro konkrétní trénink
export const getTrainingAttendance = async (
  trainingPlanId: string
): Promise<AttendanceRecord[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('trainingPlanId', '==', trainingPlanId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => mapFirestoreToAttendance(doc.id, doc.data()));
};

// Aktualizovat jeden záznam
export const updateAttendanceRecord = async (
  id: string,
  status: AttendanceStatus,
  updatedBy: string,
  note?: string,
  arrivedAt?: Date,
  leftAt?: Date
): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    status,
    note: note || null,
    arrivedAt: arrivedAt ? Timestamp.fromDate(arrivedAt) : null,
    leftAt: leftAt ? Timestamp.fromDate(leftAt) : null,
    updatedAt: Timestamp.now(),
    updatedBy,
  });
};

// Získat shrnutí docházky pro trénink
export const getTrainingAttendanceSummary = async (
  trainingPlanId: string,
  trainingName: string,
  trainingDate: Date,
  totalMembers: number
): Promise<TrainingAttendanceSummary> => {
  const records = await getTrainingAttendance(trainingPlanId);
  
  const summary: TrainingAttendanceSummary = {
    trainingPlanId,
    trainingName,
    trainingDate,
    totalMembers,
    recorded: records.length,
    present: 0,
    late: 0,
    leftEarly: 0,
    excused: 0,
    unexcused: 0,
    unknown: totalMembers - records.length,
  };

  records.forEach(record => {
    switch (record.status) {
      case AS.PRESENT: summary.present++; break;
      case AS.LATE: summary.late++; break;
      case AS.LEFT_EARLY: summary.leftEarly++; break;
      case AS.EXCUSED: summary.excused++; break;
      case AS.UNEXCUSED: summary.unexcused++; break;
    }
  });

  return summary;
};

// Statistiky člena za období
export const getMemberAttendanceStats = async (
  memberId: number,
  groupId: string,
  startDate?: Date,
  endDate?: Date
): Promise<MemberAttendanceStats> => {
  // Dnešní datum (nastavit na konec dne)
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  // Získat pouze historické tréninky (ne budoucí)
  const historical = await getHistoricalPlans(undefined, startDate, endDate);
  
  // Filtrovat tréninky podle groupId a datumového období (pouze do dneška)
  const allPlans = historical.filter(p => {
    if (p.groupId !== groupId) return false;
    if (p.date > today) return false; // Vyloučit budoucí tréninky
    if (startDate && p.date < startDate) return false;
    if (endDate && p.date > endDate) return false;
    return true;
  });

  // Získat docházku člena
  const q = query(
    collection(db, COLLECTION_NAME),
    where('memberId', '==', memberId),
    where('groupId', '==', groupId)
  );
  const snapshot = await getDocs(q);
  const records = snapshot.docs.map(doc => mapFirestoreToAttendance(doc.id, doc.data()));

  // Načíst email člena z API
  let memberEmail: string | undefined;
  try {
    const members = await fetchMembersFromAPI();
    const member = members.find(m => m.Id === memberId);
    memberEmail = member?.Email;
  } catch (error) {
    console.error('Chyba při načítání emailu člena:', error);
  }

  const stats: MemberAttendanceStats = {
    memberId,
    memberName: records[0]?.memberName || '',
    memberEmail,
    totalTrainings: allPlans.length,
    present: 0,
    late: 0,
    leftEarly: 0,
    excused: 0,
    unexcused: 0,
    unknown: 0,
    attendanceRate: 0,
    activeRate: 0,
  };

  // Spočítat statistiky
  const recordMap = new Map(records.map(r => [r.trainingPlanId, r]));
  
  allPlans.forEach(plan => {
    const record = recordMap.get(plan.id);
    if (!record) {
      stats.unknown++;
    } else {
      switch (record.status) {
        case AS.PRESENT: stats.present++; break;
        case AS.LATE: stats.late++; break;
        case AS.LEFT_EARLY: stats.leftEarly++; break;
        case AS.EXCUSED: stats.excused++; break;
        case AS.UNEXCUSED: stats.unexcused++; break;
      }
    }
  });

  if (stats.totalTrainings > 0) {
    stats.attendanceRate = ((stats.present + stats.late + stats.leftEarly) / stats.totalTrainings) * 100;
    stats.activeRate = (stats.present / stats.totalTrainings) * 100;
  }

  return stats;
};

// Statistiky celé skupiny
export const getGroupAttendanceStats = async (
  groupId: string,
  startDate?: Date,
  endDate?: Date
): Promise<GroupAttendanceStats> => {
  const group = await getTrainingGroup(groupId);
  
  if (!group) {
    throw new Error('Skupina nenalezena');
  }

  // Získat statistiky pro všechny členy
  const memberStats = await Promise.all(
    group.members.map(member => {
      // Konvertovat ID na number (pokud je string)
      const memberId = typeof member.id === 'string' ? parseInt(member.id, 10) : member.id;
      return getMemberAttendanceStats(memberId, groupId, startDate, endDate);
    })
  );

  // Dnešní datum (nastavit na konec dne)
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const historical = await getHistoricalPlans(undefined, startDate, endDate);
  
  // Filtrovat tréninky podle groupId a datumového období (pouze do dneška)
  const allPlans = historical.filter(p => {
    if (p.groupId !== groupId) return false;
    if (p.date > today) return false; // Vyloučit budoucí tréninky
    if (startDate && p.date < startDate) return false;
    if (endDate && p.date > endDate) return false;
    return true;
  });

  const totalTrainings = allPlans.length;
  const averageAttendance = totalTrainings > 0 && memberStats.length > 0
    ? memberStats.reduce((sum, m) => sum + m.present + m.late + m.leftEarly, 0) / (totalTrainings * memberStats.length) * 100
    : 0;

  return {
    groupId,
    groupName: group.name,
    totalTrainings,
    averageAttendance,
    memberStats: memberStats.sort((a, b) => b.attendanceRate - a.attendanceRate),
    lastUpdated: new Date(),
  };
};

// Smazat docházku pro trénink
export const deleteTrainingAttendance = async (trainingPlanId: string): Promise<void> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('trainingPlanId', '==', trainingPlanId)
  );
  const snapshot = await getDocs(q);
  
  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
};
