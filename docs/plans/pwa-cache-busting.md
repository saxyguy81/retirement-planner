# PWA Cache Busting Implementation Plan

## Overview

Add vite-plugin-pwa to fix browser caching issues where users see old versions of the app even after refreshing. The solution will show an "Update Available" prompt when new versions are deployed, giving users control over when to refresh.

## Current State Analysis

- **Framework**: Vite + React (no Create React App)
- **Deployment**: GitHub Pages via `.github/workflows/deploy.yml`
- **Current caching**: Vite hashes JS/CSS filenames, but `index.html` can be cached by browsers
- **Service worker**: None exists
- **Problem**: Users (like your dad) see stale versions because browsers cache `index.html`

## Desired End State

After implementation:
1. New deployments trigger a service worker update
2. Users see a small, non-intrusive "Update Available - Refresh" banner
3. Clicking the banner refreshes to the new version
4. No need to close tabs or clear cache manually
5. App works offline (bonus feature from PWA)

## What We're NOT Doing

- No "install to homescreen" prompt (can add later if desired)
- No push notifications
- No complex offline-first data sync

## Implementation Approach

Use `vite-plugin-pwa` with `registerType: 'prompt'` mode, which:
- Generates a Workbox service worker with `skipWaiting()` and `clientsClaim()`
- Precaches all built assets
- Detects updates and exposes them via a hook
- Lets us show a custom update prompt UI

---

## Phase 1: Install and Configure vite-plugin-pwa

### Overview
Install the plugin and configure Vite to generate a service worker.

### Changes Required:

#### 1. Install dependency
```bash
npm install -D vite-plugin-pwa
```

#### 2. Update Vite config
**File**: `vite.config.js`

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'Retirement Planner',
        short_name: 'RetirePlan',
        description: 'Comprehensive retirement planning tool',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/retirement-planner/',
        start_url: '/retirement-planner/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: false,  // We control this via prompt
        clientsClaim: true
      }
    })
  ],
  base: '/retirement-planner/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-recharts': ['recharts'],
          'vendor-export': ['xlsx', 'jspdf', 'jspdf-autotable'],
          'vendor-icons': ['lucide-react'],
        }
      }
    }
  }
});
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds without errors
- [x] Build output includes `sw.js` (service worker file)
- [x] Build output includes `manifest.webmanifest`

#### Manual Verification:
- [x] `dist/` folder contains service worker after build

---

## Phase 2: Create PWA Assets

### Overview
Create the required PWA icon files and place them in the public folder.

### Changes Required:

#### 1. Create public directory and icons
**Files to create**:
- `public/pwa-192x192.png` - 192x192 app icon
- `public/pwa-512x512.png` - 512x512 app icon
- `public/favicon.ico` - Standard favicon
- `public/robots.txt` - Basic robots file

For the icons, create simple placeholder PNGs with a blue background and "RP" text, or use any icon generator. The icons should be:
- 192x192 PNG for `pwa-192x192.png`
- 512x512 PNG for `pwa-512x512.png`

**File**: `public/robots.txt`
```
User-agent: *
Allow: /
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] Icons are copied to `dist/` folder

#### Manual Verification:
- [ ] Icons display correctly in browser dev tools > Application > Manifest

---

## Phase 3: Create Update Prompt Component

### Overview
Create a React component that shows when an update is available and handles the refresh.

### Changes Required:

#### 1. Create the update prompt component
**File**: `src/components/UpdatePrompt/index.jsx`

```jsx
import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Check for updates every hour
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  useEffect(() => {
    setShowPrompt(needRefresh);
  }, [needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setNeedRefresh(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg">
      <RefreshCw className="w-5 h-5" />
      <span className="text-sm font-medium">New version available!</span>
      <button
        onClick={handleUpdate}
        className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50 transition-colors"
      >
        Refresh
      </button>
      <button
        onClick={handleDismiss}
        className="text-white/80 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
```

#### 2. Add UpdatePrompt to App
**File**: `src/App.jsx`

Add import at top:
```jsx
import UpdatePrompt from './components/UpdatePrompt';
```

Add component inside the return, typically at the end before the closing fragment/div:
```jsx
<UpdatePrompt />
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] `npm run lint` passes
- [x] No TypeScript/ESLint errors

#### Manual Verification:
- [ ] Component renders without errors in dev mode
- [ ] Update prompt appears when service worker detects changes (test by deploying twice)

---

## Phase 4: Update index.html for PWA

### Overview
Add PWA meta tags and manifest link to the HTML file.

### Changes Required:

#### 1. Update index.html
**File**: `index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Comprehensive retirement planning tool with tax optimization, Roth conversion analysis, and heir value projections" />
    <meta name="theme-color" content="#3b82f6" />
    <link rel="icon" href="/retirement-planner/favicon.ico" />
    <link rel="apple-touch-icon" href="/retirement-planner/pwa-192x192.png" />
    <link rel="manifest" href="/retirement-planner/manifest.webmanifest" />
    <title>Retirement Planner</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] HTML includes manifest link in output

#### Manual Verification:
- [ ] Browser dev tools > Application shows valid manifest
- [ ] No console errors about missing manifest

---

## Phase 5: Test the Implementation

### Overview
Verify the PWA works correctly in development and production builds.

### Testing Steps:

#### Local Testing:
1. Run `npm run build`
2. Run `npm run preview` (serves production build locally)
3. Open http://localhost:4173/retirement-planner/
4. Open DevTools > Application > Service Workers
5. Verify service worker is registered and active
6. Check Application > Manifest shows correct info

#### Simulating Update:
1. With preview running, make a small change to any component
2. Run `npm run build` again (don't restart preview)
3. Refresh the browser page
4. The "New version available!" prompt should appear
5. Click "Refresh" - page should reload with new content

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] `npm run lint` passes
- [x] `npm test` passes (if any PWA-related tests)

#### Manual Verification:
- [ ] Service worker registers in Chrome DevTools
- [ ] Manifest is valid in DevTools
- [ ] Update prompt appears when new version is detected
- [ ] Clicking "Refresh" loads the new version
- [ ] App works offline (bonus - disconnect network and refresh)

---

## Testing Strategy

### Unit Tests:
- No unit tests needed for service worker (handled by vite-plugin-pwa)
- UpdatePrompt component could have basic render tests if desired

### Integration Tests:
- E2E tests should still pass (service worker is transparent to Playwright)

### Manual Testing Steps:
1. Deploy to GitHub Pages
2. Open site in Chrome
3. Check DevTools > Application > Service Workers shows "activated and running"
4. Push another commit to trigger new deployment
5. After deployment, refresh the site
6. Verify "New version available!" banner appears
7. Click Refresh and verify new content loads

---

## Rollback Plan

If issues arise:
1. Remove `VitePWA` plugin from `vite.config.js`
2. Delete `src/components/UpdatePrompt/`
3. Remove `<UpdatePrompt />` from `App.jsx`
4. Remove PWA meta tags from `index.html`
5. Delete `public/` folder contents
6. Uninstall: `npm uninstall vite-plugin-pwa`

Users with cached service workers will automatically get the non-PWA version on next update since the service worker file will be gone.

---

## References

- vite-plugin-pwa docs: https://vite-pwa-org.netlify.app/
- Workbox docs: https://developer.chrome.com/docs/workbox/
- Current vite.config.js: `vite.config.js`
- Current index.html: `index.html`
