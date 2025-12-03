// Specializace tréninkových skupin
export enum TrainingSpecialization {
  BEHY = 'běhy',
  SKOKY = 'skoky',
  SPRINTY = 'sprinty',
  VRHY = 'vrhy',
  VICESOJ = 'víceboj',
  OBECNE = 'obecné',
  VYKONNOSTNI = 'výkonnostní',
  PRIPRAVKA = 'přípravka',
}

// Typ člena ve skupině
export enum MemberType {
  INTERNAL = 'internal', // Člen z Members tabulky
  EXTERNAL = 'external', // Externí osoba z ExternalPersons
}

// Přiřazení člena do skupiny
export interface GroupMember {
  id: number | string; // ID z Members (number) nebo ExternalPersons (string)
  type: MemberType;
  name: string; // Uložené jméno pro rychlý přístup
  addedAt: Date;
  addedBy: string; // uid uživatele
}

// Přiřazení trenéra do skupiny
export interface GroupTrainer {
  uid: string; // Firebase Auth UID
  name: string; // Jméno trenéra
  addedAt: Date;
  isPrimary: boolean; // Hlavní trenér skupiny
}

// Tréninková skupina
export interface TrainingGroup {
  id: string; // Firestore document ID
  name: string; // Název skupiny
  alias?: string; // Alternativní název/zkratka
  specialization: TrainingSpecialization;
  description?: string;
  
  // Členové skupiny
  members: GroupMember[];
  
  // Trenéři skupiny
  trainers: GroupTrainer[];
  
  // Metadata
  active: boolean;
  createdAt: Date;
  createdBy: string; // uid uživatele
  updatedAt: Date;
  updatedBy: string; // uid uživatele
}

// Data pro vytvoření/úpravu skupiny
export interface UpsertTrainingGroup {
  name: string;
  alias?: string;
  specialization: TrainingSpecialization;
  description?: string;
  active?: boolean;
}

// Statistiky pro dashboard
export interface TrainingGroupStats {
  totalGroups: number;
  activeGroups: number;
  totalMembers: number;
  totalTrainers: number;
  groupsBySpecialization: Record<TrainingSpecialization, number>;
}
