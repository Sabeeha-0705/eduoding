# Asset Path Fixes - Summary

All asset import paths have been verified and corrected to work with Expo Router.

## Fixed Asset Imports

### 1. ✅ app/auth/auth.jsx
**Fixed**: Changed `require("../../assets/logo.png")` → `require("../../assets/images/logo.png")`
- **Reason**: Logo file is located at `assets/images/logo.png`, not `assets/logo.png`
- **Path calculation**: From `app/auth/` → up 2 levels to root → `assets/images/logo.png`

### 2. ✅ app/leaderboard.jsx
**Fixed**: Added missing `DEFAULT_AVATAR` constant and fixed Image source
- **Added**: `const DEFAULT_AVATAR = require("../assets/images/default-avatar.png");`
- **Fixed**: Changed Image source from using `uri` with `DEFAULT_AVATAR` to conditional `source` prop that uses `require()` for local assets
- **Path calculation**: From `app/` → up 1 level to root → `assets/images/default-avatar.png`

### 3. ✅ Verified Correct Paths
These paths were already correct:
- `app/badges.jsx`: `require("../assets/images/cup.png")` ✓
- `app/badges.jsx`: `require("../assets/images/badge-icon.png")` ✓
- `app/(tabs)/explore.jsx`: `require('../../assets/images/react-logo.png')` ✓

## Asset Directory Structure

```
eduoding-mobile/
  assets/
    images/
      logo.png              ← Used in auth.jsx
      default-avatar.png    ← Used in leaderboard.jsx
      cup.png               ← Used in badges.jsx
      badge-icon.png        ← Used in badges.jsx
      react-logo.png        ← Used in explore.jsx
      ... (other assets)
```

## Path Resolution Rules

For Expo Router with React Native:
- Local assets must use `require()` with relative paths
- Paths are resolved relative to the file location
- All assets are located in `assets/images/` directory
- Example paths:
  - From `app/`: `../assets/images/filename.png`
  - From `app/auth/`: `../../assets/images/filename.png`
  - From `app/(tabs)/`: `../../assets/images/filename.png`

## Status: ✅ All Asset Paths Fixed

All image imports are now correct and should resolve properly during bundling.
No more asset resolution errors expected.

