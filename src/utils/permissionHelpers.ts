import { UserRole } from '../types/user';
import {
  AccessLevel,
  PageId,
  PageMetadata,
  RolePermission,
  UserPermission,
  EffectivePermission,
} from '../types/permission';

// Definice všech stránek v aplikaci
export const PAGE_METADATA: Record<PageId, PageMetadata> = {
  [PageId.DASHBOARD]: {
    id: PageId.DASHBOARD,
    name: 'Dashboard',
    description: 'Hlavní stránka s přehledem',
    path: '/dashboard',
    category: 'system',
    defaultAccessLevel: AccessLevel.READ,
  },
  [PageId.USER_MANAGEMENT]: {
    id: PageId.USER_MANAGEMENT,
    name: 'Správa uživatelů',
    description: 'Správa uživatelských účtů a rolí',
    path: '/users',
    category: 'system',
    defaultAccessLevel: AccessLevel.NONE,
  },
  [PageId.MEMBERS]: {
    id: PageId.MEMBERS,
    name: 'Členové oddílu',
    description: 'Správa členů atletického oddílu',
    path: '/members',
    category: 'member',
    defaultAccessLevel: AccessLevel.READ,
  },
  [PageId.ACCESS_DASHBOARD]: {
    id: PageId.ACCESS_DASHBOARD,
    name: 'Docházka',
    description: 'Správa docházky a přístupů',
    path: '/access',
    category: 'access',
    defaultAccessLevel: AccessLevel.READ,
  },
  [PageId.ZONES]: {
    id: PageId.ZONES,
    name: 'Zóny',
    description: 'Správa přístupových zón',
    path: '/zones',
    category: 'access',
    defaultAccessLevel: AccessLevel.NONE,
  },
  [PageId.CHIPS]: {
    id: PageId.CHIPS,
    name: 'Čipy',
    description: 'Správa přístupových čipů',
    path: '/chips',
    category: 'access',
    defaultAccessLevel: AccessLevel.NONE,
  },
  [PageId.EXTERNAL_PERSONS]: {
    id: PageId.EXTERNAL_PERSONS,
    name: 'Externí osoby',
    description: 'Správa externích osob s přístupem',
    path: '/external-persons',
    category: 'access',
    defaultAccessLevel: AccessLevel.NONE,
  },
  [PageId.TRAINING_GROUPS]: {
    id: PageId.TRAINING_GROUPS,
    name: 'Tréninkové skupiny',
    description: 'Správa tréninkových skupin',
    path: '/training-groups',
    category: 'training',
    defaultAccessLevel: AccessLevel.READ,
  },
  [PageId.TRAINING_PLANS]: {
    id: PageId.TRAINING_PLANS,
    name: 'Tréninkové plány',
    description: 'Plánování a správa tréninků',
    path: '/training-plans',
    category: 'training',
    defaultAccessLevel: AccessLevel.READ,
  },
  [PageId.ATTENDANCE_STATS]: {
    id: PageId.ATTENDANCE_STATS,
    name: 'Statistiky docházky',
    description: 'Detailní statistiky docházky na tréninky',
    path: '/attendance-stats',
    category: 'training',
    defaultAccessLevel: AccessLevel.READ,
  },
  [PageId.MEMBER_DASHBOARD]: {
    id: PageId.MEMBER_DASHBOARD,
    name: 'Dashboard člena',
    description: 'Osobní dashboard pro členy',
    path: '/member-dashboard',
    category: 'member',
    defaultAccessLevel: AccessLevel.READ,
  },
  [PageId.PERMISSIONS]: {
    id: PageId.PERMISSIONS,
    name: 'Správa oprávnění',
    description: 'Centralizovaná správa přístupových oprávnění',
    path: '/permissions',
    category: 'system',
    defaultAccessLevel: AccessLevel.NONE,
  },
};

// Získat všechny stránky podle kategorie
export const getPagesByCategory = (
  category: 'system' | 'access' | 'training' | 'member'
): PageMetadata[] => {
  return Object.values(PAGE_METADATA).filter((page) => page.category === category);
};

// Získat všechny stránky
export const getAllPages = (): PageMetadata[] => {
  return Object.values(PAGE_METADATA);
};

// Priorita úrovní přístupu (pro určení nejvyšší úrovně)
const ACCESS_LEVEL_PRIORITY: Record<AccessLevel, number> = {
  [AccessLevel.NONE]: 0,
  [AccessLevel.READ]: 1,
  [AccessLevel.READ_WRITE]: 2,
  [AccessLevel.FULL]: 3,
};

// Porovnat úrovně přístupu
export const compareAccessLevels = (level1: AccessLevel, level2: AccessLevel): number => {
  return ACCESS_LEVEL_PRIORITY[level1] - ACCESS_LEVEL_PRIORITY[level2];
};

// Získat nejvyšší úroveň přístupu
export const getHighestAccessLevel = (levels: AccessLevel[]): AccessLevel => {
  if (levels.length === 0) return AccessLevel.NONE;
  return levels.reduce((highest, current) =>
    compareAccessLevels(current, highest) > 0 ? current : highest
  );
};

// Vypočítat efektivní oprávnění pro uživatele
export const calculateEffectivePermission = (
  pageId: PageId,
  userRoles: UserRole[],
  rolePermissions: RolePermission[],
  userPermissions: UserPermission[]
): EffectivePermission => {
  // Najít oprávnění z rolí
  const relevantRolePermissions = rolePermissions.filter(
    (rp) => rp.pageId === pageId && userRoles.includes(rp.roleId)
  );

  // Najít uživatelské oprávnění
  const userPermission = userPermissions.find((up) => up.pageId === pageId);

  // Pokud existuje uživatelské oprávnění a má overridesRole = true, použít ho
  if (userPermission && userPermission.overridesRole) {
    return {
      pageId,
      accessLevel: userPermission.accessLevel,
      source: 'USER',
      rolePermissions: relevantRolePermissions,
      userPermission,
    };
  }

  // Jinak vzít nejvyšší úroveň z rolí
  const roleLevels = relevantRolePermissions.map((rp) => rp.accessLevel);
  const highestRoleLevel = getHighestAccessLevel(roleLevels);

  // Pokud existuje uživatelské oprávnění bez override, vzít vyšší z obou
  if (userPermission) {
    const finalLevel = compareAccessLevels(userPermission.accessLevel, highestRoleLevel) > 0
      ? userPermission.accessLevel
      : highestRoleLevel;

    return {
      pageId,
      accessLevel: finalLevel,
      source: 'BOTH',
      rolePermissions: relevantRolePermissions,
      userPermission,
    };
  }

  // Pouze oprávnění z rolí
  return {
    pageId,
    accessLevel: highestRoleLevel,
    source: 'ROLE',
    rolePermissions: relevantRolePermissions,
  };
};

// Zkontrolovat, zda má uživatel alespoň určitou úroveň přístupu
export const hasAccessLevel = (
  effectivePermission: EffectivePermission,
  requiredLevel: AccessLevel
): boolean => {
  return compareAccessLevels(effectivePermission.accessLevel, requiredLevel) >= 0;
};

// Label pro úroveň přístupu
export const getAccessLevelLabel = (level: AccessLevel): string => {
  switch (level) {
    case AccessLevel.NONE:
      return 'Žádný přístup';
    case AccessLevel.READ:
      return 'Čtení';
    case AccessLevel.READ_WRITE:
      return 'Čtení a zápis';
    case AccessLevel.FULL:
      return 'Plný přístup';
    default:
      return level;
  }
};

// Barva pro úroveň přístupu (pro chipsy)
export const getAccessLevelColor = (
  level: AccessLevel
): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
  switch (level) {
    case AccessLevel.NONE:
      return 'default';
    case AccessLevel.READ:
      return 'info';
    case AccessLevel.READ_WRITE:
      return 'warning';
    case AccessLevel.FULL:
      return 'success';
    default:
      return 'default';
  }
};

// Label pro roli
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

// Barva pro roli
export const getRoleColor = (
  role: UserRole
): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
  switch (role) {
    case UserRole.ASB_ADMIN:
      return 'error';
    case UserRole.ASB_FUNKCIONAR:
      return 'primary';
    case UserRole.ASB_TRENER:
      return 'secondary';
    case UserRole.ASB_CLEN:
      return 'default';
    default:
      return 'default';
  }
};
