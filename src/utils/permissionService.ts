import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { UserRole } from '../types/user';
import type {
  RolePermission,
  UserPermission,
  PermissionAuditLog,
  PageId,
} from '../types/permission';
import { AccessLevel } from '../types/permission';

const ROLE_PERMISSIONS_COLLECTION = 'rolePermissions';
const USER_PERMISSIONS_COLLECTION = 'userPermissions';
const PERMISSION_AUDIT_COLLECTION = 'permissionAudit';

// Převod Firestore dat na TypeScript typ - Role Permission
const mapFirestoreToRolePermission = (data: any): RolePermission => {
  return {
    roleId: data.roleId as UserRole,
    pageId: data.pageId as PageId,
    accessLevel: data.accessLevel as AccessLevel,
    createdAt: data.createdAt?.toDate() || new Date(),
    createdBy: data.createdBy || '',
    updatedAt: data.updatedAt?.toDate() || new Date(),
    updatedBy: data.updatedBy || '',
  };
};

// Převod Firestore dat na TypeScript typ - User Permission
const mapFirestoreToUserPermission = (id: string, data: any): UserPermission => {
  return {
    id,
    userId: data.userId || '',
    pageId: data.pageId as PageId,
    accessLevel: data.accessLevel as AccessLevel,
    overridesRole: data.overridesRole || false,
    createdAt: data.createdAt?.toDate() || new Date(),
    createdBy: data.createdBy || '',
    updatedAt: data.updatedAt?.toDate() || new Date(),
    updatedBy: data.updatedBy || '',
  };
};

// Převod Firestore dat na TypeScript typ - Audit Log
const mapFirestoreToAuditLog = (id: string, data: any): PermissionAuditLog => {
  return {
    id,
    timestamp: data.timestamp?.toDate() || new Date(),
    adminId: data.adminId || '',
    adminEmail: data.adminEmail || '',
    action: data.action,
    targetType: data.targetType,
    targetId: data.targetId || '',
    pageId: data.pageId as PageId,
    oldAccessLevel: data.oldAccessLevel as AccessLevel | undefined,
    newAccessLevel: data.newAccessLevel as AccessLevel,
    reason: data.reason,
  };
};

// ============= ROLE PERMISSIONS =============

// Získat všechna oprávnění rolí
export const getAllRolePermissions = async (): Promise<RolePermission[]> => {
  const snapshot = await getDocs(collection(db, ROLE_PERMISSIONS_COLLECTION));
  return snapshot.docs.map((doc) => mapFirestoreToRolePermission(doc.data()));
};

// Získat oprávnění pro konkrétní roli
export const getRolePermissions = async (roleId: UserRole): Promise<RolePermission[]> => {
  const q = query(
    collection(db, ROLE_PERMISSIONS_COLLECTION),
    where('roleId', '==', roleId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => mapFirestoreToRolePermission(doc.data()));
};

// Nastavit oprávnění pro roli a stránku
export const setRolePermission = async (
  roleId: UserRole,
  pageId: PageId,
  accessLevel: AccessLevel,
  adminId: string,
  adminEmail: string
): Promise<void> => {
  const docId = `${roleId}_${pageId}`;
  const docRef = doc(db, ROLE_PERMISSIONS_COLLECTION, docId);

  // Získat staré oprávnění pro audit
  const oldDoc = await getDoc(docRef);
  const oldAccessLevel = oldDoc.exists()
    ? (oldDoc.data().accessLevel as AccessLevel)
    : undefined;

  const now = Timestamp.now();
  const isNew = !oldDoc.exists();

  await setDoc(docRef, {
    roleId,
    pageId,
    accessLevel,
    createdAt: isNew ? now : oldDoc.data()?.createdAt || now,
    createdBy: isNew ? adminId : oldDoc.data()?.createdBy || adminId,
    updatedAt: now,
    updatedBy: adminId,
  });

  // Zaznamenat do audit logu
  await logPermissionChange({
    timestamp: new Date(),
    adminId,
    adminEmail,
    action: isNew ? 'CREATE' : 'UPDATE',
    targetType: 'ROLE',
    targetId: roleId,
    pageId,
    oldAccessLevel,
    newAccessLevel: accessLevel,
  });
};

// Smazat oprávnění role
export const deleteRolePermission = async (
  roleId: UserRole,
  pageId: PageId,
  adminId: string,
  adminEmail: string
): Promise<void> => {
  const docId = `${roleId}_${pageId}`;
  const docRef = doc(db, ROLE_PERMISSIONS_COLLECTION, docId);

  // Získat staré oprávnění pro audit
  const oldDoc = await getDoc(docRef);
  const oldAccessLevel = oldDoc.exists()
    ? (oldDoc.data().accessLevel as AccessLevel)
    : undefined;

  await deleteDoc(docRef);

  // Zaznamenat do audit logu
  await logPermissionChange({
    timestamp: new Date(),
    adminId,
    adminEmail,
    action: 'DELETE',
    targetType: 'ROLE',
    targetId: roleId,
    pageId,
    oldAccessLevel,
    newAccessLevel: AccessLevel.NONE,
  });
};

// ============= USER PERMISSIONS =============

// Získat všechna uživatelská oprávnění
export const getAllUserPermissions = async (): Promise<UserPermission[]> => {
  const snapshot = await getDocs(collection(db, USER_PERMISSIONS_COLLECTION));
  return snapshot.docs.map((doc) => mapFirestoreToUserPermission(doc.id, doc.data()));
};

// Získat oprávnění pro konkrétního uživatele
export const getUserPermissions = async (userId: string): Promise<UserPermission[]> => {
  const q = query(
    collection(db, USER_PERMISSIONS_COLLECTION),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => mapFirestoreToUserPermission(doc.id, doc.data()));
};

// Nastavit oprávnění pro uživatele
export const setUserPermission = async (
  userId: string,
  pageId: PageId,
  accessLevel: AccessLevel,
  overridesRole: boolean,
  adminId: string,
  adminEmail: string
): Promise<void> => {
  const docId = `${userId}_${pageId}`;
  const docRef = doc(db, USER_PERMISSIONS_COLLECTION, docId);

  // Získat staré oprávnění pro audit
  const oldDoc = await getDoc(docRef);
  const oldAccessLevel = oldDoc.exists()
    ? (oldDoc.data().accessLevel as AccessLevel)
    : undefined;

  const now = Timestamp.now();
  const isNew = !oldDoc.exists();

  await setDoc(docRef, {
    userId,
    pageId,
    accessLevel,
    overridesRole,
    createdAt: isNew ? now : oldDoc.data()?.createdAt || now,
    createdBy: isNew ? adminId : oldDoc.data()?.createdBy || adminId,
    updatedAt: now,
    updatedBy: adminId,
  });

  // Zaznamenat do audit logu
  await logPermissionChange({
    timestamp: new Date(),
    adminId,
    adminEmail,
    action: isNew ? 'CREATE' : 'UPDATE',
    targetType: 'USER',
    targetId: userId,
    pageId,
    oldAccessLevel,
    newAccessLevel: accessLevel,
  });
};

// Smazat uživatelské oprávnění
export const deleteUserPermission = async (
  userId: string,
  pageId: PageId,
  adminId: string,
  adminEmail: string
): Promise<void> => {
  const docId = `${userId}_${pageId}`;
  const docRef = doc(db, USER_PERMISSIONS_COLLECTION, docId);

  // Získat staré oprávnění pro audit
  const oldDoc = await getDoc(docRef);
  const oldAccessLevel = oldDoc.exists()
    ? (oldDoc.data().accessLevel as AccessLevel)
    : undefined;

  await deleteDoc(docRef);

  // Zaznamenat do audit logu
  await logPermissionChange({
    timestamp: new Date(),
    adminId,
    adminEmail,
    action: 'DELETE',
    targetType: 'USER',
    targetId: userId,
    pageId,
    oldAccessLevel,
    newAccessLevel: AccessLevel.NONE,
  });
};

// Smazat všechna oprávnění uživatele (např. při smazání účtu)
export const deleteAllUserPermissions = async (
  userId: string,
  adminId: string,
  adminEmail: string
): Promise<void> => {
  const permissions = await getUserPermissions(userId);
  const batch = writeBatch(db);

  permissions.forEach((perm) => {
    const docId = `${userId}_${perm.pageId}`;
    const docRef = doc(db, USER_PERMISSIONS_COLLECTION, docId);
    batch.delete(docRef);
  });

  await batch.commit();

  // Zaznamenat hromadné smazání do audit logu
  for (const perm of permissions) {
    await logPermissionChange({
      timestamp: new Date(),
      adminId,
      adminEmail,
      action: 'DELETE',
      targetType: 'USER',
      targetId: userId,
      pageId: perm.pageId,
      oldAccessLevel: perm.accessLevel,
      newAccessLevel: AccessLevel.NONE,
      reason: 'Bulk delete - user account removal',
    });
  }
};

// ============= AUDIT LOG =============

// Zaznamenat změnu oprávnění do audit logu
const logPermissionChange = async (
  log: Omit<PermissionAuditLog, 'id'>
): Promise<void> => {
  const colRef = collection(db, PERMISSION_AUDIT_COLLECTION);
  const docRef = doc(colRef);

  await setDoc(docRef, {
    timestamp: Timestamp.fromDate(log.timestamp),
    adminId: log.adminId,
    adminEmail: log.adminEmail,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    pageId: log.pageId,
    oldAccessLevel: log.oldAccessLevel || null,
    newAccessLevel: log.newAccessLevel,
    reason: log.reason || null,
  });
};

// Získat audit log (s limitem)
export const getPermissionAuditLog = async (
  limit: number = 100
): Promise<PermissionAuditLog[]> => {
  const snapshot = await getDocs(collection(db, PERMISSION_AUDIT_COLLECTION));
  const logs = snapshot.docs.map((doc) => mapFirestoreToAuditLog(doc.id, doc.data()));

  // Seřadit podle času (nejnovější první) a omezit
  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
};

// Získat audit log pro konkrétního uživatele
export const getUserAuditLog = async (
  userId: string,
  limit: number = 50
): Promise<PermissionAuditLog[]> => {
  const q = query(
    collection(db, PERMISSION_AUDIT_COLLECTION),
    where('targetId', '==', userId)
  );
  const snapshot = await getDocs(q);
  const logs = snapshot.docs.map((doc) => mapFirestoreToAuditLog(doc.id, doc.data()));

  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
};

// Získat audit log pro konkrétní roli
export const getRoleAuditLog = async (
  roleId: UserRole,
  limit: number = 50
): Promise<PermissionAuditLog[]> => {
  const q = query(
    collection(db, PERMISSION_AUDIT_COLLECTION),
    where('targetId', '==', roleId)
  );
  const snapshot = await getDocs(q);
  const logs = snapshot.docs.map((doc) => mapFirestoreToAuditLog(doc.id, doc.data()));

  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
};
