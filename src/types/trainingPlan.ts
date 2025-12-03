// Typ tréninku
export enum TrainingType {
  COMMON = 'společný',
  INDIVIDUAL = 'individuální',
}

// Status tréninku
export enum TrainingStatus {
  PLANNED = 'naplánován', // Ještě se nekonal
  COMPLETED = 'dokončen', // Proběhl
  CANCELLED = 'vynechán', // Byl zrušen/vynechán
}

// Tréninkový plán
export interface TrainingPlan {
  id: string; // Firestore document ID
  name: string; // Název tréninku
  description: string; // Popis tréninku
  type: TrainingType; // Společný nebo individuální
  date: Date; // Datum tréninku
  groupId: string; // ID tréninkové skupiny
  groupName: string; // Název skupiny (pro rychlý přístup)
  
  // Status tréninku
  status: TrainingStatus; // Stav tréninku (naplánován/dokončen/vynechán)
  
  // Poznámka o provedení tréninku
  executionNote?: string; // Poznámka po tréninku (co se dělo, jak to probíhalo)
  executedAt?: Date; // Kdy byla poznámka přidána
  executedBy?: string; // Kdo přidal poznámku (uid)
  
  // Metadata
  createdAt: Date;
  createdBy: string; // uid trenéra
  updatedAt: Date;
  updatedBy: string; // uid trenéra
}

// DTO pro vytvoření/úpravu plánu
export interface UpsertTrainingPlan {
  name: string;
  description: string;
  type: TrainingType;
  date: Date;
  groupId: string;
}

// DTO pro poznámku o provedení
export interface UpdateExecutionNote {
  executionNote: string;
}

// Plán s informací o skupině
export interface TrainingPlanWithGroup extends TrainingPlan {
  groupSpecialization?: string;
}

// Statistiky pro přehled
export interface TrainingPlanStats {
  totalPlans: number;
  upcomingPlans: number;
  completedPlans: number; // S poznámkou
  plansThisWeek: number;
  plansThisMonth: number;
}

// Filtr pro zobrazení
export interface TrainingPlanFilter {
  groupId?: string;
  trainerId?: string;
  startDate?: Date;
  endDate?: Date;
  includeHistorical?: boolean;
}
