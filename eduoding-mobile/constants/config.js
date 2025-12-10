// constants/config.js
import Constants from 'expo-constants';

const getExpoExtra = () => {
  // expoConfig (newer) or manifest (older) depending on runtime
  return (
    (Constants?.expoConfig && Constants.expoConfig.extra) ||
    (Constants?.manifest && Constants.manifest.extra) ||
    {}
  );
};

const EXTRA = getExpoExtra();

// prefer runtime config, otherwise fallback
export const API_BASE = EXTRA.API_BASE || 'https://eduoding-backend.onrender.com';

export default {
  API_BASE
};
