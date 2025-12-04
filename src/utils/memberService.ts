import { 
  doc, 
  getDoc, 
  setDoc, 
  collection,
  getDocs,
  Timestamp,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Member, MemberMetadata, MemberWithMetadata, UpdateMemberMetadata, MembersApiResponse } from '../types/member';

const MEMBERS_METADATA_COLLECTION = 'membersMetadata';
const API_URL = 'https://is.atletika.cz/Members/MembersList/List/';

// CORS proxy - pro produkci doporučuji vlastní backend řešení
const CORS_PROXY = 'https://corsproxy.io/?';

// Načtení členů z API Atletika.cz přes CORS proxy
export const fetchMembersFromAPI = async (): Promise<Member[]> => {
  try {
    const params = new URLSearchParams({
      club: '223',
      searchText: '',
      searchTextType: 'All',
      jeMuz: '',
      advancedFilterBornFrom: '',
      advancedFilterBornTo: '',
      memberAuthorization: 'Default',
      advancedFilterFrom: '',
      advancedFilterTo: '',
      advancedFilterType: 'DateRegistered',
      coachClass: 'Default',
      coachType: 'Default',
      idTrenerRSC: '',
      judgeClass: 'Default',
      memberInclusion: 'Default',
      memberInclusionAuthorization: 'Default',
      idSg: '',
      idRsc: '',
      repreMemberFrom: '',
      repreMemberTo: '',
      repreContractFrom: '',
      repreContractTo: '',
      repreSpecializace: 'None',
      selectedMembers: '',
      cs: 'true',
      clear: 'false',
      section: 'personal',
      take: '1000',
      skip: '0',
      page: '1',
      pageSize: '1000',
      'sort[0][field]': 'Jmeno',
      'sort[0][dir]': 'asc',
    });

    const targetUrl = `${API_URL}?${params.toString()}`;
    const response = await fetch(`${CORS_PROXY}${encodeURIComponent(targetUrl)}`);
    
    if (!response.ok) {
      throw new Error('Nepodařilo se načíst členy z API');
    }

    const apiResponse: MembersApiResponse = await response.json();
    console.log("🚀 ~ fetchMembersFromAPI ~ apiResponse:", apiResponse);
    
    // Data jsou v poli "Data" (s velkým D)
    return apiResponse.data || [];
  } catch (error) {
    console.error('Chyba při načítání členů z API:', error);
    throw error;
  }
};

// Načtení metadat člena z Firebase
export const getMemberMetadata = async (memberId: number): Promise<MemberMetadata | null> => {
  try {
    const docRef = doc(db, MEMBERS_METADATA_COLLECTION, memberId.toString());
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      memberId: data.memberId,
      email: data.email,
      phone: data.phone,
      notes: data.notes,
      customFields: data.customFields,
      updatedAt: data.updatedAt?.toDate() || new Date(),
      updatedBy: data.updatedBy,
    };
  } catch (error) {
    console.error('Chyba při načítání metadat člena:', error);
    return null;
  }
};

// Načtení všech metadat z Firebase
export const getAllMembersMetadata = async (): Promise<Map<number, MemberMetadata>> => {
  try {
    const querySnapshot = await getDocs(collection(db, MEMBERS_METADATA_COLLECTION));
    const metadataMap = new Map<number, MemberMetadata>();

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      metadataMap.set(data.memberId, {
        memberId: data.memberId,
        email: data.email,
        phone: data.phone,
        notes: data.notes,
        customFields: data.customFields,
        updatedAt: data.updatedAt?.toDate() || new Date(),
        updatedBy: data.updatedBy,
      });
    });

    return metadataMap;
  } catch (error) {
    console.error('Chyba při načítání metadat členů:', error);
    return new Map();
  }
};

// Uložení/aktualizace metadat člena
export const saveMemberMetadata = async (
  memberId: number,
  metadata: UpdateMemberMetadata,
  userId: string
): Promise<void> => {
  try {
    const docRef = doc(db, MEMBERS_METADATA_COLLECTION, memberId.toString());
    
    // Připravíme data a odstraníme undefined hodnoty
    const dataToSave: Record<string, any> = {
      memberId,
      updatedAt: Timestamp.fromDate(new Date()),
      updatedBy: userId,
    };

    // Přidáme pouze definované hodnoty
    if (metadata.email !== undefined) dataToSave.email = metadata.email;
    if (metadata.phone !== undefined) dataToSave.phone = metadata.phone;
    if (metadata.notes !== undefined) dataToSave.notes = metadata.notes;
    if (metadata.customFields !== undefined) dataToSave.customFields = metadata.customFields;

    await setDoc(docRef, dataToSave, { merge: true });
  } catch (error) {
    console.error('Chyba při ukládání metadat člena:', error);
    throw error;
  }
};

// Kombinování dat z API s metadaty z Firebase
export const getMembersWithMetadata = async (): Promise<MemberWithMetadata[]> => {
  try {
    const [members, metadataMap] = await Promise.all([
      fetchMembersFromAPI(),
      getAllMembersMetadata(),
    ]);

    return members.map((member) => ({
      ...member,
      metadata: metadataMap.get(member.Id),
    }));
  } catch (error) {
    console.error('Chyba při načítání členů s metadaty:', error);
    throw error;
  }
};

// Načtení členského záznamu podle Firebase Auth UID
export const getMemberByUserId = async (uid: string): Promise<number | null> => {
  try {
    const q = query(
      collection(db, MEMBERS_METADATA_COLLECTION),
      where('uid', '==', uid),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    return parseInt(querySnapshot.docs[0].id);
  } catch (error) {
    console.error('Chyba při načítání člena podle UID:', error);
    return null;
  }
};

// Načtení celého jména člena podle member ID
export const getMemberFullName = async (memberId: number): Promise<string | null> => {
  try {
    const members = await fetchMembersFromAPI();
    const member = members.find(m => m.Id === memberId);
    
    if (!member) {
      return null;
    }
    
    return member.CeleJmeno;
  } catch (error) {
    console.error('Chyba při načítání jména člena:', error);
    return null;
  }
};

// Propojení Firebase Auth uživatele s členem
export const linkUserToMember = async (
  uid: string,
  memberId: number,
  userId: string
): Promise<void> => {
  try {
    const docRef = doc(db, MEMBERS_METADATA_COLLECTION, memberId.toString());
    await setDoc(
      docRef,
      {
        memberId,
        uid,
        updatedAt: Timestamp.fromDate(new Date()),
        updatedBy: userId,
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Chyba při propojování uživatele s členem:', error);
    throw error;
  }
};

// Kontrola, zda je člen již propojený s uživatelským účtem
export const isMemberLinked = async (memberId: number): Promise<boolean> => {
  try {
    const docRef = doc(db, MEMBERS_METADATA_COLLECTION, memberId.toString());
    const docSnap = await getDoc(docRef);
    return docSnap.exists() && !!docSnap.data()?.uid;
  } catch (error) {
    console.error('Chyba při kontrole propojení člena:', error);
    return false;
  }
};
