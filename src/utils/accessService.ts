import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  Zone,
  UpsertZone,
  Chip,
  UpsertChip,
  ExternalPerson,
  UpsertExternalPerson,
  ChipWithZones,
  AccessStats,
} from '../types/access';

// Collections
const ZONES_COLLECTION = 'accessZones';
const CHIPS_COLLECTION = 'accessChips';
const EXTERNAL_PERSONS_COLLECTION = 'externalPersons';

// ============= ZONES =============

export const getAllZones = async (): Promise<Zone[]> => {
  try {
    const q = query(collection(db, ZONES_COLLECTION), orderBy('name'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        color: data.color,
        isActive: data.isActive,
        createdAt: data.createdAt?.toDate() || new Date(),
        createdBy: data.createdBy,
        updatedAt: data.updatedAt?.toDate() || new Date(),
        updatedBy: data.updatedBy,
      };
    });
  } catch (error) {
    console.error('Chyba při načítání zón:', error);
    throw error;
  }
};

export const getZoneById = async (zoneId: string): Promise<Zone | null> => {
  try {
    const docRef = doc(db, ZONES_COLLECTION, zoneId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name,
      description: data.description,
      color: data.color,
      isActive: data.isActive,
      createdAt: data.createdAt?.toDate() || new Date(),
      createdBy: data.createdBy,
      updatedAt: data.updatedAt?.toDate() || new Date(),
      updatedBy: data.updatedBy,
    };
  } catch (error) {
    console.error('Chyba při načítání zóny:', error);
    throw error;
  }
};

export const createZone = async (
  zoneData: UpsertZone,
  userId: string
): Promise<string> => {
  try {
    const newDocRef = doc(collection(db, ZONES_COLLECTION));
    const now = Timestamp.now();
    
    await setDoc(newDocRef, {
      ...zoneData,
      createdAt: now,
      createdBy: userId,
      updatedAt: now,
      updatedBy: userId,
    });
    
    return newDocRef.id;
  } catch (error) {
    console.error('Chyba při vytváření zóny:', error);
    throw error;
  }
};

export const updateZone = async (
  zoneId: string,
  zoneData: UpsertZone,
  userId: string
): Promise<void> => {
  try {
    const docRef = doc(db, ZONES_COLLECTION, zoneId);
    
    await updateDoc(docRef, {
      ...zoneData,
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    });
  } catch (error) {
    console.error('Chyba při aktualizaci zóny:', error);
    throw error;
  }
};

export const deleteZone = async (zoneId: string): Promise<void> => {
  try {
    // Kontrola, zda zóna není přiřazena žádnému čipu
    const chipsQuery = query(
      collection(db, CHIPS_COLLECTION),
      where('zones', 'array-contains', zoneId)
    );
    const chipsSnapshot = await getDocs(chipsQuery);
    
    if (!chipsSnapshot.empty) {
      throw new Error('Nelze smazat zónu, která je přiřazena k čipům. Nejprve odeberte zónu ze všech čipů.');
    }
    
    const docRef = doc(db, ZONES_COLLECTION, zoneId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Chyba při mazání zóny:', error);
    throw error;
  }
};

// ============= CHIPS =============

export const getAllChips = async (): Promise<Chip[]> => {
  try {
    const q = query(collection(db, CHIPS_COLLECTION), orderBy('issuedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        chipId: data.chipId,
        chipType: data.chipType,
        holderType: data.holderType,
        holderId: data.holderId,
        holderName: data.holderName,
        zones: data.zones || [],
        isActive: data.isActive,
        note: data.note,
        issuedAt: data.issuedAt?.toDate() || new Date(),
        issuedBy: data.issuedBy,
        expiresAt: data.expiresAt?.toDate(),
        lastUsed: data.lastUsed?.toDate(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        updatedBy: data.updatedBy,
      };
    });
  } catch (error) {
    console.error('Chyba při načítání čipů:', error);
    throw error;
  }
};

export const getChipsByHolder = async (
  holderType: 'member' | 'external',
  holderId: number | string
): Promise<Chip[]> => {
  try {
    const q = query(
      collection(db, CHIPS_COLLECTION),
      where('holderType', '==', holderType),
      where('holderId', '==', holderId)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        chipId: data.chipId,
        chipType: data.chipType,
        holderType: data.holderType,
        holderId: data.holderId,
        holderName: data.holderName,
        zones: data.zones || [],
        isActive: data.isActive,
        note: data.note,
        issuedAt: data.issuedAt?.toDate() || new Date(),
        issuedBy: data.issuedBy,
        expiresAt: data.expiresAt?.toDate(),
        lastUsed: data.lastUsed?.toDate(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        updatedBy: data.updatedBy,
      };
    });
  } catch (error) {
    console.error('Chyba při načítání čipů držitele:', error);
    throw error;
  }
};

export const getChipsWithZones = async (): Promise<ChipWithZones[]> => {
  try {
    const [chips, zones] = await Promise.all([
      getAllChips(),
      getAllZones(),
    ]);
    
    const zonesMap = new Map(zones.map(z => [z.id, z]));
    
    return chips.map(chip => ({
      ...chip,
      zoneDetails: chip.zones
        .map(zoneId => zonesMap.get(zoneId))
        .filter((z): z is Zone => z !== undefined),
    }));
  } catch (error) {
    console.error('Chyba při načítání čipů se zónami:', error);
    throw error;
  }
};

export const createChip = async (
  chipData: UpsertChip,
  holderName: string,
  userId: string
): Promise<string> => {
  try {
    // Kontrola, zda čip s tímto chipId již neexistuje
    const existingQuery = query(
      collection(db, CHIPS_COLLECTION),
      where('chipId', '==', chipData.chipId)
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      throw new Error('Čip s tímto ID již existuje v systému');
    }
    
    const newDocRef = doc(collection(db, CHIPS_COLLECTION));
    const now = Timestamp.now();
    
    await setDoc(newDocRef, {
      ...chipData,
      holderName,
      issuedAt: now,
      issuedBy: userId,
      expiresAt: chipData.expiresAt ? Timestamp.fromDate(chipData.expiresAt) : null,
      updatedAt: now,
      updatedBy: userId,
    });
    
    return newDocRef.id;
  } catch (error) {
    console.error('Chyba při vytváření čipu:', error);
    throw error;
  }
};

export const updateChip = async (
  chipId: string,
  chipData: Partial<UpsertChip>,
  holderName: string,
  userId: string
): Promise<void> => {
  try {
    const docRef = doc(db, CHIPS_COLLECTION, chipId);
    
    const updateData: any = {
      ...chipData,
      holderName,
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    };
    
    if (chipData.expiresAt) {
      updateData.expiresAt = Timestamp.fromDate(chipData.expiresAt);
    }
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Chyba při aktualizaci čipu:', error);
    throw error;
  }
};

export const deleteChip = async (chipId: string): Promise<void> => {
  try {
    const docRef = doc(db, CHIPS_COLLECTION, chipId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Chyba při mazání čipu:', error);
    throw error;
  }
};

// ============= EXTERNAL PERSONS =============

export const getAllExternalPersons = async (): Promise<ExternalPerson[]> => {
  try {
    const q = query(
      collection(db, EXTERNAL_PERSONS_COLLECTION),
      orderBy('lastName')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        organization: data.organization,
        note: data.note,
        isActive: data.isActive,
        createdAt: data.createdAt?.toDate() || new Date(),
        createdBy: data.createdBy,
        updatedAt: data.updatedAt?.toDate() || new Date(),
        updatedBy: data.updatedBy,
      };
    });
  } catch (error) {
    console.error('Chyba při načítání externích osob:', error);
    throw error;
  }
};

export const getExternalPersonById = async (
  personId: string
): Promise<ExternalPerson | null> => {
  try {
    const docRef = doc(db, EXTERNAL_PERSONS_COLLECTION, personId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      organization: data.organization,
      note: data.note,
      isActive: data.isActive,
      createdAt: data.createdAt?.toDate() || new Date(),
      createdBy: data.createdBy,
      updatedAt: data.updatedAt?.toDate() || new Date(),
      updatedBy: data.updatedBy,
    };
  } catch (error) {
    console.error('Chyba při načítání externí osoby:', error);
    throw error;
  }
};

export const createExternalPerson = async (
  personData: UpsertExternalPerson,
  userId: string
): Promise<string> => {
  try {
    const newDocRef = doc(collection(db, EXTERNAL_PERSONS_COLLECTION));
    const now = Timestamp.now();
    
    await setDoc(newDocRef, {
      ...personData,
      createdAt: now,
      createdBy: userId,
      updatedAt: now,
      updatedBy: userId,
    });
    
    return newDocRef.id;
  } catch (error) {
    console.error('Chyba při vytváření externí osoby:', error);
    throw error;
  }
};

export const updateExternalPerson = async (
  personId: string,
  personData: UpsertExternalPerson,
  userId: string
): Promise<void> => {
  try {
    const docRef = doc(db, EXTERNAL_PERSONS_COLLECTION, personId);
    
    await updateDoc(docRef, {
      ...personData,
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    });
  } catch (error) {
    console.error('Chyba při aktualizaci externí osoby:', error);
    throw error;
  }
};

export const deleteExternalPerson = async (personId: string): Promise<void> => {
  try {
    // Kontrola, zda osoba nemá přiřazené čipy
    const chipsQuery = query(
      collection(db, CHIPS_COLLECTION),
      where('holderType', '==', 'external'),
      where('holderId', '==', personId)
    );
    const chipsSnapshot = await getDocs(chipsQuery);
    
    if (!chipsSnapshot.empty) {
      throw new Error('Nelze smazat osobu, která má přiřazené čipy. Nejprve smažte všechny čipy.');
    }
    
    const docRef = doc(db, EXTERNAL_PERSONS_COLLECTION, personId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Chyba při mazání externí osoby:', error);
    throw error;
  }
};

// ============= STATISTICS =============

export const getAccessStats = async (): Promise<AccessStats> => {
  try {
    const [chips, zones] = await Promise.all([
      getAllChips(),
      getAllZones(),
    ]);
    
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return {
      totalChips: chips.length,
      activeChips: chips.filter(c => c.isActive).length,
      totalZones: zones.length,
      activeZones: zones.filter(z => z.isActive).length,
      memberChips: chips.filter(c => c.holderType === 'member').length,
      externalChips: chips.filter(c => c.holderType === 'external').length,
      expiringChips: chips.filter(
        c => c.expiresAt && c.expiresAt <= thirtyDaysFromNow && c.expiresAt >= now
      ).length,
    };
  } catch (error) {
    console.error('Chyba při načítání statistik:', error);
    throw error;
  }
};
