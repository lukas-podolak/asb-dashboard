# 🚀 ASB Dashboard - Průvodce nastavením

Kompletní krok-za-krokem průvodce pro vytvoření React TypeScript aplikace s Firebase, React Router a Material-UI.

---

## 📋 Obsah

1. [Předpoklady](#předpoklady)
2. [Struktura projektu](#struktura-projektu)
3. [Vytvoření Firebase projektu](#vytvoření-firebase-projektu)
4. [Konfigurace aplikace](#konfigurace-aplikace)
5. [Spuštění aplikace](#spuštění-aplikace)
6. [Testování funkčnosti](#testování-funkčnosti)
7. [Další kroky](#další-kroky)
8. [Řešení problémů](#řešení-problémů)

---

## 🔧 Předpoklady

Před zahájením se ujistěte, že máte nainstalováno:

- **Node.js** (verze 20.19+ nebo 22.12+) - [Download](https://nodejs.org/)
- **npm** nebo **yarn** package manager
- **Git** - [Download](https://git-scm.com/)
- **VS Code** nebo jiný editor kódu
- **Účet na Firebase** - [Firebase Console](https://console.firebase.google.com/)

---

## 📁 Struktura projektu

Projekt byl vytvořen s následující strukturou:

```
asb-dashboard/
├── src/
│   ├── components/          # Znovupoužitelné komponenty
│   │   └── PrivateRoute.tsx # Ochrana routes pro přihlášené uživatele
│   ├── contexts/            # React Context API
│   │   └── AuthContext.tsx  # Autentizační kontext
│   ├── pages/               # Stránky aplikace
│   │   ├── Login.tsx        # Přihlašovací stránka
│   │   ├── Signup.tsx       # Registrační stránka
│   │   └── Dashboard.tsx    # Hlavní dashboard
│   ├── config/              # Konfigurační soubory
│   │   └── firebase.ts      # Firebase konfigurace
│   ├── types/               # TypeScript typy
│   │   └── auth.ts          # Autentizační typy
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Pomocné funkce
│   ├── App.tsx              # Hlavní komponenta s routing
│   └── main.tsx             # Entry point
├── .env                     # Environment proměnné (NEPŘIDÁVAT DO GIT!)
├── .env.example             # Šablona pro .env
├── .gitignore               # Git ignore soubor
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript konfigurace
└── vite.config.ts           # Vite konfigurace
```

---

## 🔥 Vytvoření Firebase projektu

### Krok 1: Vytvoření nového projektu

1. Přejděte na [Firebase Console](https://console.firebase.google.com/)
2. Klikněte na **"Add project"** nebo **"Přidat projekt"**
3. Zadejte název projektu: **"ASB Dashboard"**
4. (Volitelně) Vypněte Google Analytics, pokud jej nepotřebujete
5. Klikněte na **"Create project"** a počkejte na dokončení

### Krok 2: Aktivace Authentication

1. V levém menu klikněte na **"Authentication"** (nebo "Ověřování")
2. Klikněte na tlačítko **"Get started"**
3. V sekci **"Sign-in method"** zapněte:
   - **Email/Password** - klikněte na "Enable" a uložte

### Krok 3: Aktivace Firestore Database

1. V levém menu klikněte na **"Firestore Database"**
2. Klikněte na **"Create database"**
3. Vyberte:
   - **Location:** `europe-west3` (Frankfurt) nebo nejbližší region
   - **Start in test mode** (pro vývoj) - POZOR: Změňte pravidla pro produkci!
4. Klikněte na **"Enable"**

### Krok 4: Registrace webové aplikace

1. V Project Overview (přehledu projektu) klikněte na ikonu **</>** (Web)
2. Zadejte název: **"ASB Dashboard Web"**
3. Zaškrtněte **"Firebase Hosting"** (volitelné)
4. Klikněte na **"Register app"**

### Krok 5: Získání konfiguračních klíčů

Po registraci se zobrazí konfigurace podobná této:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "asb-dashboard-xxxxx.firebaseapp.com",
  projectId: "asb-dashboard-xxxxx",
  storageBucket: "asb-dashboard-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:xxxxxxxxxxxxx"
};
```

**⚠️ DŮLEŽITÉ:** Tyto hodnoty si zkopírujte - budete je potřebovat v dalším kroku!

---

## ⚙️ Konfigurace aplikace

### Krok 1: Vytvoření .env souboru

1. V kořenové složce projektu (`c:\dev\asb-dashboard\`) vytvořte soubor `.env`
2. Zkopírujte obsah z `.env.example`:

```bash
# V PowerShell nebo CMD:
cd c:\dev\asb-dashboard
Copy-Item .env.example .env
```

### Krok 2: Vyplnění Firebase konfigurace

Otevřete soubor `.env` a nahraďte placeholder hodnoty vašimi Firebase klíči:

```env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=asb-dashboard-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=asb-dashboard-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=asb-dashboard-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:xxxxxxxxxxxxx
```

**⚠️ BEZPEČNOST:**
- ❌ NIKDY nepřidávejte `.env` do Gitu!
- ✅ Soubor `.env` je již v `.gitignore`
- ✅ Sdílejte pouze `.env.example` s placeholdery

---

## 🚀 Spuštění aplikace

### Instalace dependencies (pokud jste to ještě neudělali)

```powershell
cd c:\dev\asb-dashboard
npm install
```

### Spuštění vývojového serveru

```powershell
npm run dev
```

Po spuštění by se mělo objevit:

```
VITE v7.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Otevření aplikace

Otevřete prohlížeč a přejděte na:
```
http://localhost:5173/
```

---

## ✅ Testování funkčnosti

### Test 1: Přesměrování na login

1. Otevřete `http://localhost:5173/`
2. ✅ Měli byste být automaticky přesměrováni na `/login`
3. ✅ Měla by se zobrazit přihlašovací stránka s MUI komponenty

### Test 2: Registrace nového účtu

1. Na login stránce klikněte na **"Nemáte účet? Zaregistrujte se"**
2. Vyplňte formulář:
   - Email: `test@example.com`
   - Heslo: `test123` (minimálně 6 znaků)
   - Potvrzení hesla: `test123`
3. Klikněte na **"Zaregistrovat se"**
4. ✅ Měli byste být automaticky přesměrováni na `/dashboard`

### Test 3: Dashboard

1. Po přihlášení byste měli vidět:
   - ✅ AppBar s názvem "ASB Dashboard"
   - ✅ Váš email v pravém horním rohu
   - ✅ Uvítací zprávu
   - ✅ Tři karty (Přehled, Analýzy, Nastavení)
   - ✅ Footer s copyright

### Test 4: Odhlášení

1. Klikněte na ikonu profilu (AccountCircle) v pravém horním rohu
2. Vyberte **"Odhlásit se"**
3. ✅ Měli byste být přesměrováni zpět na `/login`

### Test 5: Přihlášení existujícím účtem

1. Na login stránce zadejte:
   - Email: `test@example.com`
   - Heslo: `test123`
2. Klikněte na **"Přihlásit se"**
3. ✅ Měli byste být přesměrováni na `/dashboard`

### Test 6: Ochrana routes

1. Odhlaste se
2. Zkuste přejít přímo na `http://localhost:5173/dashboard`
3. ✅ Měli byste být automaticky přesměrováni na `/login`

### Ověření v Firebase Console

1. Přejděte do [Firebase Console](https://console.firebase.google.com/)
2. Vyberte váš projekt "ASB Dashboard"
3. Klikněte na **Authentication**
4. ✅ V sekci **Users** byste měli vidět registrovaného uživatele `test@example.com`

---

## 🎯 Další kroky

Nyní máte funkční základ aplikace! Můžete pokračovat v rozvoji:

### 1. Přidání dat do Firestore

Vytvořte si vlastní kolekce a dokumenty:

```typescript
import { collection, addDoc } from 'firebase/firestore';
import { db } from './config/firebase';

// Příklad přidání dokumentu
const addData = async () => {
  await addDoc(collection(db, 'users'), {
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date()
  });
};
```

### 2. Přidání více autentizačních metod

Firebase podporuje:
- Google Sign-In
- GitHub
- Facebook
- Twitter
- Apple
- Telefon (SMS)

Zapněte je v Firebase Console > Authentication > Sign-in method

### 3. Vytvoření nových stránek

1. Vytvořte nový soubor v `src/pages/`
2. Přidejte route v `App.tsx`:

```typescript
<Route path="/nova-stranka" element={
  <PrivateRoute>
    <NovaStranka />
  </PrivateRoute>
} />
```

### 4. Přidání navigace

Vytvořte layout s drawer/sidebar pro navigaci mezi stránkami:

```typescript
import { Drawer, List, ListItem } from '@mui/material';
```

### 5. Customizace MUI Theme

V `App.tsx` upravte theme podle vašeho designu:

```typescript
const theme = createTheme({
  palette: {
    primary: { main: '#your-color' },
    secondary: { main: '#your-color' },
  },
  typography: {
    fontFamily: 'Your Font',
  },
});
```

### 6. Přidání TypeScript typů

Vytvořte si vlastní typy v `src/types/`:

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}
```

### 7. Implementace Firestore security rules

V Firebase Console > Firestore Database > Rules změňte pravidla:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🔧 Řešení problémů

### Problém: "Cannot find module" errors

**Řešení:**
```powershell
# Smažte node_modules a package-lock.json
Remove-Item -Recurse -Force node_modules, package-lock.json

# Reinstalujte dependencies
npm install
```

### Problém: Firebase configuration errors

**Řešení:**
- Zkontrolujte, že všechny hodnoty v `.env` jsou správně vyplněné
- Ujistěte se, že proměnné začínají prefixem `VITE_`
- Restartujte dev server po změně `.env` souboru

### Problém: "Network request failed" při auth

**Řešení:**
- Zkontrolujte internetové připojení
- Ověřte, že Firebase projekt je správně nastaven
- Zkontrolujte, že Email/Password autentizace je zapnutá v Firebase Console

### Problém: TypeScript errors

**Řešení:**
```powershell
# Zkontrolujte TypeScript verzi
npm list typescript

# Případně aktualizujte
npm install -D typescript@latest
```

### Problém: Port 5173 je již používán

**Řešení:**
```powershell
# Zastavte proces na portu 5173 nebo použijte jiný port
npm run dev -- --port 3000
```

---

## 📚 Užitečné odkazy

- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Router Documentation](https://reactrouter.com/)
- [Material-UI Documentation](https://mui.com/)
- [Vite Documentation](https://vite.dev/)

---

## 🔒 Bezpečnostní tipy

1. **Environment proměnné:**
   - ❌ Nikdy necommitujte `.env` do Gitu
   - ✅ Použijte `.env.example` pro sdílení struktury
   - ✅ Různé `.env` pro development/production

2. **Firebase Security Rules:**
   - ❌ Nikdy nenechávejte "test mode" v produkci
   - ✅ Implementujte přísná pravidla pro čtení/zápis
   - ✅ Validujte data na backendu

3. **API Keys:**
   - ℹ️ Firebase API klíče jsou public (je to OK)
   - ✅ Zabezpečení je v Security Rules, ne v API klíčích
   - ✅ Omezte domény v Firebase Console > Project Settings

4. **Hesla:**
   - ✅ Firebase automaticky hashuje hesla
   - ✅ Vynucujte silná hesla (min. 6 znaků)
   - ✅ Přidejte password reset funkcionalitu

---

## 🎉 Shrnutí

✅ Máte funkční React TypeScript aplikaci s Vite  
✅ Firebase Authentication je nakonfigurována a funkční  
✅ React Router zajišťuje navigaci a ochranu routes  
✅ Material-UI poskytuje responzivní komponenty  
✅ TypeScript zajišťuje type safety  
✅ Projekt je připraven pro další vývoj  

**Gratulujeme! Vaše ASB Dashboard aplikace je nyní plně funkční a připravená k rozšiřování!** 🚀

---

**Vytvořeno: 24. listopadu 2025**  
**Verze: 1.0.0**
