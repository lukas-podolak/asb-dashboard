# Funkce pro plánování závodů

## Přehled

Aplikace nyní podporuje plánování závodů jako speciální typ tréninkové aktivity. Závody mají vlastní vizuální styl a podporují odkaz na propozice.

## Vlastnosti

### 1. Typ tréninku "Závod"

- **Enum hodnota**: `TrainingType.RACE = 'závod'`
- **Použití**: Trenéři mohou vytvořit tréninkový plán s typem "Závod"
- **Vizualizace**: 
  - 🏆 Ikona pohárů (EmojiEvents)
  - Oranžový chip s označením "Závod"
  - Výraznější barevné odlišení

### 2. Odkaz na propozice

- **Pole**: `raceProposalsUrl?: string` v `TrainingPlan` interface
- **Vstup**: Volitelné URL pole v formuláři (zobrazuje se pouze když je vybrán typ "Závod")
- **Validace**: HTML5 validace typu URL
- **Zobrazení**: Tlačítko "Zobrazit propozice" s ikonou odkazu, otevírá se v novém okně

### 3. Zobrazení pro trenéry

V komponentě `TrainingPlans.tsx`:

#### Vytváření závodu
1. Vybrat typ "Závod" z dropdown menu
2. Vyplnit název, datum, skupinu
3. Volitelně přidat odkaz na propozice
4. Uložit

#### Zobrazení závodu
- **Nadcházející závody**: Karta s oranžovým chipem a ikonou 🏆
- **Historické závody**: Včetně označení "🏆 závod" v popisu
- **Detail dne**: Výrazné tlačítko pro zobrazení propozic

#### Duplikace závodu
- Funkce `duplicateTrainingPlan()` kopíruje i odkaz na propozice

### 4. Zobrazení pro členy

V komponentě `MemberDashboard.tsx`:

#### Dnešní závody
- Zobrazují se všem členům skupiny (stejně jako společné tréninky)
- Výrazná ikona 🏆 pohárů
- Oranžový chip "Závod"
- Tlačítko pro zobrazení propozic (contained button)

#### Naplánované závody
- V sekci "Naplánované tréninky (7 dní)"
- Stejný vizuální styl jako dnešní závody
- Outlined tlačítko pro propozice

#### Minulé závody
- V rozbalovací sekci "Minulé tréninky"
- Identické zobrazení s ikonami a odkazy

#### Poznámky k závodům
- Členové mohou přidávat poznámky k závodům stejně jako k tréningům
- Trenéři vidí poznámky svěřenců u závodů prioritně

## Implementační detaily

### Datová struktura

```typescript
// types/trainingPlan.ts
export enum TrainingType {
  COMMON = 'společný',
  INDIVIDUAL = 'individuální',
  RACE = 'závod'
}

export interface TrainingPlan {
  // ... ostatní pole
  type: TrainingType;
  raceProposalsUrl?: string; // Pouze pro typ RACE
}

export interface UpsertTrainingPlan {
  // ... ostatní pole
  type: TrainingType;
  raceProposalsUrl?: string;
}
```

### Firestore služba

```typescript
// utils/trainingPlanService.ts

// mapFirestoreToTrainingPlan - přidáno čtení raceProposalsUrl
raceProposalsUrl: data.raceProposalsUrl,

// createTrainingPlan - ukládání URL pro závody
if (data.raceProposalsUrl) {
  newPlan.raceProposalsUrl = data.raceProposalsUrl.trim();
}

// updateTrainingPlan - aktualizace URL
if (data.raceProposalsUrl !== undefined) {
  updateData.raceProposalsUrl = data.raceProposalsUrl ? 
    data.raceProposalsUrl.trim() : null;
}

// duplicateTrainingPlan - kopírování URL
if (original.raceProposalsUrl) {
  newPlan.raceProposalsUrl = original.raceProposalsUrl;
}
```

### UI komponenty

#### TrainingPlans.tsx
```tsx
// Přidané importy
import { EmojiEvents as RaceIcon, Link as LinkIcon } from '@mui/icons-material';

// Formulář - Type select
<MenuItem value={TT.RACE}>Závod</MenuItem>

// Podmíněné pole pro URL
{formData.type === TT.RACE && (
  <TextField
    label="Odkaz na propozice"
    type="url"
    value={formData.raceProposalsUrl || ''}
    onChange={(e) => setFormData({ 
      ...formData, 
      raceProposalsUrl: e.target.value 
    })}
  />
)}

// Zobrazení v kartě
<Chip 
  icon={plan.type === TT.RACE ? <RaceIcon /> : undefined}
  label={plan.type} 
  color={plan.type === TT.RACE ? 'warning' : ...}
/>

{plan.type === TT.RACE && plan.raceProposalsUrl && (
  <Button
    startIcon={<LinkIcon />}
    href={plan.raceProposalsUrl}
    target="_blank"
  >
    Propozice závodu
  </Button>
)}
```

#### MemberDashboard.tsx
```tsx
// Přidané importy
import { EmojiEvents as RaceIcon, Link as LinkIcon } from '@mui/icons-material';

// Detekce závodu
const isRace = training.type === TrainingType.RACE;

// Zobrazení
{isRace && <RaceIcon color="warning" />}
{isRace && (
  <Chip icon={<RaceIcon />} label="Závod" color="warning" />
)}

// Odkaz na propozice
{isRace && training.raceProposalsUrl && (
  <Button
    startIcon={<LinkIcon />}
    href={training.raceProposalsUrl}
    target="_blank"
  >
    Zobrazit propozice
  </Button>
)}
```

## Barevné schéma

- **Chip barva**: `warning` (oranžová)
- **Ikona**: 🏆 EmojiEvents (MUI)
- **Tlačítko propozic**: 
  - Dnešní závody: `contained` + `warning`
  - Nadcházející: `outlined` + `warning`
  - Historické: `outlined` + `warning`

## Pravidla zobrazení

### Pro členy (ASB_Clen)
- ✅ Závody se zobrazují VŠEM členům skupiny
- ✅ Fungují stejně jako společné tréninky (COMMON)
- ✅ Lze přidat poznámku před/po závodu
- ✅ Viditelné v dnešních, nadcházejících i historických

### Pro trenéry (ASB_Trener)
- ✅ Mohou vytvářet závody
- ✅ Mohou přidat odkaz na propozice
- ✅ Vidí poznámky svěřenců u závodů
- ✅ Mohou duplikovat závody (včetně URL)
- ✅ Mohou upravovat detaily závodu

### Pro funkcionáře (ASB_Funkcionar)
- ✅ Vidí všechny závody
- ✅ Pouze čtení (podle nastavení oprávnění)

### Pro administrátory (ASB_Admin)
- ✅ Plný přístup ke všem závodům
- ✅ Mohou upravovat cizí závody

## Firestore struktura

Kolekce: `trainingPlans`

```json
{
  "name": "Závod O pohár Jihlavy",
  "description": "15 km orientační běh...",
  "type": "závod",
  "date": Timestamp,
  "groupId": "group-id",
  "groupName": "Skupina A",
  "raceProposalsUrl": "https://example.com/propozice.pdf",
  "status": "planned",
  "createdAt": Timestamp,
  "createdBy": "user-id",
  "updatedAt": Timestamp,
  "updatedBy": "user-id"
}
```

## Bezpečnostní pravidla (Firestore)

```javascript
// Doporučené pravidlo pro trainingPlans
match /trainingPlans/{planId} {
  // Čtení: trenéři vidí své skupiny, členové vidí své závody a společné tréninky
  allow read: if request.auth != null;
  
  // Zápis: pouze trenéři a administrátoři
  allow create, update: if request.auth != null && 
    (hasRole(request.auth.token, 'ASB_Admin') || 
     hasRole(request.auth.token, 'ASB_Trener'));
  
  // Mazání: pouze tvůrce nebo admin
  allow delete: if request.auth != null && 
    (hasRole(request.auth.token, 'ASB_Admin') || 
     resource.data.createdBy == request.auth.uid);
}
```

## Testovací scénáře

### Scénář 1: Vytvoření závodu
1. Přihlásit se jako trenér
2. Přejít na "Plánování tréninků"
3. Kliknout na tlačítko "+"
4. Vybrat typ "Závod"
5. Vyplnit název, datum, skupinu
6. Přidat URL propozic
7. Uložit
8. ✅ Závod se zobrazí v seznamu s 🏆 ikonou

### Scénář 2: Zobrazení závodu členem
1. Přihlásit se jako člen
2. Přejít na "Můj dashboard"
3. ✅ Vidět závod s oranžovým chipem
4. ✅ Tlačítko "Zobrazit propozice" je funkční
5. Kliknout na tlačítko
6. ✅ Propozice se otevřou v novém okně

### Scénář 3: Přidání poznámky k závodu
1. Přihlásit se jako člen
2. V dashboardu najít závod
3. Kliknout "Přidat poznámku"
4. Napsat poznámku
5. Uložit
6. ✅ Poznámka se zobrazí
7. Přihlásit se jako trenér
8. ✅ Poznámka je viditelná v tréninkovém plánu

### Scénář 4: Duplikace závodu
1. Přihlásit se jako trenér
2. Otevřít existující závod
3. Kliknout na ikonu kopírování
4. Vybrat nové datum
5. ✅ Vytvořený závod má stejný název, popis a URL propozic

## Budoucí vylepšení

- [ ] Automatické upozornění členům X dní před závodem
- [ ] Import výsledků závodu
- [ ] Statistiky účasti na závodech
- [ ] Filtr "Pouze závody" v historickém zobrazení
- [ ] Export seznamu závodů do kalendáře (iCal)
- [ ] Možnost označit závod jako "povinný"
- [ ] Galerie fotek ze závodu
