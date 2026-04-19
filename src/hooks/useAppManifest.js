export function useAppManifest() {
  const name = import.meta.env.VITE_APP_NAME || "GoGettr";
  const icon = import.meta.env.VITE_APP_ICON || null;
  return { name, icon };
}
