# Required Expo Packages

The mobile app uses the following Expo packages that need to be installed:

## Required for current functionality:

1. **expo-document-picker** - For video file uploads
   ```bash
   npx expo install expo-document-picker
   ```

2. **expo-image-picker** (optional) - For avatar/image uploads in Settings
   ```bash
   npx expo install expo-image-picker
   ```

3. **expo-clipboard** (optional) - For copying certificate verification URLs
   ```bash
   npx expo install expo-clipboard
   ```

## Install all at once:
```bash
npx expo install expo-document-picker expo-image-picker expo-clipboard
```

Note: The app will still function without the optional packages, but some features (like image picking for avatars) will show placeholders.

