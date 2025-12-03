# Role a oprávnění v ASB Dashboard

## Přehled rolí

Systém obsahuje 4 typy uživatelských rolí s hierarchickým oprávněním:

### 1. ASB_ADMIN (Administrátor)
- **Nejvyšší oprávnění**
- Přístup ke všem sekcím aplikace
- Může spravovat uživatele a jejich role
- Může měnit nastavení systému
- Má přístup ke všem funkcionalitám

### 2. ASB_FUNKCIONAR (Funkcionář)
- **Rozšířená oprávnění**
- Přístup ke správě členů
- Přístup k systému přístupových čipů (zóny, čipy, externí osoby)
- Může vytvářet a upravovat členské záznamy
- Nemá přístup k uživatelské správě

### 3. ASB_TRENER (Trenér)
- **Základní rozšířená oprávnění**
- Přístup k zobrazení členů (může být omezen na vlastní skupiny)
- Přístup k tréninkovým plánům a statistikám (připraveno pro budoucí implementaci)
- Nemá přístup ke správě systému přístupů
- Nemá přístup k úpravě členských záznamů

### 4. ASB_CLEN (Člen)
- **Základní oprávnění**
- Přístup k vlastnímu profilu
- Zobrazení vlastních tréninků a výkonů (připraveno pro budoucí implementaci)
- Nemá přístup k citlivým datům ostatních členů

## Hierarchie přístupu

```
ASB_ADMIN (vše)
    ↓
ASB_FUNKCIONAR (kromě user managementu)
    ↓
ASB_TRENER (zobrazení členů, tréninky)
    ↓
ASB_CLEN (vlastní profil)
```

## Implementované komponenty

### Route Guards (ochrana tras)

Všechny route guardy nyní využívají univerzální `RoleRoute` komponentu:

1. **AdminRoute** - vyžaduje ASB_ADMIN
2. **FunkcionarRoute** - vyžaduje ASB_ADMIN nebo ASB_FUNKCIONAR
3. **TrenerRoute** - vyžaduje ASB_ADMIN, ASB_FUNKCIONAR nebo ASB_TRENER
4. **ClenRoute** - vyžaduje jakoukoli roli (přihlášený uživatel)

### Univerzální komponenta RoleRoute

Nová univerzální komponenta pro flexibilní ochranu tras:

```typescript
import RoleRoute from './components/RoleRoute';
import { UserRole } from './types/user';
import { RoleGroups } from './utils/roleHelpers';

// Přímé použití s konkrétními rolemi
<Route path="/custom" element={
  <RoleRoute allowedRoles={[UserRole.ASB_ADMIN, UserRole.ASB_TRENER]}>
    <CustomPage />
  </RoleRoute>
} />

// Použití s předpřipravenými skupinami
<Route path="/staff" element={
  <RoleRoute allowedRoles={RoleGroups.ADMIN_FUNKCIONAR}>
    <StaffPage />
  </RoleRoute>
} />

// S vlastním přesměrováním
<Route path="/premium" element={
  <RoleRoute 
    allowedRoles={[UserRole.ASB_ADMIN]}
    redirectOnDenied="/dashboard"
    showMessage={false}
  >
    <PremiumPage />
  </RoleRoute>
} />
```

### RoleGroups konstanty

Pro snadnější použití jsou k dispozici předpřipravené skupiny rolí:

```typescript
import { RoleGroups } from '../utils/roleHelpers';

RoleGroups.ADMIN_ONLY                 // [ASB_ADMIN]
RoleGroups.ADMIN_FUNKCIONAR           // [ASB_ADMIN, ASB_FUNKCIONAR]
RoleGroups.ADMIN_FUNKCIONAR_TRENER    // [ASB_ADMIN, ASB_FUNKCIONAR, ASB_TRENER]
RoleGroups.ALL_ROLES                  // [ASB_ADMIN, ASB_FUNKCIONAR, ASB_TRENER, ASB_CLEN]
```

### Použití v kódu

#### Kontrola role v komponentě
```typescript
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
  const { isAdmin, isFunkcionar, isTrener, isClen } = useAuth();
  
  return (
    <>
      {isAdmin && <AdminPanel />}
      {isFunkcionar && <FunkcionarPanel />}
      {isTrener && <TrenerPanel />}
      {isClen && <ClenPanel />}
    </>
  );
}
```

#### Ochrana trasy
```typescript
import TrenerRoute from './components/TrenerRoute';

<Route
  path="/treninky"
  element={
    <TrenerRoute>
      <TreninkyPage />
    </TrenerRoute>
  }
/>
```

#### Helper funkce
```typescript
import { canAccess, hasAnyRole, getRoleLabel } from '../utils/roleHelpers';
import { UserRole } from '../types/user';

// Kontrola hierarchického přístupu
if (canAccess(userProfile, UserRole.ASB_TRENER)) {
  // Uživatel je trenér nebo má vyšší oprávnění
}

// Kontrola konkrétních rolí
if (hasAnyRole(userProfile, [UserRole.ASB_ADMIN, UserRole.ASB_FUNKCIONAR])) {
  // Uživatel je admin nebo funkcionář
}

// Zobrazení role v UI
const label = getRoleLabel(UserRole.ASB_TRENER); // "Trenér"
```

## Přidání role uživateli

Role se přidávají při vytváření uživatele nebo v User Management sekci (pouze admin):

```typescript
// Při vytváření uživatele
await signup(email, password, displayName, [UserRole.ASB_TRENER]);

// Aktualizace rolí existującího uživatele
await updateUserProfile(uid, {
  roles: [UserRole.ASB_TRENER, UserRole.ASB_CLEN]
});
```

## Budoucí rozšíření

Připravené funkcionality pro role ASB_TRENER a ASB_CLEN:

- **Tréninky** - správa tréninků a docházky
- **Výkony** - evidence sportovních výkonů
- **Plány** - tréninkové plány
- **Profil** - detailní členský profil
- **Zprávy** - interní komunikace

Tyto funkce budou postupně implementovány s využitím existující role infrastruktury.
