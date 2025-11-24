# 🚀 Rychlá reference - ASB Dashboard

## Základní příkazy

```bash
# Instalace dependencies
npm install

# Spuštění vývojového serveru
npm run dev

# Build pro produkci
npm run build

# Preview produkčního buildu
npm run preview
```

## Vytvoření Firebase projektu

1. **Firebase Console:** https://console.firebase.google.com/
2. **Vytvoření projektu:** Add project → Zadejte název
3. **Authentication:** Enable Email/Password
4. **Firestore:** Create database → Test mode
5. **Web App:** Add app → Zkopírujte config

## Konfigurace .env

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Testovací flow

1. `npm run dev` → Otevře http://localhost:5173/
2. Registrace nového účtu na `/signup`
3. Automatické přihlášení → Dashboard
4. Test odhlášení → Zpět na login
5. Přihlášení existujícím účtem

## Struktura projektu

```
src/
├── components/
│   └── PrivateRoute.tsx      # Ochrana routes
├── contexts/
│   └── AuthContext.tsx       # Auth state management
├── pages/
│   ├── Login.tsx             # Přihlášení
│   ├── Signup.tsx            # Registrace
│   └── Dashboard.tsx         # Hlavní stránka
├── config/
│   └── firebase.ts           # Firebase konfigurace
└── types/
    └── auth.ts               # TypeScript typy
```

## Přidání nové stránky

1. Vytvořte komponentu v `src/pages/NovaStranka.tsx`
2. Přidejte route v `App.tsx`:

```typescript
<Route path="/nova-stranka" element={
  <PrivateRoute>
    <NovaStranka />
  </PrivateRoute>
} />
```

## Firestore operace

```typescript
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from './config/firebase';

// Přidání dokumentu
await addDoc(collection(db, 'users'), {
  name: 'John Doe',
  email: 'john@example.com'
});

// Čtení dokumentů
const querySnapshot = await getDocs(collection(db, 'users'));
querySnapshot.forEach((doc) => {
  console.log(doc.id, doc.data());
});
```

## Další auth metody

V Firebase Console > Authentication > Sign-in method zapněte:
- Google
- GitHub
- Facebook
- Apple
- Phone

## Security Rules (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

## Užitečné odkazy

- [Firebase Docs](https://firebase.google.com/docs)
- [MUI Components](https://mui.com/components/)
- [React Router](https://reactrouter.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Troubleshooting

**Port již používán:**
```bash
npm run dev -- --port 3000
```

**Firebase errors:**
- Zkontrolujte `.env` soubor
- Restartujte dev server
- Ověřte Firebase Console nastavení

**TypeScript errors:**
```bash
npm install -D typescript@latest
```

---

📖 **Kompletní dokumentace:** Viz [SETUP.md](./SETUP.md)
