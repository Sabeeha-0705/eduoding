/**
 * Google Authentication Configuration
 * 
 * Centralizes Google OAuth configuration for the mobile app.
 * Uses the Web Client ID from app.json (expo.extra.GOOGLE_CLIENT_ID)
 * 
 * IMPORTANT: This uses Expo's proxy service (auth.expo.io) for OAuth redirects.
 * The Web Client ID is sufficient - no Android client ID needed.
 */

import Constants from "expo-constants";
import { makeRedirectUri } from "expo-auth-session";

/**
 * Get Google Client ID from app configuration
 * Checks expoConfig (newer) and manifest (older) for compatibility
 */
export const getGoogleClientId = () => {
  const extra = 
    Constants.expoConfig?.extra || 
    Constants.manifest?.extra || 
    {};

  const clientId = extra.GOOGLE_CLIENT_ID;

  if (!clientId) {
    console.warn(
      "⚠️ GOOGLE_CLIENT_ID not found in app.json extra configuration. " +
      "Please add it to expo.extra.GOOGLE_CLIENT_ID"
    );
  }

  return clientId;
};

/**
 * Get the redirect URI for Google OAuth
 * Uses Expo's proxy service (useProxy: true) which works in Expo Go and production builds
 * 
 * The redirect URI will be something like:
 * https://auth.expo.io/@your-username/eduoding-mobile
 */
export const getGoogleRedirectUri = () => {
  return makeRedirectUri({
    useProxy: true,
  });
};

/**
 * Google OAuth scopes
 * These define what information we request from Google
 */
export const GOOGLE_SCOPES = ["profile", "email"];

/**
 * Google OAuth discovery endpoints
 * These are the standard Google OAuth endpoints
 */
export const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

