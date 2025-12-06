import { UserRole } from './user';

// Úrovně přístupu
export enum AccessLevel {
  NONE = 'NONE',           // Žádný přístup
  READ = 'READ',           // Pouze čtení
  READ_WRITE = 'READ_WRITE', // Čtení a zápis
  FULL = 'FULL',           // Plný přístup (včetně mazání)
}

// Identifikátory stránek/modulů
export enum PageId {
  DASHBOARD = 'DASHBOARD',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  MEMBERS = 'MEMBERS',
  ACCESS_DASHBOARD = 'ACCESS_DASHBOARD',
  ZONES = 'ZONES',
  CHIPS = 'CHIPS',
  EXTERNAL_PERSONS = 'EXTERNAL_PERSONS',
  TRAINING_GROUPS = 'TRAINING_GROUPS',
  TRAINING_PLANS = 'TRAINING_PLANS',
  ATTENDANCE_STATS = 'ATTENDANCE_STATS',
  MEMBER_DASHBOARD = 'MEMBER_DASHBOARD',
  PERMISSIONS = 'PERMISSIONS',
}

// Metadata o stránce
export interface PageMetadata {
  id: PageId;
  name: string;
  description: string;
  path: string;
  category: 'system' | 'access' | 'training' | 'member';
  defaultAccessLevel: AccessLevel;
}

// Oprávnění na úrovni role
export interface RolePermission {
  roleId: UserRole;
  pageId: PageId;
  accessLevel: AccessLevel;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

// Oprávnění na úrovni uživatele (override role permission)
export interface UserPermission {
  id?: string;
  userId: string;
  pageId: PageId;
  accessLevel: AccessLevel;
  overridesRole: boolean; // Zda toto oprávnění přebíjí oprávnění z role
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

// Audit log pro sledování změn
export interface PermissionAuditLog {
  id: string;
  timestamp: Date;
  adminId: string;
  adminEmail: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  targetType: 'USER' | 'ROLE';
  targetId: string; // userId nebo roleId
  pageId: PageId;
  oldAccessLevel?: AccessLevel;
  newAccessLevel: AccessLevel;
  reason?: string;
}

// Computed effective permission pro uživatele
export interface EffectivePermission {
  pageId: PageId;
  accessLevel: AccessLevel;
  source: 'ROLE' | 'USER' | 'BOTH';
  rolePermissions: RolePermission[];
  userPermission?: UserPermission;
}
