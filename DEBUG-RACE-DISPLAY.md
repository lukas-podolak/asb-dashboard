# Debugging - Proč se členovi nezobrazuje závod

## Provedené opravy

### 1. ✅ Opravena funkce `canAddNote()`

**Problém**: Původní kód umožňoval přidávat poznámky **pouze** k individuálním tréningům:
```typescript
if (training.type !== TrainingType.INDIVIDUAL) return false;
```

**Oprava**: Změněno na logiku, která umožňuje poznámky k individuálním tréningům a závodům:
```typescript
if (training.type === TrainingType.COMMON) return false;
```

Tím pádem:
- ✅ INDIVIDUAL → lze přidat poznámku
- ✅ RACE → lze přidat poznámku  
- ❌ COMMON → nelze přidat poznámku (poznámky trenéra)

### 2. ✅ Přidán debug logging

Do `MemberDashboard.tsx` byly přidány console.log výpisy:
```typescript
console.log('MemberDashboard - Načtené tréninky:', allTrainings);
console.log('MemberDashboard - Závody:', allTrainings.filter(t => t.type === TrainingType.RACE));
```

## Kontrolní seznam pro debugging

### Krok 1: Ověřit, že závod existuje v Firestore

1. Otevřít Firebase Console
2. Přejít na Firestore Database
3. Kolekce: `trainingPlans`
4. Zkontrolovat:
   - ✅ Dokument závodu existuje
   - ✅ Pole `type` má hodnotu `"závod"`
   - ✅ Pole `groupId` odpovídá skupině člena
   - ✅ Pole `date` je správně nastaveno (Timestamp)

### Krok 2: Zkontrolovat členství ve skupině

1. Firestore → kolekce `trainingGroups`
2. Najít skupinu se stejným ID jako má závod
3. Zkontrolovat pole `members`:
   ```json
   "members": [
     {
       "id": 123,  // Člen musí být v seznamu
       "name": "Jméno Člena"
     }
   ]
   ```

### Krok 3: Zkontrolovat console output

1. Otevřít vývojářské nástroje (F12)
2. Přejít na záložku Console
3. Hledat výpisy:
   ```
   MemberDashboard - Načtené tréninky: Array(X)
   MemberDashboard - Závody: Array(Y)
   ```
4. Rozbalit pole a zkontrolovat:
   - Kolik tréninků bylo načteno celkem
   - Kolik z nich je typu RACE
   - Jestli závod má správné datum

### Krok 4: Zkontrolovat datum závodu

Závod se zobrazí pouze pokud:
- **Dnešní závody**: `date >= todayStart && date <= todayEnd`
- **Naplánované**: `date > todayEnd && date <= oneWeekLater` (do 7 dní)
- **Minulé**: `date >= oneWeekAgo && date < todayStart` (zpět 7 dní)

Pokud je závod více než 7 dní v budoucnosti nebo více než 7 dní v minulosti, nezobrazí se!

## Časté problémy a řešení

### Problém 1: Závod není načten z Firestore

**Příčiny**:
- Špatný `groupId` - závod je přiřazen jiné skupině
- Člen není ve skupině
- Firestore pravidla blokují čtení

**Řešení**:
1. Zkontrolovat `groupId` závodu vs. skupiny člena
2. Přidat člena do správné skupiny
3. Zkontrolovat Firestore security rules

### Problém 2: Závod je načten, ale nezobrazuje se

**Příčiny**:
- Datum je mimo rozsah 7 dní
- Datum není správně parsováno

**Řešení**:
1. Zkontrolovat console.log - závod je v poli?
2. Ověřit datum závodu v Firestore
3. Změnit datum na blíže k dnešku

### Problém 3: Závod je zobrazený, ale chybí ikona/chip

**Příčiny**:
- Pole `type` nemá hodnotu `"závod"`
- Import `TrainingType` chybí

**Řešení**:
1. Zkontrolovat hodnotu pole `type` v Firestore
2. Musí být přesně `"závod"` (s háčky)
3. Ověřit import: `import { TrainingType } from '../types/trainingPlan';`

### Problém 4: Odkaz na propozice nefunguje

**Příčiny**:
- Pole `raceProposalsUrl` chybí nebo je prázdné
- URL není validní

**Řešení**:
1. Zkontrolovat Firestore - je tam pole `raceProposalsUrl`?
2. Je URL validní? (musí začínat `http://` nebo `https://`)
3. Zkontrolovat, že tlačítko má atribut `href={training.raceProposalsUrl}`

## Testovací scénář

### Vytvoření testovacího závodu

1. Přihlásit se jako trenér
2. Přejít na "Plánování tréninků"
3. Kliknout "+"
4. Vyplnit:
   - **Název**: "Testovací závod"
   - **Typ**: "Závod"
   - **Datum**: Zítra (nebo max 7 dní vpřed)
   - **Skupina**: Skupina, kde je člen členem
   - **Odkaz**: `https://www.example.com/propozice.pdf`
5. Uložit

### Ověření zobrazení

1. Odhlásit trenéra
2. Přihlásit se jako člen (musí být ve stejné skupině)
3. Přejít na "Můj dashboard"
4. **Očekávaný výsledek**:
   - Závod je viditelný v sekci "Naplánované tréninky"
   - Má 🏆 ikonu
   - Má oranžový chip "Závod"
   - Je viditelné tlačítko "Zobrazit propozice"
   - Po kliknutí se otevře URL v novém okně

### Debug kroky, pokud se nezobrazuje

1. Otevřít F12 Console
2. Zkontrolovat výpis:
   ```
   MemberDashboard - Načtené tréninky: Array(?)
   MemberDashboard - Závody: Array(?)
   ```
3. Pokud je pole závodů prázdné:
   - Problém s načítáním z Firestore
   - Zkontrolovat groupId
4. Pokud závod je v poli, ale nezobrazuje se:
   - Problém s datem (mimo 7 dní)
   - Zkontrolovat datumovou logiku

## Odstranění debug výpisů

Po vyřešení problému odebrat řádky z `MemberDashboard.tsx`:
```typescript
// Odebrat tyto řádky:
console.log('MemberDashboard - Načtené tréninky:', allTrainings);
console.log('MemberDashboard - Závody:', allTrainings.filter(t => t.type === TrainingType.RACE));
```

## Kontakt

Pokud problém přetrvává, zkontrolovat:
1. Firestore data (groupId, type, date)
2. Členství ve skupině
3. Console.log výstupy
4. TypeScript chyby v konzoli
