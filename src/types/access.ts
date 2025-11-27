/**
 * Typy pro správu NFC/RFID čipů a přístupových zón
 */

// Přístupová zóna (např. "Posilovna", "Šatna", "Sklad")
export interface Zone {
  id: string; // UUID
  name: string; // Název zóny
  description?: string; // Popis zóny
  color: string; // Barva pro vizuální rozlišení (#RRGGBB)
  isActive: boolean; // Je zóna aktivní?
  createdAt: Date;
  createdBy: string; // userId
  updatedAt: Date;
  updatedBy: string; // userId
}

// NFC/RFID čip
export interface Chip {
  id: string; // UUID - interní ID v systému
  chipId: string; // Fyzické ID čipu z čtečky (unikátní)
  chipType: 'NFC' | 'RFID'; // Typ čipu
  holderType: 'member' | 'external'; // Typ držitele
  holderId: number | string; // ID člena (number) nebo externího člena (string)
  holderName: string; // Jméno držitele pro rychlý přístup
  zones: string[]; // Array ID zón, ke kterým má čip přístup
  isActive: boolean; // Je čip aktivní?
  note?: string; // Poznámka k čipu
  issuedAt: Date; // Datum vydání
  issuedBy: string; // userId funkcionáře, který čip vydal
  expiresAt?: Date; // Datum expirace (nepovinné)
  lastUsed?: Date; // Poslední použití čipu
  updatedAt: Date;
  updatedBy: string;
}

// Externí osoba (nečlen organizace)
export interface ExternalPerson {
  id: string; // UUID
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  organization?: string; // Organizace, kterou reprezentuje
  note?: string;
  isActive: boolean;
  createdAt: Date;
  createdBy: string; // userId
  updatedAt: Date;
  updatedBy: string;
}

// DTO pro vytvoření/aktualizaci zóny
export interface UpsertZone {
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
}

// DTO pro vytvoření/aktualizaci čipu
export interface UpsertChip {
  chipId: string;
  chipType: 'NFC' | 'RFID';
  holderType: 'member' | 'external';
  holderId: number | string;
  zones: string[];
  isActive: boolean;
  note?: string;
  expiresAt?: Date;
}

// DTO pro vytvoření/aktualizaci externí osoby
export interface UpsertExternalPerson {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  organization?: string;
  note?: string;
  isActive: boolean;
}

// Rozšířený čip s informacemi o zónách
export interface ChipWithZones extends Chip {
  zoneDetails: Zone[]; // Detaily zón pro zobrazení
}

// Statistiky pro dashboard
export interface AccessStats {
  totalChips: number;
  activeChips: number;
  totalZones: number;
  activeZones: number;
  memberChips: number;
  externalChips: number;
  expiringChips: number; // Čipy, které expirují do 30 dnů
}

// Záznam použití čipu (pro audit log)
export interface ChipUsageLog {
  id: string;
  chipId: string;
  zoneId: string;
  holderName: string;
  timestamp: Date;
  granted: boolean; // Byl přístup povolen?
  reason?: string; // Důvod zamítnutí
}
