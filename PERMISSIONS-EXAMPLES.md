# Příklady použití systému oprávnění

## 1. Základní konfigurace oprávnění pro role

### Scénář: Trenér potřebuje přístup k tréninkovým plánům

1. Přejděte na `/permissions`
2. V záložce "Oprávnění podle rolí" vyberte roli **Trenér**
3. Najděte stránku **Tréninkové plány**
4. Nastavte úroveň přístupu na **Čtení a zápis**
5. Klikněte na **Uložit změny**

✅ Všichni trenéři nyní mohou vytvářet a upravovat tréninkové plány.

## 2. Individuální oprávnění pro uživatele

### Scénář: Jeden konkrétní člen potřebuje přístup ke správě členů

1. Přejděte na `/permissions`
2. V záložce "Oprávnění podle uživatelů" vyhledejte uživatele
3. Klikněte na **Přidat oprávnění**
4. Vyberte stránku **Členové oddílu**
5. Nastavte úroveň přístupu na **Čtení**
6. ✅ Zaškrtněte **Přebít oprávnění z rolí** (pokud chcete ignorovat role)
7. Klikněte na **Uložit**

## 3. Odebrání přístupu

### Scénář: Odebrání přístupu k citlivým datům

#### Metodou A - Na úrovni role:
1. Záložka "Oprávnění podle rolí"
2. Vyberte roli
3. Najděte stránku
4. Nastavte **Žádný přístup**

#### Metodou B - Pro konkrétního uživatele:
1. Záložka "Oprávnění podle uživatelů"
2. Najděte uživatele a jeho oprávnění
3. Klikněte na ikonu **koše** vedle oprávnění
4. Potvrďte smazání

## 4. Audit - Kontrola změn

### Scénář: Zjistit, kdo změnil oprávnění

1. Přejděte na záložku **Historie změn**
2. Použijte vyhledávání pro filtrování:
   - Email administrátora
   - Email uživatele
   - Název stránky
3. Zkontrolujte:
   - Datum a čas změny
   - Co bylo změněno (Předchozí → Nová úroveň)
   - Kdo provedl změnu

## 5. Běžné konfigurace

### Konfigurace A: Nový trenér
```
Role: ASB_TRENER
Oprávnění:
- Tréninkové skupiny: Čtení a zápis
- Tréninkové plány: Čtení a zápis
- Členové oddílu: Čtení
- Statistiky docházky: Čtení
```

### Konfigurace B: Funkcionář
```
Role: ASB_FUNKCIONAR
Oprávnění:
- Členové oddílu: Plný přístup
- Přístupový systém (všechny stránky): Plný přístup
- Čipy: Plný přístup
- Zóny: Plný přístup
- Externí osoby: Plný přístup
```

### Konfigurace C: Člen s omezeným přístupem
```
Role: ASB_CLEN
Oprávnění:
- Dashboard člena: Čtení a zápis
- Ostatní stránky: Žádný přístup
```

## 6. Řešení problémů

### Problém: Uživatel nevidí stránku, i když by měl

**Kontrola:**
1. Ověřte oprávnění role v záložce "Oprávnění podle rolí"
2. Zkontrolujte individuální oprávnění v záložce "Oprávnění podle uživatelů"
3. Pokud má uživatel individuální oprávnění s ✅ **Přebít role**, kontrolujte pouze to
4. Pokud má více rolí, použije se nejvyšší úroveň

**Řešení:**
- Nastavte správnou úroveň přístupu (minimálně **Čtení**)
- Nebo odeberte individuální oprávnění s přebíjením, pokud blokuje přístup

### Problém: Uživatel vidí příliš mnoho stránek

**Řešení:**
1. Zkontrolujte všechny jeho role - má více rolí, než by měl?
2. Zkontrolujte individuální oprávnění - není tam něco navíc?
3. Upravte oprávnění nebo role podle potřeby

### Problém: Nelze uložit změny

**Možné příčiny:**
- ❌ Pokus o odebrání vlastních admin práv
- ❌ Nedostatečná oprávnění (nejste admin)
- ❌ Problém s připojením k databázi

**Řešení:**
- Admin nemůže sám sobě odebrat přístup ke správě uživatelů - nechte to udělat jiného admina
- Zkontrolujte internetové připojení
- Zkontrolujte konzoli prohlížeče pro detaily chyby

## 7. Best Practices

### ✅ DOPORUČENO:

1. **Používejte role pro skupiny uživatelů**
   - Snadnější údržba
   - Konzistentní oprávnění

2. **Individuální oprávnění pouze pro výjimky**
   - Když konkrétní uživatel potřebuje jiná práva
   - Časově omezené projekty (manuálně odeberete později)

3. **Pravidelně kontrolujte audit log**
   - Minimálně jednou měsíčně
   - Po každé významné změně

4. **Princip minimálních oprávnění**
   - Dejte pouze tolik přístupu, kolik je potřeba
   - Začněte s **Žádný přístup** nebo **Čtení**
   - Přidávejte oprávnění postupně podle potřeby

### ❌ NEDOPORUČENO:

1. **Používat "Přebít role" jako výchozí**
   - Používejte pouze když to je opravdu potřeba
   - Komplikuje správu oprávnění

2. **Dávat všem "Plný přístup"**
   - Bezpečnostní riziko
   - Používejte pouze tam, kde je to nutné

3. **Mazat nebo upravovat audit záznamy**
   - Nemožné díky security rules
   - Audit musí zůstat neměnný

## 8. Často kladené otázky

**Q: Co se stane, když mají uživatel oprávnění z role I individuální?**
A: Pokud není zaškrtnuto "Přebít role", použije se vyšší z obou úrovní. Pokud je zaškrtnuto "Přebít role", použije se pouze individuální oprávnění.

**Q: Můžu sám sobě odebrat admin oprávnění?**
A: Ne, systém to zablokuje pro bezpečnost. Jiný admin vás musí degradovat.

**Q: Jak dlouho se uchovává historie změn?**
A: Aktuálně se zobrazuje posledních 100 záznamů, ale v databázi jsou všechny záznamy trvale.

**Q: Mohu vrátit změnu zpět?**
A: Ano, najděte změnu v historii, podívejte se na "Předchozí" hodnotu a nastavte ji zpět ručně.

**Q: Co když potřebuji více úrovní přístupu?**
A: Aktuálně máme 4 úrovně (Žádný, Čtení, Čtení+Zápis, Plný). Pro specifičtější potřeby kontaktujte vývojáře.
