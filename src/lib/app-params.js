export const APP_ID = import.meta.env.VITE_BASE44_APP_ID;
export const APP_BASE_URL = import.meta.env.VITE_BASE44_APP_BASE_URL;

export const appParams = {
  appId: APP_ID,
  appBaseUrl: APP_BASE_URL,
  token: import.meta.env.VITE_BASE44_TOKEN || undefined,
  functionsVersion: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION || undefined,
};
