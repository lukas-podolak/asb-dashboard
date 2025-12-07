# Changelog - Funkce plánování závodů

## Verze: 2024-01 - Race Planning Feature

### 🎯 Nové funkce

#### 1. Plánování závodů pro trenéry
- Přidán nový typ tréninku: **"Závod"** (`TrainingType.RACE`)
- Možnost přidat odkaz na propozice závodu při vytváření/úpravě
- Vizuální odlišení závodů ikonou 🏆 (pohár) a oranžovým chipem
- Duplikace závodu zachovává odkaz na propozice

#### 2. Zobrazení závodů pro členy
- Závody se zobrazují všem členům skupiny (stejně jako společné tréninky)
- Výrazná vizualizace s ikonou pohárů
- Přímý odkaz na propozice závodu (otevírá se v novém okně)
- Možnost přidat osobní poznámku k závodu

### 📝 Změněné soubory

#### Typy
- **src/types/trainingPlan.ts**
  - Přidán `TrainingType.RACE = 'závod'`
  - Přidáno pole `raceProposalsUrl?: string` do `TrainingPlan`
  - Přidáno pole `raceProposalsUrl?: string` do `UpsertTrainingPlan`

#### Služby
- **src/utils/trainingPlanService.ts**
  - `mapFirestoreToTrainingPlan()` - čtení `raceProposalsUrl`
  - `createTrainingPlan()` - ukládání `raceProposalsUrl`
  - `updateTrainingPlan()` - aktualizace `raceProposalsUrl`
  - `duplicateTrainingPlan()` - kopírování `raceProposalsUrl`

#### Komponenty
- **src/pages/TrainingPlans.tsx**
  - Import ikon: `EmojiEvents as RaceIcon`, `Link as LinkIcon`
  - Přidána položka "Závod" do type dropdown (Create + Edit dialog)
  - Podmíněné zobrazení pole pro URL propozic
  - Zobrazení ikony 🏆 a oranžového chipu u závodů
  - Tlačítko pro otevření propozic v kartách tréninků
  - Aktualizace `openEditDialogForPlan()` pro načtení URL
  - Inicializace `formData` s prázdným `raceProposalsUrl`

- **src/pages/MemberDashboard.tsx**
  - Import ikon: `EmojiEvents as RaceIcon`, `Link as LinkIcon`
  - Detekce závodů pomocí `isRace = training.type === TrainingType.RACE`
  - Zobrazení ikony 🏆 a chipu "Závod"
  - Tlačítko pro zobrazení propozic ve všech třech sekcích:
    - Dnešní tréninky (contained button)
    - Naplánované tréninky (outlined button)
    - Minulé tréninky (outlined button)

### 🎨 UI/UX vylepšení

#### Vizuální odlišení
- **Barva**: Oranžová (`warning` color)
- **Ikona**: 🏆 EmojiEvents (MUI)
- **Chip**: "Závod" s ikonou pohárů
- **Tlačítko propozic**: 
  - Dnešní: Vyplněné oranžové tlačítko
  - Budoucí/Historické: Orámované oranžové tlačítko

#### Hierarchie informací
1. Název + ikona 🏆
2. Typ (oranžový chip)
3. Datum/čas
4. Tlačítko propozic (pokud existuje URL)
5. Popis závodu

### 🔐 Oprávnění

Závody respektují existující systém oprávnění:
- **Trenéři**: Vytvářet, upravovat, mazat závody pro své skupiny
- **Členové**: Zobrazit závody své skupiny, přidat poznámku
- **Funkcionáři**: Zobrazit všechny závody (read-only podle nastavení)
- **Administrátoři**: Plný přístup ke všem závodům

### 📊 Firestore struktura

Nová pole v kolekci `trainingPlans`:
```typescript
{
  type: 'závod',  // Nová hodnota enum
  raceProposalsUrl: 'https://...' // Nové volitelné pole
}
```

### 🧪 Testování

Funkce byla implementována a prošla kontrolou TypeScript kompilace:
- ✅ Žádné TypeScript chyby
- ✅ Všechny importy správně nastaveny
- ✅ Podmíněné zobrazení funguje správně
- ✅ Duplikace závodu zahrnuje URL

### 📚 Dokumentace

Vytvořeny dokumentační soubory:
- **RACE-FEATURE.md** - Kompletní dokumentace funkce, API, testovací scénáře

### 🚀 Nasazení

#### Před nasazením
1. Ověřit TypeScript kompilaci: ✅ Hotovo
2. Otestovat vytvoření závodu
3. Otestovat zobrazení pro člena
4. Otestovat odkaz na propozice

#### Po nasazení
1. Vytvořit první testovací závod
2. Ověřit, že členové vidí závod
3. Ověřit funkčnost odkazu na propozice
4. Monitorovat Firestore dotazy

### 🔄 Zpětná kompatibilita

- ✅ Existující tréninky nejsou ovlivněny
- ✅ Nové pole `raceProposalsUrl` je volitelné
- ✅ Starý kód funguje bez změn (pouze COMMON a INDIVIDUAL typy)

### 🐛 Známé limitace

- Odkaz na propozice není validován při ukládání (pouze HTML5 validace)
- Duplikace závodu automaticky kopíruje URL (může být nežádoucí)
- Žádná kontrola dostupnosti propozic (mrtvé odkazy)

### 💡 Budoucí vylepšení

Viz sekce "Budoucí vylepšení" v **RACE-FEATURE.md**

---

**Autor**: GitHub Copilot  
**Datum**: 2024  
**Status**: ✅ Implementováno a připraveno k testování
