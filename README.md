# ASB Dashboard

Moderní React TypeScript aplikace s Firebase autentizací, React Router a Material-UI.

## 🚀 Rychlý start

### 1. Instalace dependencies

```bash
npm install
```

### 2. Konfigurace Firebase

1. Vytvořte Firebase projekt na [Firebase Console](https://console.firebase.google.com/)
2. Zkopírujte `.env.example` do `.env`
3. Vyplňte Firebase konfigurace do `.env`

```bash
cp .env.example .env
```

### 3. Spuštění aplikace

```bash
npm run dev
```

Aplikace bude dostupná na `http://localhost:5173/`

## 📖 Kompletní dokumentace

Podrobný průvodce nastavením najdete v [SETUP.md](./SETUP.md)

## 🛠 Technologie

- **React 18** - UI knihovna
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Firebase** - Backend (Auth + Firestore)
- **React Router v6** - Routing
- **Material-UI (MUI)** - UI komponenty
- **Emotion** - CSS-in-JS

## 📁 Struktura projektu

```
src/
├── components/     # Znovupoužitelné komponenty
├── contexts/       # React Context API
├── pages/          # Stránky aplikace
├── config/         # Konfigurace (Firebase)
├── types/          # TypeScript typy
├── hooks/          # Custom React hooks
└── utils/          # Pomocné funkce
```

## 🔒 Funkce

- ✅ Email/Password autentizace
- ✅ Chráněné routes
- ✅ Responzivní design
- ✅ Material-UI komponenty
- ✅ TypeScript podpora
- ✅ Firebase Firestore připraveno

## 📝 Dostupné skripty

```bash
npm run dev          # Spustí vývojový server
npm run build        # Build pro produkci
npm run preview      # Preview produkčního buildu
npm run lint         # Kontrola kódu
```

## 🤝 Další vývoj

Aplikace je připravena pro rozšíření o:
- Firestore databázové operace
- Další autentizační metody (Google, GitHub, atd.)
- Další stránky a funkce
- Pokročilý routing
- State management (Redux, Zustand)

## 📄 Licence

MIT

## 👨‍💻 Autor

Vytvořeno pro ASB Dashboard projekt

import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
