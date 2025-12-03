import { UserRole } from '../types/user';
import type { UserProfile } from '../types/user';

/**
 * Helper funkce pro kontrolu, zda má uživatel alespoň jednu z uvedených rolí
 */
export const hasAnyRole = (userProfile: UserProfile | null, roles: UserRole[]): boolean => {
  if (!userProfile) return false;
  return roles.some(role => userProfile.roles.includes(role));
};

/**
 * Helper funkce pro kontrolu, zda má uživatel všechny uvedené role
 */
export const hasAllRoles = (userProfile: UserProfile | null, roles: UserRole[]): boolean => {
  if (!userProfile) return false;
  return roles.every(role => userProfile.roles.includes(role));
};

/**
 * Hierarchie oprávnění pro snadnější kontrolu přístupu
 * Admin > Funkcionář > Trenér > Člen
 */
export const canAccess = (
  userProfile: UserProfile | null,
  requiredRole: UserRole
): boolean => {
  if (!userProfile) return false;

  const roles = userProfile.roles;
  
  // Admin má přístup všude
  if (roles.includes(UserRole.ASB_ADMIN)) return true;
  
  // Funkcionář má přístup kromě admin sekcí
  if (requiredRole !== UserRole.ASB_ADMIN && roles.includes(UserRole.ASB_FUNKCIONAR)) {
    return true;
  }
  
  // Trenér má přístup k trenérským a členským sekcím
  if (
    (requiredRole === UserRole.ASB_TRENER || requiredRole === UserRole.ASB_CLEN) &&
    roles.includes(UserRole.ASB_TRENER)
  ) {
    return true;
  }
  
  // Člen má přístup jen k členským sekcím
  if (requiredRole === UserRole.ASB_CLEN && roles.includes(UserRole.ASB_CLEN)) {
    return true;
  }
  
  return false;
};

/**
 * Vrací lidsky čitelný popis role
 */
export const getRoleLabel = (role: UserRole): string => {
  switch (role) {
    case UserRole.ASB_ADMIN:
      return 'Administrátor';
    case UserRole.ASB_FUNKCIONAR:
      return 'Funkcionář';
    case UserRole.ASB_TRENER:
      return 'Trenér';
    case UserRole.ASB_CLEN:
      return 'Člen';
    default:
      return role;
  }
};

/**
 * Vrací všechny dostupné role jako pole
 */
export const getAllRoles = (): UserRole[] => {
  return Object.values(UserRole);
};

/**
 * Vrací barvu pro zobrazení role v UI (pro Chip komponenty apod.)
 */
export const getRoleColor = (role: UserRole): 'error' | 'warning' | 'info' | 'success' => {
  switch (role) {
    case UserRole.ASB_ADMIN:
      return 'error';
    case UserRole.ASB_FUNKCIONAR:
      return 'warning';
    case UserRole.ASB_TRENER:
      return 'info';
    case UserRole.ASB_CLEN:
      return 'success';
    default:
      return 'info';
  }
};
