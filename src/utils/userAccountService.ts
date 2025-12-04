import { getFunctions, httpsCallable } from 'firebase/functions';
import { linkUserToMember } from './memberService';

const functions = getFunctions();

export interface CreateMemberAccountData {
  email: string;
  memberId: number;
  firstName: string;
  lastName: string;
}

export interface CreateMemberAccountResult {
  uid: string;
  email: string;
  temporaryPassword: string;
}

// Vytvoření účtu pro člena oddílu
export const createMemberAccount = async (
  data: CreateMemberAccountData,
  currentUserId: string
): Promise<CreateMemberAccountResult> => {
  try {
    // Volání Cloud Function pro vytvoření uživatele
    const createUser = httpsCallable<CreateMemberAccountData, CreateMemberAccountResult>(
      functions,
      'createMemberAccount'
    );
    
    const result = await createUser(data);
    
    // Propojení vytvořeného uživatele s členem
    await linkUserToMember(result.data.uid, data.memberId, currentUserId);
    
    return result.data;
  } catch (error: any) {
    console.error('Chyba při vytváření členského účtu:', error);
    throw new Error(error.message || 'Nepodařilo se vytvořit členský účet');
  }
};

// Resetování hesla pro členský účet
export const resetMemberPassword = async (
  uid: string
): Promise<{ temporaryPassword: string }> => {
  try {
    const resetPassword = httpsCallable<{ uid: string }, { temporaryPassword: string }>(
      functions,
      'resetMemberPassword'
    );
    
    const result = await resetPassword({ uid });
    return result.data;
  } catch (error: any) {
    console.error('Chyba při resetování hesla:', error);
    throw new Error(error.message || 'Nepodařilo se resetovat heslo');
  }
};

// Deaktivace členského účtu
export const deactivateMemberAccount = async (uid: string): Promise<void> => {
  try {
    const deactivateUser = httpsCallable<{ uid: string }, void>(
      functions,
      'deactivateMemberAccount'
    );
    
    await deactivateUser({ uid });
  } catch (error: any) {
    console.error('Chyba při deaktivaci účtu:', error);
    throw new Error(error.message || 'Nepodařilo se deaktivovat účet');
  }
};
