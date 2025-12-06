# Systém správy oprávnění

Komplexní systém pro centralizovanou správu přístupových práv v aplikaci ASB Dashboard.

## Funkce

### 1. Správa oprávnění podle rolí
- Definice oprávnění pro celé role (ASB_ADMIN, ASB_FUNKCIONAR, ASB_TRENER, ASB_CLEN)
- Úrovně přístupu: Žádný, Čtení, Čtení a zápis, Plný přístup
- Změny se automaticky aplikují na všechny uživatele s danou rolí
- Organizace stránek podle kategorií (Systémové, Přístupy, Tréninky, Členové)

### 2. Správa oprávnění podle uživatelů
- Individuální oprávnění pro konkrétní uživatele
- Možnost přebít oprávnění z rolí
- Vyhledávání uživatelů podle emailu nebo jména
- Zobrazení efektivních oprávnění (kombinace role + uživatelské)

### 3. Historie změn (Audit Log)
- Kompletní záznam všech změn oprávnění
- Informace: kdo, kdy, co změnil
- Filtrování a vyhledávání v historii
- Podpora pro audit a compliance

## Úrovně přístupu

| Úroveň | Popis | Oprávnění |
|--------|-------|-----------|
| **NONE** | Žádný přístup | Uživatel nemá přístup ke stránce |
| **READ** | Čtení | Pouze prohlížení dat |
| **READ_WRITE** | Čtení a zápis | Prohlížení a úprava dat |
| **FULL** | Plný přístup | Všechna oprávnění včetně mazání |

## Priority oprávnění

1. **Uživatelské oprávnění s přebíjením** (overridesRole = true)
   - Má nejvyšší prioritu
   - Ignoruje oprávnění z rolí
   
2. **Nejvyšší úroveň z rolí**
   - Pokud má uživatel více rolí, použije se nejvyšší úroveň
   
3. **Kombinace role + uživatelské** (overridesRole = false)
   - Použije se vyšší z obou

## Bezpečnostní opatření

### 1. Ochrana admin účtu
- Admin nemůže sám sobě odebrat admin oprávnění
- Kontrola na úrovni UI i backend

### 2. Validace na backendu
- Všechny změny oprávnění jsou validovány v Firestore Security Rules
- Pouze admin může měnit oprávnění

### 3. Audit trail
- Každá změna je zaznamenána
- Nelze smazat historii změn

## Struktura dat

### RolePermission
```typescript
{
  roleId: UserRole;           // Role, pro kterou platí
  pageId: PageId;            // Stránka
  accessLevel: AccessLevel;  // Úroveň přístupu
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}
```

### UserPermission
```typescript
{
  userId: string;            // ID uživatele
  pageId: PageId;           // Stránka
  accessLevel: AccessLevel; // Úroveň přístupu
  overridesRole: boolean;   // Přebíjí oprávnění z rolí?
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}
```

### PermissionAuditLog
```typescript
{
  timestamp: Date;
  adminId: string;
  adminEmail: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  targetType: 'USER' | 'ROLE';
  targetId: string;
  pageId: PageId;
  oldAccessLevel?: AccessLevel;
  newAccessLevel: AccessLevel;
  reason?: string;
}
```

## Firestore kolekce

- `rolePermissions` - Oprávnění podle rolí
  - Document ID: `{roleId}_{pageId}`
  
- `userPermissions` - Oprávnění podle uživatelů
  - Document ID: `{userId}_{pageId}`
  
- `permissionAudit` - Historie změn
  - Auto-generované ID

## Použití v kódu

### Výpočet efektivních oprávnění
```typescript
import { calculateEffectivePermission } from '../utils/permissionHelpers';

const effective = calculateEffectivePermission(
  pageId,
  userRoles,
  rolePermissions,
  userPermissions
);

console.log(effective.accessLevel); // FULL, READ_WRITE, READ, NONE
console.log(effective.source);      // ROLE, USER, BOTH
```

### Kontrola přístupu
```typescript
import { hasAccessLevel, AccessLevel } from '../utils/permissionHelpers';

if (hasAccessLevel(effective, AccessLevel.READ_WRITE)) {
  // Uživatel může číst i zapisovat
}
```

## API funkce

### Role Permissions
- `getAllRolePermissions()` - Načíst všechna oprávnění rolí
- `getRolePermissions(roleId)` - Načíst oprávnění pro konkrétní roli
- `setRolePermission(roleId, pageId, accessLevel, adminId, adminEmail)` - Nastavit oprávnění
- `deleteRolePermission(roleId, pageId, adminId, adminEmail)` - Smazat oprávnění

### User Permissions
- `getAllUserPermissions()` - Načíst všechna uživatelská oprávnění
- `getUserPermissions(userId)` - Načíst oprávnění pro konkrétního uživatele
- `setUserPermission(userId, pageId, accessLevel, overridesRole, adminId, adminEmail)` - Nastavit oprávnění
- `deleteUserPermission(userId, pageId, adminId, adminEmail)` - Smazat oprávnění
- `deleteAllUserPermissions(userId, adminId, adminEmail)` - Smazat všechna oprávnění uživatele

### Audit Log
- `getPermissionAuditLog(limit)` - Načíst historii změn
- `getUserAuditLog(userId, limit)` - Historie pro konkrétního uživatele
- `getRoleAuditLog(roleId, limit)` - Historie pro konkrétní roli

## Přístup ke stránce

Stránka je dostupná pouze pro administrátory na URL: `/permissions`

V navigačním menu se zobrazuje jako "Správa oprávnění" s ikonou `AdminPanelSettings`.

## Best Practices

1. **Preferujte oprávnění podle rolí**
   - Snadnější správa
   - Méně záznamů v databázi
   
2. **Uživatelská oprávnění pouze pro výjimky**
   - Použijte když konkrétní uživatel potřebuje odlišná práva
   
3. **Dokumentujte důvody změn**
   - V budoucnu bude možné přidat pole "reason" do UI
   
4. **Pravidelně kontrolujte audit log**
   - Sledujte neoprávněné změny
   - Kontrolujte konzistenci oprávnění

## Další vývoj

Možná budoucí rozšíření:
- Šablony oprávnění pro rychlé přiřazení
- Hromadná změna oprávnění
- Export/Import konfigurace
- Upozornění na neobvyklé změny
- Časově omezená oprávnění
- Detailnější granularita (např. čtení vlastních dat vs. všech dat)
