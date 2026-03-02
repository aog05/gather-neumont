# Admin Portal - Implementation Guide

## 🚀 Getting Started

This guide provides step-by-step instructions for implementing the Neumont Virtual Campus Admin Portal.

---

## Phase 1: Project Setup (Week 1)

### Step 1.1: Initialize Project

```bash
# Navigate to gather_portal directory
cd gather_portal

# Initialize Bun project
bun init

# Install dependencies
bun add react react-dom react-router-dom
bun add firebase
bun add react-hook-form zod @hookform/resolvers
bun add recharts
bun add -d @types/react @types/react-dom typescript

# Create directory structure
mkdir -p src/{components/{layout,collections,shared,visualizations,auth},hooks,services,contexts,types,utils,styles,routes}
```

### Step 1.2: Configure TypeScript

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@services/*": ["./src/services/*"],
      "@types/*": ["./src/types/*"],
      "@utils/*": ["./src/utils/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Step 1.3: Configure Bun Build

**bunfig.toml**:
```toml
[build]
target = "browser"
outdir = "dist"
sourcemap = "external"
minify = true

[dev]
port = 3001
```

### Step 1.4: Create Entry Point

**src/index.tsx**:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**public/index.html**:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Neumont Virtual Campus - Admin Portal</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
```

### Step 1.5: Set Up Firebase Connection

**src/lib/firebase.ts** (symlink or copy from webpage):
```typescript
// Option 1: Symlink (recommended)
// ln -s ../../webpage/src/lib/firebase.ts src/lib/firebase.ts

// Option 2: Re-export
export * from '../../webpage/src/lib/firebase';
```

**src/types/firestore.types.ts** (symlink or copy):
```typescript
export * from '../../webpage/src/types/firestore.types';
```

### Step 1.6: Create Base Styles

**src/styles/variables.css**:
```css
:root {
  /* Neumont Brand Colors */
  --neumont-yellow: #FFDD00;
  --neumont-grey: #1F1F1F;
  --neumont-grey-light: #2a2a2a;
  --neumont-grey-lighter: #3a3a3a;
  
  /* Semantic Colors */
  --color-primary: var(--neumont-yellow);
  --color-background: var(--neumont-grey);
  --color-surface: var(--neumont-grey-light);
  --color-surface-hover: var(--neumont-grey-lighter);
  --color-text: #f0f0f0;
  --color-text-muted: #888;
  --color-border: var(--neumont-grey-lighter);
  --color-success: #52c97c;
  --color-danger: #d65e5e;
  --color-warning: #f0ad4e;
  --color-info: #5bc0de;
  
  /* Typography */
  --font-family: 'DIN 2014', 'Arial Narrow', 'Arial', sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  
  /* Border Radius (sharp corners) */
  --border-radius: 0;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.5);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
  
  /* Transitions */
  --transition-fast: 150ms ease-in-out;
  --transition-base: 250ms ease-in-out;
  --transition-slow: 350ms ease-in-out;
}
```

**src/styles/global.css**:
```css
@import './variables.css';

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  color: var(--color-text);
  background-color: var(--color-background);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  min-height: 100vh;
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--neumont-grey);
}

::-webkit-scrollbar-thumb {
  background: var(--neumont-grey-lighter);
  border-radius: 0;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--neumont-yellow);
}
```

---

## Phase 2: Core Components (Week 1-2)

### Step 2.1: Create Layout Components

**src/components/layout/AdminLayout.tsx**:
```typescript
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './AdminLayout.css';

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main">
        <Header />
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```


