// Člen z API Atletika.cz
export interface Member {
  Id: number;
  IdReg?: number;
  TitulPred?: string;
  TitulZa?: string;
  Jmeno: string;
  Prijmeni: string;
  NormalizovaneJmeno?: string;
  CeleJmeno: string;
  RodnePrijmeni?: string;
  RodneCislo?: string;
  DatumNarozeni: string;
  MistoNarozeni?: string;
  Ean?: number;
  Ean2?: string;
  Cizinec?: boolean;
  Narodnost?: string;
  JeMuz: boolean;
  
  // Kontaktní údaje
  Email?: string;
  EmailZastupce?: string;
  Telefon?: string;
  TelefonZastupce?: string;
  AdresaUliceCp?: string;
  AdresaMesto?: string;
  AdresaPsc?: string;
  
  // Fyzické parametry
  VelikostObuvi?: string;
  VelikostObuviCm?: number;
  VyskaCm?: number;
  HmotnostKg?: number;
  VelikostObleceni?: string;
  VelikostTricka?: string;
  VelikostMikinyBundy?: string;
  VelikostKratasy?: string;
  VelikostKalhoty?: string;
  
  // Členství
  TypClenstvi?: number;
  TypClenstviArchiv?: number;
  Zarazeni?: number;
  ZarazeniNavrh?: number;
  CekaNaAutorizaciUdaju?: boolean;
  
  // Atlet
  JeAtlet?: boolean;
  RegistrovanyAtlet?: boolean;
  AtletOddilId?: number;
  AtletOddilNazev?: string;
  AtletOddilZkratka?: string;
  DtAtletPlatnostDo?: string;
  AtletLekarskaProhlidka?: string;
  AtletKonciciPlatnost?: boolean;
  AtletCinnostUkoncena?: boolean;
  
  // Trenér
  Trener1Id?: number;
  Trener1Jmeno?: string;
  Trener1Telefon?: string;
  Trener1Email?: string;
  Trener1Trida?: number;
  Trener2Id?: number;
  Trener2Jmeno?: string;
  Trener2Telefon?: string;
  Trener2Email?: string;
  Trener2Trida?: number;
  TrenerOddilId?: number;
  TrenerOddilNazev?: string;
  TrenerTrida?: number;
  TrenerDatumSkoleni?: string;
  
  // Rozhodčí
  RozhodciOddilId?: number;
  RozhodciOddilNazev?: string;
  RozhodciTrida?: number;
  RozhodciCisloPrukazu?: string;
  
  // Ostatní
  MarketingSouhlas?: boolean;
  ZpracovaniUdajuSouhlas?: boolean;
  UserUid?: string;
  Selected?: boolean;
  
  // Pro zpětnou kompatibilitu
  IsActive?: boolean;
}

// API Response struktura
export interface MembersApiResponse {
  data: Member[];
  total?: number;
}

// Rozšířená metadata ukládaná ve Firebase
export interface MemberMetadata {
  memberId: number; // Id člena z API
  email?: string;
  phone?: string;
  notes?: string;
  customFields?: Record<string, string>;
  updatedAt: Date;
  updatedBy: string; // uid uživatele, který provedl poslední úpravu
}

// Kombinovaná data pro zobrazení
export interface MemberWithMetadata extends Member {
  metadata?: MemberMetadata;
}

// Data pro vytvoření/úpravu metadat
export interface UpdateMemberMetadata {
  email?: string;
  phone?: string;
  notes?: string;
  customFields?: Record<string, string>;
}
