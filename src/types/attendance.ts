// Typ tréninku
export enum AttendanceStatus {
  PRESENT = 'přítomen',
  LATE = 'pozdní příchod',
  LEFT_EARLY = 'odešel dříve',
  EXCUSED = 'omluven',
  UNEXCUSED = 'neomluven',
  UNKNOWN = 'neznámá',
}

// Záznam docházky
export interface AttendanceRecord {
  id: string; // Firestore document ID
  trainingPlanId: string; // ID tréninku
  groupId: string; // ID skupiny
  memberId: number; // ID člena (z members API)
  memberName: string; // Jméno člena (cache)
  status: AttendanceStatus; // Status docházky
  note?: string; // Poznámka trenéra (důvod,...)
  arrivedAt?: Date; // Čas příchodu (pro pozdní příchod)
  leftAt?: Date; // Čas odchodu (pro předčasný odchod)
  recordedAt: Date; // Kdy byl záznam pořízen
  recordedBy: string; // UID trenéra
  updatedAt: Date; // Poslední úprava
  updatedBy: string; // UID posledního editora
}

// DTO pro hromadný záznam docházky
export interface BulkAttendanceInput {
  trainingPlanId: string;
  groupId: string;
  attendances: {
    memberId: number;
    memberName: string;
    status: AttendanceStatus;
    note?: string;
    arrivedAt?: Date;
    leftAt?: Date;
  }[];
}

// Statistiky docházky člena
export interface MemberAttendanceStats {
  memberId: number;
  memberName: string;
  totalTrainings: number; // Celkový počet tréninků skupiny
  present: number; // Plná účast
  late: number; // Pozdní příchody
  leftEarly: number; // Předčasné odchody
  excused: number; // Omluvené absence
  unexcused: number; // Neomluvené absence
  unknown: number; // Nezapsané
  attendanceRate: number; // % (present + late + leftEarly) / total
  activeRate: number; // % (present) / total
}

// Statistiky docházky skupiny
export interface GroupAttendanceStats {
  groupId: string;
  groupName: string;
  totalTrainings: number;
  averageAttendance: number; // Průměrná účast na trénink
  memberStats: MemberAttendanceStats[];
  lastUpdated: Date;
}

// Shrnutí docházky pro trénink
export interface TrainingAttendanceSummary {
  trainingPlanId: string;
  trainingName: string;
  trainingDate: Date;
  totalMembers: number; // Celkem členů ve skupině
  recorded: number; // Kolik záznamů existuje
  present: number;
  late: number;
  leftEarly: number;
  excused: number;
  unexcused: number;
  unknown: number;
}
